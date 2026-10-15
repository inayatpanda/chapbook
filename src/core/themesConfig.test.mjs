// Run:  node --test src/core/themesConfig.test.mjs
//
// The blog-theme registry reader behind the site-settings picker. The picker was previously
// a hardcoded list that had drifted from the site: 12 of its 15 ids did not exist there
// (choosing one wrote a defaultTheme the site cannot render — Base.astro fell back to
// observatory and the theme silently did not change), and 17 real themes were unreachable.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normaliseThemes, categoryNames, getThemesConfig } from './themesConfig.js';

test('normalises the { themes: [...] } shape', () => {
  const t = normaliseThemes({ themes: [{ id: 'observatory', name: 'Observatory', category: 'clean' }] });
  assert.deepEqual(t, [{ id: 'observatory', name: 'Observatory', category: 'clean' }]);
});

test('normalises a bare array, and a plain string id', () => {
  assert.deepEqual(normaliseThemes(['ledger']), [{ id: 'ledger', name: 'Ledger', category: '' }]);
});

test('derives a display name from the id when absent', () => {
  assert.equal(normaliseThemes([{ id: 'contact-sheet' }])[0].name, 'Contact Sheet');
});

test('drops entries with no id rather than offering a broken option', () => {
  assert.deepEqual(normaliseThemes({ themes: [{ name: 'Nameless' }, null, { id: '' }] }), []);
});

test('categoryNames maps id → display name', () => {
  assert.deepEqual(categoryNames({ categories: [{ id: 'clean', name: 'Clean & Simple' }] }), { clean: 'Clean & Simple' });
  assert.deepEqual(categoryNames({}), {});
});

test('a missing registry returns empty — the picker keeps its baked options', async () => {
  assert.deepEqual(await getThemesConfig({ getFile: async () => null }), { themes: [], categories: {} });
});

test('a throwing/unparseable registry never breaks the settings page', async () => {
  assert.deepEqual(await getThemesConfig({ getFile: async () => { throw new Error('offline'); } }), { themes: [], categories: {} });
  assert.deepEqual(await getThemesConfig({ getFile: async () => ({ content: 'not json', sha: 'x' }) }), { themes: [], categories: {} });
});

test('reads the real inayatpanda-site registry shape', async () => {
  const { readFileSync, existsSync } = await import('node:fs');
  const p = '/Users/inayat/Projects/inayatpanda-site/src/data/themes.json';
  if (!existsSync(p)) return;                      // repo not checked out — skip, don't fail
  const gh = { getFile: async () => ({ content: readFileSync(p, 'utf8'), sha: 'x' }) };
  const { themes } = await getThemesConfig(gh);
  assert.ok(themes.length >= 20, `expected the site's full registry, got ${themes.length}`);
  assert.ok(themes.some((t) => t.id === 'observatory'), 'observatory must be offered');
  assert.ok(themes.some((t) => t.id === 'polaroid'), 'a theme the OLD hardcoded list omitted');
  assert.ok(!themes.some((t) => t.id === 'vista'), 'vista does not exist on the site and must NOT be offered');
});
