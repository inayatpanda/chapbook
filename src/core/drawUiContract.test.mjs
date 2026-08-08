import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('../index.html', import.meta.url), 'utf8');

test('DRAW-04: drawing toolbar exposes an unrestricted custom colour input', () => {
  assert.match(source, /id="figCustomColour"[^>]+type="color"[^>]+aria-label="Custom colour"/);
  assert.match(source, /figCustomColour[^]*addEventListener\('input'/);
  assert.match(source, /_figDraw\.colour = customColour\.value/);
});

test('frame navigation and frame actions use separate responsive rows', () => {
  assert.match(source, /fig-frames-row fig-frame-nav-row/);
  assert.match(source, /fig-frames-row fig-frame-actions/);
  assert.match(source, /\.fig-frame-actions \.fig-frame-act\{flex:1 1 auto\}/);
});
