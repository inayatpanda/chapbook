// Run:  node --test studio-app/core/aiDefaults.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { AI_DEFAULT_MODELS, defaultModelFor } from './aiDefaults.js';

test('maps each cloud provider to a sensible current offline-default model', () => {
  assert.equal(defaultModelFor('anthropic'), 'claude-opus-4-8');
  assert.equal(defaultModelFor('openai'), 'gpt-4o');
  assert.equal(defaultModelFor('google'), 'gemini-flash-latest');
  assert.equal(defaultModelFor('groq'), 'llama-3.3-70b-versatile');
});

test('Ollama (local) has no cloud default — model depends on what is pulled', () => {
  assert.equal(defaultModelFor('ollama'), '');
});

test('unknown provider id yields empty string, never throws', () => {
  assert.equal(defaultModelFor('nope'), '');
  assert.equal(defaultModelFor(''), '');
  assert.equal(defaultModelFor(undefined), '');
  assert.equal(defaultModelFor(null), '');
});

test('trims surrounding whitespace before lookup', () => {
  assert.equal(defaultModelFor('  anthropic  '), 'claude-opus-4-8');
});

test('the map covers exactly the five supported providers (no accidental additions/removals)', () => {
  assert.deepEqual(
    Object.keys(AI_DEFAULT_MODELS).sort(),
    ['anthropic', 'google', 'groq', 'ollama', 'openai'],
  );
});
