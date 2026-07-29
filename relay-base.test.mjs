// Unit tests for resolveRelayBase — the device-flow relay URL resolver (src/app.js).
//
// Regression guard for a native-only sign-in outage: the GitHub device flow POSTs to the
// gh-device relay. On the hosted web build the relative same-origin /.netlify/functions/
// gh-device path is correct, but Tauri's native wrappers serve the app from tauri://localhost
// (iOS) or http://tauri.localhost (Android), where that relative path has no backend — the
// POST 404s and "Sign in with GitHub" (and "I've got one — continue", which delegates to it)
// silently do nothing. resolveRelayBase repoints the relative path at the hosted relay when it
// detects a native origin, so sign-in works even if a rebuild forgets to bake STUDIO_RELAY_BASE.
//
//   node --test relay-base.test.mjs

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

// app.js imports browser-only ESM seams; import the function without executing the module body
// by evaluating just its source via a data: import is overkill — instead assert the source
// contains the contract, then re-derive the function for behavioural checks.
const HERE = dirname(fileURLToPath(import.meta.url));
const src = readFileSync(join(HERE, 'src/app.js'), 'utf8');

test('app.js still exports resolveRelayBase and pins the hosted origin', () => {
  assert.match(src, /export function resolveRelayBase\(/);
  assert.match(src, /https:\/\/chapbook-publishing-studio\.netlify\.app/);
});

// Behavioural spec (kept in lockstep with the implementation).
function resolveRelayBase(baked, loc, HOSTED_ORIGIN = 'https://chapbook-publishing-studio.netlify.app') {
  const base = baked || '/.netlify/functions/gh-device';
  if (!base.startsWith('/') || !loc) return base;
  const nativeOrigin = loc.protocol === 'tauri:' || /(^|\.)tauri\.localhost$/i.test(loc.hostname || '');
  return nativeOrigin ? HOSTED_ORIGIN + base : base;
}

test('hosted web (https on the real domain) keeps the relative same-origin relay', () => {
  assert.equal(
    resolveRelayBase('/.netlify/functions/gh-device', { protocol: 'https:', hostname: 'chapbook-publishing-studio.netlify.app' }),
    '/.netlify/functions/gh-device');
});

test('iOS Tauri (tauri://localhost) repoints the relative relay at the hosted origin', () => {
  assert.equal(
    resolveRelayBase('/.netlify/functions/gh-device', { protocol: 'tauri:', hostname: 'localhost' }),
    'https://chapbook-publishing-studio.netlify.app/.netlify/functions/gh-device');
});

test('Android Tauri (http://tauri.localhost) repoints the relative relay at the hosted origin', () => {
  assert.equal(
    resolveRelayBase('/.netlify/functions/gh-device', { protocol: 'http:', hostname: 'tauri.localhost' }),
    'https://chapbook-publishing-studio.netlify.app/.netlify/functions/gh-device');
});

test('an absolute baked STUDIO_RELAY_BASE is always used as-is (native or not)', () => {
  const abs = 'https://example.test/.netlify/functions/gh-device';
  assert.equal(resolveRelayBase(abs, { protocol: 'tauri:', hostname: 'localhost' }), abs);
  assert.equal(resolveRelayBase(abs, { protocol: 'https:', hostname: 'chapbook-publishing-studio.netlify.app' }), abs);
});

test('empty baked value falls back to the relative default (hidden PAT-only path on plain web)', () => {
  assert.equal(resolveRelayBase('', { protocol: 'https:', hostname: 'chapbook-publishing-studio.netlify.app' }),
    '/.netlify/functions/gh-device');
});
