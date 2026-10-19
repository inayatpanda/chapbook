# Supplier and AI review — 16 October 2026

Engineering review updated on 19 October for the sources and configurations identified below. This is evidence of checks, not a certification or a substitute for resolving the listed contract and output-format gaps. Company identity details are deferred at the owner's request.

Update, 18 October: the Hostinger website/Node hosting plan has moved to the UK;
hPanel identifies Germany as its backup country. Chapbook's production domain
and live licence records have now moved to the UK Hostinger Node/MySQL service.
All 59 source records reconciled; cloud delivery, signed requests and sandbox
email delivery passed after cutover. The Netlify source remains write-disabled
for the seven-day recovery review, not live processing.
Expiry of old India/Singapore hosting copies and complete managed Node backup
coverage still need written confirmation. This location change does not establish
UK-only processing. On 19 October the remaining signing/email worker also moved to UK Hostinger; the personal GitHub live-processing contract gap is resolved by retirement of that workload, not by assuming a DPA.

## Actual supplier checks

| Supplier / current use | Agreement and transfer evidence | Retention / verified configuration | Decision |
|---|---|---|---|
| Netlify — retired source, recovery window and residual infrastructure records | DPA dated 9 June 2026 forms part of the self-serve agreement. Sections 12 and 14 address deletion and transfers; DPF/UK extension, with SCC/UK fallback provisions. | New stores explicitly select `eu-central-1` and strong consistency. This locates stored objects, not all compute, logs or subprocessors. The public DPA does not specify one universal infrastructure backup expiry. | Live service moved to Hostinger on 18 October; review retired source removal on 25 October. Obtain the applicable residual backup/log erasure period before promising provider-wide deletion. |
| Hostinger — application, Node backend, private MySQL, licence worker and aggregate counters | Existing Hostinger DPA reviewed; hosting account remains the existing Business plan. | UK server1370; hPanel lists Germany backups. Domain/TLS, private permissions, SQL reconciliation and actual cloud delivery checked. Public disclosures now reflect this topology. | Old India/Singapore copy expiry and complete Node configuration backup coverage remain with the technical team; human specialist confirmed escalation on 18 October. Independent encrypted recovery retained for seven days. |
| Resend — licence email | Public DPA dated 31 December 2025 incorporated at signup. The supplier confirms an Article 28 DPA is in force on every account; signed document visible in the correct account's Documents tab. EU SCC modules 2/3, UK Addendum and DPF/UK extension described. | Verified `inayatpanda1` account: transactional 3,000 emails/month at $0; Free plan. Official GDPR page says 30-day message/log retention, seven-day backups, remaining customer data within 90 days after account termination. Earlier message deletion needs supplier support. Stored data is US-based even with an EU sending region. | Contract/reference and applicable plan checked. Ordinary Emails API traffic is not sent to the optional AI editor. Do not call email deletion automatic or immediate outside this window. |
| Stripe — checkout, renewal/refund events | DPA updated 28 September 2026, incorporated into service agreement. Processor for service delivery; independent controller for stated fraud, legal and platform purposes. Transfers covered by the linked Data Transfer Addendum. | Previously tested sandbox purchase, renewal, partial/full refund and webhook retry. Application receives references/status, not full card data. Stripe's own statutory retention can outlast an RQAI erasure request. | Keep statutory payment records separate from deletable support copies. Finish trader identity/checkout legal details when owner supplies them. |
| GitHub — source/builds, user-owned publication repositories, historical fulfilment copies | Personal Pro DPA coverage for the former delivery workload was not established. The approved alternative is the existing covered Hostinger service. | On 19 October production/sandbox delivery and privacy workflows were disabled, signing/email secrets removed from Actions, and the one-time encrypted transfer workflow retired after verified Hostinger delivery. Source builds contain no licence ledger or signing/email credential. | **Live licence-processing gap closed by migration.** Provider-side historical cached-object removal remains ticket #4864841; historical copies still require retention/rights handling. Users' publishing integrations are separate. |
| Helm / operator device | RQAI-controlled local support copy; not a separate processor. | Cloud-managed rows enrolled and reconciliation tested. Secure SQLite deletion and checkpoint/vacuum remove current deleted pages. Existing filesystem/Time Machine backups are separate. | Sync after cloud erasure before claiming the active local copy is gone. Review backup expiry and prevent deleted records being restored into production. |
| Support mailbox | Hostinger Free Business Email verified in hPanel; its DPA (rechecked: 29 September 2026) covers Email Services. Google's official guidance says consumer Gmail has no processor DPA. | With explicit owner approval, automatic Gmail forwarding was removed on 16 October 2026. `hello@rqai.co.uk` and its `support@rqai.co.uk` alias remain active in Hostinger. Historical Gmail copies remain in the retention/erasure review. | Hostinger message backup/erasure periods remain open; the scoped historical Gmail and current Hostinger age reviews found no overdue matching correspondence. Manual 24-month closure review and verified-request handling cover both stores; no automated inbox deletion claim. |

The RQAI controller/trader name cannot be replaced by a website domain. Contracting-party details and account documents must be reconciled when the legal identity is supplied.

## AI provider checks

AI calls use the author's own API credentials and go directly to the selected provider. RQAI does not train a model on drafts. This architecture does not remove RQAI's downstream AI-system responsibilities or make a provider's account-specific retention settings universal.

| Provider | Relevant current terms / data behaviour | Product action / limit |
|---|---|---|
| Gemini | Additional terms effective 23 March 2026: API user 18+; API clients must not be directed at or likely accessed by under-18s; UK/EEA/Swiss clients require Paid Services, defined for the API by an active Cloud Billing project. Paid inputs/outputs are not used to improve Google products; abuse/safety retention still applies. Clinical practice and medical advice are prohibited uses. | Public launch age confirmation and terms changed to 18+. Settings explain API billing versus chat subscription and clinical restriction. An API key alone is not proof of its billing status. Owner supplied the testing key as paid-tier. Do not claim individual customer billing verified. |
| OpenAI API | API inputs/outputs are not used for training by default; abuse monitoring is normally up to 30 days with stated exceptions. State retention depends on endpoint and account controls. | Uses chat completion/image routes; no app claim of zero retention. Provider region controls are not inferred from the author's location. |
| Anthropic API | Commercial API policy normally deletes inputs/outputs within 30 days, with safety/legal and agreed/model-specific exceptions. Consumer Claude subscription settings are a different contract. | Show selected provider and voluntary action. No blanket zero-retention promise. |
| Groq | Ordinary inference is not retained by default, with reliability/abuse logging up to 30 days and stated exceptions; batch/fine-tuning have other rules. Customer DPA incorporated in services agreement. | No batch or fine-tuning route in current authoring seam. Do not equate normal inference with a verified account-wide ZDR setting. |
| Cloudflare Workers AI | Optional image generation runs through the user's configured Worker/binding. RQAI does not operate their R2 bucket. | Mark generated image origin and add visible default caption. Do not claim a provider watermark or a processor contract held by RQAI for the user's separate account. |

## Article 50 / format inventory

Reviewed Commission guidelines (6 August 2026) and current FAQ: interaction notice is distinct from machine-readable output marking; standard editing may be exempt; public-interest text and realistic synthetic media have distinct deployer disclosures. Source code has an exclusion, but an exported visual/text result still needs its own assessment. Human review of text does not automatically excuse deepfake disclosure.

Implemented controls:

- AI entry points and Partner identify AI. The user controls insertion and publication.
- Newly accepted draft/Partner, structured blocks, generated images and returned figure/interactive blocks receive technical origin data; ordinary editing is distinguished from generation.
- Origins persist through local draft JSON, post sidecars, frontmatter, Markdown comments and marked published block HTML. No prompt, source document, API key or personal profile is put in that metadata.
- Desktop/mobile post settings include a visible AI disclosure note, rendered above the post on all themes, including older sites because it is in the post body.
- Generated image bytes are not recompressed by the publishing path. The filename matches PNG/WebP/JPEG MIME type instead of always claiming JPEG. A default visible AI illustration caption is added.
- Post/frontmatter origin tests cover safe serialisation, field minimisation, unlabelled human text and exact preservation of generated bytes. Existing authoring, preview, safety and publication suites remain release gates.

Limits requiring explicit review before a claim of full conformity:

- Technical application metadata is not a cryptographically signed C2PA manifest or a robust watermark. There is no universal model-independent detector.
- Google documents SynthID for generated imagery, but preservation of supplied bytes is not an independent detector verification of every generated file. OpenAI/provider-specific credentials and changed models need their own real-asset validation.
- Plain-text clipboard/social exports, screenshots, externally edited assets and legacy/manual imports can lose origin information. A visible disclosure must accompany content where required. Figure and interactive insertion, parameter rebuild, library save and reopening now have regression coverage in both apps.
- Model, provider, output format and major editing changes trigger re-review. The application must not advertise “EU AI Act certified”.

## Live retention evidence

- Production migration verified 42 licences and seven delivery records; run `38840714343` succeeded. Sandbox migration verified four licences and 20 records; run `38841575926` succeeded.
- Isolated cloud read/write/delete drill succeeded (`38840588305`), with no email. Production daily retention is enabled (`38841197490`) and completed on 16 October: zero removals, six records outside Chapbook or needing classification protected for review.
- Helm reconciled all 42 cloud-managed licences, removing zero current records. Future removed cloud records disappear from its active SQLite copy at the next successful sync.
- Rights-case tests cover encrypted intake, month-end deadline calculation, a subject-only export, reviewed deletion and refusal to close a case without evidence for all stores.
- The approved rewrite removed retired runtime records from reachable private Git history and the known Mac clone. Identified launch-test logs containing references were removed, and cloud delivery was rechecked successfully. Provider cached-object removal and other-device copies still require evidence; no claim of provider-wide historical erasure or automatic support-mail cleanup is made.

## Sources

- Netlify DPA (9 June 2026): https://compliance-buddy-gateway.netlify.app/api/trust/doc?id=netlify-data-processing-agreement-dpa-20260609-2-pdf
- Netlify Trust Center: https://www.netlify.com/trust-center/
- Netlify Blobs regional/conditional-write API: https://docs.netlify.com/build/data-and-storage/netlify-blobs/
- Resend DPA: https://resend.com/legal/dpa
- Resend operational GDPR/retention statement: https://resend.com/security/gdpr
- Resend subprocessors: https://resend.com/legal/subprocessors
- Stripe DPA: https://stripe.com/gb/legal/dpa
- Stripe transfer terms: https://stripe.com/legal/dta
- GitHub applicable customer agreements: https://github.com/customer-terms
- GitHub sensitive-history cleanup: https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/removing-sensitive-data-from-a-repository
- Gemini API terms: https://ai.google.dev/gemini-api/terms
- Gemini image generation: https://ai.google.dev/gemini-api/docs/image-generation
- OpenAI API data controls: https://developers.openai.com/api/docs/guides/your-data
- Anthropic commercial retention: https://privacy.claude.com/en/articles/7996866-how-long-do-you-store-my-organization-s-data
- Groq data controls: https://console.groq.com/docs/your-data
- Groq DPA: https://console.groq.com/docs/legal/customer-data-processing-addendum
- Commission transparency guidelines: https://digital-strategy.ec.europa.eu/en/policies/guidelines-ai-transparency-obligations
- Commission Article 50 FAQ: https://digital-strategy.ec.europa.eu/en/faqs/transparency-obligations-under-article-50-ai-act

- Hostinger DPA: https://www.hostinger.com/legal/dpa
- Hostinger mailbox-account recovery: https://www.hostinger.com/support/1583466-how-to-restore-a-deleted-hostinger-email-account/
- ICO erasure and backups: https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/individual-rights/individual-rights/right-to-erasure/
- Google consumer Gmail processor terms: https://support.google.com/policies/answer/9581826/privacy-help-center

## Follow-up audit — 19 October 2026

The checks below distinguish completed engineering work from supplier evidence and legal decisions. They do not certify compliance. The company identity remains deferred; no identity, registration, legal representative or training completion has been invented.

### Supplier follow-through

- **GitHub #4864841:** the third comment is visibly recorded and the ticket remains open. It requests both the agreement covering the actual Pro Actions workload and provider-side historical-object cleanup. No supplier answer is present. At the time of that enquiry only storage had moved; the subsequently approved 19 October worker cutover now removes live signing/email processing from Actions.
- **Netlify #1145303:** its 16 October email asked for confirmation before routing the enquiry to a specialist. That confirmation was sent on 19 October, with the completed cutover and the 25 October recovery deadline. The reply requests separate periods for deleted objects, versions/replicas/backups, Functions/security logs and cached copies. It explicitly requests information only, without reactivating or deleting the project.
- **Hostinger #24468774:** the existing ticket was escalated again. Human agent Luciene confirmed at 06:03 BST that technical specialists still need to answer the backup questions. The open items are expiry of old India/Singapore copies, managed Node source/environment/private-configuration backup scope, and Free Business Email deleted-message/backups/log periods. Generic hosting backup schedules do not answer these questions.
- **Hostinger DPA:** rechecked the current 29 September 2026 version. Hosting and Email Services are expressly covered; the DPA supplements the service terms. Its service-wide subprocessor list is not proof that every listed provider handles this particular mailbox. The exact mailbox backup/log answers remain open. [Current DPA](https://www.hostinger.com/legal/dpa).
- **Historical Gmail:** a scoped review found recent test/business mail and no matching RQAI inbox/CC correspondence before 19 October 2024. This is a limited age-window check, not a claim that all forwarded/sent/archived copies were erased. Nothing was deleted. The separate Hostinger mailbox was subsequently reviewed after the owner signed in; see the closure note below.

### Real asset verification and export repair

A synthetic notebook image was generated through the real Chapbook Gemini adapter using `gemini-3.1-flash-image`. It contains no customer material and was not published. The actual post-publishing implementation preserved all 754,271 JPEG bytes. SHA-256: `a1eb056bdb821036cec9e9f828e58a8e6518ae15f9ed9a295836ee01cd3ca8fd`.

The official `contentauth/c2patool` 0.28.2, using the official C2PA trust list, reports **Trusted**, with no validation failures. Signature, content hash, timestamp and signing trust validate; the manifest identifies Google generation and application of SynthID. This verifies the credential and its preservation, not the independent watermark detector. The owner subsequently approved the SynthID test. Three uploads of this exact original image returned a service error; no independent watermark detection result was obtained. [Verification tool](https://github.com/contentauth/c2patool), [Google detector information](https://deepmind.google/models/synthid/).

Chapbook and Atelier now preserve technical origin through social cards, planner normalisation, editing, marking shared, requeueing and reopening. Known generated social text carries a visible notice on Copy/Share; ordinary human and assistance-only records are not blanket-labelled. Character counts include that notice. “Copy all” reads the edited thread parts. Cards that derive their title directly from a known generated draft include a visible footer notice. Manual card text cannot safely be classified by guessing its origin.

Regression checks exercise the actual UI handlers and include human-content negative cases, field minimisation, edited copies, queue persistence and repeated-export idempotence. These notices supplement existing post JSON/frontmatter/HTML metadata; they are not statistical watermarks.

### Provider / output decisions

| Route | Evidence and configuration | Closure decision |
|---|---|---|
| Gemini original image | Actual trusted C2PA sample and exact-byte publishing test above | Credential preservation verified for this model/sample. Independent SynthID check attempted twice with owner approval; detector returned service errors. Recheck model/output changes. |
| Gemini API text | Google documentation distinguishes its text watermarking toolkit/app from the API; an August developer-forum reply explicitly reports no API text watermark | Do not infer API text marking from Gemini images or the consumer app. No robust-text closure claim. [Google toolkit](https://ai.google.dev/responsible/docs/safeguards/synthid), [API clarification](https://discuss.ai.google.dev/t/does-gemini-api-text-output-carry-synthid-watermarking-gemini-2-5-flash-lite-gemini-3-1-flash-lite-eu-ai-act-art-50-2/177241/2). |
| Claude API text | Current supplier table lists Opus 4.8 and specified newer models as watermarked; some earlier models are not. Detector access remains restricted | Preserve wording and origin; check the actual model. Supplier coverage evidence is available, but no independent detector result is claimed. [Model coverage and detection](https://support.claude.com/en/articles/16266773-how-claude-marks-ai-generated-content). |
| OpenAI API text | Watermarking must be enabled for supported models in the customer's project/organisation settings | Settings now explain this prerequisite. A BYOK credential does not verify the customer's configuration. [Provider controls](https://help.openai.com/en/articles/8912793-provenance-signals-in-openai-generated-content). |
| OpenAI images | The old `gpt-image-1` default is excluded from current provenance coverage. Adapter now uses documented everyday-generation model `gpt-image-2.5-flare` | Request/response contract tested, original bytes retained. No configured OpenAI key is available for a real-asset test, so account access and actual credentials remain unverified. [Image API](https://developers.openai.com/api/docs/guides/image-generation). |
| Groq / user-owned Workers AI | No model-specific marking evidence established by this audit | Do not advertise verified marks. Exact model/output and upstream support need review. |
| Figures, interactive HTML, manual imports and derived media | Application origin survives the tested authoring/library/publishing paths; HTML export includes origin metadata | Container metadata and visible notices do not prove robust watermarking. Manually imported assets, rasterised derivatives, heavy edits and external transformations remain outside the validated original-image path. |

The final Commission Code describes complementary metadata/watermark techniques and a detection mechanism; a plain label or output log alone is not equivalent. Its local-key caveat does not excuse every other marking requirement. The code is voluntary, while Article 50 duties apply independently. No code-signatory application was submitted. A defensible alternative-measures assessment or provider-supported marking is still required for unsupported output paths before claiming full Article 50 conformity. [Final code, measures 1.1–1.3 and commitment 2](https://ec.europa.eu/newsroom/dae/redirection/document/129555).

### Operator process and outstanding identity decisions

The intended product is a writing/site-design assistant. No clinical diagnosis, treatment recommendation, eligibility scoring, recruitment ranking, biometrics or other high-impact decision workflow is part of this review. The prior request for a doctor's or beauty business's website is a presentation/booking-link use case, not medical decision software. Adding such decision features requires a new assessment. An `assisted` metadata tag describes the editing route; it does not itself establish a statutory editing exemption.

Operator induction material is already available in the AI notice and Settings. Before another person handles customer content, cover provider choice/billing, sensitive-input minimisation, hallucination/source checking, copyright/consent, origin labels, human review, and incident escalation. Keep a dated attendance/practical-check record; no person is recorded as trained merely because this document exists. Revisit after model/provider or feature changes. The current Commission guidance describes a contextual duty to support AI literacy, not a prescribed certificate. [AI literacy FAQ](https://digital-strategy.ec.europa.eu/en/faqs/ai-literacy-questions-answers).

**ICO fee assessment:** RQAI's automated licence/support processing makes an exemption unsafe to assume. The final assessment must cover the actual legal entity's whole processing activity, turnover/staff and any existing registration. Record that result with the company details; do not register or pay for an invented entity. [ICO assessment](https://ico.org.uk/for-organisations/data-protection-fee/data-protection-fee-self-assessment/).

**EEA representative assessment:** recurring sales/support to EEA customers should not be treated as merely occasional processing just because the business is small. Confirm establishment and intended targeting with the final company details, then document the applicable exception or appoint a representative before relying on it. UK hosting adequacy does not settle this separate question. No appointment or service contract has been made. [ICO guidance](https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/international-transfers/receiving-personal-information-from-the-eea/).

**Retention operation:** the 19 October production cycle completed at 01:03:59 UTC: zero removals and six protected review records. Delivery health at 04:56:28 UTC reports zero errors and an empty queue. All 32 fulfilment/privacy tests pass. Keep provider backups and the dated 23/25 October recovery expiries in the rights-case inventory. Restore with delivery disabled, reconcile against authoritative current state and all intervening rights cases, and document each store before reopening service. Counts-only receipts are not a substitute for that reconciliation.

Evidence is held in the operator-private `chapbook-operations-private/2026-10-19/compliance/` folder. It includes supplier screenshots, the real asset/hash, trusted C2PA report, count-only cloud health and test logs. Credentials, raw customer records and private correspondence are excluded from this repository.

### Approved follow-through — 19 October

- **Hostinger mailbox reviewed:** 12 Inbox messages and eight Trash messages, all dated July–October 2026; Sent and Spam are empty. No correspondence in these reviewed folders exceeds the 24-month review threshold. Current synthetic delivery/routing checks and the open supplier enquiry are retained; unrelated business/identity correspondence was not opened or deleted. Hostinger’s 16 October GDPR acknowledgement confirms routing to its dedicated team but contains no substantive backup/individual-erasure answer. The UI advertises automatic deletion after 30 days in Trash; that is not evidence of provider backup expiry. No deletion was performed, and recurring review remains an operator duty.
- **SynthID attempted with permission:** the exact original notebook JPEG was uploaded three times through the normal detector UI after Google sign-in. All three attempts returned “Something went wrong! Please wait and try again later”. This is neither a positive nor negative watermark result. The trusted C2PA report and original-byte preservation remain verified separately; independent watermark detection remains blocked by the detector service.
- **Android signing resolved:** the existing Chapbook release key was located and its SHA-256 certificate fingerprint matched the published APK. The separate OrthoLog key was rejected as a mismatch and was not used to sign Chapbook. Version 1.0.18 is signed and successfully upgrades the test emulator while preserving activation and GitHub setup; the new AI guidance is visibly present. No password or private key was copied into source or output.

## Launch-gate clarification — 19 October

See the current decision at the top of `RELEASE-CHECKLIST.md`. Supplier replies about residual backups are not automatically a reason to withhold the entire product. Their contracts, safeguards, beyond-use treatment, restore controls and honest disclosures must be assessed together. GitHub personal Pro execution is different: the processor-contract applicability for ongoing licence processing remains unestablished. A tested Hostinger worker alternative is prepared, not enabled.

Independent SynthID web verification remains unavailable, while the real Gemini file's trusted C2PA verification passed. Neither a detector outage nor an untested optional provider is automatically a legal ban on the complete editor. The open AI decision concerns the actual enabled generation/model/export scope. The voluntary transparency Code is one compliance route, not itself legislation; choosing another route still requires adequate evidence against Article 50. Existing origin labels and exact-byte preservation are useful controls, not proof covering every output or API model. No broad AI conformity declaration or grace-period eligibility is asserted.


## Owner decision and direct checks — 19 October 2026

The owner expressly chose to keep all AI routes available after considering a temporary restriction of unverified generation. No generation route is removed. This resolves the product-choice question, not the underlying Article 50 assessment. Existing origin metadata, public-disclosure controls, original-image byte preservation and provider-specific Settings guidance remain enabled. No full-conformity or universal watermark claim is made.

The Commission FAQ was rechecked: standard editing and source code have distinct treatment, but generated prose and rendered image/interactive output cannot be categorically exempted as source code. A voluntary code is one route; alternative adequate measures need evidence. Account-specific OpenAI marking and detector access cannot be inferred from a saved API key. OpenAI's documented verification API checks supported OpenAI signals; it cannot close the Gemini test by substitution, and text verification requires approved access. [Official API verification documentation](https://developers.openai.com/api/docs/guides/content-provenance), [Commission FAQ](https://digital-strategy.ec.europa.eu/en/faqs/transparency-obligations-under-article-50-ai-act).

Current direct-test limits: the original Gemini image's C2PA trust and byte preservation passed; independent SynthID requests returned service errors. No configured OpenAI generation credential or approved text-detector access was available for an equivalent independent test. Claude, Gemini API text, Groq, Workers AI and transformed/imported outputs retain the route-specific qualifications in the matrix above. Existing supplier backup/cache questions remain follow-ups; no supplier reply is being treated as a substitute for direct technical evidence.

### Hostinger worker verification

The owner explicitly authorised moving production/test signing keys and the existing Resend sender credential. Transfer used encryption to the existing private Hostinger store; no credential artifact was published. Hostinger holds a private mode-0700 worker directory and mode-0600 configuration outside public and replaceable web files. The actual Linux runner passed 37 tests and a real flock overlap/release check. A one-minute hPanel cron independently delivered a synthetic sandbox licence and processed its full refund; the Resend dashboard confirmed both the licence email and generic refund notification delivered. Exactly one test licence was minted and then revoked. Public production revocations retained every prior identifier.

The Hostinger signed-API retention drill passed read/write/conditional-delete, expired-trial erasure and abuse-hash preservation. The production plan found zero eligible removals and preserved six other-product/unclassified records. Helm synchronised all 43 production licences without becoming a delivery writer. No real payment was taken. Hostinger/Resend/Stripe DPAs were rechecked on 19 October; their published contractual terms are recorded separately from pending backup-specific supplier answers.

Final deployment evidence: source `1d8db5c`, native `1.0.19`, live public gate `39214382999` passed. The managed app was restarted with both backend configurations free of the GitHub queue token. A subsequent public trial returned 200, was delivered by the independent Hostinger cron, and reused its existing key. Both production/sandbox queues were empty with zero errors. The transient local credential copy and encrypted transfer object were removed after verification. All AI routes remain available by the owner's explicit decision; no unsupported marking result has been converted into a compliance pass.
