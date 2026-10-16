import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { randomBytes } from 'node:crypto';
import { database, mysqlStore } from '../hosting/mysql-store.mjs';
import { SERVICE_STORES, captureStores, sealSnapshot, openSnapshot, restoreSnapshot } from '../hosting/migration.mjs';
const hosted = process.env.CHAPBOOK_HOSTED_QA === '1';
const config = hosted ? { host:process.env.DB_HOST, port:Number(process.env.DB_PORT||3306), user:process.env.DB_USER, password:process.env.DB_PASSWORD, database:process.env.DB_NAME } : JSON.parse(await readFile(process.env.CHAPBOOK_DB_TEST_CONFIG, 'utf8'));
if(hosted){assert.ok(process.env.CHAPBOOK_DB_TEST_NAME);assert.equal(config.database,process.env.CHAPBOOK_DB_TEST_NAME);}
else{assert.equal(config.host, '127.0.0.1');assert.equal(config.database, 'chapbook_test');}
Object.assign(process.env, { DB_HOST: config.host, DB_PORT: String(config.port), DB_USER: config.user, DB_PASSWORD: config.password, DB_NAME: config.database });
const realPool = await database();
// A fresh SQL table isolates even the production-shaped namespace names. The
// rehearsal cannot read, replace or delete the application's actual records.
const table = 'chapbook_rehearsal_' + randomBytes(10).toString('hex');
await realPool.execute(`CREATE TABLE ${table} LIKE chapbook_records`);
const sql = statement => statement.replaceAll('chapbook_records',table);
const pool = {
  execute:(statement,args)=>realPool.execute(sql(statement),args),
  async getConnection(){
    const connection=await realPool.getConnection();
    return {execute:(statement,args)=>connection.execute(sql(statement),args),beginTransaction:()=>connection.beginTransaction(),commit:()=>connection.commit(),rollback:()=>connection.rollback(),release:()=>connection.release()};
  },
};
let ownsRecords = false;
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
  const metrics=mysqlStore('metrics',async()=>pool);
  await metrics.setJSON('synthetic.json', { synthetic: true, changed: true });
  await assert.rejects(restoreSnapshot(pool, snapshot, { writersPaused: true }), /different data/);
  assert.equal((await metrics.get('synthetic.json')).changed, true);
  console.log('PASS conflicting destination data is preserved and migration fails closed');
} finally {
  if (ownsRecords) await pool.execute('DELETE FROM chapbook_records WHERE store_name IN (?,?,?)', SERVICE_STORES);
  await realPool.execute(`DROP TABLE ${table}`);
  await realPool.end();
}
