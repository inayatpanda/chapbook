import { test } from 'node:test';
import assert from 'node:assert/strict';
import { bridgeTarget, installNativeFetchBridge } from './nativeFetch.js';

// Stand-ins for `location` on each platform (same shapes nativeLinks.test.mjs uses).
const web = { protocol: 'https:', hostname: 'chapbook.rqai.co.uk', href: 'https://chapbook.rqai.co.uk/app/', origin: 'https://chapbook.rqai.co.uk' };
const tauriProto = { protocol: 'tauri:', hostname: 'localhost', href: 'tauri://localhost/app/index.html', origin: 'tauri://localhost' };
const tauriHttp = { protocol: 'http:', hostname: 'tauri.localhost', href: 'http://tauri.localhost/app/index.html', origin: 'http://tauri.localhost' };

test('bridgeTarget — external absolute http(s) URLs are bridged on native (all the app hosts)', () => {
  for (const loc of [tauriProto, tauriHttp]) {
    assert.equal(bridgeTarget('https://api.github.com/user', loc), 'https://api.github.com/user');
    assert.equal(bridgeTarget('https://api.github.com/repos/o/r/generate', loc), 'https://api.github.com/repos/o/r/generate');
    assert.equal(bridgeTarget('https://api.anthropic.com/v1/messages', loc), 'https://api.anthropic.com/v1/messages');
    assert.equal(bridgeTarget('https://api.openai.com/v1/chat/completions', loc), 'https://api.openai.com/v1/chat/completions');
    assert.equal(bridgeTarget('https://generativelanguage.googleapis.com/v1beta/models/x:generateContent', loc), 'https://generativelanguage.googleapis.com/v1beta/models/x:generateContent');
    assert.equal(bridgeTarget('https://api.groq.com/openai/v1/chat/completions', loc), 'https://api.groq.com/openai/v1/chat/completions');
    // The device-flow relay is a DIFFERENT origin than the tauri host → bridged too (fixes sign-in).
    assert.equal(bridgeTarget('https://chapbook.rqai.co.uk/.netlify/functions/gh-device', loc), 'https://chapbook.rqai.co.uk/.netlify/functions/gh-device');
  }
  // A URL object works the same as a string.
  assert.equal(bridgeTarget(new URL('https://api.github.com/user'), tauriProto), 'https://api.github.com/user');
});

test('bridgeTarget — WEB build never bridges (genuine no-op on the hosted site)', () => {
  assert.equal(bridgeTarget('https://api.github.com/user', web), null);
  assert.equal(bridgeTarget('https://api.anthropic.com/v1/messages', web), null);
  assert.equal(bridgeTarget('/rel', web), null);
  assert.equal(bridgeTarget('https://api.github.com/user', null), null, 'no location');
});

test('bridgeTarget — same-origin, relative and non-http(s) requests stay native (null)', () => {
  // Same-origin bundled assets / same-origin APIs must NOT be routed through the Rust client.
  assert.equal(bridgeTarget('/app/illustrations-manifest.json', tauriProto), null, 'root-relative same-origin');
  assert.equal(bridgeTarget('app/index.html', tauriProto), null, 'relative same-origin');
  assert.equal(bridgeTarget('tauri://localhost/app/other', tauriProto), null, 'absolute same-origin (tauri:)');
  assert.equal(bridgeTarget('http://tauri.localhost/app/x', tauriHttp), null, 'absolute same-origin (http tauri host)');
  assert.equal(bridgeTarget('data:text/plain,hi', tauriProto), null, 'data:');
  assert.equal(bridgeTarget('blob:tauri://localhost/abc', tauriProto), null, 'blob:');
  assert.equal(bridgeTarget('mailto:hi@example.com', tauriProto), null, 'mailto:');
  assert.equal(bridgeTarget('not a url', tauriProto), null, 'unparseable');
  assert.equal(bridgeTarget(undefined, tauriProto), null, 'undefined input');
});

test('bridgeTarget — Request inputs classify by their absolute .url (the aws4fetch direct-R2 path)', () => {
  for (const loc of [tauriProto, tauriHttp]) {
    // External R2 S3 endpoint reached via a signed Request → bridged (fixes direct-to-R2 upload).
    assert.equal(
      bridgeTarget(new Request('https://acct.r2.cloudflarestorage.com/bucket/videos/x.mp4', { method: 'PUT' }), loc),
      'https://acct.r2.cloudflarestorage.com/bucket/videos/x.mp4',
    );
    // Any other external host as a Request works the same as a string/URL.
    assert.equal(bridgeTarget(new Request('https://api.github.com/user'), loc), 'https://api.github.com/user');
  }
  // Same-origin Request (http tauri host) → NOT bridged.
  assert.equal(bridgeTarget(new Request('http://tauri.localhost/app/x'), tauriHttp), null, 'same-origin Request stays native');
  // WEB build → never bridge, even a Request to the R2 endpoint (genuine no-op on the hosted site).
  assert.equal(bridgeTarget(new Request('https://acct.r2.cloudflarestorage.com/bucket/x'), web), null);
});

test('installNativeFetchBridge — WEB: does not install, window.fetch is untouched (no-op)', () => {
  const original = () => Promise.resolve('ORIGINAL');
  const win = { fetch: original };
  const installed = installNativeFetchBridge(win, web, () => Promise.resolve(() => {}));
  assert.equal(installed, false);
  assert.equal(win.fetch, original, 'window.fetch reference is unchanged on the web');
});

test('installNativeFetchBridge — NATIVE: external calls route through the Tauri fetch; same-origin/relative use the original', async () => {
  const calls = { original: [], tauri: [] };
  const original = (input, init) => { calls.original.push([input, init]); return Promise.resolve({ via: 'original', input }); };
  const tauriFetch = (url, init) => { calls.tauri.push([url, init]); return Promise.resolve({ via: 'tauri', url, init }); };
  const win = { fetch: original };
  let loaderCalls = 0;
  const installed = installNativeFetchBridge(win, tauriProto, () => { loaderCalls++; return Promise.resolve(tauriFetch); });
  assert.equal(installed, true);
  assert.notEqual(win.fetch, original, 'window.fetch is wrapped on native');

  // External API call → Tauri fetch, with method/headers/body forwarded verbatim.
  const init = { method: 'POST', headers: { Authorization: 'Bearer x', 'anthropic-version': '2023-06-01' }, body: '{"a":1}' };
  const r1 = await win.fetch('https://api.anthropic.com/v1/messages', init);
  assert.equal(r1.via, 'tauri');
  assert.equal(r1.url, 'https://api.anthropic.com/v1/messages');
  assert.equal(r1.init, init, 'init (method, ALL headers, body, signal) forwarded unchanged');
  assert.equal(calls.tauri.length, 1);

  // Same-origin bundled asset → original fetch, never the bridge.
  const r2 = await win.fetch('/app/illustrations-manifest.json');
  assert.equal(r2.via, 'original');
  assert.equal(calls.tauri.length, 1, 'same-origin request did not touch the bridge');

  // The plugin loader is invoked lazily and memoised (loaded once across many external calls).
  await win.fetch('https://api.github.com/user');
  assert.equal(loaderCalls, 1, 'tauri fetch is loaded exactly once and reused');
  assert.equal(calls.tauri.length, 2);
});

test('installNativeFetchBridge — NATIVE: a Request input (aws4fetch signed R2 PUT) is unwrapped and bridged', async () => {
  const calls = { tauri: [] };
  const original = (input, init) => Promise.resolve({ via: 'original', input, init });
  const tauriFetch = (url, init) => { calls.tauri.push([url, init]); return Promise.resolve({ via: 'tauri', url, init }); };
  const win = { fetch: original };
  installNativeFetchBridge(win, tauriProto, () => Promise.resolve(tauriFetch));

  // A signed PUT the way aws4fetch's AwsClient.fetch() presents it: a Request object carrying the
  // SigV4 Authorization + x-amz-* headers and the payload body.
  const body = JSON.stringify({ hello: 'r2' });
  const req = new Request('https://acct123.r2.cloudflarestorage.com/bucket/videos/x.mp4', {
    method: 'PUT',
    headers: {
      Authorization: 'AWS4-HMAC-SHA256 Credential=AKID/20260726/auto/s3/aws4_request',
      'x-amz-content-sha256': 'deadbeef',
      'x-amz-date': '20260726T000000Z',
      'content-type': 'video/mp4',
    },
    body,
  });
  const r = await win.fetch(req);
  assert.equal(r.via, 'tauri', 'Request routed through the Rust bridge, not the blocked webview fetch');
  assert.equal(calls.tauri.length, 1);
  const [url, init] = calls.tauri[0];
  assert.equal(url, 'https://acct123.r2.cloudflarestorage.com/bucket/videos/x.mp4', 'absolute Request .url used as the bridge target');
  assert.equal(init.method, 'PUT');
  // ALL headers preserved (Headers lowercases the names on iteration) — SigV4 signature survives.
  assert.equal(init.headers['authorization'], 'AWS4-HMAC-SHA256 Credential=AKID/20260726/auto/s3/aws4_request');
  assert.equal(init.headers['x-amz-content-sha256'], 'deadbeef');
  assert.equal(init.headers['x-amz-date'], '20260726T000000Z');
  assert.equal(init.headers['content-type'], 'video/mp4');
  // Body unwrapped to the exact signed bytes via request.clone().arrayBuffer().
  assert.ok(init.body instanceof ArrayBuffer, 'body forwarded as an ArrayBuffer');
  assert.equal(new TextDecoder().decode(init.body), body, 'exact payload bytes preserved');

  // A GET Request carries no body (non-GET/HEAD only).
  const g = await win.fetch(new Request('https://api.github.com/user'));
  assert.equal(g.via, 'tauri');
  assert.equal(calls.tauri[1][1].method, 'GET');
  assert.equal(calls.tauri[1][1].body, undefined, 'GET Request bridged without a body');
});

test('installNativeFetchBridge — NATIVE: if the plugin fails to load, requests fall back to the original (never silently swallowed)', async () => {
  let fellBack = 0;
  const original = () => { fellBack++; return Promise.resolve({ via: 'original' }); };
  const win = { fetch: original };
  installNativeFetchBridge(win, tauriProto, () => Promise.reject(new Error('plugin missing')));
  const r = await win.fetch('https://api.github.com/user');
  assert.equal(r.via, 'original');
  assert.equal(fellBack, 1);
});

test('installNativeFetchBridge — bad args and a broken loader can never throw at boot', () => {
  assert.equal(installNativeFetchBridge(null, tauriProto, () => {}), false);
  assert.equal(installNativeFetchBridge({}, tauriProto, () => {}), false, 'no win.fetch');
  assert.equal(installNativeFetchBridge({ fetch() {} }, tauriProto, null), false, 'no loader');
});
