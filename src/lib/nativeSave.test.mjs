import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  downloadUrlKind, mimeFromDataUrl, decodeDataUrl, extensionForMime,
  deriveDownloadFilename, dialogFiltersFor,
} from './nativeSave.js';

test('downloadUrlKind — only blob: and data: are intercepted', () => {
  assert.equal(downloadUrlKind('blob:tauri://localhost/abc-123'), 'blob');
  assert.equal(downloadUrlKind('data:image/png;base64,iVBOR'), 'data');
  assert.equal(downloadUrlKind('DATA:text/plain,hi'), 'data', 'case-insensitive');
  assert.equal(downloadUrlKind('https://example.com/file.zip'), null, 'http(s) left alone');
  assert.equal(downloadUrlKind('/app/thing.json'), null, 'relative left alone');
  assert.equal(downloadUrlKind(''), null);
  assert.equal(downloadUrlKind(null), null);
  assert.equal(downloadUrlKind(undefined), null);
});

test('mimeFromDataUrl — extracts the declared MIME (lower-cased), else empty', () => {
  assert.equal(mimeFromDataUrl('data:image/png;base64,AAAA'), 'image/png');
  assert.equal(mimeFromDataUrl('data:text/html,<b>hi</b>'), 'text/html');
  assert.equal(mimeFromDataUrl('data:IMAGE/GIF;base64,AA'), 'image/gif', 'lower-cased');
  assert.equal(mimeFromDataUrl('data:,plain'), '', 'no MIME → empty');
  assert.equal(mimeFromDataUrl('blob:x'), '', 'not a data URL');
  assert.equal(mimeFromDataUrl(null), '');
});

test('decodeDataUrl — base64 payload → correct bytes + mime', () => {
  // "PNG" as bytes → base64 "UE5H"
  const out = decodeDataUrl('data:image/png;base64,UE5H');
  assert.equal(out.mime, 'image/png');
  assert.deepEqual(Array.from(out.bytes), [0x50, 0x4e, 0x47]);
});

test('decodeDataUrl — percent-encoded text payload → utf8 bytes', () => {
  const out = decodeDataUrl('data:application/json,%7B%22a%22%3A1%7D');
  assert.equal(out.mime, 'application/json');
  assert.equal(new TextDecoder().decode(out.bytes), '{"a":1}');
});

test('decodeDataUrl — plain (unencoded) text and unicode round-trip', () => {
  assert.equal(new TextDecoder().decode(decodeDataUrl('data:text/plain,hello').bytes), 'hello');
  const uni = decodeDataUrl('data:text/plain,caf%C3%A9%20%E2%9C%93');
  assert.equal(new TextDecoder().decode(uni.bytes), 'café ✓');
});

test('decodeDataUrl — malformed / non-data input returns null, never throws', () => {
  assert.equal(decodeDataUrl('data:image/png;base64'), null, 'no comma');
  assert.equal(decodeDataUrl('data:image/png;base64,@@@not-base64@@@'), null, 'bad base64 → null');
  assert.equal(decodeDataUrl('blob:x'), null);
  assert.equal(decodeDataUrl(''), null);
  assert.equal(decodeDataUrl(null), null);
});

test('extensionForMime — known export types map, unknown/blank → empty', () => {
  assert.equal(extensionForMime('image/png'), 'png');
  assert.equal(extensionForMime('image/gif'), 'gif');
  assert.equal(extensionForMime('video/mp4'), 'mp4');
  assert.equal(extensionForMime('text/html'), 'html');
  assert.equal(extensionForMime('application/json'), 'json');
  assert.equal(extensionForMime('application/pdf'), 'pdf');
  assert.equal(extensionForMime('IMAGE/WEBP'), 'webp', 'case-insensitive');
  assert.equal(extensionForMime('application/x-unknown'), '');
  assert.equal(extensionForMime(''), '');
  assert.equal(extensionForMime(null), '');
});

test('deriveDownloadFilename — keeps a good download attr verbatim', () => {
  assert.equal(deriveDownloadFilename('card.png', 'image/png'), 'card.png');
  assert.equal(deriveDownloadFilename('chapbook-drafts-2026-07-26.json', 'application/json'), 'chapbook-drafts-2026-07-26.json');
  assert.equal(deriveDownloadFilename('flipbook.gif', 'image/gif'), 'flipbook.gif');
  assert.equal(deriveDownloadFilename('interactive.html', 'text/html'), 'interactive.html');
});

test('deriveDownloadFilename — supplies extension from MIME when the name lacks one', () => {
  assert.equal(deriveDownloadFilename('card', 'image/png'), 'card.png');
  assert.equal(deriveDownloadFilename('export', 'application/json'), 'export.json');
  assert.equal(deriveDownloadFilename('', 'image/gif', 'flipbook'), 'flipbook.gif');
});

test('deriveDownloadFilename — safe defaults + strips path separators', () => {
  assert.equal(deriveDownloadFilename('', ''), 'download', 'empty attr + no mime → download');
  assert.equal(deriveDownloadFilename(null, 'text/html'), 'download.html');
  assert.equal(deriveDownloadFilename('../../etc/passwd', ''), '_.._etc_passwd', 'separators neutralised — no / or \\ survive');
  assert.equal(deriveDownloadFilename('sub/dir/name.png', 'image/png'), 'sub_dir_name.png');
});

test('dialogFiltersFor — builds a single-extension filter from the filename', () => {
  assert.deepEqual(dialogFiltersFor('card.png'), [{ name: 'PNG image', extensions: ['png'] }]);
  assert.deepEqual(dialogFiltersFor('a.b.json'), [{ name: 'JSON file', extensions: ['json'] }]);
  assert.deepEqual(dialogFiltersFor('clip.MP4'), [{ name: 'MP4 video', extensions: ['mp4'] }], 'lower-cased');
  assert.deepEqual(dialogFiltersFor('thing.xyz'), [{ name: 'XYZ file', extensions: ['xyz'] }], 'unknown ext label');
  assert.deepEqual(dialogFiltersFor('noext'), [], 'no extension → no filter');
  assert.deepEqual(dialogFiltersFor(''), []);
});
