// Stripe → Studio-access purchase notifier.  MANUAL-WITH-ASSIST.  STATELESS.
//
// On a Stripe `checkout.session.completed`, this verifies the webhook signature,
// extracts the buyer's name/email, and NOTIFIES THE OWNER (by email, if a
// provider is configured — otherwise just logs it) with a pre-filled
// `licence:mint` command. It NEVER mints and NEVER holds the licence signing key.
//
// This is the deliberate choice (see STRIPE-SEAM.md): the Ed25519 signing key —
// the crown jewel of the paid product — stays on the owner's own machine, OFF
// public hosts, consistent with the rest of the architecture. The owner runs the
// printed command locally and emails the buyer their IPL1.… key.
//
// It sits beside the device-flow relay (gh-device.mjs) and shares no state.
// It imports ONLY node:crypto — no code outside studio-app/ — so Netlify bundles
// it cleanly (an earlier version imported the signing core from the repo root,
// which Netlify could not bundle → the function 502'd on load).
//
//  Env vars (owner-set in Netlify; NONE committed):
//    STRIPE_WEBHOOK_SECRET   whsec_… — REQUIRED (to verify the webhook)
//    RESEND_API_KEY          email provider key — optional; without it the
//                            purchase is only logged to the Netlify function log
//    LICENCE_EMAIL_FROM      e.g. "Studio <keys@yourdomain>" (optional)
//    LICENCE_EMAIL_TO        where to notify you (optional; defaults to FROM)
//
// With STRIPE_WEBHOOK_SECRET absent the function is INERT (500 not_configured).

import { createHmac, timingSafeEqual } from 'node:crypto';

const DEFAULT_TOLERANCE_SEC = 300;           // Stripe's replay window
const DEFAULT_FROM = 'Studio <onboarding@resend.dev>';

// ── Stripe webhook signature verification (pure; no Stripe SDK) ───────────────
// Stripe signs `${t}.${rawBody}` with HMAC-SHA256 keyed by the whsec_… secret and
// sends `Stripe-Signature: t=<unix>,v1=<hexmac>[,v1=<hexmac>…]`. We recompute and
// timing-safe compare, and reject stale timestamps (replay protection).
export function verifyStripeSignature(rawBody, sigHeader, secret, { now = Date.now(), toleranceSec = DEFAULT_TOLERANCE_SEC } = {}) {
  if (!secret || typeof rawBody !== 'string' || typeof sigHeader !== 'string') return false;
  let t = null;
  const v1 = [];
  for (const part of sigHeader.split(',')) {
    const i = part.indexOf('=');
    if (i === -1) continue;
    const k = part.slice(0, i).trim();
    const v = part.slice(i + 1).trim();
    if (k === 't') t = v;
    else if (k === 'v1') v1.push(v);
  }
  if (!t || v1.length === 0) return false;
  const ts = Number(t);
  if (!Number.isFinite(ts)) return false;
  if (Math.abs(Math.floor(now / 1000) - ts) > toleranceSec) return false; // stale/replayed

  let expected;
  try {
    expected = createHmac('sha256', secret).update(`${t}.${rawBody}`, 'utf8').digest('hex');
  } catch {
    return false;
  }
  const expBuf = Buffer.from(expected, 'hex');
  for (const cand of v1) {
    let candBuf;
    try { candBuf = Buffer.from(cand, 'hex'); } catch { continue; }
    if (candBuf.length === expBuf.length && timingSafeEqual(candBuf, expBuf)) return true;
  }
  return false;
}

// Best-effort buyer identity from a Stripe Checkout Session.
export function extractBuyer(session = {}) {
  const cd = session.customer_details || {};
  const name = cd.name || (session.metadata && session.metadata.name) || null;
  const email = cd.email || session.customer_email || null;
  return { name, email };
}

// The exact command the owner runs on their Mac to mint this buyer's key. Perpetual
// by default; the owner can append `--expires YYYY-MM-DD` for a fixed term.
export function mintCommand({ name, email } = {}) {
  const who = String(name || email || 'New customer').replace(/["\\]/g, '\\$&');
  return `npm run licence:mint -- --name "${who}"`;
}

// ── fulfilment queue (private GitHub repo) — injectable for tests ─────────────
// A sale/refund record written to the queue repo; the owner's Helm polls it and
// mints/revokes LOCALLY (the signing key never exists here). Idempotent by path:
// GitHub returns 422 for an existing file, which we treat as already-queued.
const DEFAULT_QUEUE_REPO = 'inayatpanda/rqai-sales';

export function saleRecord(session = {}, { now = Date.now() } = {}) {
  const { name, email } = extractBuyer(session);
  return {
    type: 'sale',
    product: (session.metadata && session.metadata.product) || session.client_reference_id || null,
    name, email,
    amountTotal: session.amount_total ?? null,
    currency: session.currency || null,
    sessionId: session.id || null,
    paymentIntent: typeof session.payment_intent === 'string' ? session.payment_intent : (session.payment_intent && session.payment_intent.id) || null,
    subscription: typeof session.subscription === 'string' ? session.subscription : (session.subscription && session.subscription.id) || null,
    mode: session.mode || null, // 'payment' (one-off) | 'subscription'
    ts: new Date(now).toISOString(),
  };
}

export function refundRecord(charge = {}, { now = Date.now() } = {}) {
  return {
    type: 'refund',
    paymentIntent: typeof charge.payment_intent === 'string' ? charge.payment_intent : (charge.payment_intent && charge.payment_intent.id) || null,
    chargeId: charge.id || null,
    amountRefunded: charge.amount_refunded ?? null,
    email: (charge.billing_details && charge.billing_details.email) || charge.receipt_email || null,
    ts: new Date(now).toISOString(),
  };
}

// A paid subscription-cycle invoice → the Helm re-mints a fresh annual key.
// periodEnd is taken from the invoice's first line item (epoch seconds → ISO),
// guarded because Stripe omits it on some invoice shapes; the worker falls back
// to now + 1 year when it is null.
export function renewalRecord(invoice = {}, { now = Date.now() } = {}) {
  const line = invoice.lines && invoice.lines.data && invoice.lines.data[0];
  const periodEndEpoch = line && line.period && line.period.end;
  return {
    type: 'renewal',
    subscription: typeof invoice.subscription === 'string' ? invoice.subscription : (invoice.subscription && invoice.subscription.id) || null,
    invoiceId: invoice.id || null,
    paymentIntent: typeof invoice.payment_intent === 'string' ? invoice.payment_intent : (invoice.payment_intent && invoice.payment_intent.id) || null,
    periodEnd: Number.isFinite(periodEndEpoch) ? new Date(periodEndEpoch * 1000).toISOString() : null,
    amountPaid: invoice.amount_paid ?? null,
    email: invoice.customer_email || null, // a customer_name is NOT an email — no fallback
    ts: new Date(now).toISOString(),
  };
}

// The FIRST invoice of a new subscription (billing_reason 'subscription_create').
// Subscription-mode checkout sessions carry payment_intent = null, so the fulfilled
// sale's by-pi entry never covers the first period's charge. This minimal record
// ties that invoice's paymentIntent to the subscription so the worker can index it
// and a FIRST-PERIOD refund still auto-revokes. amountTotal = the invoice's
// amount_paid so the full/partial refund guard can verify. Never triggers a mint.
export function linkRecord(invoice = {}, { now = Date.now() } = {}) {
  return {
    type: 'link',
    subscription: typeof invoice.subscription === 'string' ? invoice.subscription : (invoice.subscription && invoice.subscription.id) || null,
    invoiceId: invoice.id || null,
    paymentIntent: typeof invoice.payment_intent === 'string' ? invoice.payment_intent : (invoice.payment_intent && invoice.payment_intent.id) || null,
    amountTotal: invoice.amount_paid ?? null,
    ts: new Date(now).toISOString(),
  };
}

export async function pushToQueue({ path, record, token, repo = DEFAULT_QUEUE_REPO, fetchImpl = fetch }) {
  const res = await fetchImpl(`https://api.github.com/repos/${repo}/contents/${path}`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'Content-Type': 'application/json',
      'User-Agent': 'rqai-stripe-webhook',
    },
    body: JSON.stringify({
      message: `queue: ${record.type} ${record.sessionId || record.paymentIntent || ''}`.trim(),
      content: Buffer.from(JSON.stringify(record, null, 2) + '\n', 'utf8').toString('base64'),
    }),
  });
  if (res.status === 422) return { ok: true, already: true };   // idempotent replay
  return { ok: !!res.ok, status: res.status };
}

// ── owner notification (Resend) — injectable for tests ────────────────────────
// Emails the OWNER the buyer details + the mint command. The licence KEY is never
// handled here (the owner mints locally and sends it).
export async function notifyOwner({ to, from = DEFAULT_FROM, name, email, apiKey, fetchImpl = fetch }) {
  const res = await fetchImpl('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from,
      to,
      subject: `New Studio purchase — ${name || email}`,
      text:
        `New Studio-access purchase.\n\n` +
        `Name:  ${name || '(none given)'}\n` +
        `Email: ${email}\n\n` +
        `Mint their key on your Mac:\n\n  ${mintCommand({ name, email })}\n\n` +
        `(add \`--expires YYYY-MM-DD\` for a fixed term), then email the printed ` +
        `IPL1.… key to ${email}.\n`,
    }),
  });
  return { ok: !!(res && res.ok), status: res ? res.status : 0 };
}

// ── the testable core ────────────────────────────────────────────────────────
// Returns { status, body } — no framework objects — so the handler and the tests
// share one code path. deps are injectable: { notify, verifySignature, now, fetchImpl }.
export async function handleStripeWebhook({ rawBody, signature, env = {}, deps = {} } = {}) {
  const {
    notify = notifyOwner,
    verifySignature = verifyStripeSignature,
    now = Date.now(),
    fetchImpl,
  } = deps;

  const webhookSecret = env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error('[stripe-webhook] INERT: STRIPE_WEBHOOK_SECRET is not set — cannot verify.');
    return { status: 500, body: { error: 'not_configured', message: 'Stripe seam inert: STRIPE_WEBHOOK_SECRET is not set.' } };
  }

  if (!verifySignature(rawBody, signature, webhookSecret, { now })) {
    return { status: 400, body: { error: 'bad_signature' } };
  }

  let event;
  try { event = JSON.parse(rawBody); } catch { return { status: 400, body: { error: 'invalid_json' } }; }

  const queueToken = env.GITHUB_QUEUE_TOKEN;
  const queueRepo = env.QUEUE_REPO || DEFAULT_QUEUE_REPO;
  const pushQueue = deps.pushQueue || pushToQueue;

  // Refunds → queue a revocation for the Helm to apply (auto-revoke on refund).
  if (event && event.type === 'charge.refunded') {
    const rec = refundRecord((event.data && event.data.object) || {}, { now });
    if (!rec.paymentIntent) return { status: 200, body: { received: true, refundQueued: false, reason: 'no_payment_intent' } };
    let refundQueued = false;
    if (queueToken) {
      try {
        const q = await pushQueue({ path: `queue/refund-${rec.paymentIntent}.json`, record: rec, token: queueToken, repo: queueRepo, fetchImpl });
        refundQueued = !!q.ok;
      } catch (e) { console.error('[stripe-webhook] refund queue threw:', e && e.message); }
    }
    console.log(`[stripe-webhook] refund ${rec.paymentIntent} queued=${refundQueued}`);
    return { status: 200, body: { received: true, refundQueued } };
  }

  // Subscription invoices. The FIRST invoice (billing_reason 'subscription_create')
  // never re-mints — the checkout.session.completed event already fulfils the first
  // period — but it DOES queue a LINK record (see linkRecord above) so a refund of
  // that first charge can be matched back to the licence. Later invoices
  // (subscription_cycle / subscription_update) queue a renewal re-mint.
  if (event && event.type === 'invoice.paid') {
    const invoice = (event.data && event.data.object) || {};
    const reason = invoice.billing_reason || null;
    if (reason === 'subscription_create') {
      const rec = linkRecord(invoice, { now });
      if (!rec.invoiceId || !rec.paymentIntent || !rec.subscription) {
        return { status: 200, body: { received: true, ignored: 'invoice.paid:subscription_create' } };
      }
      let linkQueued = false;
      if (queueToken) {
        try {
          const q = await pushQueue({ path: `queue/link-${rec.invoiceId}.json`, record: rec, token: queueToken, repo: queueRepo, fetchImpl });
          linkQueued = !!q.ok;
        } catch (e) { console.error('[stripe-webhook] link queue threw:', e && e.message); }
      }
      console.log(`[stripe-webhook] link ${rec.invoiceId} (first-period pi ${rec.paymentIntent}) queued=${linkQueued}`);
      return { status: 200, body: { received: true, linkQueued } };
    }
    if (reason !== 'subscription_cycle' && reason !== 'subscription_update') {
      return { status: 200, body: { received: true, ignored: `invoice.paid:${reason || 'unknown'}` } };
    }
    const rec = renewalRecord(invoice, { now });
    if (!rec.invoiceId || !rec.subscription) {
      return { status: 200, body: { received: true, renewalQueued: false, reason: 'missing_ids' } };
    }
    let renewalQueued = false;
    if (queueToken) {
      try {
        const q = await pushQueue({ path: `queue/renewal-${rec.invoiceId}.json`, record: rec, token: queueToken, repo: queueRepo, fetchImpl });
        renewalQueued = !!q.ok;
      } catch (e) { console.error('[stripe-webhook] renewal queue threw:', e && e.message); }
    }
    console.log(`[stripe-webhook] renewal ${rec.invoiceId} (${reason}) queued=${renewalQueued}`);
    return { status: 200, body: { received: true, renewalQueued } };
  }

  if (!event || event.type !== 'checkout.session.completed') {
    return { status: 200, body: { received: true, ignored: (event && event.type) || null } };
  }

  const session = (event.data && event.data.object) || {};
  const { name, email } = extractBuyer(session);
  if (!email) return { status: 400, body: { error: 'no_buyer_email' } };

  const cmd = mintCommand({ name, email });
  // Always log — the owner can read the Netlify function log even with no email set.
  console.log(`[stripe-webhook] purchase <${email}> (${name || 'no name'}). Mint: ${cmd}`);

  const resendKey = env.RESEND_API_KEY;
  const to = env.LICENCE_EMAIL_TO || env.LICENCE_EMAIL_FROM;
  let notified = false;
  if (resendKey && to) {
    try {
      const r = await notify({ to, from: env.LICENCE_EMAIL_FROM, name, email, apiKey: resendKey, fetchImpl });
      notified = !!(r && r.ok);
      if (!notified) console.error('[stripe-webhook] owner notify returned not-ok:', r && r.status);
    } catch (e) {
      console.error('[stripe-webhook] owner notify threw:', e && e.message);
    }
  }

  // Queue the sale for the Helm's fulfilment worker (auto-mint on the owner's
  // hardware). Without GITHUB_QUEUE_TOKEN this stays pure manual-with-assist.
  let queued = false;
  if (queueToken) {
    const rec = saleRecord(session, { now });
    if (rec.sessionId) {
      try {
        const q = await pushQueue({ path: `queue/sale-${rec.sessionId}.json`, record: rec, token: queueToken, repo: queueRepo, fetchImpl });
        queued = !!q.ok;
      } catch (e) { console.error('[stripe-webhook] sale queue threw:', e && e.message); }
    }
  }

  // Never mints; never echoes a key. Minting happens on the owner's Helm (queued)
  // or by hand (manual fallback) — the signing key never exists here either way.
  return { status: 200, body: { received: true, minted: false, mode: queued ? 'queued' : 'manual', notified, queued } };
}

// ── Netlify Functions v2 entry — (Request) => Response ────────────────────────
export default async function handler(req) {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'method_not_allowed' }), { status: 405, headers: { 'Content-Type': 'application/json' } });
  }
  const rawBody = await req.text();                       // exact bytes — needed for signature verification
  const signature = req.headers.get('stripe-signature') || '';
  const { status, body } = await handleStripeWebhook({ rawBody, signature, env: process.env });
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}
