// Pre-publish checks for a block document. Returns { ok, errors, warnings }.
// Errors should block publishing; warnings are advisory ("publish anyway").
//
// The headline job is catching the documented playground gotcha: markdown turns the
// rest of an HTML block into escaped text the moment it hits a blank line or a line
// indented 4+ spaces. Playground *blocks* are auto-sanitised by blocks.js (pgHtml),
// so the real risks are (a) hand-pasted `raw` blocks and (b) playground JS with a
// syntax error — JS isn't sanitised and a broken script just silently never runs.
import { serialiseBlocks } from './blocks.js';
import { SAFE_IMAGE_DATA_URL } from './figures/svg.js';

// Classify a string as an IP literal: 4 = IPv4, 6 = IPv6, 0 = neither. A pure-JS
// stand-in for node:net's isIP so this module also bundles for the browser Studio
// (esbuild can't resolve node: built-ins). Conservative on purpose: anything that
// looks IP-ish is classified so the SSRF caller can block it; the caller does the
// detailed octet validation. Behaviour matches isIP for the values it sees here.
function isIP(s) {
  const h = String(s || '');
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(h)) return 4;                 // dotted-quad IPv4
  if (h.includes(':') && /^[0-9a-f:]+$/i.test(h)) return 6;        // hex + colons → IPv6
  return 0;
}

// Parse JS as a function body; return the error message, or null if it parses.
function jsSyntaxError(js) {
  const src = String(js || '').trim();
  if (!src) return null;
  try { new Function(src); return null; }
  catch (e) { return e.message; }
}

// Visual width of leading whitespace (a tab counts as 4 columns, per CommonMark).
function leadingWidth(ln) {
  let w = 0;
  for (const ch of ln) { if (ch === ' ') w++; else if (ch === '\t') w += 4; else break; }
  return w;
}

// Markdown-breaking risks in hand-authored HTML (raw blocks aren't sanitised).
function rawHtmlRisks(content) {
  const out = [];
  const text = String(content || '');
  if (!/<\w/.test(text)) return out; // not HTML — nothing to check
  const lines = text.split('\n');
  if (lines.some((ln, i) => i > 0 && i < lines.length - 1 && ln.trim() === ''))
    out.push('contains a blank line — markdown cuts the HTML block off there, so the rest of the post renders as escaped text');
  if (lines.some((ln) => ln.trim() && leadingWidth(ln) >= 4))
    out.push('has a line indented 4+ spaces — markdown turns it into a code block');
  return out;
}

// Reproduce the normalisations a browser applies to an attribute-value URL BEFORE it
// resolves the scheme (mirrors sanitise.js normaliseUrl): (1) decode HTML character
// references — numeric &#NN;/&#xNN; plus the scheme-relevant named refs — then
// (2) strip ASCII whitespace + control chars. Lower-cased so scheme tests are
// case-insensitive. Without this, `java&#x0a;script:` and `java\tscript:` sail past a
// literal /javascript:/ match yet run in the visitor's browser (stress-harness find).
function decodeRefsAndStrip(raw) {
  return String(raw || '')
    .replace(/&#x([0-9a-f]+);?/gi, (_m, h) => { try { return String.fromCodePoint(parseInt(h, 16)); } catch { return ''; } })
    .replace(/&#(\d+);?/g, (_m, n) => { try { return String.fromCodePoint(parseInt(n, 10)); } catch { return ''; } })
    .replace(/&colon;/gi, ':').replace(/&(?:tab|newline|nbsp);/gi, ' ')
    .replace(/[\u0000-\u0020]+/g, '')
    .toLowerCase();
}

// Every href / xlink:href / src attribute VALUE in a fragment (either quote style, or
// unquoted). Shared by rawHtmlUnsafe and figureSvgRisk so both gates normalise values
// the same way before their scheme checks.
const ATTR_URL_RE = /(?:(?:xlink:)?href|src)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s">]+))/gi;
function* attrUrlValues(s) {
  ATTR_URL_RE.lastIndex = 0;
  let m;
  while ((m = ATTR_URL_RE.exec(s))) yield (m[1] !== undefined ? m[1] : m[2] !== undefined ? m[2] : m[3]) || '';
}

// Detect executable / unsafe HTML in a raw block. The Studio publishes raw blocks
// verbatim to the live blog, which renders raw HTML with NO server-side sanitiser, so
// any of these = stored XSS (C1). Mirrors figureSvgRisk(): string/regex passes only,
// returns a human reason or null. The publish button is hidden when errors.length > 0,
// so flagging these as ERRORS closes the publish path for ANY raw block.
function rawHtmlUnsafe(content) {
  const s = String(content || '');
  if (/<script\b/i.test(s)) return 'a <script> tag';
  if (/<(?:iframe|object|embed)\b/i.test(s)) return 'an <iframe>, <object> or <embed> element';
  // Event-handler attributes. NOTE: this is the WARN-GATE that blocks publishing — the
  // product's stated safety contract for raw blocks (the published blog renders raw HTML
  // with NO sanitiser), so a miss here is stored XSS. Browsers accept ANY attribute
  // delimiter before the name, not just whitespace: `<img/src=x/onerror=…>` is a live
  // handler, so match on…= after whitespace, `/`, a quote or a backtick — or at the very
  // start of the block. The word-boundary `on\w+\s*=` shape is kept so attributes that
  // merely CONTAIN "on" (class="beacon", data-son="x", contenteditable=…) never trip.
  if (/(?:^|[\s/"'`])on\w+\s*=/i.test(s)) return 'an inline event handler (on…=)';
  // Scheme checks run on a browser-NORMALISED copy of the whole block (entities decoded,
  // whitespace/control chars stripped) — the strictest option: it catches the schemes in
  // attributes with any delimiter/quoting AND bare in text. Subsumes the old literal
  // /javascript:/ test (a literal match survives normalisation unchanged).
  const norm = decodeRefsAndStrip(s);
  if (/javascript:/.test(norm)) return 'a javascript: URL';
  if (/vbscript:/.test(norm)) return 'a vbscript: URL';
  // data: URLs in href/src — a markup-capable data: document (data:text/html,
  // data:image/svg+xml…) executes script in the visitor's browser. Extract each value
  // from the RAW string (attribute syntax intact), normalise it like a browser, then
  // allow only the safe raster shapes (same policy as figureSvgRisk / figures/svg.js).
  for (const raw of attrUrlValues(s)) {
    const v = decodeRefsAndStrip(raw);
    if (/^data:/.test(v) && !SAFE_IMAGE_DATA_URL.test(v)) return 'an unsafe data: URL (href/src)';
  }
  return null;
}

const PLACEHOLDER_HREF = /href\s*=\s*["'](\s*|#|#TODO[^"']*)["']/i;

// ── Quality / polish helpers (advisory — warnings, never hard blocks) ─────────

// Strip tags → plain text (rough; good enough for word/sentence counts).
function plainText(html) { return String(html || '').replace(/<[^>]*>/g, ' ').replace(/&[a-z#0-9]+;/gi, ' '); }

function countSyllables(word) {
  word = word.toLowerCase().replace(/[^a-z]/g, '');
  if (word.length <= 3) return word ? 1 : 0;
  word = word.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, '').replace(/^y/, '');
  const m = word.match(/[aeiouy]{1,2}/g);
  return m ? m.length : 1;
}

// Flesch reading-ease over the document's body text. Mirrors the client's
// computeReadability() so the advisory band agrees with the SEO preview.
export function readingLevel(text) {
  const body = String(text || '');
  const words = body.match(/[A-Za-z0-9'’-]+/g) || [];
  const wordCount = words.length;
  const sentences = body.match(/[^.!?]+[.!?]+/g) || (body.trim() ? [body] : []);
  const sentCount = Math.max(1, sentences.length);
  const syllables = words.reduce((n, w) => n + countSyllables(w), 0);
  const avgSentLen = wordCount ? wordCount / sentCount : 0;
  const flesch = wordCount ? Math.max(0, Math.min(100, 206.835 - 1.015 * avgSentLen - 84.6 * (syllables / wordCount))) : 0;
  let band = 'Plain, easy to read';
  if (flesch < 30) band = 'Very dense';
  else if (flesch < 50) band = 'Dense — consider shorter sentences';
  else if (flesch < 60) band = 'Fairly readable';
  return { wordCount, flesch: Math.round(flesch), band };
}

// American → British spelling map. Each key is matched whole-word, case-insensitively.
// Deliberately small + high-confidence — advisory only (CLAUDE.md: British spelling).
const AME_TO_BRE = {
  color: 'colour', colors: 'colours', colored: 'coloured', coloring: 'colouring',
  honor: 'honour', honors: 'honours', favor: 'favour', favorite: 'favourite',
  behavior: 'behaviour', behaviors: 'behaviours', neighbor: 'neighbour',
  flavor: 'flavour', labor: 'labour', humor: 'humour', rumor: 'rumour', tumor: 'tumour',
  optimize: 'optimise', optimized: 'optimised', optimizing: 'optimising', optimization: 'optimisation',
  organize: 'organise', organized: 'organised', organization: 'organisation',
  recognize: 'recognise', recognized: 'recognised', realize: 'realise', realized: 'realised',
  analyze: 'analyse', analyzed: 'analysed', analyzing: 'analysing',
  center: 'centre', centers: 'centres', centered: 'centred', fiber: 'fibre',
  liter: 'litre', meter: 'metre', theater: 'theatre',
  defense: 'defence', offense: 'offence', license: 'licence', practice: 'practise',
  catalog: 'catalogue', dialog: 'dialogue', gray: 'grey', mold: 'mould',
  traveled: 'travelled', traveling: 'travelling', canceled: 'cancelled', modeling: 'modelling',
  jewelry: 'jewellery', aluminum: 'aluminium', anesthesia: 'anaesthesia',
  pediatric: 'paediatric',
  esophagus: 'oesophagus', edema: 'oedema', fetal: 'foetal', hemoglobin: 'haemoglobin',
};
const AME_RE = new RegExp('\\b(' + Object.keys(AME_TO_BRE).join('|') + ')\\b', 'gi');

// Scan body text for Americanisms → list of "color→colour" suggestions (deduped).
function findAmericanisms(text) {
  const found = new Map();
  let m;
  AME_RE.lastIndex = 0;
  while ((m = AME_RE.exec(text))) {
    const hit = m[1].toLowerCase();
    const bre = AME_TO_BRE[hit];
    if (bre && !found.has(hit)) found.set(hit, `${hit}→${bre}`);
  }
  return [...found.values()];
}

// Collect the heading levels in document order. A `heading` block contributes its
// `level`; a `text` block's HTML may also carry <h2>…<h6> (e.g. pasted markdown).
function collectHeadingLevels(blocks) {
  const levels = [];
  for (const b of blocks) {
    if (b.type === 'heading') { levels.push(Math.min(Math.max(b.level || 2, 2), 6)); continue; }
    if (b.type === 'text' && b.html) {
      const re = /<h([1-6])[\s>]/gi; let m;
      while ((m = re.exec(b.html))) levels.push(Number(m[1]));
    }
  }
  return levels;
}

// Heading-hierarchy warnings: an H3 before any H2, or a skipped level (e.g. H2→H4).
// (H1 is the post title — flag a body H1 too.)
function headingHierarchyWarnings(blocks) {
  const out = [];
  const levels = collectHeadingLevels(blocks);
  let prev = 1; // the title is the implicit H1
  let seenH2 = false;
  for (const lvl of levels) {
    if (lvl === 1) { out.push('A body heading is an H1 — the post title is already the H1. Use H2 for top-level sections.'); continue; }
    if (lvl === 2) seenH2 = true;
    else if (lvl >= 3 && !seenH2) { out.push(`An H${lvl} appears before any H2 — start sections with H2.`); }
    if (lvl > prev + 1) out.push(`Heading level jumps from H${prev} to H${lvl} — don’t skip levels (use H${prev + 1} next).`);
    prev = lvl;
  }
  // dedupe
  return [...new Set(out)];
}

// Collect every href in the doc (text-block HTML + raw HTML), deduped, lowercased-scheme.
export function collectLinks(blocks) {
  const hrefs = new Set();
  const re = /href\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s">]+))/gi;
  for (const b of blocks) {
    const html = b.type === 'text' ? b.html : (b.type === 'raw' ? b.content : '');
    if (!html) continue;
    let m;
    while ((m = re.exec(String(html)))) {
      const v = (m[1] ?? m[2] ?? m[3] ?? '').trim();
      if (!v || v.startsWith('#') || /^mailto:/i.test(v) || /^javascript:/i.test(v)) continue;
      hrefs.add(v);
    }
  }
  return [...hrefs];
}

// Partition collected links into internal /blog/<slug> links and external (http/https).
export function classifyLinks(links) {
  const internal = [], external = [];
  for (const u of links) {
    const m = /^\/blog\/([^/?#]+)\/?/.exec(u);
    if (m) internal.push({ url: u, slug: m[1] });
    else if (/^https?:\/\//i.test(u)) external.push(u);
    // other root-relative or protocol-relative links are left unchecked (advisory tool)
  }
  return { internal, external };
}

// Detect an unsafe marker in figure SVG. String/regex passes only (mirrors svg.js
// sanitise); we DON'T compare against sanitise() output because it canonicalises
// CSS and would false-positive on clean figures. Returns a reason or null.
function figureSvgRisk(svg) {
  const s = String(svg || '');
  if (/<script\b/i.test(s)) return 'a <script> tag';
  if (/<foreignObject\b/i.test(s)) return 'a <foreignObject> element';
  // SMIL: <animate>/<set>/<animateTransform>/<animateMotion> can rewrite an
  // ancestor href to javascript: at runtime (sanitise() strips these — C2).
  if (/<(?:animate|set|animateTransform|animateMotion)\b/i.test(s)) return 'a SMIL animation element (animate/set/…)';
  // Same delimiter class as rawHtmlUnsafe(): browsers accept '/', quotes and
  // backticks before an attribute name, so <rect/onclick=…> is a live handler.
  if (/(?:^|[\s/"'`])on\w+\s*=/i.test(s)) return 'an inline event handler (on…=)';
  // External href / xlink:href / src (http:, https: or protocol-relative //).
  if (/(?:(?:xlink:)?href|src)\s*=\s*["']?\s*(?:https?:|\/\/)/i.test(s)) return 'an external link (href)';
  // Scheme checks on every href / xlink:href / src value (either quote style, or
  // unquoted). The value is NORMALISED first — HTML character references decoded, THEN
  // all whitespace/control chars stripped (decodeRefsAndStrip) — because browsers apply
  // exactly those steps before resolving a URL scheme: href=" \tjavascript:…",
  // href="java\nscript:…" AND href="jav&#x61;script:…" are all live. The gate must be
  // at least as strict as the serialiser's sanitiser (figures/svg.js), which drops any
  // href/src that is not a #anchor or a safe raster data URL.
  for (const raw of attrUrlValues(s)) {
    const v = decodeRefsAndStrip(raw);
    // javascript:/vbscript: are executable URL schemes (any delimiter, any padding).
    if (/^(?:javascript|vbscript):/.test(v)) return 'a javascript: link (href/src)';
    // A data: URL that is NOT a safe raster (e.g. data:image/svg+xml, data:text/html).
    // sanitise() strips these (C1), so prepublish must flag them too.
    if (/^data:/.test(v) && !SAFE_IMAGE_DATA_URL.test(v)) return 'an unsafe data: link (href)';
  }
  return null;
}

export function checkDoc({ doc, meta = {}, slug = 'post', knownSlugs = null } = {}) {
  const errors = [], warnings = [];
  const polish = []; // advisory quality findings, grouped + scored (separate from the publish-gating list)
  const blocks = (doc && Array.isArray(doc.blocks)) ? doc.blocks : [];

  // ── Frontmatter / meta ──
  if (!String(meta.title || '').trim()) errors.push({ message: 'Title is required.' });
  const desc = String(meta.description || '').trim();
  if (!desc) warnings.push({ message: 'No description — search results and share cards will fall back to the first line of the post.' });
  else if (desc.length > 155) warnings.push({ message: `Description is ${desc.length} characters — it will be trimmed to 155 in the post’s metadata.` });
  if (meta.date && !/^\d{4}-\d{2}-\d{2}$/.test(String(meta.date))) warnings.push({ message: `Date “${meta.date}” isn’t in YYYY-MM-DD form.` });
  const topics = (meta.tags || []).filter(Boolean);
  if (!topics.length) warnings.push({ message: 'No topic selected — the post won’t appear under any topic on the Writing page.' });

  // ── Content ──
  if (!blocks.length) errors.push({ message: 'The post has no content blocks.' });
  let hasText = false;
  blocks.forEach((b, i) => {
    switch (b.type) {
      case 'text':
        if (String(b.html || '').replace(/<[^>]*>/g, '').trim()) hasText = true;
        break;
      case 'image':
        if (!b.file && !b.base64 && !b.src) errors.push({ message: 'Image block has no image.', blockIndex: i });
        else if (!String(b.alt || '').trim()) warnings.push({ message: 'Image has no alt text (hurts accessibility and SEO).', blockIndex: i });
        break;
      case 'gallery':
        if ((b.images || []).some((im) => im && !String(im.alt || '').trim()))
          warnings.push({ message: 'A gallery image has no alt text.', blockIndex: i });
        break;
      case 'playground': {
        const err = jsSyntaxError(b.js);
        if (err) errors.push({ message: `Playground script won’t run — syntax error: ${err}`, blockIndex: i });
        if (!String(b.html || '').trim() && !String(b.js || '').trim() && !String(b.css || '').trim())
          warnings.push({ message: 'Playground is empty.', blockIndex: i });
        if (b.domId && !/^[a-zA-Z][\w-]*$/.test(b.domId))
          warnings.push({ message: `Playground id “${b.domId}” is invalid and will be ignored.`, blockIndex: i });
        break;
      }
      case 'figure': {
        const svg = String(b.svg || '');
        if (!svg.trim()) { errors.push({ message: 'Figure block has no SVG.', blockIndex: i }); break; }
        const risk = figureSvgRisk(svg);
        if (risk) errors.push({ message: `Figure SVG is unsafe — it contains ${risk}.`, blockIndex: i });
        if (!/<svg[\s>]/i.test(svg) || !/<\/svg\s*>/i.test(svg))
          errors.push({ message: 'Figure SVG looks malformed (missing an <svg> … </svg> wrapper).', blockIndex: i });
        if (!String(b.alt || '').trim())
          warnings.push({ message: 'Figure has no alt text (hurts accessibility and SEO).', blockIndex: i });
        if (/#[0-9a-f]{3,8}\b/i.test(svg))
          warnings.push({ message: 'Figure SVG uses a # hex colour — it won’t follow the site theme. Use CSS variables (e.g. var(--ink)) instead.', blockIndex: i });
        break;
      }
      case 'raw': {
        const c = String(b.content || '');
        // Unsafe HTML blocks publishing — raw blocks render verbatim on the live blog
        // with no sanitiser (C1). This catches hand-authored AND markdown-ingested raw.
        const unsafe = rawHtmlUnsafe(c);
        if (unsafe) errors.push({ message: `Raw HTML block is unsafe — it contains ${unsafe}. This would run on the live site. Remove it (or use a Playground block, which sanitises for you).`, blockIndex: i });
        for (const r of rawHtmlRisks(c))
          warnings.push({ message: `Raw HTML block ${r}. Tip: a Playground block sanitises this for you.`, blockIndex: i });
        const scriptRe = /<script[^>]*>([\s\S]*?)<\/script>/gi; let sm;
        while ((sm = scriptRe.exec(c))) {
          const err = jsSyntaxError(sm[1]);
          if (err) errors.push({ message: `Script in raw block won’t run — syntax error: ${err}`, blockIndex: i });
        }
        break;
      }
    }
    const html = b.html != null ? String(b.html) : (b.type === 'raw' ? String(b.content || '') : '');
    if (html && PLACEHOLDER_HREF.test(html))
      warnings.push({ message: 'A link has an empty or placeholder (#) href.', blockIndex: i });
  });
  if (blocks.length && !hasText) warnings.push({ message: 'The post has no body text.' });

  // ── Final-markdown scan: type-6 HTML playground block broken by a blank line ──
  try {
    const md = serialiseBlocks(blocks, { slug });
    const re = /<div class="playground[^"]*"[^>]*>\n([\s\S]*?)\n<\/div>/g; let m;
    while ((m = re.exec(md))) {
      if (/\n[ \t]*\n/.test(m[1]))
        errors.push({ message: 'A playground’s HTML still contains a blank line in the published markdown — it will break. Remove blank lines from the HTML.' });
    }
  } catch { /* serialise failures surface via validateDoc on publish */ }

  // ── Polish report (advisory) ──────────────────────────────────────────────
  // Grouped quality findings: heading hierarchy, alt completeness, reading level,
  // British spelling, and internal-link validity. External links + reachability are
  // checked by the async POST /posts/lint route (network I/O), folded in client-side.
  const bodyText = blocks
    .map((b) => (b.type === 'text' ? plainText(b.html) : (b.type === 'heading' ? (b.text || '') : (b.type === 'quote' ? (b.text || '') : ''))))
    .join(' ');

  const headingIssues = headingHierarchyWarnings(blocks);
  polish.push({ group: 'Heading structure', level: headingIssues.length ? 'amber' : 'green',
    items: headingIssues.length ? headingIssues : ['Headings are well-nested (H2 → H3 → H4, no skips).'] });

  // Alt completeness across image / gallery / figure blocks.
  const altGaps = [];
  blocks.forEach((b, i) => {
    if (b.type === 'image' && (b.file || b.base64 || b.src) && !String(b.alt || '').trim()) altGaps.push(`Image (block ${i + 1}) has no alt text.`);
    if (b.type === 'figure' && String(b.svg || '').trim() && !String(b.alt || '').trim()) altGaps.push(`Figure (block ${i + 1}) has no alt text.`);
    if (b.type === 'gallery') (b.images || []).forEach((im, j) => { if (im && !String(im.alt || '').trim()) altGaps.push(`Gallery image ${j + 1} (block ${i + 1}) has no alt text.`); });
  });
  polish.push({ group: 'Image alt text', level: altGaps.length ? 'amber' : 'green',
    items: altGaps.length ? altGaps : ['Every image, gallery image and figure has alt text.'] });

  // Reading level (Flesch band).
  const rl = readingLevel(bodyText);
  polish.push({ group: 'Reading level', level: rl.flesch < 50 && rl.wordCount > 60 ? 'amber' : 'green',
    items: [`Flesch ${rl.flesch} — ${rl.band}. ${rl.wordCount.toLocaleString()} words.`] });

  // British spelling.
  const ame = findAmericanisms(bodyText);
  polish.push({ group: 'British spelling', level: ame.length ? 'amber' : 'green',
    items: ame.length ? [`${ame.length} possible Americanism${ame.length > 1 ? 's' : ''}: ${ame.join(', ')}`] : ['No American spellings detected.'] });

  // Internal-link validity (against listPosts, when the caller supplies known slugs).
  const links = collectLinks(blocks);
  const { internal, external } = classifyLinks(links);
  if (Array.isArray(knownSlugs)) {
    const known = new Set(knownSlugs);
    const bad = internal.filter((l) => l.slug !== slug && !known.has(l.slug)).map((l) => l.url);
    polish.push({ group: 'Internal links', level: bad.length ? 'amber' : 'green',
      items: bad.length ? bad.map((u) => `${u} — no post with that slug.`) : [`${internal.length} internal link${internal.length === 1 ? '' : 's'} checked — all resolve.`] });
  } else if (internal.length) {
    polish.push({ group: 'Internal links', level: 'green', items: [`${internal.length} internal link${internal.length === 1 ? '' : 's'} found (run the link check to validate).`] });
  }

  // External links are listed here; reachability is checked by /posts/lint (async).
  const externalCount = external.length;

  // Polish score: start at 100, −8 per amber group (floor 0). Advisory only.
  const amberGroups = polish.filter((p) => p.level === 'amber').length;
  const score = Math.max(0, 100 - amberGroups * 8);

  return { ok: errors.length === 0, errors, warnings, polish, score, externalLinks: external, externalCount, internalLinks: internal.map((l) => l.url) };
}

// ── Async broken-link check (network I/O — server-side only) ──────────────────
// SSRF guard: the lint probes URLs lifted from a post, server-side, from inside the
// laptop's trust boundary. A doc link to a loopback/private/link-local host (e.g.
// http://127.0.0.1:4800, http://169.254.169.254 cloud metadata, http://10.x) must
// NEVER be fetched. isBlockedHost classifies a URL hostname as internal/non-routable.
//   blocks: localhost / *.localhost; loopback 127.0.0.0/8, ::1, 0.0.0.0;
//   private 10., 192.168., 172.16–31.; link-local 169.254., IPv6 fe80:; IPv6 ULA fc/fd.
export function isBlockedHost(hostname) {
  if (!hostname) return true;
  let h = String(hostname).trim().toLowerCase();
  // URL hostnames for IPv6 may arrive bracketed ([::1]); strip the brackets.
  if (h.startsWith('[') && h.endsWith(']')) h = h.slice(1, -1);

  // Hostnames (not literal IPs).
  if (h === 'localhost' || h.endsWith('.localhost')) return true;

  const kind = isIP(h); // 0 = not an IP, 4 = IPv4, 6 = IPv6
  if (kind === 4) {
    const o = h.split('.').map((n) => Number(n));
    if (o.length !== 4 || o.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) return true; // malformed → block
    if (o[0] === 127) return true;                       // loopback 127.0.0.0/8
    if (o[0] === 0) return true;                          // 0.0.0.0/8 ("this host")
    if (o[0] === 10) return true;                         // private 10.0.0.0/8
    if (o[0] === 192 && o[1] === 168) return true;        // private 192.168.0.0/16
    if (o[0] === 172 && o[1] >= 16 && o[1] <= 31) return true; // private 172.16.0.0/12
    if (o[0] === 169 && o[1] === 254) return true;        // link-local 169.254.0.0/16 (incl. metadata)
    return false;
  }
  if (kind === 6) {
    if (h === '::1' || h === '::') return true;           // loopback / unspecified
    if (h.startsWith('fe80:')) return true;               // link-local
    if (h.startsWith('fc') || h.startsWith('fd')) return true; // unique-local fc00::/7
    return false;
  }
  return false; // an ordinary public hostname
}

// Probe a single URL: HEAD first (cheap), fall back to GET if HEAD is rejected
// (405/501 or a network error — many servers don't implement HEAD). A short timeout
// keeps a hung host from blocking. Returns { url, ok, status?, error? }.
// SSRF: only http(s), and never a blocked host; redirects are NOT auto-followed
// (redirect:'manual') so a 3xx can't bounce the fetch onto an internal host —
// a redirect is simply treated as reachable (ok).
async function probeUrl(url, { fetchImpl = fetch, timeoutMs = 6000 } = {}) {
  let u;
  try { u = new URL(url); }
  catch { return { url, ok: false, error: 'blocked (invalid URL)' }; }
  if (u.protocol !== 'http:' && u.protocol !== 'https:') {
    return { url, ok: false, error: `blocked (unsupported scheme ${u.protocol})` };
  }
  if (isBlockedHost(u.hostname)) {
    return { url, ok: false, error: 'blocked (internal/loopback host)' };
  }
  const tryOnce = async (method) => {
    const ctrl = AbortSignal.timeout(timeoutMs);
    const res = await fetchImpl(url, { method, redirect: 'manual', signal: ctrl, headers: { 'User-Agent': 'helm-studio-linkcheck' } });
    return res.status;
  };
  try {
    let status;
    try { status = await tryOnce('HEAD'); }
    catch { status = await tryOnce('GET'); }
    // A 3xx is a redirect we deliberately don't follow (SSRF) — treat as reachable.
    if (status >= 300 && status < 400) return { url, ok: true, status };
    // Some hosts reject HEAD with 4xx/5xx but serve GET fine — retry on GET before flagging.
    if (status >= 400 && status !== 404) { try { status = await tryOnce('GET'); } catch { /* keep HEAD status */ } }
    return { url, ok: status < 400, status };
  } catch (e) {
    return { url, ok: false, error: (e && e.name === 'TimeoutError') ? 'timed out' : (e && e.message) || 'unreachable' };
  }
}

/**
 * Full lint: the synchronous checkDoc PLUS async external-link reachability.
 * Internal /blog/<slug> links are validated against `knownSlugs` (no network).
 * External links are HEAD/GET probed (deduped, capped). Returns the checkDoc result
 * with `polish` augmented by an "External links" group + a recomputed score.
 *   deps: { fetchImpl?, knownSlugs?, cap?, timeoutMs? }
 */
export async function lintDoc({ doc, meta = {}, slug = 'post', knownSlugs = null } = {}, deps = {}) {
  const base = checkDoc({ doc, meta, slug, knownSlugs });
  const cap = deps.cap || 25;
  const urls = (base.externalLinks || []).slice(0, cap);
  let externalResults = [];
  if (urls.length) {
    externalResults = await Promise.all(urls.map((u) => probeUrl(u, { fetchImpl: deps.fetchImpl, timeoutMs: deps.timeoutMs })));
  }
  const broken = externalResults.filter((r) => !r.ok);
  const extGroup = {
    group: 'External links',
    level: broken.length ? 'amber' : 'green',
    items: broken.length
      ? broken.map((r) => `${r.url} — ${r.status ? 'HTTP ' + r.status : (r.error || 'unreachable')}`)
      : [urls.length ? `${urls.length} external link${urls.length === 1 ? '' : 's'} reachable.` : 'No external links to check.'],
  };
  // replace any placeholder external group from checkDoc (there is none) and append
  const polish = [...base.polish, extGroup];
  const amberGroups = polish.filter((p) => p.level === 'amber').length;
  const score = Math.max(0, 100 - amberGroups * 8);
  return { ...base, polish, score, externalResults, externalChecked: urls.length };
}

// Exposed for tests.
export const __probeUrl = probeUrl;
