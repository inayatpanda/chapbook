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
