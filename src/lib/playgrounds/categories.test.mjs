// The interactive picker groups families by their `category` string. Those strings are
// hand-typed in each family module, and they drifted in case: 'Game' and 'game' both
// existed, as did Data/data, Diagram/diagram, Interactive/interactive, Narrative/narrative.
//
// The picker sorts category headings as plain strings, and ASCII uppercase sorts before
// lowercase, so 'Game' appeared near the top of the sheet and 'game' much further down —
// one category presented as two, in two different places, with no hint they were the same.
// A browser pass showed 22 headings for what is really 17 categories.
import { test } from 'node:test';
import assert from 'node:assert';
import { listFamilies } from './index.js';

const categories = () => listFamilies().map((f) => f.category).filter((c) => c != null);

test('every family declares a category', () => {
  const missing = listFamilies().filter((f) => !f.category || !String(f.category).trim());
  assert.deepEqual(missing.map((f) => f.id), [], 'families with no category fall into an "other" bucket');
});

test('no two categories differ only by case', () => {
  const byLower = new Map();
  for (const c of categories()) {
    const k = c.toLowerCase();
    if (!byLower.has(k)) byLower.set(k, new Set());
    byLower.get(k).add(c);
  }
  const split = [...byLower.entries()].filter(([, forms]) => forms.size > 1)
    .map(([k, forms]) => `${k}: ${[...forms].join(' / ')}`);
  assert.deepEqual(split, [], 'these categories are one group split into several headings');
});

// Lowercase is the majority convention already (tool, game, quantitative, explorer...),
// so pin it rather than leaving the choice open to the next author.
test('categories are lowercase, so the picker can present them consistently', () => {
  const wrong = [...new Set(categories().filter((c) => c !== c.toLowerCase()))];
  assert.deepEqual(wrong, [], 'category strings should be lowercase in the family modules');
});

test('categories carry no stray whitespace', () => {
  const wrong = [...new Set(categories().filter((c) => c !== c.trim()))];
  assert.deepEqual(wrong, []);
});
