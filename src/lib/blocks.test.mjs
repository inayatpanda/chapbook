// Video block (Task 13): validator + serialiser for user-R2 video posts.
// The video block is {id, type:'video', url, poster, caption?, alt?} where url/poster
// are the user's own R2 public https URLs. No server transcode — poster is captured
// client-side and uploaded alongside the clip.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { serialiseBlock, validateDoc, renderPreviewHtml, inlineHtmlToMd, stripUnsafeHtml } from './blocks.js';

const VID = 'https://pub-abc123.r2.dev/videos/1a2b-clip.mp4';
const POS = 'https://pub-abc123.r2.dev/videos/1a2b-clip.jpg';
const vblock = (extra = {}) => ({ id: 'v1', type: 'video', url: VID, poster: POS, ...extra });
const doc = (b) => ({ version: 1, blocks: [b] });

// ── serialiser ───────────────────────────────────────────────────────────────

test('video: serialises to the exact post-video figure markup (with caption)', () => {
  const out = serialiseBlock(vblock({ caption: 'A short clip' }));
  assert.equal(
    out,
    `<figure class="post-video"><video controls playsinline preload="metadata" poster="${POS}" src="${VID}"></video><figcaption>A short clip</figcaption></figure>`
  );
});

test('video: caption omitted → no figcaption element', () => {
  const out = serialiseBlock(vblock());
  assert.equal(
    out,
    `<figure class="post-video"><video controls playsinline preload="metadata" poster="${POS}" src="${VID}"></video></figure>`
  );
  assert.ok(!out.includes('<figcaption'));
});

test('video: empty-string caption → no figcaption element', () => {
  const out = serialiseBlock(vblock({ caption: '' }));
  assert.ok(!out.includes('<figcaption'));
});

test('video: caption is HTML-escaped', () => {
  const out = serialiseBlock(vblock({ caption: 'Tom & Jerry <3' }));
  assert.ok(out.includes('<figcaption>Tom &amp; Jerry &lt;3</figcaption>'));
});

test('video: url/poster are attribute-escaped (same as image serialiser)', () => {
  const out = serialiseBlock({ id: 'v1', type: 'video', url: 'https://x/"onmouseover', poster: 'https://y/"p' });
  assert.ok(out.includes('src="https://x/&quot;onmouseover"'));
  assert.ok(out.includes('poster="https://y/&quot;p"'));
});

// ── validator ────────────────────────────────────────────────────────────────

test('video: a valid https url + poster passes validateDoc', () => {
  assert.equal(validateDoc(doc(vblock({ caption: 'hi', alt: 'a clip' }))), true);
});

test('video: missing poster → validateDoc throws', () => {
  assert.throws(() => validateDoc(doc({ id: 'v1', type: 'video', url: VID })), /poster/i);
});

test('video: missing url → validateDoc throws', () => {
  assert.throws(() => validateDoc(doc({ id: 'v1', type: 'video', poster: POS })), /url/i);
});

test('video: non-https url → validateDoc throws', () => {
  assert.throws(() => validateDoc(doc({ id: 'v1', type: 'video', url: 'http://x/clip.mp4', poster: POS })), /url/i);
});

test('video: non-https poster → validateDoc throws', () => {
  assert.throws(() => validateDoc(doc({ id: 'v1', type: 'video', url: VID, poster: 'http://x/clip.jpg' })), /poster/i);
});

test('video: javascript: url → validateDoc throws', () => {
  assert.throws(() => validateDoc(doc({ id: 'v1', type: 'video', url: 'javascript:alert(1)', poster: POS })), /url/i);
});

test('video: a relative /images path is not accepted as a video url (https only)', () => {
  assert.throws(() => validateDoc(doc({ id: 'v1', type: 'video', url: '/images/posts/x/clip.mp4', poster: POS })), /url/i);
});

test('video: a url with a .. traversal segment → validateDoc throws', () => {
  assert.throws(() => validateDoc(doc({ id: 'v1', type: 'video', url: 'https://x/../etc/clip.mp4', poster: POS })), /url/i);
});

// ── live preview ─────────────────────────────────────────────────────────────

test('video: renderPreviewHtml renders the post-video figure (escaped)', () => {
  const html = renderPreviewHtml([vblock({ caption: 'Tom & Jerry' })]);
  assert.ok(html.includes('<figure class="post-video">'));
  assert.ok(html.includes(`src="${VID}"`));
  assert.ok(html.includes(`poster="${POS}"`));
  assert.ok(html.includes('<figcaption>Tom &amp; Jerry</figcaption>'));
});

test('video: renderPreviewHtml skips a video block with no url', () => {
  assert.equal(renderPreviewHtml([{ id: 'v1', type: 'video', poster: POS }]), '');
});

// ── L3: inlineHtmlToMd neutralises script-y anchor hrefs (HTML → markdown) ───────
// A text/quote block's html is converted to markdown by inlineHtmlToMd at publish. A
// `javascript:`/`vbscript:` href must NOT survive into `[text](javascript:…)`, or remark
// renders a live executable <a> on the blog (no downstream sanitiser). The visible text
// is kept; only the dangerous link wrapper is dropped.

test('L3: inlineHtmlToMd drops a javascript: anchor but keeps the visible text', () => {
  const out = inlineHtmlToMd('<a href="javascript:alert(1)">click me</a>');
  assert.doesNotMatch(out, /javascript:/i);
  assert.doesNotMatch(out, /\]\(/);           // no markdown link destination emitted
  assert.equal(out, 'click me');
});

test('L3: inlineHtmlToMd drops a vbscript: anchor (keeps text)', () => {
  const out = inlineHtmlToMd('<a href="vbscript:msgbox(1)">x</a>');
  assert.doesNotMatch(out, /vbscript:/i);
  assert.equal(out, 'x');
});

test('L3: leading whitespace before the scheme does not sneak a javascript: link through', () => {
  const out = inlineHtmlToMd('<a href="  javascript:alert(1)">y</a>');
  assert.doesNotMatch(out, /javascript:/i);
  assert.equal(out, 'y');
});

test('L3: a legitimate https link is still converted to a markdown link', () => {
  const out = inlineHtmlToMd('<a href="https://example.com">home</a>');
  assert.equal(out, '[home](https://example.com)');
});

test('L3: a javascript: href reaching serialiseBlock (text) publishes no live link', () => {
  const md = serialiseBlock({ type: 'text', html: 'see <a href="javascript:steal()">this</a> now' });
  assert.doesNotMatch(md, /javascript:/i);
  assert.match(md, /see this now/);
});

// ── B5: the composer edit-load sink (index.html edText/edQuote) routes untrusted block.html
// through window.__studioSanitise, which IS this stripUnsafeHtml (=== sanitiseHtml). These
// assert the barrier neutralises the well-formed payloads AND preserves prose formatting.
// The attribute-boundary bypass `<img/src=x/onerror=…>` and `<svg/onload=…>` are neutralised
// by DOMPurify in the browser — proven at the policy level in sanitise.test.mjs (PURIFY_CONFIG),
// since under `node --test` there is no window and this degrades to the regex fallback.

test('B5: stripUnsafeHtml (composer sink barrier) removes <script> and keeps prose', () => {
  const out = stripUnsafeHtml('<p>Hi <strong>there</strong></p><script>steal(localStorage)</script>');
  assert.doesNotMatch(out, /<script/i);
  assert.match(out, /<strong>there<\/strong>/);
});

test('B5: stripUnsafeHtml strips an on* handler off a well-formed <img> (fallback path)', () => {
  const out = stripUnsafeHtml('<img src="x" onerror="steal(localStorage)">');
  assert.doesNotMatch(out, /onerror/i);
});

test('B5: stripUnsafeHtml preserves links + lists (prose formatting survives)', () => {
  const out = stripUnsafeHtml('<a href="https://example.com">x</a><ul><li>one</li></ul>');
  assert.match(out, /href="https:\/\/example\.com"/);
  assert.match(out, /<li>one<\/li>/);
});

// ── M3: an embed block's self-hosted <video src> must be https (or a same-site path) so the
// published https blog never renders a BLOCKED mixed-content player. http:// is upgraded;
// an uncoercible scheme drops the whole block.
test('M3: embed http:// src is upgraded to https:// in the serialised video', () => {
  const out = serialiseBlock({ id: 'e1', type: 'embed', provider: 'video', src: 'http://cdn.example.com/clip.mp4' });
  assert.match(out, /<video src="https:\/\/cdn\.example\.com\/clip\.mp4"/);
  assert.doesNotMatch(out, /http:\/\//);
});

test('M3: embed https:// src passes through unchanged (byte-identical for old posts)', () => {
  const out = serialiseBlock({ id: 'e1', type: 'embed', provider: 'video', src: 'https://cdn.example.com/clip.mp4' });
  assert.equal(out, '<video src="https://cdn.example.com/clip.mp4" controls preload="metadata" playsinline></video>');
});

test('M3: embed root-relative same-site src is kept as-is (never mixed content)', () => {
  const out = serialiseBlock({ id: 'e1', type: 'embed', provider: 'video', src: '/videos/clip.mp4' });
  assert.match(out, /<video src="\/videos\/clip\.mp4"/);
});

test('M3: embed with a javascript: src is dropped entirely', () => {
  assert.equal(serialiseBlock({ id: 'e1', type: 'embed', provider: 'video', src: 'javascript:alert(1)' }), '');
});

test('M3: embed http:// poster is upgraded alongside the src', () => {
  const out = serialiseBlock({ id: 'e1', type: 'embed', provider: 'video', src: 'https://cdn.example.com/c.mp4', poster: 'http://cdn.example.com/p.jpg' });
  assert.match(out, /poster="https:\/\/cdn\.example\.com\/p\.jpg"/);
});

// ── bug-sweep remediation: publish-side XSS (table/heading/embed) + validateDoc guards ──
test('serialise heading escapes HTML (no stored XSS in the published .md)', () => {
  const out = serialiseBlock({ id: 'h', type: 'heading', level: 2, text: '<img src=x onerror=alert(1)>' });
  assert.ok(!/<img/.test(out), 'raw <img> must not survive into the heading');
  assert.match(out, /## &lt;img src=x onerror=alert\(1\)&gt;/);
});

test('serialise table cells escape HTML (no stored XSS)', () => {
  const out = serialiseBlock({ id: 't', type: 'table', header: ['A', 'B'], rows: [['<script>alert(1)</script>', 'ok']] });
  assert.ok(!/<script>/.test(out), 'raw <script> must not survive into a table cell');
  assert.match(out, /&lt;script&gt;/);
});

test('serialise embed videoId is attribute-escaped (no breakout)', () => {
  const out = serialiseBlock({ id: 'e', type: 'embed', provider: 'youtube', videoId: 'x" onload="alert(1)' });
  assert.ok(!/videoId|onload="alert/.test(out.replace(/&quot;/g, '')) || /&quot;/.test(out), 'the double-quote must be escaped');
  assert.match(out, /embed\/x&quot; onload=&quot;alert\(1\)/);
});

test('validateDoc rejects a figure whose base.file traverses', () => {
  assert.throws(() => validateDoc({ blocks: [{ id: 'f', type: 'figure', svg: '<svg></svg>', base: { file: '../../secret' } }] }), /figure image filename/i);
});

test('validateDoc rejects an image that has base64 but no filename', () => {
  assert.throws(() => validateDoc({ blocks: [{ id: 'i', type: 'image', base64: 'AAAA', alt: 'x' }] }), /filename/i);
});
