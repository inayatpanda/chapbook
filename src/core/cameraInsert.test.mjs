import { test } from 'node:test';
import assert from 'node:assert/strict';
import { afterBlockFor } from './cameraInsert.js';

const blocks = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];

test('a selected block → insert after THAT block', () => {
  assert.deepEqual(afterBlockFor(blocks, 'a'), { id: 'a' });
  assert.deepEqual(afterBlockFor(blocks, 'b'), { id: 'b' });
});

test('no selection → insert after the LAST block (append)', () => {
  assert.deepEqual(afterBlockFor(blocks, null), { id: 'c' });
  assert.deepEqual(afterBlockFor(blocks, undefined), { id: 'c' });
  assert.deepEqual(afterBlockFor(blocks, ''), { id: 'c' });
});

test('a selected id that no longer exists → falls back to the last block', () => {
  assert.deepEqual(afterBlockFor(blocks, 'gone'), { id: 'c' });
});

test('an empty post → null (append; bulkAddImageBlocks then targets the end)', () => {
  assert.equal(afterBlockFor([], 'a'), null);
  assert.equal(afterBlockFor([], null), null);
});

test('non-array input is treated as empty → null', () => {
  assert.equal(afterBlockFor(null, 'a'), null);
  assert.equal(afterBlockFor(undefined, null), null);
});

test('a non-string selection id → append to the end', () => {
  assert.deepEqual(afterBlockFor(blocks, 42), { id: 'c' });
  assert.deepEqual(afterBlockFor(blocks, {}), { id: 'c' });
});
