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

// DoS caps for import. A hand-edited or malicious "export" is an unbounded
// JSON.parse plus unbounded IndexedDB writes without these; each is checked
// BEFORE any parse/write happens. Injectable per-call for tests; the Settings
// importer (index.html) also pre-checks file.size against MAX_IMPORT_BYTES so
// an oversize file is refused before it is even read into memory.
export const MAX_IMPORT_BYTES = 25 * 1024 * 1024;   // the whole file
export const MAX_IMPORT_RECORDS = 5000;             // total records across stores
export const MAX_RECORD_BYTES = 2 * 1024 * 1024;    // any single record, serialised

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
export function parseDraftsFile(input, {
  maxBytes = MAX_IMPORT_BYTES,
  maxRecords = MAX_IMPORT_RECORDS,
  maxRecordBytes = MAX_RECORD_BYTES,
} = {}) {
  let obj = input;
  if (typeof input === 'string') {
    if (input.length > maxBytes) {
      return { ok: false, error: 'That file is too big to import. Export smaller batches and import them one at a time.' };
    }
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
    for (const r of clean) {
      let size = 0;
      try { size = JSON.stringify(r).length; } catch { size = Infinity; } // unserialisable = unputtable
      if (size > maxRecordBytes) {
        return { ok: false, error: 'That export contains an item that is too big to import.' };
      }
    }
    stores[s] = clean;
    count += clean.length;
    if (count > maxRecords) {
      return { ok: false, error: `That export has too many items to import (the limit is ${maxRecords}).` };
    }
  }
  return { ok: true, stores, count };
}
