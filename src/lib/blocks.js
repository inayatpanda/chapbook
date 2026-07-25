// Block document -> site markdown body. Pure, no I/O, no deps.
import { sanitise, SAFE_IMAGE_DATA_URL } from './figures/svg.js';
import { sanitiseHtml } from './sanitise.js';

const KNOWN = new Set(['heading', 'text', 'image', 'quote', 'divider', 'raw', 'gallery', 'embed', 'playground', 'table', 'figure', 'video']);

function decodeEntities(s) {
  return s.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
          .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, ' ');
}

// A citation id is conservative: lowercase letter + alphanumerics/hyphens, so it is
// always a safe GFM footnote label and never needs escaping in `[^id]`.
const CITE_ID = /^[a-z][\w-]*$/;
const safeCiteId = (id) => (CITE_ID.test(String(id || '')) ? String(id) : '');

export function inlineHtmlToMd(html) {
  let s = String(html || '');
  // Inline footnote markers: <sup class="fn-ref" data-fn="c1">…</sup> → [^c1].
  // Matched BEFORE links/emphasis/tag-strip so the marker is collapsed first and its
  // visible index text (e.g. "1") is discarded — the number is recomputed by GFM.
  s = s.replace(/<sup\b[^>]*\bclass="[^"]*\bfn-ref\b[^"]*"[^>]*>[\s\S]*?<\/sup>/gi, (m) => {
    const idm = /\bdata-fn="([^"]*)"/i.exec(m);
    const id = idm ? safeCiteId(decodeEntities(idm[1])) : '';
    return id ? `[^${id}]` : '';
  });
  s = s.replace(/<a\s+[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi, (_, href, txt) => {
    const text = txt.replace(/<[^>]+>/g, '');
    // L3: drop javascript:/vbscript: hrefs (keep the visible text). Otherwise the emitted
    // markdown `[text](javascript:…)` re-renders as a live executable <a> on the blog, which
    // has no downstream sanitiser. Leading whitespace is tolerated (browsers ignore it
    // before resolving the scheme). Mirrors inlineMdToHtml's javascript: neutralise below.
    if (/^\s*(?:javascript|vbscript):/i.test(decodeEntities(href))) return text;
    return `[${text}](${href})`;
  });
  // inline code → `text` (decode entities + strip any nested tags inside the span first,
  // so the backticked body is plain text that the site markdown re-parses to <code>)
  s = s.replace(/<code>([\s\S]*?)<\/code>/gi, (_, t) => `\`${decodeEntities(t.replace(/<[^>]+>/g, ''))}\``);
  s = s.replace(/<(strong|b)>([\s\S]*?)<\/\1>/gi, (_, __, t) => `**${t}**`);
  s = s.replace(/<(em|i)>([\s\S]*?)<\/\1>/gi, (_, __, t) => `*${t}*`);
  s = s.replace(/<br\s*\/?>/gi, ' ');
  s = s.replace(/<\/?[a-z][^>]*>/gi, '');
  s = decodeEntities(s);
  return s.replace(/[ \t]+/g, ' ').trim();
}

// HTML-attribute escaper. `&` MUST be first (so we don't double-encode the entities
// we introduce next). Escaping `<`/`>` too keeps attribute values well-formed even
// though a double-quoted value doesn't strictly require it. Used for every attribute
// value we emit into raw HTML (src, alt, poster, iframe title, videoId-in-src …).
// NOT for markdown `![alt]()` alt text — that is markdown context, not an HTML attr,
// and the markdown engine escapes on render (see the gallery case below).
function escAttr(s) { return String(s || '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
function escHtml(s) { return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

// Markdown-TEXT escaper for plain-text values emitted into a markdown line that must
// render as LITERAL text (currently the quote cite). HTML-escaping is the WRONG tool in
// markdown context: it double-encodes legit text ("AT&T" → "AT&amp;T") and still leaves
// markdown live — a cite of "[x](javascript:alert(1))" survives an HTML-escape as an
// executable link on the published blog (rehype-raw, no sanitiser — see inlineHtmlToMd's
// L3 note). Instead, backslash-escape every markdown-ACTIVE character (CommonMark honours
// \-escapes for all ASCII punctuation, rendering the bare character): \ ` * _ ~ kill code
// spans/emphasis/strikethrough, [ ] ( ) kill links/images/footnote refs, < > kill
// autolinks and inline HTML. & and " are left alone — they are inert in markdown text and
// entity-encoding them is exactly the double-encode this replaces. Newlines collapse to
// spaces FIRST, so the value can never start a fresh line — which is what keeps
// line-start syntax (leading #, >, ``` …) inert without escaping those characters too.
// NOT a second HTML escaper and NOT stripDangerousMdLinks (that keeps benign markdown
// live; this renders everything literal).
function escMdText(s) {
  return String(s == null ? '' : s)
    .replace(/[\r\n]+/g, ' ')
    .replace(/[\\`*_~\[\]()<>]/g, (c) => `\\${c}`);
}

// ─── drag-to-resize (width + alignment) ─────────────────────────────────────
// A resizable media block may carry an optional `width` (percent 10–100 of the
// article content column) and `align` ('left'|'center'|'right', default center).
// width/align are emitted as a `style="--blk-w:NN%"` CSS var + a `data-align`
// attribute on the rendered wrapper (figure / embed div / playground div /
// gallery figure). The site CSS honours the var (and forces full-width ≤640px so
// phones aren't cramped). When width is absent NOTHING is emitted, so existing
// posts — and the placement/size classes they use — serialise byte-identically.
// width supersedes the legacy `size` (sm/md/lg) when present; align supersedes a
// left/right `placement` float (center is the default neutral case).
const ALIGNS = new Set(['left', 'center', 'right']);
// Clamp to a sensible range. 13% images that float weirdly are pulled up to a
// usable minimum; 100% is the reset-to-full-width case (emit nothing).
function blkWidth(b) {
  const n = Number(b && b.width);
  if (!Number.isFinite(n)) return null;
  const w = Math.round(n);
  if (w >= 100 || w < 20) return null; // >=100 → full width (default); <20 clamped out (too small)
  return w;
}
function blkAlign(b) {
  const a = String(b && b.align || '').toLowerCase();
  return ALIGNS.has(a) ? a : 'center';
}
// Returns the extra attributes (a leading-space string) for a resizable wrapper,
// or '' when the block has no width override. Always safe to splice into a tag.
function resizeAttrs(b) {
  const w = blkWidth(b);
  if (w == null) return '';
  return ` style="--blk-w:${w}%" data-align="${blkAlign(b)}"`;
}

// Sanitise playground HTML for markdown safety:
// - strip blank lines (markdown parser gotcha: blank lines inside raw HTML blocks
//   cause the rest of the document to be treated as an escaped code block)
// - cap leading indentation to < 4 spaces (same gotcha: >=4 spaces triggers code block)
function pgHtml(html) {
  return String(html || '')
    .split('\n')
    .filter((ln) => ln.trim() !== '')
    .map((ln) => ln.replace(/^\s+/, (m) => m.length >= 4 ? '  ' : m))
    .join('\n');
}

// Figure classes from placement (flow) + size (width). 'wide' is full-bleed and
// ignores size; size sm/md narrow the figure (lg/undefined = column width = no class).
// Order is kept stable so sizeless blocks serialise byte-identically to before.
function figureClasses(b) {
  if (b.placement === 'wide') return ['breakout'];
  const out = [];
  if (b.placement === 'left') out.push('img-left');
  else if (b.placement === 'right') out.push('img-right');
  if (b.size === 'sm') out.push('img-sm');
  else if (b.size === 'md') out.push('img-md');
  return out;
}

// Placement class for the non-figure media wrappers (embed / playground / preview
// gallery) — the SAME classes the image path emits ('wide' → .breakout full-bleed,
// 'left'/'right' → .img-left/.img-right floats), so the site CSS that styles image
// placement drives these too. 'standard'/absent returns '' so every existing post
// serialises byte-identically. Returned with a leading space, safe to splice after
// the wrapper's base class.
function placementClass(b) {
  const p = b && b.placement;
  return p === 'wide' ? ' breakout' : p === 'left' ? ' img-left' : p === 'right' ? ' img-right' : '';
}

// Height cap (short/medium/tall) for media blocks — an inline style on the media
// element itself, so it works on any page with no site CSS change. Aspect is kept
// (width:auto), the element centres, and an unset cap emits nothing (byte-identical
// output for existing posts). Values match the playground frame's CLIP_HEIGHTS.
const HEIGHT_CAPS = { short: 240, medium: 400, tall: 560 };
function heightCapStyle(b) {
  const px = HEIGHT_CAPS[b && b.heightCap];
  return px ? ` style="max-height:${px}px;width:auto;max-width:100%;display:block;margin-inline:auto"` : '';
}

function imageFigure(b, slug) {
  const classes = figureClasses(b);
  const cls = classes.length ? ` class="${classes.join(' ')}"` : '';
  // Reference mode: an image reused from elsewhere in the repo carries a `url`
  // (e.g. /images/posts/<other-slug>/<file>) — emit it verbatim, no re-extraction.
  const src = b.url ? String(b.url) : `/images/posts/${slug}/${b.file}`;
  const cap = b.caption ? `<figcaption>${escHtml(b.caption)}</figcaption>` : '';
  return `<figure${cls}${resizeAttrs(b)}><img src="${escAttr(src)}" alt="${escAttr(b.alt)}" loading="lazy"${heightCapStyle(b)}>${cap}</figure>`;
}

// A `video` block is a self-hosted clip on the user's OWN Cloudflare R2 (Task 13): both
// `url` (the clip) and `poster` (a client-captured still, same bucket) are full public
// https URLs. No server transcode. Fixed markup — a `post-video` figure the site styles;
// url/poster are attribute-escaped exactly like the image serialiser escapes its src.
function videoFigure(b) {
  const cap = b.caption ? `<figcaption>${escHtml(b.caption)}</figcaption>` : '';
  return `<figure class="post-video"><video controls playsinline preload="metadata" poster="${escAttr(b.poster)}" src="${escAttr(b.url)}"></video>${cap}</figure>`;
}

// Inner markup for a figure block: optional base raster (the still backdrop), the
// inline overlay SVG, optional figcaption. Shared by the serialiser + preview. The
// base supports a published `base.file` (→ /images/posts/{slug}/{file}, same path
// convention as the image block) OR an author-time `base.base64` data URL (preview /
// draft only — publishBlocks extracts base64 to a file before serialisation).
function figureInner(b, slug) {
  const parts = [];
  // I1: only emit the base <img> for a published file OR a SAFE raster data URL.
  // A non-raster base.base64 (e.g. data:text/html) is dropped — overlay svg still renders.
  if (b.base && (b.base.file || (b.base.base64 && SAFE_IMAGE_DATA_URL.test(b.base.base64)))) {
    const src = b.base.file ? `/images/posts/${slug}/${b.base.file}` : b.base.base64;
    parts.push(`<img src="${escAttr(src)}" alt="${escAttr(b.base.alt)}" loading="lazy">`);
  }
  parts.push(sanitise(b.svg));
  if (b.caption) parts.push(`<figcaption>${escHtml(b.caption)}</figcaption>`);
  return parts.join('');
}

// Serialise a figure block to a markdown-safe raw-HTML block. The inline SVG can
// contain newlines, so the whole emitted block is run through pgHtml() to strip blank
// lines and cap indentation (< 4 spaces) — same gotcha-avoidance as the playground path.
function figureBlock(b, slug) {
  const place = b.placement === 'wide' ? 'wide'
    : b.placement === 'left' ? 'left'
    : b.placement === 'right' ? 'right' : 'default';
  const draw = b.animation === 'draw' ? ' data-draw' : '';
  // Sticker figures get an extra class so the site can apply the retro die-cut look
  // (a subtle drop-shadow). Non-sticker figures are unaffected.
  const sticker = b.kind === 'sticker' ? ' fig--sticker' : '';
  const open = `<figure class="fig fig--${place}${sticker}"${draw}${resizeAttrs(b)}>`;
  return pgHtml(`${open}${figureInner(b, slug)}</figure>`);
}

export function serialiseBlock(block, ctx = {}) {
  switch (block.type) {
    case 'heading': {
      // An untouched template-guide heading keeps its guidance in the editor placeholder
      // (b.ph), not in text — skip it rather than emitting a bare "## ".
      const t = (block.text || '').trim();
      // escHtml the heading text: the published .md is rendered with rehype-raw (no
      // sanitiser), so a heading like "<img src=x onerror=…>" would otherwise execute in
      // every reader's browser. renderPreviewHtml already escapes it — publish must match.
      return t ? `${'#'.repeat(Math.min(Math.max(block.level || 2, 2), 4))} ${escHtml(t)}` : '';
    }
    case 'text': return inlineHtmlToMd(block.html);
    case 'quote': {
      const body = inlineHtmlToMd(block.html != null ? block.html : block.text).replace(/\n/g, '\n> ');
      if (!body.trim()) return '';   // untouched guide quote — same rule as heading
      // escMdText the citation: it is plain text from the cite input emitted into a
      // MARKDOWN line, so markdown-active characters are backslash-escaped to render
      // literally. An HTML-escape here is both wrong-context (double-encodes "AT&T")
      // and insufficient — "[x](javascript:…)" would survive it as a live executable
      // link (the published .md renders with rehype-raw, NO sanitiser). The preview
      // (renderPreviewHtml) escHtml()s the cite instead — correct for ITS context
      // (direct HTML emit) — and both paths agree on the end state: literal text.
      return `> ${body}${block.cite ? `\n> — ${escMdText(block.cite)}` : ''}`;
    }
    case 'divider': return '---';
    case 'image': return imageFigure(block, ctx.slug || 'post');
    case 'video': return videoFigure(block);
    case 'figure': return figureBlock(block, ctx.slug || 'post');
    case 'raw': return String(block.content || '');
    case 'gallery': {
      const imgs = (block.images || [])
        .filter((im) => im && im.file)
        // Markdown `![alt](path)` — alt is markdown text, NOT an HTML attribute, so it
        // must NOT be HTML-escaped here (the markdown engine escapes on render; escaping
        // now would double-encode). Only neutralise what breaks the `![…](…)` syntax:
        // strip brackets and collapse newlines.
        .map((im) => `![${String(im.alt || '').replace(/[\[\]]/g, '').replace(/[\r\n]+/g, ' ').trim()}](./_images/${ctx.slug || 'post'}/${im.file})`);
      if (!imgs.length) return '';
      // Gallery images stay as markdown `![]()` so Astro's content-asset pipeline
      // resolves + optimises the co-located ./_images paths (a raw <img src="./_images">
      // would NOT be rewritten). The .gallery wrapper is built later by rehype-gallery,
      // so width/align is carried to it via a sentinel marker line directly before the
      // image run — a plain-text token that always survives markdown — which
      // rehype-gallery reads and removes. Placement rides the same sentinel (`p=wide|
      // left|right`) so rehype-gallery can put the image-path classes (breakout /
      // img-left / img-right) on the .gallery wrapper it builds. Marker tokens are
      // emitted ONLY when set, so a width-less standard-placement gallery serialises
      // exactly as before and a sized one keeps today's exact `w=NN,a=X` bytes.
      const w = blkWidth(block);
      const p = block.placement === 'wide' || block.placement === 'left' || block.placement === 'right' ? block.placement : '';
      const tokens = [];
      if (w != null) tokens.push(`w=${w}`, `a=${blkAlign(block)}`);
      if (p) tokens.push(`p=${p}`);
      const marker = tokens.length ? `[[blk-gallery:${tokens.join(',')}]]\n\n` : '';
      return `${marker}${imgs.join('\n')}`;
    }
    case 'embed': {
      const ra = resizeAttrs(block);
      // placement mirrors images (breakout / img-left / img-right on the wrapper);
      // '' when standard/absent so existing posts serialise byte-identically.
      const pl = placementClass(block);
      // videoId flows into a src="…" attribute — escAttr it (as preview does) so a crafted/
      // imported id like `x" onload="…` can't break out of the attribute on the published page.
      if (block.provider === 'youtube' && block.videoId)
        return `<div class="embed-16x9${pl}"${ra}>\n  <iframe src="https://www.youtube-nocookie.com/embed/${escAttr(block.videoId)}" title="${escAttr(block.title)}" loading="lazy" allowfullscreen></iframe>\n</div>`;
      if (block.provider === 'vimeo' && block.videoId)
        return `<div class="embed-16x9${pl}"${ra}>\n  <iframe src="https://player.vimeo.com/video/${escAttr(block.videoId)}" title="${escAttr(block.title)}" loading="lazy" allowfullscreen></iframe>\n</div>`;
      // A self-hosted <video> may carry a poster (still backdrop) + caption. It has no
      // sized container, so wrap it in a resizable figure only when sized, captioned or
      // placed; otherwise emit the bare <video> exactly as before (byte-identical for
      // old posts). M3: require an https (or same-site) src so the published https blog
      // never gets a blocked mixed-content player; an uncoercible src drops the whole block.
      if (block.src) {
        const src = safeEmbedSrc(block.src);
        if (!src) return '';
        const psrc = block.poster ? safeEmbedSrc(block.poster) : '';
        const poster = psrc ? ` poster="${escAttr(psrc)}"` : '';
        const tag = `<video src="${escAttr(src)}"${poster}${heightCapStyle(block)} controls preload="metadata" playsinline></video>`;
        const cap = block.caption ? `<figcaption>${escHtml(block.caption)}</figcaption>` : '';
        return ra || cap || pl ? `<figure class="blk-video${pl}"${ra}>${tag}${cap}</figure>` : tag;
      }
      return '';
    }
    case 'playground': {
      const html = pgHtml(block.html), js = String(block.js || '').trim();
      const css = pgHtml(block.css || '');
      if (!html && !js && !css) return '';
      // optional DOM id so authors can scope styles (#id .pg-stage{…}); each post is
      // its own page, so an unscoped <style> is also safe — id is for multi-playground pages.
      const idAttr = block.domId && /^[a-zA-Z][\w-]*$/.test(block.domId) ? ` id="${block.domId}"` : '';
      // placement mirrors images: wide → full-bleed breakout, left/right → float.
      const place = placementClass(block);
      // The .playground div is a CommonMark *type-6* HTML block — it ends at the first
      // blank line, so its inner html must be blank-line-free (pgHtml guarantees that).
      // <style> and <script> must be separated by a BLANK LINE so each starts its own
      // *type-1* HTML block, which tolerates blank lines + any indentation inside — this
      // is what lets the author's JS keep its formatting (mirrors the hand-authored posts).
      const div = `<div class="playground${place}"${idAttr}${resizeAttrs(block)}>\n${html}\n</div>`;
      const style = css ? `\n\n<style>\n${css}\n</style>` : '';
      const script = js ? `\n\n<script type="application/pg">\n${js}\n</script>` : '';
      return `${div}${style}${script}`;
    }
    // If header is empty the first row becomes the header row (headerless tables)
    case 'table': {
      const header = Array.isArray(block.header) ? block.header : [];
      const rows = Array.isArray(block.rows) ? block.rows : [];
      if (!header.length && !rows.length) return '';
      const cols = header.length || Math.max(0, ...rows.map((r) => r.length));
      // escHtml each cell: table cells land verbatim in the published .md (rehype-raw, no
      // sanitiser), so a cell "<img onerror=…>" would be stored XSS. Preview escapes them too.
      const cell = (v) => escHtml(String(v == null ? '' : v).replace(/\|/g, '\\|').replace(/\n/g, ' ').trim());
      const pad = (r) => { const a = (r || []).map(cell); while (a.length < cols) a.push(''); return a.slice(0, cols); };
      const head = header.length ? header : (rows[0] || []);
      const body = header.length ? rows : rows.slice(1);
      const line = (a) => `| ${pad(a).join(' | ')} |`;
      return [line(head), `| ${Array(cols).fill('---').join(' | ')} |`, ...body.map(line)].join('\n');
    }
    default: return '';
  }
}

// Dangerous URL schemes that must never become a live link on the (unsanitised) blog.
// Matched after optional leading whitespace, case-insensitively.
const DANGEROUS_SCHEME = /^\s*(?:javascript|data|vbscript):/i;

// Neutralise dangerous-scheme MARKDOWN links/images (stripUnsafeHtml only touches raw
// HTML, so `[x](javascript:…)` / `![x](data:…)` would otherwise survive and remark would
// render an executable <a>/<img> on the live blog). Drops the link/image but keeps the
// visible text/alt. Legitimate http(s)/mailto/relative links are left intact. Shared by
// the citation-text path; mirrors the inlineMdToHtml javascript: neutralisation.
export function stripDangerousMdLinks(s) {
  let out = String(s == null ? '' : s);
  // markdown image  ![alt](URL)  with a dangerous scheme → keep alt, drop image
  out = out.replace(/!\[([^\]]*)\]\(([^)]*)\)/g, (m, alt, url) => DANGEROUS_SCHEME.test(url) ? alt : m);
  // markdown link   [text](URL)  with a dangerous scheme → keep text, drop link
  out = out.replace(/\[([^\]]*)\]\(([^)]*)\)/g, (m, text, url) => DANGEROUS_SCHEME.test(url) ? text : m);
  // angle-bracket autolink  <javascript:…> / <data:…> / <vbscript:…> → strip entirely
  out = out.replace(/<\s*(?:javascript|data|vbscript):[^>]*>/gi, '');
  return out;
}

// A footnote DEFINITION must be a single, blank-line-free line: `[^id]: text`.
// We strip executable HTML AND dangerous-scheme markdown links/images (defence-in-depth —
// the live blog renders footnote text with no sanitiser) and flatten any newlines so the
// definition can't break the GFM footnote block or leak markup.
function citationDefText(text) {
  return stripDangerousMdLinks(stripUnsafeHtml(String(text == null ? '' : text)))
    .replace(/[\r\n]+/g, ' ')
    .replace(/[ \t]+/g, ' ')
    .trim();
}

// Append GFM footnote definitions for every citation that is actually referenced in
// the serialised body (`[^id]`), in citation-array order. Returns body unchanged when
// there are no citations or none are cited. Definitions are separated from the body by
// one blank line and joined by single newlines (a valid GFM footnote definition list).
function appendCitationDefs(body, citations) {
  if (!Array.isArray(citations) || !citations.length) return body;
  const defs = [];
  for (const c of citations) {
    const id = safeCiteId(c && c.id);
    if (!id) continue;
    // referenced if `[^id]` appears in the body (followed by a non-`:` char so a
    // stray definition line is never mistaken for a reference)
    const ref = new RegExp(`\\[\\^${id}\\](?!:)`);
    if (!ref.test(body)) continue;
    defs.push(`[^${id}]: ${citationDefText(c.text)}`);
  }
  if (!defs.length) return body;
  return `${body.replace(/\n+$/, '')}\n\n${defs.join('\n')}\n`;
}

export function serialiseBlocks(blocks, ctx = {}) {
  const body = blocks.map((b) => serialiseBlock(b, ctx)).filter((s) => s !== '').join('\n\n') + '\n';
  return appendCitationDefs(body, ctx.citations);
}

// Render a block doc to FINAL HTML for the in-app live preview (mirrors the site's
// output). Playgrounds are emitted verbatim with a runnable <script> (not the
// application/pg variant) so the preview is genuinely interactive. NOT used for
// publishing — serialiseBlocks owns that. Previewing your own content, so block.html
// (contenteditable) passes through.
export function renderPreviewHtml(blocks, ctx = {}) {
  const slug = ctx.slug || 'post';
  // No owner default: without a configured site origin, root-relative image refs stay
  // root-relative in the preview iframe (data/base64 uploads render regardless).
  const origin = ctx.siteOrigin || '';
  // A fresh in-browser upload stores RAW base64 (no data: prefix — see resize.js), so wrap
  // it as a data URL or the <img src> won't render in the preview. An already-prefixed data:
  // URL (e.g. an AI-generated image) passes through untouched.
  const asDataUri = (s) => /^data:/i.test(s) ? s : `data:image/jpeg;base64,${s}`;
  // A fresh data URL (owned upload in progress) wins; then a reference `url` to an
  // already-committed image; then the editor src; finally the conventional per-slug
  // path. url/file are root-relative, so prefix the preview origin for them.
  // A reference `url` is normally a root-relative same-site path (prefix the preview
  // origin); an ABSOLUTE url (e.g. an illustration on R2) is used verbatim — prefixing
  // the origin would corrupt it into `https://sitehttps://…`.
  const imgSrc = (b) => b.base64 ? asDataUri(b.base64) : b.url ? (/^https?:\/\//i.test(b.url) ? b.url : `${origin}${b.url}`) : (b.src || `${origin}/images/posts/${slug}/${b.file}`);
  const figure = (b) => {
    const cap = b.caption ? `<figcaption>${escHtml(b.caption)}</figcaption>` : '';
    const cls = figureClasses(b).join(' ');
    return `<figure${cls ? ` class="${cls}"` : ''}${resizeAttrs(b)}><img src="${escAttr(imgSrc(b))}" alt="${escAttr(b.alt)}"${heightCapStyle(b)}>${cap}</figure>`;
  };
  return (blocks || []).map((b) => {
    switch (b.type) {
      case 'heading': { const lvl = Math.min(Math.max(b.level || 2, 2), 4); return `<h${lvl}>${escHtml(b.text || '')}</h${lvl}>`; }
      case 'text': { const h = String(b.html || '').trim(); if (!h) return ''; return /^\s*<(p|h[1-6]|ul|ol|blockquote|figure|div|table|hr|pre)/i.test(h) ? h : `<p>${h}</p>`; }
      case 'quote': { const body = String(b.html != null ? b.html : (b.text || '')); return `<blockquote>${body}${b.cite ? `<cite>— ${escHtml(b.cite)}</cite>` : ''}</blockquote>`; }
      case 'divider': return '<hr>';
      case 'image': return (b.url || b.file || b.base64 || b.src) ? figure(b) : '';
      case 'video': {
        if (!b.url) return '';
        const cap = b.caption ? `<figcaption>${escHtml(b.caption)}</figcaption>` : '';
        const poster = b.poster ? ` poster="${escAttr(b.poster)}"` : '';
        return `<figure class="post-video"><video controls playsinline preload="metadata"${poster} src="${escAttr(b.url)}"></video>${cap}</figure>`;
      }
      case 'figure': {
        if (!b.svg) return '';
        const place = b.placement === 'wide' ? 'wide' : b.placement === 'left' ? 'left' : b.placement === 'right' ? 'right' : 'default';
        const draw = b.animation === 'draw' ? ' data-draw' : '';
        const sticker = b.kind === 'sticker' ? ' fig--sticker' : '';
        return `<figure class="fig fig--${place}${sticker}"${draw}${resizeAttrs(b)}>${figureInner(b, slug)}</figure>`;
      }
      case 'raw': return String(b.content || '');
      case 'gallery': {
        const ims = (b.images || []).filter((im) => im && (im.file || im.base64));
        if (!ims.length) return '';
        // The preview builds the .gallery wrapper itself (no rehype pass), so placement
        // lands directly as the image-path classes — mirroring what rehype-gallery does
        // on the published site from the serialiser's `p=` sentinel token.
        return `<div class="gallery${placementClass(b)}"${resizeAttrs(b)}>${ims.map((im) => `<figure><img src="${escAttr(im.base64 ? asDataUri(im.base64) : `${origin}/images/${slug}/${im.file}`)}" alt="${escAttr(im.alt)}">${im.alt ? `<figcaption>${escHtml(im.alt)}</figcaption>` : ''}</figure>`).join('')}</div>`;
      }
      case 'embed': {
        const ra = resizeAttrs(b);
        const pl = placementClass(b);
        if (b.provider === 'youtube' && b.videoId) return `<div class="embed-16x9${pl}"${ra}><iframe src="https://www.youtube-nocookie.com/embed/${escAttr(b.videoId)}" title="${escAttr(b.title)}" loading="lazy" allowfullscreen></iframe></div>`;
        if (b.provider === 'vimeo' && b.videoId) return `<div class="embed-16x9${pl}"${ra}><iframe src="https://player.vimeo.com/video/${escAttr(b.videoId)}" title="${escAttr(b.title)}" loading="lazy" allowfullscreen></iframe></div>`;
        if (b.src) {
          const poster = b.poster ? ` poster="${escAttr(b.poster)}"` : '';
          const tag = `<video src="${escAttr(b.src)}"${poster}${heightCapStyle(b)} controls preload="metadata" playsinline></video>`;
          const cap = b.caption ? `<figcaption>${escHtml(b.caption)}</figcaption>` : '';
          return ra || cap || pl ? `<figure class="blk-video${pl}"${ra}>${tag}${cap}</figure>` : tag;
        }
        return '';
      }
      case 'playground': {
        const html = pgHtml(b.html), js = String(b.js || '').trim(), css = pgHtml(b.css || '');
        if (!html && !js && !css) return '';
        const idAttr = b.domId && /^[a-zA-Z][\w-]*$/.test(b.domId) ? ` id="${b.domId}"` : '';
        return `<div class="playground${placementClass(b)}"${idAttr}${resizeAttrs(b)}>${css ? `<style>${css}</style>` : ''}${html}${js ? `<script>${js}</script>` : ''}</div>`;
      }
      case 'table': {
        const header = Array.isArray(b.header) ? b.header : [];
        const rows = Array.isArray(b.rows) ? b.rows : [];
        if (!header.length && !rows.length) return '';
        const cols = header.length || Math.max(0, ...rows.map((r) => r.length));
        const pad = (r) => { const a = (r || []).map((v) => escHtml(v == null ? '' : String(v))); while (a.length < cols) a.push(''); return a.slice(0, cols); };
        const head = header.length ? header : (rows[0] || []);
        const body = header.length ? rows : rows.slice(1);
        return `<table><thead><tr>${pad(head).map((c) => `<th>${c}</th>`).join('')}</tr></thead><tbody>${body.map((r) => `<tr>${pad(r).map((c) => `<td>${c}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
      }
      default: return '';
    }
  }).filter((s) => s !== '').join('\n');
}

// A url-mode image reference (reusing a committed repo image) must be a SAME-SITE
// image path — the publish endpoint accepts any doc via API, so this is the only place
// that stops an arbitrary/external/javascript:/data: URL becoming a live <img src>.
// ACCEPT only a relative path under /images/posts/ with no traversal: this rejects
// absolute URLs (http:/https:), protocol-relative (//host), javascript:/data:/other
// schemes, `..` segments, and stray quote/angle chars (only [A-Za-z0-9._-/] allowed).
const SAFE_IMAGE_REF = /^\/images\/posts\/[A-Za-z0-9._\-\/]+$/;
const isSafeImageRef = (url) => SAFE_IMAGE_REF.test(String(url || '')) && !String(url).split('/').includes('..');

// The Illustrations gallery (src/illustrations-manifest.json) inserts an image block whose
// `url` is a FULL https URL on the FIRST-PARTY illustration R2 bucket — NOT a same-site
// /images/posts path. That host is a fixed, app-owned asset origin (like the video block's
// own-R2 clips), so image `url` values on THIS exact host are trusted the same way: https
// only, no whitespace/quote/angle/backslash breakout chars, no `..` segment. Any other
// absolute URL stays rejected by isSafeImageRef above (an arbitrary external/js:/data: URL
// must never become a live <img src>). Keep in sync with the picker's baseUrl in index.html.
const ILLUSTRATION_ORIGIN = 'https://pub-d0c0f024bcde4912b0366f54204bd01a.r2.dev/';
const isSafeIllustrationUrl = (url) => {
  const s = String(url || '');
  return s.startsWith(ILLUSTRATION_ORIGIN) && SAFE_HTTPS_URL.test(s) && !s.split('/').includes('..');
};

// A `video` block's url/poster point at the user's OWN R2 bucket, so — unlike an image
// `url` reference (a same-site /images/posts path) — they are FULL public https URLs.
// Same spirit as isSafeImageRef: accept only an https:// URL with no whitespace or
// quote/angle/backslash chars (which could break out of the <video> attribute or inject
// markup) and no `..` path segment. This rejects http:, javascript:/data: schemes,
// protocol-relative //host, and same-site /images paths (video is never repo-committed).
const SAFE_HTTPS_URL = /^https:\/\/[^\s"'<>\\]+$/i;
const isSafeHttpsRef = (url) => {
  const s = String(url || '');
  return SAFE_HTTPS_URL.test(s) && !s.split('/').includes('..');
};

// An embed block's self-hosted <video src>/poster (M3): the published blog is https, so an
// http:// src becomes a BLOCKED mixed-content player. Coerce a safe URL/path or drop it:
//   • a root-relative same-site path (/videos/clip.mp4) is fine as-is (never mixed content);
//   • http:// is upgraded to https:// (an http video was going to be blocked anyway);
//   • the result must be a safe https ref (no whitespace/quote/angle/backslash breakout);
//   • anything else (javascript:/data:/protocol-relative //host/…) → '' so the caller drops it.
// Attribute chars that could break out of the src="" inside a raw-HTML markdown block.
const ATTR_UNSAFE = /[\s"'<>\\]/;
function safeEmbedSrc(src) {
  const s = String(src == null ? '' : src).trim();
  if (!s) return '';
  if (/^\/[^/]/.test(s)) return ATTR_UNSAFE.test(s) ? '' : s;   // root-relative same-site path
  const up = s.replace(/^http:\/\//i, 'https://');               // upgrade to dodge mixed content
  return isSafeHttpsRef(up) ? up : '';
}

// An image `file` is a BARE filename that gets joined onto /images/posts/<slug>/ (see
// serialiseBlock). A value containing a path separator or `..` could climb out of that
// directory (e.g. `../../.github/workflows/x.yml`), so reject any such filename. Applies
// to the single-image `b.file` AND to each gallery item's `im.file`.
const isUnsafeFilename = (name) => {
  const s = String(name);
  return s.includes('/') || s.includes('\\') || s.includes('..');
};

export function validateDoc(doc) {
  if (!doc || !Array.isArray(doc.blocks)) throw Object.assign(new Error('block doc must have a blocks array'), { status: 400 });
  for (const b of doc.blocks) {
    if (!b || !KNOWN.has(b.type)) throw Object.assign(new Error(`unknown block type: ${b && b.type}`), { status: 400 });
    if (b.type === 'image' && !b.file && !b.base64 && !b.url) throw Object.assign(new Error('image block needs file, base64 or url'), { status: 400 });
    // A base64 upload MUST carry a filename — else publishBlocks commits to `.../undefined`.
    if (b.type === 'image' && b.base64 && !b.file) throw Object.assign(new Error('image with image data needs a filename'), { status: 400 });
    // url-mode reference (no fresh base64 upload): require a safe same-site image path
    // OR a full https URL on the first-party illustration bucket (the gallery picker).
    if (b.type === 'image' && b.url && !b.base64 && !isSafeImageRef(b.url) && !isSafeIllustrationUrl(b.url))
      throw Object.assign(new Error('image reference must be a site image path under /images/posts/ or an illustration URL'), { status: 400 });
    // Path-traversal guard: image and gallery `file` values must be bare filenames.
    if (b.type === 'image' && b.file && isUnsafeFilename(b.file))
      throw Object.assign(new Error('unsafe image filename'), { status: 400 });
    if (b.type === 'gallery') {
      for (const im of (b.images || [])) {
        if (im && im.file && isUnsafeFilename(im.file))
          throw Object.assign(new Error('unsafe image filename'), { status: 400 });
      }
    }
    if (b.type === 'figure' && (typeof b.svg !== 'string' || b.svg.trim() === '')) throw Object.assign(new Error('figure block needs a non-empty svg string'), { status: 400 });
    // A figure drawn over an uploaded image carries base.file — guard it like image.file
    // (publishBlocks builds /images/posts/<slug>/<base.file>, so a "../.." would traverse).
    if (b.type === 'figure' && b.base && b.base.file && isUnsafeFilename(b.base.file))
      throw Object.assign(new Error('unsafe figure image filename'), { status: 400 });
    // A video block is a self-hosted clip on the user's OWN R2 — both the clip `url` and
    // the `poster` still must be safe public https URLs (validated as https refs, NOT the
    // filename-traversal guard which is for bare image filenames). Reject missing/non-https.
    if (b.type === 'video') {
      if (!isSafeHttpsRef(b.url)) throw Object.assign(new Error('video block needs an https url on your R2'), { status: 400 });
      if (!isSafeHttpsRef(b.poster)) throw Object.assign(new Error('video block needs an https poster on your R2'), { status: 400 });
    }
  }
  return true;
}

export function rawDocFromMarkdown(body) {
  // The AI "expand into blog post" route (router.js) wraps model output in a `raw`
  // block that is committed to the public blog verbatim with NO downstream sanitiser,
  // so the raw content MUST be sanitised here (browser: DOMPurify; node: regex fallback).
  return { version: 1, blocks: [{ id: 'legacy', type: 'raw', content: sanitiseHtml(String(body || '')) }] };
}

/* ─── Markdown → blocks (real parser, pure + browser-safe) ──────────────────────
   Converts a markdown document into the editor's block model, reusing only the
   EXISTING block types. Used for paste / Import-Markdown (no AI, fully offline).
   Constructs the block model lacks a dedicated type for (lists, code fences, inline
   HTML) come through as raw blocks so NOTHING is lost. Inline emphasis/links/code in
   paragraphs, headings stay as text. Block ids are assigned by the caller. */

// Inline markdown → safe inline HTML (the inverse of inlineHtmlToMd). Escapes first,
// then applies the small inline subset the text block supports: `code`, **bold**,
// *italic*, [text](url). javascript: hrefs are neutralised. No raw HTML passes through
// (callers wanting raw HTML get a raw block instead), so this is XSS-safe by construction.
export function inlineMdToHtml(s) {
  let out = String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  // code spans first (so ** / * inside them aren't treated as emphasis)
  out = out.replace(/`([^`]+)`/g, (_, t) => `<code>${t}</code>`);
  out = out.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_, t, u) => {
    const safe = /^\s*javascript:/i.test(u) ? 'about:blank#blocked' : u;
    return `<a href="${safe.replace(/"/g, '&quot;')}">${t}</a>`;
  });
  out = out.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  out = out.replace(/(^|[^*])\*([^*\n]+)\*/g, '$1<em>$2</em>');
  return out;
}

function escHtmlInline(s) {
  return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// Sanitise raw HTML that arrives via paste / Import-Markdown / citation text (C1).
// The block model passes raw HTML through verbatim and the live blog renders it with NO
// downstream sanitiser, so pasted/imported HTML must never carry executable markup —
// even as a draft. Delegates to the parser-based sanitiser (sanitise.js): in the browser
// (the real publish path) this is DOMPurify, which normalises attribute-boundary bypasses
// like `<img/src=x/onerror=…>` and drops `<svg/onload=…>` that the old regex let through;
// under node/tests it degrades to the regex fallback. Legitimate list/code/structural
// markup is preserved by the DOMPurify html profile. Kept as an exported alias so the
// existing call sites (and the name) stay stable.
export function stripUnsafeHtml(html) {
  return sanitiseHtml(String(html || ''));
}

export function blocksFromMarkdown(body) {
  const text = String(body || '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const lines = text.split('\n');
  const blocks = [];
  const push = (b) => { blocks.push(b); };
  let para = [];
  const flushPara = () => {
    if (!para.length) return;
    const joined = para.join(' ').trim();
    if (joined) push({ type: 'text', html: inlineMdToHtml(joined) });
    para = [];
  };

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    const line = raw.replace(/\s+$/, '');
    const trimmed = line.trim();

    // blank line → paragraph break
    if (trimmed === '') { flushPara(); continue; }

    // fenced code block → raw <pre><code> (preserve verbatim, incl. blank lines)
    const fence = /^(\s*)(```+|~~~+)(.*)$/.exec(line);
    if (fence) {
      flushPara();
      const marker = fence[2][0];
      const buf = [];
      i++;
      for (; i < lines.length; i++) {
        if (new RegExp('^\\s*' + marker + '{3,}\\s*$').test(lines[i])) break;
        buf.push(lines[i]);
      }
      push({ type: 'raw', content: `<pre><code>${escHtmlInline(buf.join('\n'))}</code></pre>` });
      continue;
    }

    // a line of raw HTML (figure/div/iframe/etc.) → raw block (greedy: gather the run)
    if (/^\s*</.test(line)) {
      flushPara();
      const buf = [line];
      while (i + 1 < lines.length && lines[i + 1].trim() !== '' && !/^(#{1,6}\s|>\s|\s*([-*+]|\d+\.)\s|\s*(```|~~~))/.test(lines[i + 1])) {
        i++;
        buf.push(lines[i]);
      }
      // strip executable HTML so pasted/imported markdown can never publish XSS (C1)
      push({ type: 'raw', content: stripUnsafeHtml(buf.join('\n')) });
      continue;
    }

    // ATX heading: # … → level 2-4 (H1 is reserved for the post title)
    let m = /^(#{1,6})\s+(.*)$/.exec(line);
    if (m) {
      flushPara();
      const level = Math.min(Math.max(m[1].length, 2), 4);
      push({ type: 'heading', level, text: m[2].replace(/\s+#+\s*$/, '').trim() });
      continue;
    }

    // thematic break
    if (/^(\s*)(-{3,}|\*{3,}|_{3,})\s*$/.test(line)) { flushPara(); push({ type: 'divider' }); continue; }

    // blockquote run (consume consecutive > lines) → quote block
    if (/^\s*>\s?/.test(line)) {
      flushPara();
      const qlines = [];
      while (i < lines.length && /^\s*>\s?/.test(lines[i])) {
        qlines.push(lines[i].replace(/^\s*>\s?/, ''));
        i++;
      }
      i--; // step back: the for-loop will i++
      // a trailing "— cite" / "-- cite" line becomes the citation
      let cite = '';
      const last = qlines[qlines.length - 1] || '';
      const cm = /^\s*(?:—|--|-)\s*(.+)$/.exec(last);
      if (cm && qlines.length > 1) { cite = cm[1].trim(); qlines.pop(); }
      const innerMd = qlines.join(' ').replace(/\s+/g, ' ').trim();
      push({ type: 'quote', html: inlineMdToHtml(innerMd), cite });
      continue;
    }

    // markdown table: a | … | header row immediately followed by a |---|---| separator
    if (/^\s*\|.*\|\s*$/.test(line) && i + 1 < lines.length && /^\s*\|?[\s:|-]*-[\s:|-]*\|?\s*$/.test(lines[i + 1]) && /-/.test(lines[i + 1])) {
      flushPara();
      const splitRow = (r) => r.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map((c) => c.replace(/\\\|/g, '|').trim());
      const header = splitRow(line);
      i += 2; // skip header + separator
      const rows = [];
      while (i < lines.length && /^\s*\|.*\|\s*$/.test(lines[i])) { rows.push(splitRow(lines[i])); i++; }
      i--; // step back
      push({ type: 'table', header, rows });
      continue;
    }

    // list run (ordered or unordered) → raw <ul>/<ol> (block model has no list type)
    const listItem = /^(\s*)([-*+]|\d+\.)\s+(.*)$/.exec(line);
    if (listItem) {
      flushPara();
      const ordered = /\d/.test(listItem[2]);
      const items = [];
      while (i < lines.length) {
        const li = /^(\s*)([-*+]|\d+\.)\s+(.*)$/.exec(lines[i]);
        if (!li) {
          // a non-blank continuation line folds into the previous item
          if (items.length && lines[i].trim() !== '' && /^\s+\S/.test(lines[i]) && !/^\s*</.test(lines[i])) {
            items[items.length - 1] += ' ' + lines[i].trim();
            i++; continue;
          }
          break;
        }
        items.push(li[3].trim());
        i++;
      }
      i--; // step back
      const tag = ordered ? 'ol' : 'ul';
      const html = `<${tag}>` + items.map((it) => `<li>${inlineMdToHtml(it)}</li>`).join('') + `</${tag}>`;
      // inlineMdToHtml already escapes raw HTML in item text; strip defends against any
      // path that slips executable markup through (C1) without touching <ul>/<li>/<a>.
      push({ type: 'raw', content: stripUnsafeHtml(html) });
      continue;
    }

    // otherwise: accumulate a paragraph (soft-wrapped lines join into one text block)
    para.push(trimmed);
  }
  flushPara();

  if (!blocks.length) blocks.push({ type: 'text', html: '' });
  return { version: 1, blocks };
}
