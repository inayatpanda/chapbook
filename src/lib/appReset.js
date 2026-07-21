// App-reset helpers — the pure enumerator behind Settings → "Forget this device".
//
// Chapbook is local-first: every secret and every unpublished draft the buyer has lives
// only in THIS browser (localStorage + IndexedDB). "Forget this device" wipes all of it so
// a shared/borrowed machine is left clean. This module is the (unit-tested) list of what
// counts as "Chapbook's" localStorage — the inline Settings handler enumerates the live
// localStorage keys through chapbookKeys() and removes each, then deletes the IndexedDB DB.
//
// PORTABILITY: Chapbook-only. Helm's owner tool has no shared-device / forget concern.

// Every localStorage namespace Chapbook writes to. Anything matching one of these prefixes
// is ours to clear. Kept explicit (not a bare "helm" catch-all) so the intent is legible:
//   helm.studio.*  — config.v1, licence, revoked, onboarded, gettingStarted.dismissed,
//                     figDraw.autosave.v1, savedLibrary.v1
//   helm-*         — helm-theme, helm-theme-v2, helm-partner-last
//   helmTpl*       — helmTplRecents (template picker recents)
//   studio.*       — studio.postsView
//   chapbook.*     — chapbook.pinged.activate / .install (metric once-flags)
export const CHAPBOOK_LS_PREFIXES = Object.freeze([
  'helm.studio.',
  'helm-',
  'helmTpl',
  'studio.',
  'chapbook.',
]);

// The IndexedDB database name the storage seam opens (see seams/storage.js idbBackend()).
// "Forget this device" deletes this whole database (drafts, blockdrafts, partner sessions,
// saved shapes, version snapshots, idea inbox).
export const CHAPBOOK_IDB_NAME = 'helm-studio';

// Given a snapshot of localStorage keys (e.g. Object.keys(localStorage)), return only the
// ones Chapbook owns. Pure + total: ignores non-string entries, never throws.
export function chapbookKeys(allKeys) {
  if (!Array.isArray(allKeys)) return [];
  return allKeys.filter(
    (k) => typeof k === 'string' && CHAPBOOK_LS_PREFIXES.some((p) => k.startsWith(p)),
  );
}

// Await an IndexedDB database delete instead of fire-and-forget. The inline reset used
// to call deleteDatabase() and location.reload() back to back, so a blocked delete
// (another Chapbook tab holding the DB open) or a still-racing one could leave drafts
// and threads alive after "Forget this device". Resolves one of:
//   'deleted' — the DB is gone; safe to reload.
//   'blocked' — another open tab holds the DB; the caller should tell the user to
//               close other Chapbook tabs and retry rather than reload half-wiped.
//   'error'   — the delete failed (or deleteDatabase itself threw).
//   'timeout' — no event within timeoutMs; the caller may proceed as a fallback.
// Never rejects. `idb` is injectable (window.indexedDB in the app; a fake in tests).
// Decision table for the inline "Forget this device" flow AFTER deleteDatabaseAndWait
// settles. ORDER MATTERS in the caller: the IDB delete runs FIRST and localStorage is
// only touched according to this plan — the old flow cleared the secrets up front, so a
// 'blocked' delete left an INCONSISTENT partial wipe (secrets gone, drafts alive) and
// the retry no longer started from a clean state.
//   'blocked'          → wipe NOTHING: another tab holds the DB open; tell the user to
//                        close other Chapbook tabs and retry — untouched state retries
//                        cleanly.
//   'deleted'          → the clean path: clear the secrets, reload to the gate.
//   'timeout'/'error'  → the delete is unconfirmed. TRADE-OFF: "forget this device" is
//     (and unknowns)     first a SECURITY action, so clearing the token/keys/licence
//                        wins over a perfectly consistent wipe — clear them, warn that
//                        some local content may remain, and still reload (a stuck
//                        delete must not trap the user on a shared machine).
export function resetOutcomePlan(outcome) {
  if (outcome === 'blocked') return { clearSecrets: false, reload: false, warnPartial: false };
  if (outcome === 'deleted') return { clearSecrets: true, reload: true, warnPartial: false };
  return { clearSecrets: true, reload: true, warnPartial: true };
}

export function deleteDatabaseAndWait(idb, name, { timeoutMs = 4000 } = {}) {
  return new Promise((resolve) => {
    let settled = false;
    let timer = null;
    const settle = (outcome) => {
      if (settled) return;
      settled = true;
      if (timer !== null) clearTimeout(timer);
      resolve(outcome);
    };
    timer = setTimeout(() => settle('timeout'), timeoutMs);
    let req;
    try { req = idb.deleteDatabase(name); } catch { settle('error'); return; }
    if (!req || typeof req !== 'object') { settle('error'); return; }
    req.onsuccess = () => settle('deleted');
    req.onerror = () => settle('error');
    req.onblocked = () => settle('blocked');
  });
}
