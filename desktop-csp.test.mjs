// Regression guard for a SILENT, on-device-only onboarding bug (native bundle-local builds).
//
// The Studio injects <style> elements at RUNTIME — the theme-picker swatch cards
// (core/themeCatalogue.js ensurePickerStyles → <style id="cbtp-style">) and the
// onboarding overlay's own inline <style> (app.js renderOnboarding). These rely on the
// authored CSP `style-src 'self' 'unsafe-inline'` to apply.
//
// Tauri, however, HARDENS the CSP at serve time: tauri-utils inject_nonce_token adds a
// `nonce` to every <style> and set_csp/replace_csp_nonce appends `'nonce-<rnd>'` to the
// `style-src` directive. Per CSP Level 3, once a nonce (or hash) is present in style-src,
// `'unsafe-inline'` is IGNORED — so the runtime-injected, nonce-less <style> elements are
// blocked. On the iPad this rendered the "Create my blog" theme picker unstyled (name +
// description concatenated) and left the onboarding controls unstyled/non-interactive.
// (Verified in Playwright WebKit + Chromium: a nonce in style-src → "Refused to apply a
// stylesheet … 'unsafe-inline' is ignored if a nonce/hash is present".)
//
// The fix tells Tauri to leave style-src exactly as authored via
// `dangerousDisableAssetCspModification: ["style-src"]` (script-src hardening stays on).
// This test pins that invariant so a future config edit can't silently reintroduce it.
//
//   node --test desktop-csp.test.mjs

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const CONF = join(HERE, 'desktop/src-tauri/tauri.bundle-local.conf.json');

const conf = JSON.parse(readFileSync(CONF, 'utf8'));
const security = conf.app?.security ?? {};
const csp = String(security.csp || '');

// Pull the style-src directive text out of the CSP string.
const styleSrc = (csp.split(';').map((s) => s.trim()).find((d) => d.startsWith('style-src')) || '');

test('bundle-local CSP authors style-src with unsafe-inline (runtime <style> injection is used)', () => {
  assert.ok(styleSrc.includes("'unsafe-inline'"),
    `expected style-src to include 'unsafe-inline'; got: "${styleSrc}"`);
});

test("Tauri's style-src nonce injection is disabled so 'unsafe-inline' is honored on device", () => {
  const d = security.dangerousDisableAssetCspModification;
  const disablesStyleSrc = d === true || (Array.isArray(d) && d.includes('style-src'));
  assert.ok(disablesStyleSrc,
    'app.security.dangerousDisableAssetCspModification must be true or include "style-src" — ' +
    'otherwise Tauri injects a nonce into style-src, CSP3 makes it ignore \'unsafe-inline\', and ' +
    'runtime-injected <style> (theme picker + onboarding overlay) is blocked on native builds.');
});
