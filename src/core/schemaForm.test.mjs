import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getVal, setVal, schemaDefault, deepMerge, coerceParams } from './schemaForm.js';

// ── The "reading 'accent'" crash guard ──────────────────────────────────────
// Regression: renderSchemaForm() handed an UNDEFINED params object (because a
// family's schema was malformed and schemaDefault() returned undefined) caused
// getVal(undefined, 'accent', …) to throw
//   "Cannot read properties of undefined (reading 'accent')".
// getVal MUST never read a property off a nullish parent.

test("getVal does NOT throw when parent is undefined (the 'accent' crash)", () => {
  const schema = { type: 'string', title: 'Back-face accent (hex)', default: '#22d3ee' };
  let v;
  assert.doesNotThrow(() => { v = getVal(undefined, 'accent', schema); });
  assert.equal(v, '#22d3ee'); // falls back to the schema default
});

test('getVal returns undefined for a nullish parent with no schema default', () => {
  assert.equal(getVal(undefined, 'accent', { type: 'string' }), undefined);
  assert.equal(getVal(null, 'columns', undefined), undefined);
});

test('getVal still reads a real value off a present parent', () => {
  assert.equal(getVal({ accent: '#818cf8' }, 'accent', { default: '#22d3ee' }), '#818cf8');
});

test('getVal applies schema default only when the value is undefined', () => {
  assert.equal(getVal({}, 'accent', { default: '#22d3ee' }), '#22d3ee');
  assert.equal(getVal({ accent: '' }, 'accent', { default: '#22d3ee' }), ''); // explicit empty kept
});

test('getVal with key==null returns the parent itself (top-level primitive)', () => {
  assert.equal(getVal('#fff', null, {}), '#fff');
  assert.equal(getVal(undefined, null, {}), undefined);
});

test('setVal is a no-op on a nullish parent (no throw)', () => {
  assert.doesNotThrow(() => setVal(undefined, 'accent', '#fff'));
  assert.doesNotThrow(() => setVal(null, 'accent', '#fff'));
});

test('setVal writes and deletes on a real parent', () => {
  const p = { accent: '#000' };
  setVal(p, 'accent', '#22d3ee');
  assert.equal(p.accent, '#22d3ee');
  setVal(p, 'accent', undefined);
  assert.equal('accent' in p, false);
});

// ── schemaDefault: the source of the undefined params ────────────────────────
test('schemaDefault returns undefined for a missing/malformed schema', () => {
  assert.equal(schemaDefault(undefined), undefined);
  assert.equal(schemaDefault(null), undefined);
  assert.equal(schemaDefault('nope'), undefined);
  assert.equal(schemaDefault({ type: 'whatever' }), undefined); // unknown type, no default
});

test('schemaDefault builds an object with per-property defaults', () => {
  const d = schemaDefault({ type: 'object', properties: {
    title: { type: 'string' },
    accent: { type: 'string', default: '#22d3ee' },
    columns: { type: 'integer', default: 2 },
  } });
  assert.deepEqual(d, { title: '', accent: '#22d3ee', columns: 2 });
});

// ── coerceParams: the entry-point guard ──────────────────────────────────────
test('coerceParams returns the params object when it is a usable object', () => {
  const p = { accent: '#fff' };
  assert.equal(coerceParams({ type: 'object' }, p), p); // same reference (mutable binding kept)
});

test('coerceParams seeds an object from the schema when params is undefined', () => {
  const schema = { type: 'object', properties: { accent: { type: 'string', default: '#22d3ee' } } };
  const out = coerceParams(schema, undefined);
  assert.equal(typeof out, 'object');
  assert.equal(out.accent, '#22d3ee');
});

test('coerceParams falls back to {} for a malformed schema + nullish params', () => {
  assert.deepEqual(coerceParams(undefined, undefined), {});
  assert.deepEqual(coerceParams({ type: 'bogus' }, null), {});
});

test('coerce+getVal together never throw on the flashcards-style schema', () => {
  // A figure family whose schema carries an `accent` field, with NO usable
  // default → schemaDefault() is undefined → params would be undefined.
  const schema = { type: 'object', properties: {
    title: { type: 'string' },
    accent: { type: 'string', title: 'Back-face accent (hex)' },
  } };
  // Simulate the buggy assignment: params = schemaDefault(malformedWrapper)
  const params = coerceParams(schema, schemaDefault(undefined)); // i.e. coerce(undefined)
  assert.doesNotThrow(() => {
    for (const key of Object.keys(schema.properties)) {
      getVal(params, key, schema.properties[key]);
    }
  });
});

// ── deepMerge sanity (unchanged behaviour, pinned) ───────────────────────────
test('deepMerge overlays objects and replaces arrays/scalars', () => {
  assert.deepEqual(deepMerge({ a: 1, b: { x: 1 } }, { b: { y: 2 }, c: 3 }), { a: 1, b: { x: 1, y: 2 }, c: 3 });
  assert.deepEqual(deepMerge({ list: [1, 2] }, { list: [3] }), { list: [3] });
  assert.equal(deepMerge('a', undefined), 'a'); // undefined overlay keeps base
});
