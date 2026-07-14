import { test } from 'node:test';
import assert from 'node:assert';
import handler from './trial-request.mjs';

// GITHUB_QUEUE_TOKEN is unset for these tests → the function is INERT once a
// request passes validation, so an ACCEPTED product deterministically reaches the
// not_configured (500) branch without any network. A REJECTED product stops
// earlier at the 400 allowlist gate. The two different terminal statuses are the
// proof that the allowlist accepted 'studio' and rejected the rest.
function post(body, origin) {
  const headers = { 'content-type': 'application/json' };
  if (origin) headers.origin = origin;
  return new Request('https://site/.netlify/functions/trial-request', {
    method: 'POST', headers, body: JSON.stringify(body),
  });
}

test("unknown product → 400 {\"error\":\"unknown product\"} (rejected before the queue)", async () => {
  const res = await handler(post({ email: 'a@b.co', product: 'anything-else' }));
  assert.equal(res.status, 400);
  assert.deepEqual(await res.json(), { error: 'unknown product' });
});

test("product:'studio' passes the allowlist (reaches the token/queue stage)", async () => {
  const saved = process.env.GITHUB_QUEUE_TOKEN;
  delete process.env.GITHUB_QUEUE_TOKEN; // force INERT → deterministic 500, no network
  try {
    const res = await handler(post({ email: 'a@b.co', product: 'studio' }));
    // 'studio' is accepted; with no token it stops at not_configured (500) — NOT at
    // the 400 allowlist rejection. That distinction is what proves acceptance.
    assert.equal(res.status, 500);
    assert.deepEqual(await res.json(), { ok: false, error: 'not_configured' });
  } finally {
    if (saved !== undefined) process.env.GITHUB_QUEUE_TOKEN = saved;
  }
});

test('omitted product is still allowed (null ≠ unknown — no regression)', async () => {
  const saved = process.env.GITHUB_QUEUE_TOKEN;
  delete process.env.GITHUB_QUEUE_TOKEN;
  try {
    const res = await handler(post({ email: 'a@b.co' }));
    assert.equal(res.status, 500); // passes the allowlist, stops at not_configured
    assert.deepEqual(await res.json(), { ok: false, error: 'not_configured' });
  } finally {
    if (saved !== undefined) process.env.GITHUB_QUEUE_TOKEN = saved;
  }
});

test('existing email validation is preserved (invalid email → 400 invalid_email)', async () => {
  const res = await handler(post({ email: 'not-an-email', product: 'studio' }));
  assert.equal(res.status, 400);
  assert.deepEqual(await res.json(), { ok: false, error: 'invalid_email' });
});

test('CORS: OPTIONS from an allow-listed origin still returns the correct null-body 204', async () => {
  const res = await handler(new Request('https://site/x', {
    method: 'OPTIONS', headers: { origin: 'https://chapbook.rqai.co.uk' },
  }));
  assert.equal(res.status, 204);
  assert.equal(res.headers.get('access-control-allow-origin'), 'https://chapbook.rqai.co.uk');
});
