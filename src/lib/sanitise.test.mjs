import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PURIFY_CONFIG, sanitiseHtml, regexStripFallback } from './sanitise.js';

// ── Why these tests assert the POLICY, not a live sanitize() ─────────────────────
// DOMPurify needs a DOM `window`. Under `node --test` there is no window, so
// DOMPurify.sanitize would throw; sanitiseHtml therefore degrades to the regex
// fallback here. The AUTHORITATIVE barrier is DOMPurify in the browser, enforcing
// PURIFY_CONFIG. So the unit suite proves the config forbids the attack classes and
// that the module degrades safely; a live-browser assertion that the two audit
// vectors are neutralised at runtime belongs in the release gate (Task 14).

// ── PURIFY_CONFIG policy shape ───────────────────────────────────────────────────

test('PURIFY_CONFIG.FORBID_TAGS includes svg and every dangerous element class', () => {
  for (const tag of ['script', 'iframe', 'object', 'embed', 'svg', 'math', 'style', 'form']) {
    assert.ok(PURIFY_CONFIG.FORBID_TAGS.includes(tag), `FORBID_TAGS must include <${tag}>`);
  }
});

test('PURIFY_CONFIG uses the html profile (which strips on* event handlers)', () => {
  // The default html profile does NOT allow on* attributes, so `onerror`/`onload`/etc.
  // are stripped. This is the mechanism that kills the `<img/src=x/onerror=…>` bypass
  // once the parser has normalised the malformed tag into a real <img> element.
  assert.equal(PURIFY_CONFIG.USE_PROFILES.html, true);
});

test('PURIFY_CONFIG rejects javascript: URIs (ALLOW_UNKNOWN_PROTOCOLS false)', () => {
  // ALLOW_UNKNOWN_PROTOCOLS:false keeps DOMPurify's default IS_ALLOWED_URI regexp,
  // which rejects javascript:/vbscript: (and other script-y schemes) in href/src.
  assert.equal(PURIFY_CONFIG.ALLOW_UNKNOWN_PROTOCOLS, false);
});

test('PURIFY_CONFIG.FORBID_ATTR blocks formaction', () => {
  assert.ok(PURIFY_CONFIG.FORBID_ATTR.includes('formaction'));
});

// ── The audit vectors are forbidden BY POLICY ────────────────────────────────────
// (Live neutralisation runs in the browser; here we prove the policy covers them.)

test('audit vector <svg/onload=…> is covered: svg is a forbidden tag', () => {
  assert.ok(PURIFY_CONFIG.FORBID_TAGS.includes('svg'),
    'the <svg/onload=…> element is dropped entirely by DOMPurify because svg is forbidden');
});

test('audit vector <img/src=x/onerror=…> is covered: html profile strips on* + no unknown protocols', () => {
  // DOMPurify parses `<img/src=x/onerror=alert(1)>` into `<img src="x" onerror="alert(1)">`,
  // then the html profile strips the onerror handler. javascript: srcs are rejected too.
  assert.equal(PURIFY_CONFIG.USE_PROFILES.html, true);
  assert.equal(PURIFY_CONFIG.ALLOW_UNKNOWN_PROTOCOLS, false);
});

// ── sanitiseHtml behaviour + dual-context degradation ────────────────────────────

test('sanitiseHtml always returns a string and never throws under node (no window)', () => {
  // No window in `node --test` → the DOMPurify path is skipped and the regex fallback runs.
  assert.equal(typeof window, 'undefined');
  assert.equal(typeof sanitiseHtml('<p>hi</p>'), 'string');
  assert.equal(sanitiseHtml(null), '');
  assert.equal(sanitiseHtml(undefined), '');
});

test('sanitiseHtml preserves benign formatting (fallback keeps structural markup)', () => {
  const benign = '<p>Hello <strong>world</strong> <a href="https://example.com">link</a></p>'
    + '<img src="https://example.com/a.png" alt="a"><ul><li>one</li></ul>';
  const out = sanitiseHtml(benign);
  assert.match(out, /<strong>world<\/strong>/);
  assert.match(out, /href="https:\/\/example\.com"/);
  assert.match(out, /<img src="https:\/\/example\.com\/a\.png"/);
  assert.match(out, /<li>one<\/li>/);
});

// ── regexStripFallback preserves the original (node/test) behaviour ──────────────

test('regexStripFallback removes <script> and whitespace-delimited on* handlers', () => {
  assert.equal(regexStripFallback('<script>alert(1)</script>ok'), 'ok');
  assert.equal(regexStripFallback('<div onclick="x()">hi</div>'), '<div>hi</div>');
});

test('regexStripFallback neutralises javascript: in href/src', () => {
  assert.doesNotMatch(regexStripFallback('<a href="javascript:alert(1)">x</a>'), /javascript:/i);
});

test('regexStripFallback keeps legitimate list/code markup', () => {
  const html = '<ul><li>one</li><li>two</li></ul>';
  assert.equal(regexStripFallback(html), html);
});

// Browsers accept ANY attribute delimiter — whitespace, '/', quotes, backtick —
// so `<img/src=x/onerror=…>` is a live handler. The fallback must match the full
// delimiter class (the same fix as prepublish.js / figures/svg.js).
test('regexStripFallback strips slash/quote-delimited on* handlers (delimiter bypass)', () => {
  assert.doesNotMatch(regexStripFallback('<img/src=x/onerror=alert(1)>'), /onerror/i);
  assert.doesNotMatch(regexStripFallback('<div title="a"onclick="x()">hi</div>'), /onclick/i);
  assert.doesNotMatch(regexStripFallback('<img src=x`onload=y()>'), /onload/i);
});

test('regexStripFallback neutralises slash-delimited javascript: href/src too', () => {
  assert.doesNotMatch(regexStripFallback('<a/href="javascript:alert(1)">x</a>'), /javascript:/i);
  assert.doesNotMatch(regexStripFallback('<img/src=javascript:alert(1)>'), /javascript:/i);
});

// ── fallback: SVG data-URL execution surface (independent adversarial finding) ──
// DOMPurify FORBID_TAGS removes <svg>/<math> wholesale in the browser, but the node
// fallback used to leave `<svg><use href="data:image/svg+xml;base64,…<script>…">`
// untouched — a scripted SVG document smuggled in through a reference. The fallback
// now mirrors the DOMPurify policy: svg/math removed wholesale (regex cannot safely
// police the foreign-content parse context), stray svg/math/use tags dropped, and
// markup-capable data: URLs stripped from href/xlink:href/src (safe rasters kept).

// base64 of '<svg><script>alert(1)</script></svg>' — the exact independent payload.
const SVG_SCRIPT_B64 = 'PHN2Zz48c2NyaXB0PmFsZXJ0KDEpPC9zY3JpcHQ+PC9zdmc+';

test('fallback removes the <use href="data:image/svg+xml;base64,…"> execution surface', () => {
  const payload = `<svg><use href="data:image/svg+xml;base64,${SVG_SCRIPT_B64}"></use></svg>`;
  for (const out of [regexStripFallback(payload), sanitiseHtml(payload)]) {
    assert.doesNotMatch(out, /<\s*(?:svg|use)\b/i, out);
    assert.doesNotMatch(out, /data:image\/svg\+xml/i, out);
  }
});

test('fallback strips markup-capable data: URLs from href/xlink:href/src, keeps safe rasters', () => {
  const out = regexStripFallback(
    '<a href="data:text/html,<script>alert(1)</script>">x</a>'
    + '<img src="data:image/png;base64,AAAA" alt="ok">'
    + '<img/src=data:image/svg+xml;base64,AAAA>'
    + '<thing xlink:href="data:image/svg+xml,<svg onload=x>">y</thing>');
  assert.doesNotMatch(out, /data:text\/html/i, out);
  assert.doesNotMatch(out, /data:image\/svg\+xml/i, out);
  assert.match(out, /<img src="data:image\/png;base64,AAAA" alt="ok">/, 'safe raster data URL must survive');
});

test('fallback removes whole <svg>/<math> elements and stray foreign-content tags', () => {
  const out = regexStripFallback('before<svg viewBox="0 0 1 1"><rect/onclick=x /></svg>mid<math><mi>a</mi></math>after</svg>');
  assert.doesNotMatch(out, /<\s*(?:svg|math|use)\b/i, out);
  assert.doesNotMatch(out, /onclick/i, out);
  assert.match(out, /before/); assert.match(out, /mid/); assert.match(out, /after/);
});

test('fallback neutralises xlink:href javascript: URLs (parity with href/src)', () => {
  assert.doesNotMatch(regexStripFallback('<thing xlink:href="javascript:alert(1)">x</thing>'), /javascript:/i);
});


// Regression: an attacker can embed ASCII whitespace/control chars inside a URL scheme
// so browsers strip them during parsing; the fallback must normalise the same way before
// matching. (Independent adversarial test, 2026-07-21.)
test('regexStripFallback: whitespace/control chars inside a scheme cannot smuggle data:/javascript:', () => {
  const NL = String.fromCharCode(10), TAB = String.fromCharCode(9), CR = String.fromCharCode(13);
  const strip = (s) => s.replace(/[\u0000-\u0020]/g, '');
  assert.ok(!/data:image\/svg/i.test(strip(regexStripFallback(`<a href="da${NL}ta:image/svg+xml;base64,PHN2Zz4=">x</a>`))));
  assert.ok(!/javascript:/i.test(strip(regexStripFallback(`<a href="java${TAB}script:alert(1)">x</a>`))));
  assert.ok(!/vbscript:/i.test(strip(regexStripFallback(`<img src="vb${CR}script:x">`))));
  assert.match(regexStripFallback('<img src="data:image/png;base64,iVBORw0KGgo=">'), /data:image\/png/);
  assert.match(regexStripFallback('<a href="https://example.com/x">x</a>'), /https:\/\/example\.com/);
});
