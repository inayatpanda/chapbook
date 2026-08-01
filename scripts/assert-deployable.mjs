#!/usr/bin/env node
// Refuse to deploy a test-keyed build.
//
// A test build (CHAPBOOK_TEST_BUILD=1) bakes a throwaway licence key so the E2E can get past
// the activation gate. Deploying that would break activation for every real buyer: their
// valid licences would fail signature verification against a key nobody holds.
//
// In practice `npm run check` rebuilds dist/ from scratch before any deploy, which clears the
// marker — this is the belt-and-braces that catches a deploy run against a stale dist/.
// Also asserts the PRODUCTION key is actually the one baked in, so this fails even if the
// marker file were deleted by hand.
import { existsSync, readFileSync } from 'node:fs';
import { PUBLIC_KEY as PRODUCTION_KEY } from '../src/lib/licence-pubkey.js';

const APP_HTML = 'dist/app/index.html';
const fail = (m) => { console.error(`\nDEPLOY BLOCKED: ${m}\n`); process.exit(1); };

if (existsSync('dist/TEST-BUILD')) {
  fail('dist/ carries the TEST-BUILD marker — it was built with a throwaway licence key.\n'
     + 'Run `npm run build` (without CHAPBOOK_TEST_BUILD) before deploying.');
}

if (!existsSync(APP_HTML)) fail(`${APP_HTML} is missing — run \`npm run build\` first.`);

const m = readFileSync(APP_HTML, 'utf8').match(/window\.__LICENCE_PUBLIC_KEY='([^']*)';/);
if (!m) fail(`no window.__LICENCE_PUBLIC_KEY found in ${APP_HTML}.`);
if (m[1] !== PRODUCTION_KEY) {
  fail(`${APP_HTML} is baked with a NON-PRODUCTION licence key (${m[1].slice(0, 16)}…).\n`
     + 'Every real licence would fail to activate. Rebuild without CHAPBOOK_TEST_BUILD=1.');
}

console.log('deployable ✓ — production licence key baked, no test-build marker');
