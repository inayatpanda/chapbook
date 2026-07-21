// Publish-path HTML sanitiser — parser-based (DOMPurify), replacing the bypassable
// regex strip. The old regex let `<img/src=x/onerror=alert(1)>` and `<svg/onload=…>`
// through (the `on*` strip required a whitespace boundary that `/onerror` sidesteps,
// and `<svg>` was never in the removed-element set), so both reached the user's public
// GitHub Pages blog verbatim → stored XSS against blog visitors. A real HTML parser
// normalises `<img/src=x/onerror=…>` to `<img src="x" onerror="…">` and then applies an
// allow-list, so the attribute-boundary bypass no longer exists.
//
// ── DUAL CONTEXT ────────────────────────────────────────────────────────────────
// blocks.js (which calls sanitiseHtml) is bundled into the browser Studio AND imported
// directly under `node --test`. DOMPurify needs a DOM `window`:
//   • Browser (the REAL publish path): DOMPurify.sanitize runs for real and is
//     authoritative — every commit to the blog goes through it.
//   • Node / tests (no window): DOMPurify's default export is a lazy factory whose
//     `.sanitize` is undefined until it is bound to a window, so calling it throws.
//     We detect that and fall back to `regexStripFallback` (the original regex strip)
//     so server/test contexts DEGRADE SAFELY instead of crashing. This fallback is a
//     defence-in-depth backstop, not the primary barrier — the primary barrier is
//     DOMPurify in the browser. The fallback has since been hardened to mirror the
//     policy where regex can (delimiter-class on*= handlers, svg/math wholesale,
//     javascript:/markup-capable data: URLs), but the unit tests still assert the
//     POLICY (PURIFY_CONFIG) and a live-browser runtime assertion is deferred to the
//     release gate (Task 14).
//
// Importing this module is safe under node: `import DOMPurify from 'dompurify'` yields
// the factory function without throwing; only calling `.sanitize` without a window fails.
import DOMPurify from 'dompurify';
import { SAFE_IMAGE_DATA_URL } from './figures/svg.js';

// DOMPurify policy (the authoritative allow-list the browser enforces at publish time).
//   • USE_PROFILES.html — keeps legitimate formatting (p, a[href], strong/em, ul/ol/li,
//     h1-h6, img[src], figure/figcaption, blockquote, code/pre, table…) and, crucially,
//     STRIPS every `on*` event-handler attribute (they are not in the html allow-list).
//   • FORBID_TAGS — removes the dangerous element classes on top of the profile:
//     script/iframe/object/embed drop executable/embedding vectors; svg/math close the
//     foreign-content parsing hole (`<svg/onload=…>`, `<math>` mutation-XSS); style/form
//     drop CSS-exfil and formaction abuse.
//   • FORBID_ATTR: formaction — belt-and-braces against `<button formaction="javascript:…">`.
//   • ALLOW_UNKNOWN_PROTOCOLS:false — keeps DOMPurify's default IS_ALLOWED_URI regexp,
//     which rejects `javascript:` / `vbscript:` (and other script-y schemes) in href/src.
export const PURIFY_CONFIG = {
  USE_PROFILES: { html: true },
  FORBID_TAGS: ['script', 'iframe', 'object', 'embed', 'svg', 'math', 'style', 'form'],
  FORBID_ATTR: ['formaction'],           // on* handlers are stripped by the default profile
  ALLOW_UNKNOWN_PROTOCOLS: false,
};

// The node/test fallback when DOMPurify has no window (see DUAL CONTEXT above). It removes
// <script>/<iframe>/<object>/<embed> AND <svg>/<math> wholesale, whitespace-delimited on*=
// handlers, javascript: URLs in href/xlink:href/src, and markup-capable data: URLs.
// It is intentionally NOT the primary barrier.
export function regexStripFallback(html) {
  let s = String(html || '');
  // whole elements (with or without a close tag) for the dangerous trio + script.
  // svg/math too: DOMPurify FORBID_TAGS drops them wholesale in the browser, and a
  // regex cannot safely police the foreign-content parse context (e.g. a <use> whose
  // href pulls in a scripted data:image/svg+xml document), so the fallback mirrors
  // the wholesale removal.
  s = s.replace(/<(script|iframe|object|embed|svg|math)\b[\s\S]*?<\/\1\s*>/gi, '');
  // stray / self-closing / unclosed openers of the same tags (+ <use>, the SVG
  // reference element, which has no business surviving outside an <svg>)
  s = s.replace(/<\/?(?:script|iframe|object|embed|svg|math|use)\b[^>]*>/gi, '');
  // inline event-handler attributes:  onerror="…"  onclick='…'  onload=foo
  // Browsers accept ANY attribute delimiter before the name — whitespace, '/',
  // either quote, or a backtick — so <img/src=x/onerror=…> is live. Match the
  // full delimiter class; drop a whitespace delimiter with the attribute, keep a
  // structural one ('/', quotes, backtick) so surrounding syntax stays intact.
  const keepDelim = (m, d) => (/\s/.test(d) ? '' : d);
  s = s.replace(/([\s/"'`])on\w+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, keepDelim);
  // href / xlink:href / src — one unified pass. Browsers strip ASCII whitespace and
  // control chars from WITHIN a URL during parsing, so `da\nta:` and `java\tscript:`
  // resolve to data:/javascript:. Normalise the value the same way BEFORE deciding, or
  // an embedded newline/tab smuggles a scripted scheme past a literal match. Drop the
  // attribute for javascript:/vbscript:, and for markup-capable data: URLs keep ONLY the
  // safe raster shapes (SAFE_IMAGE_DATA_URL: png/jpeg/gif/webp/avif); keep everything else.
  s = s.replace(/([\s/"'`])(?:xlink:)?(?:href|src)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/gi,
    (m, d, dq, sq, uq) => {
      const raw = (dq !== undefined ? dq : sq !== undefined ? sq : uq) || '';
      const norm = normaliseUrl(raw);
      if (/^(?:javascript|vbscript):/.test(norm)) return keepDelim(m, d);
      if (/^data:/.test(norm)) return SAFE_IMAGE_DATA_URL.test(raw.trim()) ? m : keepDelim(m, d);
      return m;
    });
  return s;
}

// Reproduce the two normalisations a browser applies to an attribute-VALUE URL before it
// resolves the scheme: (1) decode HTML character references (numeric &#NN; / &#xNN; and the
// scheme-relevant named refs), (2) strip ASCII whitespace + control chars. Lower-cased so the
// scheme test is case-insensitive. Used only by the regex fallback above.
export function normaliseUrl(raw) {
  return String(raw || '')
    .replace(/&#x([0-9a-f]+);?/gi, (_m, h) => { try { return String.fromCodePoint(parseInt(h, 16)); } catch { return ''; } })
    .replace(/&#(\d+);?/g, (_m, n) => { try { return String.fromCodePoint(parseInt(n, 10)); } catch { return ''; } })
    .replace(/&colon;/gi, ':').replace(/&(?:tab|newline|nbsp);/gi, ' ')
    .replace(/[\u0000-\u0020]+/g, '')
    .toLowerCase();
}

// True only when DOMPurify is bound to a live DOM (browser / jsdom-backed context).
function purifyIsLive() {
  return typeof window !== 'undefined' && DOMPurify && typeof DOMPurify.sanitize === 'function';
}

// Sanitise arbitrary HTML for the publish pipeline. In the browser this is DOMPurify
// (authoritative). Under node/tests (no window) it degrades to the regex fallback so the
// module never crashes a server/test context. Always returns a string.
export function sanitiseHtml(html) {
  const input = String(html ?? '');
  if (!purifyIsLive()) return regexStripFallback(input);
  try {
    return String(DOMPurify.sanitize(input, PURIFY_CONFIG));
  } catch {
    // Defensive: any unexpected DOMPurify failure must not surface unsanitised HTML.
    return regexStripFallback(input);
  }
}
