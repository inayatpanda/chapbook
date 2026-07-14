import { test } from 'node:test';
import assert from 'node:assert/strict';
import { listFamilies, build } from './registry.js';
import { sanitise } from './svg.js';

// Helper: fetch a family meta by id from the live registry.
const metaOf = (id) => listFamilies().find((f) => f.id === id);

// (a) The registry now lists both new families, each with a schema + >=1 preset.
test('listFamilies includes cross-section and annotation-arrows with schema + presets', () => {
  const families = listFamilies();
  const ids = families.map((f) => f.id);
  assert.ok(ids.includes('cross-section'), 'includes cross-section');
  assert.ok(ids.includes('annotation-arrows'), 'includes annotation-arrows');
  for (const id of ['cross-section', 'annotation-arrows']) {
    const f = metaOf(id);
    assert.ok(f.paramsSchema && typeof f.paramsSchema === 'object', `${id} has paramsSchema`);
    assert.ok(Array.isArray(f.presets) && f.presets.length >= 1, `${id} has >=1 preset`);
    assert.equal(typeof f.name, 'string');
    assert.equal(typeof f.category, 'string');
  }
});

// (b) cross-section: preset svg shows every layer label, no hex, sanitise-stable.
test('build(cross-section) preset contains every layer label, no hex, sanitise-stable', () => {
  const preset = metaOf('cross-section').presets[0];
  const { svg } = build('cross-section', preset.params);
  assert.equal(typeof svg, 'string');
  for (const layer of preset.params.layers) {
    assert.ok(svg.includes(layer.label), `svg contains layer label "${layer.label}"`);
  }
  assert.ok(!svg.includes('#'), 'svg contains no # hex colour');
  assert.equal(sanitise(svg), svg, 'sanitise leaves the svg unchanged');
});

// (c) cross-section: animate flag controls baked-in draw keyframes.
test('cross-section draw vs none controls @keyframes fig-draw', () => {
  const params = metaOf('cross-section').presets[0].params;
  const drawn = build('cross-section', params, { animate: 'draw' });
  assert.ok(drawn.svg.includes('@keyframes fig-draw'), 'draw bakes keyframes');
  const still = build('cross-section', params, { animate: 'none' });
  assert.ok(!still.svg.includes('@keyframes fig-draw'), 'none omits keyframes');
});

// (d) annotation-arrows: preset svg shows both arrow labels, no hex, sanitise-stable,
//     and emits >=2 arrowheads (each arrow() emits one <polyline> arrowhead).
test('build(annotation-arrows) preset contains arrow labels, no hex, >=2 arrowheads', () => {
  const preset = metaOf('annotation-arrows').presets[0];
  const { svg } = build('annotation-arrows', preset.params);
  const labels = preset.params.arrows.map((a) => a.label).filter(Boolean);
  assert.ok(labels.length >= 2, 'preset declares >=2 labelled arrows');
  for (const lbl of labels) {
    assert.ok(svg.includes(lbl), `svg contains arrow label "${lbl}"`);
  }
  assert.ok(!svg.includes('#'), 'svg contains no # hex colour');
  assert.equal(sanitise(svg), svg, 'sanitise leaves the svg unchanged');
  // arrow() emits its arrowhead as a <polyline>; count them as a stable marker.
  const heads = (svg.match(/<polyline\b/g) || []).length;
  assert.ok(heads >= 2, `expected >=2 arrowhead polylines, got ${heads}`);
});

// (e) annotation-arrows: animate flag controls draw keyframes too.
test('annotation-arrows draw vs none controls @keyframes fig-draw', () => {
  const params = metaOf('annotation-arrows').presets[0].params;
  const drawn = build('annotation-arrows', params, { animate: 'draw' });
  assert.ok(drawn.svg.includes('@keyframes fig-draw'), 'draw bakes keyframes');
  const still = build('annotation-arrows', params, { animate: 'none' });
  assert.ok(!still.svg.includes('@keyframes fig-draw'), 'none omits keyframes');
});

// supportsDraw / motion contract on returned object for both new families.
test('build returns supportsDraw=true and motion=null for new families', () => {
  for (const id of ['cross-section', 'annotation-arrows']) {
    const out = build(id, metaOf(id).presets[0].params);
    assert.equal(out.supportsDraw, true, `${id} supportsDraw`);
    assert.equal(out.motion, null, `${id} motion null`);
  }
});
