import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isNativeOrigin, externalUrlToOpen } from './nativeLinks.js';

// Stand-ins for `location` on each platform.
const web = { protocol: 'https:', hostname: 'chapbook.rqai.co.uk', href: 'https://chapbook.rqai.co.uk/app/', origin: 'https://chapbook.rqai.co.uk' };
const tauriProto = { protocol: 'tauri:', hostname: 'localhost', href: 'tauri://localhost/app/index.html', origin: 'tauri://localhost' };
const tauriHttp = { protocol: 'http:', hostname: 'tauri.localhost', href: 'http://tauri.localhost/app/index.html', origin: 'http://tauri.localhost' };

test('isNativeOrigin — true only inside the Tauri wrappers', () => {
  assert.equal(isNativeOrigin(tauriProto), true, 'tauri: protocol');
  assert.equal(isNativeOrigin(tauriHttp), true, 'http://tauri.localhost host');
  assert.equal(isNativeOrigin({ protocol: 'http:', hostname: 'sub.tauri.localhost', href: 'http://sub.tauri.localhost/' }), true, 'sub-host of tauri.localhost');
  assert.equal(isNativeOrigin(web), false, 'hosted web');
  assert.equal(isNativeOrigin({ protocol: 'http:', hostname: 'localhost', href: 'http://localhost/' }), false, 'plain localhost is not native');
  assert.equal(isNativeOrigin({ protocol: 'http:', hostname: 'eviltauri.localhost.attacker.com', href: 'http://x/' }), false, 'lookalike host is not native');
  assert.equal(isNativeOrigin(null), false, 'no location');
});

test('externalUrlToOpen — the real onboarding / device-flow links open externally on native', () => {
  // The two links that were dead in the webview.
  assert.equal(externalUrlToOpen('https://github.com/signup', tauriProto), 'https://github.com/signup');
  assert.equal(externalUrlToOpen('https://github.com/login/device', tauriProto), 'https://github.com/login/device');
  // The two other target="_blank" links (repo Pages settings + the live blog URL).
  assert.equal(externalUrlToOpen('https://github.com/o/r/settings/pages', tauriHttp), 'https://github.com/o/r/settings/pages');
  assert.equal(externalUrlToOpen('https://o.github.io/r/', tauriHttp), 'https://o.github.io/r/');
});

test('externalUrlToOpen — in-app / same-origin / non-http links are left to the webview (null)', () => {
  assert.equal(externalUrlToOpen('#gh-have-account', tauriProto), null, 'in-page hash');
  assert.equal(externalUrlToOpen('', tauriProto), null, 'empty href');
  assert.equal(externalUrlToOpen('app/index.html', tauriProto), null, 'relative same-origin path');
  assert.equal(externalUrlToOpen('tauri://localhost/app/other.html', tauriProto), null, 'same-origin absolute (tauri:)');
  assert.equal(externalUrlToOpen('http://tauri.localhost/app/x', tauriHttp), null, 'same-origin absolute (http tauri host)');
  assert.equal(externalUrlToOpen('mailto:hi@example.com', tauriProto), null, 'mailto stays native');
  assert.equal(externalUrlToOpen('blob:tauri://localhost/abc', tauriProto), null, 'blob stays native');
  assert.equal(externalUrlToOpen('not a url', tauriProto), null, 'unparseable href');
  assert.equal(externalUrlToOpen('https://github.com/signup', null), null, 'no location');
});

test('externalUrlToOpen — resolves relative external-looking hrefs against the native origin', () => {
  // A protocol-relative or relative href resolves under the tauri origin, so it is NOT external.
  assert.equal(externalUrlToOpen('/foo', tauriProto), null, 'root-relative resolves to same origin');
});
