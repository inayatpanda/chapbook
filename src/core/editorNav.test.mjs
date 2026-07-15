import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  ENTRY_NEW, ENTRY_EXISTING,
  editorSectionFor, editorBackLabel, editorBackTarget, editorHighlightSection,
} from './editorNav.js';

// ── Write stays in Write; editing existing posts stays in Posts ──────────────

test('a NEW post (startNewPost) puts the editor under the Write tab', () => {
  assert.equal(editorSectionFor(ENTRY_NEW), 'write');
  assert.equal(editorHighlightSection('write'), 'write');
});

test('editing an EXISTING post (openBlockEditor) puts the editor under the Posts tab', () => {
  assert.equal(editorSectionFor(ENTRY_EXISTING), 'posts');
  assert.equal(editorHighlightSection('posts'), 'posts');
});

test('unknown/legacy entry defaults to Posts (safe fallback)', () => {
  assert.equal(editorSectionFor(undefined), 'posts');
  assert.equal(editorSectionFor('something-else'), 'posts');
});

// ── Back button label + target follow the section ────────────────────────────

test('back button label follows editorSection', () => {
  assert.equal(editorBackLabel('write'), '← Write');
  assert.equal(editorBackLabel('posts'), '← Posts');
});

test('Write back button returns to the New-post LANDING (not the picker)', () => {
  assert.equal(editorBackTarget('write'), 'newpost');
});

test('Posts back button returns to the Posts list', () => {
  assert.equal(editorBackTarget('posts'), 'posts');
});

test('end-to-end: a new post → Write tab → "← Write" → New-post landing', () => {
  const section = editorSectionFor(ENTRY_NEW);
  assert.equal(editorHighlightSection(section), 'write');
  assert.equal(editorBackLabel(section), '← Write');
  assert.equal(editorBackTarget(section), 'newpost');
});

test('end-to-end: an existing post → Posts tab → "← Posts" → Posts list', () => {
  const section = editorSectionFor(ENTRY_EXISTING);
  assert.equal(editorHighlightSection(section), 'posts');
  assert.equal(editorBackLabel(section), '← Posts');
  assert.equal(editorBackTarget(section), 'posts');
});
