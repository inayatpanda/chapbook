import { test } from 'node:test';
import assert from 'node:assert';
import { bump } from '../../netlify/functions/metrics.mjs';

test('bump on undefined seeds the counter at 1', () => {
  assert.deepEqual(bump(undefined, 'install'), { install: 1 });
});

test('bump increments an existing counter', () => {
  assert.deepEqual(bump({ install: 2 }, 'install'), { install: 3 });
});

test('bump rejects an unknown type (returns null)', () => {
  assert.equal(bump({}, 'weird'), null);
});

test('bump accepts every allowed type', () => {
  assert.deepEqual(bump(undefined, 'activate'), { activate: 1 });
  assert.deepEqual(bump(undefined, 'visit'), { visit: 1 });
});

test('bump preserves sibling counters', () => {
  assert.deepEqual(bump({ activate: 5, install: 1 }, 'install'), { activate: 5, install: 2 });
});

test('bump does not mutate the input object', () => {
  const current = { install: 2 };
  const next = bump(current, 'install');
  assert.deepEqual(current, { install: 2 }); // untouched
  assert.notStrictEqual(next, current); // fresh object
});

test('bump tolerates a null/non-object current', () => {
  assert.deepEqual(bump(null, 'activate'), { activate: 1 });
  assert.deepEqual(bump('nonsense', 'activate'), { activate: 1 });
});
