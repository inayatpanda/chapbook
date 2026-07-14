// Block document -> site markdown body. Pure, no I/O, no deps.
import { sanitise, SAFE_IMAGE_DATA_URL } from './figures/svg.js';

const KNOWN = new Set(['heading', 'text', 'image', 'quote', 'divider', 'raw', 'gallery', 'embed', 'playground', 'table', 'figure']);

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
  s = s.replace(/<a\s+[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi, (_, href, txt) => `[${txt.replace(/<[^>]+>/g, '')}](${href})`);
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

function escAttr(s) { return String(s || '').replace(/"/g, '&quot;'); }
function escHtml(s) { return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

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
      return t ? `${'#'.repeat(Math.min(Math.max(block.level || 2, 2), 4))} ${t}` : '';
    }
    case 'text': return inlineHtmlToMd(block.html);
    case 'quote': {
      const body = inlineHtmlToMd(block.html != null ? block.html : block.text).replace(/\n/g, '\n> ');
      if (!body.trim()) return '';   // untouched guide quote — same rule as heading
      return `> ${body}${block.cite ? `\n> — ${block.cite}` : ''}`;
    }
    case 'divider': return '---';
    case 'image': return imageFigure(block, ctx.slug || 'post');
    case 'figure': return figureBlock(block, ctx.slug || 'post');
    case 'raw': return String(block.content || '');
    case 'gallery': {
      const imgs = (block.images || [])
        .filter((im) => im && im.file)
        .map((im) => `![${escAttr(im.alt).replace(/[\[\]]/g, '')}](./_images/${ctx.slug || 'post'}/${im.file})`);
      if (!imgs.length) return '';
      // Gallery images stay as markdown `![]()` so Astro's content-asset pipeline
      // resolves + optimises the co-located ./_images paths (a raw <img src="./_images">
      // would NOT be rewritten). The .gallery wrapper is built later by rehype-gallery,
      // so width/align is carried to it via a sentinel marker line directly before the
      // image run — a plain-text token that always survives markdown — which
      // rehype-gallery reads and removes. Emitted ONLY when a width is set, so a
      // width-less gallery serialises exactly as before.
      const w = blkWidth(block);
      const marker = w == null ? '' : `[[blk-gallery:w=${w},a=${blkAlign(block)}]]\n\n`;
      return `${marker}${imgs.join('\n')}`;
    }
    case 'embed': {
      const ra = resizeAttrs(block);
      if (block.provider === 'youtube' && block.videoId)
        return `<div class="embed-16x9"${ra}>\n  <iframe src="https://www.youtube-nocookie.com/embed/${block.videoId}" title="${escAttr(block.title)}" loading="lazy" allowfullscreen></iframe>\n</div>`;
      if (block.provider === 'vimeo' && block.videoId)
        return `<div class="embed-16x9"${ra}>\n  <iframe src="https://player.vimeo.com/video/${block.videoId}" title="${escAttr(block.title)}" loading="lazy" allowfullscreen></iframe>\n</div>`;
      // A self-hosted <video> may carry a poster (still backdrop) + caption. It has no
      // sized container, so wrap it in a resizable figure only when sized or captioned;
      // otherwise emit the bare <video> exactly as before (byte-identical for old posts).
      if (block.src) {
        const poster = block.poster ? ` poster="${escAttr(block.poster)}"` : '';
        const tag = `<video src="${escAttr(block.src)}"${poster}${heightCapStyle(block)} controls preload="metadata" playsinline></video>`;
        const cap = block.caption ? `<figcaption>${escHtml(block.caption)}</figcaption>` : '';
        return ra || cap ? `<figure class="blk-video"${ra}>${tag}${cap}</figure>` : tag;
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
      const place = block.placement === 'wide' ? ' breakout'
        : block.placement === 'left' ? ' img-left'
        : block.placement === 'right' ? ' img-right' : '';
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
      const cell = (v) => String(v == null ? '' : v).replace(/\|/g, '\\|').replace(/\n/g, ' ').trim();
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
  // A fresh data URL (owned upload in progress) wins; then a reference `url` to an
  // already-committed image; then the editor src; finally the conventional per-slug
  // path. url/file are root-relative, so prefix the preview origin for them.
  const imgSrc = (b) => b.base64 ? b.base64 : b.url ? `${origin}${b.url}` : (b.src || `${origin}/images/posts/${slug}/${b.file}`);
  const placeCls = (p) => p === 'wide' ? ' breakout' : p === 'left' ? ' img-left' : p === 'right' ? ' img-right' : '';
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
        return `<div class="gallery"${resizeAttrs(b)}>${ims.map((im) => `<figure><img src="${escAttr(im.base64 || `${origin}/images/${slug}/${im.file}`)}" alt="${escAttr(im.alt)}">${im.alt ? `<figcaption>${escHtml(im.alt)}</figcaption>` : ''}</figure>`).join('')}</div>`;
      }
      case 'embed': {
        const ra = resizeAttrs(b);
        if (b.provider === 'youtube' && b.videoId) return `<div class="embed-16x9"${ra}><iframe src="https://www.youtube-nocookie.com/embed/${escAttr(b.videoId)}" title="${escAttr(b.title)}" loading="lazy" allowfullscreen></iframe></div>`;
        if (b.provider === 'vimeo' && b.videoId) return `<div class="embed-16x9"${ra}><iframe src="https://player.vimeo.com/video/${escAttr(b.videoId)}" title="${escAttr(b.title)}" loading="lazy" allowfullscreen></iframe></div>`;
        if (b.src) {
          const poster = b.poster ? ` poster="${escAttr(b.poster)}"` : '';
          const tag = `<video src="${escAttr(b.src)}"${poster}${heightCapStyle(b)} controls preload="metadata" playsinline></video>`;
          const cap = b.caption ? `<figcaption>${escHtml(b.caption)}</figcaption>` : '';
          return ra || cap ? `<figure class="blk-video"${ra}>${tag}${cap}</figure>` : tag;
        }
        return '';
      }
      case 'playground': {
        const html = pgHtml(b.html), js = String(b.js || '').trim(), css = pgHtml(b.css || '');
        if (!html && !js && !css) return '';
        const idAttr = b.domId && /^[a-zA-Z][\w-]*$/.test(b.domId) ? ` id="${b.domId}"` : '';
        return `<div class="playground${placeCls(b.placement)}"${idAttr}${resizeAttrs(b)}>${css ? `<style>${css}</style>` : ''}${html}${js ? `<script>${js}</script>` : ''}</div>`;
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

export function validateDoc(doc) {
  if (!doc || !Array.isArray(doc.blocks)) throw Object.assign(new Error('block doc must have a blocks array'), { status: 400 });
  for (const b of doc.blocks) {
    if (!b || !KNOWN.has(b.type)) throw Object.assign(new Error(`unknown block type: ${b && b.type}`), { status: 400 });
    if (b.type === 'image' && !b.file && !b.base64 && !b.url) throw Object.assign(new Error('image block needs file, base64 or url'), { status: 400 });
    // url-mode reference (no fresh base64 upload): require a safe same-site image path.
    if (b.type === 'image' && b.url && !b.base64 && !isSafeImageRef(b.url))
      throw Object.assign(new Error('image reference must be a site image path under /images/posts/'), { status: 400 });
    if (b.type === 'figure' && (typeof b.svg !== 'string' || b.svg.trim() === '')) throw Object.assign(new Error('figure block needs a non-empty svg string'), { status: 400 });
  }
  return true;
}

export function rawDocFromMarkdown(body) {
  return { version: 1, blocks: [{ id: 'legacy', type: 'raw', content: String(body || '') }] };
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

// Defence-in-depth strip for raw HTML that arrives via paste / Import-Markdown (C1).
// The block model passes raw HTML through verbatim and the live blog renders it with
// NO sanitiser, so pasted/imported HTML must never carry executable markup — even as a
// draft. Removes <script>/<iframe>/<object>/<embed> elements, on*= handlers, and
// neutralises javascript: in href/src. Legitimate list/code/structural markup is kept.
export function stripUnsafeHtml(html) {
  let s = String(html || '');
  // whole elements (with or without a close tag) for the dangerous trio + script
  s = s.replace(/<(script|iframe|object|embed)\b[\s\S]*?<\/\1\s*>/gi, '');
  // stray / self-closing / unclosed openers of the same tags
  s = s.replace(/<\/?(?:script|iframe|object|embed)\b[^>]*>/gi, '');
  // inline event-handler attributes:  onerror="…"  onclick='…'  onload=foo
  s = s.replace(/\son\w+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, '');
  // neutralise javascript: in href / src (drop the whole attribute)
  s = s.replace(/\s(?:href|src)\s*=\s*(?:"\s*javascript:[^"]*"|'\s*javascript:[^']*'|javascript:[^\s>]*)/gi, '');
  return s;
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
