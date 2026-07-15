import { test } from 'node:test';
import assert from 'node:assert/strict';
import { applyAccent, ACCENTS } from './accent.js';

test('accent: default is the identity transform', () => {
  const css = '#x .a{color:#22d3ee;background:rgba(45,212,191,.2)}';
  assert.equal(applyAccent(css, 'default', '', 'x'), css);
  assert.equal(applyAccent(css, '', '', 'x'), css);
});

test('accent: violet substitutes hex forms', () => {
  const out = applyAccent('#x .a{color:#22d3ee;border:1px solid #818cf8}', 'violet', '', 'x');
  assert.ok(!/#22d3ee/i.test(out), 'cyan hex replaced');
  assert.ok(out.includes('#a5b4fc'), 'cyan-slot -> light violet');
});

test('accent: substitutes rgb triplets and preserves alpha', () => {
  const out = applyAccent('#x .a{background:rgba(34,211,238,.08)}', 'amber', '', 'x');
  assert.ok(!/34\s*,\s*211\s*,\s*238/.test(out), 'cyan triplet replaced');
  assert.ok(/\.08\)/.test(out), 'alpha preserved');
});

test('accent: single pass — an introduced colour is not re-substituted', () => {
  // violet accent maps teal-slot -> #818cf8 (the violet SOURCE). It must survive.
  const out = applyAccent('#x .a{color:#2dd4bf}', 'violet', '', 'x');
  assert.ok(out.includes('#818cf8'), 'teal-slot became #818cf8 and stayed');
});

test('accent: sets scoped vars for the var-using families', () => {
  const out = applyAccent('#x .a{color:var(--cyan,#22d3ee)}', 'rose', '', 'x');
  assert.ok(out.startsWith('#x{--cyan:'), 'vars rule prepended, scoped to domId');
});

test('accent: custom derives a ramp from a hex; bad hex is a no-op', () => {
  const out = applyAccent('#x .a{color:#22d3ee}', 'custom', '#ff0000', 'x');
  assert.ok(!/#22d3ee/i.test(out), 'cyan replaced by a shade of the custom hex');
  const noop = applyAccent('#x .a{color:#22d3ee}', 'custom', 'nope', 'x');
  assert.equal(noop, '#x .a{color:#22d3ee}', 'invalid custom hex → identity');
});

test('accent: ACCENTS lists the seven choices', () => {
  assert.deepEqual(ACCENTS, ['default','teal','cyan','violet','amber','rose','custom']);
});
