# Chapbook and Atelier launch verification — 15 October 2026

The tested web workflows are deployed. This is a record of verified behavior and remaining account/device checks, not a promise that every possible feature and environment is issue-free.

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

## Booking and payments

Cal.com event links offer a click-to-load calendar on the Appointments page. Other HTTPS providers work as external booking links. Individual services can have separate booking links. A direct link remains available if the embedded provider fails to load.

Appointment records, calendar availability, confirmation/reminder emails and any payments belong to the business’s booking provider. Cal.com can connect to Stripe for paid appointments. The website price field is display text, not an automatic payment configuration.

**No merchant account or real customer calendar was connected. No real appointment, confirmation email or charge was created.** The actual Cal.com embed library was exercised with an intercepted synthetic booking frame, and its failure fallback was checked. Each business must connect its calendar/payment account, configure its event types and policies, and validate a booking and provider-supported test payment before accepting customers.

See [booking setup](booking-and-business-sites.md) for the owner steps and official provider references.

## Verification evidence

| Area | Result | Scope |
|---|---|---|
| Chapbook automated tests | 1,100 passed | Final source/build, including gallery route consistency |
| Atelier automated tests | 687 passed | Final editor and portable engine |
| Helm automated tests | 1,339 passed | Backend, shared engine and owner features |
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

- Chapbook production Netlify deploy: `6ad11287a3d390f751496b90`.
- Atelier deployed Pages commit: `73c28dabd63489a69cec19f934e13cb7aa42c3be`.
- Atelier source commit: `1b196d6`.
- Helm source commit: `112936f`.
- Public template commits: `f16c3be` (themes), `b340a76` (published-media subpaths).
- Personal website commits: `2939c0e` (themes; Hostinger deployment succeeded), `88f5a45` (shared media URL handling).

## Remaining limits

- Core writing/publishing workflows are exercised in both products. This is not an exhaustive proof of identical behavior across every UI, server-only feature and native platform. Atelier’s owner backend, CV/apps and local video features remain intentional differences.
- Fresh human GitHub OAuth consent was not completed. Existing authenticated GitHub API access, the hosted activation gate and OAuth relay behavior were checked. The user did not need to sign in again for this work.
- Windows/Android/iOS devices, OS installer execution, camera/microphone permission prompts and hardware capture were not tested on physical devices. Existing installer downloads and hashes were checked; signed native wrappers were not rebuilt. The user’s separate signing work was preserved.
- Customer-owned R2 accounts, booking/calendar accounts, merchant onboarding, actual charge/refund delivery and transactional email delivery require their own connected accounts. The presence of a live Chapbook checkout link is not a completed purchase test.
- Third-party service uptime and future provider/model changes remain outside a one-time release check.
