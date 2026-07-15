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

// ── stripThink — reasoning-model scaffolding must never reach a post ─────────
import { stripThink } from './groq.js';

test('stripThink removes closed <think> blocks and keeps the answer', () => {
  assert.equal(stripThink('<think>step 1… step 2…</think>The answer is 4.').trim(), 'The answer is 4.');
  assert.equal(stripThink('A<think>x</think>B<think>y</think>C'), 'ABC');
});

test('stripThink drops a truncated UNCLOSED <think> tail (no salvageable answer)', () => {
  assert.equal(stripThink("<think>\nHere's a thinking process:\n1.").trim(), '');
  assert.equal(stripThink('Real text first. <think>then truncated reasoning').trim(), 'Real text first.');
});

test('stripThink is a no-op on plain text', () => {
  assert.equal(stripThink('CHAPBOOK E2E OK'), 'CHAPBOOK E2E OK');
  assert.equal(stripThink(''), '');
});

// ── max_tokens clamp — Groq 400s requests above the model's completion cap ───
import { maxTokensCapFromError, generateText } from './groq.js';

const GROQ_CAP_ERR = '`max_tokens` must be less than or equal to `8192`, the maximum value for `max_tokens` is less than the `context_window` for this model';

test('maxTokensCapFromError parses the cap out of the real Groq message', () => {
  assert.equal(maxTokensCapFromError(GROQ_CAP_ERR), 8192);
  assert.equal(maxTokensCapFromError('some other 400'), 0);
  assert.equal(maxTokensCapFromError(null), 0);
});

test('generateText retries ONCE clamped when Groq rejects max_tokens', async () => {
  const bodies = [];
  const fetchImpl = async (url, opts) => {
    bodies.push(JSON.parse(opts.body));
    if (bodies.length === 1) return new Response(JSON.stringify({ error: { message: GROQ_CAP_ERR, type: 'invalid_request_error', param: 'max_tokens' } }), { status: 400 });
    return new Response(JSON.stringify({ choices: [{ message: { content: 'clamped ok' } }] }), { status: 200 });
  };
  const r = await generateText({ model: 'meta-llama/llama-4-scout-17b-16e-instruct', key: 'k', prompt: 'hi', maxTokens: 16000 }, fetchImpl);
  assert.equal(r.text, 'clamped ok');
  assert.equal(bodies.length, 2);
  assert.equal(bodies[0].max_tokens, 16000);
  assert.equal(bodies[1].max_tokens, 8192); // retried at the provider's stated cap
});

test('a non-cap 400 is NOT retried — surfaces as-is', async () => {
  let calls = 0;
  const fetchImpl = async () => { calls++; return new Response(JSON.stringify({ error: { message: 'invalid role', type: 'invalid_request_error' } }), { status: 400 }); };
  await assert.rejects(() => generateText({ model: 'm', key: 'k', prompt: 'hi', maxTokens: 16000 }, fetchImpl));
  assert.equal(calls, 1);
});
