import test from 'node:test';
import assert from 'node:assert/strict';
import { generateKeyPairSync, randomBytes, sign } from 'node:crypto';
import { createHandler, signingMessage } from '../functions/fulfil-store.mjs';
import { privateStoreAdapter } from '../lib/fulfil-store.mjs';
import { makeQueueWriter } from '../lib/enqueue-fulfilment.mjs';

function blobs() {
  const values = new Map(); let version = 0;
  return { values,
    async get(key) { return structuredClone(values.get(key)?.data || null); },
    async getWithMetadata(key) { return structuredClone(values.get(key) || null); },
    async getMetadata(key) { const v = values.get(key); return v ? { etag: v.etag } : null; },
    async setJSON(key, data, options = {}) {
      const old = values.get(key);
      if ((options.onlyIfNew && old) || (options.onlyIfMatch && old?.etag !== options.onlyIfMatch)) return { modified: false };
      const etag = String(++version); values.set(key, { data: structuredClone(data), etag }); return { modified: true, etag };
    },
    async list({ prefix = '' } = {}) { return { blobs: [...values].filter(([k]) => k.startsWith(prefix)).map(([key, v]) => ({ key, etag: v.etag })) }; },
    async delete(key) { values.delete(key); },
  };
}
function fixture() {
  const { privateKey, publicKey } = generateKeyPairSync('ed25519');
  const store = blobs(), control = blobs(), now = 1_800_000_000_000;
  const handler = createHandler({ store, control, publicKey: publicKey.export({ type: 'spki', format: 'der' }).subarray(-32).toString('hex'), now: () => now });
  const request = (payload, override = {}) => {
    const body = JSON.stringify({ ts: now, nonce: randomBytes(16).toString('hex'), ...payload });
    return new Request('https://chapbook.rqai.co.uk/.netlify/functions/fulfil-store', { method: 'POST', headers: { 'x-rqai-signature': sign(null, signingMessage(body), privateKey).toString('base64url') }, body, ...override });
  };
  return { handler, request, store, control, now, privateKey };
}
test('private store rejects unsigned, tampered, expired and cross-protocol requests before storage access', async () => {
  const f = fixture();
  assert.equal((await f.handler(new Request('https://x', { method: 'POST', body: '{}' }))).status, 401);
  assert.equal((await f.handler(f.request({ op: 'get', path: 'state/licences.enc.json', ts: 0 }))).status, 401);
  const valid = f.request({ op: 'get', path: 'state/licences.enc.json' });
  const body = await valid.text();
  assert.equal((await f.handler(new Request(valid.url, { method: 'POST', headers: valid.headers, body: body.replace('licences', 'other') }))).status, 401);
  assert.equal((await f.handler(f.request({ op: 'get', path: 'state/licences.enc.json' }, { headers: { 'x-rqai-signature': sign(null, Buffer.from(body), f.privateKey).toString('base64url') } }))).status, 401);
  assert.equal(f.store.values.size, 0); assert.equal(f.control.values.size, 0);
});
test('signed writes reject replay and overwrite without the current ETag', async () => {
  const f = fixture(), payload = { op: 'put', path: 'state/test.json', record: { value: 1 } };
  const req = f.request(payload), copy = req.clone();
  const res = await f.handler(req); assert.equal(res.status, 200); const { sha } = await res.json();
  assert.equal((await f.handler(copy)).status, 409);
  assert.equal((await f.handler(f.request({ ...payload, record: { value: 2 } }))).status, 409);
  assert.equal((await f.handler(f.request({ ...payload, sha, record: { value: 3 } }))).status, 200);
  assert.equal((await f.store.get(payload.path)).value, 3);
});
test('path traversal and access outside the fulfilment namespaces are rejected', async () => {
  const f = fixture();
  for (const path of ['../secret.json', 'state/../secret.json', 'public/x.json', 'state//x.json', 'state/%2e%2e/x.json']) assert.equal((await f.handler(f.request({ op: 'get', path }))).status, 400);
});
test('deletion needs the latest version, removes content and leaves no record lock', async () => {
  const store = blobs(), control = blobs(), api = privateStoreAdapter(store, control);
  const sha = await api.put('done/trial-test.json', { email: 'synthetic@example.invalid' });
  await assert.rejects(api.del('done/trial-test.json', 'wrong'), /conflict/);
  await api.del('done/trial-test.json', sha);
  assert.equal(await api.get('done/trial-test.json'), null); assert.equal(control.values.size, 0);
});
test('concurrent creation keeps exactly one durable queue record', async () => {
  const store = blobs(), control = blobs(), api = privateStoreAdapter(store, control);
  const attempts = await Promise.allSettled([api.put('queue/sale-test.json', { n: 1 }), api.put('queue/sale-test.json', { n: 2 })]);
  assert.equal(attempts.filter(x => x.status === 'fulfilled').length, 1);
  assert.ok([1,2].includes((await api.get('queue/sale-test.json')).record.n));
});
test('failed wake-up preserves the queued order and retry is idempotent', async () => {
  const store = blobs(), control = blobs(); let legacy = false;
  const write = makeQueueWriter({ store, control, legacyPush: async () => { legacy = true; }, fetchImpl: async url => url.endsWith('/dispatches') ? new Response('', { status: 503 }) : Response.json({ content: Buffer.from(JSON.stringify({ storage: 'blobs-v1' })).toString('base64') }) });
  const args = { path: 'queue/sale-cs_test.json', record: { type: 'sale', sessionId: 'cs_test', email: 'synthetic@example.invalid' }, token: 'test' };
  assert.deepEqual(await write(args), { ok: true, already: false });
  assert.deepEqual(await write(args), { ok: true, already: true });
  assert.equal(legacy, false); assert.equal(store.values.size, 1);
});
test('control lookup fails closed instead of switching back to Git', async () => {
  let legacy = false;
  const write = makeQueueWriter({ legacyPush: async () => { legacy = true; }, fetchImpl: async () => new Response('', { status: 503 }) });
  await assert.rejects(write({ path: 'queue/trial-a.json', record: {}, token: 'test' }), /control unavailable/);
  assert.equal(legacy, false);
});
test('authentication expiry removes only expired nonce receipts', async () => {
  const f = fixture();
  await f.control.setJSON('nonces/old', { expires: f.now - 1 });
  await f.control.setJSON('nonces/current', { expires: f.now + 100 });
  const r = await f.handler(f.request({ op: 'prune-auth' }));
  assert.equal(r.status, 200); assert.equal((await r.json()).removed, 1);
  assert.equal(await f.control.get('nonces/old'), null); assert.ok(await f.control.get('nonces/current'));
});
