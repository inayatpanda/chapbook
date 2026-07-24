import { test } from 'node:test';
import assert from 'node:assert';
import handler, { preflight, rateLimitCheck, relay } from '../../netlify/functions/gh-device.mjs';

// ── (1) preflight — the 204-body release blocker ─────────────────────────────
// undici rejects a 204 with a non-null body ("" is non-null), which is what the
// old `new Response('', {status:204})` did → 502 on every preflight. preflight()
// must build a 204 with a NULL body and never throw.
test('preflight() returns a 204 and does NOT throw (null body, not "")', () => {
  let res;
  assert.doesNotThrow(() => { res = preflight(); });
  assert.equal(res.status, 204);
});

test('preflight(allowedOrigin) is also 204 and reflects that origin', () => {
  let res;
  assert.doesNotThrow(() => { res = preflight('https://chapbook.rqai.co.uk'); });
  assert.equal(res.status, 204);
  assert.equal(res.headers.get('access-control-allow-origin'), 'https://chapbook.rqai.co.uk');
});

test('regression witness: the old new Response("",{status:204}) form throws', () => {
  assert.throws(() => new Response('', { status: 204 }), /Invalid response status code 204/);
});

// ── (2) rateLimitCheck — pure token bucket (30 / 10 min / ip) ────────────────
test('rateLimitCheck: 30 hits allowed, the 31st blocked (same ip, same window)', () => {
  const ip = '203.0.113.7';
  const t = 1_000_000;
  for (let i = 0; i < 30; i++) {
    assert.equal(rateLimitCheck(ip, t).allowed, true, `hit ${i + 1} should be allowed`);
  }
  assert.equal(rateLimitCheck(ip, t).allowed, false, '31st must be blocked');
});

test('rateLimitCheck: a hit >10 min later resets the window', () => {
  const ip = '203.0.113.8';
  const t = 5_000_000;
  for (let i = 0; i < 30; i++) rateLimitCheck(ip, t);
  assert.equal(rateLimitCheck(ip, t).allowed, false, 'blocked at the cap');
  assert.equal(rateLimitCheck(ip, t + 10 * 60 * 1000 + 1).allowed, true, 'resets after 10 min');
});

test('rateLimitCheck: separate ips keep independent buckets', () => {
  const t = 9_000_000;
  for (let i = 0; i < 30; i++) rateLimitCheck('rl-a', t);
  assert.equal(rateLimitCheck('rl-a', t).allowed, false, 'a exhausted');
  assert.equal(rateLimitCheck('rl-b', t).allowed, true, 'b independent');
});

// ── proxy core (must be preserved unchanged) ─────────────────────────────────
test('relay: unknown/prototype step → 400 invalid_step (Object.hasOwn guard kept)', async () => {
  const res = await relay({ step: 'constructor', params: {} });
  assert.equal(res.status, 400);
  assert.deepEqual(await res.json(), { error: 'invalid_step' });
});

test('relay: a valid step proxies to the hardcoded GitHub URL and returns its JSON', async () => {
  let calledUrl;
  const mockFetch = async (url) => {
    calledUrl = url;
    return new Response(JSON.stringify({ device_code: 'abc' }), { status: 200 });
  };
  const res = await relay({ step: 'code', params: { client_id: 'x' } }, mockFetch);
  assert.equal(calledUrl, 'https://github.com/login/device/code');
  assert.deepEqual(await res.json(), { device_code: 'abc' });
});

// ── handler wiring: preflight / origin gate / rate limit / same-origin ───────
test('handler: OPTIONS from an allow-listed origin → 204 reflecting that origin', async () => {
  const res = await handler(
    new Request('https://site/x', { method: 'OPTIONS', headers: { origin: 'https://inayat-studio.netlify.app' } }),
    {},
  );
  assert.equal(res.status, 204);
  assert.equal(res.headers.get('access-control-allow-origin'), 'https://inayat-studio.netlify.app');
});

test('handler: same-origin POST (NO Origin header) is allowed through — returns JSON', async () => {
  // Body is deliberately unparseable so we stop at invalid_json (200-free, no
  // network) — reaching that branch proves the origin gate let a no-Origin
  // request through, exactly like the in-product same-origin sign-in POST.
  const res = await handler(
    new Request('https://site/x', { method: 'POST', headers: { 'content-type': 'application/json' }, body: 'not json' }),
    { ip: 'so-ip' },
  );
  assert.equal(res.status, 400);
  assert.equal(res.headers.get('content-type'), 'application/json');
  assert.deepEqual(await res.json(), { error: 'invalid_json' });
});

test('handler: cross-origin POST from a DISALLOWED origin → 403, no ACAO header', async () => {
  const res = await handler(
    new Request('https://site/x', { method: 'POST', headers: { origin: 'https://evil.example' }, body: '{}' }),
    { ip: 'evil-ip' },
  );
  assert.equal(res.status, 403);
  assert.equal(res.headers.get('access-control-allow-origin'), null);
});

// ── (3) step-scoped rate limit — polls are NOT counted, only 'code' is ────────
// The device flow POSTs to this relay for BOTH the one-off device-code request
// (step 'code') AND repeated polling (step 'token', every few seconds for up to
// ~15 min while the user authorises). Only 'code' is throttled; counting the polls
// would exhaust the 30/10-min budget and 429 a normal sign-in. These handler tests
// stub globalThis.fetch (the handler calls relay(body, fetch)) so no real network
// request reaches GitHub. Each uses a unique ip — rlBuckets is module-level state
// shared across the whole file.
test('handler: 100 step:token polls from ONE ip are NEVER rate-limited (429-free)', async () => {
  const realFetch = globalThis.fetch;
  globalThis.fetch = async () =>
    new Response(JSON.stringify({ error: 'authorization_pending' }), { status: 200 });
  try {
    const ip = 'poll-ip-3';
    const mk = () => new Request('https://site/x', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ step: 'token', params: { device_code: 'dc' } }),
    });
    for (let i = 0; i < 100; i++) {
      const res = await handler(mk(), { ip });
      assert.notEqual(res.status, 429, `poll ${i + 1} must never be rate-limited`);
    }
  } finally {
    globalThis.fetch = realFetch;
  }
});

test('handler: excessive INITIAL step:code requests still 429 after the cap (30 → 31st blocked)', async () => {
  const realFetch = globalThis.fetch;
  globalThis.fetch = async () =>
    new Response(JSON.stringify({ device_code: 'dc', interval: 5, expires_in: 900 }), { status: 200 });
  try {
    const ip = 'code-ip-3';
    const mk = () => new Request('https://site/x', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ step: 'code', params: { client_id: 'x' } }),
    });
    for (let i = 0; i < 30; i++) {
      const res = await handler(mk(), { ip });
      assert.equal(res.status, 200, `code request ${i + 1} within the cap succeeds`);
    }
    const blocked = await handler(mk(), { ip });
    assert.equal(blocked.status, 429, 'the 31st code request is blocked');
    assert.equal(blocked.headers.get('retry-after'), '600');
    assert.deepEqual(await blocked.json(), { error: 'rate_limited' });
  } finally {
    globalThis.fetch = realFetch;
  }
});

test('handler: polls do NOT consume the code budget — a code request still succeeds after 50 polls', async () => {
  const realFetch = globalThis.fetch;
  globalThis.fetch = async () =>
    new Response(JSON.stringify({ device_code: 'dc' }), { status: 200 });
  try {
    const ip = 'mixed-ip-3';
    const poll = () => new Request('https://site/x', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ step: 'token', params: { device_code: 'dc' } }),
    });
    const code = () => new Request('https://site/x', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ step: 'code', params: { client_id: 'x' } }),
    });
    for (let i = 0; i < 50; i++) await handler(poll(), { ip });   // well past the 30-cap, all polls
    const res = await handler(code(), { ip });
    assert.equal(res.status, 200, 'code request still allowed — the 50 polls did not consume its budget');
  } finally {
    globalThis.fetch = realFetch;
  }
});

// ── CORS origin allowlist: exact matches + Netlify preview subdomains ──────────
test('handler: Netlify deploy-preview origin (https://deadbeef123--inayat-studio.netlify.app) is allowed', async () => {
  const res = await handler(
    new Request('https://site/x', { method: 'OPTIONS', headers: { origin: 'https://deadbeef123--inayat-studio.netlify.app' } }),
    {},
  );
  assert.equal(res.status, 204);
  assert.equal(res.headers.get('access-control-allow-origin'), 'https://deadbeef123--inayat-studio.netlify.app');
});

test('handler: evil origin (https://evil.example) is NOT allowed, no ACAO header', async () => {
  const res = await handler(
    new Request('https://site/x', { method: 'OPTIONS', headers: { origin: 'https://evil.example' } }),
    {},
  );
  assert.equal(res.status, 204);
  assert.equal(res.headers.get('access-control-allow-origin'), null);
});

test('handler: allow-listed origins (hosted site + Tauri native-app origins) are reflected', async () => {
  // The hosted site plus the three bundled native-app webview origins: iOS/macOS/Linux
  // (tauri://localhost) and Android/Windows wry hosts (http/https://tauri.localhost).
  // Android's default http://tauri.localhost was previously rejected (403) — this is
  // the fix that lets a bundled native app complete device-flow sign-in via the relay.
  for (const origin of [
    'https://chapbook.rqai.co.uk',
    'tauri://localhost',
    'http://tauri.localhost',
    'https://tauri.localhost',
  ]) {
    const res = await handler(
      new Request('https://site/x', { method: 'OPTIONS', headers: { origin } }),
      {},
    );
    assert.equal(res.status, 204, `${origin} preflight → 204`);
    assert.equal(res.headers.get('access-control-allow-origin'), origin, `${origin} reflected`);
  }
});
