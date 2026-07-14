import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { extractInlineModules, parseCheckModule, assertInlineModulesParse } from './checkInlineModule.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const INDEX = join(__dirname, 'src', 'index.html');

// The regression guard: the real Studio inline module must PARSE. This is exactly the
// check that was missing when a duplicate `fmtBytes` shipped a blank page.
test('the live Studio inline module(s) parse as ES modules', () => {
  const html = readFileSync(INDEX, 'utf8');
  const count = assertInlineModulesParse(html, 'public/studio/index.html'); // throws with detail on failure
  assert.ok(count >= 1, 'expected at least one inline <script type="module">');
});

// Prove the guard actually catches the exact bug class it exists for.
test('parseCheckModule catches a duplicate top-level declaration', () => {
  const dup = 'function fmtBytes(n){ return n; }\nfunction fmtBytes(n){ return n + 1; }';
  const r = parseCheckModule(dup);
  assert.equal(r.ok, false);
  assert.match(r.error, /already been declared|Duplicate|has already/i);
});

test('parseCheckModule accepts valid module source (incl. browser globals it never runs)', () => {
  const good = 'const fmtBytes = (n) => n + " B";\ndocument.title = fmtBytes(1);\nwindow.x = fmtBytes;';
  assert.deepEqual(parseCheckModule(good), { ok: true, error: null });
});

test('extractInlineModules picks the inline module and ignores <script … src=…>', () => {
  const html = '<script type="module" src="./studio.js"></script>\n<script type="module">const x = 1;</script>';
  const mods = extractInlineModules(html);
  assert.equal(mods.length, 1);
  assert.match(mods[0], /const x = 1/);
});
