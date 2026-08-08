# Chapbook launch compliance record

Status date: 8 August 2026

Document owner: RQAI Ltd

Product: Chapbook web/PWA and desktop bundles
Public legal version: `2026-08-08`

This record supports the public Legal Centre and is not a legal opinion or certification. It must be reviewed whenever data flows, providers, pricing, company details, target jurisdictions or AI capabilities change.

## Executive assessment

Chapbook is a local-first writing and self-publishing tool. Drafts, Partner threads, profile and credentials remain in the browser/app by default. Users deliberately connect their own GitHub, AI and optional Cloudflare R2 accounts. RQAI does receive limited purchase/licence, trial, operational, support and anonymous aggregate data.

The intended product does not perform prohibited practices or Annex III high-risk decisions. Principal risks are credential exposure, local draft loss, personal/confidential data sent to providers, inaccurate/synthetic AI publication, public disclosure failures, children publishing personal data, fulfilment data retention and third-party transfers.

Implemented launch controls include mandatory versioned clickwrap before activation or app use, separate Terms/notice confirmations, a public/in-app Legal Centre, explicit Partner AI notice, accurate local-vs-browser speech disclosure, human-controlled publication and a tested local data wipe/export path.

## Release blockers requiring accountable-owner confirmation

| Priority | Item | Status / required evidence |
|---|---|
| P0 | Controller/trader identity | Insert verified Companies House registered name, company number, registered/service address and any VAT details required on checkout/invoices. The repository currently proves only “RQAI Ltd, United Kingdom”. |
| P0 | ICO position | Save the UK data-protection fee self-assessment and registration/reference if applicable. |
| P0 | Checkout/cancellation | Verify Stripe checkout clearly shows trader, total price/tax, annual auto-renewal, immediate digital supply/cancellation wording and confirmation email. |
| P0 | Processor contracts | File current DPAs/transfer terms for Netlify, Stripe, GitHub fulfilment queue and RQAI email/support. |
| P0 | Legal review | UK consumer/privacy counsel signs off subscription, refunds, liability, minors, EU offering, Article 50 role/marking and consumer cancellation flow. |
| P1 | EU representative | If intentionally offering to EEA users and Article 27's exception is unavailable, appoint/list an EU representative. Record counsel's conclusion. |
| P1 | AI provenance | Test each text/image/figure export for provider provenance. Add durable `aiGenerated` metadata and C2PA/content credentials where technically applicable. UI notice alone is not proof of Article 50(2) compliance. |
| P1 | Fulfilment retention | Define and automate retention for trial queue, licence ledger, Stripe-derived records and support mail; current public notice describes purpose-based periods. |
| P1 | Windows trust | Windows installer is unsigned unless a certificate is configured; disclose/test SmartScreen impact before general release. |

## Record of processing activities (ROPA)

| Activity | Data | Purpose | Basis | Recipient | Retention |
|---|---|---|---|---|---|
| Site/app delivery | IP, URL, time, browser/security metadata | Deliver and secure Chapbook | Contract/request; legitimate interests | Netlify | Configured operational/security period; verify |
| Local authoring | Drafts, Partner threads, profile, snapshots, ideas, settings | Offline writing/publishing | On-device under user control; RQAI does not receive by default | None | Until delete/clear/uninstall |
| Clickwrap | Legal version, timestamp, method, three affirmative flags | Terms/accountability | Contract; legitimate interests | On device only | Until cleared or superseded |
| Purchase/licensing | Name/email, Stripe event/customer/payment references, product, key/status | Payment, licence delivery, renewals, support, accounting, fraud | Contract; legal obligation; legitimate interests | Stripe, RQAI fulfilment/email | Applicable tax/limitation period, commonly up to six years after end |
| Trial | Email, product, request time, canonical-email hash, transient IP throttle | Deliver one trial and prevent reset/abuse | Pre-contract steps; legitimate interests | Netlify function, private GitHub queue, RQAI fulfilment/email | Trial/anti-abuse need, then claims/support requirement |
| Aggregate metrics | Per-day visit/install/activation count | Product operations | Legitimate interests; counters carry no user identifier | Netlify Blobs | Longitudinal aggregate |
| GitHub device login | Step, GitHub device code/token exchange payload, transient IP throttle | Overcome browser CORS for optional sign-in | User request/contract; security legitimate interests | Netlify relay, GitHub | Relay stores nothing; platform logs apply |
| User GitHub publishing | Posts/media/repo metadata/token | Publish/manage user's blog | User-GitHub contract | GitHub | User repository/history |
| AI assistance | Prompt, draft/profile context, conversation, image/source | User-requested generation/editing | User-provider contract | Anthropic, OpenAI, Google Gemini or Groq | Provider terms |
| Local Whisper | Temporary recorded audio, cached model, transcript | Private dictation | On-device | Same-origin model download; no audio recipient | Audio in memory; model cache until clear |
| Browser Live dictation | Audio/transcript | Optional live recognition | User-selected browser service | Browser/OS vendor where applicable | Vendor terms |
| User R2 | Media, bucket identifiers/credentials | Optional upload/library/image generation | User-Cloudflare contract | User's Cloudflare account/Worker | User controls bucket; platform logs/versions apply |
| Support/rights | Email/message/attachments and verification data | Support, complaints, rights, disputes | Contract; legitimate interests; legal obligation | RQAI communications/advisers | Normally 24 months after closure; longer for dispute/duty |

No behavioural advertising, personal-data sale or third-party analytics is designed into the current product.

## DPIA

### Screening

- Innovative/generative AI and speech: yes.
- Large-scale monitoring or profiling: no.
- Significant solely automated decisions: no; prohibited by intended use.
- Special-category data required: no; free-form drafts may contain it.
- Children likely to access: possible; independent-use age 16, guardian route.
- Public publication: yes, at the user's deliberate action.
- International transfers: possible through suppliers and user-selected providers.

A proportionate DPIA is required and maintained because free-form content, AI and public publishing can combine to create high impact despite local-first defaults.

| Risk | Inherent | Controls | Residual | Next action |
|---|---:|---|---:|---|
| Credential theft from browser/shared device | High | restrictive CSP, local config separation, scoped GitHub access, forget-device wipe, token guidance | Medium | Explore OS credential vault/WebCrypto; security test each release |
| Draft loss after browser clear/device loss | High | export/import, GitHub publication, persistent warning, local app bundles | Medium | Add optional encrypted backup/sync; restore drill |
| Personal/confidential data sent to AI | High | BYOK, provider shown, explicit actions, legal/onboarding notices | Medium | Add context preview/minimisation reminder on every AI route |
| Hallucinated/defamatory/infringing public post | High | AI label, human edit/publish, checks, AUP, no auto-publish | Medium | Pre-publish AI/fact/provenance checklist |
| Synthetic material not disclosed/marked | High | point-of-use disclosure, public AI notice, human editorial control | Medium/High | Implement durable provenance/disclosure fields |
| Child publishes identity/location | High | age/guardian confirmation, no central profile, deliberate publish | Medium | First-publish privacy/audience warning |
| Trial/purchase data retained too long | Medium | private queue, hashed dedup, limited fields, public retention explanation | Medium | Automated retention/deletion schedule and quarterly audit |
| Relay abused or leaks token | High | no stored secret, hardcoded GitHub endpoints, CORS allowlist, rate limit, tests | Low | Log-minimisation/penetration review |
| User-generated code escapes preview | High | DOMPurify, raw gates, sandbox/CSP, tests | Low | Keep adversarial XSS release gate |
| Inaccessible creative/publishing flow | Medium | semantic controls, keyboard/focus work, checks and statement | Medium | Manual AT audit and alternatives |

No unresolved residual high risk requiring ICO prior consultation is identified for the documented intended use. Re-screen before central draft hosting, behavioural analytics, model training, school/workplace administration, biometric inference or consequential decisions.

## EU AI Act assessment

### Roles/classification

- Anthropic/OpenAI/Google/Groq are the relevant GPAI/model providers.
- RQAI likely provides the Chapbook AI interface/system under its own name and should meet downstream provider transparency/accountability duties.
- Professional publishers using output may be deployers.
- Intended system: transparency/limited-risk generative authoring, not prohibited and not Annex III high-risk.
- Article 4 AI literacy applies to staff/contractors operating/supporting AI.
- Article 50 interaction duties apply from 2 August 2026.

### Control matrix

| Duty | Current evidence | Gap/action |
|---|---|---|
| Inform person of AI interaction from the start | Partner banner; AI/✦ labels; first-use notice; generated-turn labels | Manually inventory every AI entry point per release |
| Clear, accessible notice | Textual notice before Partner chat; not colour-only | Screen-reader/zoom testing outstanding |
| Human oversight | AI drafts/suggestions never silently publish; explicit insertion/publish | Preserve with E2E test |
| Machine-readable marking of synthetic output | Provider output may carry markers; app does not deliberately strip all source bytes | No universal provenance layer; assess/add metadata/C2PA |
| Public-interest text/deepfake disclosure | Legal notice and AUP place duty on publisher; human editorial step | Add structured disclosure field and pre-publish warning |
| AI literacy | Curriculum below | Record attendance/competence |

The Commission's 2 December 2026 grace relates only to machine-readable marking for certain pre-existing systems, not the initial AI-interaction notice.

## AI literacy record

Train everyone who changes prompts, provider/model defaults, safety UI, publishing or support on:

1. hallucination, bias, refusal and prompt injection;
2. GDPR minimisation, special-category data and provider retention/transfers;
3. credential handling and incident escalation;
4. copyright, confidentiality, defamation and provenance;
5. Article 50 disclosures and human editorial responsibility;
6. the prohibition on using Chapbook for consequential automated decisions;
7. accessibility and child/publication safety.

Record participant, date, material version and assessment outcome.

## Rights request and incident procedure

1. Log and acknowledge requests promptly.
2. Explain when data is local-only and give export/delete steps.
3. Search support, Stripe/licence, private trial/fulfilment records and operational systems proportionately.
4. Verify identity without excessive collection.
5. Respond within the legal period and record exemptions/redactions.
6. For incidents: contain/revoke, preserve minimal evidence, assess people/data/risk, notify the ICO within 72 hours where required, and notify affected people without undue delay where high risk.
7. Record corrective action and update this DPIA.

## Authoritative sources reviewed

- EU AI Act implementation timeline: https://ai-act-service-desk.ec.europa.eu/en/ai-act/eu-ai-act-implementation-timeline
- European Commission Article 50 FAQ: https://digital-strategy.ec.europa.eu/en/faqs/transparency-obligations-under-article-50-ai-act
- ICO right to be informed: https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/individual-rights/individual-rights/right-to-be-informed/
- ICO AI/data-protection toolkit: https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/artificial-intelligence/guidance-on-ai-and-data-protection/
- ICO storage/access technologies: https://ico.org.uk/for-organisations/direct-marketing-and-privacy-and-electronic-communications/guide-to-pecr/cookies-and-similar-technologies/
- UK Data (Use and Access) Act changes: https://www.gov.uk/guidance/data-use-and-access-act-2025-data-protection-and-privacy-changes

## Review triggers

Review at least every six months and before: provider/model changes; new RQAI backend storage; analytics/ads; price/renewal change; EU representative change; iOS/Android distribution; central sync; organisation/school features; model training; biometric/health/employment/education decisions; or any material complaint/incident.
