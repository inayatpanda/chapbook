import { test } from 'node:test';
import assert from 'node:assert/strict';
import { serialiseDrafts, parseDraftsFile, DRAFT_STORES, DRAFTS_FORMAT, DRAFTS_VERSION } from './draftsIo.js';

const fixedNow = () => '2026-07-15T00:00:00.000Z';

test('serialiseDrafts builds a stable, versioned envelope with every store', () => {
  const env = serialiseDrafts({ drafts: [{ id: 'd-1', text: 'hi' }], blockdrafts: [{ id: 'my-post', doc: {} }] }, { now: fixedNow });
  assert.equal(env.format, DRAFTS_FORMAT);
  assert.equal(env.version, DRAFTS_VERSION);
  assert.equal(env.exportedAt, '2026-07-15T00:00:00.000Z');
  assert.equal(env.count, 2);
  for (const s of DRAFT_STORES) assert.ok(Array.isArray(env.stores[s]), `store ${s} present`);
  assert.deepEqual(env.stores.drafts, [{ id: 'd-1', text: 'hi' }]);
  assert.deepEqual(env.stores.partner, []); // absent store defaults to []
});

test('serialiseDrafts tolerates missing / non-array input', () => {
  const env = serialiseDrafts(null, { now: fixedNow });
  assert.equal(env.count, 0);
  for (const s of DRAFT_STORES) assert.deepEqual(env.stores[s], []);
});

test('round-trips: serialise → parse preserves records and count', () => {
  const src = { drafts: [{ id: 'd-1', a: 1 }], blockdrafts: [{ id: 'slug-a', doc: {} }, { id: 'slug-b', doc: {} }], ideas: [{ id: 'i-1', text: 'x' }] };
  const env = serialiseDrafts(src, { now: fixedNow });
  const round = parseDraftsFile(JSON.stringify(env));
  assert.equal(round.ok, true);
  assert.equal(round.count, 4);
  assert.deepEqual(round.stores.blockdrafts, src.blockdrafts);
  assert.deepEqual(round.stores.ideas, src.ideas);
});

test('parseDraftsFile accepts an already-parsed object too', () => {
  const env = serialiseDrafts({ drafts: [{ id: 'd-1' }] }, { now: fixedNow });
  const r = parseDraftsFile(env);
  assert.equal(r.ok, true);
  assert.equal(r.count, 1);
});

test('parseDraftsFile drops records without a string id (unputtable)', () => {
  const bad = { format: DRAFTS_FORMAT, version: 1, stores: { drafts: [{ id: 'd-1' }, { text: 'no id' }, { id: 42 }, null, 'nope'] } };
  const r = parseDraftsFile(bad);
  assert.equal(r.ok, true);
  assert.equal(r.count, 1);
  assert.deepEqual(r.stores.drafts, [{ id: 'd-1' }]);
});

test('parseDraftsFile ignores unknown store names', () => {
  const r = parseDraftsFile({ format: DRAFTS_FORMAT, version: 1, stores: { drafts: [{ id: 'd-1' }], evil: [{ id: 'x' }] } });
  assert.equal(r.ok, true);
  assert.equal(r.count, 1);
  assert.equal('evil' in r.stores, false);
});

test('parseDraftsFile rejects invalid JSON', () => {
  const r = parseDraftsFile('{ not json ');
  assert.equal(r.ok, false);
  assert.match(r.error, /valid JSON/);
});

test('parseDraftsFile rejects a wrong-format / unrelated file', () => {
  assert.equal(parseDraftsFile('{}').ok, false);
  assert.equal(parseDraftsFile('[]').ok, false);
  assert.equal(parseDraftsFile('null').ok, false);
  assert.equal(parseDraftsFile(JSON.stringify({ format: 'something-else', stores: {} })).ok, false);
  assert.equal(parseDraftsFile(JSON.stringify({ format: DRAFTS_FORMAT })).ok, false); // no stores
});
