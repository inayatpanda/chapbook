// Run:  node --test src/seams/ai.test.mjs
// Exercises the BYOK AI seam: Layer 1 (listModels/resolveLatestModel) + Layer 3 (mid-use
// auto-heal — a retired model is detected, the seam fetches the live list, picks a current
// model, persists it, emits 'studio:model-switched', and retries the request ONCE).
import { test } from 'node:test';
import assert from 'node:assert/strict';

// The seam emits a window CustomEvent on a heal. node has no window, so provide a capturing
// fake + a minimal CustomEvent (node --test isolates each file in its own process, so this
// global is file-local). Must be installed BEFORE importing the seam is not required — the
// seam reads `window` lazily at call time — but set it up here regardless.
const events = [];
globalThis.window = { dispatchEvent: (e) => { events.push(e); return true; } };
if (typeof globalThis.CustomEvent === 'undefined') {
  globalThis.CustomEvent = class CustomEvent { constructor(type, init) { this.type = type; this.detail = (init && init.detail) || null; } };
}

const { makeAi } = await import('./ai.js');

// The real Groq /models payload — newest chat is llama-4-scout (others newer but non-chat).
const GROQ_DATA = [
  { id: 'whisper-large-v3-turbo', created: 1760000000 },
  { id: 'groq/compound', created: 1759600000 },
  { id: 'meta-llama/llama-4-scout-17b-16e-instruct', created: 1758000000 }, // newest chat
  { id: 'llama-3.3-70b-versatile', created: 1757000000 },
  { id: 'qwen/qwen3.6-27b', created: 1754000000 },
];
const HEALED = 'meta-llama/llama-4-scout-17b-16e-instruct';

function fakeCfg(init) {
  const store = { ...init };
  return {
    getAi: () => ({ provider: store.aiProvider || 'groq', key: store.aiKey || '', model: store.aiModel || '' }),
    save: (patch) => { Object.assign(store, patch); return store; },
    _store: store,
  };
}

// Groq-shaped fake fetch: chat POST with the dead model → 400 decommissioned; GET /models →
// the catalogue; chat POST with any other model → success. Records every call for assertions.
function groqFetch(deadModel, calls) {
  return async (url, init = {}) => {
    const u = String(url);
    const method = (init.method || 'GET').toUpperCase();
    calls.push({ u, method });
    if (u.includes('/models') && method === 'GET') {
      return { ok: true, status: 200, text: async () => JSON.stringify({ object: 'list', data: GROQ_DATA }) };
    }
    const body = JSON.parse(init.body);
    if (body.model === deadModel) {
      return { ok: false, status: 400, text: async () => JSON.stringify({ error: { message: `The model \`${deadModel}\` has been decommissioned`, type: 'invalid_request_error', code: 'model_decommissioned' } }) };
    }
    return { ok: true, status: 200, text: async () => JSON.stringify({ choices: [{ finish_reason: 'stop', message: { content: 'healed hello' } }] }) };
  };
}

test('Layer 3: a decommissioned model heals — switches, persists, emits event, retries once', async () => {
  events.length = 0;
  const calls = [];
  const cfg = fakeCfg({ aiProvider: 'groq', aiKey: 'gsk-test', aiModel: 'llama-3.1-70b-versatile' });
  const ai = makeAi(cfg, groqFetch('llama-3.1-70b-versatile', calls));

  const r = await ai.generateText({ prompt: 'hi' });
  assert.equal(r.text, 'healed hello');

  // persisted the new model
  assert.equal(cfg._store.aiModel, HEALED);

  // emitted exactly one switch event with the right from/to
  assert.equal(events.length, 1);
  assert.equal(events[0].type, 'studio:model-switched');
  assert.deepEqual(events[0].detail, { provider: 'groq', from: 'llama-3.1-70b-versatile', to: HEALED });

  // exactly one retry: POST(dead) → GET(models) → POST(healed). No further recovery loop.
  const posts = calls.filter((c) => c.method === 'POST');
  const gets = calls.filter((c) => c.method === 'GET' && c.u.includes('/models'));
  assert.equal(posts.length, 2, 'original attempt + one retry');
  assert.equal(gets.length, 1, 'one live model-list fetch');
});

test('Layer 3: a non-dead error (401 auth) surfaces as-is — no switch, no retry, no event', async () => {
  events.length = 0;
  const calls = [];
  const cfg = fakeCfg({ aiProvider: 'groq', aiKey: 'bad', aiModel: 'llama-3.3-70b-versatile' });
  const authFetch = async (url, init = {}) => {
    calls.push({ u: String(url), method: (init.method || 'GET').toUpperCase() });
    return { ok: false, status: 401, text: async () => JSON.stringify({ error: { message: 'Invalid API Key', code: 'invalid_api_key' } }) };
  };
  const ai = makeAi(cfg, authFetch);
  await assert.rejects(() => ai.generateText({ prompt: 'hi' }), (e) => e.status === 401);
  assert.equal(cfg._store.aiModel, 'llama-3.3-70b-versatile'); // unchanged
  assert.equal(events.length, 0);
  assert.equal(calls.filter((c) => c.u.includes('/models')).length, 0, 'never fetched the model list');
});

test('Layer 3: the retry itself failing surfaces the ORIGINAL error (never loops)', async () => {
  events.length = 0;
  const calls = [];
  const cfg = fakeCfg({ aiProvider: 'groq', aiKey: 'gsk-test', aiModel: 'llama-3.1-70b-versatile' });
  // Every chat POST fails as decommissioned (even the healed model) → recovery on the retry
  // must NOT recurse; the original error propagates.
  const alwaysDead = async (url, init = {}) => {
    const u = String(url); const method = (init.method || 'GET').toUpperCase();
    calls.push({ u, method });
    if (u.includes('/models')) return { ok: true, status: 200, text: async () => JSON.stringify({ data: GROQ_DATA }) };
    return { ok: false, status: 400, text: async () => JSON.stringify({ error: { message: 'model decommissioned', code: 'model_decommissioned' } }) };
  };
  const ai = makeAi(cfg, alwaysDead);
  await assert.rejects(() => ai.generateText({ prompt: 'hi' }), (e) => e.status === 400 && e.providerCode === 'model_decommissioned');
  assert.equal(calls.filter((c) => c.method === 'POST').length, 2, 'one retry only — no loop');
});

test('Layer 1: listModels returns the live list for the active provider, [] for a keyless one', async () => {
  const calls = [];
  const cfg = fakeCfg({ aiProvider: 'groq', aiKey: 'gsk-test', aiModel: '' });
  const ai = makeAi(cfg, groqFetch('none', calls));
  const models = await ai.listModels('groq');
  assert.ok(models.includes('llama-3.3-70b-versatile'));
  // A different provider has no stored key in BYOK → graceful [] (no doomed request).
  assert.deepEqual(await ai.listModels('openai'), []);
});

test('Layer 1: resolveLatestModel resolves the live latest for the active provider', async () => {
  const calls = [];
  const cfg = fakeCfg({ aiProvider: 'groq', aiKey: 'gsk-test', aiModel: '' });
  const ai = makeAi(cfg, groqFetch('none', calls));
  assert.equal(await ai.resolveLatestModel('groq'), HEALED);
  // Keyless provider → adapter degrades to its offline default (never throws).
  assert.equal(await ai.resolveLatestModel('openai'), 'gpt-4o');
});
