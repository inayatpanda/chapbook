# Supplier and AI review — 16 October 2026

Engineering review complete for the sources and configurations identified below. This is evidence of checks, not a certification or a substitute for resolving the listed contract and output-format gaps. Company identity details are deferred at the owner's request.

Update, 18 October: the Hostinger website/Node hosting plan has moved to the UK;
hPanel identifies Germany as its backup country. Chapbook's production domain
and live licence records have now moved to the UK Hostinger Node/MySQL service.
All 59 source records reconciled; cloud delivery, signed requests and sandbox
email delivery passed after cutover. The Netlify source remains write-disabled
for the seven-day recovery review, not live processing.
Expiry of old India/Singapore hosting copies and complete managed Node backup
coverage still need written confirmation. This location change does not establish
UK-only processing or resolve the outstanding supplier-contract questions.

## Actual supplier checks

| Supplier / current use | Agreement and transfer evidence | Retention / verified configuration | Decision |
|---|---|---|---|
| Netlify — retired source, recovery window and residual infrastructure records | DPA dated 9 June 2026 forms part of the self-serve agreement. Sections 12 and 14 address deletion and transfers; DPF/UK extension, with SCC/UK fallback provisions. | New stores explicitly select `eu-central-1` and strong consistency. This locates stored objects, not all compute, logs or subprocessors. The public DPA does not specify one universal infrastructure backup expiry. | Live service moved to Hostinger on 18 October; review retired source removal on 25 October. Obtain the applicable residual backup/log erasure period before promising provider-wide deletion. |
| Hostinger — application, Node backend, private MySQL and aggregate counters | Existing Hostinger DPA reviewed; hosting account remains the existing Business plan. | UK server1370; hPanel lists Germany backups. Domain/TLS, private permissions, SQL reconciliation and actual cloud delivery checked. Public disclosures now reflect this topology. | Old India/Singapore copy expiry and complete Node configuration backup coverage remain with the technical team; human specialist confirmed escalation on 18 October. Independent encrypted recovery retained for seven days. |
| Resend — licence email | Public DPA dated 31 December 2025 incorporated at signup. The supplier confirms an Article 28 DPA is in force on every account; signed document visible in the correct account's Documents tab. EU SCC modules 2/3, UK Addendum and DPF/UK extension described. | Verified `inayatpanda1` account: transactional 3,000 emails/month at $0; Free plan. Official GDPR page says 30-day message/log retention, seven-day backups, remaining customer data within 90 days after account termination. Earlier message deletion needs supplier support. Stored data is US-based even with an EU sending region. | Contract/reference and applicable plan checked. Ordinary Emails API traffic is not sent to the optional AI editor. Do not call email deletion automatic or immediate outside this window. |
| Stripe — checkout, renewal/refund events | DPA updated 28 September 2026, incorporated into service agreement. Processor for service delivery; independent controller for stated fraud, legal and platform purposes. Transfers covered by the linked Data Transfer Addendum. | Previously tested sandbox purchase, renewal, partial/full refund and webhook retry. Application receives references/status, not full card data. Stripe's own statutory retention can outlast an RQAI erasure request. | Keep statutory payment records separate from deletable support copies. Finish trader identity/checkout legal details when owner supplies them. |
| GitHub — private worker and former versioned fulfilment records | Current customer-terms page lists DPA coverage for Enterprise Cloud, Unified, Teams and Copilot. That page does not establish processor coverage for the personal Pro repository/Actions workload. | **Actual account is GitHub Pro**, confirmed in Billing on 16 October. Actions log retention changed from 90 to 7 days; success banner and setting recorded. This affects new runs; historical records/logs require separate handling. Workflow actions pinned to commit SHAs, no untrusted PR jobs, key remains an Actions secret. | **Open contract gap.** Obtain written coverage for this workload, move it under a covered organisation agreement, or move the worker to an existing covered supplier. Removing runtime files from Git does not remove the Actions processing role. No new plan was bought or agreement accepted. Written confirmation requested in GitHub ticket #4864841. |
| Helm / operator device | RQAI-controlled local support copy; not a separate processor. | Cloud-managed rows enrolled and reconciliation tested. Secure SQLite deletion and checkpoint/vacuum remove current deleted pages. Existing filesystem/Time Machine backups are separate. | Sync after cloud erasure before claiming the active local copy is gone. Review backup expiry and prevent deleted records being restored into production. |
| Support mailbox | Hostinger Free Business Email verified in hPanel; its DPA (15 September 2026) covers Email Services. Google's official guidance says consumer Gmail has no processor DPA. | With explicit owner approval, automatic Gmail forwarding was removed on 16 October 2026. `hello@rqai.co.uk` and its `support@rqai.co.uk` alias remain active in Hostinger. Historical Gmail copies remain in the retention/erasure review. | **Open operating evidence:** Hostinger message backup/erasure periods and review of earlier forwarded copies. Manual 24-month closure review and verified-request handling cover both stores; no automated inbox deletion claim. |

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
