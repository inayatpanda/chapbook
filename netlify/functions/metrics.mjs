// Anonymous usage-metrics touchpoint (Chapbook → Helm boundary, pull side).
//
// Increments per-day counters in a site-scoped Netlify Blobs store. Privacy is a hard
// requirement and enforced BY DESIGN: the ONLY thing ever persisted is aggregated
// counts keyed by calendar day — `{activate,install,visit}` under key `YYYY-MM-DD`.
// No PII, no IP address, no licence key, no request body beyond the {type} discriminant.
//
//   POST {"type":"activate"|"install"|"visit"}  → 204 (counter bumped)
//   GET  ?day=YYYY-MM-DD                         → that day's JSON (or {}) — Helm pulls this
//   other methods                                → 405
//   bad type / malformed body / bad day param    → 400
import { getStore } from '@netlify/blobs';

const TYPES = new Set(['activate', 'install', 'visit']);

// Read a day's counter with STRONG consistency.
//
// @netlify/blobs defaults to `consistency: 'eventual'`, which routes reads to the CACHED
// edge URL; only a strong read goes to `uncachedEdgeURL`. Both reads below (the
// read-modify-write bump AND the Helm-facing GET) were therefore served from cache, so a
// counter written moments earlier could read back stale or missing. Because the bump is a
// read-modify-write, a stale read does not merely delay the count — it RESETS it, silently
// discarding every increment the cache had not yet caught up to. This is what made release
// gate check 4 fail with "visit count is 0" and pass on a re-run: the gate's 7.5s of retries
// cannot outwait a cache, only a cache expiry can.
//
// Strong consistency THROWS BlobsConsistencyError if the runtime never injected
// `uncachedEdgeURL`, so fall back to the eventual read there: an older runtime should keep
// today's (imperfect) behaviour rather than lose metrics entirely to a 500.
//
// Returns {value, mode} so the GET can advertise which mode actually ran. Without that,
// a runtime missing `uncachedEdgeURL` would silently restore the old flaky behaviour with
// no way to tell from outside — the release gate reports this so a recurrence is
// diagnosable in one look instead of another round of bisecting a cache.
async function readDay(store, day) {
  try {
    return { value: await store.get(day, { type: 'json', consistency: 'strong' }), mode: 'strong' };
  } catch (e) {
    if (e?.name !== 'BlobsConsistencyError') throw e;
    return { value: await store.get(day, { type: 'json' }), mode: 'eventual' };
  }
}

// Pure, unit-tested counter step. Returns a NEW object with `type` incremented, or
// null if `type` is not one of the allowed discriminants (so the handler can 400).
export function bump(current, type) {
  if (!TYPES.has(type)) return null;
  const c = current && typeof current === 'object' ? { ...current } : {};
  c[type] = (c[type] || 0) + 1;
  return c;
}

export default async (req) => {
  const store = getStore('metrics');

  if (req.method === 'GET') {
    const day = new URL(req.url).searchParams.get('day');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(day || '')) return new Response('{}', { status: 400 });
    const { value, mode } = await readDay(store, day);
    // `no-store`: a counter read must never be CDN-cached. Probing production showed this
    // response served with `age: 2` behind a "Netlify Edge" cache entry, which is a SECOND
    // way to hand the gate (and Helm) a stale count, independent of the Blobs read above.
    return new Response(
      JSON.stringify(value || {}),
      {
        headers: {
          'content-type': 'application/json',
          'cache-control': 'no-store',
          'x-metrics-consistency': mode,
        },
      },
    );
  }

  if (req.method !== 'POST') return new Response(null, { status: 405 });

  let type;
  try { type = (await req.json()).type; } catch { return new Response(null, { status: 400 }); }

  const day = new Date().toISOString().slice(0, 10);
  const next = bump((await readDay(store, day)).value, type);
  if (!next) return new Response(null, { status: 400 });

  await store.setJSON(day, next); // no PII, no IP, no licence key — by design
  return new Response(null, { status: 204 });
};
