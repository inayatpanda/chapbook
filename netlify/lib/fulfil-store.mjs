// Personal fulfilment records live in a deletable site store, never a public URL.
// One region is explicit on every open; compute/worker locations are disclosed separately.
import { openStore } from './storage-provider.mjs';
import { createHash, randomUUID } from 'node:crypto';

export const STORE_REGION = 'eu-central-1';
export const openFulfilStore = () => openStore('rqai-fulfilment-v1');
export const openControlStore = () => openStore('rqai-fulfilment-control-v1');
export function validPath(path, { directory = false } = {}) {
  if (typeof path !== 'string' || path.length > 240 || !/^(?:sandbox\/)?(?:queue|done|state|privacy)(?:\/|$)/.test(path)) return false;
  if (path.split('/').some(part => !part || part === '.' || part === '..' || !/^[A-Za-z0-9_.-]+$/.test(part))) return false;
  return directory || path.endsWith('.json');
}
export function conflict() { const e = new Error('Storage conflict; retry from the latest record'); e.status = 409; return e; }

// Serialise queue creation and deletion too: Blobs has conditional writes, but
// not conditional DELETE. All writers use this lease around a short operation.
export async function withRecordLock(control, path, operation, { now = Date.now } = {}) {
  const key = 'locks/' + createHash('sha256').update(path).digest('hex');
  const old = await control.getWithMetadata(key, { type: 'json' });
  if (old && old.data.until > now()) throw conflict();
  const owner = randomUUID();
  const lock = await control.setJSON(key, { owner, until: now() + 120_000 }, old ? { onlyIfMatch: old.etag } : { onlyIfNew: true });
  if (!lock.modified) throw conflict();
  try { return await operation(); }
  finally {
    const current = await control.getWithMetadata(key, { type: 'json' });
    if (current?.data.owner === owner) await control.delete(key);
  }
}
export function privateStoreAdapter(store, control) {
  return {
    async get(path) {
      const value = await store.getWithMetadata(path, { type: 'json' });
      return value ? { record: value.data, sha: value.etag } : null;
    },
    async list(path) {
      const { blobs } = await store.list({ prefix: path + '/' });
      return blobs.filter(b => !b.key.slice(path.length + 1).includes('/')).map(b => ({ path: b.key, name: b.key.split('/').pop(), sha: b.etag }));
    },
    async put(path, record, message, sha) {
      return withRecordLock(control, path, async () => {
        const saved = await store.setJSON(path, record, sha ? { onlyIfMatch: sha } : { onlyIfNew: true });
        if (!saved.modified) throw conflict();
        return saved.etag;
      });
    },
    async del(path, sha) {
      if (!sha) throw conflict();
      return withRecordLock(control, path, async () => {
        const current = await store.getMetadata(path);
        if (!current) return;
        if (current.etag !== sha) throw conflict();
        await store.delete(path);
      });
    },
  };
}
