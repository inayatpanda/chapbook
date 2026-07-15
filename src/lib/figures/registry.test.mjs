import { test } from 'node:test';
import assert from 'node:assert/strict';
import { listFamilies, build } from './registry.js';
import { sanitise } from './svg.js';

// (a) listFamilies returns metas including both families, each with schema + preset.
test('listFamilies includes labelled-diagram and step-flow with schema + presets', () => {
  const families = listFamilies();
  assert.ok(Array.isArray(families), 'listFamilies returns an array');
  const ids = families.map((f) => f.id);
  assert.ok(ids.includes('labelled-diagram'), 'includes labelled-diagram');
  assert.ok(ids.includes('step-flow'), 'includes step-flow');
  for (const f of families) {
    assert.ok(f.paramsSchema && typeof f.paramsSchema === 'object', `${f.id} has paramsSchema`);
    assert.ok(Array.isArray(f.presets) && f.presets.length >= 1, `${f.id} has >=1 preset`);
    assert.equal(typeof f.name, 'string');
    assert.equal(typeof f.category, 'string');
  }
});

// (b) step-flow build: contains step titles, no hex, sanitise leaves it unchanged.
test('build(step-flow) contains step titles, no hex, sanitise-stable', () => {
  const { svg } = build('step-flow', { orientation: 'h', steps: [{ title: 'Reduce' }, { title: 'Image' }] });
  assert.equal(typeof svg, 'string');
  assert.ok(svg.includes('Reduce'), 'svg contains Reduce');
  assert.ok(svg.includes('Image'), 'svg contains Image');
  assert.ok(!svg.includes('#'), 'svg contains no # hex colour');
  assert.equal(sanitise(svg), svg, 'sanitise leaves the svg unchanged');
});

// (c) animate flag controls baked-in draw keyframes.
test('step-flow draw vs none controls @keyframes fig-draw', () => {
  const drawn = build('step-flow', { orientation: 'h', steps: [{ title: 'A' }, { title: 'B' }] }, { animate: 'draw' });
  assert.ok(drawn.svg.includes('@keyframes fig-draw'), 'draw bakes keyframes');
  const still = build('step-flow', { orientation: 'h', steps: [{ title: 'A' }, { title: 'B' }] }, { animate: 'none' });
  assert.ok(!still.svg.includes('@keyframes fig-draw'), 'none omits keyframes');
});

// (d) labelled-diagram build: contains labels and >=2 leader connector lines.
test('build(labelled-diagram) contains labels and a leader per label', () => {
  const { svg } = build('labelled-diagram', {
    shape: 'blob',
    labels: [{ text: 'apex', anchor: [200, 90] }, { text: 'base', anchor: [200, 230] }],
  });
  assert.ok(svg.includes('apex'), 'svg contains apex');
  assert.ok(svg.includes('base'), 'svg contains base');
  // leader() strokes with var(--ink-dim); count occurrences as thin connectors.
  const leaderCount = (svg.match(/var\(--ink-dim\)/g) || []).length;
  assert.ok(leaderCount >= 2, `expected >=2 leader connectors, got ${leaderCount}`);
  assert.ok(!svg.includes('#'), 'svg contains no # hex colour');
  assert.equal(sanitise(svg), svg, 'sanitise leaves the svg unchanged');
});

// (e) unknown id throws.
test('build(nope) throws on unknown family', () => {
  assert.throws(() => build('nope', {}), /nope|unknown/i);
});

// supportsDraw / motion contract on returned object.
test('build returns supportsDraw=true and motion=null for line families', () => {
  for (const id of ['labelled-diagram', 'step-flow']) {
    const out = build(id, listFamilies().find((f) => f.id === id).presets[0].params);
    assert.equal(out.supportsDraw, true, `${id} supportsDraw`);
    assert.equal(out.motion, null, `${id} motion null`);
  }
});
