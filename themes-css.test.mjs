// Task 3 — vendored blog-theme catalogue guards.
// The 20 theme stylesheets + kids extras are copied verbatim from chapbook-template;
// these tests pin the vendored set to the registry ids and keep every url() self-hosted
// (CSP font-src/img-src 'self' — an external url() would 404 or violate policy in prod).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync } from 'node:fs';

const IDS = [
  'observatory', 'ledger', 'air', 'blueprint-workshop',
  'broadsheet', 'journal', 'kiosk', 'desert-archive',
  'neon', 'zine', 'scrapbook', 'woodland-chronicle',
  'doodle', 'rocket', 'pixel', 'comic',
  'field-atlas', 'darkroom', 'contact-sheet', 'polaroid',
];

test('all 20 theme CSS + kids extras vendored', () => {
  const files = new Set(readdirSync('src/marketing/themes-css/themes'));
  for (const id of IDS) assert.ok(files.has(`${id}.css`), `missing ${id}.css`);
  assert.ok(files.has('_kids-extras.css'), 'missing _kids-extras.css');
  assert.equal(files.size, 21, `unexpected extra files: ${[...files].join(', ')}`);
});

test('themes.css aggregator imports every registry id + kids extras', () => {
  const css = readFileSync('src/marketing/themes-css/themes.css', 'utf8');
  for (const id of IDS) assert.ok(css.includes(`./themes/${id}.css`), `themes.css does not import ${id}`);
  assert.ok(css.includes('./themes/_kids-extras.css'), 'themes.css does not import _kids-extras');
});

test('no theme CSS url() reaches an external host or a non-vendored path', () => {
  for (const f of ['global.css', 'themes.css', ...IDS.map((i) => `themes/${i}.css`), 'themes/_kids-extras.css', 'fonts.css']) {
    const css = readFileSync(`src/marketing/themes-css/${f}`, 'utf8');
    for (const m of css.matchAll(/url\(\s*['"]?([^'")]+)['"]?\s*\)/g)) {
      const u = m[1].trim();
      assert.ok(!/^https?:/i.test(u) && !/^\/\//.test(u), `external url in ${f}: ${u}`);
      assert.ok(
        /^(data:|#|\/themes-css\/fonts\/|\/fonts\/)/.test(u),
        `non-vendored url in ${f}: ${u} (must be data:, #fragment, /fonts/ or /themes-css/fonts/)`,
      );
    }
  }
});

test('fonts.css declares the four vendored families + the two variable-family aliases, all self-hosted', () => {
  const css = readFileSync('src/marketing/themes-css/fonts.css', 'utf8');
  for (const fam of ['Fraunces', 'Newsreader', 'Fredoka', 'Atkinson Hyperlegible', 'Space Grotesk Variable', 'Inter Variable']) {
    assert.ok(css.includes(`font-family:'${fam}'`), `fonts.css missing @font-face for ${fam}`);
  }
  // Every woff2 that fonts.css references must exist where it says it lives.
  for (const m of css.matchAll(/url\('\/themes-css\/fonts\/([^']+)'\)/g)) {
    assert.ok(existsSync(`src/marketing/themes-css/fonts/${m[1]}`), `referenced font missing: ${m[1]}`);
  }
  for (const m of css.matchAll(/url\('\/fonts\/([^']+)'\)/g)) {
    assert.ok(existsSync(`src/fonts/${m[1]}`), `aliased Chapbook font missing: src/fonts/${m[1]}`);
  }
});

test('sample post mirrors the template post DOM and starts on observatory', () => {
  const html = readFileSync('src/marketing/themes-css/sample-post.html', 'utf8');
  assert.ok(html.includes('data-blog-theme="observatory"'), 'html must start on observatory');
  for (const sel of [
    'class="container article-grid"', 'class="article-col"',
    'class="post-hero"', 'class="post-hero-inner"', 'class="back-link"',
    'class="post-title-row"', 'class="display scrim-text"', 'class="post-hero-meta"',
    'class="article-body"', 'class="tag-chip"',
    'data-template="observatory"', // article wrapper — themes hang drop-caps off it
  ]) assert.ok(html.includes(sel), `sample post missing ${sel}`);
  // Stylesheets in the template's load order: fonts → global → themes (themes win by source order).
  const order = ['/themes-css/fonts.css', '/themes-css/global.css', '/themes-css/themes.css']
    .map((h) => html.indexOf(h));
  assert.ok(order.every((i) => i !== -1) && order[0] < order[1] && order[1] < order[2],
    'stylesheets must load fonts.css -> global.css -> themes.css');
  // The /themes switcher (Task 6) drives the iframe via postMessage.
  assert.ok(html.includes("addEventListener('message'"), 'postMessage theme-switch listener missing');
  assert.ok(html.includes('noindex'), 'sample post must be noindex');
});

test('build copies the themes-css tree into dist', () => {
  const build = readFileSync('build.mjs', 'utf8');
  assert.ok(/themes-css/.test(build), 'build.mjs never mentions themes-css');
  // Dist check only when a build has run (keeps the test honest post-build, quiet pre-build).
  if (existsSync('dist/themes-css')) {
    assert.equal(readdirSync('dist/themes-css/themes').length, 21);
    for (const f of ['fonts.css', 'global.css', 'themes.css', 'sample-post.html', 'sample.jpg']) {
      assert.ok(existsSync(`dist/themes-css/${f}`), `dist/themes-css/${f} missing`);
    }
    assert.ok(readdirSync('dist/themes-css/fonts').filter((f) => f.endsWith('.woff2')).length >= 17,
      'vendored theme woff2 set incomplete in dist');
  }
});
