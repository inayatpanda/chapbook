// Offline migration primitives. Nothing here is served by the HTTP application.
// Operators must pause all source writers and leave the destination in preview.
import { createHash, randomUUID, randomBytes, createCipheriv, createDecipheriv } from 'node:crypto';
export const SERVICE_STORES = ['metrics', 'rqai-fulfilment-v1', 'rqai-fulfilment-control-v1'];
const canonical = value => JSON.stringify(value, function (key, item) {
  return item && typeof item === 'object' && !Array.isArray(item)
    ? Object.fromEntries(Object.keys(item).sort().map(k => [k, item[k]])) : item;
});
const digest = value => createHash('sha256').update(canonical(value)).digest('hex');
const listing = async store => (await store.list()).blobs.map(({ key, etag }) => ({ key, etag })).sort((a, b) => a.key.localeCompare(b.key));

export async function captureStores(open) {
  const before = new Map();
  for (const name of SERVICE_STORES) before.set(name, await listing(open(name)));
  const records = [];
  for (const name of SERVICE_STORES) {
    const store = open(name);
    for (const item of before.get(name)) {
      const found = await store.getWithMetadata(item.key, { type: 'json', consistency: 'strong' });
      if (!found || found.etag !== item.etag) throw Error('Source changed during snapshot; pause writers and retry');
      if (Object.keys(found.metadata || {}).length) throw Error('Unsupported source metadata; migration requires review');
      records.push({ store: name, key: item.key, value: found.data });
    }
  }
  for (const name of SERVICE_STORES) {
    if (canonical(await listing(open(name))) !== canonical(before.get(name))) throw Error('Source changed during snapshot; pause writers and retry');
  }
  const snapshot = { schema: 1, capturedAt: new Date().toISOString(), records, digest: digest(records) };
  validateSnapshot(snapshot);
  return snapshot;
}

export function validateSnapshot(snapshot) {
  if (snapshot?.schema !== 1 || !Array.isArray(snapshot.records) || !Number.isFinite(Date.parse(snapshot.capturedAt)) || snapshot.digest !== digest(snapshot.records)) throw Error('Invalid migration snapshot');
  const seen = new Set();
  for (const item of snapshot.records) {
    if (!SERVICE_STORES.includes(item.store) || typeof item.key !== 'string' || !/^[A-Za-z0-9_./-]{1,255}$/.test(item.key)) throw Error('Invalid migration record');
    const id = item.store + '\n' + item.key;
    if (seen.has(id)) throw Error('Duplicate migration record');
    seen.add(id);
    if (Buffer.byteLength(JSON.stringify(item.value)) > 2_000_000) throw Error('Migration record too large');
  }
}

export function sealSnapshot(snapshot, key) {
  validateSnapshot(snapshot);
  if (!Buffer.isBuffer(key) || key.length !== 32) throw Error('Migration key must be 32 bytes');
  const iv = randomBytes(12), cipher = createCipheriv('aes-256-gcm', key, iv);
  cipher.setAAD(Buffer.from('chapbook-migration-v1'));
  const data = Buffer.concat([cipher.update(JSON.stringify(snapshot)), cipher.final()]);
  return Buffer.from(JSON.stringify({ schema: 1, iv: iv.toString('base64'), tag: cipher.getAuthTag().toString('base64'), data: data.toString('base64') }));
}

export function openSnapshot(envelope, key) {
  if (envelope.length > 100_000_000 || !Buffer.isBuffer(key) || key.length !== 32) throw Error('Invalid migration envelope');
  const value = JSON.parse(envelope.toString('utf8'));
  if (value.schema !== 1) throw Error('Invalid migration envelope');
  const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(value.iv, 'base64'));
  decipher.setAAD(Buffer.from('chapbook-migration-v1'));
  decipher.setAuthTag(Buffer.from(value.tag, 'base64'));
  const snapshot = JSON.parse(Buffer.concat([decipher.update(Buffer.from(value.data, 'base64')), decipher.final()]).toString('utf8'));
  validateSnapshot(snapshot);
  return snapshot;
}

export async function restoreSnapshot(pool, snapshot, { writersPaused = false } = {}) {
  if (!writersPaused) throw Error('Restore requires paused source writers and a preview-only destination');
  validateSnapshot(snapshot);
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [existing] = await connection.execute('SELECT store_name, record_key, payload FROM chapbook_records WHERE store_name IN (?,?,?) FOR UPDATE', SERVICE_STORES);
    const expected = new Map(snapshot.records.map(item => [item.store + '\n' + item.key, item]));
    for (const row of existing) {
      const item = expected.get(row.store_name + '\n' + row.record_key);
      if (!item || canonical(item.value) !== canonical(JSON.parse(row.payload))) throw Error('Destination contains different data; no records overwritten');
    }
    const present = new Set(existing.map(row => row.store_name + '\n' + row.record_key));
    for (const item of snapshot.records) {
      if (!present.has(item.store + '\n' + item.key)) {
        await connection.execute('INSERT INTO chapbook_records (store_name,record_key,payload,etag) VALUES (?,?,?,?)', [item.store, item.key, JSON.stringify(item.value), randomUUID()]);
      }
    }
    const [saved] = await connection.execute('SELECT store_name, record_key, payload FROM chapbook_records WHERE store_name IN (?,?,?)', SERVICE_STORES);
    if (saved.length !== snapshot.records.length || saved.some(row => canonical(expected.get(row.store_name + '\n' + row.record_key)?.value) !== canonical(JSON.parse(row.payload)))) throw Error('Restored data did not reconcile');
    await connection.commit();
    return { records: saved.length, inserted: saved.length - existing.length, digest: snapshot.digest };
  } catch (error) { await connection.rollback(); throw error; }
  finally { connection.release(); }
}
