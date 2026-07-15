import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  validateR2Config, isR2Configured, safeName, r2Key, contentTypeFor,
  buildCorsPolicy, classifyR2Error, uploadToR2,
  validateWorkerConfig, uploadViaWorker,
  titleFromKey, parseVideoList, videoEntryFromKey, mapVideoLibrary, isVideoKey,
  isImageWorkerConfigured, buildImageRequest, parseImageResponse, generateImageViaWorker,
} from './r2.js';

const FULL = {
  endpoint: 'https://acct.r2.cloudflarestorage.com',
  bucket: 'media',
  accessKeyId: 'AKID',
  secretAccessKey: 'SECRET',
  publicBase: 'https://media.example.com',
};

test('validateR2Config accepts a complete config and trims trailing slashes', () => {
  const r = validateR2Config({ ...FULL, endpoint: FULL.endpoint + '/', publicBase: FULL.publicBase + '///' });
  assert.equal(r.ok, true);
  assert.deepEqual(r.errors, []);
  assert.equal(r.config.endpoint, 'https://acct.r2.cloudflarestorage.com');
  assert.equal(r.config.publicBase, 'https://media.example.com');
});

test('validateR2Config flags every missing required field', () => {
  const r = validateR2Config({});
  assert.equal(r.ok, false);
  for (const f of ['endpoint', 'bucket', 'accessKeyId', 'secretAccessKey', 'publicBase']) {
    assert.ok(r.errors.some((e) => e.includes(f)), `missing-field error for ${f}`);
  }
});

test('validateR2Config rejects non-https endpoint/publicBase and bad bucket', () => {
  const r = validateR2Config({ ...FULL, endpoint: 'ftp://x', publicBase: 'noturl', bucket: 'a b/c' });
  assert.equal(r.ok, false);
  assert.ok(r.errors.some((e) => e.includes('endpoint must start with https')));
  assert.ok(r.errors.some((e) => e.includes('publicBase must start with https')));
  assert.ok(r.errors.some((e) => e.includes('bucket must not contain')));
});

test('isR2Configured mirrors validate.ok', () => {
  assert.equal(isR2Configured(FULL), true);
  assert.equal(isR2Configured({ ...FULL, publicBase: '' }), false);
});

test('safeName strips paths, lowercases, slugifies, keeps a short extension', () => {
  assert.equal(safeName('/Users/me/My Clip (FINAL).MP4'), 'my-clip-final.mp4');
  assert.equal(safeName('..\\..\\evil name!!.webm'), 'evil-name.webm');
  assert.equal(safeName(''), 'video');
  assert.equal(safeName('noext'), 'noext');
  assert.equal(safeName('.hidden'), 'hidden'); // leading-dot file → treated as stem
});

test('safeName caps an absurdly long stem', () => {
  const out = safeName('x'.repeat(500) + '.mp4');
  const stem = out.split('.')[0];
  assert.ok(stem.length <= 80);
  assert.equal(out.endsWith('.mp4'), true);
});

test('r2Key shape: videos/<ts36>-<safeName>, deterministic ts prefix', () => {
  const k = r2Key('Hello World.mp4', 0);
  assert.equal(k, 'videos/0-hello-world.mp4');
  const k2 = r2Key('clip.webm', 1700000000000);
  assert.match(k2, /^videos\/[0-9a-z]+-clip\.webm$/);
});

test('contentTypeFor prefers file.type, falls back by extension', () => {
  assert.equal(contentTypeFor({ type: 'video/mp4', name: 'a.mp4' }), 'video/mp4');
  assert.equal(contentTypeFor({ type: '', name: 'a.webm' }), 'video/webm');
  assert.equal(contentTypeFor({ type: '', name: 'a.mov' }), 'video/quicktime');
  assert.equal(contentTypeFor({ name: 'a.bin' }), 'application/octet-stream');
});

test('buildCorsPolicy returns a valid R2 policy for the default origin', () => {
  const c = buildCorsPolicy();
  assert.equal(c.origin, 'https://chapbook.rqai.co.uk');
  const parsed = JSON.parse(c.json);
  assert.equal(Array.isArray(parsed), true);
  const rule = parsed[0];
  assert.deepEqual(rule.AllowedOrigins, ['https://chapbook.rqai.co.uk']);
  assert.deepEqual(rule.AllowedMethods, ['PUT', 'GET']);
  assert.deepEqual(rule.AllowedHeaders, ['*']);
  assert.deepEqual(rule.ExposeHeaders, ['ETag']);
  assert.match(c.where, /R2.*Settings.*CORS/i);
});

test('buildCorsPolicy honours a custom origin', () => {
  const c = buildCorsPolicy('https://studio.example.com');
  assert.deepEqual(JSON.parse(c.json)[0].AllowedOrigins, ['https://studio.example.com']);
});

test('classifyR2Error: 403 → forbidden, network throw → blocked, other status → http', () => {
  assert.equal(classifyR2Error({ status: 403 }).kind, 'forbidden');
  assert.equal(classifyR2Error(new TypeError('Failed to fetch')).kind, 'blocked');
  assert.equal(classifyR2Error({ status: 500, detail: 'oops' }).kind, 'http');
  assert.match(classifyR2Error(new TypeError('Failed to fetch')).message, /VPN\/WARP/);
});

test('uploadToR2: PUTs to endpoint/bucket/key, sets content-type, returns public URL', async () => {
  const calls = [];
  const signer = {
    async fetch(url, init) { calls.push({ url, init }); return { ok: true, status: 200 }; },
  };
  const progress = [];
  const file = { name: 'My Clip.mp4', type: 'video/mp4' };
  const out = await uploadToR2({ signer, file, config: FULL, key: 'videos/0-my-clip.mp4', onProgress: (p, m) => progress.push([p, m]) });
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, 'https://acct.r2.cloudflarestorage.com/media/videos/0-my-clip.mp4');
  assert.equal(calls[0].init.method, 'PUT');
  assert.equal(calls[0].init.headers['content-type'], 'video/mp4');
  assert.equal(calls[0].init.body, file);
  assert.equal(out.url, 'https://media.example.com/videos/0-my-clip.mp4');
  assert.equal(out.key, 'videos/0-my-clip.mp4');
  assert.ok(progress.length >= 1);
});

test('uploadToR2: generates a key when none supplied', async () => {
  const signer = { async fetch() { return { ok: true, status: 200 }; } };
  const out = await uploadToR2({ signer, file: { name: 'clip.webm', type: 'video/webm' }, config: FULL });
  assert.match(out.key, /^videos\/[0-9a-z]+-clip\.webm$/);
  assert.equal(out.url, 'https://media.example.com/' + out.key);
});

test('uploadToR2: throws config error before any fetch when keys missing', async () => {
  let fetched = false;
  const signer = { async fetch() { fetched = true; return { ok: true }; } };
  await assert.rejects(
    () => uploadToR2({ signer, file: { name: 'a.mp4' }, config: { ...FULL, bucket: '' } }),
    /R2 not configured/,
  );
  assert.equal(fetched, false);
});

test('uploadToR2: non-2xx response throws with status + detail attached', async () => {
  const signer = { async fetch() { return { ok: false, status: 403, async text() { return 'AccessDenied'; } }; } };
  await assert.rejects(
    () => uploadToR2({ signer, file: { name: 'a.mp4', type: 'video/mp4' }, config: FULL }),
    (e) => { assert.equal(e.status, 403); assert.equal(e.detail, 'AccessDenied'); return true; },
  );
});

test('uploadToR2: a network throw is re-thrown and classifies as blocked', async () => {
  const signer = { async fetch() { throw new TypeError('Failed to fetch'); } };
  await assert.rejects(
    () => uploadToR2({ signer, file: { name: 'a.mp4', type: 'video/mp4' }, config: FULL }),
    (e) => { assert.equal(classifyR2Error(e).kind, 'blocked'); return true; },
  );
});

// ── Worker upload route ──────────────────────────────────────────────────────
const WK = { worker: { url: 'https://w.acct.workers.dev', secret: 'SEK' }, publicBase: 'https://media.example.com' };

test('validateWorkerConfig: ok with url+secret+publicBase, trims slashes', () => {
  const r = validateWorkerConfig({ worker: { url: 'https://w.acct.workers.dev/', secret: ' SEK ' }, publicBase: 'https://media.example.com//' });
  assert.equal(r.ok, true);
  assert.deepEqual(r.errors, []);
  assert.equal(r.config.url, 'https://w.acct.workers.dev');
  assert.equal(r.config.secret, 'SEK');
  assert.equal(r.config.publicBase, 'https://media.example.com');
});

test('validateWorkerConfig: flags each missing/invalid field', () => {
  const r = validateWorkerConfig({ worker: { url: 'ftp://x', secret: '' }, publicBase: 'noturl' });
  assert.equal(r.ok, false);
  assert.ok(r.errors.some((e) => /Worker URL must start with https/.test(e)));
  assert.ok(r.errors.some((e) => /Worker secret is required/.test(e)));
  assert.ok(r.errors.some((e) => /publicBase must start with https/.test(e)));
});

test('uploadViaWorker: PUTs to the worker URL with Bearer + X-Key, returns public URL', async () => {
  const calls = [];
  const fetchImpl = async (url, init) => { calls.push({ url, init }); return { ok: true, status: 200 }; };
  const file = { name: 'My Clip.mp4', type: 'video/mp4' };
  const out = await uploadViaWorker({ ...WK, fetchImpl, file, key: 'videos/0-my-clip.mp4' });
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, 'https://w.acct.workers.dev');
  assert.equal(calls[0].init.method, 'PUT');
  assert.equal(calls[0].init.headers.Authorization, 'Bearer SEK');
  assert.equal(calls[0].init.headers['X-Key'], 'videos/0-my-clip.mp4');
  assert.equal(calls[0].init.headers['content-type'], 'video/mp4');
  assert.equal(calls[0].init.body, file);
  assert.equal(out.url, 'https://media.example.com/videos/0-my-clip.mp4');
  assert.equal(out.key, 'videos/0-my-clip.mp4');
});

test('uploadViaWorker: generates a key when none supplied', async () => {
  const fetchImpl = async () => ({ ok: true, status: 200 });
  const out = await uploadViaWorker({ ...WK, fetchImpl, file: { name: 'clip.webm', type: 'video/webm' } });
  assert.match(out.key, /^videos\/[0-9a-z]+-clip\.webm$/);
  assert.equal(out.url, 'https://media.example.com/' + out.key);
});

test('uploadViaWorker: config error before any fetch when secret missing', async () => {
  let fetched = false;
  const fetchImpl = async () => { fetched = true; return { ok: true }; };
  await assert.rejects(
    () => uploadViaWorker({ worker: { url: WK.worker.url, secret: '' }, publicBase: WK.publicBase, fetchImpl, file: { name: 'a.mp4' } }),
    /Worker not configured/,
  );
  assert.equal(fetched, false);
});

test('uploadViaWorker: non-2xx throws with status + detail; network throw → blocked', async () => {
  const bad = async () => ({ ok: false, status: 401, async text() { return 'unauthorised'; } });
  await assert.rejects(
    () => uploadViaWorker({ ...WK, fetchImpl: bad, file: { name: 'a.mp4', type: 'video/mp4' } }),
    (e) => { assert.equal(e.status, 401); assert.equal(e.detail, 'unauthorised'); return true; },
  );
  const thrower = async () => { throw new TypeError('Failed to fetch'); };
  await assert.rejects(
    () => uploadViaWorker({ ...WK, fetchImpl: thrower, file: { name: 'a.mp4', type: 'video/mp4' } }),
    (e) => { assert.equal(classifyR2Error(e).kind, 'blocked'); return true; },
  );
});

// ── Worker list route (BYOK video library) ───────────────────────────────────
test('titleFromKey: drops prefix + ts36 stamp + extension, despaces the slug', () => {
  // BYOK keys are always videos/<ts36>-<safeName> (see r2Key): the first segment is the stamp.
  assert.equal(titleFromKey('videos/0-my-clip.mp4'), 'my clip');
  assert.equal(titleFromKey('videos/lx9z-holiday-2024.webm'), 'holiday 2024');
  assert.equal(titleFromKey(r2Key('Beach Trip.mp4', 1700000000000)), 'beach trip'); // round-trips a real key
  assert.equal(titleFromKey('videos/noext'), 'noext'); // single segment, no stamp to drop, no ext
  assert.equal(titleFromKey(''), 'Video'); // never empty
  assert.equal(titleFromKey(null), 'Video');
});

test('parseVideoList: tolerates {videos:[…]} or a bare array, drops keyless rows', () => {
  const a = parseVideoList({ videos: [{ key: 'videos/a.mp4', size: 10, uploaded: '2024-01-01T00:00:00Z' }] });
  assert.equal(a.length, 1);
  assert.equal(a[0].key, 'videos/a.mp4');
  assert.equal(a[0].size, 10);
  const b = parseVideoList([{ key: 'videos/b.mp4' }, { key: '' }, null, 'x', { nope: 1 }]);
  assert.equal(b.length, 1);
  assert.equal(b[0].key, 'videos/b.mp4');
  assert.equal(b[0].size, null);   // missing size → null
  assert.deepEqual(parseVideoList(null), []);
  assert.deepEqual(parseVideoList({}), []);
});

test('parseVideoList: sorts newest-first by uploaded; undated sink to the bottom', () => {
  const out = parseVideoList({ videos: [
    { key: 'videos/old.mp4', uploaded: '2024-01-01T00:00:00Z' },
    { key: 'videos/new.mp4', uploaded: '2024-06-01T00:00:00Z' },
    { key: 'videos/undated.mp4' },
    { key: 'videos/mid.mp4', uploaded: '2024-03-01T00:00:00Z' },
  ] });
  assert.deepEqual(out.map((v) => v.key), ['videos/new.mp4', 'videos/mid.mp4', 'videos/old.mp4', 'videos/undated.mp4']);
});

test('videoEntryFromKey: builds publicBase/key src + library shape, no poster/duration', () => {
  const e = videoEntryFromKey({ key: 'videos/0-my-clip.mp4', size: 42, uploaded: '2024-01-01T00:00:00Z' }, 'https://media.example.com/');
  assert.equal(e.src, 'https://media.example.com/videos/0-my-clip.mp4');
  assert.equal(e.publicUrl, e.src);
  assert.equal(e.title, 'my clip');
  assert.equal(e.posterUrl, '');     // BYOK uploads have no poster → placeholder tile
  assert.equal(e.durationS, null);
  assert.equal(e.local, false);
  assert.equal(e.size, 42);
  assert.equal(e.uploaded, '2024-01-01T00:00:00Z');
});

test('videoEntryFromKey: trims trailing slash on publicBase; empty when no base/key', () => {
  assert.equal(videoEntryFromKey({ key: 'videos/a.mp4' }, 'https://m.x//').src, 'https://m.x/videos/a.mp4');
  assert.equal(videoEntryFromKey({ key: 'videos/a.mp4' }, '').src, '');
  assert.equal(videoEntryFromKey({ key: '' }, 'https://m.x').src, '');
});

test('mapVideoLibrary: parse → map, newest first, each in library shape', () => {
  const out = mapVideoLibrary({ videos: [
    { key: 'videos/0-old.mp4', uploaded: '2024-01-01T00:00:00Z' },
    { key: 'videos/9-new.mp4', uploaded: '2024-09-01T00:00:00Z' },
  ] }, 'https://media.example.com');
  assert.equal(out.length, 2);
  assert.equal(out[0].title, 'new');
  assert.equal(out[0].src, 'https://media.example.com/videos/9-new.mp4');
  assert.equal(out[0].local, false);
  assert.equal(out[1].title, 'old');
});

test('parseVideoList filters out non-video objects under videos/ (isVideoKey)', () => {
  assert.equal(isVideoKey('videos/clip.mp4'), true);
  assert.equal(isVideoKey('videos/probe-1.txt'), false);
  assert.equal(isVideoKey('videos/no-ext'), false);
  const out = parseVideoList({ videos: [
    { key: 'videos/a.mp4', uploaded: '2024-09-02T00:00:00Z' },
    { key: 'videos/probe.txt', uploaded: '2024-09-03T00:00:00Z' },
    { key: 'videos/b.webm', uploaded: '2024-09-01T00:00:00Z' },
  ] });
  assert.deepEqual(out.map((r) => r.key), ['videos/a.mp4', 'videos/b.webm']);
});

// ── Worker image route (free text-to-image via Workers AI / FLUX) ────────────

test('isImageWorkerConfigured needs url+secret only (NOT publicBase)', () => {
  assert.equal(isImageWorkerConfigured({ url: 'https://w.workers.dev', secret: 's' }), true);
  assert.equal(isImageWorkerConfigured({ url: 'https://w.workers.dev/', secret: '  s  ' }), true); // trims
  assert.equal(isImageWorkerConfigured({ url: '', secret: 's' }), false);
  assert.equal(isImageWorkerConfigured({ url: 'https://w.workers.dev', secret: '' }), false);
  assert.equal(isImageWorkerConfigured({}), false);
  assert.equal(isImageWorkerConfigured(), false);
});

test('buildImageRequest forms POST /image with Bearer + JSON prompt; trims url', () => {
  const { url, init } = buildImageRequest({ worker: { url: 'https://w.workers.dev/', secret: 'sek' }, prompt: '  a fox  ' });
  assert.equal(url, 'https://w.workers.dev/image');
  assert.equal(init.method, 'POST');
  assert.equal(init.headers.Authorization, 'Bearer sek');
  assert.equal(init.headers['content-type'], 'application/json');
  assert.deepEqual(JSON.parse(init.body), { prompt: 'a fox' }); // prompt trimmed
});

test('buildImageRequest throws (kind:config) on missing worker or prompt', () => {
  assert.throws(() => buildImageRequest({ worker: { url: '', secret: 's' }, prompt: 'x' }), (e) => e.kind === 'config');
  assert.throws(() => buildImageRequest({ worker: { url: 'https://w.workers.dev', secret: 's' }, prompt: '  ' }), (e) => e.kind === 'config');
});

test('parseImageResponse reads {image} → {base64,mimeType}; defaults png; accepts {base64} alias', () => {
  assert.deepEqual(parseImageResponse({ image: 'AAA', mimeType: 'image/png' }), { base64: 'AAA', mimeType: 'image/png' });
  assert.deepEqual(parseImageResponse({ image: 'BBB' }), { base64: 'BBB', mimeType: 'image/png' }); // default mime
  assert.deepEqual(parseImageResponse({ base64: 'CCC', mimeType: 'image/jpeg' }), { base64: 'CCC', mimeType: 'image/jpeg' });
});

test('parseImageResponse throws a friendly error (uses payload.error) when no image', () => {
  assert.throws(() => parseImageResponse({ error: 'out of quota' }), (e) => e.kind === 'image' && /out of quota/.test(e.message));
  assert.throws(() => parseImageResponse({}), (e) => e.kind === 'image');
});

test('generateImageViaWorker: happy path returns {base64,mimeType} from injected fetch', async () => {
  const calls = [];
  const fakeFetch = async (url, init) => { calls.push({ url, init }); return { ok: true, json: async () => ({ image: 'ZZZ', mimeType: 'image/png' }) }; };
  const r = await generateImageViaWorker({ fetchImpl: fakeFetch, worker: { url: 'https://w.workers.dev', secret: 'sek' }, prompt: 'a heron' });
  assert.deepEqual(r, { base64: 'ZZZ', mimeType: 'image/png' });
  assert.equal(calls[0].url, 'https://w.workers.dev/image');
  assert.equal(calls[0].init.headers.Authorization, 'Bearer sek');
});

test('generateImageViaWorker: non-2xx surfaces the Worker error message + status', async () => {
  const fakeFetch = async () => ({ ok: false, status: 429, json: async () => ({ ok: false, error: 'rate-limited' }) });
  await assert.rejects(
    () => generateImageViaWorker({ fetchImpl: fakeFetch, worker: { url: 'https://w.workers.dev', secret: 's' }, prompt: 'x' }),
    (e) => e.status === 429 && /rate-limited/.test(e.message),
  );
});

test('generateImageViaWorker: network throw → kind:blocked', async () => {
  const fakeFetch = async () => { throw new TypeError('Failed to fetch'); };
  await assert.rejects(
    () => generateImageViaWorker({ fetchImpl: fakeFetch, worker: { url: 'https://w.workers.dev', secret: 's' }, prompt: 'x' }),
    (e) => e.kind === 'blocked',
  );
});
