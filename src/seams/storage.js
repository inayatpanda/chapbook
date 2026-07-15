// Storage seam — drafts + Partner sessions + saved shapes. Browser → IndexedDB; tests/SSR → in-memory.
// Interface: get(store,id) put(store,obj) all(store) del(store,id). Objects use `id` as key.

// Exported so draft export/import (lib/draftsIo.js) and the app-reset enumerator share one
// source of truth for the store list — add a store here and both pick it up.
export const STORES = ['drafts', 'blockdrafts', 'partner', 'shapes', 'versions', 'ideas'];

export function memoryBackend() {
  const db = Object.fromEntries(STORES.map((s) => [s, new Map()]));
  return {
    async get(store, id) { return db[store].get(id) || null; },
    async put(store, obj) { db[store].set(obj.id, obj); return obj; },
    async all(store) { return [...db[store].values()]; },
    async del(store, id) { db[store].delete(id); },
    // In-memory: always openable, but NOT persisted across reloads — the UI warns on this.
    async probe() { return { ok: true, persistent: false }; },
  };
}

export function idbBackend(name = 'helm-studio') {
  const open = () => new Promise((res, rej) => {
    const r = indexedDB.open(name, 4); // v2 adds 'shapes'; v3 adds 'versions' (snapshots); v4 adds 'ideas' (inbox)
    r.onupgradeneeded = () => { const d = r.result; for (const s of STORES) if (!d.objectStoreNames.contains(s)) d.createObjectStore(s, { keyPath: 'id' }); };
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
  const tx = async (store, mode, fn) => {
    const d = await open();
    return new Promise((res, rej) => {
      const t = d.transaction(store, mode), os = t.objectStore(store), rq = fn(os);
      t.oncomplete = () => res(rq && rq.result);
      t.onerror = () => rej(t.error);
    });
  };
  return {
    get: (store, id) => tx(store, 'readonly', os => os.get(id)).then(v => v || null),
    put: (store, obj) => tx(store, 'readwrite', os => os.put(obj)).then(() => obj),
    all: (store) => tx(store, 'readonly', os => os.getAll()),
    del: (store, id) => tx(store, 'readwrite', os => os.delete(id)),
    // Health check: can we actually open the DB? Safari private mode / ITP eviction / a
    // storage-blocked browser make indexedDB.open() REJECT — otherwise silently, deep inside
    // the first draft read. probe() surfaces it so boot can warn instead of failing blank.
    async probe() { try { await open(); return { ok: true, persistent: true }; } catch (e) { return { ok: false, persistent: false, error: String((e && e.message) || e) }; } },
  };
}

export function makeStorage(backend) { return backend; }
export const storage = makeStorage(typeof indexedDB !== 'undefined' ? idbBackend() : memoryBackend());
