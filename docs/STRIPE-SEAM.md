# Stripe → sales queue → Helm-minted licences (`stripe-webhook.mjs`)

A **stateless** Netlify function that turns a completed Stripe checkout (or a
refund) into a **record on a private queue repo**. It **never mints** and **never
holds the licence signing key** — the owner's Helm polls the queue, mints/revokes
**locally**, and emails the buyer. It stores nothing and shares no state with
`gh-device.mjs`.

> This is a **seam**. No live Stripe/email keys are committed. The function is
> **inert until `STRIPE_WEBHOOK_SECRET` is set** — without it it verifies nothing
> and returns `500 not_configured`.

## The chosen model: queue → Helm auto-mint

The owner's decision (**2026-07-08**, key model **C** in the sales-pipeline spec):
**mint on the owner's own hardware via a queue.** The Ed25519 **signing key** is the
crown jewel of the paid product — anyone holding it can forge unlimited valid keys,
and the only recovery is re-keying, which invalidates *every* existing customer. So
it stays **off public hosts**, consistent with the rest of the architecture (AI /
GitHub tokens are never on Netlify either).

How it flows:

1. **Checkout completes** → this function verifies the Stripe signature, emails the
   owner a notification (as before), and **writes `queue/sale-<sessionId>.json`** to
   the private queue repo `inayatpanda/rqai-sales`. Record:
   `{ type, product, name, email, amountTotal, currency, sessionId, paymentIntent,
   subscription, mode, ts }`. Idempotent by filename (a duplicate webhook delivery
   is a no-op).
2. **Refund** (`charge.refunded`) → writes `queue/refund-<paymentIntent>.json`
   `{ type, paymentIntent, chargeId, amountRefunded, email, ts }`. Sales carry
   `paymentIntent` so a refund can be matched back to the sale it revokes.
3. **Renewal** (`invoice.paid`) → writes `queue/renewal-<invoiceId>.json`
   `{ type, subscription, invoiceId, paymentIntent, periodEnd, amountPaid, email, ts }`.
   The FIRST invoice of a new subscription (`billing_reason: subscription_create`)
   never re-mints — the checkout event already fulfils the first period — but it
   queues a minimal **`queue/link-<invoiceId>.json`** `{ type, subscription,
   invoiceId, paymentIntent, amountTotal, ts }` instead: subscription-mode checkout
   sessions carry `payment_intent: null`, so without the link a refund of the FIRST
   charge could never be matched back to the licence. Only `subscription_cycle` /
   `subscription_update` invoices queue a renewal re-mint.
4. **Helm's fulfilment worker** (`scripts/fulfil-sales.mjs`, launchd timer every 5 min
   + on wake — installed by `scripts/install-fulfil.sh`) polls the queue, mints the
   licence **locally**, emails the buyer their `IPL1.…` key with activation steps, and
   moves the record to `done/`. **Terms:** `consultantprep` is a ONE-OFF (perpetual
   key); every other product is an ANNUAL subscription — the key expires one year in
   (+ 7 days grace) and each paid renewal invoice mints a FRESH key emailed to the
   buyer (the by-sub index in the queue repo links a Stripe subscription to its
   current licence; link records index the first period's charge for refunds, waiting
   for the sale to fulfil first and parking only after 24 h). Refunds `revokeLicence()`
   + republish the signed revocation list — **note: revoking the key does NOT cancel
   the Stripe subscription; when refunding a subscriber, also cancel the subscription
   in Stripe or future renewal invoices will keep minting new keys** (the owner
   notification repeats this). The licence key never touches Netlify and is never
   echoed in the HTTP response.

**Manual-with-assist is now the FALLBACK, not the model.** If a record cannot be
fulfilled automatically (unknown product, missing buyer email, an unmatched refund)
the worker **parks** it (`done/parked-…json` + owner notification) and the owner
handles it by hand with `npm run licence:mint`. If Helm is asleep the queue simply
accumulates and drains on the next wake; buyers are told "your key arrives by email
shortly".

## Env vars (owner-set in Netlify — NEVER committed)

| Var | Needed | Notes |
| --- | --- | --- |
| `STRIPE_WEBHOOK_SECRET` | **required** | `whsec_…` from the Stripe webhook endpoint. Without it the function is inert (`500 not_configured`). |
| `GITHUB_QUEUE_TOKEN` | **required for auto-mint** | Fine-grained PAT, **contents read/write on `inayatpanda/rqai-sales` ONLY**. Without it the function stays pure manual-with-assist (`mode:"manual"`, nothing queued). |
| `QUEUE_REPO` | optional | Override the queue repo (default `inayatpanda/rqai-sales`). |
| `RESEND_API_KEY` | optional | Email provider key (Resend) for the **owner** notification. Without it, purchases are only **logged** to the Netlify function log. |
| `LICENCE_EMAIL_TO` | optional | Where to notify the owner (defaults to `LICENCE_EMAIL_FROM`). |
| `LICENCE_EMAIL_FROM` | optional | From address, e.g. `Studio <keys@yourdomain>`. Defaults to a Resend test sender. |

There is **no signing-key env var** — by design. The buyer's key email is sent by
**Helm** (Resend, from the Helm config below), not by this function.

## Helm config (`config/config.json` — gitignored, never committed)

The fulfilment worker reads a `fulfil` block:

```jsonc
"fulfil": {
  "enabled": true,                       // false / absent → the worker is a clear-logged no-op
  "queueRepo": "inayatpanda/rqai-sales", // optional; this is the default
  "token": "github_pat_…",               // optional; else `gh auth token`, else config.github.token
  "resendKey": "re_…",                   // optional; without it the buyer email is a manual owner task
  "emailFrom": "Inayat Panda <keys@rqai.co.uk>",
  "notifyTo": "inayatc2002@gmail.com"    // owner notifications (parks, refunds, manual-send)
}
```

Auth resolution mirrors `scripts/backup-git.js`: `config.fulfil.token` →
`gh auth token` (probed on a launchd-safe PATH) → `config.github.token` (last resort).
The signing key is loaded from `config/.licence-key.json` (gitignored). If neither a
token nor a signing key is available the worker skips the pass cleanly.

> **Resend sender caveat — sort this before real sales.** The worker's default From
> address is Resend's test sender (`onboarding@resend.dev`), which only delivers to
> **the Resend account owner's own inbox** — a buyer will never receive it. Real
> buyer delivery needs a **verified domain** in Resend (Domains → add e.g.
> `rqai.co.uk`, publish the DNS records) and `config.fulfil.emailFrom` set to an
> address on that domain, e.g. `"Inayat Panda <keys@rqai.co.uk>"`. Until then the
> worker still mints and records each sale, but treat buyer emails as undeliverable
> and expect manual-send notifications instead.

Install the timer on the owner's Mac:

```bash
bash scripts/install-fulfil.sh              # install / reinstall + run one pass
bash scripts/install-fulfil.sh --uninstall  # stop + remove the timer
node scripts/fulfil-sales.mjs --dry-run     # print intended actions, mutate nothing
```

## Behaviour summary

| Situation | Response |
| --- | --- |
| `STRIPE_WEBHOOK_SECRET` unset | `500 not_configured` |
| Bad / stale signature | `400 bad_signature` |
| Event ≠ `checkout.session.completed` / `charge.refunded` / `invoice.paid` | `200 { ignored }` |
| Checkout with no buyer email | `400 no_buyer_email` |
| Valid checkout, `GITHUB_QUEUE_TOKEN` set | `200 { minted:false, mode:"queued", queued:true }` |
| Valid checkout, no queue token | `200 { minted:false, mode:"manual", queued:false }` (logged) |
| `charge.refunded`, queue token set | `200 { received:true, refundQueued:true }` |
| `invoice.paid` (subscription_create, has paymentIntent) | `200 { received:true, linkQueued:true }` — first-period refund link |
| `invoice.paid` (subscription_create, no paymentIntent) | `200 { ignored }` |
| `invoice.paid` (subscription_cycle/update) | `200 { received:true, renewalQueued:true }` |

It **never** returns `minted:true` — minting is always on the owner's Helm.

## Owner one-time setup (when you're ready to sell)

1. **Per app: a Stripe Product + Payment Link.** Give each app its own Product and
   its own price. On the Payment Link (or the Product), set
   **`metadata.product = <licence product id>`** — the id must match a product in the
   Helm Licences tab (e.g. `topp`, `studio`, `consultantprep`). The worker parks any
   sale whose `metadata.product` is missing or unknown.
   **⚠ Term default:** products not listed in `PRODUCT_TERMS`
   (`scripts/fulfil-sales.mjs`) default to **annual** — any future ONE-OFF product
   must be added to that map as `'perpetual'` or its keys will expire after a year.
2. **One webhook endpoint** → `https://<studio-host>/.netlify/functions/stripe-webhook`,
   subscribed to **`checkout.session.completed`**, **`charge.refunded`** (drives
   auto-revoke) *and* **`invoice.paid`** (drives subscription renewals). Copy its
   signing secret into `STRIPE_WEBHOOK_SECRET`. Subscription products use a
   recurring price on the Payment Link; `consultantprep` stays a one-time price.
3. **Create the private queue repo** `inayatpanda/rqai-sales`, mint a fine-grained PAT
   with contents read/write **on that repo only**, and set it as `GITHUB_QUEUE_TOKEN`
   (Netlify → Site settings → Environment variables). The queue repo is private —
   records hold buyer name/email, so add a privacy note to the storefront.
4. (Optional) set `RESEND_API_KEY` + `LICENCE_EMAIL_TO` so purchases also email you.
5. **On the Mac:** fill in the `config.fulfil` block, then
   `bash scripts/install-fulfil.sh`. Test with Stripe's test-mode webhook — the sale
   should land in `queue/`, and within ~5 min move to `done/sale-…json` with the buyer
   emailed their key.

## Module boundary (why it deploys cleanly)

This function imports **only `node:crypto`** — no code outside `studio-app/`. An
earlier auto-mint version imported the signing core from the repo root
(`../../../scripts/licence-core.mjs`), which Netlify could not bundle, so the function
502'd on load. Keeping it self-contained — it only ever writes a **queue record**, and
the signing core lives on the Helm — is what keeps both the deploy and the crown-jewel
key safe.
