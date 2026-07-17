// Task 6 — the /themes page: the LIVE 20-theme switcher (a same-origin sample-post
// iframe driven by postMessage), five category rows of chips, a screenshot strip, and
// the kids-row note. Also guards the ONE sanctioned netlify.toml deviation: the scoped
// framing override that lets /themes iframe the sample post same-origin.
//
// Source assertions read src/marketing/themes.html and run with no build. The dist
// assertions read dist/themes.html and skip gracefully when the site is unbuilt, so
// `node --test` on a fresh checkout still passes; the pre-commit `node build.mjs` run
// exercises them for real.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';

const SRC = 'src/marketing/themes.html';
const src = () => readFileSync(SRC, 'utf8');

// The 20 themes in catalogue order, grouped by the five categories.
const CATS = {
  'Clean &amp; Simple': ['observatory', 'ledger', 'air', 'graphite'],
  'Editorial': ['broadsheet', 'journal', 'kiosk', 'gazette'],
  'Creative &amp; Fun': ['neon', 'zine', 'scrapbook', 'arcade'],
  'First Blogs (ages 10 to 15)': ['doodle', 'rocket', 'pixel', 'comic'],
  'Photo &amp; Portfolio': ['gallery', 'darkroom', 'contact-sheet', 'polaroid'],
};
const ALL = Object.values(CATS).flat();

// ---- SEO head ----------------------------------------------------------------
test('themes: SEO head carries a unique title, description, canonical and og', () => {
  const html = src();
  assert.match(html, /<title>[^<]*Chapbook[^<]*<\/title>/, 'a Chapbook title');
  assert.ok(!/<title>[^<]*—/.test(html), 'title uses a hyphen, never an em-dash');
  assert.match(html, /<meta name="description" content="[^"]{40,}">/, 'a substantive meta description');
  assert.match(html, /<link rel="canonical" href="https:\/\/chapbook\.rqai\.co\.uk\/themes">/);
  assert.match(html, /<meta property="og:title"/);
  assert.match(html, /<meta property="og:image" content="\/og-image\.png">/);
  assert.match(html, /<meta property="og:url" content="https:\/\/chapbook\.rqai\.co\.uk\/themes">/);
});

// ---- the live switcher: same-origin iframe + postMessage contract ------------
test('themes: the switcher is a same-origin sample-post iframe driven by postMessage', () => {
  const html = src();
  // exactly one live-preview iframe, pointed at the vendored sample post
  assert.equal((html.match(/id="theme-frame"/g) || []).length, 1, 'exactly one #theme-frame');
  assert.match(html, /<iframe id="theme-frame"[^>]*src="\/themes-css\/sample-post\.html"/,
    'the frame loads the vendored sample post');
  // the chips talk to the frame via postMessage({blogTheme:id}, location.origin), NOT contentDocument
  assert.match(html, /contentWindow\.postMessage\(\s*\{\s*blogTheme:\s*id\s*\}\s*,\s*location\.origin\s*\)/,
    'chips post {blogTheme:id} to the frame at location.origin');
  assert.ok(!/contentDocument/.test(html), 'the switcher never writes contentDocument directly');
  // clicking a chip toggles aria-pressed across the set
  assert.match(html, /setAttribute\('aria-pressed'/, 'the active chip is reflected via aria-pressed');
});

// ---- all 20 chips, exactly, grouped in the five category rows ----------------
test('themes: twenty chips carry the exact ids, names and category rows', () => {
  const html = src();
  // exactly 20 distinct data-theme chips
  const ids = [...html.matchAll(/<button class="chip" data-theme="([a-z-]+)"/g)].map((m) => m[1]);
  assert.equal(ids.length, 20, 'exactly twenty chips');
  assert.deepEqual([...new Set(ids)].sort(), [...ALL].sort(), 'the chip ids are the 20 catalogue themes');
  // each category heading is present, spelled exactly, and its four chips follow it in order
  let cursor = 0;
  for (const [label, members] of Object.entries(CATS)) {
    const at = html.indexOf(`<h3>${label}</h3>`);
    assert.ok(at > cursor, `category "${label}" heading present and in order`);
    cursor = at;
    for (const id of members) {
      assert.ok(html.indexOf(`data-theme="${id}"`) > at, `${id} chip sits under "${label}"`);
    }
  }
  // the kids range is spelled out — no en/em-dash in the label
  assert.ok(html.includes('First Blogs (ages 10 to 15)'), 'the kids range is spelled "ages 10 to 15"');
  assert.ok(!/ages 10.?15/.test(html.replace('ages 10 to 15', '')), 'no dashed 10-15 form');
});

// ---- the kids-row note: dyslexia toggle + publish celebration ----------------
test('themes: the kids row notes the dyslexia toggle and the publish celebration', () => {
  const html = src();
  const note = html.match(/<p class="cat-note">([\s\S]*?)<\/p>/);
  assert.ok(note, 'the kids category carries a cat-note');
  assert.match(note[1], /dyslexia/i, 'the note mentions the dyslexia-friendly reading toggle');
  assert.match(note[1], /publish/i, 'the note mentions the one-time publish celebration');
});

// ---- the screenshot strip: lazy, sized, per-theme, graceful on missing -------
test('themes: the screenshot strip references /media/screens/<id>.png, lazy + sized', () => {
  const html = src();
  for (const id of ALL) {
    const re = new RegExp(`<img class="shot"[^>]*src="/media/screens/${id}\\.png"[^>]*>`);
    const tag = html.match(re);
    assert.ok(tag, `strip has a tile for ${id}`);
    assert.match(tag[0], /loading="lazy"/, `${id} tile is lazy`);
    assert.match(tag[0], /width="\d+" height="\d+"/, `${id} tile is sized (no layout shift)`);
  }
  // a captured error handler hides any tile whose screenshot is not staged yet
  assert.match(html, /addEventListener\('error'[\s\S]*?shot-card[\s\S]*?display\s*=\s*'none'/,
    'missing screenshots hide their tile rather than showing a broken image');
});

// ---- the intro theme loop reuses the shared lazy-play controller -------------
test('themes: the intro loop is a lazy, muted, reduced-motion-safe <video>', () => {
  const html = src();
  const block = html.match(/<video class="loop"[^>]*poster="\/media\/loops\/themes\.jpg"[\s\S]*?<\/video>/);
  assert.ok(block, 'the themes loop video is present');
  const v = block[0];
  assert.match(v, /muted/); assert.match(v, /\bloop\b/); assert.match(v, /playsinline/);
  assert.match(v, /preload="none"/);
  assert.ok(v.includes('<source src="/media/loops/themes.webm" type="video/webm">'), 'webm source');
  assert.ok(v.includes('<source src="/media/loops/themes.mp4" type="video/mp4">'), 'mp4 source');
  assert.match(html, /IntersectionObserver/, 'the loop lazy-plays via IntersectionObserver');
  assert.match(html, /prefers-reduced-motion:\s*reduce/, 'reduced motion leaves the loop on its poster');
});

// ---- shell markers so the build can pour in nav/footer/trial ----------------
test('themes: the nav, footer and trial markers are present', () => {
  const html = src();
  for (const marker of ['<!-- MKT:NAV -->', '<!-- MKT:FOOTER -->', '<!-- MKT:TRIAL -->']) {
    assert.ok(html.includes(marker), `missing marker ${marker}`);
  }
});

// ---- copy discipline ---------------------------------------------------------
test('themes: the copy avoids em-dashes and the denylist, and links only support', () => {
  const html = src();
  assert.ok(!html.includes('—'), 'no em-dashes in the themes copy');
  assert.ok(!html.includes('–'), 'no en-dashes in the themes copy');
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
  assert.ok(!/buy\.stripe\.com/.test(html), 'the Stripe URL is never hardcoded');
  assert.ok(!/£\d/.test(html), 'the price is never hardcoded');
});

// ---- the scoped netlify.toml framing override (the one sanctioned deviation) --
test('themes: netlify.toml scopes SAMEORIGIN framing to the sample post only', () => {
  const toml = readFileSync('netlify.toml', 'utf8');
  // the global block is untouched: still DENY + frame-ancestors 'none'
  assert.match(toml, /for = "\/\*"[\s\S]*?X-Frame-Options = "DENY"/, 'global block still DENY');
  assert.match(toml, /frame-ancestors 'none'/, "global block still frame-ancestors 'none'");
  // a MORE SPECIFIC rule for the sample post relaxes framing to same-origin
  const scoped = toml.match(/for = "\/themes-css\/sample-post\.html"[\s\S]*?base-uri 'self'"/);
  assert.ok(scoped, 'a scoped header rule for the sample post exists');
  assert.match(scoped[0], /X-Frame-Options = "SAMEORIGIN"/, 'sample post is SAMEORIGIN');
  assert.match(scoped[0], /frame-ancestors 'self'/, "sample post is frame-ancestors 'self'");
  // the relaxation is scoped to that one path — the wildcard block itself never gets SAMEORIGIN
  const globalStart = toml.indexOf('for = "/*"');
  const nextBlock = toml.indexOf('[[headers]]', globalStart);
  const globalBlock = toml.slice(globalStart, nextBlock === -1 ? undefined : nextBlock);
  assert.ok(!/SAMEORIGIN/.test(globalBlock), 'the wildcard block never relaxes to SAMEORIGIN');
});

// ---- dist: the build emits themes.html, copies the sample post, resolves tokens --
test('themes (dist): the build emits the page, the sample post and resolves tokens', (t) => {
  if (!existsSync('dist/themes.html')) return t.skip('dist not built — run `node build.mjs` first');
  const html = readFileSync('dist/themes.html', 'utf8');
  assert.ok(!html.includes('%%'), 'every %%TOKEN%% is resolved');
  assert.ok(!html.includes('<!-- MKT:'), 'every shell marker is resolved');
  assert.ok(!html.includes('—'), 'no em-dash survived into the built page');
  assert.equal((html.match(/data-theme="[a-z-]+"/g) || []).filter((s, i, a) => a.indexOf(s) === i).length, 20,
    'twenty distinct data-theme chips in the built page');
  assert.equal((html.match(/id="theme-frame"/g) || []).length, 1, 'exactly one live frame');
  assert.equal((html.match(/class="mkt-nav"/g) || []).length, 1, 'exactly one shared nav');
  // the iframed sample post + its listener travel to dist
  assert.ok(existsSync('dist/themes-css/sample-post.html'), 'the sample post is copied to dist');
  const sample = readFileSync('dist/themes-css/sample-post.html', 'utf8');
  assert.match(sample, /addEventListener\('message'/, 'the sample post carries the postMessage listener');
  assert.match(sample, /data-blog-theme/, 'the listener sets data-blog-theme');
});
