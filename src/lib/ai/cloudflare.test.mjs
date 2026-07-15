import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  capabilities, isWorkerImageConfigured, buildImageRequest, parseImageResponse, generateImage,
} from './cloudflare.js';

test('capabilities: image only (no text/vision/document)', () => {
  assert.deepEqual(capabilities, { text: false, vision: false, document: false, image: true });
});

test('isWorkerImageConfigured needs url+secret only', () => {
  assert.equal(isWorkerImageConfigured({ url: 'https://w.workers.dev', secret: 's' }), true);
  assert.equal(isWorkerImageConfigured({ url: 'https://w.workers.dev/', secret: ' s ' }), true);
  assert.equal(isWorkerImageConfigured({ url: '', secret: 's' }), false);
  assert.equal(isWorkerImageConfigured({ url: 'https://w.workers.dev', secret: '' }), false);
  assert.equal(isWorkerImageConfigured({}), false);
  assert.equal(isWorkerImageConfigured(), false);
});

test('buildImageRequest forms POST /image with Bearer + JSON prompt, trims url+prompt', () => {
  const { url, init } = buildImageRequest({ worker: { url: 'https://w.workers.dev/', secret: 'sek' }, prompt: '  a heron  ' });
  assert.equal(url, 'https://w.workers.dev/image');
  assert.equal(init.method, 'POST');
  assert.equal(init.headers.Authorization, 'Bearer sek');
  assert.equal(init.headers['content-type'], 'application/json');
  assert.deepEqual(JSON.parse(init.body), { prompt: 'a heron' });
});

test('buildImageRequest throws AI_NO_KEY when unconfigured, AI_CAP on empty prompt', () => {
  assert.throws(() => buildImageRequest({ worker: { url: '', secret: 's' }, prompt: 'x' }), (e) => e.code === 'AI_NO_KEY' && e.status === 503);
  assert.throws(() => buildImageRequest({ worker: { url: 'https://w.workers.dev', secret: 's' }, prompt: '  ' }), (e) => e.code === 'AI_CAP' && e.status === 400);
});

test('parseImageResponse maps {image} → {base64,mimeType}; defaults png; {base64} alias', () => {
  assert.deepEqual(parseImageResponse({ image: 'AAA', mimeType: 'image/png' }), { base64: 'AAA', mimeType: 'image/png' });
  assert.deepEqual(parseImageResponse({ image: 'BBB' }), { base64: 'BBB', mimeType: 'image/png' });
  assert.deepEqual(parseImageResponse({ base64: 'CCC', mimeType: 'image/jpeg' }), { base64: 'CCC', mimeType: 'image/jpeg' });
});

test('parseImageResponse throws AI_PARSE (uses payload.error) when no image', () => {
  assert.throws(() => parseImageResponse({ error: 'out of quota' }), (e) => e.code === 'AI_PARSE' && /out of quota/.test(e.message));
  assert.throws(() => parseImageResponse({}), (e) => e.code === 'AI_PARSE');
});

test('generateImage: happy path returns {base64,mimeType} from injected fetch', async () => {
  const calls = [];
  const fakeFetch = async (url, init) => { calls.push({ url, init }); return { ok: true, json: async () => ({ image: 'ZZZ', mimeType: 'image/png' }) }; };
  const r = await generateImage({ worker: { url: 'https://w.workers.dev', secret: 'sek' }, prompt: 'a fox' }, fakeFetch);
  assert.deepEqual(r, { base64: 'ZZZ', mimeType: 'image/png' });
  assert.equal(calls[0].url, 'https://w.workers.dev/image');
  assert.equal(calls[0].init.headers.Authorization, 'Bearer sek');
});

test('generateImage: non-2xx surfaces the Worker error + status as AI_HTTP', async () => {
  const fakeFetch = async () => ({ ok: false, status: 429, json: async () => ({ ok: false, error: 'out of free quota' }) });
  await assert.rejects(
    () => generateImage({ worker: { url: 'https://w.workers.dev', secret: 's' }, prompt: 'x' }, fakeFetch),
    (e) => e.code === 'AI_HTTP' && e.status === 429 && /out of free quota/.test(e.message),
  );
});

test('generateImage: network throw → AI_HTTP 502 with a clear message', async () => {
  const fakeFetch = async () => { throw new TypeError('Failed to fetch'); };
  await assert.rejects(
    () => generateImage({ worker: { url: 'https://w.workers.dev', secret: 's' }, prompt: 'x' }, fakeFetch),
    (e) => e.code === 'AI_HTTP' && e.status === 502 && /could not reach the image worker/i.test(e.message),
  );
});
