import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  pickSelectValue,
  partitionImageFiles,
  existingImageNames,
  normaliseSiteOrigin,
  darkroomHref,
  createSiteOriginResolver,
} from './darkroom-upload.src.js';

// Regression tests for the audit fixes. Only the DOM-free/network-free parts are exercised
// here; the wiring around them (the actual <select>, dropzone, commit) is verified in-app.

// --- Fix 1 (P2): re-entry must not silently re-point the post <select> -------
// A blind rebuild leaves nothing selected → the browser picks the FIRST option while staged
// photos persist, so Commit can target the wrong post. pickSelectValue keeps the prior slug.
test('pickSelectValue keeps the previously selected slug when it still exists', () => {
  assert.equal(pickSelectValue('second', ['first', 'second', 'third']), 'second');
  assert.equal(pickSelectValue('first', ['first', 'second']), 'first');
});
test('pickSelectValue falls back to the first slug when the prior one is gone', () => {
  assert.equal(pickSelectValue('deleted', ['first', 'second']), 'first');
  assert.equal(pickSelectValue('', ['first', 'second']), 'first'); // nothing was selected
});
test('pickSelectValue restores the tracked slug through an error-then-success cycle', () => {
  // loadPosts tracks the last REAL selection in a module variable because the DOM forgets it:
  // a failed load replaces the <select> with an empty-valued error option. Model that cycle.
  let lastPostSlug = '';
  const slugs = ['first', 'second', 'third'];
  // 1. A successful load restores + tracks; the user is on 'second'.
  lastPostSlug = pickSelectValue('second', slugs);
  assert.equal(lastPostSlug, 'second');
  // 2. A load FAILS: the select now shows the error option, so the live DOM value is ''.
  //    The tracker is only updated from a NON-empty DOM value, so it keeps 'second'.
  const domValueAfterError = '';
  if (domValueAfterError) lastPostSlug = domValueAfterError; // loadPosts' guard — no-op here
  assert.equal(lastPostSlug, 'second');
  // 3. The next load SUCCEEDS: rebuilding from the tracked slug lands back on 'second' —
  //    NOT the first post — so staged photos still target the post the user chose.
  assert.equal(pickSelectValue(lastPostSlug, slugs), 'second');
  // Rebuilding from the dead DOM value instead would fall back to 'first' (the old bug).
  assert.equal(pickSelectValue(domValueAfterError, slugs), 'first');
  // 4. If the tracked post was deleted meanwhile, the fallback-to-first still applies.
  assert.equal(pickSelectValue(lastPostSlug, ['first', 'third']), 'first');
});
test('pickSelectValue returns empty string for an empty list, and tolerates junk', () => {
  assert.equal(pickSelectValue('anything', []), '');
  assert.equal(pickSelectValue(null, []), '');
  assert.equal(pickSelectValue(undefined, undefined), '');
  assert.equal(pickSelectValue('second', [null, 'second', undefined]), 'second'); // coerced compare
});

// --- Fix 2 (P2): HEIC / empty-MIME must reach decode, not vanish silently ----
test('partitionImageFiles accepts image/* AND empty-type files (HEIC on Chrome/macOS)', () => {
  const heic = { name: 'IMG_0001.HEIC', type: '' };        // Chrome/macOS reports NO type
  const jpg = { name: 'a.jpg', type: 'image/jpeg' };
  const { accepted, skipped } = partitionImageFiles([jpg, heic]);
  assert.deepEqual(accepted, [jpg, heic]);
  assert.deepEqual(skipped, []);
});
test('partitionImageFiles skips genuinely non-image MIME types', () => {
  const pdf = { name: 'doc.pdf', type: 'application/pdf' };
  const txt = { name: 'notes.txt', type: 'text/plain' };
  const png = { name: 'b.png', type: 'image/png' };
  const { accepted, skipped } = partitionImageFiles([pdf, png, txt]);
  assert.deepEqual(accepted, [png]);
  assert.deepEqual(skipped, [pdf, txt]);
});
test('partitionImageFiles tolerates a null/empty list and drops falsy entries', () => {
  assert.deepEqual(partitionImageFiles(null), { accepted: [], skipped: [] });
  assert.deepEqual(partitionImageFiles([]), { accepted: [], skipped: [] });
  const jpg = { name: 'a.jpg', type: 'image/jpeg' };
  assert.deepEqual(partitionImageFiles([null, jpg, undefined]), { accepted: [jpg], skipped: [] });
});

// --- Fix 3 (P2): the no-overwrite guard must FAIL CLOSED ---------------------
// A transient listTree failure returns null (distinct from an empty folder's []), so commit()
// can tell "couldn't check" (abort) from "folder is empty" (dedupe is a no-op, commit proceeds).
test('existingImageNames returns null when listTree throws (transient GitHub error)', async () => {
  const gh = { listTree: async () => { throw new Error('502'); } };
  assert.equal(await existingImageNames(gh, 'my-post'), null);
});
test('existingImageNames returns null when the seam lacks listTree', async () => {
  assert.equal(await existingImageNames({}, 'my-post'), null);
  assert.equal(await existingImageNames(null, 'my-post'), null);
});
test('existingImageNames returns [] for a successful but empty listing', async () => {
  const gh = { listTree: async () => [] };
  assert.deepEqual(await existingImageNames(gh, 'my-post'), []);
});
test('existingImageNames returns the basenames minus meta.json on success', async () => {
  const gh = {
    listTree: async () => [
      { path: 'src/content/blog/_images/my-post/gallery-1.jpg' },
      { path: 'src/content/blog/_images/my-post/meta.json' },
      { path: 'src/content/blog/_images/my-post/gallery-2.jpg' },
    ],
  };
  assert.deepEqual(await existingImageNames(gh, 'my-post'), ['gallery-1.jpg', 'gallery-2.jpg']);
});

// --- Fix 5 (P2): the success-card link resolves against the BLOG origin ------
test('normaliseSiteOrigin returns a bare scheme+host, adds https, drops trailing slash/path', () => {
  assert.equal(normaliseSiteOrigin('https://blog.example.com/'), 'https://blog.example.com');
  assert.equal(normaliseSiteOrigin('blog.example.com'), 'https://blog.example.com'); // scheme added
  assert.equal(normaliseSiteOrigin('https://blog.example.com/darkroom/'), 'https://blog.example.com');
  assert.equal(normaliseSiteOrigin('  https://blog.example.com  '), 'https://blog.example.com');
});
test('normaliseSiteOrigin returns empty for missing/junk input', () => {
  assert.equal(normaliseSiteOrigin(''), '');
  assert.equal(normaliseSiteOrigin(null), '');
  assert.equal(normaliseSiteOrigin(undefined), '');
});
test('darkroomHref absolutises against a known blog origin, else stays relative', () => {
  assert.equal(darkroomHref('https://blog.example.com'), 'https://blog.example.com/darkroom/');
  assert.equal(darkroomHref('blog.example.com/'), 'https://blog.example.com/darkroom/');
  assert.equal(darkroomHref(''), '/darkroom/');       // same-origin / unknown → relative
  assert.equal(darkroomHref(null), '/darkroom/');
});

// --- Fix (LOW): the site-origin cache must not remember a FAILURE forever ----
// One transient /settings/site error used to cache '' permanently, so every later hosted
// success card fell back to the relative '/darkroom/'. The resolver caches the in-flight
// promise, keeps it only when a non-empty origin resolved, and forgets it on failure/empty.
test('createSiteOriginResolver caches a non-empty origin (one fetch across many calls)', async () => {
  let calls = 0;
  const resolve = createSiteOriginResolver(async () => { calls++; return 'https://blog.example.com'; });
  assert.equal(await resolve(), 'https://blog.example.com');
  assert.equal(await resolve(), 'https://blog.example.com');
  assert.equal(await resolve(), 'https://blog.example.com');
  assert.equal(calls, 1);
});
test('createSiteOriginResolver retries after a failed fetch instead of caching \'\'', async () => {
  let calls = 0;
  const resolve = createSiteOriginResolver(async () => {
    calls++;
    if (calls === 1) throw new Error('502');           // transient /settings/site failure
    return 'https://blog.example.com';
  });
  assert.equal(await resolve(), '');                    // failure → relative fallback, never throws
  assert.equal(await resolve(), 'https://blog.example.com'); // next render RETRIES and succeeds
  assert.equal(await resolve(), 'https://blog.example.com'); // …and the success IS cached
  assert.equal(calls, 2);
});
test('createSiteOriginResolver does not cache an empty resolved origin', async () => {
  let calls = 0;
  const origins = ['', 'https://blog.example.com'];
  const resolve = createSiteOriginResolver(async () => origins[calls++]);
  assert.equal(await resolve(), '');                    // no url configured yet → not cached
  assert.equal(await resolve(), 'https://blog.example.com'); // picked up once configured
  assert.equal(calls, 2);
});
test('createSiteOriginResolver shares one in-flight fetch across concurrent calls', async () => {
  let calls = 0;
  let release;
  const gate = new Promise((r) => { release = r; });
  const resolve = createSiteOriginResolver(async () => { calls++; await gate; return 'https://blog.example.com'; });
  const a = resolve();
  const b = resolve();                                  // second render while the first is in flight
  release();
  assert.deepEqual(await Promise.all([a, b]), ['https://blog.example.com', 'https://blog.example.com']);
  assert.equal(calls, 1);
});
