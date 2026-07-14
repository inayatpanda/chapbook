// Run:  node --test studio-app/core/quotes.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  QUOTES, TONES, filterQuotes, themeFacets, toneFacets, authorFacets,
  formatAttribution, quoteForInsert,
} from './quotes.js';

test('dataset is non-trivial and every row is well-shaped', () => {
  assert.ok(QUOTES.length >= 150, 'expected a substantial library (>=150)');
  for (const q of QUOTES) {
    assert.equal(typeof q.text, 'string');
    assert.ok(q.text.length > 0, 'no empty quote text');
    assert.equal(typeof q.author, 'string');
    assert.ok(q.author.length > 0, 'every quote is attributed');
    assert.ok(Array.isArray(q.themes) && q.themes.length > 0, 'every quote has >=1 theme');
    assert.ok(TONES.includes(q.tone), `tone "${q.tone}" must be one of the documented set`);
    assert.equal(typeof q.id, 'string');
  }
});

test('ids are unique', () => {
  const ids = new Set(QUOTES.map(q => q.id));
  assert.equal(ids.size, QUOTES.length);
});

test('themeFacets / toneFacets / authorFacets tally correctly', () => {
  const themes = themeFacets();
  assert.ok(themes.length >= 8, 'expected the full theme spread');
  // counts must sum to total theme-assignments
  const totalThemeAssigns = QUOTES.reduce((n, q) => n + q.themes.length, 0);
  assert.equal(themes.reduce((n, t) => n + t.count, 0), totalThemeAssigns);
  // theme facets sorted by count desc
  for (let i = 1; i < themes.length; i++) assert.ok(themes[i - 1].count >= themes[i].count);

  const tones = toneFacets();
  assert.equal(tones.reduce((n, t) => n + t.count, 0), QUOTES.length);
  // tones keep the documented order
  assert.deepEqual(tones.map(t => t.value), TONES.filter(t => tones.some(x => x.value === t)));

  const authors = authorFacets();
  assert.equal(authors.reduce((n, a) => n + a.count, 0), QUOTES.length);
  // authors alphabetical
  const names = authors.map(a => a.value);
  assert.deepEqual(names, [...names].sort((a, b) => a.localeCompare(b)));
});

test('filter: empty facets returns everything', () => {
  assert.equal(filterQuotes({}).length, QUOTES.length);
  assert.equal(filterQuotes().length, QUOTES.length);
});

test('filter: a theme constrains, multiple themes OR within the facet', () => {
  const love = filterQuotes({ themes: ['Love'] });
  assert.ok(love.length > 0);
  assert.ok(love.every(q => q.themes.includes('Love')));

  const loveOrHumour = filterQuotes({ themes: ['Love', 'Humour'] });
  assert.ok(loveOrHumour.length >= love.length);
  assert.ok(loveOrHumour.every(q => q.themes.includes('Love') || q.themes.includes('Humour')));
});

test('filter: facets AND across theme + tone + author', () => {
  const r = filterQuotes({ themes: ['Love'], tones: ['tender'] });
  assert.ok(r.length > 0);
  assert.ok(r.every(q => q.themes.includes('Love') && q.tone === 'tender'));

  const wilde = filterQuotes({ authors: ['Oscar Wilde'] });
  assert.ok(wilde.length > 0);
  assert.ok(wilde.every(q => q.author === 'Oscar Wilde'));
});

test('search: tokenised AND, case-insensitive, over text + author', () => {
  const courage = filterQuotes({ query: 'courage' });
  assert.ok(courage.length > 0);
  assert.ok(courage.every(q => /courage/i.test(q.text + ' ' + q.author + ' ' + q.source)));

  // multi-term must match ALL tokens
  const both = filterQuotes({ query: 'never fall' });
  assert.ok(both.every(q => {
    const h = (q.text + ' ' + q.author).toLowerCase();
    return h.includes('never') && h.includes('fall');
  }));
});

test('search: diacritic- and smart-quote-insensitive', () => {
  // "saint exupery" must find Saint-Exupéry quotes
  const r = filterQuotes({ query: 'saint exupery' });
  assert.ok(r.length > 0);
  assert.ok(r.every(q => /Saint-Exup/i.test(q.author)));
  // a smart-apostrophe query still hits straight-apostrophe text and vice-versa
  const a = filterQuotes({ query: "don’t" }).length; // curly
  const b = filterQuotes({ query: "don't" }).length;       // straight
  assert.equal(a, b);
});

test('search combines with facets (AND)', () => {
  const r = filterQuotes({ authors: ['Mark Twain'], query: 'disappointed' });
  assert.ok(r.length >= 1);
  assert.ok(r.every(q => q.author === 'Mark Twain' && /disappointed/i.test(q.text)));
});

test('formatAttribution: author, author+source, neither', () => {
  assert.equal(formatAttribution({ author: 'Socrates' }), 'Socrates');
  assert.equal(formatAttribution({ author: 'Leo Tolstoy', source: 'War and Peace' }), 'Leo Tolstoy, War and Peace');
  assert.equal(formatAttribution({ author: '', source: 'Anon collection' }), 'Anon collection');
  assert.equal(formatAttribution({}), '');
  assert.equal(formatAttribution(null), '');
  // no leading em-dash (the site/template adds the dash)
  assert.ok(!formatAttribution({ author: 'X' }).startsWith('—'));
});

test('quoteForInsert returns block-ready { text, cite }', () => {
  const q = QUOTES.find(x => x.source);
  const out = quoteForInsert(q);
  assert.equal(out.text, q.text);
  assert.equal(out.cite, formatAttribution(q));
  assert.deepEqual(Object.keys(out).sort(), ['cite', 'text']);
  assert.deepEqual(quoteForInsert(null), { text: '', cite: '' });
});
