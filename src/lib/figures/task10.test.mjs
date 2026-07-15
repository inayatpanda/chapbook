import { test } from 'node:test';
import assert from 'node:assert/strict';
import { listFamilies, build } from './registry.js';
import { sanitise } from './svg.js';

// Helper: fetch a family meta by id from the live registry.
const metaOf = (id) => listFamilies().find((f) => f.id === id);

const NEW_IDS = ['bar-compare', 'part-to-whole', 'range-scale', 'small-multiples'];

// (a) The registry lists all four new families, each schema + >=1 preset.
test('listFamilies includes bar-compare, part-to-whole, range-scale and small-multiples with schema + presets', () => {
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
  'bar-compare': 'London',
  'part-to-whole': 'Sunny',
  'range-scale': 'road',
  'small-multiples': 'Stage 1',
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

// (c) part-to-whole: all three styles build to non-empty, sanitise-stable, no-hex svg.
test('build(part-to-whole) supports donut, stacked and waffle styles', () => {
  const base = { segments: [{ label: 'Sunny', value: 7 }, { label: 'Grey', value: 1 }] };
  for (const style of ['donut', 'stacked', 'waffle']) {
    const { svg } = build('part-to-whole', { ...base, style });
    assert.equal(typeof svg, 'string');
    assert.ok(svg.length > 0, `${style} svg is non-empty`);
    assert.ok(!svg.includes('#'), `${style} svg contains no # hex colour`);
    assert.equal(sanitise(svg), svg, `${style} svg is sanitise-stable`);
  }
});

// (d) bar-compare: the numeric value text appears.
test('build(bar-compare) renders the bar value text', () => {
  const preset = metaOf('bar-compare').presets[0];
  const { svg } = build('bar-compare', preset.params);
  assert.ok(svg.includes('95'), 'bar value "95" appears');
});
