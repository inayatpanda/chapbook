// Secret-less CORS relay for GitHub's OAuth Device Flow.
//
// GitHub's device endpoints (github.com/login/device/code and /login/oauth/access_token)
// send NO CORS headers, so a browser cannot poll them directly. This Netlify Function
// forwards the POST server-side and adds CORS headers. It holds NO secret and stores
// NOTHING — the OAuth Client ID is PUBLIC and arrives in the request body. It can ONLY
// ever reach the two hardcoded GitHub URLs below (selected by `step`), so there is no
// open-proxy / SSRF surface.

const TARGETS = {
  code: 'https://github.com/login/device/code',
  token: 'https://github.com/login/oauth/access_token',
};

// CORS is origin-reflected (never a wildcard). The relay is called from Chapbook's
// public site, the Studio's Netlify app, the two Tauri native origins, and localhost
// during dev. The native HTTP plugin still forwards the WebView's Origin header, so the
// explicit server-side origin gate must allow those origins even though CORS itself does
// not constrain the Rust request. Mirrors
// trial-request.mjs's ALLOWED_ORIGINS pattern: reflect the Origin only when it is
// allow-listed, and always Vary on Origin so a CDN never serves one origin's CORS
// answer to another.
const ALLOWED_ORIGINS = new Set([
  'https://chapbook.rqai.co.uk',
  'https://chapbook-publishing-studio.netlify.app',
  'https://inayat-studio.netlify.app',
  'http://tauri.localhost',
  'tauri://localhost',
]);

// localhost on any port (dev) is also permitted, alongside the fixed allow-list.
// Netlify deploy-preview subdomains (https://<deploy-id>--inayat-studio.netlify.app) are also allowed.
function isAllowedOrigin(origin) {
  if (!origin) return false;
  if (ALLOWED_ORIGINS.has(origin)) return true;
  // Netlify preview subdomains: https://<alphanumeric-and-hyphens>--inayat-studio.netlify.app
  if (/^https:\/\/[a-z0-9-]+--inayat-studio\.netlify\.app$/.test(origin)) return true;
  try {
    const { hostname } = new URL(origin);
    return hostname === 'localhost' || hostname === '127.0.0.1';
  } catch { return false; }
}

function corsHeaders(origin) {
  const h = { Vary: 'Origin' };
  if (isAllowedOrigin(origin)) {
    h['Access-Control-Allow-Origin'] = origin;
    h['Access-Control-Allow-Methods'] = 'POST, OPTIONS';
    h['Access-Control-Allow-Headers'] = 'Content-Type';
    h['Access-Control-Max-Age'] = '86400';
  }
  return h;
}

const json = (data, status = 200, origin) =>
  new Response(JSON.stringify(data), { status, headers: { ...corsHeaders(origin), 'Content-Type': 'application/json' } });

// CORS preflight response. MUST use a null body: undici rejects a 204 with any
// non-null body (the old `new Response('', …)` threw "Invalid response status code
// 204" → 502 on every preflight). Exported so a test can assert it never throws.
export function preflight(origin) {
  return new Response(null, { status: 204, headers: corsHeaders(origin) });
}

// ── Per-instance rate limit — in-memory token bucket (30 hits / 10 min / ip) ──
// NOTE: Netlify runs many independent function instances with no shared store, so
// this limits per-instance only. That is acceptable for v1 — it raises the cost of
// a burst from a single client without requiring external state. Pure + exported so
// the bucket logic is unit-testable in isolation.
const RL_WINDOW_MS = 10 * 60 * 1000; // 10 minutes
const RL_MAX = 30;                    // hits per window per ip
const rlBuckets = new Map();          // ip -> { count, resetAt }

export function rateLimitCheck(ip, now = Date.now()) {
  const key = ip || 'unknown';
  const b = rlBuckets.get(key);
  if (!b || now >= b.resetAt) {
    rlBuckets.set(key, { count: 1, resetAt: now + RL_WINDOW_MS });
    return { allowed: true, remaining: RL_MAX - 1 };
  }
  if (b.count >= RL_MAX) return { allowed: false, remaining: 0 };
  b.count += 1;
  return { allowed: true, remaining: RL_MAX - b.count };
}

// Pure, testable core. fetchImpl is injectable (defaults to global fetch).
export async function relay(body, fetchImpl = fetch, origin) {
  // Own-property lookup only — prototype keys (constructor, toString, __proto__)
  // must hit the invalid_step guard, not resolve to an inherited member.
  const step = body && body.step;
  const target = Object.hasOwn(TARGETS, step) ? TARGETS[step] : undefined;
  if (!target) return json({ error: 'invalid_step' }, 400, origin);
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries((body && body.params) || {})) params.set(k, String(v));
  const res = await fetchImpl(target, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
    body: params.toString(),
  });
  const data = await res.json().catch(() => ({ error: 'bad_gateway' }));
  return json(data, res.ok ? 200 : (res.status || 502), origin);
}

// Netlify Functions v2 entry — (Request, context) => Response.
export default async function handler(req, context) {
  const origin = req.headers.get('origin');
  if (req.method === 'OPTIONS') return preflight(origin);
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405, origin);

  // Origin gate: the in-product sign-in POST is SAME-ORIGIN (relative path) and so
  // sends NO Origin header — those must pass. Only a cross-origin request from an
  // origin that is NOT allow-listed is rejected.
  if (origin && !isAllowedOrigin(origin)) {
    return json({ error: 'forbidden_origin' }, 403, origin);
  }

  let body;
  try { body = await req.json(); } catch { return json({ error: 'invalid_json' }, 400, origin); }

  // Rate-limit ONLY the initial device-code request (step 'code'). The device flow
  // POSTs to this relay for BOTH the one-off code request AND repeated POLLING
  // (step 'token', every few seconds for up to ~15 min while the user authorises).
  // Counting those legitimate, frequent polls against the 30/10-min budget would
  // 429 a normal, slightly-slow sign-in and break it. The 'code' request is the
  // expensive/abusable one, so that is the one — and only one — we throttle.
  if (body && body.step === 'code') {
    // Netlify v2 passes context (with .ip) as the 2nd handler arg; fall back to the
    // client-ip header for local/dev where context may be absent.
    const ip = context?.ip ?? req.headers.get('x-nf-client-connection-ip');
    if (!rateLimitCheck(ip).allowed) {
      return new Response(JSON.stringify({ error: 'rate_limited' }), {
        status: 429,
        headers: { ...corsHeaders(origin), 'Content-Type': 'application/json', 'retry-after': '600' },
      });
    }
  }

  return relay(body, fetch, origin);
}
