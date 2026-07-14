// Video block (Task 13): validator + serialiser for user-R2 video posts.
// The video block is {id, type:'video', url, poster, caption?, alt?} where url/poster
// are the user's own R2 public https URLs. No server transcode — poster is captured
// client-side and uploaded alongside the clip.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { serialiseBlock, validateDoc, renderPreviewHtml } from './blocks.js';

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
