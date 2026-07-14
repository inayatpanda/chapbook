# Chapbook ⟂ Helm — complete separation (design)

**Date:** 2026-07-14
**Status:** approved by owner; implementation follows this spec.

**Owner decisions (locked):**
- Hard fork; new repo `~/Projects/chapbook`, fresh history, private GitHub remote.
- Scope: fork **and** fix release-blockers.
- Metrics store: **Netlify Blobs** on the Chapbook site.
- Public contact email: **support@rqai.co.uk** (replaces studio@inayatpanda.com everywhere).
- Netlify: **keep site d825cd70** (chapbook.rqai.co.uk) — preview deploys first, promote on green; Stripe webhook URL + env untouched.
- **Video posts: KEEP** — re-based on the user's own R2 (owner amendment mid-design; see §6a). The Helm transcode path is still removed.
- Internal sales-pipeline product id stays `studio` (`client_reference_id=studio`) — renaming it is a Helm+Stripe migration deferred deliberately.

---

## 1. Problem

Chapbook (the sellable public product) and Helm Studio (the owner's personal
writing tool for inayatpanda.com) are **one codebase**. `studio-app/build.mjs`
takes the owner's server-backed `helm/public/studio/index.html` ("The Helm"),
rebrands three strings to "Chapbook", swaps the boot gate, flattens `/studio/`
→ `/`, and emits `dist/` for Netlify. Everything else — including owner-only
machinery — rides along.

This entanglement is the root cause of the audit findings:

- **Owner-only "Connect to my Helm" mode ships to every customer** — tunnel URL
  + admin-token fields + `npm run tunnel` instructions (`app.js:210+`). Not
  residue: `build.mjs:120` *requires* the remote-Helm seam or the build fails.
- **Owner identity hardcoded, unconditionally**, in the public bundle:
  `inayatpanda.com` share/blog fallbacks, `studio@inayatpanda.com` Crossref
  mailto, "Inayat Panda · inayatpanda.com" share-card footer,
  `github.com/inayatpanda/inayatpanda-site` links, "Publish this post to
  inayatpanda.com now?" confirm.
- **Branding is fragile string-replacement** touching only `index.html` /
  `manifest.json` / `sw.js`; the whole `app.js → studio.js` bundle ships
  verbatim (~100 "Studio" strings, Helm onboarding copy).
- Genuine **release-blockers** in the shared code: shell-injection RCE in the
  Stripe webhook's mint command; a service worker that can never install
  (precaches `/studio` → 404 at flat root); 502 on gh-device CORS preflight
  (204-with-body); a bypassable publish-path HTML sanitiser (stored XSS on
  published blogs); silent data loss for titleless drafts.

## 2. Goal

A standalone **Chapbook** repo that:

1. builds + deploys to `chapbook.rqai.co.uk` with **no reference to Helm
   internals, tunnels, admin tokens, or the owner's personal site**;
2. is **branded Chapbook at source** (no build-time string surgery);
3. keeps only the **necessary, one-way, async couplings** to Helm (§3) — Helm
   never needs to be online for Chapbook to work;
4. has the **release-blockers fixed**;
5. keeps **video posts working for customers** via their own R2 (§6a);
6. leaves `helm/` **untouched** (hard fork — Helm Studio keeps serving
   inayatpanda.com from its own copy; improvements are ported by hand).

Non-goals (deferred, tracked): shared editor-core package; full WCAG a11y
remediation; monolith refactor / lazy-loading; CSP `unsafe-inline` removal
(fast-follow); sales-pipeline product-id rename.

## 3. The Chapbook ⟂ Helm boundary — the only permitted couplings

Three one-way, async touchpoints. None is inbound to Helm; none blocks
Chapbook when Helm is offline.

| # | Touchpoint | Direction | Mechanism | Helm offline? |
|---|---|---|---|---|
| 1 | **Licence mint** (purchase/trial) | Chapbook → Helm | Stripe → Chapbook Netlify webhook → append to private queue repo (`inayatpanda/rqai-sales`) → Air 2 Helm worker mints Ed25519 key + emails buyer | Queue accumulates; fulfilled on return |
| 2 | **Licence revoke check** (refunds) | Helm → Chapbook | Helm publishes signed `revoked.json` at a static URL; licence gate fetches it | Fails open (as today) |
| 3 | **Usage metrics** | Chapbook → Helm | `metrics.mjs` function increments per-day counters in **Netlify Blobs** on the Chapbook site (payload `{type, day}` only — no PII, no licence key, no stored IP); Helm pulls tallies via Netlify API on its own schedule | Events still counted; Helm reads later |

Cut entirely: remote-Helm mode (tunnel + admin token + laptop state); local
admin-login shell (`/admin/api/login`); **Helm video transcode** (feature
re-based, §6a); owner personal defaults (neutral defaults or unset-until-
configured; contact = support@rqai.co.uk).

## 4. Target repo shape

```
~/Projects/chapbook/                 (fresh git init, private GitHub remote)
├── src/                             app source (from public/studio/ + studio-app/)
│   ├── index.html                   Chapbook-branded AT SOURCE; server-login &
│   │                                 remote-Helm branches DELETED
│   ├── app.js  core/  seams/        engine (seams/remote.js removed)
│   ├── sw.js  manifest.json         precache '/', not '/studio'
│   ├── blocks.js  licence-pubkey.js templates/  ai/   ← client-needed modules
│   │                                 lifted out of helm/server/ (client subset)
│   ├── preview.css resize.js darkroom-upload.src.js
│   └── icons, vendor/exifr
├── netlify/functions/
│   ├── gh-device.mjs                204-body fixed; per-IP rate limit; CORS → app origins
│   ├── stripe-webhook.mjs           mint-command injection fixed
│   ├── metrics.mjs                  (new) anonymous Netlify Blobs counter
│   └── trial-request.mjs            committed; product allowlist
├── build.mjs                        bundle + emit dist/; NO brand replace, NO
│                                     boot-gate swap (source already correct)
├── netlify.toml                     headers verified live (§8)
├── package.json                     standalone (no helm imports)
├── docs/superpowers/specs/          this spec
└── README.md                        incl. the §3 boundary contract
```

## 5. Migration strategy

Hard fork = snapshot + clean, fresh history (helm history carries owner
content/keys and is not imported).

**Fork base:** Air 2 (canonical) is offline at fork time. Base = local snapshot
`Desktop/Transferred to new mac/Inayat-website/helm` at `feat/literature-decoded`
commit `259544d` (2026-07-08) **plus** its uncommitted working-tree edits
(through 2026-07-12). The one known missing canonical delta (go-live commit
`64fb912`, 2026-07-10) is reconstructed from the verified live site: Buy link
`https://buy.stripe.com/5kQeVd0C06t7aSLf3IgUM05?client_reference_id=studio`.
**Reconcile against Air 2 when it returns** (diff helm@Air2 vs the recorded
base; port anything else 64fb912+ touched).

Steps: (1) copy the deployable set (§4) — `helm/` untouched; (2) excise at
source (server-login boot branch, remote-Helm seam/UI, owner defaults; brand
Chapbook; strip build.mjs transforms + their guards); (3) lift client-needed
server modules into `src/` (no `../server/` imports); (4) fix blockers (§6);
(5) build video-on-R2 (§6a); (6) verify (§8) then cut over (§9).

## 6. Release-blocker fixes folded into the fork

| Sev | Finding | Fix |
|---|---|---|
| **BLOCKER** | Shell-injection RCE: `stripe-webhook.mjs` builds a copy-paste mint command from Stripe buyer name; `$`/backtick unescaped → executes on the signing-key machine; auto-mint worker may make it unattended | Whitelist name to safe charset before any command/queue string; unit test with `$(…)`/backtick payloads. **Flag Helm-side worker for the same fix** (out of repo; same queue input) |
| **BLOCKER** | SW never installs: bare `/studio` precache 404s → `cache.addAll()` rejects | Precache `/` + real assets at source; fallback `/`; release-gate check: every precached URL 200 + SW reaches `activated` |
| **BLOCKER** | gh-device 502 on preflight: `new Response('', {status:204})` throws in undici | `new Response(null, …)`; latent today (same-origin) but one line + test |
| **HIGH** | Publish-path stored XSS: regex `stripUnsafeHtml` bypassed (`<img/src=x/onerror=…>`, `<svg/onload=…>`); AI "expand" wraps output in `raw` block with **no** sanitising → committed verbatim to the user's public blog | Parser-based sanitise (DOMPurify) on paste/import AND `rawDocFromMarkdown` output; recommend `rehype-sanitize` in the generated site as defence-in-depth |
| **MEDIUM** | Titleless drafts never autosave (slug needs title) → crash loses work | Autosave under a provisional draft id pre-title |
| **MEDIUM** | netlify.toml security headers not reaching the live edge | Verify from the new repo's deploy; live-header check in release gate. (CSP `unsafe-inline` tightening = fast-follow, noted residual risk given BYOK creds in localStorage) |
| **LOW** | trial-request `product` unvalidated; gh-device `*` CORS + no throttle; image-filename traversal gap in `validateDoc` | Product allowlist (`studio`); per-IP throttle + origin allowlist; reject `/`, `..` in image/gallery filenames |

Also: all shipped templates must pass `validateDoc` (7/9 currently fail on
placeholder image blocks — drop the empty image blocks or make a valid
placeholder state).

### 6a. Video posts on R2 (owner amendment: feature KEPT)

Current implementation uploads/transcodes on the owner's local Helm — impossible
for customers. Re-base on the user's own R2 (already Chapbook's optional media
path):

- **Gate:** video composing requires R2 configured; otherwise the video option
  points the user to R2 setup.
- **Upload:** direct-to-R2 passthrough of the user's file (MP4 recommended) via
  the existing R2 worker path — **no server transcode in v1**.
- **Poster:** generated client-side (`<video>` → canvas frame capture) and
  uploaded alongside.
- **Block:** video block embeds the R2 public URL + poster in the published
  post (`<video controls poster …>` in the serialised output).
- **Compatibility guard:** attempt in-browser playback of the chosen file
  before upload; warn on undecodable codecs (e.g. some HEVC) with "export as
  MP4/H.264" guidance. Size guidance surfaced in the UI.
- Helm-only transcode UI/copy ("runs in your local Helm (npm start)") deleted.

Watch-item: HEVC-from-iPhone cross-browser playback; if it bites, v2 adds
optional client-side transcode (WebCodecs) — explicitly out of v1.

## 7. Phasing (each phase ships something checkable)

- **P0 — Repo + parity.** Copy deployable set; build `dist/`; deploy Netlify
  **preview** on site d825cd70; behaviour-parity with today's live. No cleanup
  yet — prove the move is lossless.
- **P1 — Excise Helm/owner code.** Delete remote-Helm mode, admin-login shell,
  Helm-video path, owner defaults; rebrand at source; contact →
  support@rqai.co.uk; strip build.mjs transforms. Grep gate green (§8).
- **P2 — Boundary contracts.** Stripe webhook cleaned (RCE fix); `metrics.mjs`
  (Netlify Blobs); `trial-request` committed + allowlisted; revoke-list URL
  documented; README boundary section.
- **P3 — Blockers.** SW paths; gh-device 204 + throttle; publish sanitiser;
  titleless autosave; template validation; traversal guard.
- **P4 — Video on R2** (§6a).
- **P5 — Verify + cutover** (§8, §9).

## 8. Release gate (run against a deploy preview before promoting)

- Build succeeds; dist emitted; no `../server/` imports.
- Every SW-precached URL → 200 on the preview; SW reaches `activated`.
- Live headers on HTML + asset: CSP, X-Frame-Options, X-Content-Type-Options,
  Referrer-Policy, HSTS.
- gh-device OPTIONS → 204 (not 502); POST path works.
- Webhook sanitiser unit tests pass (`$(…)`, backtick, quote payloads).
- No `buy.stripe.com/test_`; live Buy link present.
- Grep gate — **zero matches in dist/** for: `inayatpanda.com`,
  `inayatpanda-site`, `studio@`, `admin token`, `X-Admin-Token`,
  `npm run tunnel`, `Connect to my Helm`, `Set up your Studio`,
  `hosted Studio`, `/admin/api/login`.
- All templates pass `validateDoc`.
- Manual: activate (real key) → create blog → write (incl. an image + a video
  via R2) → publish → live link renders.

## 9. Cutover & rollback

Same Netlify site keeps the Stripe live webhook URL and env
(`STRIPE_WEBHOOK_SECRET`, `GITHUB_QUEUE_TOKEN`) valid. Promote the verified
preview to production; rollback = restore the previous deploy in the Netlify
UI (kept until the new build has survived a real purchase + publish).
Post-cutover: update memory/rqai-sales notes; the old
`helm/studio-app` build path is retired for the public product (Helm keeps it
for the owner's local Studio only). Owner reminder stands: paste the live
`whsec_` into Netlify env (predates the live endpoint) — unchanged by this work.

## 10. Risks / watch-items

- **Fork base is the offline-Air-2 snapshot** (§5). Reconcile on Air 2's
  return; until then the recorded base + reconstructed go-live delta is
  authoritative.
- Client-lifted server modules: confirm the exact client-only subset during P0
  so nothing server-only leaks in, nothing needed is dropped.
- HEVC playback (§6a watch-item).
- CSP `unsafe-inline` remains until the fast-follow.
- Hard-fork divergence: editor fixes must be ported by hand between Chapbook
  and Helm Studio from now on.
