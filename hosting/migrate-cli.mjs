// Operator-only CLI; never mounted as an HTTP route.
import { readFile, writeFile } from 'node:fs/promises';
import { randomBytes } from 'node:crypto';
import { getStore, listStores } from '@netlify/blobs';
import { database } from './mysql-store.mjs';
import { SERVICE_STORES, captureStores, sealSnapshot, openSnapshot, restoreSnapshot } from './migration.mjs';

async function main() {
  const [action, file, keyFile, acknowledgement] = process.argv.slice(2);
  if (!['snapshot', 'restore'].includes(action) || !file || !keyFile || acknowledgement !== '--writers-paused') {
    throw Error('Usage: node hosting/migrate-cli.mjs snapshot|restore <encrypted-file> <key-file> --writers-paused');
  }
  if (action === 'snapshot') {
    const siteID = process.env.CHAPBOOK_MIGRATION_SOURCE_SITE_ID, token = process.env.NETLIFY_AUTH_TOKEN;
    if (!/^[a-f0-9-]{36}$/.test(siteID || '') || !token) throw Error('Explicit source site and Netlify token are required');
    // Netlify lists regional and default stores separately. Check both and
    // refuse a known name in an unexpected region rather than silently omit it.
    for (const region of [null,'eu-central-1']) {
      const inventory = await listStores({ siteID, token, ...(region ? { region } : {}) });
      const expected = region ? SERVICE_STORES.filter(name=>name!=='metrics') : ['metrics'];
      if (inventory.stores.some(name => !expected.includes(name))) throw Error('Unreviewed source stores exist; inspect the inventory before migration');
    }
    const snapshot = await captureStores(name => getStore({ name, siteID, token, consistency: 'strong', ...(name === 'metrics' ? {} : { region: 'eu-central-1' }) }));
    const key = randomBytes(32);
    // Both files must be new. Key stays separate from the encrypted snapshot.
    await writeFile(keyFile, key, { mode: 0o600, flag: 'wx' });
    await writeFile(file, sealSnapshot(snapshot, key), { mode: 0o600, flag: 'wx' });
    console.log(JSON.stringify({ action, records: snapshot.records.length, digest: snapshot.digest }));
  } else {
    if (process.env.CHAPBOOK_PREVIEW !== '1') throw Error('Restore requires CHAPBOOK_PREVIEW=1');
    const snapshot = openSnapshot(await readFile(file), await readFile(keyFile));
    const pool = await database();
    try { console.log(JSON.stringify({ action, ...await restoreSnapshot(pool, snapshot, { writersPaused: true }) })); }
    finally { await pool.end(); }
  }
}
main().catch(error => {
  // Database/provider errors may contain private connection or record details.
  const safe = /^(Usage:|Explicit source|Unreviewed source|Source changed|Unsupported source|Invalid migration|Migration |Duplicate migration|Restore requires|Destination contains|Restored data)/.test(error.message || '');
  console.error(safe ? error.message : 'Migration failed; no customer data or credentials were logged. Inspect configuration and retry safely.');
  process.exitCode = 1;
});
