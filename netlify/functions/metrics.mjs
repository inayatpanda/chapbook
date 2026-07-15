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
    return new Response(
      JSON.stringify((await store.get(day, { type: 'json' })) || {}),
      { headers: { 'content-type': 'application/json' } },
    );
  }

  if (req.method !== 'POST') return new Response(null, { status: 405 });

  let type;
  try { type = (await req.json()).type; } catch { return new Response(null, { status: 400 }); }

  const day = new Date().toISOString().slice(0, 10);
  const next = bump(await store.get(day, { type: 'json' }), type);
  if (!next) return new Response(null, { status: 400 });

  await store.setJSON(day, next); // no PII, no IP, no licence key — by design
  return new Response(null, { status: 204 });
};
