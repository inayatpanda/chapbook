# Chapbook public-release checklist — updated 19 October 2026

## Implemented and verified

- [x] Versioned public/in-app legal notices, mandatory 18+ confirmation and material-update re-consent tests.
- [x] Separate Terms acceptance and Privacy/AI acknowledgement; AI notices and on-device versus browser speech disclosures.
- [x] Chapbook build, automated tests and production grep gate pass; 1,178 checks and 29 hosted activation checks passed for the all-products licence/profile-dialog fixes on 19 October.
- [x] Atelier: 720 automated tests, release build and smoke pass; matching AI disclosure and origin preservation.
- [x] Cloud delivery works without the Mac. Production and sandbox migrations verified; daily retention enabled and first production cycle succeeded.
- [x] Private request verification, subject-only export, reviewed deletion, interrupted-operation recovery and cross-store closure evidence tested (32 worker tests).
- [x] Helm cloud-managed support copy reconciled; secure deletion/compaction tested.
- [x] New GitHub Actions logs expire after seven days. Published retention periods distinguish provider backups and lawful exceptions.
- [x] Figure/interactive insertion, library save, reopening and parameter rebuild retain technical AI origin; ordinary manual content stays unmarked. Image bytes/MIME and published disclosure tested.
- [x] Support alias created with owner permission; existing Hostinger/Gmail copies disclosed.
- [x] Automatic Gmail forwarding removed with owner approval; new support mail stays in Hostinger, and historical copies remain in scope for review.
- [x] Supplier documents reviewed; GitHub (#4864841) and Netlify enquiries submitted. Hostinger enquiry sent, human review requested.
- [x] Earlier fresh-browser GitHub site creation, publishing, sandbox purchase/renewal/refund and delivery-retry checks passed.

## Remaining release decisions/evidence

- [ ] Verified trader/controller company details — owner will supply later this week; do not re-request.
- [ ] Qualified review of final consumer/privacy/AI terms and cancellation wording; documented ICO fee and EU representative assessments.
- [ ] GitHub Pro processor coverage or a covered alternative; Netlify/Hostinger backup and individual-erasure confirmations.
- [ ] Provider cached-object cleanup and other device backup review completed; the approved private Git rewrite, known Mac clone cleanup and identified historical launch-log cleanup are complete.
- [ ] Support correspondence closure dates and monthly 24-month review operated across Hostinger and Gmail; supplier terms for forwarded copies reviewed.
- [ ] Provider/output-format-specific robust marking validation. App metadata is not a C2PA certificate or independent watermark detection. Plain-text copies and edited external assets can lose metadata.
- [x] Signed, notarized universal macOS candidate installation/startup checks; Windows 1.0.15 install, process-startup and uninstall smoke on a clean hosted runner.
- [x] Theme gallery keyboard filtering and actual 200% browser zoom checked without horizontal overflow.
- [ ] Windows signing/SmartScreen behavior and interactive UI; manual assistive-technology review, Intel hardware and Android/iOS device checks before claiming every distribution ready. Windows 1.0.15 remains unsigned and the download page discloses this; the 1.0.15 Mac/Windows/Android release is published. No iOS installer is released.
- [x] Hostinger plan moved to the UK, with Germany backups. Affected sites, DNS, private-file permissions and seven deployment jobs verified; all eleven paused workflows restored.
- [x] UK MySQL concurrency, signed storage requests, encrypted migration rehearsal and seven synthetic licence/refund/retention/rights workflows passed. Synthetic email was captured locally, not sent.
- [x] Existing queue and webhook credentials verified and installed privately; live startup now rejects masked credential exports.
- [x] Owner-approved Chapbook production cutover: 101 Netlify aliases fenced, all 59 encrypted snapshot records reconciled in UK MySQL, domain/TLS/proxy checks passed and all three cloud workflows restored. Production run `39101984249` and sandbox run `39102038648` succeeded; Resend confirmed the sandbox test licence delivered to the RQAI mailbox. No queue/errors remained.
- [ ] Retired Netlify source and encrypted migration recovery expiry review on 25 October; include them in any intervening rights request. Provider-held backups remain a separate confirmation.
- [x] Matching-commit public release gate passed all 12 checks, with zero failures/skips (run `39102389097`); 1,163 local tests passed. Pretty-URL handling matches the original site.
- [x] Final notice version `2026-10-18`, service worker `chapbook-ae0d2563`, app and health responses verified at the UK origin.
- [x] Final release run `39103185563` succeeded: 1,163 tests, all 16 authenticated activation checks, and all 12 public gate checks with zero failures/skips. Browser fixtures were corrected to the deployed notice version; no further runtime change was needed.
- [x] DNS propagation confirmed on 18 October at 20:03 UTC: the Mac resolver, Cloudflare and Google resolve Hostinger; normal HTTPS `/healthz` returns ready/storage ready without an origin override.

- [x] Saved local drafts are discoverable and reopenable in Chapbook and Atelier; 251 browser checks pass for each, including offline reload and GitHub failure. Helm’s matching authenticated route and 1,362 checks pass.
- [x] Mac native keyboard entry, backup export/import and readable consent checked in 1.0.11. Android 1.0.12 upgrade retains the licence; iOS 1.0.12 launches with the iOS 27 scene fix.
- [x] Final signed/notarized universal Mac 1.0.13 launch, draft recovery, preview and retained settings verified. Actual native synthetic draft save → publish → public page passed; Windows 1.0.13 install/start/uninstall passed.
- [x] Android 1.0.14: GitHub authorization/repo connection, actual keyboard entry, local recovery, upgrade retention, preview, GitHub draft save and publication to the synthetic test site passed.
- [x] Mac 1.0.15 final signed/notarized universal installer launch, retained setup/drafts/panel widths and actual live preview passed; Windows 1.0.15 smoke run `39183248974` passed.
- [x] Valid signed all-products licences activate; unsupported product scopes, expired keys and forged signatures remain rejected. First-run profile and activation error contrast plus keyboard behavior pass the hosted tests.
- [x] iOS 1.0.15 launches and activates with the signed all-products owner licence, with 18 October Terms retained. Device Hub Capture Keyboard resolved simulator input; clipboard cleared afterward.
- [ ] iOS GitHub authorization was explicitly approved and submitted; GitHub requires fresh owner account verification at Confirm access before the editor/publication walkthrough. No iOS public installer is included.
- [x] Final public gate `39184079739`: 1,178 checks, 29 activation checks and 12 public checks passed, zero failures/skips. The 1.0.15 Hostinger downloads match all three verified artifact hashes. Atelier `4d9987b` / `studio-v104` and Helm UI sync `fe075ca` include the matching profile and mobile safe-area fixes.

- [x] Native Android backup export/import and final 1.0.15 safe-area scrolling checks passed. The installed Mac application is now 1.0.15, with licence and drafts retained.

## Current release boundary

The legal revision and private storage endpoint are live. The service is technically operational, but this checklist does not declare a general public launch legally complete. See [supplier/AI review](SUPPLIER-AND-AI-REVIEW-2026-10-16.md), the private fulfilment `PRIVACY-RUNBOOK.md`, and the launch report for run/deployment evidence.

The migrated backend and route fix are `785def1` (Web CI and all public checks passed in run `39102389097`); the latest app source `557f5f8` and native 1.0.15 downloads are deployed (all 12 public gate checks pass in run `39184079739`). Production trial run `39102622954` and Resend delivery were verified after migration, with zero errors and an empty queue. The Windows 1.0.15 installation smoke passed in run `39183248974`; this is not a full interactive device test. The support address passed a synthetic delivery check and all three approved supplier enquiries were submitted. Private case records, mailbox-routing decisions and historical-data cleanup evidence are maintained in the operator's private review, rather than published here.

The owner confirmed on 18 October that Chapbook has no users yet. This is first-launch preparation; preserved licence and test records must not be described as evidence of an existing Chapbook customer base.
