# Chapbook and Atelier launch verification — updated 19 October 2026

The tested web workflows are deployed. This is a record of verified behavior and remaining account/device checks, not a promise that every possible feature and environment is issue-free.

Latest web deployment: Chapbook `2a55e66`, uploaded to UK Hostinger as `chapbook-hostinger-ai-export-20261019.zip` (19 October, 05:34 UTC), cache `chapbook-c5614550`. Public installers remain the verified 1.0.17 set; 1.0.18 native candidates are kept in draft pending Android signing. Public notice version `2026-10-18` explains UK hosting and Germany backups. The owner confirms there are no Chapbook users yet. Earlier dated sections below retain their original scope.

## AI export and supplier follow-up — 19 October

- The web fix preserves known generated origin through social editing/planning and adds a visible notice on Copy/Share; Copy all respects edited text. Current provider-specific settings guidance distinguishes labels, signed credentials and watermarks. All 1,182 tests, 34 activation/setup checks and 12 public checks passed in run `39205299216`; all three full hosted installer hashes match the preserved 1.0.17 manifest.
- Real Gemini notebook-image generation and exact-byte publishing passed. The official C2PA tool/trust list validates the original credential as Trusted, without failures. Independent SynthID detection, unsupported API-text paths and derived outputs remain explicitly open in the [supplier/AI review](legal/SUPPLIER-AND-AI-REVIEW-2026-10-16.md).
- Supplier follow-ups are recorded for GitHub #4864841, Netlify #1145303 and Hostinger #24468774. Technical/contract answers remain pending. Historical Gmail review was scoped and did not erase correspondence; Hostinger mailbox review needs its separate login. Provisional ICO fee and EEA representative assessments are documented; final entity-dependent decisions remain deferred.
- Atelier `961be3b` / `studio-v107` is live through deployment `372651d`, with 724 passing tests and 16 engine checks. Helm mirror `31879b5` includes the fixes; its backend restarted gracefully and health returned `ok`. Production delivery and daily retention remain healthy; 32 worker tests pass. Authoritative hPanel DNS shows the Hostinger CDN ALIAS and three resolver checks plus HTTPS succeeded.
- Mac candidate 1.0.18 passed strict signature, Gatekeeper, stapled notarization and Intel/ARM architecture checks. The exact `/Applications/Chapbook.app` was selected; its About dialog confirms 1.0.18 and the new AI guidance is present with retained GitHub setup and seven saved items. App-name selection initially opened an older retained bundle; that was identified, not counted as candidate evidence. Windows candidate smoke `39204770785` passed. iOS 1.0.18 compiles/installs/launches; no public iOS installer is offered. Android compiled but signing is pending permission to locate/use the existing credential, so release 1.0.18 stays draft.

## Final 1.0.17 release — 19 October

- [Version 1.0.17](https://github.com/inayatpanda/chapbook/releases/tag/desktop-v1.0.17) is published. Hostinger reports the reviewed archive completed/current, and the public download page shows 1.0.17. All three full public installer downloads match their independently verified SHA-256 hashes. The deployed build is `v20261019-fc0f350`, cache `chapbook-1fd85013`; normal HTTPS reports ready/storage ready. DNS was reconfirmed through the Mac, Cloudflare and Google resolvers at 04:16 UTC.
- Desktop build/notarization run `39198426276` and Windows clean install/startup/uninstall run `39199559584` passed. The Mac artifact passed strict signature, Gatekeeper, stapled notarization and universal-architecture checks. The installed `/Applications/Chapbook.app` is 1.0.17 and retains activation, GitHub setup and saved drafts; reopening and actual preview passed. The preceding installed app is retained for recovery. Windows remains unsigned, as disclosed on the download page.
- Android 1.0.17 is signed with the existing certificate, installed and launched, retaining activation, Terms and its GitHub connection. iOS 1.0.17 compiles, installs and launches; setup controls respect the status area, focused inputs do not zoom, and dismissal works. The completed publication/backup workflows below remain the full workflow evidence; no public iOS installer is offered.
- Atelier source `f55b6a0`, cache `studio-v106`, is live through deployment `5efff12` and successful Pages run `39198486490`. Helm UI sync `56f773a` matches the same fixes. Existing owner signing changes remain untouched.
- Final [release verification run `39200986931`](https://github.com/inayatpanda/chapbook/actions/runs/39200986931) passed all 1,178 tests, 34 activation/setup checks and all 12 public release checks, with zero failures/skips. Source Web CI `39198426641` also passed. Latest checked cloud licence-delivery run `39197036308` succeeded without the Mac.

Company identity, outstanding supplier answers, legal review and the explicitly untested hardware/accessibility cases remain in [the release checklist](legal/RELEASE-CHECKLIST.md). This technical release does not close those items.

## Completed iOS workflow and final phone setup fixes — 19 October

- The owner completed GitHub verification. The actual iOS app connected to `inayatpanda/chapbook-launch-test-20261016`, accepted keyboard input, saved and reopened a local draft, rendered preview, saved a GitHub draft, and published it. Draft commit `0de909f9c3b8100dfddf6657e44d6a11132f7d39`, publication commit `b763a97a28eab7e625ee834581d41824cf8fad0e`, and Pages run `39197245789` are verified. The [public iOS test post](https://inayatpanda.github.io/chapbook-launch-test-20261016/blog/ios-launch-test/) contains only synthetic launch-test content.
- iOS backup export/import passed through the native pickers. The 2,367-byte export contains two saved versions and one writing thread with the synthetic content, and no licence key; re-import retains all three entries without duplicates. The published block draft was cleared normally. Licence, accepted Terms and GitHub connection persist across the final 1.0.17 update.
- Native testing found setup fields inherited 15px text, triggering iOS focus zoom, and setup/profile cards exceeded their padded phone width. Source `001edad` fixes these issues. A subsequent actual-device-view check exposed the setup heading/close button beneath the phone status area. Source `fc0f350` gives the setup/profile overlays safe-area padding and one scrolling surface. Matching fixes are applied to Atelier and Helm.
- All 1,178 Chapbook tests, 720 Atelier tests and 34 activation/setup browser checks pass, including narrow-screen containment, focus-size, status-area spacing, contrast and keyboard tests. Version 1.0.17 is published, with final artifact/deployment evidence above. There is no public iOS installer.

## Final mobile layout and distribution pass — 19 October

- Additional Android Settings/backup checks found a sticky header overlapping the status bar after scrolling. Source `557f5f8` keeps both app/editor toolbars below the safe area and paints the status-bar backdrop. Actual Android 1.0.15 scrolling verifies the correction. The final web build is `v20261019-557f5f8`, cache `chapbook-aa439659`.
- Final run `39184079739` passes all 1,178 checks, 29 authenticated activation checks and all 12 public gate checks, with zero failures/skips. All three full hosted installer downloads match their independently verified SHA-256 hashes; normal HTTPS health reports ready/storage ready. Latest cloud delivery run `39183583912` succeeded. Chapbook Web CI `39182063437` also passes all 1,178 checks. Atelier source `4d9987b`, cache `studio-v104`, deployment `5780962` and Pages run `39182195865` are live; Helm sync `fe075ca` carries the same fix.
- Android backup export produced a valid 1,918-byte JSON containing the synthetic post and no licence key. Native picker import recognized and restored all three entries without duplicates. The 1.0.15 upgrade preserves licence/Terms/setup; the 1.0.14 writing/publication walkthrough below remains the full workflow evidence.
- [Release 1.0.15](https://github.com/inayatpanda/chapbook/releases/tag/desktop-v1.0.15) supersedes 1.0.14. Desktop build/notarization run `39182063288` and Windows install/start/uninstall run `39183248974` succeeded. The final Mac artifact passed local strict signature, Gatekeeper and stapled ticket checks, plus launch, retained drafts/panel widths and preview. The user's installed `/Applications/Chapbook.app` was upgraded from 1.0.9 to 1.0.15, retaining app data and an old-app recovery copy.
- The iOS 1.0.15 simulator build is installed and activated with the existing all-products licence and accepted Terms. Enabling Device Hub Capture Keyboard resolved the input problem; the clipboard was cleared after activation. The owner explicitly approved iOS GitHub authorization and the Authorize action was submitted. GitHub then required fresh account verification; the completed iOS workflow above supersedes that earlier pending state. No iOS installer is publicly distributed.
- The public Windows download now explicitly discloses that it is unsigned and offers the browser app if Windows blocks it. Physical-device, interactive Windows, assistive-technology and legal/supplier limits remain in the release checklist.

## Activation and final installer follow-up — 19 October

- Fixed rejection of valid signed all-products licences. Chapbook accepts `studio`, `trial` and `all`; unscoped, unrelated, expired and forged licences remain rejected. The actual all-products regression failed before the change and passed afterward. No owner licence or credentials were committed.
- Fixed the first-run profile dialog's light-mode contrast, added dialog semantics and keyboard focus/Escape handling, and improved activation error contrast. Chapbook and Atelier share the fix. All 1,178 checks and 29 hosted activation checks pass; measured light/dark profile contrast is 5.19/7.90 and activation error contrast 6.37/7.04.
- Web CI `39179663868` and public gate `39180954856` succeeded. The public gate passes all 12 checks with zero failures/skips. Its first attempt had a CI/deployed build-stamp mismatch; the workflow now accepts the exact deployed stamp. App build `v20261019-cb5ddba` uses cache `chapbook-94b25b9e`.
- Atelier source `58aa983` / cache `studio-v103` is live via deployment `c2d71f3`, Pages run `39179978142`. Helm UI sync `88d2e87` preserves the owner's separate signing changes.
- Final Mac 1.0.14 passed strict code-signature verification, Gatekeeper and stapled notarization validation. It launched from the release disk image's app and retained the licence, GitHub setup, typed drafts and splitter widths; the draft preview rendered correctly. Earlier native typing, backup import/export and actual publication checks are retained below.
- Android 1.0.14 is signed with the existing certificate and preserves licence, Terms, GitHub connection and a typed local draft across upgrade. Actual device sign-in, repo selection, on-screen typing, saved-draft reopening, preview, GitHub draft save and publication passed. [Android synthetic post](https://inayatpanda.github.io/chapbook-launch-test-20261016/blog/androi/) is HTTP 200 with the intended title/body; publication commit `6cd9fb9f9c49d696d18fa263fe3c3677eed356bb`, Pages run `39180809060`.
- Windows 1.0.14 passed hash verification, clean install, responding-process startup and uninstall in run `39181088446`. It remains unsigned; interactive Windows and SmartScreen behavior are not claimed as verified. The download page explicitly states this and offers the browser app.
- [Native release 1.0.14](https://github.com/inayatpanda/chapbook/releases/tag/desktop-v1.0.14) contains the tested Mac, Windows and Android assets. No iOS installer is included. At that point the iOS 1.0.14 simulator build launched but activation/editor verification was pending; the successful 1.0.15 activation above supersedes this status. Earlier iOS gate rejection was a real product-scope bug, now fixed in the shared gate, not evidence of an invalid owner key.
- DNS was reconfirmed on 19 October via the Mac, Cloudflare and Google resolvers; HTTPS health reports ready/storage ready. Cloud delivery continues without the Mac. GitHub supplier case #4864841 still has no supplier response; company identity and the remaining external/manual evidence in the release checklist are not declared complete.

## Production hosting cutover — completed 18 October

- The approved whole-plan relocation to the UK completed first; affected sites and all eleven deployment workflows were restored. Chapbook's separate production migration then fenced 101 Netlify aliases and reconciled all 59 encrypted source records into UK MySQL before writes resumed.
- The domain and TLS now serve Hostinger. Netlify remains disabled, and the old deploy commands refuse to publish there. Authoritative DNS, independent Google/Cloudflare resolvers and the Mac resolver return Hostinger. Normal HTTPS health checks pass without an origin override; the propagation check completed at 20:03 UTC on 18 October.
- The signing key stays in GitHub Actions. Production worker `39102622954` processed the actual public trial request successfully; Resend confirmed delivery to the RQAI support mailbox, with zero errors and an empty queue. Sandbox worker `39102038648` delivered a synthetic licence. No live-money payment was made.
- Signed API read/write/delete and expired-trial erasure passed in isolated verification run `39102324242`. The production retention plan preserves six other-product/unclassified records for review. The seven-day migration recovery window ends on 25 October and requires safe-removal review; provider backups remain separately tracked.
- The migrated route fix passed all 12 public release checks with zero failures/skips in `39102389097`; 1,163 unit checks passed. The final notice build subsequently passed run `39103185563`: 1,163 tests, 16 authenticated activation checks and all 12 public gate checks, zero failures/skips. Installer range downloads, protected paths, webhook signature verification and proxy spoof resistance passed.
- The final activation test exposed stale expected notice dates in five browser fixtures; these were updated to the current version. This changed test setup/expectations, not the deployed app.

Atelier, the personal site and synthetic launch sites retain their previously verified deployments. Company details, supplier answers, qualified legal review and remaining native/manual checks are still listed in [the release checklist](legal/RELEASE-CHECKLIST.md).

## Native and draft recovery follow-up — 18 October

- Native testing found that newly saved block drafts were missing from the Write/Posts lists. Chapbook and Atelier now list “Saved on this device” drafts with safe titles and reopening controls. Helm provides the same metadata through an authenticated route. Offline reload and GitHub-failure recovery are covered by the browser suite.
- Chapbook passed 1,169 unit checks and 251 browser checks. The deployed source passed all 12 public release checks, with zero failures/skips. The deployed guard also prevents offering to discard the sole local copy when no remote version is known.
- Atelier passed 720 unit checks and 251 browser checks. Deployment `e424727` completed in Pages run `39165952715`; the live editor includes draft recovery. Helm source `8c55672` passed 1,362 checks, and `8af8649` synchronizes the matching draft-protection UI; its running protected draft route returned 401 without authentication and metadata-only results after authentication.
- The Mac 1.0.11 candidate passed signing, notarization and universal-binary verification. Actual native keyboard entry, backup export and one-item backup import passed. Native zoom and readable light/dark consent are fixed. Version 1.0.12 passed signed/notarized universal-binary verification and reopening of both typed and imported drafts. Its actual preview test exposed a navigation handler rejecting `about:srcdoc`. Version 1.0.13 allows that internal document while preserving the sandbox, and includes the sole-copy draft guard; the final signed/notarized 1.0.13 installer now passes actual launch, saved-draft reopening and preview checks.
- Windows 1.0.13 passed independently hashed installation, responding-process startup and uninstall in run `39167122820`. Its installer remains unsigned. This does not claim an interactive Windows or assistive-technology pass.
- Android 1.0.13 was signed with the existing production certificate and installed as an upgrade; its owner licence persisted. iOS 1.0.13 compiled with Xcode 27 and launched successfully in an iOS 27 simulator after the scene-lifecycle fix. The owner-approved 18 October terms were accepted on Mac, Android and iOS. Mobile sign-in/editor workflows await specific GitHub authorization and manual iOS activation; simulator keyboard forwarding is unreliable. Physical-device validation remains separate.
- Actual Mac 1.0.13 walkthrough: reopened the imported synthetic backup, saved it to the isolated GitHub repository as a draft, published it, and verified the public page plus the native LIVE listing. [Published native test post](https://inayatpanda.github.io/chapbook-launch-test-20261016/blog/native-import-check-20261018/); Pages run `39166878694` succeeded. The final signed installer retained the licence, connection, saved drafts and resized panel width across restart.
- At the end of the 18 October checks, native 1.0.13 remained a draft and public installers were 1.0.9. The 19 October follow-up above supersedes that status. Company identity and external supplier/legal evidence remain deferred/open as explicitly recorded below.

## Launch decision — retention and AI follow-up, 16 October

**Cloud delivery, deletable storage and daily Chapbook retention are operational without the Mac. General public launch still has the specific outstanding items below.** Company identity details remain deferred at the owner's request.

- Production migration verified 42 licences and seven records; sandbox verified four licences and 20 records. The first daily cleanup succeeded with zero removals; six other-product/unclassified records remain protected for review. Helm reconciled all 42 cloud-managed licences.
- Rights-request intake, encrypted case records, restricted export, reviewed deletion, interruption recovery and evidence-gated closure pass the worker tests. The support alias has been activated with owner approval; New support mail stays in Hostinger; earlier Gmail forwarded copies remain in scope for erasure.
- Technical AI origin now persists through post publication and specialised figure/interactive editing. Desktop/mobile disclosure notes render in the post body on all themes. Generated image bytes and correct MIME types are preserved.
- Supplier/AI source review is recorded in [the current review](legal/SUPPLIER-AND-AI-REVIEW-2026-10-16.md). GitHub Pro agreement coverage, provider backup periods, provider cached-object cleanup and historical forwarded-mail retention evidence remain explicit issues. GitHub case #4864841 and Netlify enquiry are submitted; Hostinger human review has been requested.
- Latest validation: 1,150 Chapbook tests, 714 Atelier tests and 32 cloud-worker tests. App metadata alone does not prove universal Article 50 marking compliance. Final consumer/identity/ICO/EU-representative and desktop-distribution checks remain in the release checklist.

The earlier legal revision `2026-10-16` is now live (production source `576d20a`, deploy `6ad18b9ee2ec8e1f96493a83`). Subsequent release evidence is appended below. Older sections are historical test evidence, not current staging status.

## Fresh browser and editor follow-up — completed

- The owner completed GitHub verification. Its final 404 did not invalidate sign-in: Chapbook received the device approval and listed the public repositories.
- Through the actual browser UI, created `inayatpanda/chapbook-launch-test-20261016`, selected Petal, saved a synthetic post to GitHub as a draft, then explicitly published it. Its public page rendered the intended heading and three paragraphs.
- Fixed the ambiguous publication action: drafts now offer **Save draft to GitHub** and **Publish now** separately. Scheduled posts retain their date.
- Fixed public-post reopening: omitted `draft:false` in Markdown no longer defaults an existing public post back to draft. Actual reopen showed **Live**, **Post loaded** and **Take down**.
- Deployed calmer editor spacing and draggable Rough draft/settings dividers to Chapbook and Atelier. Verified real pointer resizing, keyboard adjustment, persistence across reload and double-click reset. Dark mode was visually reviewed. The final browser viewport override did not change the actual 1710px viewport, so those captures are not claimed as fresh phone verification.
- Published three additional synthetic glyph posts for line, 3D and colour modes. Quiet themes use a flat default icon in the reading palette; expressive themes retain 3D. Colour artwork is preserved and 3D conversion includes SVG primitives. The line icon was checked across all six reading surfaces, including Focus hiding decoration. Subsequent live testing exposed and corrected reading-palette bleed into the topic sidebar and a hardcoded dark-theme rail override. Final live checks across all six surfaces retain Petal's dark sidebar ink, with no horizontal overflow; Focus intentionally hides the rail. The isolated site's hourly scheduler is disabled after testing.
- Settings review found a false “Active” provider badge without a saved key and misleading “Local-only” status despite a selected GitHub repository. Both are corrected in the next Chapbook build; the provider correction also applies to Atelier.

Evidence: [new site](readiness-20261015/cloud/fresh-site-created.jpg), [publication choices](readiness-20261015/cloud/publication-choices.jpg), [resizable panels](readiness-20261015/cloud/editor-dividers.jpg), [dark editor](readiness-20261015/cloud/editor-dark.jpg), [Petal glyph](readiness-20261015/cloud/glyph-petal-default.jpg), [colour glyph](readiness-20261015/cloud/glyph-colour.jpg), and [3D glyph with corrected sidebar](readiness-20261015/cloud/glyph-3d-slate.jpg).

## Hosting and content ownership

- Read-only account inspection confirmed Hostinger **Business**, expiring **13 September 2027**, and Netlify **credit-free / 300 credits**, next usage reset **24 October 2026**. Netlify's API exposes the 75% alert setting but did not provide the detailed usage total here. Official pricing charges 15 credits per successful production deploy; no exact allocation of the reported 75% to this work is claimed.
- Hostinger Business supports Node.js. Chapbook now runs on its UK Node service with durable MySQL storage; the personal site also deploys there. The ported endpoints, counters, security headers, paths and migration were verified before the approved production cutover on 18 October. Earlier Netlify deployment identifiers are historical evidence.
- Users' drafts stay in their browser; publication/uploads go directly to their GitHub repository or configured R2 account. Moving the shared Chapbook service does not make RQAI the host of every user's posts or media. Stripe, email and AI remain connected external services. The cloud licence worker can remain on GitHub Actions independently of the website host.

## Earlier legal revision evidence — 16 October

The public/in-app document source now distinguishes RQAI-held account/payment/trial/support records from local drafts, private queue/delivery records from the encrypted ledger, pseudonymous trial-email hashes from anonymous aggregate counters, and deletion of a current file from deletion of history/backups. Trial collection and AI-profile/provider notices explain the relevant data flow before use. Settings now has a separate “Records held by RQAI” explanation, a privacy link and an access/deletion request link; it explicitly says forgetting the device does not erase these records. The publication check reminds authors to review personal data and add required AI disclosures. Public policy pages have a readable text measure and section hierarchy. [Local policy preview](readiness-20261015/cloud/privacy-records-preview.jpg).

Reviewed official Commission Article 50 guidance and FAQs, its updated AI literacy guidance, ICO transparency/pseudonymisation guidance and UK consumer-contract information. The document version is `2026-10-16`; material changes trigger fresh on-device acceptance. This draft does not assert unknown transfer mechanisms, completed automatic erasure or verified AI marking.

Source revision `9df070e` and test-fixture follow-up `c956e64` are saved on `native-builds`. Hosted [Web CI run 38835638719](https://github.com/inayatpanda/chapbook/actions/runs/38835638719) passed all 1,135 tests, the production build/grep checks and all 16 activation browser checks. The browser suite now explicitly verifies that an August policy acceptance prompts renewed agreement and is replaced by the October version. Its first run exposed a stale expected version in the tests; the corrected fixtures and rerun passed. No Netlify production deployment was triggered.

## Cloud licence delivery — verified 15 October

- Confirmed the owner’s Resend account and verified `send.rqai.co.uk`. The existing sending-only key works. A restricted domain-list API response was initially misread as an invalid key; no unnecessary rotation was performed.
- Migrated 41 existing licences and 16 products into an authenticated encrypted cloud ledger in the private sales repository. Cloud processing now owns fulfilment. Helm's existing timer imports support records and never competes to mint or email while the shared control is `cloud`.
- Hosted trial, real Stripe sandbox Checkout, annual renewal advanced with a test clock, partial/full refunds, retry/idempotency and signed revocations passed. The partial refund retained access; the completed refund revoked the renewed key. Test subscriptions were cancelled.
- Verified a genuine production trial through the public endpoint, Resend's **delivered** receipt, the shipped signature verifier and Helm's authenticated support ledger. The cloud ledger now contains 42 licences. The production receipt is `01a14155-0aba-7205-aa9c-e88e7bc654e5`; no key is included in this report.
- Concurrent repeat requests reused that trial and original delivery ID, with no duplicate email or key; hosted run `38806018596` finished with an empty queue and no errors. Emails link directly to activation and report the original trial's actual expiry, including on resend. The follow-up hosted check `38806720794` passed.
- With the owner's explicit approval, accepted the first-run terms and activated the fresh browser using that same genuine production trial key. The activation gate opened the GitHub setup screen successfully.
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

Verification: **13 browser scenarios passed per app**, including manual tokens, account changes, failed repository fetches, incompatible/read-only/missing-branch repositories, cancellation, partial creation recovery and publish feedback. The existing **245 browser checks per app** also passed. Live read-only account checks returned **22 editable repositories** and validated both the personal site and synthetic QA site. The fresh-browser device flow subsequently completed after owner verification, and a new Petal site and post were published through the UI. The earlier [verification screen](readiness-20261015/cloud/github-verification-required.jpg) is historical evidence only.

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
| Chapbook automated tests | 1,135 passed | Staged legal/Settings source/build, including editor dividers and public-post reopening |
| Atelier automated tests | 708 passed | Final editor and portable engine |
| Helm automated tests | 1,359 passed | Backend, shared engine and owner features |
| Website template tests | 80 passed | Theme registry, glyph presentation, booking links, cover resolution and existing site logic |
| Personal-site tests | 65 passed | Existing site logic plus glyph, booking and image helpers |
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
- Earlier Chapbook production editor deploy: `6ad175908c19d584ba00044a` (source `c4c1781`); legal/Settings follow-up is staged locally.
- Private cloud worker source commit: `88e76cf` (the repository also records subsequent runtime state commits).
- Atelier deployed Pages editor commit: `d7f6679` (run `38834534061` succeeded).
- Atelier editor source `08f8519`, built assets `7fff9cc` (provider readiness and publication notice).
- Helm current editor sync `5c1742b`; cloud delivery/support source `ebacb02`.
- Public template latest glyph/reading-palette commit: `1680073`; previous header commit `b4c7b6f`. Earlier commits: `f16c3be` (themes), `b340a76` (published-media subpaths).
- Personal website glyph updates `7be0142`, `afe3096`, `7814ed1` (latest Hostinger run `38835049269` succeeded); previous header commit `338ade3`. Earlier commits: `2939c0e` (themes; Hostinger deployment succeeded), `88f5a45` (shared media URL handling; Hostinger deployment succeeded).
- New synthetic site `4bd7559` (Pages run `38835053658` succeeded); live six-surface sidebar contrast checks passed.

## Remaining limits

- Core writing/publishing workflows are exercised in both products. This is not an exhaustive proof of identical behavior across every UI, server-only feature and native platform. Atelier’s owner backend, CV/apps and local video features remain intentional differences.
- Fresh-browser activation, GitHub approval, site creation and first publication completed. Legal identity, retention/erasure, supplier/transfer and AI-marking work remain as listed above.
- The signed, notarized universal macOS 1.0.13 candidate was installed and exercised; Windows 1.0.13 installation/process/uninstall smoke passed on a clean hosted runner. Windows signing and interactive UI, manual assistive technology, Intel hardware and Android/iOS physical-device checks remain open. Those 18 October release limits are superseded by the 1.0.14 follow-up above. The user’s separate signing work was preserved.
- Customer-owned R2 accounts, booking/calendar accounts and merchant onboarding require each customer's own connected accounts and checks. Chapbook's own actual sandbox purchase/renewal/refund and production trial email delivery passed; a live-money purchase was deliberately not performed.
- Third-party service uptime and future provider/model changes remain outside a one-time release check.

## Suggested next UI improvements

1. Settings: four clear groups (Website, AI, Appearance, Privacy & backups), compact buttons and inactive provider cards collapsed until chosen.
2. A connection summary with selected repository, published URL, last successful check and a specific recovery action; distinguish local draft storage from site hosting.
3. Privacy & backups: show local-only draft count, last export, and clearly separate local deletion from RQAI-held records and remote published content.
4. Keep advanced R2/Worker configuration behind a setup guide so it does not dominate ordinary Settings.
5. Theme previews: let readers compare a homepage and an article, with an explanation of theme-dependent default glyph treatment.
