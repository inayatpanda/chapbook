// Unit tests for the SW cache-version derivation (scripts/sw-cache-name.mjs).
//
// WHY: dist/sw.js's CACHE name used to be a hand-bumped literal ('chapbook-v8');
// forgetting the bump meant an installed worker kept serving the OLD shell
// (/studio.js, /app/index.html, …) on any network failure. build.mjs now derives
// the name from a content hash of the built shell assets, so EVERY shell change
// auto-invalidates and identical builds stay byte-deterministic.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  SW_CACHE_RE, cacheNameFor, readShellPaths, shellDistFile, withCacheName,
} from './scripts/sw-cache-name.mjs';
import { readCacheName } from './scripts/release-gate.mjs';

const entries = [
  { path: '/app/index.html', bytes: Buffer.from('<!doctype html>app') },
  { path: '/studio.js', bytes: Buffer.from('export const x=1;') },
  { path: '/manifest.json', bytes: Buffer.from('{"name":"Chapbook"}') },
];

test('cacheNameFor: matches the chapbook-<8 hex> scheme', () => {
  assert.match(cacheNameFor(entries), SW_CACHE_RE);
});

test('cacheNameFor: deterministic — same inputs give the same name', () => {
  assert.equal(cacheNameFor(entries), cacheNameFor(entries.map((e) => ({ ...e }))));
});

test('cacheNameFor: order-insensitive — entry order does not change the name', () => {
  assert.equal(cacheNameFor(entries), cacheNameFor([...entries].reverse()));
});

test('cacheNameFor: changes when any shell asset\'s BYTES change', () => {
  const mutated = entries.map((e) =>
    e.path === '/studio.js' ? { ...e, bytes: Buffer.from('export const x=2;') } : e);
  assert.notEqual(cacheNameFor(entries), cacheNameFor(mutated));
});

test('cacheNameFor: changes when a shell PATH changes (add/rename)', () => {
  const extra = [...entries, { path: '/preview.css', bytes: Buffer.from('body{}') }];
  assert.notEqual(cacheNameFor(entries), cacheNameFor(extra));
});

const FIXTURE =
  "const CACHE = 'chapbook-dev'; // build.mjs stamps the content hash\n" +
  "const SHELL = ['/app', '/app/index.html', '/studio.js'];\n";

test('readShellPaths: parses the SHELL array from sw.js text', () => {
  assert.deepEqual(readShellPaths(FIXTURE), ['/app', '/app/index.html', '/studio.js']);
});

test('readShellPaths: throws when there is no SHELL array', () => {
  assert.throws(() => readShellPaths('const CACHE = "x";'), /SHELL/);
});

test('shellDistFile: maps the bare /app route to the app document', () => {
  assert.equal(shellDistFile('/app'), '/app/index.html');
  assert.equal(shellDistFile('/studio.js'), '/studio.js');
});

test('withCacheName: stamps the derived name where the placeholder was', () => {
  const name = cacheNameFor(entries);
  const out = withCacheName(FIXTURE, name);
  assert.ok(out.includes(`const CACHE = '${name}'`), 'literal replaced');
  assert.ok(!out.includes('chapbook-dev'), 'placeholder gone');
});

test('withCacheName: throws when the CACHE literal is missing', () => {
  assert.throws(() => withCacheName('const NOPE = 1;', 'chapbook-00000000'), /CACHE/);
});

test('round trip: the release gate\'s readCacheName parses the stamped name', () => {
  const name = cacheNameFor(entries);
  assert.equal(readCacheName(withCacheName(FIXTURE, name)), name);
  assert.match(readCacheName(withCacheName(FIXTURE, name)), SW_CACHE_RE);
});
