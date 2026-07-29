import { test } from 'node:test';
import assert from 'node:assert';
import handler, { canonicalEmail } from '../../netlify/functions/trial-request.mjs';

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

test('CORS: Netlify deploy-preview origin (https://abc123--inayat-studio.netlify.app) is allowed', async () => {
  const res = await handler(new Request('https://site/x', {
    method: 'OPTIONS', headers: { origin: 'https://abc123--inayat-studio.netlify.app' },
  }));
  assert.equal(res.status, 204);
  assert.equal(res.headers.get('access-control-allow-origin'), 'https://abc123--inayat-studio.netlify.app');
});

test('CORS: fresh Chapbook site origin is allowed', async () => {
  const origin = 'https://chapbook-publishing-studio.netlify.app';
  const req = new Request('https://example.test', {
    method: 'OPTIONS',
    headers: { Origin: origin },
  });
  const res = await handler(req);
  assert.equal(res.status, 204);
  assert.equal(res.headers.get('access-control-allow-origin'), origin);
});

test('CORS: evil origin (https://evil.example) is NOT allowed, no ACAO header', async () => {
  const res = await handler(new Request('https://site/x', {
    method: 'OPTIONS', headers: { origin: 'https://evil.example' },
  }));
  assert.equal(res.status, 204);
  assert.equal(res.headers.get('access-control-allow-origin'), null);
});


// SEC-2: email canonicalisation for the dedup hash — aliases must collapse to one inbox.
test('canonicalEmail strips +tag on any domain', () => {
  assert.strictEqual(canonicalEmail('you+1@example.com'), 'you@example.com');
  assert.strictEqual(canonicalEmail('you+anything.here@work.co.uk'), 'you@work.co.uk');
});
test('canonicalEmail collapses dots for gmail/googlemail only', () => {
  assert.strictEqual(canonicalEmail('y.o.u@gmail.com'), 'you@gmail.com');
  assert.strictEqual(canonicalEmail('y.o.u@googlemail.com'), 'you@googlemail.com');
  assert.strictEqual(canonicalEmail('y.o.u@fastmail.com'), 'y.o.u@fastmail.com'); // dots kept off-gmail
});
test('canonicalEmail: gmail +tag AND dots both collapse (the abuse vector)', () => {
  assert.strictEqual(canonicalEmail('j.a.n.e+trial7@gmail.com'), 'jane@gmail.com');
});
test('canonicalEmail leaves a plain address unchanged', () => {
  assert.strictEqual(canonicalEmail('plain@example.com'), 'plain@example.com');
});
