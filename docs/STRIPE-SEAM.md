# Stripe and trial licence delivery

Production fulfilment runs in the private `inayatpanda/rqai-sales` repository using GitHub Actions. It does not depend on the owner's Mac, Helm app or local timer being awake. Netlify only verifies events and writes queue records; it has no licence-signing key.

## Public endpoints

- `/.netlify/functions/stripe-webhook`: POST with a valid Stripe signature and `livemode: true`.
- `/.netlify/functions/trial-request`: validated trial request, canonical-email deduplication and per-instance abuse throttling.

Stripe destination `we_1TrDFvGciDSC4LkGdBp6Y1dW` uses API version `2026-06-24.dahlia` and listens to:

- `checkout.session.completed`
- `checkout.session.async_payment_succeeded`
- `invoice.paid`
- `invoice_payment.paid`
- `charge.refunded`

Only paid or valid zero-total Checkout sessions are fulfilled. An unpaid delayed-payment session waits for its success event. The product identifier comes from `metadata.product` or `client_reference_id`; Chapbook uses `studio`.

Both older invoice fields and current `parent.subscription_details` / separate invoice-payment events are supported. First invoices establish payment-to-licence links; subscription-cycle invoices deliver renewed keys. Refund records distinguish cumulative amounts, so a partial refund followed by a full refund cannot be lost as a duplicate.

## Durable processing and recovery

Queue writes must succeed before Stripe receives HTTP 200. Missing credentials, failed writes and unconfirmed conflicts return HTTP 503 for Stripe to retry. GitHub 409/422 responses are only acknowledged after reading the existing matching record. A transient branch-head conflict gets bounded retries.

A queue commit triggers the hosted worker. A half-hour schedule provides a fallback for interrupted runs and deferred retries; GitHub schedules can be delayed. Delivery normally starts within seconds or minutes, but there is no guaranteed dispatch-time SLA.

The worker persists an AES-256-GCM encrypted ledger before sending any licence email. It reuses the same key after an interruption, uses Resend idempotency keys, writes payment indexes before completion markers, and serialises hosted runs. Buyer email failures retain the order for bounded retries; exhausted retries generate an owner notice for manual support. A provider acceptance ID is recorded, while actual delivery/bounce status is visible in Resend.

Trials last seven days. Email aliases reuse the original trial and expiry. Requests within the resend cooldown do not send another email. Trial emails include the activation link and actual original expiry, so a resend does not promise another seven days. Annual paid keys include seven days of expiry grace; each successful renewal issues a fresh key.

A full refund revokes the key linked to that payment. Partial or unverifiable refunds are parked for owner review. Early refund/payment-link events wait for their corresponding sale rather than immediately becoming orphaned. Refunds do not themselves cancel a Stripe subscription; cancel the subscription separately if future renewals should stop.

## Secrets and support records

The private workflow uses encrypted Actions secrets for the signing key, Resend key, notification address and revocation-repository credential. Netlify retains its existing webhook secret and queue-only GitHub credential. No payment API secret is needed on the public website.

The verified sender is `RQAI <hello@send.rqai.co.uk>`, under the Resend account `inayatpanda1@gmail.com`. The existing Resend key is sending-only; a failed domain-list request is not proof that this key cannot send mail.

`state/control.json` is authoritative:

- `cloud`: Actions delivers; Helm's timer only imports the encrypted ledger into its local support database.
- `paused`: neither worker delivers.
- `local`: explicit rollback to the original Mac worker, with the cloud workflow disabled first.

Helm preserves locally minted keys and local revocations during import. Revocation publishers verify and union the existing signed list, so a stale local database cannot undo a cloud revocation. Product registry changes currently need to be reflected in the cloud ledger as well; importing support records is one-way and is not a general bidirectional database sync.

## Operations

- Actions: <https://github.com/inayatpanda/rqai-sales/actions/workflows/fulfil.yml>
- Health: `state/health.json` in that private repository contains the last run, counters and remaining queue size.
- Helm sync: `node scripts/fulfil-sales.mjs`; `--dry-run` reads without importing.
- Inspect `done/parked-*.json`, failed Actions runs and Resend delivery events when investigating an order.
- Keep failed or queued orders intact. Do not reset the ledger or mint replacement keys merely because delivery was interrupted.
- To pause: set `state/control.json` to `paused`. To roll back, disable `FULFIL_ENABLED`, wait for any running cloud job to finish, sync the cloud ledger into Helm, then explicitly choose `local` mode. This restores the Mac dependency.

## Launch verification, 15 October 2026

A real Stripe sandbox Checkout, an annual renewal advanced with a test clock, partial/full refunds, email delivery, duplicate recovery and signed revocations were exercised. Sandbox keys and state were isolated under `sandbox/` with an independent signing key. The test subscriptions were cancelled.

The payment test used Stripe's official CLI with an existing sandbox-only key and a temporary local relay, followed by hosted cloud signing/email. Production Netlify signature verification and the public trial endpoint were tested separately. No live card charge was made. No extra broadly scoped Netlify secret or team-wide Stripe CLI authorization was added.

See [launch verification](launch-readiness-2026-10-15.md) for evidence and the remaining owner/legal and native-device checks.
