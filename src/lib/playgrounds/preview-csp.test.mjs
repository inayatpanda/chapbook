import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {expressionAst,evaluateExpression} from './expression-runtime.js';
import { buildInstance, getFamily } from './index.js';

// Custom exported widgets retain their sandbox CSP. Built-in mathematical families
// use parsed expressions, so they also work when the parent page forbids eval.
const INDEX_HTML = readFileSync(new URL('../../index.html', import.meta.url), 'utf8');

function pgPreviewCsp() {
  // The constant is a single JS string literal whose inner single-quotes are
  // backslash-escaped (\'); grab the whole value and un-escape for readability.
  const m = INDEX_HTML.match(/const PG_PREVIEW_CSP\s*=\s*'(.+)';/);
  assert.ok(m, 'PG_PREVIEW_CSP constant found in src/index.html');
  return m[1].replace(/\\'/g, "'");
}

test('PG_PREVIEW_CSP script-src allows both unsafe-inline and unsafe-eval', () => {
  const csp = pgPreviewCsp();
  const scriptSrc = (csp.match(/script-src([^;]*);/) || [])[1] || '';
  assert.match(scriptSrc, /'unsafe-inline'/, "script-src keeps 'unsafe-inline'");
  assert.match(scriptSrc, /'unsafe-eval'/,
    "custom widget export policy remains scoped to its sandbox");
});

test('both preview/export srcdoc builders embed PG_PREVIEW_CSP (so the eval grant reaches the export)', () => {
  // tplLibSrcdoc() drives BOTH the live maker preview and exportInteractiveHtml()'s .html.
  const uses = (INDEX_HTML.match(/\$\{PG_PREVIEW_CSP\}/g) || []).length;
  assert.ok(uses >= 2, `expected PG_PREVIEW_CSP interpolated into >=2 srcdoc builders, saw ${uses}`);
});

test("function-explorer ships the parsed expression evaluator", () => {
  const f = getFamily('function-explorer');
  const block = buildInstance('function-explorer', f.presets[0].params, 'pg-fx-probe');
  assert.match(block.js, /compileMathExpression/, 'built js uses the expression evaluator');
});

test("formula-calculator's built block ships its expression compiler", () => {
  const f = getFamily('formula-calculator');
  const block = buildInstance('formula-calculator', f.presets[0].params, 'pg-fc-csp');
  assert.match(block.js, /compileMathExpression/, 'calculator expression compiler present');
  assert.match(block.js, /days \* rate/, 'preset formula reaches the sandbox runtime');
});

test('function-explorer preset curve is nonconstant without eval', () => {
  const f = getFamily('function-explorer');
  const params = f.presets[0].params;
  const yExpr = (params.curve && params.curve.yExpr) || 't';
  const KEYS = (params.sliders || []).map((s) => s.key).filter((k) => /^[A-Za-z_$][\w$]*$/.test(k));
  const V = {};
  (params.sliders || []).forEach((s) => { V[s.key] = s.value; });
  const ast=expressionAst(yExpr);
  const ys = [0, 0.25, 0.5, 0.75, 1].map(t => Number(evaluateExpression(ast,V,t)));
  ys.forEach((y) => assert.ok(Number.isFinite(y), `y(${y}) is finite`));
  const distinct = new Set(ys.map((y) => y.toFixed(4)));
  assert.ok(distinct.size > 1,
    `curve must be non-constant (a real curve, not a flat line); got ${JSON.stringify(ys)}`);
});
