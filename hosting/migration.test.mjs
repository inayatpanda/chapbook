import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { captureStores, sealSnapshot, openSnapshot } from './migration.mjs';

function source({ change = false } = {}) {
  const counts = {};
  return name => ({
    list: async () => ({ blobs: name === 'metrics' ? [] : [{ key: 'state/synthetic.json', etag: change && counts[name] ? 'changed' : 'v1' }] }),
    getWithMetadata: async () => { counts[name] = 1; return { etag: 'v1', data: { synthetic: true }, metadata: {} }; },
  });
}
test('snapshot covers every service store and survives authenticated encryption', async () => {
  const snapshot = await captureStores(source());
  assert.equal(snapshot.records.length, 2);
  const key = randomBytes(32), sealed = sealSnapshot(snapshot, key);
  assert.equal(sealed.includes(Buffer.from('synthetic')), false);
  assert.deepEqual(openSnapshot(sealed, key), snapshot);
  assert.throws(() => openSnapshot(sealed, randomBytes(32)));
  const altered = JSON.parse(sealed); altered.data = Buffer.from('corrupted').toString('base64');
  assert.throws(() => openSnapshot(Buffer.from(JSON.stringify(altered)), key));
});
test('snapshot refuses a moving source instead of claiming a consistent copy', async () => {
  await assert.rejects(captureStores(source({ change: true })), /Source changed/);
});
