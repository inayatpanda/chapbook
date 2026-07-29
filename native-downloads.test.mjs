import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const page = readFileSync('src/download.html', 'utf8');
const stage = readFileSync('scripts/stage-installers.mjs', 'utf8');

test('download page offers macOS, Windows, Android and browser editions', () => {
  for (const platform of ['mac', 'win', 'android', 'web']) {
    assert.match(page, new RegExp(`data-plat="${platform}"`));
  }
  assert.match(page, /href="\/downloads\/Chapbook-Android\.apk"/);
  assert.match(page, /data-mf="android-meta"/);
  assert.match(page, /data-mf="android-sha"/);
});

test('Android visitors are offered the APK while other mobile visitors retain the PWA', () => {
  assert.match(page, /\/Android\/i\.test\(ua\)\) \{ pick = 'android'/);
  assert.match(page, /iPhone\|iPad\|iPod/);
  assert.match(page, /pick = 'web'/);
});

test('installer staging requires and verifies an APK release asset', () => {
  assert.match(stage, /file: 'Chapbook-Android\.apk'/);
  assert.match(stage, /n\.endsWith\('\.apk'\)/);
  assert.match(stage, /sha256: createHash\('sha256'\)/);
  assert.match(stage, /size !== asset\.size/);
});
