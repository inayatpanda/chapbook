import { test } from 'node:test';
import assert from 'node:assert/strict';
import { listFamilies, build } from './registry.js';
import { sanitise } from './svg.js';

// Helper: fetch a family meta by id from the live registry.
const metaOf = (id) => listFamilies().find((f) => f.id === id);

const NEW_IDS = ['before-after', 'comparison-matrix', 'venn-overlap', 'hierarchy'];

// (a) The registry lists all four new families, each schema + >=1 preset.
test('listFamilies includes before-after, comparison-matrix, venn-overlap and hierarchy with schema + presets', () => {
  const ids = listFamilies().map((f) => f.id);
  for (const id of NEW_IDS) {
    assert.ok(ids.includes(id), `includes ${id}`);
    const f = metaOf(id);
    assert.ok(f.paramsSchema && typeof f.paramsSchema === 'object', `${id} has paramsSchema`);
    assert.ok(Array.isArray(f.presets) && f.presets.length >= 1, `${id} has >=1 preset`);
    assert.equal(typeof f.name, 'string');
    assert.equal(typeof f.category, 'string');
  }
});

// (b) Each family's preset build: contains an expected label, no hex, sanitise-stable, draws.
const EXPECT = {
  'before-after': 'Edited',
  'comparison-matrix': 'Cafetière',
  'venn-overlap': 'Sea',
  hierarchy: 'Percussion',
};

for (const id of NEW_IDS) {
  test(`build(${id}) preset contains expected label, no hex, sanitise-stable, draws`, () => {
    const preset = metaOf(id).presets[0];
    const { svg, supportsDraw, motion } = build(id, preset.params);
    assert.equal(typeof svg, 'string');
    assert.ok(svg.includes(EXPECT[id]), `svg contains label "${EXPECT[id]}"`);
    assert.ok(!svg.includes('#'), 'svg contains no # hex colour');
    assert.equal(sanitise(svg), svg, 'sanitise leaves the svg unchanged');
    assert.equal(supportsDraw, true);
    assert.equal(motion, null);
    const drawn = build(id, preset.params, { animate: 'draw' });
    assert.ok(drawn.svg.includes('@keyframes fig-draw'), 'draw bakes keyframes');
  });
}

// (c) comparison-matrix: a tick (teal var) renders for a 'yes' cell, and a header col label appears.
test('build(comparison-matrix) renders a tick for a yes cell and a header col label', () => {
  const preset = metaOf('comparison-matrix').presets[0];
  const { svg } = build('comparison-matrix', preset.params);
  assert.ok(svg.includes('var(--teal)'), 'tick uses var(--teal)');
  assert.ok(svg.includes('Cleanup'), 'header col label "Cleanup" appears');
});

// (d) venn-overlap: at least two circles rendered.
test('build(venn-overlap) renders >=2 circles', () => {
  const preset = metaOf('venn-overlap').presets[0];
  const { svg } = build('venn-overlap', preset.params);
  const circleCount = (svg.match(/<circle\b/g) || []).length;
  assert.ok(circleCount >= 2, `expected >=2 circles, got ${circleCount}`);
});
