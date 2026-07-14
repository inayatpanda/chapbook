// Sticker forge tests — run standalone (NOT via the hang-prone full `node --test`):
//   node server/figures/stickers.test.mjs
// Covers: the curated catalogue (count, all 16 genres, every svg sanitiser-clean +
// well-formed) and the AI /figures/sticker route (mocked ai → a sanitised figure block).
import assert from 'node:assert/strict';

let pass = 0, fail = 0;
const t = (name, fn) => { try { fn(); pass++; console.log('  ok  ' + name); } catch (e) { fail++; console.error('FAIL  ' + name + '\n      ' + (e.stack || e.message)); } };
const tA = async (name, fn) => { try { await fn(); pass++; console.log('  ok  ' + name); } catch (e) { fail++; console.error('FAIL  ' + name + '\n      ' + (e.stack || e.message)); } };

const { listStickers, STICKER_GENRES } = await import('./stickers.js');
const { sanitise } = await import('./svg.js');
const studio = await import('../studio.js');
const { makeRouter } = await import('../../studio-app/router.js');
const stickers = await import('./stickers.js');

// The ORIGINAL six genres (back-compat) + the full advertised set (all 16, from the modules).
const GENRES = ['travel', 'monuments', 'science', 'paintings', 'flora-fauna', 'general'];
const ALL_GENRES = [...stickers.STICKER_GENRE_IDS];

t('catalogue: listStickers() returns the full expanded library (>= 200)', () => {
  const list = listStickers();
  assert.ok(Array.isArray(list), 'expected an array');
  assert.ok(list.length >= 200, `expected >= 200 stickers, got ${list.length}`);
});

t('catalogue: founding genres present + every advertised genre has stickers', () => {
  const present = new Set(listStickers().map((s) => s.genre));
  for (const g of GENRES) assert.ok(present.has(g), `missing founding genre: ${g}`);
  for (const g of ALL_GENRES) assert.ok(present.has(g), `advertised genre has no stickers: ${g}`);
  // present genres are EXACTLY the advertised set (no orphans, no undeclared genres)
  assert.deepEqual([...present].sort(), [...ALL_GENRES].sort(), 'present genres == STICKER_GENRE_IDS');
  // STICKER_GENRES stays the original 6 (back-compat) and is a subset of the full set
  assert.deepEqual([...STICKER_GENRES].sort(), [...GENRES].sort(), 'STICKER_GENRES lists the founding 6');
  for (const g of STICKER_GENRES) assert.ok(ALL_GENRES.includes(g), `founding genre ${g} still advertised`);
});

t('catalogue: every sticker has id/name/genre/viewBox + a single well-formed svg', () => {
  const ids = new Set();
  for (const s of listStickers()) {
    assert.ok(s.id && typeof s.id === 'string', 'sticker has an id');
    assert.ok(!ids.has(s.id), `duplicate sticker id: ${s.id}`); ids.add(s.id);
    assert.ok(s.name && typeof s.name === 'string', `${s.id} has a name`);
    assert.ok(ALL_GENRES.includes(s.genre), `${s.id} has a known genre`);
    assert.ok(Array.isArray(s.viewBox) && s.viewBox.length === 2, `${s.id} has a [w,h] viewBox`);
    assert.ok(typeof s.svg === 'string' && s.svg.startsWith('<svg ') && s.svg.endsWith('</svg>'), `${s.id} svg is one <svg> element`);
    assert.ok(s.svg.includes('viewBox='), `${s.id} svg has a viewBox`);
    assert.ok(!/\swidth=|\sheight=/.test(s.svg.slice(0, s.svg.indexOf('>'))), `${s.id} <svg> sets no pixel width/height`);
  }
});

t('catalogue: every sticker svg passes sanitise() UNCHANGED (no script/href/url/external refs)', () => {
  for (const s of listStickers()) {
    // self-contained: no unsafe constructs present at all
    assert.ok(!/<script|<foreignObject|\son\w+\s*=|href|url\s*\(|xlink/i.test(s.svg), `${s.id} svg contains an unsafe construct`);
    // and sanitise() is a no-op (already clean)
    assert.equal(sanitise(s.svg), s.svg, `${s.id} svg should be unchanged by sanitise()`);
  }
});

await tA('engine: generateSticker returns a sanitised figure block (strips injected <script>)', async () => {
  // Mock ai: returns a sticker svg smuggling a <script>; sanitise() must strip it.
  const ai = { generateText: async () => ({ json: {
    svg: '<svg viewBox="0 0 120 120"><script>alert(1)</script><circle cx="60" cy="60" r="50" fill="#e4572e" stroke="#1c1a17" stroke-width="5"/></svg>',
    title: 'Tomato', notes: 'a retro tomato sticker',
  } }) };
  const out = await studio.generateSticker({ description: 'a tomato sticker', genre: 'general' }, ai);
  assert.equal(out.block.type, 'figure', 'a sticker rides the figure block');
  assert.equal(out.block.kind, 'sticker');
  assert.equal(out.block.animation, 'none', 'stickers are static');
  assert.ok(out.block.svg && out.block.svg.length, 'expected a non-empty svg');
  assert.ok(!out.block.svg.includes('<script'), 'sanitise must strip the injected <script>');
  assert.ok(out.block.svg.includes('<circle'), 'the safe <circle should survive sanitise');
  assert.equal(out.block.title, 'Tomato');
});

await tA('engine: generateSticker rejects too-short input (status 400)', async () => {
  const ai = { generateText: async () => ({ json: { svg: '<svg/>', title: 'x' } }) };
  await assert.rejects(() => studio.generateSticker({ description: 'a' }, ai), (e) => e.status === 400);
});

await tA('router: GET /figures/stickers returns the catalogue grouped-ready array', async () => {
  const r = makeRouter({ stickers, posts: { listPosts: async () => [] } });
  const out = await r.api('/figures/stickers');
  const list = Array.isArray(out) ? out : out.stickers;
  assert.ok(Array.isArray(list) && list.length >= 15, 'expected the stickers array (>=15)');
  assert.ok(list.some((s) => s.genre === 'travel'), 'includes a travel sticker');
  assert.ok(list.every((s) => s.svg && s.viewBox), 'each entry carries svg + viewBox');
});

await tA('router: POST /figures/sticker returns a sanitised sticker figure block (mocked ai)', async () => {
  const ai = { generateText: async () => ({ json: {
    svg: '<svg viewBox="0 0 120 120"><script>x</script><path d="M60 96 C8 60 14 20 40 20Z" fill="#e4572e" stroke="#1c1a17" stroke-width="5"/></svg>',
    title: 'Heart', notes: '',
  } }) };
  const r = makeRouter({ ai, studio, stickers, posts: { listPosts: async () => [] } });
  const out = await r.api('/figures/sticker', { method: 'POST', body: { description: 'a retro heart', genre: 'general' } });
  assert.equal(out.block.type, 'figure');
  assert.equal(out.block.kind, 'sticker');
  assert.ok(!out.block.svg.includes('<script'), 'route output is sanitised');
  assert.ok(out.block.svg.includes('<path'), 'the safe <path survives');
  assert.equal(out.block.title, 'Heart');
});

// --- render: a sticker figure block serialises with the fig--sticker class (retro look) ---
const blocks = await import('../blocks.js');
t('render: a kind:"sticker" figure serialises with the fig--sticker class; a plain figure does not', () => {
  const stk = listStickers()[0];
  const md = blocks.serialiseBlock({ type: 'figure', kind: 'sticker', svg: stk.svg, placement: 'default' }, { slug: 's' });
  assert.match(md, /class="fig fig--default fig--sticker"/, 'sticker figure carries fig--sticker');
  assert.ok(md.includes('<svg'), 'the sticker svg is inlined');
  const plain = blocks.serialiseBlock({ type: 'figure', svg: stk.svg, placement: 'default' }, { slug: 's' });
  assert.ok(!/fig--sticker/.test(plain), 'a non-sticker figure is unaffected');
});
t('render: a sticker slapped onto an image emits both <img> base + the sticker svg overlay', () => {
  const stk = listStickers()[0];
  const md = blocks.serialiseBlock({
    type: 'figure', kind: 'sticker', svg: stk.svg, placement: 'default',
    base: { base64: 'data:image/png;base64,iVBORw0KGgo=', alt: 'photo' },
  }, { slug: 's' });
  assert.match(md, /<img src="data:image\/png;base64,/, 'the base image is the bottom layer');
  assert.ok(md.indexOf('<img') < md.indexOf('<svg'), 'image comes before the overlay svg');
});

console.log(`\n${pass} passed, ${fail} failed`);
if (fail) process.exit(1);
