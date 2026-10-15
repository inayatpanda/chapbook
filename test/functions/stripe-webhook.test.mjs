import { test } from 'node:test';
import assert from 'node:assert';
import {
  safeName,
  mintCommand,
  handleStripeWebhook,
  pushToQueue,
} from '../../netlify/functions/stripe-webhook.mjs';
test('safeName strips shell metacharacters', () => {
  assert.equal(safeName('Rob $(curl evil|sh)'), 'Rob curl evilsh');
  assert.equal(safeName('a`id`b'), 'aidb');
  assert.equal(safeName("O'Neil-Smith j.o@x.y"), "O'Neil-Smith j.o@x.y");
  assert.equal(safeName(''), 'New customer');
});

test('unpaid Checkout completion never queues a licence', async () => {
  let writes = 0;
  const response = await dispatch(checkoutEvent({ payment_status: 'unpaid' }), { deps: { pushQueue: async () => { writes++; return { ok: true }; } } });
  assert.equal(response.body.ignored, 'payment_not_confirmed');
  assert.equal(writes, 0);
});
test('confirmed delayed payment queues a licence', async () => {
  const event = checkoutEvent(); event.type = 'checkout.session.async_payment_succeeded';
  const response = await dispatch(event);
  assert.equal(response.body.queued, true);
});
test('live and sandbox webhook modes cannot cross', async () => {
  const event = { ...checkoutEvent(), livemode: false };
  assert.equal((await dispatch(event, { env: { STRIPE_MODE: 'live' } })).body.error, 'wrong_stripe_mode');
  const writes = [];
  const response = await dispatch(event, { env: { STRIPE_MODE: 'test' }, deps: { pushQueue: async entry => { writes.push(entry); return { ok: true }; } } });
  assert.equal(response.body.queued, true);
  assert.equal(writes[0].path, 'sandbox/queue/sale-cs_audioquill_1.json');
});
test('422 without an existing durable queue record is a failure', async () => {
  const result = await pushToQueue({ path: 'queue/sale-cs_1.json', record: { type: 'sale', sessionId: 'cs_1' }, token: 'test',
    fetchImpl: async (url, options) => Response.json({}, { status: options.method === 'PUT' ? 422 : 404 }) });
  assert.equal(result.ok, false);
});
test('confirmed duplicate queue record is safe to acknowledge', async () => {
  const record = { type: 'sale', sessionId: 'cs_1' };
  const result = await pushToQueue({ path: 'queue/sale-cs_1.json', record, token: 'test', fetchImpl: async (url, options) => options.method === 'PUT'
    ? Response.json({}, { status: 422 }) : Response.json({ content: Buffer.from(JSON.stringify(record)).toString('base64') }) });
  assert.equal(result.ok, true); assert.equal(result.already, true);
});
test('mintCommand contains no $ or backtick even for hostile names', () => {
  const cmd = mintCommand({ name: '$(touch /tmp/pwn)`id`"', email: 'a@b.c' });
  assert.ok(!/[$`]/.test(cmd), cmd);
});

function checkoutEvent(overrides = {}) {
  return {
    type: 'checkout.session.completed',
    data: {
      object: {
        id: 'cs_audioquill_1',
        client_reference_id: 'audioquill',
        mode: 'subscription',
        payment_status: 'paid',
        subscription: 'sub_1',
        customer_details: { name: 'Audio Quill Buyer', email: 'buyer@example.com' },
        ...overrides,
      },
    },
  };
}

async function dispatch(event, { env = {}, deps = {} } = {}) {
  return handleStripeWebhook({
    rawBody: JSON.stringify(event),
    signature: 'test-signature',
    env: {
      STRIPE_WEBHOOK_SECRET: 'test-webhook-secret',
      GITHUB_QUEUE_TOKEN: 'test-queue-token',
      ...env,
    },
    deps: {
      verifySignature: () => true,
      pushQueue: async () => ({ ok: true }),
      notify: async () => ({ ok: true }),
      now: Date.parse('2026-08-03T00:00:00.000Z'),
      ...deps,
    },
  });
}

test('paid checkout is acknowledged only after the sale is durably queued', async () => {
  const writes = [];
  const response = await dispatch(checkoutEvent(), {
    deps: { pushQueue: async (entry) => { writes.push(entry); return { ok: true }; } },
  });

  assert.equal(response.status, 200);
  assert.equal(response.body.mode, 'queued');
  assert.equal(response.body.queued, true);
  assert.equal(writes.length, 1);
  assert.equal(writes[0].path, 'queue/sale-cs_audioquill_1.json');
  assert.equal(writes[0].record.product, 'audioquill');
});

test('paid checkout returns 503 when the queue rejects the write so Stripe retries', async () => {
  const response = await dispatch(checkoutEvent(), {
    deps: { pushQueue: async () => ({ ok: false, status: 503 }) },
  });

  assert.equal(response.status, 503);
  assert.deepEqual(response.body, { received: false, error: 'queue_unavailable' });
});

test('paid checkout returns 503 when queue credentials are missing', async () => {
  const response = await dispatch(checkoutEvent(), {
    env: { GITHUB_QUEUE_TOKEN: '' },
  });

  assert.equal(response.status, 503);
  assert.equal(response.body.error, 'queue_unavailable');
});

test('idempotent Stripe replay does not duplicate the owner notification', async () => {
  let notifications = 0;
  const response = await dispatch(checkoutEvent(), {
    env: { RESEND_API_KEY: 'test-resend-key', LICENCE_EMAIL_TO: 'owner@example.com' },
    deps: {
      pushQueue: async () => ({ ok: true, already: true }),
      notify: async () => { notifications++; return { ok: true }; },
    },
  });

  assert.equal(response.status, 200);
  assert.equal(notifications, 0);
});

test('renewal and refund events return 503 when their durable queue write fails', async () => {
  const queueFailure = { pushQueue: async () => { throw new Error('queue offline'); } };
  const renewal = await dispatch({
    type: 'invoice.paid',
    data: { object: { id: 'in_1', billing_reason: 'subscription_cycle', subscription: 'sub_1' } },
  }, { deps: queueFailure });
  const refund = await dispatch({
    type: 'charge.refunded',
    data: { object: { id: 'ch_1', payment_intent: 'pi_1', amount_refunded: 2900 } },
  }, { deps: queueFailure });

  assert.equal(renewal.status, 503);
  assert.equal(refund.status, 503);
});

test('partial then full refund are durably queued as distinct cumulative amounts', async () => {
  const paths = [];
  for (const amount of [100, 4900]) {
    const r = await dispatch({ id: `evt_${amount}`, type: 'charge.refunded', data: { object: { id: 'ch_1', payment_intent: 'pi_1', amount_refunded: amount } } }, { deps: { pushQueue: async e => { paths.push(e.path); return { ok: true }; } } });
    assert.equal(r.body.refundQueued, true);
  }
  assert.notEqual(paths[0], paths[1]);
});
test('pending trial aliases acknowledge the same durable request', async () => {
  const existing = { type: 'trial', email: 'some.one+first@googlemail.com' };
  const result = await pushToQueue({ path: 'queue/trial-1.json', record: { type: 'trial', email: 'someone+second@gmail.com' }, token: 'test', fetchImpl: async (url, options) => options.method === 'PUT'
    ? Response.json({}, { status: 422 }) : Response.json({ content: Buffer.from(JSON.stringify(existing)).toString('base64') }) });
  assert.equal(result.ok, true);
});

test('current Stripe invoice format queues a first-invoice link without an expanded payment', async () => {
  const writes = [];
  const response = await dispatch({ type: 'invoice.paid', data: { object: { id: 'in_new', billing_reason: 'subscription_create', parent: { subscription_details: { subscription: 'sub_new' } }, amount_paid: 4900 } } }, { deps: { pushQueue: async e => { writes.push(e); return { ok: true }; } } });
  assert.equal(response.body.linkQueued, true);
  assert.equal(writes[0].record.subscription, 'sub_new');
  assert.equal(writes[0].record.paymentIntent, null);
});
test('current invoice payment event queues a durable invoice-to-payment join', async () => {
  const writes = [];
  const response = await dispatch({ type: 'invoice_payment.paid', data: { object: { id: 'inpay_new', invoice: 'in_new', payment: { type: 'payment_intent', payment_intent: 'pi_new' }, amount_paid: 4900 } } }, { deps: { pushQueue: async e => { writes.push(e); return { ok: true }; } } });
  assert.equal(response.body.paymentQueued, true);
  assert.equal(writes[0].record.invoiceId, 'in_new');
  assert.equal(writes[0].record.paymentIntent, 'pi_new');
});


test('a confirmed GitHub 409 duplicate is acknowledged safely', async () => {
  const record = { type: 'payment', paymentId: 'inpay_1', invoiceId: 'in_1' };
  const result = await pushToQueue({ path: 'queue/payment-inpay_1.json', record, token: 'test', fetchImpl: async (url, options) => options.method === 'PUT'
    ? Response.json({}, { status: 409 }) : Response.json({ content: Buffer.from(JSON.stringify(record)).toString('base64') }) });
  assert.equal(result.already, true);
});
test('concurrent queue commits retry a branch-head conflict when no file exists', async () => {
  let writes = 0;
  const result = await pushToQueue({ path: 'queue/sale-cs_1.json', record: { type: 'sale', sessionId: 'cs_1' }, token: 'test', fetchImpl: async (url, options) => options.method === 'PUT'
    ? Response.json({}, { status: ++writes === 1 ? 409 : 201 }) : Response.json({}, { status: 404 }) });
  assert.equal(result.ok, true); assert.equal(writes, 2);
});
