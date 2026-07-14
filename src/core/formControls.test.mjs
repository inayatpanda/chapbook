import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolveControl, groupFields, collectInlineFields, moveItem, PALETTE_SWATCHES } from './formControls.js';

test('resolveControl honours x-control then falls back to type', () => {
  assert.equal(resolveControl({ type: 'string', 'x-control': 'color' }), 'color');
  assert.equal(resolveControl({ type: 'string', 'x-control': 'textarea' }), 'textarea');
  assert.equal(resolveControl({ type: 'boolean' }), 'checkbox');
  assert.equal(resolveControl({ type: 'number', minimum: 0, maximum: 10 }), 'slider');
  assert.equal(resolveControl({ type: 'number' }), 'number');
  assert.equal(resolveControl({ type: 'string', enum: ['a', 'b'] }), 'segmented');
  assert.equal(resolveControl({ type: 'string', enum: ['a', 'b', 'c', 'd', 'e'] }), 'select');
  assert.equal(resolveControl({ type: 'string' }), 'text');
  assert.equal(resolveControl(null), 'text');
});

test('groupFields keeps ungrouped first, then first-seen group order', () => {
  const g = groupFields({ a: {}, b: { 'x-group': 'Style' }, c: { 'x-group': 'Heading' }, d: { 'x-group': 'Style' } });
  assert.deepEqual(g, [{ group: '', keys: ['a'] }, { group: 'Style', keys: ['b', 'd'] }, { group: 'Heading', keys: ['c'] }]);
});

test('collectInlineFields uses declared x-inline, else title + first string', () => {
  const declared = collectInlineFields({ properties: { title: { type: 'string', 'x-inline': true }, q: { type: 'string', 'x-inline': true }, n: { type: 'number' } } });
  assert.deepEqual(declared, ['title', 'q']);
  const fallback = collectInlineFields({ properties: { title: { type: 'string' }, question: { type: 'string' }, accent: { type: 'string' } } });
  assert.deepEqual(fallback, ['title', 'question']);
});

test('collectInlineFields: std title-only x-inline still pulls the family key field', () => {
  // every family gets the injected std title with x-inline:true; the inline editor
  // must still surface the family's own first string field alongside it
  const out = collectInlineFields({ properties: {
    question: { type: 'string' }, options: { type: 'array' },
    title: { type: 'string', 'x-inline': true }, subtitle: { type: 'string' },
    caption: { type: 'string' }, accent: { type: 'string', enum: ['default'] }, accentCustom: { type: 'string' },
  } });
  assert.deepEqual(out, ['title', 'question']);
});

test('moveItem reorders in place and guards bounds', () => {
  assert.deepEqual(moveItem(['a', 'b', 'c'], 0, 2), ['b', 'c', 'a']);
  assert.deepEqual(moveItem(['a', 'b'], 0, 5), ['a', 'b']);
  assert.deepEqual(moveItem(['a', 'b'], 1, 1), ['a', 'b']);
});

test('PALETTE_SWATCHES are on-brand hexes', () => {
  assert.ok(PALETTE_SWATCHES.includes('#2dd4bf') && PALETTE_SWATCHES.includes('#818cf8'));
});
