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

// Regression — playground js/css must not break out of its <script>/<style> element on
// publish (the published .md is rendered with rehype-raw and NO sanitiser).
test('playground: js "</script>" is neutralised so it cannot break out of the <script> element', () => {
  const out = serialiseBlock({ id: 'p1', type: 'playground', html: '<div class="x"></div>', js: 'const s = "</script><img src=x onerror=alert(1)>";' });
  assert.ok(out.includes('<\\/script>'), 'the injected close-tag must be neutralised to <\\/script>');
  assert.equal(out.split('</script>').length - 1, 1, 'only the wrapper </script> may remain — no breakout');
});

test('playground: css "</style>" is neutralised so it cannot break out of the <style> element', () => {
  const out = serialiseBlock({ id: 'p2', type: 'playground', html: '<div></div>', css: '.x::after{content:"</style><script>alert(1)</script>"}' });
  assert.ok(out.includes('<\\/style>'), 'the injected close-tag must be neutralised to <\\/style>');
  assert.equal(out.split('</style>').length - 1, 1, 'only the wrapper </style> may remain — no breakout');
});

test('playground: renderPreviewHtml applies the same </script> breakout guard', () => {
  const html = renderPreviewHtml([{ id: 'p3', type: 'playground', html: '<div></div>', js: 'x = "</script><b>hi</b>";' }]);
  assert.ok(html.includes('<\\/script>'));
  assert.equal(html.split('</script>').length - 1, 1);
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

test('serialise embed title attribute escapes & < > (not just ")', () => {
  const out = serialiseBlock({ id: 'e', type: 'embed', provider: 'youtube', videoId: 'abc123', title: 'A & B <tag> "q"' });
  // & must become &amp; (found live: escAttr only escaped "), and </> too.
  assert.match(out, /title="A &amp; B &lt;tag&gt; &quot;q&quot;"/);
  assert.ok(!/title="[^"]*<tag>/.test(out), 'raw <tag> must not survive in the title attribute');
});

test('serialise gallery alt is NOT html-escaped (markdown context, no double-encode)', () => {
  const out = serialiseBlock({ id: 'g', type: 'gallery', images: [{ file: 'p.jpg', alt: 'Tom & Jerry "3"' }] }, { slug: 's' });
  // markdown ![alt](path): the & and quotes stay literal (Astro escapes on render);
  // escaping here would double-encode to &amp;amp;.
  assert.match(out, /!\[Tom & Jerry "3"\]\(\.\/_images\/s\/p\.jpg\)/);
  assert.ok(!/&amp;/.test(out), 'gallery alt must not be pre-escaped');
});

// ── quote cite: markdown-TEXT escaped at serialise (stored-XSS fix, round 2) ──
// The cite is plain text emitted into a MARKDOWN line; the published .md renders with
// rehype-raw (no sanitiser). Round 1 HTML-escaped it — wrong context: a cite of
// "[x](javascript:…)" survived the HTML-escape as a live executable markdown link, and
// legit text ("AT&T") double-encoded. Now every markdown-active character is
// backslash-escaped (escMdText) so the cite always renders as literal text.

test('serialise quote cite neutralises a javascript: markdown link (literal text, no link)', () => {
  const out = serialiseBlock({ id: 'q', type: 'quote', html: 'Wise words', cite: '[x](javascript:alert(1))' });
  assert.equal(out, '> Wise words\n> — \\[x\\]\\(javascript:alert\\(1\\)\\)');
  assert.ok(!out.includes(']('), 'no active ]( link syntax survives');
  assert.ok(/\\\[/.test(out), 'the [ is backslash-escaped');
});

test('serialise quote cite neutralises inline HTML (inert, and NOT entity-encoded)', () => {
  const out = serialiseBlock({ id: 'q', type: 'quote', html: 'Wise words', cite: '<img/src=x/onerror=alert(1)>' });
  assert.equal(out, '> Wise words\n> — \\<img/src=x/onerror=alert\\(1\\)\\>');
  assert.ok(!/(^|[^\\])<img/.test(out), 'no unescaped <img — no tag can form');
  assert.ok(!/&lt;|&gt;/.test(out), 'markdown context: no HTML entities');
});

test('serialise quote cite neutralises autolinks and emphasis', () => {
  const out = serialiseBlock({ id: 'q', type: 'quote', html: 'W', cite: '*wow* <javascript:alert(1)>' });
  assert.equal(out, '> W\n> — \\*wow\\* \\<javascript:alert\\(1\\)\\>');
});

test('serialise quote cite keeps AT&T literal (no HTML double-encode)', () => {
  const out = serialiseBlock({ id: 'q', type: 'quote', html: 'Wise words', cite: 'AT&T' });
  assert.equal(out, '> Wise words\n> — AT&T');
  assert.ok(!/&amp;/.test(out), '& must stay literal in markdown text');
});

test('serialise quote cite escapes parentheses — "Smith (2020)" reads the same, no accidental link', () => {
  const out = serialiseBlock({ id: 'q', type: 'quote', html: 'Wise words', cite: 'Smith (2020)' });
  // \( \) render as literal ( ) in CommonMark, so the reader still sees "Smith (2020)".
  assert.equal(out, '> Wise words\n> — Smith \\(2020\\)');
});

test('serialise quote with a normal cite is byte-identical to before the escape fix', () => {
  const out = serialiseBlock({ id: 'q', type: 'quote', html: 'Look it up', cite: 'Smith 2020' });
  assert.equal(out, '> Look it up\n> — Smith 2020');
});

test('validateDoc rejects a figure whose base.file traverses', () => {
  assert.throws(() => validateDoc({ blocks: [{ id: 'f', type: 'figure', svg: '<svg></svg>', base: { file: '../../secret' } }] }), /figure image filename/i);
});

test('validateDoc rejects an image that has base64 but no filename', () => {
  assert.throws(() => validateDoc({ blocks: [{ id: 'i', type: 'image', base64: 'AAAA', alt: 'x' }] }), /filename/i);
});

// ── placement flows through gallery + embed serialisation (adversarial-review fix) ──
// The studio's placement grid writes block.placement ('standard'|'wide'|'left'|'right')
// on gallery and embed blocks; the serialiser must carry it to the published output the
// same way image blocks do (breakout / img-left / img-right), while a block without a
// placement — or with the editor-stamped default 'standard' — keeps today's exact bytes.

const gblock = (extra = {}) => ({ id: 'g', type: 'gallery', images: [{ file: 'a.jpg', alt: 'one' }, { file: 'b.jpg', alt: 'two' }], ...extra });
const GAL_MD = '![one](./_images/s/a.jpg)\n![two](./_images/s/b.jpg)';

test('placement: gallery with placement=wide emits the p= sentinel for rehype-gallery', () => {
  const out = serialiseBlock(gblock({ placement: 'wide' }), { slug: 's' });
  assert.equal(out, `[[blk-gallery:p=wide]]\n\n${GAL_MD}`);
});

test('placement: gallery with width AND placement emits w,a,p in one sentinel', () => {
  const out = serialiseBlock(gblock({ width: 55, placement: 'right' }), { slug: 's' });
  assert.equal(out, `[[blk-gallery:w=55,a=center,p=right]]\n\n${GAL_MD}`);
});

test('placement regression pin: gallery without placement serialises exactly as before', () => {
  assert.equal(serialiseBlock(gblock(), { slug: 's' }), GAL_MD);
});

test('placement regression pin: editor-stamped placement=standard changes nothing (gallery)', () => {
  assert.equal(serialiseBlock(gblock({ placement: 'standard' }), { slug: 's' }), GAL_MD);
});

test('placement regression pin: width-only gallery keeps the exact legacy w,a sentinel', () => {
  const out = serialiseBlock(gblock({ width: 55 }), { slug: 's' });
  assert.equal(out, `[[blk-gallery:w=55,a=center]]\n\n${GAL_MD}`);
});

const yt = (extra = {}) => ({ id: 'e', type: 'embed', provider: 'youtube', videoId: 'abc123', title: 'T', ...extra });
const YT_MD = '<div class="embed-16x9">\n  <iframe src="https://www.youtube-nocookie.com/embed/abc123" title="T" loading="lazy" allowfullscreen></iframe>\n</div>';

test('placement: embed (youtube) with placement=wide emits breakout on the 16x9 wrapper', () => {
  const out = serialiseBlock(yt({ placement: 'wide' }));
  assert.equal(out, YT_MD.replace('class="embed-16x9"', 'class="embed-16x9 breakout"'));
});

test('placement: embed (vimeo) with placement=left emits img-left on the 16x9 wrapper', () => {
  const out = serialiseBlock({ id: 'e', type: 'embed', provider: 'vimeo', videoId: '123456', title: 'V', placement: 'left' });
  assert.match(out, /^<div class="embed-16x9 img-left">/);
});

test('placement regression pin: embed without placement serialises exactly as before', () => {
  assert.equal(serialiseBlock(yt()), YT_MD);
});

test('placement regression pin: editor-stamped placement=standard changes nothing (embed)', () => {
  assert.equal(serialiseBlock(yt({ placement: 'standard' })), YT_MD);
});

test('placement: self-hosted embed video with placement=right gains the placed figure wrapper', () => {
  const out = serialiseBlock({ id: 'e', type: 'embed', provider: 'video', src: 'https://cdn.example.com/clip.mp4', placement: 'right' });
  assert.match(out, /^<figure class="blk-video img-right"><video src="https:\/\/cdn\.example\.com\/clip\.mp4"/);
  assert.match(out, /<\/figure>$/);
});

test('placement regression pin: self-hosted embed with placement=standard stays a bare <video>', () => {
  const out = serialiseBlock({ id: 'e', type: 'embed', provider: 'video', src: 'https://cdn.example.com/clip.mp4', placement: 'standard' });
  assert.equal(out, '<video src="https://cdn.example.com/clip.mp4" controls preload="metadata" playsinline></video>');
});

test('placement: preview gallery wrapper carries the placement class', () => {
  const html = renderPreviewHtml([gblock({ placement: 'wide' })], { slug: 's' });
  assert.match(html, /<div class="gallery breakout">/);
});

test('placement: preview embed wrapper carries the placement class', () => {
  const html = renderPreviewHtml([yt({ placement: 'right' })]);
  assert.match(html, /<div class="embed-16x9 img-right">/);
});

test('placement regression pin: preview gallery/embed without placement keep their plain classes', () => {
  const html = renderPreviewHtml([gblock(), yt()], { slug: 's' });
  assert.match(html, /<div class="gallery">/);
  assert.match(html, /<div class="embed-16x9">/);
});
