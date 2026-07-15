import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, extname } from 'node:path';
import { listTemplates } from './templates/index.js';
import { validateDoc } from './blocks.js';

// The templates directory is the single source of truth. We count *.json files on
// disk and compare against the loader so the suite tracks WHATEVER ships — the stale
// helm check-blocks.mjs hardcoded "6" and silently broke when a 9th template landed.
const TEMPLATE_DIR = join(dirname(fileURLToPath(import.meta.url)), 'templates');
const jsonFiles = readdirSync(TEMPLATE_DIR).filter((f) => extname(f) === '.json');

// ── Regression guard: EVERY shipped template must pass the app's own validator ─────
// Publishing runs validateDoc(doc); a template that can't pass it can't be published,
// so a shipped-but-invalid template is a latent break. This loop asserts none exist.
test('every shipped template passes validateDoc', () => {
  const all = listTemplates();
  assert.ok(all.length > 0, 'loader must return at least one template');
  for (const t of all) {
    assert.doesNotThrow(
      () => validateDoc(t.doc),
      `template "${t.id || t.name}" must pass validateDoc`,
    );
  }
});

// ── Count is dynamic, never hardcoded ─────────────────────────────────────────────
test('loader count tracks the *.json files on disk (no hardcoded number)', () => {
  assert.ok(jsonFiles.length > 0, 'there must be at least one template file on disk');
  assert.equal(
    listTemplates().length,
    jsonFiles.length,
    'listTemplates() must return one entry per *.json on disk',
  );
});

// ── Path-traversal guard on single-image file ─────────────────────────────────────
test('validateDoc rejects an image file with path traversal', () => {
  assert.throws(
    () => validateDoc({ version: 1, blocks: [{ id: 'x', type: 'image', file: '../../.github/workflows/x.yml' }] }),
    /unsafe image filename/,
  );
});

test('validateDoc rejects image filenames containing slash, backslash or ..', () => {
  for (const bad of ['a/b.jpg', 'a\\b.jpg', 'dir/pic.png', 'sneaky..jpg', '..']) {
    assert.throws(
      () => validateDoc({ version: 1, blocks: [{ id: 'x', type: 'image', file: bad }] }),
      /unsafe image filename/,
      `image file "${bad}" must be rejected`,
    );
  }
});

test('validateDoc accepts a plain image filename', () => {
  assert.doesNotThrow(
    () => validateDoc({ version: 1, blocks: [{ id: 'x', type: 'image', file: 't3.jpg' }] }),
  );
});

// ── Path-traversal guard on gallery per-image files ───────────────────────────────
test('validateDoc rejects a gallery image file with path traversal', () => {
  assert.throws(
    () => validateDoc({
      version: 1,
      blocks: [{ id: 'g', type: 'gallery', images: [{ file: 'ok.jpg' }, { file: '../../secret.env' }] }],
    }),
    /unsafe image filename/,
  );
});

test('validateDoc accepts a gallery with plain image filenames', () => {
  assert.doesNotThrow(
    () => validateDoc({
      version: 1,
      blocks: [{ id: 'g', type: 'gallery', images: [{ file: 'a.jpg' }, { file: 'b.png' }] }],
    }),
  );
});

// The pre-existing "needs file, base64 or url" rule must survive the new guard.
test('validateDoc still rejects an image block with no file/base64/url', () => {
  assert.throws(
    () => validateDoc({ version: 1, blocks: [{ id: 'x', type: 'image', alt: 'nothing' }] }),
    /image block needs file, base64 or url/,
  );
});
