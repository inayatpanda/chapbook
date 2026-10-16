import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { randomBytes } from 'node:crypto';
import { database, mysqlStore } from '../hosting/mysql-store.mjs';
import { SERVICE_STORES, captureStores, sealSnapshot, openSnapshot, restoreSnapshot } from '../hosting/migration.mjs';
const config = JSON.parse(await readFile(process.env.CHAPBOOK_DB_TEST_CONFIG, 'utf8'));
assert.equal(config.host, '127.0.0.1'); assert.equal(config.database, 'chapbook_test');
Object.assign(process.env, { DB_HOST: config.host, DB_PORT: String(config.port), DB_USER: config.user, DB_PASSWORD: config.password, DB_NAME: config.database });
const pool = await database(); let ownsRecords = false;
try {
  const [existing] = await pool.execute('SELECT COUNT(*) AS n FROM chapbook_records WHERE store_name IN (?,?,?)', SERVICE_STORES);
  assert.equal(existing[0].n, 0, 'Rehearsal requires empty disposable service stores'); ownsRecords = true;
  const source = name => ({
    list: async () => ({ blobs: [{ key: name === 'rqai-fulfilment-v1' ? 'sandbox/state/synthetic.json' : 'synthetic.json', etag: 'original-etag' }] }),
    getWithMetadata: async () => ({ etag: 'original-etag', data: { synthetic: true, content: 'No customer data' }, metadata: {} }),
  });
  const captured = await captureStores(source), key = randomBytes(32);
  const snapshot = openSnapshot(sealSnapshot(captured, key), key);
  await assert.rejects(restoreSnapshot(pool, snapshot), /paused/);
  const first = await restoreSnapshot(pool, snapshot, { writersPaused: true });
  assert.equal(first.inserted, 3); assert.equal(first.digest, captured.digest);
  console.log('PASS encrypted snapshot restores every service namespace and reconciles its digest');
  const second = await restoreSnapshot(pool, snapshot, { writersPaused: true });
  assert.equal(second.inserted, 0); assert.equal(second.records, 3);
  console.log('PASS interrupted migration can be resumed without duplicate or overwritten records');
  await mysqlStore('metrics').setJSON('synthetic.json', { synthetic: true, changed: true });
  await assert.rejects(restoreSnapshot(pool, snapshot, { writersPaused: true }), /different data/);
  assert.equal((await mysqlStore('metrics').get('synthetic.json')).changed, true);
  console.log('PASS conflicting destination data is preserved and migration fails closed');
} finally {
  if (ownsRecords) await pool.execute('DELETE FROM chapbook_records WHERE store_name IN (?,?,?)', SERVICE_STORES);
  await pool.end();
}
