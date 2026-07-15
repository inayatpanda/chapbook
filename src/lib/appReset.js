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
