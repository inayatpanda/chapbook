import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeRouter } from './router.js';
import * as playgrounds from './lib/playgrounds/index.js';

// Regression: the client router replaced a Fastify server that auto-decoded path
// params. Callers encodeURIComponent() route params, so a preset name with a space
// ("Coffee brewing methods") arrives as "Coffee%20brewing%20methods". Without
// decoding, getPreset() searched for the literal %20 name, missed, and returned
// null → the interactive template form loaded empty for EVERY space-named preset.
test('router decodes url-encoded path segments (preset name with spaces)', async () => {
  const { api } = makeRouter({ playgrounds });

  // What the composer actually sends (encoded) must resolve the preset.
  const enc = await api('/playgrounds/sortable-table/preset/' + encodeURIComponent('Coffee brewing methods'));
  assert.ok(enc.params, 'encoded preset name should resolve, not return null');
  assert.deepEqual(enc.params.columns, ['Method', 'Minutes', 'Faff', 'Verdict']);
  assert.equal(enc.params.rows.length, 4);

  // A second space-named preset in the same family.
  const grid = await api('/playgrounds/sortable-table/preset/' + encodeURIComponent('Comparison grid'));
  assert.deepEqual(grid.params.columns, ['Option', 'Cost', 'Speed', 'Note']);
});

test('router preset route: unknown name → { params: null }, no throw', async () => {
  const { api } = makeRouter({ playgrounds });
  const none = await api('/playgrounds/sortable-table/preset/' + encodeURIComponent('No Such Preset'));
  assert.equal(none.params, null);
});

test('router decode is defensive: a malformed %-escape falls back to the raw segment', async () => {
  const { api } = makeRouter({ playgrounds });
  // "%ZZ" is not a valid escape — decodeURIComponent throws; the router must not.
  const r = await api('/playgrounds/sortable-table/preset/%ZZ');
  assert.equal(r.params, null); // no matching preset, but crucially no exception
});

// Regression: PUT /settings/ai used to return {ok:true}, but saveSettings() calls
// renderSettings(putResult) which reads .default/.providers → after a successful key
// save the panel falsely showed "No active model — paste a provider's key". PUT must
// return the SAME fresh status shape as GET.
test('PUT /settings/ai returns the fresh status shape (not {ok:true})', async () => {
  const saved = { provider: 'anthropic', key: '', model: '' };
  const config = {
    getAi: () => saved,
    save: (patch) => {
      if (patch.aiProvider) saved.provider = patch.aiProvider;
      if (patch.aiKey) saved.key = patch.aiKey;
      if (patch.aiModel) saved.model = patch.aiModel;
    },
  };
  const { api } = makeRouter({ config });
  const r = await api('/settings/ai', {
    method: 'PUT',
    body: JSON.stringify({ default: 'anthropic', providers: { anthropic: { apiKey: 'sk-test', model: 'claude-x' } } }),
  });
  assert.equal(r.ok, undefined, 'must NOT be the old {ok:true} shape');
  assert.equal(r.default, 'anthropic');
  assert.ok(r.providers && r.providers.anthropic, 'must carry providers[default]');
  assert.equal(r.providers.anthropic.configured, true); // key was saved → shows as configured
  assert.equal(r.providers.anthropic.model, 'claude-x');
});

// Layer 1 — GET /settings/ai/models?provider= returns { models } from the ai seam, matching
// what the Settings "↻ refresh models" datalist (loadModels) reads: r.models||[].
test('GET /settings/ai/models returns { models } from ai.listModels(provider)', async () => {
  const seen = [];
  const ai = { listModels: async (p) => { seen.push(p); return ['a', 'b', 'c']; } };
  const { api } = makeRouter({ ai });
  const r = await api('/settings/ai/models?provider=groq');
  assert.deepEqual(r, { models: ['a', 'b', 'c'] });
  assert.deepEqual(seen, ['groq']); // provider threaded through from the query string
});

test('GET /settings/ai/models is graceful: a throwing/absent seam → { models: [] }', async () => {
  const boom = { listModels: async () => { throw new Error('401 no key'); } };
  assert.deepEqual(await makeRouter({ ai: boom }).api('/settings/ai/models?provider=groq'), { models: [] });
  // no ai seam at all (e.g. a unit test wiring) must also not throw
  assert.deepEqual(await makeRouter({}).api('/settings/ai/models?provider=groq'), { models: [] });
});

// Layer 1 — the more-specific latest-model route must WIN over the generic status route
// below it (which matches settings/ai + GET with no `!c` guard); otherwise it'd return the
// status object instead of { model }.
test('GET /settings/ai/latest-model returns { model } and is not shadowed by the status route', async () => {
  const ai = { resolveLatestModel: async (p) => (p === 'groq' ? 'llama-3.3-70b-versatile' : '') };
  const { api } = makeRouter({ ai });
  const r = await api('/settings/ai/latest-model?provider=groq');
  assert.deepEqual(r, { model: 'llama-3.3-70b-versatile' });
  assert.equal(r.default, undefined, 'must NOT be the status shape');
});

test('GET /settings/ai/latest-model is graceful → { model: "" }', async () => {
  const boom = { resolveLatestModel: async () => { throw new Error('offline'); } };
  assert.deepEqual(await makeRouter({ ai: boom }).api('/settings/ai/latest-model?provider=groq'), { model: '' });
  assert.deepEqual(await makeRouter({}).api('/settings/ai/latest-model?provider=groq'), { model: '' });
});

// Regression: the two new sub-routes must not steal the generic GET /settings/ai status route.
test('GET /settings/ai (generic) still returns the status shape after the sub-routes were added', async () => {
  const config = { getAi: () => ({ provider: 'groq', key: 'k', model: 'llama-3.3-70b-versatile' }) };
  const ai = { capabilities: () => ({ text: true, vision: false, document: false, image: false }) };
  const r = await makeRouter({ config, ai }).api('/settings/ai');
  assert.equal(r.default, 'groq');
  assert.ok(r.providers && r.providers.groq && r.providers.groq.configured === true);
  assert.equal(r.providers.groq.model, 'llama-3.3-70b-versatile');
});

// ---- /thread sidecar routes (chat-mode editor) ----
// Contract: GET of an absent id returns NULL (never 404, never a synthesized fresh
// thread — a saved turn-less thread must stay distinguishable from "never saved", or
// per-post mode memory breaks); PUT validates the body via the
// parseThread(serializeThread()) round-trip; DELETE clears. Storage mirrors the /drafts
// idiom (records keyed by id, collection 'threads'); parseThread strips the record id
// back off on read, so GET returns exactly the thread shape.
const memStorage = () => {
  const db = new Map();
  return {
    async get(store, id) { return db.get(store + '/' + id) || null; },
    async put(store, obj) { db.set(store + '/' + obj.id, obj); return obj; },
    async del(store, id) { db.delete(store + '/' + id); },
  };
};

test('thread routes: GET missing id returns null; PUT round-trips; DELETE clears', async () => {
  const { api } = makeRouter({ storage: memStorage() });
  assert.equal(await api('/thread/my-post'), null); // absent record → null, not a synthesized thread
  const t = { v: 1, mode: 'doc', turns: [{ id: 't1', role: 'aside', kind: 'guidance', text: 'x', blockRef: null, ts: 1, state: 'open' }],
    scratch: [{ id: 's1', text: 'a jot', ts: 2 }] };
  assert.deepEqual(await api('/thread/my-post', { method: 'PUT', body: JSON.stringify(t) }), { ok: true });
  assert.deepEqual(await api('/thread/my-post'), t);
  await api('/thread/my-post', { method: 'DELETE' });
  assert.equal(await api('/thread/my-post'), null);
});

// Regression (mode memory): a post toggled to Chat with ZERO turns must read back as a
// saved chat-mode thread — under the old "GET synthesizes a fresh thread" contract it
// was indistinguishable from "never saved", so the UI reopened it in Doc.
test('thread routes: a saved turn-less chat thread reads back saved (not null)', async () => {
  const { api } = makeRouter({ storage: memStorage() });
  await api('/thread/quiet-post', { method: 'PUT', body: JSON.stringify({ v: 1, mode: 'chat', turns: [] }) });
  // a pre-scratch record reads back with scratch [] (parseThread backward-compat)
  assert.deepEqual(await api('/thread/quiet-post'), { v: 1, mode: 'chat', turns: [], scratch: [] });
});

// The ai seam's text call is generateText({ system, prompt, … }) → { text } — the same
// call the /draft route's engine makes. A guidance ask (reply/aside) must come back
// insertable:false with the guide system prompt; exactly ONE model call per turn.
test('thread turn: guidance ask returns insertable:false and calls the ai seam once', async () => {
  const calls = [];
  const ai = { async generateText({ system, prompt }) { calls.push({ system, user: prompt }); return { text: 'why that angle?' }; } };
  const { api } = makeRouter({ ai });
  const res = await api('/thread/turn', { method: 'POST', body: JSON.stringify({ ask: 'reply', text: 'good?', block: { type: 'text', text: 'para' }, title: 'T' }) });
  assert.deepEqual(res, { text: 'why that angle?', insertable: false });
  assert.equal(calls.length, 1);
  assert.match(calls[0].system, /guide/i);
});

test('thread turn: tighten returns insertable:true', async () => {
  const { api } = makeRouter({ ai: { async generateText() { return { text: 'tighter.' }; } } });
  const res = await api('/thread/turn', { method: 'POST', body: JSON.stringify({ ask: 'tighten', block: { type: 'text', text: 'wordy' } }) });
  assert.deepEqual(res, { text: 'tighter.', insertable: true });
});
