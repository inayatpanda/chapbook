import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const manifest = JSON.parse(readFileSync(new URL('../illustrations-manifest.json', import.meta.url), 'utf8'));

test('Cloud illustration library is a first-class writing destination', () => {
  assert.match(html, /id="illusTile"[^>]*data-type="__illus"[\s\S]*?Illustration library/);
  assert.match(html, /label:'Illustration library'[\s\S]*?openIllusPicker\(\{ insertAt: at \}\)/);
  assert.match(html, /dataset\.type === '__illus'[\s\S]*?openIllusPicker\(\{ insertAt: at \}\)/);
});

test('image blocks and cover settings can open the illustration library', () => {
  assert.match(html, /openIllusPicker\(\{ target: b \}\)/);
  assert.match(html, /openIllusPicker\(\{ mode: 'cover' \}\)/);
});

test('manifest provides the complete public R2 catalogue', () => {
  assert.equal(manifest.count, manifest.assets.length);
  assert.ok(manifest.assets.length >= 1000);
  assert.match(manifest.baseUrl, /^https:\/\/[^/]+\.r2\.dev\/$/);
  assert.ok(manifest.assets.every(asset => asset.full && asset.thumb && asset.description));
});
