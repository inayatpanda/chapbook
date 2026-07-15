import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  SAVED_LIBRARY_KEY,
  isValidSavedItem,
  normaliseList,
  makeSavedItem,
  addItem,
  removeItem,
  listItems,
  findItem,
  serialise,
  deserialise,
  blockDataFor,
} from './savedLibrary.js';

const figData = { svg: '<svg/>', alt: 'a', caption: '', animation: 'none', placement: 'default' };
const ixData = { domId: 'pg-1', html: '<p>hi</p>', css: '', js: '', placement: 'standard' };

test('versioned storage key is stable + namespaced', () => {
  assert.equal(SAVED_LIBRARY_KEY, 'helm.studio.savedLibrary.v1');
});

test('makeSavedItem builds a valid item with the documented shape', () => {
  const it = makeSavedItem({ kind: 'figure', name: '  Glenoid  ', data: figData, preview: '<svg/>' });
  assert.equal(it.kind, 'figure');
  assert.equal(it.name, 'Glenoid');            // trimmed
  assert.equal(typeof it.id, 'string');
  assert.ok(it.id.length > 0);
  assert.equal(typeof it.createdAt, 'number');
  assert.equal(it.preview, '<svg/>');
  assert.deepEqual(it.data, figData);          // round-trips the block data
  assert.ok(isValidSavedItem(it));
});

test('makeSavedItem clones data so later edits do not mutate the saved record', () => {
  const live = { svg: '<svg/>', alt: 'x', placement: 'default' };
  const it = makeSavedItem({ kind: 'figure', name: 'F', data: live });
  live.alt = 'CHANGED';
  assert.equal(it.data.alt, 'x');              // saved copy is independent
});

test('makeSavedItem falls back to a default name when blank', () => {
  assert.equal(makeSavedItem({ kind: 'figure', name: '   ', data: figData }).name, 'Untitled figure');
  assert.equal(makeSavedItem({ kind: 'interactive', name: '', data: ixData }).name, 'Untitled interactive');
});

test('makeSavedItem rejects bad kind / missing data', () => {
  assert.throws(() => makeSavedItem({ kind: 'nope', name: 'x', data: figData }), /invalid kind/);
  assert.throws(() => makeSavedItem({ kind: 'figure', name: 'x', data: null }), /data must be an object/);
});

test('makeSavedItem drops a non-string / empty preview', () => {
  assert.equal('preview' in makeSavedItem({ kind: 'figure', name: 'x', data: figData }), false);
  assert.equal('preview' in makeSavedItem({ kind: 'figure', name: 'x', data: figData, preview: '' }), false);
  assert.equal('preview' in makeSavedItem({ kind: 'figure', name: 'x', data: figData, preview: 42 }), false);
});

test('isValidSavedItem flags structurally-broken records', () => {
  const good = makeSavedItem({ kind: 'figure', name: 'F', data: figData });
  assert.ok(isValidSavedItem(good));
  assert.ok(!isValidSavedItem(null));
  assert.ok(!isValidSavedItem({ ...good, id: '' }));
  assert.ok(!isValidSavedItem({ ...good, kind: 'video' }));
  assert.ok(!isValidSavedItem({ ...good, createdAt: 'soon' }));
  assert.ok(!isValidSavedItem({ ...good, data: null }));
});

test('normaliseList drops invalid records + non-arrays', () => {
  const good = makeSavedItem({ kind: 'figure', name: 'F', data: figData });
  assert.deepEqual(normaliseList([good, null, { id: 'x' }, 5]), [good]);
  assert.deepEqual(normaliseList('not an array'), []);
  assert.deepEqual(normaliseList(undefined), []);
});

test('addItem adds newest-first and never mutates the input', () => {
  const a = makeSavedItem({ kind: 'figure', name: 'A', data: figData, createdAt: 1 });
  const b = makeSavedItem({ kind: 'interactive', name: 'B', data: ixData, createdAt: 2 });
  const list1 = addItem([], a);
  const list2 = addItem(list1, b);
  assert.deepEqual(list1, [a]);                 // unchanged after second add
  assert.deepEqual(list2.map((x) => x.name), ['B', 'A']);
});

test('addItem de-dupes by id (re-save replaces)', () => {
  const a = makeSavedItem({ kind: 'figure', name: 'A', data: figData });
  const a2 = { ...a, name: 'A renamed' };
  const out = addItem(addItem([], a), a2);
  assert.equal(out.length, 1);
  assert.equal(out[0].name, 'A renamed');
});

test('addItem de-dupes by kind+name+data even with a different id', () => {
  const a = makeSavedItem({ kind: 'figure', name: 'Same', data: figData });
  const b = makeSavedItem({ kind: 'figure', name: 'Same', data: figData });  // different id, identical content
  assert.notEqual(a.id, b.id);
  const out = addItem(addItem([], a), b);
  assert.equal(out.length, 1);
  assert.equal(out[0].id, b.id);                // newest wins
});

test('addItem treats key-order-different data as identical (stable signature)', () => {
  const a = makeSavedItem({ kind: 'interactive', name: 'X', data: { html: '<p/>', js: '', css: '' } });
  const b = makeSavedItem({ kind: 'interactive', name: 'X', data: { css: '', js: '', html: '<p/>' } });
  const out = addItem(addItem([], a), b);
  assert.equal(out.length, 1);
});

test('addItem rejects an invalid item', () => {
  assert.throws(() => addItem([], { id: 'x' }), /invalid item/);
});

test('removeItem removes by id and returns a new array', () => {
  const a = makeSavedItem({ kind: 'figure', name: 'A', data: figData });
  const b = makeSavedItem({ kind: 'interactive', name: 'B', data: ixData });
  const list = addItem(addItem([], a), b);
  const after = removeItem(list, a.id);
  assert.deepEqual(after.map((x) => x.name), ['B']);
  assert.equal(list.length, 2);                 // original untouched
});

test('listItems sorts newest-first and filters by kind + query', () => {
  const f1 = makeSavedItem({ kind: 'figure', name: 'Glenoid arc', data: figData, createdAt: 10 });
  const f2 = makeSavedItem({ kind: 'figure', name: 'Humerus', data: { ...figData, alt: 'h' }, createdAt: 30 });
  const i1 = makeSavedItem({ kind: 'interactive', name: 'Angle slider', data: ixData, createdAt: 20 });
  const list = [f1, i1, f2];
  assert.deepEqual(listItems(list).map((x) => x.name), ['Humerus', 'Angle slider', 'Glenoid arc']);
  assert.deepEqual(listItems(list, { kind: 'figure' }).map((x) => x.name), ['Humerus', 'Glenoid arc']);
  assert.deepEqual(listItems(list, { query: 'glen' }).map((x) => x.name), ['Glenoid arc']);
  assert.deepEqual(listItems(list, { kind: 'figure', query: 'hum' }).map((x) => x.name), ['Humerus']);
});

test('findItem returns the item or null', () => {
  const a = makeSavedItem({ kind: 'figure', name: 'A', data: figData });
  const list = addItem([], a);
  assert.deepEqual(findItem(list, a.id), a);
  assert.equal(findItem(list, 'missing'), null);
});

test('serialise / deserialise round-trips the list cleanly', () => {
  const a = makeSavedItem({ kind: 'figure', name: 'A', data: figData });
  const b = makeSavedItem({ kind: 'interactive', name: 'B', data: ixData, preview: 'Angle slider' });
  const list = addItem(addItem([], a), b);
  const round = deserialise(serialise(list));
  assert.deepEqual(round, list);
});

test('deserialise tolerates junk / bad JSON', () => {
  assert.deepEqual(deserialise(''), []);
  assert.deepEqual(deserialise('not json'), []);
  assert.deepEqual(deserialise('{"a":1}'), []);   // object, not array → []
  assert.deepEqual(deserialise(null), []);
});

test('blockDataFor returns a clone of the saved data (new block id minted by caller)', () => {
  const it = makeSavedItem({ kind: 'interactive', name: 'X', data: ixData });
  const d = blockDataFor(it);
  assert.deepEqual(d, ixData);
  d.html = 'mutated';
  assert.equal(it.data.html, ixData.html);        // original untouched
  assert.equal(blockDataFor({ bad: true }), null);
});
