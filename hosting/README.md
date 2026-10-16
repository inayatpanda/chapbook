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

## Cutover requirements

Before changing production DNS:

1. Verify the Node runtime, security headers, all public routes, assets and
   downloads on the temporary host. Check updates survive deployment.
2. Provision a private production database and a separate sandbox database.
   Verify the actual database region, access restrictions, backup restoration
   and deletion behavior with the supplier.
3. Establish Hostinger's documented trusted proxy/client-IP behavior before
   enabling IP-based limits. The adapter currently uses the socket address and
   must not blindly trust client-supplied forwarded headers.
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
