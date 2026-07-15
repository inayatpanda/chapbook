// Draft export / import — the pure serialiser behind Settings → Export / Import drafts.
//
// WHY: drafts + partner sessions + snapshots + the idea inbox live only in this browser's
// IndexedDB (seams/storage.js). Safari ITP eviction, private mode, or simply moving to a new
// machine means silent, permanent loss with no way out. Export writes a portable JSON of every
// local store; Import restores it on any browser/machine. This module owns the envelope shape
// and the (defensive) parse/validate — the impure IndexedDB read/write + file download live in
// the inline Settings handler, which calls serialiseDrafts() / parseDraftsFile() here.
//
// PORTABILITY: Chapbook-only (public product). Helm's owner tool doesn't ship this surface.
import { STORES as DRAFT_STORES } from '../seams/storage.js';

export { DRAFT_STORES };
export const DRAFTS_FORMAT = 'chapbook-drafts';
export const DRAFTS_VERSION = 1;

// Build the export envelope from a { store: records[] } map (one entry per DRAFT_STORES
// name). Only known stores are copied; each store defaults to [] so the shape is stable.
// `now` is injectable for deterministic tests.
export function serialiseDrafts(storesMap, { now = () => new Date().toISOString() } = {}) {
  const map = storesMap && typeof storesMap === 'object' ? storesMap : {};
  const stores = {};
  let count = 0;
  for (const s of DRAFT_STORES) {
    const arr = Array.isArray(map[s]) ? map[s] : [];
    stores[s] = arr;
    count += arr.length;
  }
  return { format: DRAFTS_FORMAT, version: DRAFTS_VERSION, exportedAt: now(), count, stores };
}

// Parse + validate an imported export (a JSON string or an already-parsed object).
// Returns { ok:true, stores, count } or { ok:false, error }. Defensive: only records that
// are objects with a string `id` survive (the IndexedDB stores are all keyed on `id`, so a
// record without one could never be put()), and only known store names are read — a hand-
// edited or unrelated file can't inject junk.
export function parseDraftsFile(input) {
  let obj = input;
  if (typeof input === 'string') {
    try { obj = JSON.parse(input); } catch { return { ok: false, error: 'That file is not valid JSON.' }; }
  }
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) {
    return { ok: false, error: 'That file is not a Chapbook drafts export.' };
  }
  if (obj.format !== DRAFTS_FORMAT) {
    return { ok: false, error: 'That file is not a Chapbook drafts export.' };
  }
  if (!obj.stores || typeof obj.stores !== 'object') {
    return { ok: false, error: 'That export has no drafts in it.' };
  }
  const stores = {};
  let count = 0;
  for (const s of DRAFT_STORES) {
    const raw = Array.isArray(obj.stores[s]) ? obj.stores[s] : [];
    const clean = raw.filter((r) => r && typeof r === 'object' && typeof r.id === 'string');
    stores[s] = clean;
    count += clean.length;
  }
  return { ok: true, stores, count };
}
