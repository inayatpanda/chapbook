import { test } from 'node:test';
import assert from 'node:assert/strict';
import { listFamilies, build } from './registry.js';
import { sanitise } from './svg.js';

// Helper: fetch a family meta by id from the live registry.
const metaOf = (id) => listFamilies().find((f) => f.id === id);

const NEW_IDS = ['timeline', 'cycle', 'flow-decision'];

// (a) The registry lists the three new families, each schema + >=1 preset.
test('listFamilies includes timeline, cycle and flow-decision with schema + presets', () => {
  const ids = listFamilies().map((f) => f.id);
  for (const id of NEW_IDS) {
    assert.ok(ids.includes(id), `includes ${id}`);
    const f = metaOf(id);
    assert.ok(f.paramsSchema && typeof f.paramsSchema === 'object', `${id} has paramsSchema`);
    assert.ok(Array.isArray(f.presets) && f.presets.length >= 1, `${id} has >=1 preset`);
    assert.equal(typeof f.name, 'string');
    assert.equal(typeof f.category, 'string');
    assert.equal(f.category, 'Process', `${id} is category Process`);
  }
});

// (b) timeline preset: shows an event label, no hex, sanitise-stable, draw keyframes.
test('build(timeline) preset contains event label, no hex, sanitise-stable, draws', () => {
  const preset = metaOf('timeline').presets[0];
  const { svg, supportsDraw, motion } = build('timeline', preset.params);
  assert.equal(typeof svg, 'string');
  assert.ok(svg.includes('Harvest'), 'svg contains event label "Harvest"');
  assert.ok(!svg.includes('#'), 'svg contains no # hex colour');
  assert.equal(sanitise(svg), svg, 'sanitise leaves the svg unchanged');
  assert.equal(supportsDraw, true);
  assert.equal(motion, null);
  const drawn = build('timeline', preset.params, { animate: 'draw' });
  assert.ok(drawn.svg.includes('@keyframes fig-draw'), 'draw bakes keyframes');
});

// (c) cycle preset: shows a step title, no hex, sanitise-stable, draw keyframes.
test('build(cycle) preset contains step title, no hex, sanitise-stable, draws', () => {
  const preset = metaOf('cycle').presets[0];
  const { svg, supportsDraw, motion } = build('cycle', preset.params);
  assert.equal(typeof svg, 'string');
  assert.ok(svg.includes('Evaporation'), 'svg contains step title "Evaporation"');
  assert.ok(!svg.includes('#'), 'svg contains no # hex colour');
  assert.equal(sanitise(svg), svg, 'sanitise leaves the svg unchanged');
  assert.equal(supportsDraw, true);
  assert.equal(motion, null);
  const drawn = build('cycle', preset.params, { animate: 'draw' });
  assert.ok(drawn.svg.includes('@keyframes fig-draw'), 'draw bakes keyframes');
});

// (d) flow-decision preset: shows decision text + BOTH branch labels, no hex, sanitise-stable, draws.
test('build(flow-decision) preset contains decision text, both branch labels, no hex, draws', () => {
  const preset = metaOf('flow-decision').presets[0];
  const { svg, supportsDraw, motion } = build('flow-decision', preset.params);
  assert.equal(typeof svg, 'string');
  assert.ok(svg.includes('Sprouted?'), 'svg contains decision text "Sprouted?"');
  assert.ok(svg.includes('yes'), 'svg contains branch label "yes"');
  assert.ok(svg.includes('no'), 'svg contains branch label "no"');
  assert.ok(!svg.includes('#'), 'svg contains no # hex colour');
  assert.equal(sanitise(svg), svg, 'sanitise leaves the svg unchanged');
  assert.equal(supportsDraw, true);
  assert.equal(motion, null);
  const drawn = build('flow-decision', preset.params, { animate: 'draw' });
  assert.ok(drawn.svg.includes('@keyframes fig-draw'), 'draw bakes keyframes');
});
