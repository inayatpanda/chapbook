// Pure revocation-decision tests (touchpoint 2). The network/crypto/cache glue is
// inline in src/index.html's gate and mirrors these predicates; this pins the logic.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isRevoked, shouldReplaceCache } from './revocation.js';

// ── isRevoked ─────────────────────────────────────────────────────────────────

test('isRevoked: jti present in the list → true', () => {
  assert.equal(isRevoked('jti-abc', ['jti-xyz', 'jti-abc', 'jti-123']), true);
});

test('isRevoked: jti absent from the list → false', () => {
  assert.equal(isRevoked('jti-abc', ['jti-xyz', 'jti-123']), false);
});

test('isRevoked: empty list → false', () => {
  assert.equal(isRevoked('jti-abc', []), false);
});

test('isRevoked: malformed list (not an array) → false (fails open)', () => {
  assert.equal(isRevoked('jti-abc', null), false);
  assert.equal(isRevoked('jti-abc', undefined), false);
  assert.equal(isRevoked('jti-abc', 'jti-abc'), false); // string, not array
  assert.equal(isRevoked('jti-abc', { 'jti-abc': true }), false);
});

test('isRevoked: falsy id (legacy key without jti) → false, never revoked', () => {
  assert.equal(isRevoked(undefined, ['jti-abc']), false);
  assert.equal(isRevoked(null, ['jti-abc']), false);
  assert.equal(isRevoked('', ['']), false); // empty id must never match
});

// ── shouldReplaceCache ────────────────────────────────────────────────────────

const fetched = (extra = {}) => ({ ok: true, updated: '2026-07-10T00:00:00Z', revoked: ['jti-1'], ...extra });

test('shouldReplaceCache: valid, signature-valid, no prior cache → true (first fetch)', () => {
  assert.equal(shouldReplaceCache(null, fetched(), true), true);
});

test('shouldReplaceCache: signature INVALID → false (no cache poisoning, fails open)', () => {
  assert.equal(shouldReplaceCache(null, fetched(), false), false);
  assert.equal(shouldReplaceCache({ updated: '2026-07-01T00:00:00Z' }, fetched(), false), false);
});

test('shouldReplaceCache: fetched newer than cache → true', () => {
  const cached = { updated: '2026-07-01T00:00:00Z', revoked: [] };
  assert.equal(shouldReplaceCache(cached, fetched({ updated: '2026-07-10T00:00:00Z' }), true), true);
});

test('shouldReplaceCache: fetched OLDER than cache → false (monotonic, no un-revoke)', () => {
  const cached = { updated: '2026-07-10T00:00:00Z', revoked: ['jti-1'] };
  assert.equal(shouldReplaceCache(cached, fetched({ updated: '2026-07-01T00:00:00Z' }), true), false);
});

test('shouldReplaceCache: equal timestamps → true (>=)', () => {
  const cached = { updated: '2026-07-10T00:00:00Z', revoked: [] };
  assert.equal(shouldReplaceCache(cached, fetched({ updated: '2026-07-10T00:00:00Z' }), true), true);
});

test('shouldReplaceCache: cache present but without an `updated` field → true (accept)', () => {
  assert.equal(shouldReplaceCache({ revoked: [] }, fetched(), true), true);
});

test('shouldReplaceCache: fetched.revoked is not an array → false', () => {
  assert.equal(shouldReplaceCache(null, fetched({ revoked: 'jti-1' }), true), false);
  assert.equal(shouldReplaceCache(null, fetched({ revoked: undefined }), true), false);
});

test('shouldReplaceCache: unparseable fetched token (ok:false) → false', () => {
  assert.equal(shouldReplaceCache(null, { ok: false }, true), false);
  assert.equal(shouldReplaceCache(null, null, true), false);
});

test('shouldReplaceCache: fetched has no `updated` but cache does → false (undated cannot supersede)', () => {
  const cached = { updated: '2026-07-10T00:00:00Z', revoked: ['jti-1'] };
  assert.equal(shouldReplaceCache(cached, fetched({ updated: undefined }), true), false);
});
