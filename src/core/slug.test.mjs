import { test } from 'node:test';
import assert from 'node:assert/strict';
import { slugify, parseSlugResponse } from './slug.js';

// ── slugify ──────────────────────────────────────────────────────────────────

test('slugify turns a title into a hyphenated lowercase slug', () => {
  assert.equal(slugify('Hello, World!'), 'hello-world');
  assert.equal(slugify('  Spaced   Out  '), 'spaced-out');
  assert.equal(slugify('Already-a-slug'), 'already-a-slug');
});

test('slugify caps at 60 chars and trims stray/edge hyphens', () => {
  assert.ok(slugify('a'.repeat(100)).length <= 60);
  assert.equal(slugify('--edge--'), 'edge');
  assert.equal(slugify('a  --  b'), 'a-b');
});

test('slugify returns empty (not "post") for all-symbol/empty input — caller adds fallback', () => {
  assert.equal(slugify(''), '');
  assert.equal(slugify('!!!'), '');
  assert.equal(slugify(null), '');
});

// ── parseSlugResponse — the release-blocker regression guard ──────────────────

test('parseSlugResponse: a BARE STRING response IS the slug (the regression)', () => {
  // GET /slug returns a bare string; reading `.slug` off it used to yield undefined,
  // leaving currentSlug null so the title never reserved and publish silently no-opped.
  assert.equal(parseSlugResponse('my-post'), 'my-post');
});

test('parseSlugResponse: a { slug } envelope is tolerated (future-proof)', () => {
  assert.equal(parseSlugResponse({ slug: 'my-post' }), 'my-post');
});

test('parseSlugResponse: unusable shapes yield null (never a bad/undefined slug)', () => {
  assert.equal(parseSlugResponse(null), null);
  assert.equal(parseSlugResponse(undefined), null);
  assert.equal(parseSlugResponse(42), null);
  assert.equal(parseSlugResponse({}), null);
  assert.equal(parseSlugResponse({ slug: 123 }), null);
  assert.equal(parseSlugResponse('   '), null);
});
