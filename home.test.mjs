// Task 4 — the home page (`/`): the animated hero scene, feature teasers, theme strip,
// pricing teaser, download strip, and the SEO head.
//
// Source-file assertions run with no build (they read src/marketing/index.html). The
// dist assertions read dist/index.html and skip gracefully when the site has not been
// built, so `node --test` on a fresh checkout still passes; the pre-commit
// `node build.mjs` run exercises them for real.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';

const SRC = 'src/marketing/index.html';
const src = () => readFileSync(SRC, 'utf8');

// ---- boot-shim: first head element, unlicensed-only, licence key -------------
test('home: the licence boot-shim is the FIRST element in <head>', () => {
  const html = src();
  const head = html.slice(html.indexOf('<head>') + 6);
  const firstTag = head.match(/<([a-zA-Z][\w-]*)/);
  assert.equal(firstTag && firstTag[1], 'script', 'first head node must be the boot-shim <script>');
  assert.match(html, /localStorage\.getItem\('helm\.studio\.licence'\)/, 'boot-shim reads the licence key');
  assert.match(html, /location\.replace\('\/app'\)/, 'a licensed visitor is bounced to /app');
  // exactly one reference to the licence key in the source (only the boot-shim)
  assert.equal((html.match(/helm\.studio\.licence/g) || []).length, 1, 'the licence key appears once');
});

// ---- SEO head ----------------------------------------------------------------
test('home: SEO head carries the title, description, canonical and og image', () => {
  const html = src();
  assert.match(html, /<title>Chapbook - write a post, publish to a blog you own<\/title>/,
    'title uses a hyphen (never an em-dash)');
  assert.match(html, /<meta name="description" content="[^"]{40,}">/, 'a substantive meta description');
  assert.match(html, /<link rel="canonical" href="https:\/\/chapbook\.rqai\.co\.uk\/">/);
  assert.match(html, /<meta property="og:image" content="\/og-image\.png">/);
  assert.match(html, /<meta property="og:title"/);
  assert.match(html, /<meta property="og:type" content="website">/);
});

// ---- hero DOM contract (class names the keyframes target) --------------------
test('home: the hero scene carries every class the keyframes target', () => {
  const html = src();
  for (const cls of ['hero-scene', 'hs-phone', 'hs-bubble', 'hs-block', 'hs-publish',
    'hs-check', 'hs-browser', 'hs-browser-bar', 'hs-blog', 'hs-themechip']) {
    assert.ok(new RegExp(`class="[^"]*\\b${cls}\\b`).test(html), `hero missing .${cls}`);
  }
  assert.match(html, /<div class="hero-scene" aria-hidden="true">/, 'the decorative scene is aria-hidden');
  assert.match(html, /Made sourdough today\. The crumb finally opened up\./, 'the typed bubble line');
  assert.match(html, /yourname\.blog/, 'the browser address bar shows the demo host');
});

// ---- hero animation contract: 12s loop, reduced-motion, pause-on-hidden ------
test('home: the hero is CSS-driven, respects reduced motion, and pauses when hidden', () => {
  const html = src();
  assert.match(html, /@media \(prefers-reduced-motion:\s*no-preference\)/, 'animations are opt-in');
  assert.match(html, /@media \(prefers-reduced-motion:\s*reduce\)/, 'reduced motion freezes the scene');
  assert.match(html, /@keyframes hsType/, 'the typewriter keyframe');
  assert.match(html, /steps\(/, 'the typewriter uses a stepped reveal');
  assert.match(html, /12s/, 'the master loop is 12s');
  assert.match(html, /visibilitychange/, 'a tiny JS handler pauses the scene when the tab is hidden');
  // the hero must not load any external media — pure CSS/JS
  assert.ok(!/hero-scene[\s\S]{0,600}<(img|video|iframe)/.test(html), 'the hero uses no media element');
});

// ---- CTAs and price/stripe tokens (never hardcoded) --------------------------
test('home: the hero CTAs use the trial anchor and the price/stripe tokens', () => {
  const html = src();
  assert.match(html, /class="btn-primary" href="#trial">Try Chapbook free</, 'primary CTA anchors the inline trial');
  assert.match(html, /class="btn-ghost" href="%%STRIPE_BUY_URL%%">%%PRICE%%\/yr</, 'ghost CTA carries the tokens');
  assert.ok(!/buy\.stripe\.com/.test(html), 'the Stripe URL is never hardcoded in source');
  assert.ok(!/£\d/.test(html), 'the price is never hardcoded in source');
});

// ---- the four content sections below the hero -------------------------------
test('home: the teasers, theme strip, pricing teaser and download strip are present', () => {
  const html = src();
  for (const href of ['/features#composer', '/features#interactives', '/themes', '/features#publish']) {
    assert.ok(html.includes(`href="${href}"`), `teaser missing ${href}`);
  }
  assert.match(html, /class="section theme-strip"/, 'the theme strip section');
  assert.ok((html.match(/href="\/themes"/g) || []).length >= 1, 'theme strip links /themes');
  assert.match(html, /class="section pricing-teaser"/, 'the pricing teaser section');
  assert.match(html, /class="section download-strip"/, 'the download strip section');
  assert.ok(html.includes('href="/download"'), 'download strip links /download');
});

// ---- shell markers so the build can pour in nav/footer/trial ----------------
test('home: the nav, footer and inline trial markers are present', () => {
  const html = src();
  for (const marker of ['<!-- MKT:NAV -->', '<!-- MKT:FOOTER -->', '<!-- MKT:TRIAL -->']) {
    assert.ok(html.includes(marker), `missing marker ${marker}`);
  }
});

// ---- copy discipline ---------------------------------------------------------
test('home: the copy avoids em-dashes and the denylist, and links only the support address', () => {
  const html = src();
  assert.ok(!html.includes('—'), 'no em-dashes in the home copy');
  for (const banned of ['hosted Studio', 'clinical', 'PII']) {
    assert.ok(!new RegExp(banned, 'i').test(html), `denylisted term present: ${banned}`);
  }
  // no external hosts other than the canonical https site / og; no http:// anywhere
  assert.ok(!/http:\/\//.test(html), 'no insecure http URLs');
  // any mailto must be the support address
  for (const m of html.match(/mailto:[^"'\s>]+/g) || []) {
    assert.equal(m, 'mailto:support@rqai.co.uk', `unexpected mail link ${m}`);
  }
});

// ---- dist: the built page resolves every token and keeps the shim first ------
test('home (dist): the built page resolves tokens and keeps the boot-shim first', (t) => {
  if (!existsSync('dist/index.html')) return t.skip('dist not built — run `node build.mjs` first');
  const html = readFileSync('dist/index.html', 'utf8');
  const head = html.slice(html.indexOf('<head>') + 6);
  assert.match(head.trimStart(), /^<script>/, 'boot-shim is still the first head node after the build');
  assert.equal((html.match(/helm\.studio\.licence/g) || []).length, 1, 'exactly one licence-key reference');
  assert.match(html, /buy\.stripe\.com\/5kQeVd0C/, 'the live Stripe link is injected');
  assert.match(html, /class="[^"]*\bhero-scene\b/, 'the hero renders');
  assert.ok(!html.includes('%%'), 'every %%TOKEN%% is resolved');
  assert.ok(!html.includes('<!-- MKT:'), 'every shell marker is resolved');
  assert.ok(!html.includes('—'), 'no em-dash survived into the built page');
  assert.equal((html.match(/class="mkt-nav"/g) || []).length, 1, 'exactly one shared nav');
});
