// Unit tests for the release-gate's pure sw.js parsers (readShell, readCacheName).
//
// These functions extract the SHELL array + CACHE name from dist/sw.js so the gate
// can (1) probe every shell URL for 200 and (2) assert the live cache version in a
// real browser. If a future sw.js edit changes the declaration shape (e.g. `let`
// instead of `const`, or a differently-quoted literal) the parser would silently
// stop matching and the gate would go blind. These tests pin the parse contract.
//
// The parsers accept an optional `swText` argument precisely so they are testable
// without touching the filesystem; we drive them with fixture strings AND assert
// they still parse the REAL dist/sw.js correctly (when present) so the current
// artifact's contract cannot silently rot.
//
//   node --test release-gate.test.mjs

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { readShell, readCacheName, isAppFinalPath, samePathModuloTrailingSlash } from './scripts/release-gate.mjs';

const FIXTURE = `// service worker fixture
const CACHE = 'chapbook-v8';
const SHELL = [
  '/app', '/app/index.html', '/manifest.json', '/studio.js',
  '/fonts/inter-400.woff2',
];
self.addEventListener('install', () => {});
`;

test('readCacheName extracts the CACHE literal from fixture text', () => {
  assert.equal(readCacheName(FIXTURE), 'chapbook-v8');
});

test('readCacheName tolerates double quotes and extra whitespace', () => {
  assert.equal(readCacheName('const   CACHE =  "chapbook-v9"'), 'chapbook-v9');
});

test('readCacheName throws when no CACHE declaration is present', () => {
  assert.throws(() => readCacheName('const NOPE = 1;'), /CACHE name not found/);
});

test('readShell extracts every quoted path from the SHELL array', () => {
  const shell = readShell(FIXTURE);
  assert.deepEqual(shell, ['/app', '/app/index.html', '/manifest.json', '/studio.js', '/fonts/inter-400.woff2']);
});

test('readShell throws when the SHELL array is absent', () => {
  assert.throws(() => readShell('const CACHE = "x";'), /SHELL array not found/);
});

test('readShell throws on an empty SHELL array', () => {
  assert.throws(() => readShell('const SHELL = [ ]'), /SHELL array is empty/);
});

// ── final-URL decision logic on the redirect-following /app probes ───────────
// check1 and check12 FOLLOW redirects for the /app probes (Netlify canonicalises
// the bare /app directory to /app/ before serving 200). Following redirects means
// a regression that bounces /app → / (the marketing home — ALSO a 200 text/html
// response) would otherwise still PASS. These pin the final-URL guards that fail it.

test('isAppFinalPath accepts the app doc\'s canonical landing forms', () => {
  assert.equal(isAppFinalPath('/app'), true);
  assert.equal(isAppFinalPath('/app/'), true);          // Netlify directory canonicalisation
  assert.equal(isAppFinalPath('/app/index.html'), true);
});

test('isAppFinalPath rejects a redirect that bounces away from the app', () => {
  assert.equal(isAppFinalPath('/'), false);             // the marketing-home regression this guards
  assert.equal(isAppFinalPath('/pricing'), false);
  assert.equal(isAppFinalPath('/appendix'), false);     // exact match only — must not prefix-match /app
});

test('samePathModuloTrailingSlash: an identical final path passes', () => {
  assert.equal(samePathModuloTrailingSlash('/app', '/app'), true);
  assert.equal(samePathModuloTrailingSlash('/app/index.html', '/app/index.html'), true);
  assert.equal(samePathModuloTrailingSlash('/manifest.json', '/manifest.json'), true);
});

test('samePathModuloTrailingSlash: trailing-slash canonicalisation passes', () => {
  assert.equal(samePathModuloTrailingSlash('/app', '/app/'), true);  // /app → /app/ (Netlify)
  assert.equal(samePathModuloTrailingSlash('/app/', '/app'), true);  // symmetric
});

test('samePathModuloTrailingSlash: a redirect to a different path fails', () => {
  assert.equal(samePathModuloTrailingSlash('/app', '/'), false);           // /app → marketing home
  assert.equal(samePathModuloTrailingSlash('/app', '/index.html'), false);
  assert.equal(samePathModuloTrailingSlash('/app/index.html', '/'), false);
});

// Contract test against the REAL built artifact (skips cleanly if dist/ absent).
test('parsers match the current dist/sw.js contract (v8 + /app shell)', (t) => {
  if (!existsSync('dist/sw.js')) { t.skip('dist/sw.js not built — run `npm run build`'); return; }
  const sw = readFileSync('dist/sw.js', 'utf8');
  assert.equal(readCacheName(sw), 'chapbook-v8', 'dist cache should be chapbook-v8 after the /app migration');
  const shell = readShell(sw);
  assert.ok(shell.includes('/app') && shell.includes('/app/index.html'), 'shell must precache the /app doc');
  assert.ok(!shell.includes('/') && !shell.includes('/index.html'),
    'shell must not precache the marketing root as the app shell');
});
