/* Tests for the four WS4 families: image-annotator, step-explainer, scored-quiz,
   sortable-table. Same bar as interactive-drops: registered, first preset builds
   non-empty self-contained markup that obeys every playground rule, and the key
   content survives into the built surface. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { families } from './registry.js';
import { buildInstance, getFamily } from './index.js';

const IDS = ['image-annotator', 'step-explainer', 'scored-quiz', 'sortable-table'];

function firstPresetBlock(id) {
  const f = getFamily(id);
  return buildInstance(id, f.presets[0].params, `pg-${id}-t`);
}

function assertSelfContained(inst, label) {
  const surface = (inst.html || '') + '\n' + (inst.css || '') + '\n' + (inst.js || '');
  assert.ok((inst.html || '').length > 0, `${label}: non-empty html`);
  assert.ok((inst.js || '').length > 0, `${label}: non-empty js`);
  assert.ok(!/\son\w+\s*=/.test(surface), `${label}: no inline on* handlers`);
  assert.ok(!/fetch\s*\(/.test(surface), `${label}: no fetch()`);
  assert.ok(!/XMLHttpRequest/.test(surface), `${label}: no XMLHttpRequest`);
  assert.ok(!/localStorage|sessionStorage/.test(surface), `${label}: no web storage`);
  assert.ok(inst.domId && (inst.css || '').includes('#' + inst.domId), `${label}: css scoped by #domId`);
  assert.ok(inst.js.includes(JSON.stringify(inst.domId)), `${label}: js scoped by domId`);
  assert.ok(!/\n\s*\n/.test(inst.html), `${label}: no blank lines in html`);
}

test('registry: all four WS4 families are registered', () => {
  for (const id of IDS) assert.ok(families[id], `family "${id}" is registered`);
});

test('every WS4 family: first preset builds self-contained', () => {
  for (const id of IDS) assertSelfContained(firstPresetBlock(id), id);
});

test('image-annotator: pins render as buttons at their coordinates', () => {
  const b = firstPresetBlock('image-annotator');
  assert.ok(b.html.includes('pg-anno-pin') && b.html.includes('left:30%'), 'pin positioned');
  assert.ok(b.js.includes('Acromion'), 'pin data in CONFIG');
  assert.ok(b.html.includes('is-blank'), 'no image → placeholder stage');
});

test('step-explainer: steps + dots + counter', () => {
  const b = firstPresetBlock('step-explainer');
  assert.ok(b.js.includes('Haematoma') && b.js.includes('Remodelling'), 'steps in CONFIG');
  assert.ok((b.html.match(/pg-sx-dot/g) || []).length >= 4, 'a dot per step');
});

test('scored-quiz: questions + verdict bands wired', () => {
  const b = firstPresetBlock('scored-quiz');
  assert.ok(b.js.includes('scaphoid') && b.js.includes('Full marks'), 'questions + verdicts in CONFIG');
});

test('sortable-table: headers are sort buttons with aria-sort; rows escape', () => {
  const b = firstPresetBlock('sortable-table');
  assert.ok(b.html.includes('aria-sort="none"') && b.html.includes('pg-st-sort'), 'sortable headers');
  assert.ok(b.html.includes('ProFHER'), 'rows rendered');
  const evil = buildInstance('sortable-table', { columns: ['a<b', 'c'], rows: [['<script>x</script>', '1']] }, 'pg-st-x');
  assert.ok(!evil.html.includes('<script>x'), 'cells are escaped');
});

test('WS4 families take the std title + accent like everyone else', () => {
  const f = getFamily('scored-quiz');
  const b = buildInstance('scored-quiz', { ...f.presets[0].params, title: 'Quiz me', accent: 'amber' }, 'pg-sq-t2');
  assert.ok(b.html.includes('pg-frame-title') && b.html.includes('Quiz me'));
  assert.ok(!/#22d3ee/i.test(b.css), 'amber re-tint applied');
});
