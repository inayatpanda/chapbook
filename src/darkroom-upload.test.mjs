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

// --- Fix (QA, HIGH): EXIF was NEVER read — the vendored exifr LITE build rejects `pick` ----
// readExif used `exifr.parse(file, { pick: [...] })`, but the lite build (src/vendor/
// exifr.esm.js) does not support the `pick` option: it throws "undefined is not iterable"
// for EVERY jpeg, the catch swallowed it, and date/camera were silently null — while the
// darkroom UI advertises "EXIF date and camera are read first". The fix parses with
// `{ gps: false }` (supported by the lite build), which reads Make/Model/DateTimeOriginal
// AND never even parses the GPS block, so coordinates never enter browser memory (the
// privacy goal the old `pick` list was serving). These tests run the REAL vendored exifr
// against a real EXIF-bearing JPEG built byte-by-byte below.
import exifr from './vendor/exifr.esm.js';
import { readExif } from './darkroom-upload.src.js';

// A minimal but genuine EXIF JPEG: SOI + APP1("Exif\0\0" + little-endian TIFF) + EOI.
// IFD0 { Make, Model, ExifIFD*, GPSIFD* } · ExifIFD { DateTimeOriginal } ·
// GPSIFD { LatRef/Lat/LonRef/Lon } — GPS is INCLUDED so the tests can prove it is dropped.
function buildExifJpeg() {
  const ascii = (s) => [...s].map((c) => c.charCodeAt(0));
  const u16 = (v) => [v & 0xff, (v >> 8) & 0xff];
  const u32 = (v) => [v & 0xff, (v >> 8) & 0xff, (v >> 16) & 0xff, (v >> 24) & 0xff];
  const rat = (n, d) => [...u32(n), ...u32(d)];
  const make = 'FUJIFILM\0', model = 'X-T5\0', dto = '2024:08:12 15:30:00\0';
  const ifd0Off = 8;
  const ifd0Size = 2 + 4 * 12 + 4;
  const makeOff = ifd0Off + ifd0Size;
  const modelOff = makeOff + make.length;
  const exifIfdOff = modelOff + model.length;
  const exifIfdSize = 2 + 1 * 12 + 4;
  const dtoOff = exifIfdOff + exifIfdSize;
  const gpsIfdOff = dtoOff + dto.length;
  const gpsIfdSize = 2 + 4 * 12 + 4;
  const latOff = gpsIfdOff + gpsIfdSize;
  const lonOff = latOff + 24;
  const entry = (tag, type, count, off, inline = null) =>
    [...u16(tag), ...u16(type), ...u32(count), ...(inline != null ? inline : u32(off))];
  const tiff = [
    ...ascii('II'), ...u16(42), ...u32(8),
    ...u16(4),
    ...entry(0x010f, 2, make.length, makeOff),   // Make (ASCII)
    ...entry(0x0110, 2, model.length, modelOff), // Model (ASCII)
    ...entry(0x8769, 4, 1, exifIfdOff),          // ExifIFD pointer
    ...entry(0x8825, 4, 1, gpsIfdOff),           // GPSIFD pointer
    ...u32(0),
    ...ascii(make), ...ascii(model),
    ...u16(1),
    ...entry(0x9003, 2, dto.length, dtoOff),     // DateTimeOriginal
    ...u32(0),
    ...ascii(dto),
    ...u16(4),
    ...entry(0x0001, 2, 2, 0, [...ascii('N\0'), 0, 0]), // GPSLatitudeRef (inline)
    ...entry(0x0002, 5, 3, latOff),                     // GPSLatitude 3× RATIONAL
    ...entry(0x0003, 2, 2, 0, [...ascii('E\0'), 0, 0]), // GPSLongitudeRef (inline)
    ...entry(0x0004, 5, 3, lonOff),                     // GPSLongitude
    ...u32(0),
    ...rat(51, 1), ...rat(30, 1), ...rat(0, 1),         // 51°30'00" N
    ...rat(0, 1), ...rat(7, 1), ...rat(0, 1),           //  0°07'00" E
  ];
  const app1Body = [...ascii('Exif\0\0'), ...tiff];
  const app1 = [0xff, 0xe1, ((app1Body.length + 2) >> 8) & 0xff, (app1Body.length + 2) & 0xff, ...app1Body];
  return new Uint8Array([0xff, 0xd8, ...app1, 0xff, 0xd9]);
}

test('the vendored exifr lite build REJECTS the pick option (the bug this guards against)', async () => {
  // Canary: if this ever starts passing (a vendored-build upgrade that supports `pick`),
  // re-evaluate readExif — but until then, `pick` must never be passed.
  await assert.rejects(exifr.parse(buildExifJpeg(), { pick: ['DateTimeOriginal', 'Make', 'Model'] }));
});

test('readExif reads date + camera from a real EXIF jpeg', async () => {
  const r = await readExif(buildExifJpeg());
  // 15:30 local in the file → the exact UTC instant depends on the machine's TZ; assert the
  // date parsed to a real ISO instant on the right day (any TZ), and the camera is tidied.
  assert.match(String(r.date), /^2024-08-1[123]T\d{2}:30:00/);
  assert.equal(r.camera, 'Fujifilm X-T5');
});

test('readExif NEVER stages gps, even when the photo has GPS EXIF', async () => {
  const r = await readExif(buildExifJpeg());
  assert.deepEqual(Object.keys(r).sort(), ['camera', 'date', 'gps']);
  assert.equal(r.gps, null);
});

test('the parse options keep GPS out of memory entirely (no GPS keys in the raw output)', async () => {
  // The privacy property the old `pick` list was for: with { gps: false } the lite build
  // does not even parse the GPS block, so coordinates never exist in browser memory.
  const raw = await exifr.parse(buildExifJpeg(), { gps: false });
  const gpsKeys = Object.keys(raw).filter((k) => /gps|latitude|longitude/i.test(k));
  assert.deepEqual(gpsKeys, []);
  assert.equal(raw.Make, 'FUJIFILM'); // and the wanted tags ARE there
  assert.equal(raw.Model, 'X-T5');
  assert.ok(raw.DateTimeOriginal);
});

test('readExif returns nulls (never throws) for a jpeg with no EXIF', async () => {
  const r = await readExif(new Uint8Array([0xff, 0xd8, 0xff, 0xd9]));
  assert.deepEqual(r, { date: null, camera: null, gps: null });
});
