// Synthetic startup checks for the isolated preview. No customer stores, keys,
// email services or public mutation endpoint are involved.
import assert from 'node:assert/strict';
import { generateKeyPairSync, randomBytes, sign } from 'node:crypto';
import { mysqlStore } from './mysql-store.mjs';
import { privateStoreAdapter } from '../netlify/lib/fulfil-store.mjs';
import { createHandler, signingMessage } from '../netlify/functions/fulfil-store.mjs';

export async function probeStorage(makeStore = mysqlStore) {
  const name = 'preview-probe-' + randomBytes(12).toString('hex');
  const store = makeStore(name), control = makeStore(name + '-control');
  const api = privateStoreAdapter(store, control);
  let checks = 0;
  try {
    const created = await Promise.all(Array.from({ length: 8 }, (_, n) => store.setJSON('queue/once.json', { n }, { onlyIfNew: true })));
    assert.equal(created.filter(r => r.modified).length, 1); checks++;
    const current = await store.getWithMetadata('queue/once.json');
    const updated = await Promise.all(Array.from({ length: 8 }, (_, n) => store.setJSON('queue/once.json', { n }, { onlyIfMatch: current.etag })));
    assert.equal(updated.filter(r => r.modified).length, 1); checks++;
    await store.setJSON('queue/a_b.json', { synthetic: true });
    await store.setJSON('queue/axb.json', { synthetic: true });
    assert.deepEqual((await store.list({ prefix: 'queue/a_' })).blobs.map(r => r.key), ['queue/a_b.json']); checks++;
    assert.equal(await control.get('queue/once.json'), null); checks++;
    const sha = await api.put('done/synthetic.json', { email: 'qa@example.invalid' });
    await assert.rejects(api.del('done/synthetic.json', 'stale'), /conflict/);
    await api.del('done/synthetic.json', sha);
    assert.equal(await api.get('done/synthetic.json'), null);
    assert.equal((await control.list({ prefix: 'locks/' })).blobs.length, 0); checks++;

    const { privateKey, publicKey } = generateKeyPairSync('ed25519');
    const handler = createHandler({ store, control, publicKey: publicKey.export({ format: 'der', type: 'spki' }).subarray(-32).toString('hex') });
    const request = payload => {
      const body = JSON.stringify({ ts: Date.now(), nonce: randomBytes(16).toString('hex'), ...payload });
      return new Request('https://chapbook.rqai.co.uk/.netlify/functions/fulfil-store', {
        method: 'POST', headers: { 'x-rqai-signature': sign(null, signingMessage(body), privateKey).toString('base64url') }, body,
      });
    };
    const first = request({ op: 'put', path: 'state/test.json', record: { synthetic: true } });
    const replay = first.clone();
    assert.equal((await handler(first)).status, 200);
    assert.equal((await handler(replay)).status, 409);
    assert.equal((await handler(new Request('https://invalid.example', { method: 'POST', body: '{}' }))).status, 401); checks++;
    await api.put('sandbox/state/test.json', { synthetic: true });
    const record = await (await handler(request({ op: 'get', path: 'state/test.json' }))).json();
    assert.equal((await handler(request({ op: 'del', path: 'state/test.json', sha: record.sha }))).status, 200);
    assert.equal(await api.get('state/test.json'), null);
    assert.deepEqual((await api.get('sandbox/state/test.json')).record, { synthetic: true }); checks++;

    // One non-personal marker deliberately survives preview restarts/deploys.
    // It is outside every live/sandbox service namespace and is never a licence.
    const checkpoint = makeStore('preview-probe-checkpoint');
    const previous = await checkpoint.get('durability.json');
    if (previous) assert.deepEqual(previous, { schema: 1, synthetic: true });
    else await checkpoint.setJSON('durability.json', { schema: 1, synthetic: true }, { onlyIfNew: true });
    assert.deepEqual(await checkpoint.get('durability.json'), { schema: 1, synthetic: true }); checks++;
    return { status: 'passed', checks, persistence: previous ? 'verified' : 'created' };
  } finally {
    // Bound to fresh random stores, including failure paths.
    for (const target of [store, control]) {
      for (const { key } of (await target.list()).blobs) await target.delete(key);
      assert.equal((await target.list()).blobs.length, 0);
    }
  }
}
