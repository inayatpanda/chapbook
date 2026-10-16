// Hostinger's deploy directory is replaceable. Durable records belong in MySQL,
// using the same conditional-write contract as the existing private store.
import mysql from 'mysql2/promise';
import { randomUUID } from 'node:crypto';

let ready;
export function databaseConfigured(env = process.env) {
  return ['DB_HOST', 'DB_NAME', 'DB_USER', 'DB_PASSWORD'].every(key => !!env[key]);
}
export async function database() {
  if (!databaseConfigured()) throw new Error('Private database is not configured');
  if (!ready) ready = (async () => {
    const pool = mysql.createPool({ host: process.env.DB_HOST, port: Number(process.env.DB_PORT || 3306),
      database: process.env.DB_NAME, user: process.env.DB_USER, password: process.env.DB_PASSWORD,
      connectionLimit: 4, connectTimeout: 10000, charset: 'utf8mb4',
      ...(process.env.DB_TLS === '1' ? { ssl: { rejectUnauthorized: true } } : {}) });
    try {
      await pool.execute(`CREATE TABLE IF NOT EXISTS chapbook_records (
        store_name VARCHAR(80) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
        record_key VARCHAR(255) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
        payload MEDIUMTEXT NOT NULL, etag CHAR(36) CHARACTER SET ascii NOT NULL,
        PRIMARY KEY (store_name, record_key)
      ) ENGINE=InnoDB`);
      return pool;
    } catch (e) { await pool.end(); throw e; }
  })().catch(e => { ready = undefined; throw e; });
  return ready;
}

export function mysqlStore(name, getDatabase = database) {
  if (!/^[a-z0-9-]{1,80}$/.test(name)) throw new Error('Invalid store');
  const validKey = key => {
    if (typeof key !== 'string' || key.length > 255 || !/^[A-Za-z0-9_./-]+$/.test(key)) throw new Error('Invalid record key');
  };
  const read = async key => {
    validKey(key);
    const db = await getDatabase();
    const [rows] = await db.execute('SELECT payload, etag FROM chapbook_records WHERE store_name=? AND record_key=?', [name, key]);
    return rows[0] ? { data: JSON.parse(rows[0].payload), etag: rows[0].etag } : null;
  };
  return {
    async get(key) { return (await read(key))?.data ?? null; },
    getWithMetadata: read,
    async getMetadata(key) { const r = await read(key); return r ? { etag: r.etag } : null; },
    async setJSON(key, value, options = {}) {
      validKey(key);
      const payload = JSON.stringify(value), etag = randomUUID();
      if (Buffer.byteLength(payload) > 2_000_000) throw new Error('Record too large');
      const db = await getDatabase();
      let result;
      if (options.onlyIfNew) {
        try { [result] = await db.execute('INSERT INTO chapbook_records (store_name,record_key,payload,etag) VALUES (?,?,?,?)', [name, key, payload, etag]); }
        catch (e) { if (e.code === 'ER_DUP_ENTRY') return { modified: false }; throw e; }
      } else if (options.onlyIfMatch) {
        [result] = await db.execute('UPDATE chapbook_records SET payload=?, etag=? WHERE store_name=? AND record_key=? AND etag=?', [payload, etag, name, key, options.onlyIfMatch]);
      } else {
        [result] = await db.execute('INSERT INTO chapbook_records (store_name,record_key,payload,etag) VALUES (?,?,?,?) ON DUPLICATE KEY UPDATE payload=VALUES(payload), etag=VALUES(etag)', [name, key, payload, etag]);
      }
      return { modified: result.affectedRows > 0, etag };
    },
    async delete(key) {
      validKey(key);
      await (await getDatabase()).execute('DELETE FROM chapbook_records WHERE store_name=? AND record_key=?', [name, key]);
    },
    async list({ prefix = '' } = {}) {
      if (prefix) validKey(prefix);
      // Prefix matching by binary range avoids SQL LIKE wildcard interpretation.
      const [rows] = await (await getDatabase()).execute('SELECT record_key, etag FROM chapbook_records WHERE store_name=? AND record_key>=? AND record_key<? ORDER BY record_key', [name, prefix, prefix + '\x7f']);
      return { blobs: rows.map(row => ({ key: row.record_key, etag: row.etag })) };
    },
  };
}
