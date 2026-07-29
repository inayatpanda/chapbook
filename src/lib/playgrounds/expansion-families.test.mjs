/* Release coverage for the seven 1.0.6 interactive expansions. Every family must
   obey the same collision/privacy/export contract as the existing catalogue, and
   each test pins the accessibility/control seam that makes the format distinct. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getFamilies } from './registry.js';
import { buildInstance, getFamily, listFamilies } from './index.js';

const IDS = [
  'self-assessment',
  'formula-calculator',
  'branching-scenario',
  'dataset-explorer',
  'drag-to-label',
  'algorithm-builder',
  'relationship-network',
];

function firstPreset(id) {
  const f = getFamily(id);
  assert.ok(f.presets?.[0]?.params, `${id}: first preset exists`);
  return buildInstance(id, f.presets[0].params, `pg-${id}-test`);
}

function assertSelfContained(block, id) {
  const surface = `${block.html || ''}\n${block.css || ''}\n${block.js || ''}`;
  assert.ok(block.html, `${id}: html`);
  assert.ok(block.css.includes(`#${block.domId}`), `${id}: scoped css`);
  assert.ok(block.js.includes(JSON.stringify(block.domId)), `${id}: scoped runtime`);
  assert.doesNotMatch(surface, /\son\w+\s*=/, `${id}: no inline handlers`);
  assert.doesNotMatch(surface, /fetch\s*\(|XMLHttpRequest/, `${id}: no network`);
  assert.doesNotMatch(surface, /localStorage|sessionStorage/, `${id}: no storage`);
  assert.doesNotMatch(block.html, /\n\s*\n/, `${id}: compact html`);
  assert.doesNotThrow(() => new Function(block.js), `${id}: runtime parses`);
}

test('registry exposes all seven expansion families (catalogue now 80)', () => {
  const registry = getFamilies();
  for (const id of IDS) assert.ok(registry[id], id);
  assert.equal(listFamilies().length, 80);
});

test('every expansion family builds a self-contained first preset', () => {
  for (const id of IDS) assertSelfContained(firstPreset(id), id);
});

test('self-assessment has profile outcomes, progress, back and restart controls', () => {
  const b = firstPreset('self-assessment');
  assert.match(b.js, /Deep diver/);
  assert.match(b.html, /data-role="progress"/);
  assert.match(b.html, /data-role="back"/);
  assert.match(b.html, /aria-live="polite"/);
});

test('formula calculator exposes synchronised range/number inputs and multiple outputs', () => {
  const b = firstPreset('formula-calculator');
  assert.match(b.html, /type="range"/);
  assert.match(b.html, /type="number"/);
  assert.ok((b.html.match(/data-role="out"/g) || []).length >= 2);
  assert.match(b.js, /new Function/);
  assert.match(b.js, /days \* rate/);
});

test('branching scenario carries score, reversible history and a cycle guard', () => {
  const b = firstPreset('branching-scenario');
  assert.match(b.js, /Trust/);
  assert.match(b.html, /data-role="back"/);
  assert.match(b.js, /moves>=30/);
  assert.match(b.js, /history\.push/);
});

test('dataset explorer combines search, category filtering, sorting and chart view', () => {
  const b = firstPreset('dataset-explorer');
  assert.match(b.html, /type="search"/);
  assert.match(b.html, /Filter category/);
  assert.match(b.html, /data-view="bars"/);
  assert.match(b.html, /aria-sort="none"/);
  assert.match(b.js, /first 30 charted/);
});

test('drag-to-label offers buttons as the non-drag path and checks answers', () => {
  const b = firstPreset('drag-to-label');
  assert.match(b.html, /data-role="label"/);
  assert.match(b.html, /data-role="target"/);
  assert.match(b.html, /Check labels/);
  assert.match(b.js, /aria-pressed/);
  assert.match(b.js, /addEventListener\('drop'/);
  assert.match(b.js, /raw===null\?-1:\+raw/,
    'an unfilled target must not coerce its missing data attribute to label zero');
});

test('algorithm builder has flowchart shapes, drag and keyboard/button movement', () => {
  const b = firstPreset('algorithm-builder');
  assert.match(b.html, /is-decision/);
  assert.match(b.html, /Check flow/);
  assert.match(b.html, /Show solution/);
  assert.match(b.js, /ArrowUp/);
  assert.match(b.js, /dragstart/);
});

test('relationship network has selectable nodes, SVG links and textual fallback', () => {
  const b = firstPreset('relationship-network');
  assert.match(b.html, /<svg/);
  assert.match(b.html, /data-role="node"/);
  assert.match(b.html, /All relationships/);
  assert.match(b.html, /<li>/);
  assert.match(b.js, /is-near/);
});

test('standard frame and accent options still apply to an expansion family', () => {
  const f = getFamily('self-assessment');
  const b = buildInstance('self-assessment', { ...f.presets[0].params, title: 'Find your rhythm', accent: 'rose' }, 'pg-sa-frame');
  assert.match(b.html, /pg-frame-title/);
  assert.doesNotMatch(b.css, /#22d3ee/i);
});
