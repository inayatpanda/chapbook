import { test } from 'node:test';
import assert from 'node:assert/strict';
import { families } from './registry.js';
import { listFamilies, buildInstance, getFamily } from './index.js';

// pick a family whose raw CSS hard-codes the cyan hex, for the accent assertion
function familyWithCyanHex() {
  for (const f of Object.values(families)) {
    const { css } = f.build((f.presets && f.presets[0] && f.presets[0].params) || {}, 'probe');
    if (/#22d3ee/i.test(css || '')) return f;
  }
  return null;
}

test('listFamilies injects standard params into every schema', () => {
  for (const f of listFamilies()) {
    const props = (f.paramsSchema && f.paramsSchema.properties) || {};
    assert.ok('title' in props, `${f.id}: has title`);
    assert.ok('accent' in props, `${f.id}: has accent`);
  }
});

test('buildInstance: default accent + no title is unwrapped (backward compatible)', () => {
  const f = getFamily('poll');
  const params = f.presets[0].params;
  const raw = f.build(params, 'pg-poll-x');
  const block = buildInstance('poll', params, 'pg-poll-x');
  assert.equal(block.html, raw.html, 'html identical when no title');
  assert.equal(block.css, raw.css, 'css identical when default accent');
});

test('buildInstance: a title wraps the widget in a titled frame', () => {
  const block = buildInstance('poll', { ...getFamily('poll').presets[0].params, title: 'My Poll' }, 'pg-poll-t');
  assert.ok(block.html.includes('pg-frame-title') && block.html.includes('My Poll'));
  assert.ok(block.css.includes('.pg-frame-title'));
});

test('buildInstance: accent re-tints the built css', () => {
  const f = familyWithCyanHex();
  assert.ok(f, 'found a family hard-coding #22d3ee');
  const params = (f.presets && f.presets[0] && f.presets[0].params) || {};
  const block = buildInstance(f.id, { ...params, accent: 'violet' }, 'pg-acc');
  assert.ok(!/#22d3ee/i.test(block.css), 'cyan hex re-tinted');
  assert.ok(block.css.startsWith('#pg-acc{--cyan:'), 'scoped vars prepended');
});

test('buildInstance: maxHeight cap wires the expander into the block js', () => {
  const block = buildInstance('poll', { ...getFamily('poll').presets[0].params, maxHeight: 'short' }, 'pg-cap');
  assert.ok(block.html.includes('pg-frame-clip'), 'clip wrapper present');
  assert.ok(block.css.includes('max-height:240px'), 'short = 240px');
  assert.ok(block.js.indexOf('pg-clip') < block.js.indexOf('CONFIG.options'), 'frame js runs before the family body');
  assert.ok(!/\son\w+\s*=/.test(block.html), 'expander button carries no inline handlers');
});

test('buildInstance: built surface still obeys the playground rules', () => {
  const block = buildInstance('poll', { ...getFamily('poll').presets[0].params, title: 'T', accent: 'rose' }, 'pg-rules');
  const surface = block.html + '\n' + block.css + '\n' + block.js;
  assert.ok(!/\son\w+\s*=/.test(surface), 'no inline on* handlers');
  assert.ok(!/fetch\s*\(|XMLHttpRequest|localStorage|sessionStorage/.test(surface), 'no network/storage');
  assert.ok(!/\n\s*\n/.test(block.html), 'no blank lines in html');
});
