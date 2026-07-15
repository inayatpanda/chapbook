// Run:  node --test src/lib/ai/dispatch.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isDeadModelError } from './dispatch.js';

/* ── isDeadModelError: the mid-use auto-heal trigger ──────────────────────────
   Must fire ONLY when the provider retired/renamed the requested model, and never
   on auth / quota / overload / refusal (retrying those with a different model is wrong).
   Errors carry the fields each adapter's call() attaches: status + the provider's own
   error code/type/status + (from the seam) provider + model. */

/* ── positives, per provider ─────────────────────────────────────────────── */

test('Groq: 400 model_decommissioned is a dead model', () => {
  assert.equal(isDeadModelError({
    provider: 'groq', status: 400, providerCode: 'model_decommissioned',
    model: 'llama-3.1-70b-versatile',
    message: 'The model `llama-3.1-70b-versatile` has been decommissioned',
  }), true);
});

test('Groq: 404 model_not_found is a dead model', () => {
  assert.equal(isDeadModelError({
    provider: 'groq', status: 404, providerCode: 'model_not_found',
    model: 'llama-x', message: 'model not found',
  }), true);
});

test('OpenAI: 404 model_not_found is a dead model', () => {
  assert.equal(isDeadModelError({
    provider: 'openai', status: 404, providerCode: 'model_not_found',
    providerType: 'invalid_request_error', model: 'gpt-4o',
    message: 'The model `gpt-4o` does not exist or you do not have access to it.',
  }), true);
});

test('OpenAI: 400 model_not_found is also a dead model', () => {
  assert.equal(isDeadModelError({
    provider: 'openai', status: 400, providerCode: 'model_not_found', model: 'gpt-old',
    message: 'The model `gpt-old` does not exist',
  }), true);
});

test('Anthropic: 404 not_found_error naming the model is a dead model', () => {
  assert.equal(isDeadModelError({
    provider: 'anthropic', status: 404, providerType: 'not_found_error',
    model: 'claude-old-1', message: 'model: claude-old-1',
  }), true);
});

test('Gemini: 404 NOT_FOUND for a models/… resource is a dead model', () => {
  assert.equal(isDeadModelError({
    provider: 'google', status: 404, providerCode: 404, providerStatus: 'NOT_FOUND',
    model: 'gemini-2.0-flash',
    message: 'models/gemini-2.0-flash is not found for API version v1beta',
  }), true);
});

/* ── negatives: must NOT auto-switch ─────────────────────────────────────── */

test('Anthropic: a 404 not_found_error that does NOT name the model is not a dead model', () => {
  // e.g. a wrong endpoint / unknown resource — switching models would not help.
  assert.equal(isDeadModelError({
    provider: 'anthropic', status: 404, providerType: 'not_found_error',
    model: 'claude-opus-4-8', message: 'The requested resource was not found.',
  }), false);
});

test('auth (401), rate-limit (429), overload (503) are NOT dead-model errors', () => {
  assert.equal(isDeadModelError({ provider: 'openai', status: 401, providerCode: 'invalid_api_key', message: 'Incorrect API key provided' }), false);
  assert.equal(isDeadModelError({ provider: 'groq', status: 429, providerCode: 'rate_limit_exceeded', message: 'Rate limit reached' }), false);
  assert.equal(isDeadModelError({ provider: 'anthropic', status: 503, providerType: 'overloaded_error', message: 'Overloaded' }), false);
});

test('a refusal / generic 400 / non-model 404 are NOT dead-model errors', () => {
  assert.equal(isDeadModelError({ code: 'AI_REFUSAL', message: 'declined this request' }), false);
  assert.equal(isDeadModelError({ provider: 'openai', status: 400, message: 'invalid request' }), false);
  assert.equal(isDeadModelError({ provider: 'google', status: 404, providerStatus: 'NOT_FOUND', message: 'files/abc is not found' }), false); // not a model resource
});

test('malformed / empty errors never throw and never classify', () => {
  assert.equal(isDeadModelError(null), false);
  assert.equal(isDeadModelError(undefined), false);
  assert.equal(isDeadModelError('nope'), false);
  assert.equal(isDeadModelError(42), false);
  assert.equal(isDeadModelError({}), false);
});
