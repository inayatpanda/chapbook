import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  BAKED_CATALOGUE, DEFAULT_THEME, CATALOGUE_URL,
  parseCatalogue, fetchLiveCatalogue, groupByCategory,
  safeColor, themeCardHTML, pickerBodyHTML,
} from './themeCatalogue.js';

const b64 = (s) => Buffer.from(s, 'utf8').toString('base64');

// --- BAKED registry -------------------------------------------------------
test('BAKED_CATALOGUE has 20 themes across 5 categories', () => {
  assert.equal(BAKED_CATALOGUE.themes.length, 20);
  assert.equal(BAKED_CATALOGUE.categories.length, 5);
});
test('BAKED_CATALOGUE default theme "observatory" is present and is the default', () => {
  assert.equal(DEFAULT_THEME, 'observatory');
  assert.ok(BAKED_CATALOGUE.themes.some((t) => t.id === 'observatory'));
});
test('the four fresh full themes replace the retired repetitive themes', () => {
  const ids = BAKED_CATALOGUE.themes.map((theme) => theme.id);
  for (const id of ['graphite', 'gazette', 'arcade', 'gallery']) {
    assert.equal(ids.includes(id), false, `${id} should be retired`);
  }
  for (const id of ['blueprint-workshop', 'desert-archive', 'woodland-chronicle', 'field-atlas']) {
    assert.equal(ids.includes(id), true, `${id} should be available`);
  }
});
test('every baked theme has id/name/category/preview{bg,ink,accent}', () => {
  const catIds = new Set(BAKED_CATALOGUE.categories.map((c) => c.id));
  for (const t of BAKED_CATALOGUE.themes) {
    assert.ok(t.id && t.name && t.category, `theme fields: ${JSON.stringify(t)}`);
    assert.ok(catIds.has(t.category), `known category for ${t.id}`);
    for (const k of ['bg', 'ink', 'accent']) {
      assert.match(t.preview[k], /^#[0-9a-fA-F]{3,8}$/, `${t.id}.preview.${k} is hex`);
    }
  }
});

// --- parseCatalogue -------------------------------------------------------
test('parseCatalogue parses a raw JSON string', () => {
  const out = parseCatalogue(JSON.stringify(BAKED_CATALOGUE));
  assert.equal(out.themes.length, 20);
  assert.equal(out.categories.length, 5);
});
test('parseCatalogue decodes a GitHub contents API base64 payload', () => {
  const payload = { content: b64(JSON.stringify(BAKED_CATALOGUE)), encoding: 'base64' };
  const out = parseCatalogue(payload);
  assert.equal(out.themes.length, 20);
  assert.equal(out.themes[0].id, 'observatory');
});
test('parseCatalogue survives newline-wrapped base64 (as GitHub returns it)', () => {
  const raw = b64(JSON.stringify(BAKED_CATALOGUE));
  const wrapped = raw.replace(/(.{60})/g, '$1\n'); // GitHub wraps at 60 cols
  const out = parseCatalogue({ content: wrapped, encoding: 'base64' });
  assert.equal(out.themes.length, 20);
});
test('parseCatalogue decodes multibyte UTF-8 (em dash) intact', () => {
  const one = { categories: [{ id: 'c', name: 'C' }], themes: [
    { id: 't', name: 'T', category: 'c', description: 'greys — steel — no colour', preview: { bg: '#000', ink: '#fff', accent: '#f00' } },
  ] };
  const out = parseCatalogue({ content: b64(JSON.stringify(one)), encoding: 'base64' });
  assert.equal(out.themes[0].description, 'greys — steel — no colour');
});
test('parseCatalogue accepts an already-parsed object', () => {
  const out = parseCatalogue(BAKED_CATALOGUE);
  assert.equal(out.themes.length, 20);
});
test('parseCatalogue drops malformed themes but keeps valid ones', () => {
  const mixed = { categories: [{ id: 'c', name: 'C' }], themes: [
    { id: 'ok', name: 'Ok', category: 'c', preview: { bg: '#000', ink: '#fff', accent: '#f00' } },
    { name: 'no id' }, { id: 'no-preview', name: 'X', category: 'c' }, null,
  ] };
  const out = parseCatalogue(mixed);
  assert.equal(out.themes.length, 1);
  assert.equal(out.themes[0].id, 'ok');
});
test('parseCatalogue throws on unparseable JSON', () => {
  assert.throws(() => parseCatalogue('{not json'));
});
test('parseCatalogue throws when there are no valid themes', () => {
  assert.throws(() => parseCatalogue({ themes: [] }));
  assert.throws(() => parseCatalogue({ themes: [{ name: 'x' }] }));
});

// --- fetchLiveCatalogue ---------------------------------------------------
const mkRes = (ok, body) => ({ ok, json: async () => body });

test('fetchLiveCatalogue returns the parsed live list on a 200', async () => {
  const live = { categories: [{ id: 'c', name: 'C' }], themes: [
    { id: 'brand-new', name: 'Brand New', category: 'c', preview: { bg: '#010203', ink: '#fff', accent: '#0ff' } },
  ] };
  const fake = async (url) => {
    assert.equal(url, CATALOGUE_URL);
    return mkRes(true, { content: b64(JSON.stringify(live)), encoding: 'base64' });
  };
  const out = await fetchLiveCatalogue(fake);
  assert.equal(out.themes.length, 1);
  assert.equal(out.themes[0].id, 'brand-new');
});
test('fetchLiveCatalogue falls back to BAKED on a 404 (expected today)', async () => {
  const fake = async () => mkRes(false, { message: 'Not Found' });
  const out = await fetchLiveCatalogue(fake);
  assert.equal(out, BAKED_CATALOGUE);
});
test('fetchLiveCatalogue falls back to BAKED on a network throw', async () => {
  const fake = async () => { throw new TypeError('Failed to fetch'); };
  const out = await fetchLiveCatalogue(fake);
  assert.equal(out, BAKED_CATALOGUE);
});
test('fetchLiveCatalogue falls back to BAKED on a malformed 200 body', async () => {
  const fake = async () => mkRes(true, { content: b64('{broken'), encoding: 'base64' });
  const out = await fetchLiveCatalogue(fake);
  assert.equal(out, BAKED_CATALOGUE);
});
test('fetchLiveCatalogue falls back to BAKED when no fetch is available', async () => {
  const saved = globalThis.fetch;
  try {
    globalThis.fetch = undefined;       // no impl passed, no global → baked, no network
    const out = await fetchLiveCatalogue();
    assert.equal(out, BAKED_CATALOGUE);
  } finally {
    globalThis.fetch = saved;
  }
});

// --- groupByCategory ------------------------------------------------------
test('groupByCategory groups in category order, only non-empty groups', () => {
  const groups = groupByCategory(BAKED_CATALOGUE);
  assert.deepEqual(groups.map((g) => g.id), ['clean', 'editorial', 'creative', 'kids', 'photo']);
  assert.equal(groups.reduce((n, g) => n + g.themes.length, 0), 20);
});
test('groupByCategory collects unknown-category themes under a trailing "More"', () => {
  const cat = { categories: [{ id: 'a', name: 'A' }], themes: [
    { id: 't1', name: 'T1', category: 'a', preview: {} },
    { id: 't2', name: 'T2', category: 'ghost', preview: {} },
  ] };
  const groups = groupByCategory(cat);
  assert.equal(groups[groups.length - 1].name, 'More');
  assert.equal(groups[groups.length - 1].themes[0].id, 't2');
});

// --- safeColor + card HTML (style-attribute injection guard) ---------------
test('safeColor passes hex and rejects everything else', () => {
  assert.equal(safeColor('#0af'), '#0af');
  assert.equal(safeColor('#22d3ee'), '#22d3ee');
  assert.equal(safeColor('red'), 'transparent');
  assert.equal(safeColor('url(x)'), 'transparent');
  assert.equal(safeColor('#fff;} body{'), 'transparent');
  assert.equal(safeColor(undefined), 'transparent');
});
test('themeCardHTML renders name, description, data-theme and aria-checked', () => {
  const t = BAKED_CATALOGUE.themes.find((x) => x.id === 'observatory');
  const on = themeCardHTML(t, true);
  assert.match(on, /data-theme="observatory"/);
  assert.match(on, /aria-checked="true"/);
  assert.match(on, /tabindex="0"/);
  assert.match(on, /Observatory/);
  assert.match(on, /role="radio"/);
  const off = themeCardHTML(t, false);
  assert.match(off, /aria-checked="false"/);
  assert.match(off, /tabindex="-1"/);
});
test('themeCardHTML strips a non-hex preview colour from the style sink', () => {
  const evil = { id: 'x', name: 'X', category: 'c', description: 'd', preview: { bg: 'red;} body{display:none', ink: '#fff', accent: '#000' } };
  const html = themeCardHTML(evil, false);
  assert.doesNotMatch(html, /display:none/);
  assert.match(html, /background:transparent/);
});
test('themeCardHTML escapes HTML in theme text', () => {
  const evil = { id: 'x', name: '<img>', category: 'c', description: 'a & b', preview: { bg: '#000', ink: '#fff', accent: '#f00' } };
  const html = themeCardHTML(evil, false);
  assert.doesNotMatch(html, /<img>/);
  assert.match(html, /&lt;img&gt;/);
  assert.match(html, /a &amp; b/);
});

// --- pickerBodyHTML -------------------------------------------------------
// Which theme id carries aria-checked="true" in a rendered picker body.
const checkedId = (body) => {
  const ids = [];
  for (const m of body.matchAll(/aria-checked="(true|false)"[^>]*data-theme="([^"]+)"/g)) {
    if (m[1] === 'true') ids.push(m[2]);
  }
  return ids;
};
test('pickerBodyHTML marks exactly the requested theme selected', () => {
  const body = pickerBodyHTML(BAKED_CATALOGUE, 'darkroom');
  assert.equal((body.match(/aria-checked="true"/g) || []).length, 1);
  assert.deepEqual(checkedId(body), ['darkroom']);
  assert.equal((body.match(/data-theme=/g) || []).length, 20);
});
test('pickerBodyHTML falls back to the first theme for an unknown selection', () => {
  const body = pickerBodyHTML(BAKED_CATALOGUE, 'does-not-exist');
  assert.equal((body.match(/aria-checked="true"/g) || []).length, 1);
  assert.deepEqual(checkedId(body), ['observatory']);
});
