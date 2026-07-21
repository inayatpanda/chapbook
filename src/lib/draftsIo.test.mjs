import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  serialiseDrafts, parseDraftsFile, DRAFT_STORES, DRAFTS_FORMAT, DRAFTS_VERSION,
  MAX_IMPORT_BYTES, MAX_IMPORT_RECORDS, MAX_RECORD_BYTES,
} from './draftsIo.js';

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

// ── DoS caps: a malicious/corrupt file must be rejected BEFORE JSON.parse can
// exhaust memory or the import can flood IndexedDB. Limits are injectable for
// tests; the exported defaults are what the Settings importer uses.
test('caps: sane exported defaults (25 MB file, 5000 records, 2 MB per record)', () => {
  assert.equal(MAX_IMPORT_BYTES, 25 * 1024 * 1024);
  assert.equal(MAX_IMPORT_RECORDS, 5000);
  assert.equal(MAX_RECORD_BYTES, 2 * 1024 * 1024);
});

test('caps: an oversize file string is rejected before parsing', () => {
  const r = parseDraftsFile('x'.repeat(200), { maxBytes: 100 });
  assert.equal(r.ok, false);
  assert.match(r.error, /too big to import/i);
});

test('caps: too many total records across stores are rejected', () => {
  const env = serialiseDrafts({
    drafts: [{ id: 'a' }, { id: 'b' }],
    ideas: [{ id: 'c' }, { id: 'd' }],
  }, { now: fixedNow });
  const r = parseDraftsFile(JSON.stringify(env), { maxRecords: 3 });
  assert.equal(r.ok, false);
  assert.match(r.error, /too many items/i);
  assert.match(r.error, /3/, 'error names the limit');
});

test('caps: a single oversize record is rejected', () => {
  const env = serialiseDrafts({ drafts: [{ id: 'a', body: 'y'.repeat(500) }] }, { now: fixedNow });
  const r = parseDraftsFile(JSON.stringify(env), { maxRecordBytes: 100 });
  assert.equal(r.ok, false);
  assert.match(r.error, /too big to import/i);
});

test('caps: a normal export round-trips unchanged under the default limits', () => {
  const src = { drafts: [{ id: 'd-1', body: 'hello' }], ideas: [{ id: 'i-1', text: 'x' }] };
  const env = serialiseDrafts(src, { now: fixedNow });
  const r = parseDraftsFile(JSON.stringify(env));
  assert.equal(r.ok, true);
  assert.equal(r.count, 2);
  assert.deepEqual(r.stores.drafts, src.drafts);
  assert.deepEqual(r.stores.ideas, src.ideas);
});

test('caps: error strings are friendly and carry no em-dash', () => {
  const tooBig = parseDraftsFile('x'.repeat(200), { maxBytes: 100 });
  const tooMany = parseDraftsFile(
    JSON.stringify(serialiseDrafts({ drafts: [{ id: 'a' }, { id: 'b' }] }, { now: fixedNow })),
    { maxRecords: 1 });
  for (const r of [tooBig, tooMany]) {
    assert.equal(r.ok, false);
    assert.ok(!r.error.includes('—'), 'no em-dash in user-facing error');
  }
});
