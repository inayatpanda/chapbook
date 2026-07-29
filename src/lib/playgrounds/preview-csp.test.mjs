import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { buildInstance, getFamily } from './index.js';

// Regression guard for the "flat curve" bug: the playground PREVIEW / EXPORT sandbox
// CSP (PG_PREVIEW_CSP in src/index.html) once had `script-src 'unsafe-inline'` with NO
// 'unsafe-eval'. The function-explorer + mixer + formula-calculator families compile the author's inline
// expressions with `new Function`, which THROWS under a no-eval CSP, so their curves
// rendered flat (a zero-valued line) in the maker preview and in the exported .html.
// The published runtime has no CSP, so published posts were unaffected — this was
// preview/export-only, but real. These tests lock the fix so it can't silently regress.

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
    "script-src MUST keep 'unsafe-eval' — new Function() families (function-explorer, mixer, formula-calculator) break without it");
});

test('both preview/export srcdoc builders embed PG_PREVIEW_CSP (so the eval grant reaches the export)', () => {
  // tplLibSrcdoc() drives BOTH the live maker preview and exportInteractiveHtml()'s .html.
  const uses = (INDEX_HTML.match(/\$\{PG_PREVIEW_CSP\}/g) || []).length;
  assert.ok(uses >= 2, `expected PG_PREVIEW_CSP interpolated into >=2 srcdoc builders, saw ${uses}`);
});

test("function-explorer's built block ships the new Function() curve compiler", () => {
  const f = getFamily('function-explorer');
  const block = buildInstance('function-explorer', f.presets[0].params, 'pg-fx-probe');
  assert.match(block.js, /new Function/, 'built js compiles the curve expression via new Function');
});

test("formula-calculator's built block ships its expression compiler", () => {
  const f = getFamily('formula-calculator');
  const block = buildInstance('formula-calculator', f.presets[0].params, 'pg-fc-csp');
  assert.match(block.js, /new Function/, 'calculator expression compiler present');
  assert.match(block.js, /days \* rate/, 'preset formula reaches the sandbox runtime');
});

test('function-explorer preset curve is a NON-CONSTANT curve when eval is permitted', () => {
  // Recreate exactly what the family's mk() does at runtime (new Function over the
  // author's yExpr), then sweep t. A real curve varies with t; the flat-bug fallback
  // (return 0) would make every sample identical.
  const f = getFamily('function-explorer');
  const params = f.presets[0].params;
  const yExpr = (params.curve && params.curve.yExpr) || 't';
  const KEYS = (params.sliders || []).map((s) => s.key).filter((k) => /^[A-Za-z_$][\w$]*$/.test(k));
  const V = {};
  (params.sliders || []).forEach((s) => { V[s.key] = s.value; });
  const pre = KEYS.map((k) => `var ${k}=V[${JSON.stringify(k)}];`).join('');
  // eslint-disable-next-line no-new-func
  const fnY = new Function('V', 't', 'Math', pre + 'return (' + yExpr + ');');
  const ys = [0, 0.25, 0.5, 0.75, 1].map((t) => Number(fnY(V, t, Math)));
  ys.forEach((y) => assert.ok(Number.isFinite(y), `y(${y}) is finite`));
  const distinct = new Set(ys.map((y) => y.toFixed(4)));
  assert.ok(distinct.size > 1,
    `curve must be non-constant (a real curve, not a flat line); got ${JSON.stringify(ys)}`);
});
