import { test } from 'node:test';
import assert from 'node:assert/strict';
import { listFamilies, build } from './registry.js';
import { sanitise } from './svg.js';

// Helper: fetch a family meta by id from the live registry.
const metaOf = (id) => listFamilies().find((f) => f.id === id);

const MOTION_IDS = ['wave', 'fill', 'morph', 'stages'];
// The @keyframes name baked by each family (stages uses 'stages-in').
const KEYFRAMES = { wave: 'wave', fill: 'fill', morph: 'morph', stages: 'stages-in' };

// (a) The registry lists all four new motion families, category 'Motion',
//     each with a paramsSchema + >=1 preset; build returns the right contract.
test('listFamilies includes wave, fill, morph, stages as Motion families', () => {
  const ids = listFamilies().map((f) => f.id);
  for (const id of MOTION_IDS) {
    assert.ok(ids.includes(id), `includes ${id}`);
    const f = metaOf(id);
    assert.equal(f.category, 'Motion', `${id} category is Motion`);
    assert.ok(f.paramsSchema && typeof f.paramsSchema === 'object', `${id} has paramsSchema`);
    assert.ok(Array.isArray(f.presets) && f.presets.length >= 1, `${id} has >=1 preset`);
    assert.equal(typeof f.name, 'string');
  }
});

test('each motion build returns motion === id and supportsDraw === false', () => {
  for (const id of MOTION_IDS) {
    const preset = metaOf(id).presets[0];
    const { svg, supportsDraw, motion } = build(id, preset.params);
    assert.equal(typeof svg, 'string');
    assert.equal(motion, id, `${id} reports motion === '${id}'`);
    assert.equal(supportsDraw, false, `${id} does not support draw`);
  }
});

// (b) Default opts (motion): bakes the family @keyframes, has reduced-motion guard,
//     contains NO '#' hex, and is sanitise-stable.
for (const id of MOTION_IDS) {
  test(`build(${id}) motion: bakes @keyframes ${KEYFRAMES[id]}, reduced-motion, no hex, sanitise-stable`, () => {
    const preset = metaOf(id).presets[0];
    const { svg } = build(id, preset.params); // default opts = motion
    assert.ok(svg.includes(`@keyframes ${KEYFRAMES[id]}`), `svg contains @keyframes ${KEYFRAMES[id]}`);
    assert.ok(svg.includes('prefers-reduced-motion'), 'svg contains reduced-motion guard');
    assert.ok(!svg.includes('#'), 'svg contains no # hex colour');
    assert.equal(sanitise(svg), svg, 'sanitise leaves the motion svg unchanged');
  });
}

// (c) animate:'none' renders a static representative frame: no @keyframes, no animation rule.
for (const id of MOTION_IDS) {
  test(`build(${id}) animate:'none' renders a static frame (no keyframes, no animation)`, () => {
    const preset = metaOf(id).presets[0];
    const { svg } = build(id, preset.params, { animate: 'none' });
    assert.ok(!svg.includes('@keyframes'), `static ${id} svg has no @keyframes`);
    assert.ok(!svg.includes('animation:'), 'static svg has no animation declaration');
    assert.ok(!svg.includes('#'), 'static svg contains no # hex colour');
    assert.equal(sanitise(svg), svg, 'static svg is sanitise-stable');
  });
}

// (d) morph shows both state labels; stages shows each stage label from its preset.
test('build(morph) renders both default state labels A and B', () => {
  const { svg } = build('morph', {}); // defaults labelA 'A', labelB 'B'
  assert.ok(svg.includes('>A<'), 'svg contains label A');
  assert.ok(svg.includes('>B<'), 'svg contains label B');
});

test('build(stages) renders each stage label from the preset', () => {
  const preset = metaOf('stages').presets[0];
  const { svg } = build('stages', preset.params);
  for (const s of preset.params.stages) {
    assert.ok(svg.includes(s.label), `svg contains stage label ${s.label}`);
  }
});
