import { test } from 'node:test';
import assert from 'node:assert/strict';
import { chapbookKeys, CHAPBOOK_LS_PREFIXES, CHAPBOOK_IDB_NAME, deleteDatabaseAndWait } from './appReset.js';

// The full set of localStorage keys Chapbook is known to write (grepped from src/). If a
// new key is added under a NEW prefix, this test should fail until the prefix list covers
// it — that's the point: "Forget this device" must leave nothing behind.
const ALL_CHAPBOOK_KEYS = [
  'helm.studio.config.v1',
  'helm.studio.licence',
  'helm.studio.revoked',
  'helm.studio.onboarded',
  'helm.studio.gettingStarted.dismissed',
  'helm.studio.figDraw.autosave.v1',
  'helm.studio.savedLibrary.v1',
  'helm-theme',
  'helm-theme-v2',
  'helm-partner-last',
  'helmTplRecents',
  'studio.postsView',
  'chapbook.pinged.activate',
  'chapbook.pinged.install',
];

test('chapbookKeys keeps every known Chapbook key', () => {
  const kept = chapbookKeys(ALL_CHAPBOOK_KEYS);
  assert.deepEqual(kept.sort(), [...ALL_CHAPBOOK_KEYS].sort());
});

test('chapbookKeys leaves foreign keys untouched', () => {
  const mixed = [
    'helm.studio.config.v1',      // ours
    'chapbook.pinged.activate',   // ours
    'some-other-app.session',     // foreign
    'sb-access-token',            // foreign
    'theme',                      // foreign (no chapbook prefix)
    'helmet-config',              // foreign — must NOT match a bare "helm" catch-all
  ];
  assert.deepEqual(chapbookKeys(mixed), ['helm.studio.config.v1', 'chapbook.pinged.activate']);
});

test('chapbookKeys is total: bad input never throws', () => {
  assert.deepEqual(chapbookKeys(null), []);
  assert.deepEqual(chapbookKeys(undefined), []);
  assert.deepEqual(chapbookKeys('helm.studio.x'), []);
  assert.deepEqual(chapbookKeys([null, 42, undefined, 'chapbook.pinged.install']), ['chapbook.pinged.install']);
});

test('every known Chapbook key is covered by exactly the declared prefixes', () => {
  for (const k of ALL_CHAPBOOK_KEYS) {
    assert.ok(CHAPBOOK_LS_PREFIXES.some((p) => k.startsWith(p)), `no prefix covers ${k}`);
  }
});

test('IDB name matches the storage seam database', () => {
  assert.equal(CHAPBOOK_IDB_NAME, 'helm-studio');
});

// ── deleteDatabaseAndWait: the awaited "Forget this device" IDB wipe ─────────
// The inline reset used to fire deleteDatabase() and reload() immediately, so a
// blocked or still-racing delete could leave drafts/threads alive after "reset".
// This helper resolves 'deleted' | 'blocked' | 'error' | 'timeout' so the caller
// can await the wipe (and warn instead of reloading when another tab blocks it).

// A minimal fake of indexedDB.deleteDatabase whose request fires `event` async.
const fakeIdb = (event) => ({
  deleteDatabase() {
    const req = {};
    setTimeout(() => { if (typeof req[event] === 'function') req[event](); }, 0);
    return req;
  },
});

test('deleteDatabaseAndWait resolves "deleted" on success', async () => {
  assert.equal(await deleteDatabaseAndWait(fakeIdb('onsuccess'), 'db'), 'deleted');
});

test('deleteDatabaseAndWait resolves "blocked" when another tab holds the DB', async () => {
  assert.equal(await deleteDatabaseAndWait(fakeIdb('onblocked'), 'db'), 'blocked');
});

test('deleteDatabaseAndWait resolves "error" on a failed delete', async () => {
  assert.equal(await deleteDatabaseAndWait(fakeIdb('onerror'), 'db'), 'error');
});

test('deleteDatabaseAndWait resolves "timeout" when nothing ever fires', async () => {
  assert.equal(await deleteDatabaseAndWait(fakeIdb('never'), 'db', { timeoutMs: 20 }), 'timeout');
});

test('deleteDatabaseAndWait resolves "error" when deleteDatabase itself throws', async () => {
  const throwing = { deleteDatabase() { throw new Error('nope'); } };
  assert.equal(await deleteDatabaseAndWait(throwing, 'db'), 'error');
});

test('deleteDatabaseAndWait settles once: a late second event cannot re-resolve', async () => {
  // onblocked fires first, then onsuccess later (the real sequence when the other
  // tab closes) — the promise must have settled on 'blocked'.
  const idb = {
    deleteDatabase() {
      const req = {};
      setTimeout(() => { req.onblocked && req.onblocked(); }, 0);
      setTimeout(() => { req.onsuccess && req.onsuccess(); }, 10);
      return req;
    },
  };
  assert.equal(await deleteDatabaseAndWait(idb, 'db'), 'blocked');
  await new Promise((r) => setTimeout(r, 20)); // let the late event fire — nothing to assert but no crash
});
