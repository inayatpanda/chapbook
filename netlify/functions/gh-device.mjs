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

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });

// Pure, testable core. fetchImpl is injectable (defaults to global fetch).
export async function relay(body, fetchImpl = fetch) {
  // Own-property lookup only — prototype keys (constructor, toString, __proto__)
  // must hit the invalid_step guard, not resolve to an inherited member.
  const step = body && body.step;
  const target = Object.hasOwn(TARGETS, step) ? TARGETS[step] : undefined;
  if (!target) return json({ error: 'invalid_step' }, 400);
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries((body && body.params) || {})) params.set(k, String(v));
  const res = await fetchImpl(target, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
    body: params.toString(),
  });
  const data = await res.json().catch(() => ({ error: 'bad_gateway' }));
  return json(data, res.ok ? 200 : (res.status || 502));
}

// Netlify Functions v2 entry — (Request) => Response.
export default async function handler(req) {
  if (req.method === 'OPTIONS') return new Response('', { status: 204, headers: CORS });
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);
  let body;
  try { body = await req.json(); } catch { return json({ error: 'invalid_json' }, 400); }
  return relay(body);
}
