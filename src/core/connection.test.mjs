import { test } from 'node:test';
import assert from 'node:assert/strict';
import { blogUrl, isNetworkError, isDeadToken } from './connection.js';

// --- blogUrl: build the public GitHub Pages project URL ---
test('blogUrl builds owner.github.io/<repo>/ with a trailing slash', () => {
  assert.equal(blogUrl({ owner: 'jane', repo: 'bone-deep' }), 'https://jane.github.io/bone-deep/');
});
test('blogUrl lowercases the owner (github.io hostnames are lowercased)', () => {
  assert.equal(blogUrl({ owner: 'JaneDoe', repo: 'my-blog' }), 'https://janedoe.github.io/my-blog/');
});
test('blogUrl encodes the repo path segment', () => {
  assert.equal(blogUrl({ owner: 'jane', repo: 'a b' }), 'https://jane.github.io/a%20b/');
});
test('blogUrl trims surrounding whitespace', () => {
  assert.equal(blogUrl({ owner: '  jane  ', repo: '  blog  ' }), 'https://jane.github.io/blog/');
});
test('blogUrl returns empty when owner or repo is missing', () => {
  assert.equal(blogUrl({ owner: '', repo: 'blog' }), '');
  assert.equal(blogUrl({ owner: 'jane', repo: '' }), '');
  assert.equal(blogUrl({}), '');
  assert.equal(blogUrl(), '');
});

// --- isNetworkError: fetch/transport failure vs an HTTP response ---
test('isNetworkError true for a fetch TypeError', () => {
  assert.equal(isNetworkError(Object.assign(new TypeError('Failed to fetch'))), true);
});
test('isNetworkError true for common offline messages', () => {
  assert.equal(isNetworkError({ message: 'NetworkError when attempting to fetch resource' }), true);
  assert.equal(isNetworkError({ message: 'Load failed' }), true);
});
test('isNetworkError false when there is an HTTP status (we reached GitHub)', () => {
  assert.equal(isNetworkError({ status: 401, message: 'Bad credentials' }), false);
  assert.equal(isNetworkError({ status: 500, name: 'TypeError' }), false); // status wins
});
test('isNetworkError false for null/empty', () => {
  assert.equal(isNetworkError(null), false);
  assert.equal(isNetworkError({}), false);
});

// --- isDeadToken: only expired/revoked/bad-credentials should force a reconnect ---
test('isDeadToken true for a 401', () => {
  assert.equal(isDeadToken({ status: 401, message: 'Bad credentials' }), true);
});
test('isDeadToken true for a bad-credentials message without a status', () => {
  assert.equal(isDeadToken({ message: 'Bad credentials' }), true);
  assert.equal(isDeadToken({ message: 'Requires authentication' }), true);
});
test('isDeadToken false for a 403 rate-limit (transient, not dead)', () => {
  assert.equal(isDeadToken({ status: 403, message: 'API rate limit exceeded' }), false);
  assert.equal(isDeadToken({ status: 403, message: 'You have exceeded a secondary rate limit' }), false);
});
test('isDeadToken false for a network error (offline, valid token)', () => {
  assert.equal(isDeadToken(new TypeError('Failed to fetch')), false);
});
test('isDeadToken false for a 5xx (transient server error)', () => {
  assert.equal(isDeadToken({ status: 500, message: 'Server Error' }), false);
  assert.equal(isDeadToken({ status: 503 }), false);
});
test('isDeadToken false for null/undefined', () => {
  assert.equal(isDeadToken(null), false);
  assert.equal(isDeadToken(undefined), false);
});
