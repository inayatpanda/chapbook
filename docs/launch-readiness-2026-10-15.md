# Chapbook and Atelier launch verification — 15 October 2026

The tested web workflows are deployed. This is a record of verified behavior and remaining account/device checks, not a promise that every possible feature and environment is issue-free.

## Launch decision — cloud delivery follow-up

**Cloud trial and paid-licence delivery are operational without the owner's Mac. A broad public launch still has owner and first-use checks outstanding.**

Remaining:

1. Finish the fresh-browser activation → GitHub authorization → new-site publication walkthrough. The live browser reached the first-run Terms/AUP acceptance screen; per-action owner approval is pending. Existing real publication tests and isolated device-flow tests passed, but do not replace this fresh human-consent check.
2. Add the exact registered company name, company number and registered address to the public legal pages. The owner confirmed `rqai.co.uk` and will supply the remaining details at the end of the week. No company details have been invented. Other owner/legal decisions in the existing compliance checklist remain owner responsibilities.
3. If native installers are promoted, rebuild the wrappers with the final web changes and complete physical-platform installation and permission tests. This report verifies the web release; it does not certify all native devices.

## Cloud licence delivery — verified 15 October

- Confirmed the correct Resend account is `inayatpanda1@gmail.com`; `send.rqai.co.uk` is verified. The existing sending-only key works. A restricted domain-list API response was initially misread as an invalid key; no unnecessary rotation was performed.
- Migrated 41 existing licences and 16 products into an authenticated encrypted cloud ledger in the private sales repository. Cloud processing now owns fulfilment. Helm's existing timer imports support records and never competes to mint or email while the shared control is `cloud`.
- Hosted trial, real Stripe sandbox Checkout, annual renewal advanced with a test clock, partial/full refunds, retry/idempotency and signed revocations passed. The partial refund retained access; the completed refund revoked the renewed key. Test subscriptions were cancelled.
- Verified a genuine production trial through the public endpoint, Resend's **delivered** receipt, the shipped signature verifier and Helm's authenticated support ledger. The cloud ledger now contains 42 licences. The production receipt is `01a14155-0aba-7205-aa9c-e88e7bc654e5`; no key is included in this report.
- Concurrent repeat requests reused that trial and original delivery ID, with no duplicate email or key; hosted run `38806018596` finished with an empty queue and no errors. Emails link directly to activation and report the original trial's actual expiry, including on resend. The follow-up hosted check `38806720794` passed.
- The existing live Stripe signing secret verifies against the deployed function. Its destination now subscribes to all five required events, including delayed-payment success and current invoice-payment events. No live card was charged.
- Opened the live hosted checkout and verified Chapbook at £49 per year. The public privacy notice now describes the hosted worker, encrypted ledger, local support copy and Resend email delivery.
- The real tests exposed missing current invoice fields, partial-to-full refund collisions and concurrent GitHub commit conflicts. These were fixed and tested. Durable failures return 503, so Stripe can retry instead of silently losing a purchase.
- Failed delivery attempts retain their order and original key, with bounded retry and an owner support notice. Resend acceptance IDs are recorded; actual delivery and bounce status remain visible in Resend.
- Local Helm was gracefully reloaded and verified healthy. Its local support import contains the new cloud trial and preserves existing local keys/revocations. Cloud and local revocation publishers preserve the union of the signed list.

Evidence: [production delivery](readiness-20261015/cloud/production-trial-delivered.jpg), [live webhook event setup](readiness-20261015/cloud/live-webhook-events.jpg), [live checkout](readiness-20261015/cloud/live-checkout.jpg), [first-use terms screen](readiness-20261015/cloud/first-run-terms.jpg), and the private [production workflow](https://github.com/inayatpanda/rqai-sales/actions/workflows/fulfil.yml).

Representative successful hosted runs: trial `38801018874`, paid Checkout `38803751352`, annual renewal follow-up `38804652638`, full renewal refund `38804990747`, production trial follow-up `38805228913`.

The sandbox payment test used Stripe's official CLI with an existing sandbox-only key and a temporary local relay. Signing/email ran on hosted Actions. Netlify's live signature and public trial route were checked separately. The broad Stripe CLI authorization and broadly scoped new Netlify secret were rejected by automatic approval review; neither was applied, and the isolated test route avoided both. No additional Netlify test secret was saved.

The half-hour fallback schedule can be delayed by GitHub; delivery is normally triggered immediately by queue commits. This removes the Mac dependency but is not a guarantee against provider outages. New product-registry changes must also be reflected in the cloud ledger; support import is currently one-way. See [operations and recovery](STRIPE-SEAM.md).

Business calendar/payment connections are optional integrations. Each business must configure and validate its own provider before accepting bookings or payments; these are not demonstrated by the core writing/publishing checks.

## Live destinations

- [Chapbook](https://chapbook.rqai.co.uk/app/)
- [Atelier](https://studio.inayatpanda.com/)
- [28-theme desktop and phone gallery](https://chapbook.rqai.co.uk/themes/)
- [Isolated synthetic publishing site](https://inayatpanda.github.io/chapbook-readiness-20261015/)
- [Personal website](https://inayatpanda.com/)

The QA repository is private; its GitHub Pages site is intentionally public. It contains synthetic test content and template examples. No mock post was published to the personal website. Its hourly scheduling workflow was disabled after the real scheduling test succeeded; its review pages remain available.

## Changes shipped

- Gemini text, vision and document output now reserves thinking headroom and excludes thought-only output. Empty responses fail clearly. Image generation uses a working native Gemini image model rather than the retired Imagen endpoint.
- Both editors statically parse generated interactive JavaScript with Acorn. Main-page CSP stays strict. Built-in calculators, function explorers and mixers evaluate a restricted expression tree, so their previews work without `eval` or `new Function`.
- Atelier gains reliable untitled-draft recovery, save ordering and slug reservation; browser draft backup/import; safer imported HTML; GitHub conflict retry and large-file retrieval; improved photo-upload error handling and share links; responsive layout fixes; offline cached bundles; and a working hosted GitHub device-flow relay.
- Both editors save professional/business details, services, durations, display prices and booking links. Theme settings read the themes actually installed in the selected repository.
- Helm serves the tested Atelier assets and runs the corrected Gemini and interactive code. Its managed server was gracefully reloaded and checked through PIN-authenticated owner APIs.
- Scheduled publication explicitly dispatches deployment after its workflow commit, avoiding the GitHub Actions restriction on workflows triggering other workflows through `GITHUB_TOKEN` pushes.
- The final real-image post exposed a raw-HTML media URL bug on GitHub Pages project sites. The template now prefixes parsed HTML image/video/link attributes at build time, preserves partial HTML and script text, and avoids double prefixes. Markdown links and reference definitions follow the same rule.
- Site EXIF extraction reads buffers, avoiding the Node file-handle failure encountered during builds.

## Theme curation

There are 28 choices across six categories, rather than only three additions:

- New personal/business layouts: **Folio, Practice, Petal, Contour, Cut, Still, Office, Portrait**.
- **Postcards** replaces Polaroid’s repetitive scattered-photo layout with alternating image/letter spreads. The stable `polaroid` ID remains compatible with existing configuration.
- **Darkroom** presents actual post images as an exhibition, followed by a compact index for text-only posts.
- **Contact Sheet** uses real post images in its proof grid, with numbered text plates when an image is absent.
- **Kiosk** has a lead story, supporting stories, excerpts, images and functioning search with a no-results state.
- **Scrapbook** uses actual images and topic annotations instead of invented endorsements.
- Home links work under GitHub Pages project subpaths. Template footer navigation respects configured pages and theme labels.

The pre-existing Blueprint Workshop writing theme remains a separate creative option. The proposed new garden-business “Workshop” template was removed before release and replaced with the beauty/aesthetics directions requested. Personal-site legacy themes remain installed rather than changing the owner’s current theme or content.

The public gallery has category filters and desktop/phone previews. The old flat `themes.html` hosting route and new directory route now serve identical gallery content; a browser test checks the public result.

## GitHub integration follow-up

The user reported erratic and cumbersome GitHub setup. Both apps now use the same setup controller:

- Reopening setup validates the saved sign-in and restores the repository picker. A failed list request is visible and retryable rather than being silently presented as an empty account.
- Repository discovery follows pagination and includes editable collaboration/organisation repositories. Search narrows the list. Archived/read-only repositories are excluded; selecting a repository verifies its branch and `src/data/site.json` before changing the connection.
- A replacement account/token remains staged until its website is explicitly selected and checked. Cancelling sign-in or closing setup leaves the existing connection intact and prevents late approval from replacing credentials.
- Setup messages are visible. A global `.msg { display:none }` previously hid errors written by the onboarding flow. Authentication, permission, throttling and service failures now give distinct recovery instructions.
- Device polling respects slow-down responses, tolerates bounded transient network/5xx failures and cancels on close. Code copying has explicit success/failure feedback.
- Manual tokens follow the same repository checks. Metadata checks cannot prove every fine-grained token/branch write policy without a write; actual write denials remain explicit when publishing.
- Retrying interrupted website creation resumes its recorded repository instead of creating another copy. Atelier uses the canonical public template and its current 28-theme catalogue.
- Existing websites appear first. New-site creation is a disclosure; manual token controls are under Advanced. Atelier now has a close-setup control.
- Publishing reports that GitHub saved the content and the website is updating, with a direct build-status link. A successful commit is no longer described as proof the website is already live. Atelier also preserves scheduled timestamps on republish and surfaces slug-reservation failures accurately.

Verification: **13 browser scenarios passed per app**, including manual tokens, account changes, failed repository fetches, incompatible/read-only/missing-branch repositories, cancellation, partial creation recovery and publish feedback. The existing **245 browser checks per app** also passed. Live read-only account checks returned **22 editable repositories** and validated both the personal site and synthetic QA site. Fresh human OAuth consent remains an account-owner step; device flow was exercised with isolated transport fixtures.

GitHub reference: [device authorization](https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/authorizing-oauth-apps#device-flow) and [repository discovery](https://docs.github.com/en/rest/repos/repos#list-repositories-for-the-authenticated-user).

## Written walkthroughs and tutorial videos

The public [tutorials page](https://chapbook.rqai.co.uk/tutorials#walkthroughs) now has six current written walkthroughs: GitHub connection/reconnection, creating a site and choosing a theme, first-post publication, revisions/scheduling, business appointment setup and recovery/backup. The gallery links directly to these guides.

The six disclosure guides were checked at desktop and phone widths. All **15 existing tutorial videos loaded and played** in the browser. They were not re-recorded; the page explicitly notes that older recordings can show an earlier interface and directs users to the written guides for current setup instructions.

## Header and opening-layout follow-up

Themes now have different navigation compositions: literary columns, newspaper rules, a numbered portfolio index, centered salon wordmarks, gallery menu controls, a consulting directory and expressive labels/tabs. Darkroom places its opening photograph beside a caption column instead of another centered masthead. The existing desert/blueprint compositions remain intact, and the personal site's Dune/Blueprint palette controls are retained.

All **28 themes at 1440 and 390 pixels** passed overflow, active navigation and menu/Escape checks. Hidden mobile menus no longer remain keyboard-focusable. Active links work on GitHub Pages project subpaths, and professional pages have one main landmark. Gallery screenshots include content revealed on scroll and have been refreshed. The personal-site deployment succeeded, and all eight live published-post checks passed after the template update.

## Booking and payments

Cal.com event links offer a click-to-load calendar on the Appointments page. Other HTTPS providers work as external booking links. Individual services can have separate booking links. A direct link remains available if the embedded provider fails to load.

Appointment records, calendar availability, confirmation/reminder emails and any payments belong to the business’s booking provider. Cal.com can connect to Stripe for paid appointments. The website price field is display text, not an automatic payment configuration.

**No merchant account or real customer calendar was connected. No real appointment, confirmation email or charge was created.** The actual Cal.com embed library was exercised with an intercepted synthetic booking frame, and its failure fallback was checked. Each business must connect its calendar/payment account, configure its event types and policies, and validate a booking and provider-supported test payment before accepting customers.

See [booking setup](booking-and-business-sites.md) for the owner steps and official provider references.

## Verification evidence

| Area | Result | Scope |
|---|---|---|
| Chapbook automated tests | 1,118 passed | Final source/build, including gallery route consistency |
| Atelier automated tests | 691 passed | Final editor and portable engine |
| Helm automated tests | 1,359 passed | Backend, shared engine and owner features |
| Website template tests | 78 passed | Theme registry, booking links, cover resolution and existing site logic |
| Personal-site tests | 63 passed | Existing site logic plus new booking/image helpers |
| Chapbook browser workflows | 245 passed | Production bundles with disposable in-memory test activation and mocked GitHub transport |
| Atelier browser workflows | 245 passed | Same browser workflow suite and storage behavior |
| Paid Gemini features | 23 passed | Real provider calls, including image, interactive, figure, import and text workflows |
| Full theme review | 28 themes × 2 widths | Desktop 1440 and phone 390, screenshots and overflow checks |
| Redesigned-theme follow-up | Passed | Real image loading, Kiosk search, calendar loading/failure and affected layouts |
| Public gallery | Passed at both widths | Real hosted page, category filter and phone previews |
| Production release gate | 12 passed, 0 skipped | Headers, CSP, activation, XSS, service worker, marketing, routes and live checkout link presence |
| Owner Helm smoke | Passed | PIN unlock, eight authenticated API reads, nine Atelier views and no uncaught page errors |
| Real GitHub lifecycle | Passed | Isolated repository creation, publish, takedown, republish, duplicate, delete and due scheduled deployment |
| Published-page verification | Eight passed | All four live posts at 1440 and 390 pixels; images decode, figures render, sandbox controls switch, no uncaught script errors |
| Live editor publication | Four posts published | Genuine one-day test licence; actual hosted apps → GitHub → Pages, with editable sidecars |

Browser coverage includes ideas, drafts, revision history, writing threads, untitled recovery, backup export/import and malformed import, publish/schedule/takedown/duplicate/delete, photo uploads and share URLs, unsafe path rejection, interactive presets, 23 figure families, formula slider behavior under production-like CSP, responsive views and offline reopening. These mocked transport tests are distinct from the real GitHub and hosted publishing checks.

The interactive mock post was initially generated with empty test parameters. It was corrected to two labelled drafting states and republished through the hosted editor. Published-widget checks target the sandbox iframe, not the parent document.

Raw credential-free results and screenshots are in [readiness evidence](readiness-20261015/). Test credentials were kept transient; none are included in these artifacts.

## Published mock posts

- [A small writing ritual](https://inayatpanda.github.io/chapbook-readiness-20261015/blog/release-test-a-small-writing-ritual-2/) — rich text, quote and process figure.
- [An interactive comparison](https://inayatpanda.github.io/chapbook-readiness-20261015/blog/release-test-an-interactive-comparison/) — two-state interactive widget.
- [A visual notebook](https://inayatpanda.github.io/chapbook-readiness-20261015/blog/release-test-a-visual-notebook/) — image, gallery, captions and alt text.
- [Atelier editing roundtrip](https://inayatpanda.github.io/chapbook-readiness-20261015/blog/release-test-atelier-editing-roundtrip/) — rich text, diagram and editable sidecar.

## Release identities

- Chapbook source commits: `67c9e1a` (GitHub recovery), `2d03ae0` (gallery and written walkthroughs).
- Chapbook final cloud-delivery/notice production Netlify deploy: `6ad13f59f840889d33b3edcf`.
- Private cloud worker source commit: `88e76cf` (the repository also records subsequent runtime state commits).
- Atelier deployed Pages commit: `61c45bf`.
- Atelier source commit: `3ec07b7` (source), `6227dd1` (built assets).
- Helm source commit: `ebacb02` (cloud delivery and support sync), after `3debed2` (editor release).
- Public template latest header commit: `b4c7b6f`. Earlier commits: `f16c3be` (themes), `b340a76` (published-media subpaths).
- Personal website latest header commit: `338ade3` (Hostinger deployment succeeded). Earlier commits: `2939c0e` (themes; Hostinger deployment succeeded), `88f5a45` (shared media URL handling; Hostinger deployment succeeded).

## Remaining limits

- Core writing/publishing workflows are exercised in both products. This is not an exhaustive proof of identical behavior across every UI, server-only feature and native platform. Atelier’s owner backend, CV/apps and local video features remain intentional differences.
- Fresh human GitHub OAuth consent was not completed. Existing authenticated GitHub API access, the hosted activation gate and OAuth relay behavior were checked. The user did not need to sign in again for this work.
- Windows/Android/iOS devices, OS installer execution, camera/microphone permission prompts and hardware capture were not tested on physical devices. Existing installer downloads and hashes were checked; signed native wrappers were not rebuilt. The user’s separate signing work was preserved.
- Customer-owned R2 accounts, booking/calendar accounts and merchant onboarding require each customer's own connected accounts and checks. Chapbook's own actual sandbox purchase/renewal/refund and production trial email delivery passed; a live-money purchase was deliberately not performed.
- Third-party service uptime and future provider/model changes remain outside a one-time release check.
