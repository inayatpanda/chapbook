# Hostinger deployment adapter

This is a migration candidate, not the current production deployment. Production
continues to use Netlify unless `CHAPBOOK_STORAGE=mysql` is explicitly selected.

## Runtime

Build the website with the existing production build and asset-staging steps.
Deploy `dist/`, `hosting/`, `netlify/functions/`, `netlify/lib/`,
`src/lib/licence-pubkey.js`, `netlify.toml`, and the package manifests. Do not upload
`.env`, `.git`, operator records, local databases or test credentials.

Use Hostinger **Web Apps / Node.js**, not the PHP/HTML website importer. The
deployment entry is `hosting/server.mjs`; `npm start` runs it. Use Node 24 and the
host-provided `PORT`. The server serves only `dist/` and retains the existing
`/.netlify/functions/...` URLs so the app and worker do not need a simultaneous
route change.

For the initial public preview use **`hosting/preview.mjs`** instead. This entry
always disables account services, private records, trial requests and payment
webhooks, and sends `X-Robots-Tag: noindex, nofollow`. It needs no secrets or
customer data. `/healthz` identifies this as a preview.

With a database connected, the preview runs eight synthetic storage checks once
at startup. `/healthz` reports only the aggregate result. The checks use random,
isolated namespaces and ephemeral signing keys; temporary records are removed
even on failure. One non-personal `preview-probe-checkpoint/durability.json`
marker remains to verify persistence after the next restart or deployment.
No public endpoint can trigger writes or read the database records.

The preview-only `/__preview/request-diagnostics` endpoint returns ephemeral
HMAC fingerprints, never raw addresses. It is absent from the production entry.
Use it to compare ordinary requests and spoofed forwarding headers after changing
hosting or CDN configuration. The key rotates on each process start.

### Trusted proxy

`CHAPBOOK_TRUSTED_PROXY` accepts exact IP addresses separated by commas, or
`loopback` for `127.0.0.1` and `::1`. It defaults to trusting no forwarded headers.
The client address is the first untrusted hop walking `X-Forwarded-For` from the
socket backwards. A malformed/missing chain from a trusted peer fails closed.
Do not enable wildcard/private-network trust or take the first header entry.

The Hostinger Node preview was verified on 16 October 2026: its socket peer is
loopback, and ordinary requests, forged `X-Real-IP`/`CF-Connecting-IP` headers and
forged `X-Forwarded-For` prefixes resolved to the same client fingerprint. Use
`CHAPBOOK_TRUSTED_PROXY=loopback` only for this verified topology and repeat the
check on the final domain. Hostinger documents that its CDN appends the connecting
address, while earlier entries may be client-controlled:
https://www.hostinger.com/support/hostinger-cdn-visitor-ip-addresses-in-logs-and-analytics/

## Persistent storage

The deployment directory is replaceable. Private data must use a dedicated
MySQL database with InnoDB. Configure `DB_HOST`, `DB_NAME`, `DB_USER`, and
`DB_PASSWORD` in the hosting environment, plus `DB_PORT` if nonstandard. Set
`DB_TLS=1` when the database connection supports verified TLS. Do not disable
certificate verification to connect over a public network.

The adapter creates `chapbook_records`. Conditional creation and updates are
atomic SQL operations. Namespace and signature checks remain in the existing
function handlers. Existing service environment variables are still required;
the adapter does not provision or copy them.

## Validation

The real MySQL regression suite uses an isolated database and deletes only its
randomly named synthetic test stores:

```
CHAPBOOK_DB_TEST_CONFIG=/private/path/to/test-config.json node e2e/hosting-mysql.mjs
```

The JSON file contains `host`, `port`, `database`, `user`, and `password`. Keep it
outside Git with mode 0600. The suite tests concurrent writes, compare-and-swap,
namespaces, signed request replay rejection, deletion locks, restart persistence,
static path containment, downloads, service failures and preview isolation.

`e2e/hosting-migration.mjs` uses the same local-only configuration. It rehearses
an encrypted snapshot, digest reconciliation, resumable import and conflict
refusal against disposable MySQL service namespaces. It does not contact the
production store.

`hosting/migrate-cli.mjs` is an operator-only tool, never an HTTP endpoint. After
actually pausing all source writers, `snapshot <encrypted-file> <key-file>
--writers-paused` reads the explicit `CHAPBOOK_MIGRATION_SOURCE_SITE_ID` using
`NETLIFY_AUTH_TOKEN`. It refuses unknown store names and changes during the copy.
Files are created exclusively with mode 0600; keep the key separate. Transfer
over an authenticated private channel. With the destination still in preview,
`CHAPBOOK_PREVIEW=1 node hosting/migrate-cli.mjs restore <encrypted-file>
<key-file> --writers-paused` imports in one SQL transaction and reconciles all
records. Existing identical records are safe to resume; different records abort
without overwriting. Do not mistake a successful import for a complete cutover:
writer fencing, rollback after new writes, service secrets and final-domain
validation below still apply. Remove migration recovery files after the agreed
rollback retention window.

## Cutover requirements

Before changing production DNS:

1. Verify the Node runtime, security headers, all public routes, assets and
   downloads on the temporary host. Check updates survive deployment.
2. Provision a private production database and a separate sandbox database.
   Verify the actual database region, access restrictions, backup restoration
   and deletion behavior with the supplier.
3. Recheck the verified trusted proxy/client-IP behavior on the final domain
   before enabling IP-based limits, especially if another CDN is added.
4. Run the worker, trial email, Stripe sandbox purchase/refund, retention,
   export and deletion flows against the hosted sandbox.
5. Rehearse a consistent migration and rollback. Pause worker and webhook
   writes, drain queues, copy and reconcile every durable store, then choose
   exactly one writable source of truth. Account for cached DNS and late
   Stripe retries. Never leave independent stores accepting writes on both
   hosts. Preserve a verified rollback snapshot according to retention policy.
6. Switch traffic, recheck production health and delivery, and remove the old
   service only after the rollback window and data reconciliation close.

Moving the service does not move writers' GitHub repositories or their optional
R2 media into the operator's hosting account. Customer-owned booking/calendar
and payment providers also remain separate.
