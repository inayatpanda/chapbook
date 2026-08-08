import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');

test('stickers are a first-class Add block and slash-menu destination', () => {
  assert.match(html, /data-type="__sticker"/);
  assert.match(html, /label:'Sticker'[\s\S]*?openStickerLibrary\(at\)/);
  assert.match(html, /async function openStickerLibrary\(atIndex, stickerId\)/);
});

test('Library exposes the full sticker catalogue as a dedicated section', () => {
  assert.match(html, /data-lib="stickers"/);
  assert.match(html, /id="libStickers"/);
  assert.match(html, /id="libStickerGenres"[^>]*role="tablist"/);
  assert.match(html, /id="libStickerGrid"/);
});

test('figure and Library sticker browsers are genre-windowed and searchable', () => {
  assert.match(html, /id="figStickerGenres"[^>]*role="tablist"/);
  assert.match(html, /s\.genre === _figStickerGenre/);
  assert.match(html, /s\.genre === _libStickerGenre/);
  assert.match(html, /renderStickerGenreTabs\('figStickerGenres'/);
  assert.match(html, /renderStickerGenreTabs\('libStickerGenres'/);
});
