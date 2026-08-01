// Regression tests for the flaky release-gate check 4 ("metrics visit → 204 + count").
//
// ROOT CAUSE: @netlify/blobs defaults to `consistency: 'eventual'` (see Client's
// `this.consistency = consistency ?? "eventual"`). An eventual read is routed to the
// CACHED `edgeURL`; only a strong read goes to `uncachedEdgeURL`. So a counter written
// milliseconds earlier can read back stale — or absent entirely — which is exactly how
// the gate saw `visit count for <today> is 0` and then passed on a re-run.
//
// The gate already retried 6 times over 7.5s and still failed, so this is not latency
// that a longer sleep fixes: it is a cache that has to expire. These tests pin the fix
// by driving the REAL @netlify/blobs client against a fake edge, so they assert which
// URL the read actually hit — something a stubbed store could never catch.
import { test } from 'node:test';
import assert from 'node:assert';

const CACHED_EDGE = 'https://cached-edge.test';
const UNCACHED_EDGE = 'https://uncached-edge.test';
const TODAY = new Date().toISOString().slice(0, 10); // same clock the handler uses

// Build the base64 NETLIFY_BLOBS_CONTEXT the runtime injects into a function.
function blobsContext({ withUncached = true } = {}) {
  const ctx = { siteID: 'site-1', token: 'tok-1', edgeURL: CACHED_EDGE };
  if (withUncached) ctx.uncachedEdgeURL = UNCACHED_EDGE;
  return Buffer.from(JSON.stringify(ctx)).toString('base64');
}

// A fake Netlify Blobs edge with a deliberately STALE cache, modelling production:
//   - writes (PUT) always land in `truth`
//   - reads via UNCACHED_EDGE see `truth`
//   - reads via CACHED_EDGE see `cache`, a snapshot that never refreshes
// Returns the recorder so tests can assert which host each read went to.
function installFakeEdge({ withUncached = true } = {}) {
  const truth = new Map();
  const cache = new Map(); // frozen: whatever the cache held before the write
  const reads = [];

  const realFetch = globalThis.fetch;
  const prevCtx = process.env.NETLIFY_BLOBS_CONTEXT;
  process.env.NETLIFY_BLOBS_CONTEXT = blobsContext({ withUncached });

  globalThis.fetch = async (input, options = {}) => {
    const url = new URL(String(input));
    const method = (options.method || 'GET').toUpperCase();
    const key = url.pathname; // /<siteID>/<store>/<key>

    if (method === 'PUT') {
      truth.set(key, typeof options.body === 'string' ? options.body : String(options.body));
      return new Response(null, { status: 200 });
    }
    if (method === 'GET') {
      const fromCache = url.origin === CACHED_EDGE;
      reads.push({ origin: url.origin, key, fromCache });
      const source = fromCache ? cache : truth;
      if (!source.has(key)) return new Response(null, { status: 404 });
      return new Response(source.get(key), { status: 200 });
    }
    return new Response(null, { status: 405 });
  };

  return {
    reads,
    truth,
    restore() {
      globalThis.fetch = realFetch;
      if (prevCtx === undefined) delete process.env.NETLIFY_BLOBS_CONTEXT;
      else process.env.NETLIFY_BLOBS_CONTEXT = prevCtx;
    },
  };
}

async function loadHandler() {
  // Cache-bust so each test gets a client built against its own fake environment.
  const mod = await import(`../../netlify/functions/metrics.mjs?t=${Math.random()}`);
  return mod.default;
}

function postVisit() {
  return new Request('https://chapbook.test/.netlify/functions/metrics', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ type: 'visit' }),
  });
}

function getDay(day = TODAY) {
  return new Request(`https://chapbook.test/.netlify/functions/metrics?day=${day}`);
}

// THE REPRODUCTION: this is release-gate check 4, verbatim, against a stale cache.
test('a visit counted through a stale edge cache is still visible to the next GET', async (t) => {
  const edge = installFakeEdge();
  t.after(() => edge.restore());
  const handler = await loadHandler();

  const post = await handler(postVisit());
  assert.equal(post.status, 204, 'POST /metrics {type:visit} should return 204');

  const get = await handler(getDay());
  assert.equal(get.status, 200);
  const body = await get.json();
  assert.equal(
    body.visit,
    1,
    `visit count for ${TODAY} read back as ${body.visit ?? 0} — this is the gate flake`,
  );
});

test('every counter read uses strong consistency (uncached edge)', async (t) => {
  const edge = installFakeEdge();
  t.after(() => edge.restore());
  const handler = await loadHandler();

  await handler(postVisit()); // read-modify-write read
  await handler(getDay()); // Helm-facing read

  assert.ok(edge.reads.length >= 2, 'expected both the RMW read and the GET read');
  const cachedReads = edge.reads.filter((r) => r.fromCache);
  assert.deepEqual(
    cachedReads,
    [],
    'no counter read may go through the cached edge — that is what loses the write',
  );
});

// The read-modify-write is what makes a stale read corrupting rather than merely slow:
// a stale read resets the counter instead of advancing it.
test('successive visits accumulate rather than overwriting each other', async (t) => {
  const edge = installFakeEdge();
  t.after(() => edge.restore());
  const handler = await loadHandler();

  await handler(postVisit());
  await handler(postVisit());
  await handler(postVisit());

  const body = await (await handler(getDay())).json();
  assert.equal(body.visit, 3, 'three POSTs should count three visits, not overwrite to 1');
});

// Deployment safety: strong consistency THROWS BlobsConsistencyError when the runtime
// did not inject `uncachedEdgeURL`. The function must degrade to the old behaviour
// rather than 500, otherwise this fix would take metrics down on an older runtime.
test('falls back to an eventual read when the runtime has no uncached edge URL', async (t) => {
  const edge = installFakeEdge({ withUncached: false });
  t.after(() => edge.restore());
  const handler = await loadHandler();

  const post = await handler(postVisit());
  assert.equal(post.status, 204, 'POST must still succeed without uncachedEdgeURL');

  const get = await handler(getDay());
  assert.equal(get.status, 200, 'GET must still succeed without uncachedEdgeURL');
  assert.equal(
    get.headers.get('x-metrics-consistency'),
    'eventual',
    'the degraded mode must be advertised, not hidden',
  );
  await get.json(); // body shape is cache-dependent here; not 500-ing is the assertion
});

test('GET advertises strong consistency when the runtime supports it', async (t) => {
  const edge = installFakeEdge();
  t.after(() => edge.restore());
  const handler = await loadHandler();

  const get = await handler(getDay());
  assert.equal(get.headers.get('x-metrics-consistency'), 'strong');
});

// Production served this response with `age: 2` behind an edge cache entry — a stale count
// from the CDN reads identically to a stale count from Blobs, so both paths must be shut.
test('the counter read is never CDN-cacheable', async (t) => {
  const edge = installFakeEdge();
  t.after(() => edge.restore());
  const handler = await loadHandler();

  const get = await handler(getDay());
  assert.equal(get.headers.get('cache-control'), 'no-store');
});

// Guard the existing contract so the consistency change cannot regress it.
test('a bad day parameter is still rejected with 400', async (t) => {
  const edge = installFakeEdge();
  t.after(() => edge.restore());
  const handler = await loadHandler();

  const res = await handler(new Request('https://chapbook.test/.netlify/functions/metrics?day=nope'));
  assert.equal(res.status, 400);
});

test('an unknown counter type is still rejected with 400', async (t) => {
  const edge = installFakeEdge();
  t.after(() => edge.restore());
  const handler = await loadHandler();

  const res = await handler(
    new Request('https://chapbook.test/.netlify/functions/metrics', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ type: 'weird' }),
    }),
  );
  assert.equal(res.status, 400);
});
