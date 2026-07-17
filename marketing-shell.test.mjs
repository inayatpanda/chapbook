// Task 2 — the shared marketing shell: tokens (marketing.css), nav/footer partials,
// SEO plumbing (sitemap.xml + robots.txt), the OG card, and download.html's shared nav.
//
// Source-file assertions run with no build. The dist assertions read dist/ and skip
// gracefully when the site has not been built, so `node --test` on a fresh checkout
// still passes; the pre-commit `node build.mjs` run exercises them for real.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';

// ---- source: marketing.css tokens + shared components -----------------------
test('marketing.css re-declares the exact :root token contract from download.html', () => {
  const css = readFileSync('src/marketing/marketing.css', 'utf8');
  assert.match(
    css,
    /:root\{--well:#05070e;--midnight:#0b1120;--paper:#e6edf7;--mist:rgba\(230,237,247,\.62\);--faint:rgba\(230,237,247,\.38\);--hairline:rgba\(230,237,247,\.09\);--teal:#2dd4bf;--cyan:#22d0ee;--violet:#8b5cf6;--ink:#06121a\}/,
    'the :root token block must be copied verbatim so the palette cannot drift',
  );
  // shared components the marketing pages rely on
  for (const sel of [/body\.mkt\{/, /\.mkt-wrap\{/, /\.mkt-nav\{/, /\.mkt-foot\{/, /\.btn-primary\{/, /\.btn-ghost\{/, /\.eyebrow\{/, /\.card\{/]) {
    assert.match(css, sel, `marketing.css missing ${sel}`);
  }
  // self-hosted faces, reduced-motion discipline, no external hosts
  assert.match(css, /@font-face\{font-family:'Inter';font-weight:400/);
  assert.match(css, /@font-face\{font-family:'Space Grotesk';font-weight:700/);
  assert.match(css, /prefers-reduced-motion/);
  assert.ok(!/https?:\/\//.test(css), 'marketing.css must reference no external hosts');
});

// ---- source: filled-button label colour can never be repainted by a link rule ----
// Regression: `.mkt a{color:var(--teal)}` (0,1,1) once out-specified the unscoped
// `.btn-primary` (0,1,0), painting the filled button's dark-ink label teal-on-teal —
// an invisible CTA. The contract: an anchor-scoped colour rule (0,2,1) pins each
// button's label colour above every anchor rule in the sheet.
test('marketing.css pins the button label colours above every anchor colour rule', () => {
  const css = readFileSync('src/marketing/marketing.css', 'utf8');
  assert.match(css, /\.mkt a\.btn-primary\{color:var\(--ink\)\}/,
    'filled button label must be explicitly ink at anchor-level specificity');
  assert.match(css, /\.mkt a\.btn-ghost\{color:var\(--teal\)\}/,
    'ghost button label must be explicitly teal at anchor-level specificity');
  // and the base rules themselves are .mkt-scoped so they beat `.mkt a` for non-anchors too
  assert.match(css, /\.mkt \.btn-primary\{[^}]*color:var\(--ink\)/);
  assert.match(css, /\.mkt \.btn-ghost\{[^}]*color:var\(--teal\)/);
});

// ---- source: nav partial -----------------------------------------------------
test('_nav.html carries the full nav link set, the trial CTA, and the aria-current script', () => {
  const nav = readFileSync('src/marketing/_nav.html', 'utf8');
  assert.match(nav, /aria-label="Primary"/);
  for (const href of ['/', '/features', '/themes', '/pricing', '/download']) {
    assert.ok(nav.includes(`href="${href}"`), `_nav.html missing link ${href}`);
  }
  assert.match(nav, /class="cta" href="\/pricing#trial">Try Chapbook free/);
  assert.match(nav, /aria-current/, 'inline script must set aria-current for the active tab');
  assert.ok(!nav.includes('—'), 'no em-dashes in visible copy');
});

// ---- source: footer partial --------------------------------------------------
test('_footer.html carries the year token, legal links, and the support address', () => {
  const foot = readFileSync('src/marketing/_footer.html', 'utf8');
  assert.match(foot, /%%YEAR%% RQAI Ltd/);
  for (const href of ['/features', '/themes', '/pricing', '/download', '/privacy', '/terms', '/refunds']) {
    assert.ok(foot.includes(`href="${href}"`), `_footer.html missing link ${href}`);
  }
  assert.match(foot, /mailto:support@rqai\.co\.uk/);
  assert.ok(!foot.includes('—'), 'no em-dashes in visible copy');
});

// ---- source: download.html gains the shared nav marker ----------------------
test('download.html swaps its bespoke <header> for the shared nav marker', () => {
  const dl = readFileSync('src/download.html', 'utf8');
  assert.match(dl, /<!-- MKT:NAV -->/, 'download.html must carry the shared nav marker');
  assert.ok(!/<header>/.test(dl), 'the bespoke <header> should be gone');
});

// ---- dist: shell assets emit -------------------------------------------------
test('build emits marketing.css, og-image.png, sitemap.xml and robots.txt', (t) => {
  if (!existsSync('dist/marketing.css')) return t.skip('dist not built — run `node build.mjs` first');
  for (const f of ['dist/marketing.css', 'dist/og-image.png', 'dist/sitemap.xml', 'dist/robots.txt']) {
    assert.ok(existsSync(f), `${f} not emitted`);
  }
});

test('og-image.png is a real PNG sized 1200x630', (t) => {
  if (!existsSync('dist/og-image.png')) return t.skip('dist not built — run `node build.mjs` first');
  const buf = readFileSync('dist/og-image.png');
  assert.deepEqual([...buf.subarray(0, 8)], [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], 'PNG magic bytes');
  assert.equal(buf.readUInt32BE(16), 1200, 'width');
  assert.equal(buf.readUInt32BE(20), 630, 'height');
});

test('built download.html carries exactly one resolved shared nav', (t) => {
  if (!existsSync('dist/download.html')) return t.skip('dist not built — run `node build.mjs` first');
  const dl = readFileSync('dist/download.html', 'utf8');
  assert.equal((dl.match(/class="mkt-nav"/g) || []).length, 1, 'exactly one shared nav');
  assert.ok(!dl.includes('<!-- MKT:NAV -->'), 'the nav marker must be resolved by the build');
});

test('sitemap.xml is valid and lists every marketing + legal route', (t) => {
  if (!existsSync('dist/sitemap.xml')) return t.skip('dist not built — run `node build.mjs` first');
  const x = readFileSync('dist/sitemap.xml', 'utf8');
  assert.ok(x.startsWith('<?xml'), 'declares an XML prolog');
  assert.match(x, /<urlset xmlns="http:\/\/www\.sitemaps\.org\/schemas\/sitemap\/0\.9">/);
  for (const p of ['/', '/features', '/themes', '/pricing', '/download', '/privacy', '/terms', '/refunds']) {
    assert.ok(x.includes(`<loc>https://chapbook.rqai.co.uk${p}</loc>`), `sitemap missing ${p}`);
  }
});

test('robots.txt allows crawl, keeps /app out of the index, and points at the sitemap', (t) => {
  if (!existsSync('dist/robots.txt')) return t.skip('dist not built — run `node build.mjs` first');
  const r = readFileSync('dist/robots.txt', 'utf8');
  assert.match(r, /User-agent: \*/);
  assert.match(r, /Allow: \//);
  assert.match(r, /Disallow: \/app/);
  assert.match(r, /Sitemap: https:\/\/chapbook\.rqai\.co\.uk\/sitemap\.xml/);
});
