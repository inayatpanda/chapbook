import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  normaliseOrigin, postLiveUrl, absoluteImageUrl, postImageUrls,
  buildIntent, shareIntents, shareSheetText, PLATFORM_CAP, SHARE_PLATFORMS,
  displayShareUrl, shareableUrl,
} from './shareIntents.js';

/* ── share-link display: strip the scheme for display, re-add it for sharing ── */
test('displayShareUrl: strips http(s):// for a cleaner display value', () => {
  assert.equal(displayShareUrl('https://example.com/blog/x/'), 'example.com/blog/x/');
  assert.equal(displayShareUrl('http://example.com'), 'example.com');
  assert.equal(displayShareUrl('  https://example.com/p  '), 'example.com/p'); // trims first
  assert.equal(displayShareUrl(''), '');
  assert.equal(displayShareUrl(null), '');
  assert.equal(displayShareUrl('example.com/already'), 'example.com/already'); // no scheme → unchanged
});

test('shareableUrl: re-adds https:// when the displayed value lacks a scheme', () => {
  assert.equal(shareableUrl('example.com/blog/x/'), 'https://example.com/blog/x/');
  assert.equal(shareableUrl('example.com'), 'https://example.com');
  assert.equal(shareableUrl('https://example.com/p'), 'https://example.com/p'); // already has one → kept
  assert.equal(shareableUrl('http://example.com'), 'http://example.com');       // http preserved
  assert.equal(shareableUrl('mailto:a@b.com'), 'mailto:a@b.com');               // non-http scheme kept
  assert.equal(shareableUrl(''), '');
});

test('share-link round-trips: display(strip) → shareable(re-add) is lossless for https', () => {
  for (const u of ['https://example.com/blog/the-knee/', 'https://example.com', 'https://a.b/c?d=e']) {
    assert.equal(shareableUrl(displayShareUrl(u)), u, 'round-trip preserves the original https URL');
  }
  // The posted link ALWAYS carries a scheme even when the field shows none.
  assert.ok(/^https:\/\//.test(shareableUrl('example.com/blog/x/')));
  // And buildIntent gets a real, schemed link from the re-added value.
  const intent = buildIntent('x', { lines: 'hi', url: shareableUrl(displayShareUrl('https://example.com/p')) });
  assert.ok(intent.href.includes(encodeURIComponent('https://example.com/p')));
});

/* ── normaliseOrigin ──────────────────────────────────────────────────────── */
test('normaliseOrigin: keeps a project-site path, drops query/hash/trailing slash, empty on junk', () => {
  assert.equal(normaliseOrigin('https://example.com/'), 'https://example.com');
  assert.equal(normaliseOrigin('  https://example.com  '), 'https://example.com');
  assert.equal(normaliseOrigin('example.com'), 'https://example.com');     // adds scheme
  assert.equal(normaliseOrigin('https://owner.github.io/my-blog/'), 'https://owner.github.io/my-blog');
  assert.equal(normaliseOrigin('owner.github.io/my-blog/?preview=1#top'), 'https://owner.github.io/my-blog');
  assert.equal(normaliseOrigin(''), '');                                   // empty → '' (sharing disabled)
  assert.equal(normaliseOrigin(null), '');
  assert.equal(normaliseOrigin('::::'), '');                               // unparseable → ''
  assert.equal(normaliseOrigin('mailto:hello@example.com'), '');           // non-http scheme → ''
});

/* ── postLiveUrl ──────────────────────────────────────────────────────────── */
test('postLiveUrl: <origin>/blog/<slug>/ — the real blog path', () => {
  assert.equal(postLiveUrl('my-post', 'https://example.com'), 'https://example.com/blog/my-post/');
  assert.equal(
    postLiveUrl('my-post', 'https://owner.github.io/my-blog/'),
    'https://owner.github.io/my-blog/blog/my-post/',
  );
  assert.equal(postLiveUrl('my-post'), null);                              // no configured origin → null
  assert.equal(postLiveUrl('/my-post/', 'https://example.com'), 'https://example.com/blog/my-post/'); // strips slashes
  assert.equal(postLiveUrl('', 'https://example.com'), '');                 // no slug → empty
});

/* ── absoluteImageUrl ─────────────────────────────────────────────────────── */
test('absoluteImageUrl: passes data/http through, absolutises root-relative', () => {
  assert.equal(absoluteImageUrl('data:image/jpeg;base64,AAA'), 'data:image/jpeg;base64,AAA');
  assert.equal(absoluteImageUrl('https://cdn.test/x.jpg'), 'https://cdn.test/x.jpg');
  assert.equal(absoluteImageUrl('/images/posts/p/a.jpg', 'https://example.com'), 'https://example.com/images/posts/p/a.jpg');
  assert.equal(
    absoluteImageUrl('/images/posts/p/a.jpg', 'https://owner.github.io/my-blog/'),
    'https://owner.github.io/my-blog/images/posts/p/a.jpg',
  );
  assert.equal(absoluteImageUrl('/images/posts/p/a.jpg'), null); // root-relative, no origin → null (can't absolutise)
  assert.equal(absoluteImageUrl('relative/x.jpg', 'https://example.com'), ''); // unanchored → dropped
  assert.equal(absoluteImageUrl(''), '');
});

/* ── postImageUrls ────────────────────────────────────────────────────────── */
test('postImageUrls: cover first, then image/figure/gallery in order, de-duped', () => {
  const data = { image: '/images/posts/p/cover.jpg' };
  const doc = { blocks: [
    { type: 'text', html: 'hi' },
    { type: 'image', file: 'one.jpg' },
    { type: 'image', src: 'https://cdn.test/two.jpg' },
    { type: 'figure', base: { file: 'fig.jpg' } },
    { type: 'gallery', images: [{ file: 'g1.jpg' }, { url: '/images/posts/p/g2.jpg' }] },
    { type: 'image', file: 'one.jpg' },                  // duplicate of #1 → dropped
  ] };
  const got = postImageUrls(doc, data, { slug: 'p', origin: 'https://ex.com' });
  assert.deepEqual(got.map((x) => x.url), [
    'https://ex.com/images/posts/p/cover.jpg',
    'https://ex.com/images/posts/p/one.jpg',
    'https://cdn.test/two.jpg',
    'https://ex.com/images/posts/p/fig.jpg',
    'https://ex.com/images/posts/p/g1.jpg',
    'https://ex.com/images/posts/p/g2.jpg',
  ]);
  assert.deepEqual(got.map((x) => x.label), ['Cover', 'Image', 'Image', 'Figure', 'Gallery', 'Gallery']);
});

test('postImageUrls: empty / malformed inputs → []', () => {
  assert.deepEqual(postImageUrls(null, null, {}), []);
  assert.deepEqual(postImageUrls({}, {}, {}), []);
  assert.deepEqual(postImageUrls({ blocks: [] }, {}, {}), []);
  assert.deepEqual(postImageUrls({ blocks: [null, 5, { type: 'image' }] }, {}, { slug: 's' }), []); // no resolvable ref
});

test('postImageUrls: no cover, no slug → only blocks with explicit url/src survive', () => {
  const doc = { blocks: [{ type: 'image', file: 'x.jpg' }, { type: 'image', src: 'https://cdn/y.jpg' }] };
  const got = postImageUrls(doc, {}, { origin: 'https://ex.com' }); // no slug → file refs unresolved
  assert.deepEqual(got.map((x) => x.url), ['https://cdn/y.jpg']);
});

/* ── buildIntent — per-platform capability + encoding ─────────────────────── */
test('buildIntent X: pre-fills BOTH text and link, URL-encoded', () => {
  const i = buildIntent('x', { lines: 'hello & welcome', url: 'https://ex.com/blog/p/' });
  assert.equal(i.platform, 'x');
  assert.equal(i.prefillsText, true);
  assert.equal(i.copyLines, false);
  assert.ok(i.href.startsWith('https://twitter.com/intent/tweet?'));
  assert.ok(i.href.includes('text=' + encodeURIComponent('hello & welcome')));
  assert.ok(i.href.includes('url=' + encodeURIComponent('https://ex.com/blog/p/')));
});

test('buildIntent LinkedIn: URL-only dialog, copyLines=true', () => {
  const i = buildIntent('linkedin', { lines: 'some text', url: 'https://ex.com/blog/p/' });
  assert.equal(i.prefillsText, false);
  assert.equal(i.copyLines, true);
  assert.equal(i.href, 'https://www.linkedin.com/sharing/share-offsite/?url=' + encodeURIComponent('https://ex.com/blog/p/'));
  assert.ok(!i.href.includes('some text')); // text never goes in the URL
});

test('buildIntent Facebook: URL-only sharer, copyLines=true', () => {
  const i = buildIntent('facebook', { lines: 'x', url: 'https://ex.com/blog/p/' });
  assert.equal(i.copyLines, true);
  assert.equal(i.href, 'https://www.facebook.com/sharer/sharer.php?u=' + encodeURIComponent('https://ex.com/blog/p/'));
});

test('buildIntent Instagram: no web composer (href null), copy + guidance', () => {
  const i = buildIntent('instagram', { lines: 'x', url: 'https://ex.com/blog/p/' });
  assert.equal(i.href, null);
  assert.equal(i.webIntent, false);
  assert.equal(i.copyLines, true);
  assert.match(i.note, /Instagram/);
});

test('buildIntent: unknown platform → null; missing url still yields a usable href', () => {
  assert.equal(buildIntent('myspace', {}), null);
  const x = buildIntent('x', { lines: 'just text' });
  assert.ok(x.href.includes('text='));
  assert.ok(!x.href.includes('url='));        // no link → no url param
  const li = buildIntent('linkedin', {});      // no link → bare composer fallback
  assert.equal(li.href, 'https://www.linkedin.com/feed/?shareActive=true');
});

test('shareIntents: returns all four platforms in order', () => {
  const all = shareIntents({ lines: 'a', url: 'https://ex.com/' });
  assert.deepEqual(all.map((i) => i.platform), SHARE_PLATFORMS);
  assert.deepEqual(all.map((i) => i.platform), ['x', 'linkedin', 'facebook', 'instagram']);
});

/* ── shareSheetText ───────────────────────────────────────────────────────── */
test('shareSheetText: lines + blank line + link; handles either alone', () => {
  assert.equal(shareSheetText('hello', 'https://ex.com/'), 'hello\n\nhttps://ex.com/');
  assert.equal(shareSheetText('  hello  ', '  https://ex.com/  '), 'hello\n\nhttps://ex.com/');
  assert.equal(shareSheetText('hello', ''), 'hello');
  assert.equal(shareSheetText('', 'https://ex.com/'), 'https://ex.com/');
  assert.equal(shareSheetText('', ''), '');
});

/* ── capability table sanity ──────────────────────────────────────────────── */
test('PLATFORM_CAP: only X pre-fills text; Instagram has no web composer', () => {
  assert.equal(PLATFORM_CAP.x.prefillsText, true);
  assert.equal(PLATFORM_CAP.linkedin.prefillsText, false);
  assert.equal(PLATFORM_CAP.facebook.prefillsText, false);
  assert.equal(PLATFORM_CAP.instagram.webIntent, false);
});
