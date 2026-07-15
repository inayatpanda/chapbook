// Run:  node --test src/lib/ai/groq.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { listModels, listModelsRaw, resolveLatestModel, parseModels } from './groq.js';

// The real Groq /models payload shape (2026-07): { object:'list', data:[{ id, created, … }] }.
// Trimmed to the fields the adapter reads, arranged so the newest chat model is llama-4-scout
// while a newer whisper/orpheus/guard/compound/allam entry must be screened out.
const DATA = [
  { id: 'whisper-large-v3-turbo', created: 1760000000 },                    // newest overall — audio
  { id: 'allam-2-7b', created: 1759000000 },                                // newer chat-ish but not whitelisted
  { id: 'groq/compound', created: 1759600000 },                             // agentic wrapper
  { id: 'canopylabs/orpheus-v1-english', created: 1759500000 },             // TTS
  { id: 'meta-llama/llama-prompt-guard-2-86m', created: 1758500000 },       // guard
  { id: 'meta-llama/llama-4-scout-17b-16e-instruct', created: 1758000000 }, // newest CHAT
  { id: 'llama-3.3-70b-versatile', created: 1757000000 },
  { id: 'openai/gpt-oss-120b', created: 1755000000 },
  { id: 'qwen/qwen3.6-27b', created: 1754000000 },
  { id: 'whisper-large-v3', created: 1747000000 },
];

const okFetch = async () => ({ ok: true, status: 200, text: async () => JSON.stringify({ object: 'list', data: DATA }) });

test('parseModels returns a sorted, de-duped id list', () => {
  assert.deepEqual(parseModels({ data: [{ id: 'b' }, { id: 'a' }, { id: 'a' }] }), ['a', 'b']);
});

test('listModels returns the sorted ids; listModelsRaw keeps `created`', async () => {
  const ids = await listModels({ key: 'gsk-x' }, okFetch);
  assert.ok(ids.includes('llama-3.3-70b-versatile'));
  assert.deepEqual(ids, [...ids].sort()); // sorted
  const raw = await listModelsRaw({ key: 'gsk-x' }, okFetch);
  assert.equal(raw.length, DATA.length);
  assert.ok(raw.every((m) => typeof m.id === 'string' && 'created' in m));
});

test('resolveLatestModel picks the newest chat model from the live list (skips whisper/guard/orpheus/compound/allam)', async () => {
  const picked = await resolveLatestModel({ key: 'gsk-x' }, okFetch);
  assert.equal(picked, 'meta-llama/llama-4-scout-17b-16e-instruct');
  assert.ok(!/whisper|guard|orpheus|compound/.test(picked));
});

test('resolveLatestModel degrades to the offline SAFE_DEFAULT when the query fails (401 / offline)', async () => {
  const errFetch = async () => ({ ok: false, status: 401, text: async () => JSON.stringify({ error: { message: 'Invalid API Key', code: 'invalid_api_key' } }) });
  assert.equal(await resolveLatestModel({ key: '' }, errFetch), 'llama-3.3-70b-versatile');
  const throwFetch = async () => { throw new TypeError('Failed to fetch'); };
  assert.equal(await resolveLatestModel({ key: 'x' }, throwFetch), 'llama-3.3-70b-versatile');
});

test('a decommissioned-model chat error carries the provider code for the classifier', async () => {
  const { generateText } = await import('./groq.js');
  const deadFetch = async () => ({
    ok: false, status: 400,
    text: async () => JSON.stringify({ error: { message: 'The model `llama-3.1-70b-versatile` has been decommissioned', type: 'invalid_request_error', code: 'model_decommissioned' } }),
  });
  await assert.rejects(
    () => generateText({ prompt: 'hi', model: 'llama-3.1-70b-versatile', key: 'k' }, deadFetch),
    (e) => e.provider === 'groq' && e.status === 400 && e.providerCode === 'model_decommissioned',
  );
});
