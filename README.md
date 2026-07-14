# Chapbook

Chapbook is a licence-gated, local-first blog composer that runs as a
Progressive Web App (PWA). Writers activate with a Studio-access key, compose
posts in the browser (all state kept locally), and publish to **their own
GitHub Pages repository** — the static blog and its media are committed straight
to the user's own Git-hosted site. Chapbook holds no server-side content: the
only backend surface is a small set of Netlify Functions for the licence-mint
webhook, the GitHub device-flow relay, and trial requests.

## Fork base

**Fork base (recorded verbatim):** `helm` snapshot at `/Users/inayatsmac/Desktop/Transferred to new mac/Inayat-website/helm`, branch `feat/literature-decoded`, commit `259544d` (2026-07-08) **plus uncommitted working-tree edits through 2026-07-12**. Canonical Air 2 offline at fork time; go-live commit `64fb912` reconstructed as: Buy link → `https://buy.stripe.com/5kQeVd0C06t7aSLf3IgUM05?client_reference_id=studio`.

**Reconciled against Air 2 canonical on 2026-07-14** — helm `feat/literature-decoded` HEAD = `64fb912` (the branch tip *is* the go-live commit). The only deployable-set files changed after the fork base were `index.html` (the Stripe link — captured byte-identical above) and `sw.js` (cache version — superseded by this fork's `chapbook-v1`). No un-captured canonical changes remained to port; the fork is current with canonical for the entire product. `trial-request.mjs` has no canonical committed equivalent — this fork is its sole version.

## Build, test, and deploy

All commands are run from the repository root.

| Command | What it does |
|---|---|
| `npm run build` | Bundles `src/` and emits the deployable static site to `dist/`. |
| `npm test` | Runs the full test suite (`node --test`). |
| `npm run deploy:draft` | Builds, then deploys a Netlify **draft** (preview) to site `d825cd70` — does not touch production. |
| `npm run deploy:prod` | Builds, then promotes to production. **Owner-gated — do not run.** |

The GitHub device-flow client id is supplied at deploy time via the
`STUDIO_GH_CLIENT_ID` environment variable, e.g.
`STUDIO_GH_CLIENT_ID=… npm run deploy:draft`.

## Helm boundary

Chapbook is a standalone product. It couples to the owner's private Helm (the Air 2
machine that holds the Ed25519 licence-signing key) at **exactly three** points, and no
others. All three are **one-way and asynchronous**; none is an inbound connection to
Helm; and Chapbook runs fully when Helm is offline.

| # | Touchpoint | Direction | Mechanism | Helm offline? |
|---|---|---|---|---|
| 1 | **Licence mint** (purchase / trial) | Chapbook → Helm | Stripe checkout → `netlify/functions/stripe-webhook.mjs` → append a record to the private queue repo `inayatpanda/rqai-sales` → Air 2 Helm worker mints the Ed25519 key locally + emails the buyer | Queue accumulates; fulfilled on return |
| 2 | **Licence revoke check** (refunds) | Helm → Chapbook | Helm publishes a signed `revoked.json` at a static URL; **⚠️ not yet wired into the shipped app** (see §2 caveat) | N/A (not currently implemented; design: fails open) |
| 3 | **Usage metrics** | Chapbook → Helm | `netlify/functions/metrics.mjs` increments per-day counters in a Netlify Blobs store; Helm **pulls** the tally on its own schedule | Events still counted; Helm reads later |

### 1. Licence mint — Chapbook → Helm (async, queued)

On a Stripe `checkout.session.completed`, `netlify/functions/stripe-webhook.mjs`
verifies the webhook signature (HMAC-SHA256, timing-safe, replay window) and appends a
JSON record to the **private queue repo `inayatpanda/rqai-sales`** via the GitHub
Contents API (`PUT …/contents/queue/<type>-<id>.json`, idempotent by path — a 422 for an
existing file is treated as already-queued). Record types: `sale`, `refund` (auto-revoke
on refund), `renewal`, and `link` (first subscription invoice). The Air 2 Helm worker
(`scripts/fulfil-sales.mjs`, out of this repo) polls the queue, **mints the Ed25519 key
locally, and emails the buyer their `IPL1.…` key.**

The webhook **never mints and never holds the signing key** — the crown jewel stays on
the owner's own machine, off public hosts. It is async: if Air 2 is offline the queue
simply accumulates and is fulfilled when the machine returns. Without a
`GITHUB_QUEUE_TOKEN` the function degrades to manual-with-assist (it logs / emails the
owner a pre-filled `licence:mint` command).

### 2. Licence revoke check — Helm → Chapbook (one-way, read-only, fails open)

> **⚠️ Not yet wired into the shipped app:** the live gate (`src/index.html` `verifyLicence`, ~line 18735) currently verifies signature + expiry only. The revocation fetch logic lives in the Helm-generated `licence-client.js` template (`src/lib/templates/licence-client.js`, with `__REVOKED_URL__` placeholder), which is not currently bundled into `dist/` — so refunded keys are not client-side revoked today. Wiring the revoke check into the inline gate (or bundling `licence-client.js`) is an open follow-up.

Helm publishes a signed revocation list (an `IPLR1.…` token) as static data at:

```
https://inayatpanda.com/licences/revoked.json
```

The licence client (`src/lib/templates/licence-client.js`, generated by Helm's licence
manager — its `__REVOKED_URL__` placeholder resolves to the URL above) fetches it
**best-effort**: at most once per 24 h, with a 3 s timeout, and only a successfully
fetched **and Ed25519 signature-valid** list ever updates the cache (a tampered host
cannot poison it), with a monotonic guard so a validly signed but older list never
replaces a newer cached one. It **fails open** — unreachable ⇒ fall back to the last
cached list; never fetched ⇒ the key is allowed. A revoked `jti` yields
`reason: 'revoked'`.

This is the **single deliberate `inayatpanda.com` (owner-domain) reference permitted in
the whole product**: it is Helm-published static data, the coupling is one-way and
read-only, and it never blocks activation. Accordingly it is the **one allowlisted
exception** in the release grep gate (see *Enforcement* below), which allowlists this
exact string.

### 3. Usage metrics — Chapbook → Helm (anonymous, pull-based)

The client fires an anonymous, fire-and-forget beacon at most **once per browser per
type** (a `localStorage` once-flag; never blocks the caller):

```
POST /.netlify/functions/metrics   {"type":"activate"|"install"|"visit"}   → 204
```

`netlify/functions/metrics.mjs` increments per-day counters in the site-scoped **Netlify
Blobs store `metrics`**, keyed by calendar day (`YYYY-MM-DD`). Helm **pulls** the tally
on its own schedule:

```
GET /.netlify/functions/metrics?day=YYYY-MM-DD
→ 200 {"activate":<n>,"install":<n>,"visit":<n>}   (or {} for a day with no events)
```

Any other method returns 405; a bad `type` or malformed `day` returns 400. **Privacy is
enforced by design: the only thing ever persisted is the aggregated per-day counts — no
PII, no IP address, no licence key, and no request body beyond the `{type}`
discriminant.**

### Enforcement

`scripts/grep-gate.mjs` scans every text file under `dist/` after `npm run build` and
**fails the release (exit 1)** if any forbidden owner/Helm string leaked into the built
site. Run it directly:

```
node scripts/grep-gate.mjs
```

Forbidden patterns: `inayatpanda.com`, `inayatpanda-site`, `studio@`, `admin token`,
`X-Admin-Token`, `npm run tunnel`, `Connect to my Helm`, `Set up your Studio`, `hosted
Studio`, `/admin/api/login`, `buy.stripe.com/test_`.

**Single allowlisted exception:** `https://inayatpanda.com/licences/revoked.json` — the
touchpoint-2 revoke-list URL. It is stripped from each line before matching and every
occurrence is reported as `SKIPPED-ALLOWED`. The allowlisted string matches the URL the
licence client resolves to exactly.

### Invariant

None of the three touchpoints is an inbound connection to Helm, and Chapbook works fully
when Helm is offline: the mint queue accumulates and is fulfilled on Air 2's return; the
revoke check fails open; metrics keep counting for a later pull. There is **no
remote-Helm / tunnel / admin-token coupling anymore** — the remote-Helm mode, the tunnel,
and the `/admin/api/login` admin shell were all removed in the separation (Task 3).
Everything else across the boundary is forbidden and caught by the grep gate.

> **Cross-boundary security note:** the Stripe webhook whitelists the buyer name via
> `safeName` before it enters the mint command or any queue record. The Helm-side
> `scripts/fulfil-sales.mjs` builds a shell `licence:mint` from queue fields, so it needs
> the same defence: **treat _all_ queue string fields (`name`, `email`) as untrusted on
> the Helm side** and apply the same `safeName` whitelist there when Air 2 is back
> (tracked, out of this repo).
