// Prepublish raw-HTML safety gate (checkDoc). This is the WARN-GATE that blocks
// publishing — the product's stated safety contract for raw blocks, because the
// published blog renders raw HTML with NO sanitiser. The event-handler check must
// catch on…= after ANY attribute delimiter (browsers accept `/`, quotes and
// backticks as well as whitespace — `<img/src=x/onerror=…>` is a live handler),
// while never tripping on attributes that merely contain "on".
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkDoc } from './prepublish.js';

const rawDoc = (content) => ({ version: 1, blocks: [{ id: 'r1', type: 'raw', content }] });
const meta = { title: 'T' };
const unsafeErrors = (content) =>
  checkDoc({ doc: rawDoc(content), meta }).errors.filter((e) => /unsafe/i.test(e.message));

test('raw gate: slash-delimited handler <img/src=x/onerror=…> is flagged (bypass fix)', () => {
  const errs = unsafeErrors('<img/src=x/onerror=alert(1)>');
  assert.equal(errs.length, 1, 'the attribute-boundary bypass must be caught');
  assert.match(errs[0].message, /event handler/i);
});

test('raw gate: whitespace-delimited handler <a href=x onclick=y> is still flagged', () => {
  const errs = unsafeErrors('<a href=x onclick=y>x</a>');
  assert.equal(errs.length, 1);
  assert.match(errs[0].message, /event handler/i);
});

test('raw gate: quote-delimited handler is flagged', () => {
  assert.equal(unsafeErrors(`<img src=x "onerror=alert(1)">`).length, 1);
});

test('raw gate: a block that STARTS with on…= is flagged', () => {
  assert.equal(unsafeErrors('onerror=alert(1) <b>hi</b>').length, 1);
});

test('raw gate: class="beacon" is NOT flagged (no false positive on "on" substrings)', () => {
  assert.equal(unsafeErrors('<div class="beacon">hello</div>').length, 0);
});

test('raw gate: data-son="x" is NOT flagged', () => {
  assert.equal(unsafeErrors('<span data-son="x">hi</span>').length, 0);
});

test('raw gate: <button class="button"> and contenteditable are NOT flagged', () => {
  assert.equal(unsafeErrors('<button class="button" contenteditable="true">go</button>').length, 0);
});

// ── figure gate: figureSvgRisk must catch the same delimiter class as the raw
// gate — <rect/onclick=…> is a live handler exactly like <img/src=x/onerror=…>.
const figDoc = (svg) => ({ version: 1, blocks: [{ id: 'f1', type: 'figure', svg, alt: 'a figure' }] });
const figUnsafeErrors = (svg) =>
  checkDoc({ doc: figDoc(svg), meta }).errors.filter((e) => /unsafe/i.test(e.message));

test('figure gate: slash-delimited handler <rect/onclick=…> is flagged (bypass fix)', () => {
  const errs = figUnsafeErrors('<svg viewBox="0 0 1 1"><rect/onclick=alert(1)/></svg>');
  assert.equal(errs.length, 1, 'the attribute-boundary bypass must be caught');
  assert.match(errs[0].message, /event handler/i);
});

test('figure gate: whitespace-delimited handler is still flagged', () => {
  assert.equal(figUnsafeErrors('<svg viewBox="0 0 1 1"><rect onclick="x()"/></svg>').length, 1);
});

test('figure gate: a clean themed figure is NOT flagged', () => {
  assert.equal(figUnsafeErrors('<svg viewBox="0 0 1 1"><path d="M0 0" fill="var(--ink)"/></svg>').length, 0);
});

test('raw gate: <script> and javascript: URLs still error (regression pins)', () => {
  assert.equal(unsafeErrors('<script>x()</script>').length, 1);
  assert.equal(unsafeErrors('<a href="javascript:alert(1)">x</a>').length, 1);
});
