// Task 7 — the /pricing page: one plan card, trial-first CTAs, the inline trial form,
// and a truthful FAQ (including the licence-lapse behaviour verified against the app's
// own activation gate in src/index.html).
//
// Source assertions read src/marketing/pricing.html and run with no build. The dist
// assertions read dist/pricing.html and skip gracefully when the site is unbuilt, so
// `node --test` on a fresh checkout still passes; the pre-commit `node build.mjs` run
// exercises them (token resolution + Stripe injection) for real.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';

const SRC = 'src/marketing/pricing.html';
const src = () => readFileSync(SRC, 'utf8');

// ---- SEO head ----------------------------------------------------------------
test('pricing: SEO head carries a unique title, description, canonical and og', () => {
  const html = src();
  assert.match(html, /<title>[^<]*Chapbook[^<]*<\/title>/, 'a Chapbook title');
  assert.ok(!/<title>[^<]*—/.test(html), 'title uses a hyphen, never an em-dash');
  assert.match(html, /<meta name="description" content="[^"]{40,}">/, 'a substantive meta description');
  assert.match(html, /<link rel="canonical" href="https:\/\/chapbook-publishing-studio\.netlify\.app\/pricing">/);
  assert.match(html, /<meta property="og:title"/);
  assert.match(html, /<meta property="og:image" content="\/og-image\.png">/);
  assert.match(html, /<meta property="og:url" content="https:\/\/chapbook-publishing-studio\.netlify\.app\/pricing">/);
});

// ---- one plan card: price token + feature list + trial-first CTAs ------------
test('pricing: one price card carries the price token, the feature list and both CTAs', () => {
  const html = src();
  assert.match(html, /class="card price-card"/, 'a single price card');
  assert.match(html, /%%PRICE%% a year/, 'the price is the %%PRICE%% token, never hardcoded');
  for (const item of ['All twenty themes and every update', 'Every device with one key',
    'Bring your own AI keys', '14-day refunds']) {
    assert.ok(html.includes(item), `price list missing "${item}"`);
  }
  // trial-first: the primary CTA is the trial anchor, the ghost CTA is the Stripe buy link
  assert.match(html, /class="btn-primary" href="#trial">Start free trial</, 'primary CTA anchors the inline trial');
  assert.match(html, /class="btn-ghost" href="%%STRIPE_BUY_URL%%">Buy Chapbook</, 'ghost CTA is the Stripe token');
});

// ---- the FAQ: five required topics, factual answers -------------------------
test('pricing: the FAQ answers the five required questions truthfully', () => {
  const html = src();
  const faq = html.slice(html.indexOf('class="section faq"'));
  assert.ok(faq.length > 0, 'a FAQ section exists');
  // trial limits
  assert.match(faq, /7 days, free, with no card\. One trial per person\./, 'trial-limits answer');
  // you own your content
  assert.match(faq, /your own GitHub repository and your media in your own R2 bucket/, 'ownership answer');
  assert.match(faq, /it is a static site you host/, 'ownership: it keeps working without us');
  // AI costs
  assert.match(faq, /use your own provider keys \(Anthropic, OpenAI, or Google\)/, 'AI-costs answer');
  assert.match(faq, /we never see your key/, 'AI-costs: keys stay with the user');
  // support + refunds (must match the shipped refunds legal page: 14 days incl. renewals)
  assert.match(faq, /Full refund within 14 days of purchase or a renewal charge\./, 'refunds answer matches the legal page');
  assert.match(faq, /mailto:support@rqai\.co\.uk/, 'support routes to the support address');
});

// ---- the lapse answer: verified against the app's OWN activation gate --------
// verifyLicence() returns reason:'expired' and licenceGate()'s non-valid branch removes
// the key and shows the activation screen (src/index.html) — NOT a read-only mode. The
// copy must state exactly that, and must NOT invent grace periods or read-only modes.
test('pricing: the licence-lapse answer matches the real activation-gate behaviour', () => {
  const html = src();
  assert.match(html, /shows the activation screen the next time it opens/, 'lapse shows the activation gate');
  assert.match(html, /does not keep running in a read-only mode/, 'no invented read-only mode');
  assert.match(html, /your drafts stay in this browser/, 'drafts survive in local storage');
  assert.match(html, /your published posts stay in your GitHub repo and R2 bucket/, 'published content is untouched');
  assert.match(html, /Enter a renewed key and you are exactly where you left off/, 'a renewed key restores access');
  // guard against the forbidden inventions
  assert.ok(!/grace period/i.test(html), 'must not invent a grace period');
  assert.ok(!/read-only mode\b(?![^.]*does not)/i.test(html.replace(/does not keep running in a read-only mode/g, '')),
    'read-only is only ever mentioned to deny it');
});

// ---- shell markers so the build can pour in nav/footer/trial ----------------
test('pricing: the nav, footer and inline trial markers are present', () => {
  const html = src();
  for (const marker of ['<!-- MKT:NAV -->', '<!-- MKT:FOOTER -->', '<!-- MKT:TRIAL -->']) {
    assert.ok(html.includes(marker), `missing marker ${marker}`);
  }
});

// ---- copy discipline ---------------------------------------------------------
test('pricing: the copy avoids em-dashes and the denylist, and links only support', () => {
  const html = src();
  assert.ok(!html.includes('—'), 'no em-dashes in the pricing copy');
  for (const banned of ['hosted Studio', 'PII', 'studio@']) {
    assert.ok(!new RegExp(banned).test(html), `denylisted term present: ${banned}`);
  }
  for (const clinical of ['fracture', 'clinical', 'osteo', 'orthop', 'periosteum', 'callus']) {
    assert.ok(!new RegExp(clinical, 'i').test(html), `clinical term present: ${clinical}`);
  }
  assert.ok(!/http:\/\//.test(html), 'no insecure http URLs');
  for (const m of html.match(/mailto:[^"'\s>]+/g) || []) {
    assert.equal(m, 'mailto:support@rqai.co.uk', `unexpected mail link ${m}`);
  }
  // the price/stripe are never hardcoded — only the tokens
  assert.ok(!/buy\.stripe\.com/.test(html), 'the Stripe URL is never hardcoded');
  assert.ok(!/£\d/.test(html), 'the price is never hardcoded');
});

// ---- dist: tokens resolved, the live Stripe link + trial endpoint wired ------
test('pricing (dist): the build resolves every token and wires the Stripe + trial links', (t) => {
  if (!existsSync('dist/pricing.html')) return t.skip('dist not built — run `node build.mjs` first');
  const html = readFileSync('dist/pricing.html', 'utf8');
  assert.ok(!html.includes('%%'), 'every %%TOKEN%% is resolved');
  assert.ok(!html.includes('<!-- MKT:'), 'every shell marker is resolved');
  assert.ok(!html.includes('—'), 'no em-dash survived into the built page');
  assert.match(html, /buy\.stripe\.com\/5kQeVd0C/, 'the live Stripe buy link is injected exactly once region');
  assert.equal((html.match(/buy\.stripe\.com\/5kQeVd0C/g) || []).length, 1, 'exactly one Stripe buy link');
  assert.match(html, /functions\/trial-request/, 'the trial form posts to the real endpoint');
  assert.equal((html.match(/id="trial"/g) || []).length, 1, 'exactly one id="trial" anchor target');
  assert.match(html, /£49 a year/, 'the price token resolved to the plan price');
  assert.equal((html.match(/class="mkt-nav"/g) || []).length, 1, 'exactly one shared nav');
});
