// Task 5 — the /features page: seven feature sections, video-loop slots, one LIVE
// embedded interactive (the real playground engine baked at build into a sandboxed
// srcdoc iframe), a pure-CSS publish diagram, and framed app screenshots.
//
// Source assertions read src/marketing/features.html and run with no build. The dist
// assertions read dist/features.html and skip gracefully when the site is unbuilt, so
// `node --test` on a fresh checkout still passes; the pre-commit `node build.mjs` run
// exercises them for real (the srcdoc is only baked by the build).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';

const SRC = 'src/marketing/features.html';
const src = () => readFileSync(SRC, 'utf8');

// ---- SEO head ----------------------------------------------------------------
test('features: SEO head carries a unique title, description, canonical and og', () => {
  const html = src();
  assert.match(html, /<title>[^<]*Chapbook[^<]*<\/title>/, 'a Chapbook title');
  assert.ok(!/<title>[^<]*—/.test(html), 'title uses a hyphen, never an em-dash');
  assert.match(html, /<meta name="description" content="[^"]{40,}">/, 'a substantive meta description');
  assert.match(html, /<link rel="canonical" href="https:\/\/chapbook\.rqai\.co\.uk\/features">/);
  assert.match(html, /<meta property="og:title"/);
  assert.match(html, /<meta property="og:image" content="\/og-image\.png">/);
  assert.match(html, /<meta property="og:url" content="https:\/\/chapbook\.rqai\.co\.uk\/features">/);
});

// ---- seven sections with the ids the home teasers deep-link to ---------------
test('features: the seven sections carry the exact ids in order', () => {
  const html = src();
  const ids = ['composer', 'blocks', 'interactives', 'ai', 'share', 'publish', 'phone'];
  let cursor = -1;
  for (const id of ids) {
    const at = html.indexOf(`<section class="section" id="${id}">`);
    assert.ok(at > -1, `missing section #${id}`);
    assert.ok(at > cursor, `section #${id} is out of order`);
    cursor = at;
  }
  // home teasers deep-link to #composer / #interactives / #publish — those ids must exist here
  for (const anchor of ['composer', 'interactives', 'publish']) {
    assert.ok(html.includes(`id="${anchor}"`), `home teaser target #${anchor} is missing`);
  }
});

// ---- the LIVE embedded interactive (baked srcdoc iframe) ---------------------
test('features: the interactive is a sandboxed lazy srcdoc iframe fed by the build token', () => {
  const html = src();
  // one dedicated token the build replaces with the baked, escaped srcdoc
  assert.ok(html.includes('%%LIVE_INTERACTIVE_SRCDOC%%'), 'the srcdoc build token is present');
  const m = html.match(/<iframe class="live-pg"[^>]*>/);
  assert.ok(m, 'the live-pg iframe is present');
  const tag = m[0];
  assert.match(tag, /loading="lazy"/, 'the iframe is lazy');
  assert.match(tag, /sandbox="allow-scripts"/, 'sandboxed to a null origin (no allow-same-origin)');
  assert.match(tag, /srcdoc="%%LIVE_INTERACTIVE_SRCDOC%%"/, 'the iframe srcdoc uses the token');
  assert.match(html, /5093 icons/, 'the glyph generator note names the icon count');
  assert.match(html, /\b2D\b/, 'the glyph note mentions 2D');
  assert.match(html, /\b3D\b/, 'the glyph note mentions 3D');
});

// ---- video-loop slots: composer / blocks / ai -------------------------------
test('features: each loop slot is a lazy, muted, reduced-motion-safe <video>', () => {
  const html = src();
  for (const name of ['write-a-post', 'flipbook', 'share-social']) {
    const re = new RegExp(`<video class="loop"[^>]*poster="/media/loops/${name}\\.jpg"[\\s\\S]*?</video>`);
    const block = html.match(re);
    assert.ok(block, `missing loop <video> for ${name}`);
    const v = block[0];
    assert.match(v, /muted/); assert.match(v, /\bloop\b/); assert.match(v, /playsinline/);
    assert.match(v, /preload="none"/);
    assert.ok(v.includes(`<source src="/media/loops/${name}.webm" type="video/webm">`), `${name} webm source`);
    assert.ok(v.includes(`<source src="/media/loops/${name}.mp4" type="video/mp4">`), `${name} mp4 source`);
  }
  // one shared lazy-play controller: IntersectionObserver + reduced-motion guard
  assert.match(html, /IntersectionObserver/, 'videos lazy-play via IntersectionObserver');
  assert.match(html, /prefers-reduced-motion:\s*reduce/, 'reduced motion leaves videos on their poster');
});

// ---- the pure-CSS publish diagram -------------------------------------------
test('features: the publish diagram animates composer to a live post with no external asset', () => {
  const html = src();
  const sec = html.slice(html.indexOf('id="publish"'));
  for (const step of ['Composer', 'Commit', 'Action', 'Live post']) {
    assert.ok(new RegExp(step).test(sec), `publish flow missing the "${step}" step`);
  }
  assert.match(html, /@keyframes/, 'the diagram is animated with keyframes');
  assert.match(html, /class="flow\b/, 'the diagram uses the .flow component');
  // no external media anywhere on the page — the diagram and hero are pure CSS
  assert.ok(!/id="publish"[\s\S]*?<img/.test(html.slice(html.indexOf('id="publish"'), html.indexOf('id="phone"'))),
    'the publish diagram carries no <img>');
});

// ---- shell markers so the build can pour in nav/footer/trial ----------------
test('features: the nav, footer and trial markers are present', () => {
  const html = src();
  for (const marker of ['<!-- MKT:NAV -->', '<!-- MKT:FOOTER -->', '<!-- MKT:TRIAL -->']) {
    assert.ok(html.includes(marker), `missing marker ${marker}`);
  }
});

// ---- copy discipline ---------------------------------------------------------
test('features: the copy avoids em-dashes and the denylist, and links only support', () => {
  const html = src();
  assert.ok(!html.includes('—'), 'no em-dashes in the features copy');
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

// ---- dist: the build bakes the real interactive and resolves every token -----
test('features (dist): the build bakes the live interactive and resolves tokens', (t) => {
  if (!existsSync('dist/features.html')) return t.skip('dist not built — run `node build.mjs` first');
  const html = readFileSync('dist/features.html', 'utf8');
  assert.ok(!html.includes('%%'), 'every %%TOKEN%% is resolved');
  assert.ok(!html.includes('<!-- MKT:'), 'every shell marker is resolved');
  assert.ok(!html.includes('—'), 'no em-dash survived into the built page');
  // the baked srcdoc carries the domId, the scoped widget and its escaped IIFE
  assert.match(html, /srcdoc="[^"]*pg-features/, 'the baked srcdoc targets the pg-features dom id');
  assert.match(html, /srcdoc="[^"]*\(function\(\)\{/, 'the baked IIFE is embedded in the srcdoc');
  assert.match(html, /srcdoc="[^"]*&lt;script&gt;/, 'the inner <script> is attribute-escaped, not a real tag');
  // the loop sources copied through to /media/loops/*
  for (const name of ['write-a-post', 'flipbook', 'share-social']) {
    assert.ok(existsSync(`dist/media/loops/${name}.webm`), `dist missing ${name}.webm`);
    assert.ok(existsSync(`dist/media/loops/${name}.mp4`), `dist missing ${name}.mp4`);
    assert.ok(existsSync(`dist/media/loops/${name}.jpg`), `dist missing ${name}.jpg poster`);
  }
  // exactly one shared nav poured in
  assert.equal((html.match(/class="mkt-nav"/g) || []).length, 1, 'exactly one shared nav');
});
