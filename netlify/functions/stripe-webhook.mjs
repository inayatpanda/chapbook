// Stripe → RQAI licence fulfilment queue. STATELESS.
//
// On a Stripe `checkout.session.completed`, this verifies the webhook signature,
// extracts the buyer's name/email, and writes an idempotent record to a private
// queue. A private cloud worker consumes the record, signs and emails the key.
// This function NEVER mints and NEVER holds the licence signing key.
//
// The Ed25519 signing key is kept in private worker secrets, off public hosts. Queue failure returns 503 so Stripe retries the event; a paid
// event must never receive a successful acknowledgement before it is durable.
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

// Whitelist a buyer-supplied name to a safe charset BEFORE it enters any command
// string or queue record. Stripe puts the buyer's typed name here, so `$(…)`, back-
// ticks, `"` and `\` would otherwise execute as shell on the machine that holds the
// Ed25519 signing key (the owner runs the printed `licence:mint` command locally).
// Allow only word chars, space, dot, @, apostrophe and hyphen; collapse whitespace;
// cap length; fall back to a neutral label when nothing safe remains.
export function safeName(raw) {
  const s = String(raw || '').replace(/[^\w .@'-]/g, '').replace(/\s+/g, ' ').trim().slice(0, 80);
  return s || 'New customer';
}

// The exact command the owner runs on their Mac to mint this buyer's key. Perpetual
// by default; the owner can append `--expires YYYY-MM-DD` for a fixed term. The name
// is whitelisted via safeName so a crafted checkout cannot inject shell.
export function mintCommand({ name, email } = {}) {
  const who = safeName(name || email);
  return `npm run licence:mint -- --name "${who}"`;
}

// ── fulfilment queue (private GitHub repo) — injectable for tests ─────────────
// Sale/refund records are durably queued for the private fulfilment worker.
// Existing records must be verified before an idempotent replay is acknowledged.
const DEFAULT_QUEUE_REPO = 'inayatpanda/rqai-sales';

export function saleRecord(session = {}, { now = Date.now() } = {}) {
  const { name, email } = extractBuyer(session);
  return {
    type: 'sale',
    product: (session.metadata && session.metadata.product) || session.client_reference_id || null,
    // Whitelisted before it lands in the queue: the Helm's fulfilment worker builds a
    // shell `licence:mint` from this field, so a raw buyer name would be RCE there too.
    name: safeName(name || email), email,
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
const stripeId = value => typeof value === 'string' ? value : value?.id || null;
const invoiceSubscription = invoice => stripeId(invoice.subscription || invoice.parent?.subscription_details?.subscription);
const invoicePaymentIntent = invoice => stripeId(invoice.payment_intent || invoice.payments?.data?.find(p => p.status === 'paid' && p.payment?.payment_intent)?.payment.payment_intent);

export function renewalRecord(invoice = {}, { now = Date.now() } = {}) {
  const line = invoice.lines && invoice.lines.data && invoice.lines.data[0];
  const periodEndEpoch = line && line.period && line.period.end;
  return {
    type: 'renewal',
    subscription: invoiceSubscription(invoice),
    invoiceId: invoice.id || null,
    paymentIntent: invoicePaymentIntent(invoice),
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
    subscription: invoiceSubscription(invoice),
    invoiceId: invoice.id || null,
    paymentIntent: invoicePaymentIntent(invoice),
    amountTotal: invoice.amount_paid ?? null,
    ts: new Date(now).toISOString(),
  };
}

export function canonicalTrialEmail(email) {
  const value = String(email || '').trim().toLowerCase();
  const parts = /^([^@]+)@(.+)$/.exec(value);
  if (!parts) return value;
  let local = parts[1].split('+')[0];
  const domain = parts[2] === 'googlemail.com' ? 'gmail.com' : parts[2];
  if (domain === 'gmail.com') local = local.replace(/\./g, '');
  return `${local}@${domain}`;
}

export async function pushToQueue({ path, record, token, repo = DEFAULT_QUEUE_REPO, fetchImpl = fetch }) {
  const url = `https://api.github.com/repos/${repo}/contents/${path}`;
  const headers = { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json',
    'Content-Type': 'application/json', 'User-Agent': 'rqai-stripe-webhook' };
  const body = JSON.stringify({ message: `queue: ${record.type} ${record.sessionId || record.paymentIntent || ''}`.trim(),
    content: Buffer.from(JSON.stringify(record, null, 2) + '\n', 'utf8').toString('base64') });
  for (let attempt = 0; attempt < 3; attempt++) {
    const res = await fetchImpl(url, { method: 'PUT', headers, body, signal: AbortSignal.timeout(10_000) });
    if (res.ok) return { ok: true, status: res.status };
    if (res.status !== 409 && res.status !== 422) return { ok: false, status: res.status };
    // Both codes can mean an existing file; neither proves durability. 409 can
    // also be a branch-head race when separate Stripe events arrive together.
    const check = await fetchImpl(url, { headers, signal: AbortSignal.timeout(10_000) });
    if (check.ok) {
      const file = await check.json().catch(() => null);
      try {
        const existing = JSON.parse(Buffer.from(file.content, 'base64').toString('utf8'));
        const same = existing.type === record.type && (record.type === 'trial'
          ? canonicalTrialEmail(existing.email) === canonicalTrialEmail(record.email)
          : (existing.sessionId || existing.paymentId || existing.invoiceId || existing.paymentIntent) === (record.sessionId || record.paymentId || record.invoiceId || record.paymentIntent));
        if (same) return { ok: true, already: true };
      } catch { /* a corrupt record is not a successful write */ }
    }
    if (res.status !== 409 || check.status !== 404 || attempt === 2) return { ok: false, status: res.status };
    await new Promise(resolve => setTimeout(resolve, 100 * (attempt + 1)));
  }
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
  if ((env.STRIPE_MODE === 'live' && event?.livemode !== true) || (env.STRIPE_MODE === 'test' && event?.livemode !== false)) {
    return { status: 400, body: { error: 'wrong_stripe_mode' } };
  }

  const queueToken = env.GITHUB_QUEUE_TOKEN;
  const queueRepo = env.QUEUE_REPO || DEFAULT_QUEUE_REPO;
  const pushQueue = deps.pushQueue || pushToQueue;

  const queueOrRetry = async ({ label, path, record }) => {
    if (!queueToken) {
      console.error(`[stripe-webhook] ${label} queue unavailable: GITHUB_QUEUE_TOKEN is not set`);
      return { ok: false, response: { status: 503, body: { received: false, error: 'queue_unavailable' } } };
    }
    try {
      const queuePath = env.STRIPE_MODE === 'test' ? `sandbox/${path}` : path;
      const result = await pushQueue({ path: queuePath, record, token: queueToken, repo: queueRepo, fetchImpl });
      if (result && result.ok) return { ok: true, already: !!result.already };
      console.error(`[stripe-webhook] ${label} queue returned not-ok:`, result && result.status);
    } catch (error) {
      console.error(`[stripe-webhook] ${label} queue threw:`, error && error.message);
    }
    return { ok: false, response: { status: 503, body: { received: false, error: 'queue_unavailable' } } };
  };

  // Refunds → queue a revocation for the Helm to apply (auto-revoke on refund).
  if (event && event.type === 'charge.refunded') {
    const rec = { ...refundRecord((event.data && event.data.object) || {}, { now }), eventId: event.id || null };
    if (!rec.paymentIntent) return { status: 200, body: { received: true, refundQueued: false, reason: 'no_payment_intent' } };
    const queued = await queueOrRetry({
      label: `refund ${rec.paymentIntent}`,
      // Each cumulative refund amount gets its own record: a later full refund
      // must not disappear behind an earlier queued partial refund.
      path: `queue/refund-${rec.paymentIntent}-${rec.amountRefunded ?? 'unknown'}.json`,
      record: rec,
    });
    if (!queued.ok) return queued.response;
    console.log(`[stripe-webhook] refund ${rec.paymentIntent} queued=true`);
    return { status: 200, body: { received: true, refundQueued: true } };
  }

  // Current Stripe API versions send invoice payment identity separately from
  // invoice.paid. This record joins it after the invoice's licence is available.
  if (event?.type === 'invoice_payment.paid') {
    const payment = event.data?.object || {};
    const record = { type: 'payment', invoiceId: stripeId(payment.invoice), paymentId: payment.id,
      paymentIntent: stripeId(payment.payment?.payment_intent), amountPaid: payment.amount_paid ?? null,
      ts: new Date(now).toISOString() };
    if (!record.invoiceId || !record.paymentId || !record.paymentIntent) {
      return { status: 200, body: { received: true, ignored: 'invoice_payment_without_intent' } };
    }
    const queued = await queueOrRetry({ label: `payment ${record.paymentId}`, path: `queue/payment-${record.paymentId}.json`, record });
    return queued.ok ? { status: 200, body: { received: true, paymentQueued: true } } : queued.response;
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
      if (!rec.invoiceId || !rec.subscription) {
        return { status: 200, body: { received: true, ignored: 'invoice.paid:subscription_create' } };
      }
      const queued = await queueOrRetry({
        label: `link ${rec.invoiceId}`,
        path: `queue/link-${rec.invoiceId}.json`,
        record: rec,
      });
      if (!queued.ok) return queued.response;
      console.log(`[stripe-webhook] link ${rec.invoiceId} (first-period pi ${rec.paymentIntent}) queued=true`);
      return { status: 200, body: { received: true, linkQueued: true } };
    }
    if (reason !== 'subscription_cycle' && reason !== 'subscription_update') {
      return { status: 200, body: { received: true, ignored: `invoice.paid:${reason || 'unknown'}` } };
    }
    const rec = renewalRecord(invoice, { now });
    if (!rec.invoiceId || !rec.subscription) {
      return { status: 200, body: { received: true, renewalQueued: false, reason: 'missing_ids' } };
    }
    const queued = await queueOrRetry({
      label: `renewal ${rec.invoiceId}`,
      path: `queue/renewal-${rec.invoiceId}.json`,
      record: rec,
    });
    if (!queued.ok) return queued.response;
    console.log(`[stripe-webhook] renewal ${rec.invoiceId} (${reason}) queued=true`);
    return { status: 200, body: { received: true, renewalQueued: true } };
  }

  if (!event || !['checkout.session.completed', 'checkout.session.async_payment_succeeded'].includes(event.type)) {
    return { status: 200, body: { received: true, ignored: (event && event.type) || null } };
  }

  const session = (event.data && event.data.object) || {};
  // Delayed payment methods complete Checkout before payment is confirmed.
  // Only paid sessions (including a valid zero-total purchase) may unlock access.
  if (!['paid', 'no_payment_required'].includes(session.payment_status)) {
    return { status: 200, body: { received: true, ignored: 'payment_not_confirmed' } };
  }
  const { name, email } = extractBuyer(session);
  if (!email) return { status: 400, body: { error: 'no_buyer_email' } };

  // Keep buyer PII out of provider logs. The durable private queue contains the
  // delivery address; operational logs need only the Stripe session identifier.
  console.log(`[stripe-webhook] verified purchase session ${session.id || '(missing id)'}`);

  // Queue the sale for the private cloud worker. Stripe retries a 503 if
  // durability cannot be established.
  const rec = saleRecord(session, { now });
  if (!rec.sessionId) return { status: 400, body: { error: 'missing_session_id' } };
  const queued = await queueOrRetry({
    label: `sale ${rec.sessionId}`,
    path: `queue/sale-${rec.sessionId}.json`,
    record: rec,
  });
  if (!queued.ok) return queued.response;

  // Owner notification is best-effort and only sent for a newly-created queue
  // record. Stripe retries/idempotent replays must not produce duplicate email.
  const resendKey = env.RESEND_API_KEY;
  const to = env.LICENCE_EMAIL_TO || env.LICENCE_EMAIL_FROM;
  let notified = false;
  if (!queued.already && resendKey && to) {
    try {
      const r = await notify({ to, from: env.LICENCE_EMAIL_FROM, name, email, apiKey: resendKey, fetchImpl });
      notified = !!(r && r.ok);
      if (!notified) console.error('[stripe-webhook] owner notify returned not-ok:', r && r.status);
    } catch (e) {
      console.error('[stripe-webhook] owner notify threw:', e && e.message);
    }
  }

  // Never mints or echoes a key. Only the private worker holds the signing key.
  return { status: 200, body: { received: true, minted: false, mode: 'queued', notified, queued: true } };
}

// ── Netlify Functions v2 entry — (Request) => Response ────────────────────────
export default async function handler(req) {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'method_not_allowed' }), { status: 405, headers: { 'Content-Type': 'application/json' } });
  }
  const rawBody = await req.text();                       // exact bytes — needed for signature verification
  const signature = req.headers.get('stripe-signature') || '';
  const { status, body } = await handleStripeWebhook({ rawBody, signature, env: { ...process.env, STRIPE_MODE: 'live' } });
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}
