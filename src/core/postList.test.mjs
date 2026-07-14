// Run:  node --test studio-app/core/postList.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { removeBySlug, isAlreadyDeleted } from './postList.js';

const sample = () => ([
  { slug: 'a', title: 'Alpha' },
  { slug: 'b', title: 'Bravo' },
  { slug: 'c', title: 'Charlie' },
]);

test('removeBySlug drops the matching post and returns a new array', () => {
  const posts = sample();
  const out = removeBySlug(posts, 'b');
  assert.deepEqual(out.map((p) => p.slug), ['a', 'c']);
  // original untouched (no mutation)
  assert.deepEqual(posts.map((p) => p.slug), ['a', 'b', 'c']);
  assert.notEqual(out, posts);
});

test('removeBySlug is a no-op (copy) when the slug is absent', () => {
  const posts = sample();
  const out = removeBySlug(posts, 'zzz');
  assert.deepEqual(out.map((p) => p.slug), ['a', 'b', 'c']);
  assert.notEqual(out, posts);
});

test('removeBySlug tolerates a non-array and stray null entries', () => {
  assert.deepEqual(removeBySlug(null, 'a'), []);
  assert.deepEqual(removeBySlug(undefined, 'a'), []);
  const out = removeBySlug([{ slug: 'a' }, null, { slug: 'b' }], 'a');
  assert.deepEqual(out.map((p) => p.slug), ['b']);
});

test('isAlreadyDeleted true for a 404 status (numeric or string)', () => {
  assert.equal(isAlreadyDeleted({ status: 404 }), true);
  assert.equal(isAlreadyDeleted({ status: '404' }), true);
});

test('isAlreadyDeleted true for a "not found" message/detail', () => {
  assert.equal(isAlreadyDeleted(new Error('not found')), true);
  assert.equal(isAlreadyDeleted({ status: 500, detail: 'Post not found' }), true);
  assert.equal(isAlreadyDeleted({ message: 'Already deleted' }), true);
});

test('isAlreadyDeleted false for other failures and empties', () => {
  assert.equal(isAlreadyDeleted(null), false);
  assert.equal(isAlreadyDeleted(undefined), false);
  assert.equal(isAlreadyDeleted({ status: 500, message: 'server blew up' }), false);
  assert.equal(isAlreadyDeleted({ status: 409, message: 'conflict' }), false);
  assert.equal(isAlreadyDeleted(new Error('network down')), false);
});
