// Public trial-request endpoint — the front door of the 7-day, email-gated trial.
// STATELESS. Never mints, never holds the licence signing key (same seam as
// stripe-webhook.mjs): it only pushes a `trial` record onto the private sales
// queue repo, which the owner's Helm fulfilment worker picks up to mint a
// product:'trial' key (7 days) and email it to the visitor.
//
//   POST { email, product? }  →  { ok:true, message:'Check your email for your 7-day key.' }
//
// ABUSE GUARD (7-day-reset): the queue path is derived ONLY from the email —
// id = sha256(lowercased, trimmed email).slice(0,32) → queue/trial-<id>.json — so a
// second request for the same address targets the SAME path. GitHub returns 422
// (file already exists), which pushToQueue maps to { ok:true }; we treat it as
// success and the user cannot reset their trial by re-requesting. The worker adds a
// second line of defence at the ledger (findTrialByEmail re-sends the same key).
//
// Env (owner-set in Netlify; NONE committed):
//   GITHUB_QUEUE_TOKEN   fine-grained PAT with contents:write on the queue repo — REQUIRED
//   QUEUE_REPO           "owner/repo" (default inayatpanda/rqai-sales)
//
// With GITHUB_QUEUE_TOKEN absent the function is INERT (500 not_configured).

import { createHash } from 'node:crypto';
import { pushToQueue } from './stripe-webhook.mjs';

const DEFAULT_QUEUE_REPO = 'inayatpanda/rqai-sales';
// Deliberately simple: a token, an @, a token, a dot, a token. Real validation is
// the delivery itself — a bad address just never receives the key.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Only products we actually fulfil may be queued. An omitted product (null) is
// still allowed — it means "no product", not an unknown one. Anything else is
// rejected up front, before it is ever written to the queue or logged.
const ALLOWED_PRODUCTS = new Set(['studio']);

// The paid apps' public origins may call this from the browser.
const ALLOWED_ORIGINS = new Set([
  'https://topp.rqai.co.uk',
  'https://orthoportfolio.rqai.co.uk',
  'https://consultantprep.rqai.co.uk',
  'https://clinicalproms.rqai.co.uk',
  'https://scribble.rqai.co.uk',
  'https://audioquill.rqai.co.uk',
  'https://chapbook.rqai.co.uk',
]);

// Check if an origin is allowed: exact match or Netlify deploy-preview subdomain.
function isAllowedOrigin(origin) {
  if (!origin) return false;
  if (ALLOWED_ORIGINS.has(origin)) return true;
  // Netlify preview subdomains: https://<alphanumeric-and-hyphens>--inayat-studio.netlify.app
  if (/^https:\/\/[a-z0-9-]+--inayat-studio\.netlify\.app$/.test(origin)) return true;
  return false;
}

// Echo the Origin only when it is allow-listed (never a wildcard). Always Vary on
// Origin so a CDN never caches one origin's CORS answer for another.
function corsHeaders(origin) {
  const h = { 'Content-Type': 'application/json', Vary: 'Origin' };
  if (isAllowedOrigin(origin)) {
    h['Access-Control-Allow-Origin'] = origin;
    h['Access-Control-Allow-Methods'] = 'POST, OPTIONS';
    h['Access-Control-Allow-Headers'] = 'Content-Type';
    h['Access-Control-Max-Age'] = '86400';
  }
  return h;
}

const json = (status, body, origin) =>
  new Response(JSON.stringify(body), { status, headers: corsHeaders(origin) });

// ── Netlify Functions v2 entry — (Request) => Response ────────────────────────
export default async function handler(req) {
  const origin = req.headers.get('origin') || '';

  // CORS preflight.
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders(origin) });
  }
  if (req.method !== 'POST') {
    return json(405, { ok: false, error: 'method_not_allowed' }, origin);
  }

  let payload;
  try { payload = await req.json(); } catch { payload = null; }
  const rawEmail = payload && typeof payload.email === 'string' ? payload.email : '';
  const email = rawEmail.trim().toLowerCase();
  const product = payload && typeof payload.product === 'string' ? payload.product : null;

  // Product allowlist — reject an unknown product BEFORE it reaches the queue or
  // any log line. A null (omitted) product is permitted.
  if (product !== null && !ALLOWED_PRODUCTS.has(product)) {
    return json(400, { error: 'unknown product' }, origin);
  }

  if (!EMAIL_RE.test(email)) {
    return json(400, { ok: false, error: 'invalid_email' }, origin);
  }

  const token = process.env.GITHUB_QUEUE_TOKEN;
  if (!token) {
    console.error('[trial-request] INERT: GITHUB_QUEUE_TOKEN is not set — cannot queue.');
    return json(500, { ok: false, error: 'not_configured' }, origin);
  }
  const repo = process.env.QUEUE_REPO || DEFAULT_QUEUE_REPO;

  // Path is a pure function of the (normalised) email → idempotent per address.
  const id = createHash('sha256').update(email, 'utf8').digest('hex').slice(0, 32);
  const record = { type: 'trial', email, product, ts: new Date().toISOString() };

  try {
    const q = await pushToQueue({ path: `queue/trial-${id}.json`, record, token, repo });
    // pushToQueue maps 422 (already exists) → { ok:true, already:true } — the abuse
    // guard: a repeat request neither resets the trial nor errors.
    if (!q.ok) {
      console.error(`[trial-request] queue push failed status=${q.status}`);
      return json(502, { ok: false, error: 'queue_failed' }, origin);
    }
  } catch (e) {
    console.error('[trial-request] queue push threw:', e && e.message);
    return json(502, { ok: false, error: 'queue_error' }, origin);
  }

  console.log(`[trial-request] queued trial-${id} (${product || 'no product'})`);
  return json(200, { ok: true, message: 'Check your email for your 7-day key.' }, origin);
}
