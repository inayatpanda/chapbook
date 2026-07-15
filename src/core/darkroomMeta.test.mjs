import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  tidyCamera,
  normaliseExif,
  buildEntry,
  parseExistingMeta,
  mergeMeta,
  buildMergedMeta,
  safeImageName,
  dedupeAgainst,
} from './darkroomMeta.js';

// --- tidyCamera: must match the blog-side semantics (inayatpanda-site/src/lib/darkroom.mjs) ---
test('tidyCamera title-cases the make and joins make + model', () => {
  assert.equal(tidyCamera('FUJIFILM', 'X-T5'), 'Fujifilm X-T5');
});
test('tidyCamera does not duplicate a make the model already leads with', () => {
  assert.equal(tidyCamera('Canon', 'Canon EOS R5'), 'Canon EOS R5');
  assert.equal(tidyCamera('NIKON', 'NIKON Z6'), 'Nikon Z6');
});
test('tidyCamera returns the lone present side, and null for none', () => {
  assert.equal(tidyCamera('', 'X100V'), 'X100V');
  assert.equal(tidyCamera('SONY', ''), 'Sony');
  assert.equal(tidyCamera('', ''), null);
  assert.equal(tidyCamera(null, undefined), null);
});

// --- safeImageName: basename only, whitelist, no traversal, valid stem + image ext ---
test('safeImageName neutralises path traversal to a safe basename', () => {
  assert.equal(safeImageName('../x.jpg'), 'x.jpg');
  assert.equal(safeImageName('../../etc/passwd.jpg'), 'passwd.jpg');
  assert.equal(safeImageName('/abs/path/photo.png'), 'photo.png');
  assert.equal(safeImageName('a\\b\\c.jpeg'), 'c.jpg'); // backslashes + jpeg→jpg
  // a name that is ONLY dots/dashes after basename → fallback stem, never `..`
  assert.equal(safeImageName('..'), 'photo.jpg');
  assert.equal(safeImageName('../'), 'photo.jpg');
  assert.equal(safeImageName('....jpg'), 'photo.jpg'); // stem collapses to empty → fallback
});
test('safeImageName whitelists characters and strips leading dots/dashes', () => {
  assert.equal(safeImageName('  my photo (2).JPG'), 'my-photo-2.jpg'); // spaces+parens→-, leading/trailing dash trimmed
  assert.equal(safeImageName('café déjà.png'), 'caf-d-j.png'); // unicode → '-'
  assert.equal(safeImageName('.hidden.jpg'), 'hidden.jpg'); // leading dot stripped
  assert.equal(safeImageName('---lead.jpg'), 'lead.jpg'); // leading dashes stripped
  assert.equal(safeImageName('a:b*c?.jpg'), 'a-b-c.jpg'); // windows-illegal + trailing dash trimmed
});
test('safeImageName guarantees a non-empty stem and a valid image extension', () => {
  assert.equal(safeImageName(''), 'photo.jpg');
  assert.equal(safeImageName(null), 'photo.jpg');
  assert.equal(safeImageName(undefined), 'photo.jpg');
  assert.equal(safeImageName('   '), 'photo.jpg');
  assert.equal(safeImageName('noext'), 'noext.jpg'); // no extension → fallback ext
  assert.equal(safeImageName('weird.exe'), 'weird.exe.jpg'); // non-image ext kept as stem text, .jpg added
  assert.equal(safeImageName('shot.JPEG'), 'shot.jpg'); // jpeg normalised
  assert.equal(safeImageName('pic.webp'), 'pic.webp'); // webp allowed through
});
test('safeImageName honours custom fallbacks', () => {
  assert.equal(safeImageName('', { fallbackStem: 'capture', fallbackExt: 'png' }), 'capture.png');
  assert.equal(safeImageName('..', { fallbackStem: 'cam' }), 'cam.jpg');
});

// --- dedupeAgainst: unique within batch AND against existing committed files ---
test('dedupeAgainst makes names unique within the batch', () => {
  assert.deepEqual(dedupeAgainst(['a.jpg', 'a.jpg', 'b.jpg', 'a.jpg']), ['a.jpg', 'a-2.jpg', 'b.jpg', 'a-3.jpg']);
});
test('dedupeAgainst never collides with an existing committed file', () => {
  // existing gallery-1.jpg in the folder → a fresh upload of the same name is renamed, not overwritten
  assert.deepEqual(dedupeAgainst(['gallery-1.jpg'], ['gallery-1.jpg', 'meta.json']), ['gallery-1-2.jpg']);
  // both an existing AND a within-batch collision
  assert.deepEqual(dedupeAgainst(['x.jpg', 'x.jpg'], ['x.jpg']), ['x-2.jpg', 'x-3.jpg']);
});
test('dedupeAgainst is case-insensitive (GitHub paths are)', () => {
  assert.deepEqual(dedupeAgainst(['Photo.JPG'], ['photo.jpg']), ['Photo-2.JPG']);
});
test('dedupeAgainst leaves non-colliding names untouched and does not mutate input', () => {
  const input = ['one.jpg', 'two.jpg'];
  assert.deepEqual(dedupeAgainst(input, ['three.jpg']), ['one.jpg', 'two.jpg']);
  assert.deepEqual(input, ['one.jpg', 'two.jpg']); // input preserved
  assert.deepEqual(dedupeAgainst([], ['a.jpg']), []);
});

// --- normaliseExif: raw exifr object → { date(ISO), camera, gps } ---
test('normaliseExif turns a Date + make/model + gps into the tidy shape', () => {
  const d = new Date('2024-08-01T10:30:00.000Z');
  const out = normaliseExif({ DateTimeOriginal: d, Make: 'FUJIFILM', Model: 'X-T5', GPSLatitude: 51.5, GPSLongitude: -0.12 });
  assert.equal(out.date, '2024-08-01T10:30:00.000Z');
  assert.equal(out.camera, 'Fujifilm X-T5');
  assert.deepEqual(out.gps, [51.5, -0.12]);
});
test('normaliseExif is tolerant of empty/partial EXIF', () => {
  assert.deepEqual(normaliseExif(null), { date: null, camera: null, gps: null });
  assert.deepEqual(normaliseExif({}), { date: null, camera: null, gps: null });
  // gps needs BOTH coordinates as finite numbers
  assert.equal(normaliseExif({ GPSLatitude: 51.5 }).gps, null);
  // accepts an ISO string date too
  assert.equal(normaliseExif({ DateTimeOriginal: '2023-01-02T03:04:05Z' }).date, new Date('2023-01-02T03:04:05Z').toISOString());
});

// --- buildEntry: omit empties; only set fields that have values ---
test('buildEntry omits every empty field', () => {
  assert.deepEqual(buildEntry({}), {});
  assert.deepEqual(buildEntry({ caption: '   ', tags: ['', '  '], album: '' }), {});
});
test('buildEntry sets only the provided fields and trims/dedupes tags', () => {
  const e = buildEntry({
    exif: { date: '2024-08-01T10:30:00.000Z', camera: 'Fujifilm X-T5', gps: [51.5, -0.12] },
    caption: '  Sunrise over the ward  ',
    tags: [' theatre ', 'theatre', 'dawn', ''],
    album: ' On call ',
  });
  assert.deepEqual(e, {
    caption: 'Sunrise over the ward',
    tags: ['theatre', 'dawn'],
    album: 'On call',
    date: '2024-08-01T10:30:00.000Z',
    camera: 'Fujifilm X-T5',
    gps: [51.5, -0.12],
  });
});
test('buildEntry drops a malformed gps and keeps the rest', () => {
  const e = buildEntry({ exif: { camera: 'Sony', gps: [51.5] }, caption: 'x' });
  assert.deepEqual(e, { caption: 'x', camera: 'Sony' });
});

// --- parseExistingMeta: null / empty / malformed all degrade to {} ---
test('parseExistingMeta tolerates null, empty, array and broken JSON', () => {
  assert.deepEqual(parseExistingMeta(null), {});
  assert.deepEqual(parseExistingMeta(''), {});
  assert.deepEqual(parseExistingMeta('   '), {});
  assert.deepEqual(parseExistingMeta('[1,2]'), {});
  assert.deepEqual(parseExistingMeta('{not json'), {});
  assert.deepEqual(parseExistingMeta('{"a.jpg":{"caption":"hi"}}'), { 'a.jpg': { caption: 'hi' } });
});

// --- mergeMeta: never clobber OTHER images; replace on re-upload ---
test('mergeMeta preserves other images and replaces the re-uploaded one', () => {
  const existing = { 'a.jpg': { caption: 'A', tags: ['x'] }, 'b.jpg': { album: 'old' } };
  const additions = { 'b.jpg': { album: 'new', caption: 'B2' }, 'c.jpg': { caption: 'C' } };
  const merged = mergeMeta(existing, additions);
  assert.deepEqual(merged, {
    'a.jpg': { caption: 'A', tags: ['x'] }, // untouched
    'b.jpg': { album: 'new', caption: 'B2' }, // replaced
    'c.jpg': { caption: 'C' }, // added
  });
  // inputs not mutated
  assert.deepEqual(existing['b.jpg'], { album: 'old' });
});
test('mergeMeta does not overwrite a real entry with an empty {} addition', () => {
  const existing = { 'a.jpg': { caption: 'keep me' } };
  const merged = mergeMeta(existing, { 'a.jpg': {}, 'new.jpg': {} });
  assert.deepEqual(merged['a.jpg'], { caption: 'keep me' }); // not clobbered
  assert.deepEqual(merged['new.jpg'], {}); // placeholder kept (nothing was there)
});

// --- buildMergedMeta: end-to-end glue used by the UI ---
test('buildMergedMeta merges a fresh batch onto existing content', () => {
  const existing = JSON.stringify({ 'old.jpg': { caption: 'Old' } });
  const photos = [
    { filename: '01.jpg', exif: { date: '2024-08-01T00:00:00.000Z', camera: 'Fujifilm X-T5' }, caption: 'First', tags: ['a'], album: 'Trip' },
    { filename: '02.jpg', exif: {}, caption: '', tags: [], album: 'Trip' },
  ];
  const merged = buildMergedMeta(existing, photos);
  assert.deepEqual(merged, {
    'old.jpg': { caption: 'Old' },
    '01.jpg': { caption: 'First', tags: ['a'], album: 'Trip', date: '2024-08-01T00:00:00.000Z', camera: 'Fujifilm X-T5' },
    '02.jpg': { album: 'Trip' },
  });
});
test('buildMergedMeta starting from no meta.json (null content)', () => {
  const merged = buildMergedMeta(null, [{ filename: 'x.jpg', caption: 'Hi' }]);
  assert.deepEqual(merged, { 'x.jpg': { caption: 'Hi' } });
});
