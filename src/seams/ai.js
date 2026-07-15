// AI seam — browser-direct calls to the user's provider, reusing the existing (pure-ish)
// adapters' request build/parse. Key + provider come from the config seam. Ollama dropped.
import * as anthropic from '../lib/ai/anthropic.js';
import * as openai from '../lib/ai/openai.js';
import * as google from '../lib/ai/google.js';
import * as groq from '../lib/ai/groq.js';
import { isDeadModelError } from '../lib/ai/dispatch.js';
import { pickLatestFromList } from '../lib/ai/pickLatest.js';

const ADAPTERS = { anthropic, openai, google, groq };

export function makeAi(cfg, fetchImpl = fetch, { timeoutMs = 120_000 } = {}) {
  // Anthropic requires an explicit opt-in header for direct browser use; add it transparently.
  // Every provider call is also bounded by timeoutMs: without it a stalled request (live e2e:
  // a free-tier Gemini generateContent hung >2.5min) left the UI on "…thinking" FOREVER with
  // no error and no way to retry. On abort we throw a classified AI_TIMEOUT the UI can show;
  // isDeadModelError() is false for it, so the heal path never mistakes a stall for a
  // retired model.
  const browserFetch = (url, opts = {}) => {
    const headers = { ...(opts.headers || {}) };
    if (String(url).includes('api.anthropic.com')) headers['anthropic-dangerous-direct-browser-access'] = 'true';
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), timeoutMs);
    return fetchImpl(url, { ...opts, headers, signal: ctl.signal })
      .catch((err) => {
        if (ctl.signal.aborted) throw Object.assign(new Error('The AI provider took too long to respond — try again.'), { code: 'AI_TIMEOUT' });
        throw err;
      })
      .finally(() => clearTimeout(timer));
  };
  const pick = () => { const a = cfg.getAi(); return { adapter: ADAPTERS[a.provider] || anthropic, a }; };

  // Mid-use auto-heal (Layer 3): a request just failed. If it failed because the provider
  // RETIRED the configured model (isDeadModelError), fetch the provider's live list, pick the
  // newest sensible chat model, PERSIST it (so every later call self-heals too), announce the
  // switch via a 'studio:model-switched' window event (the UI toasts it), and return the new
  // id so the caller can retry ONCE. Returns '' for anything else — the original error stands.
  // Never loops: a resolution that fails, is unavailable, or repeats the same dead id → ''.
  async function recoverDeadModel(err, { provider, adapter, key, model }) {
    if (err && typeof err === 'object') { err.provider = err.provider || provider; err.model = err.model || model; }
    if (!isDeadModelError(err)) return '';
    if (typeof adapter.listModelsRaw !== 'function') return '';
    let next = '';
    try { next = pickLatestFromList(provider, await adapter.listModelsRaw({ key }, browserFetch)); }
    catch { return ''; }
    if (!next || next === model) return '';
    try { cfg.save({ aiProvider: provider, aiModel: next }); } catch { /* storage full → still retry in-memory */ }
    try {
      if (typeof window !== 'undefined' && window.dispatchEvent)
        window.dispatchEvent(new CustomEvent('studio:model-switched', { detail: { provider, from: model, to: next } }));
    } catch { /* non-browser (tests) → no event */ }
    return next;
  }

  // Run an adapter call that takes a model; on a dead-model failure, heal + retry exactly once.
  async function runHealing(makeCall, { provider, adapter, key, model }) {
    try { return await makeCall(model); }
    catch (err) {
      const next = await recoverDeadModel(err, { provider, adapter, key, model });
      if (!next) throw err;
      return makeCall(next); // single retry with the healed model — no further recovery
    }
  }

  return {
    async generateText({ system, prompt, maxTokens, json, effort }) {
      const { adapter, a } = pick();
      const model = a.model || adapter.DEFAULT_MODEL;
      return runHealing((m) => adapter.generateText({ system, prompt, maxTokens, json, effort, model: m, key: a.key }, browserFetch),
        { provider: a.provider, adapter, key: a.key, model });
    },
    async describeImage({ prompt, imageBase64, mimeType, maxTokens }) {
      const { adapter, a } = pick();
      if (!adapter.capabilities?.vision) throw Object.assign(new Error(`${a.provider} cannot read images`), { code: 'AI_CAP' });
      const model = a.model || adapter.DEFAULT_MODEL;
      return runHealing((m) => adapter.describeImage({ prompt, imageBase64, mimeType, maxTokens, model: m, key: a.key }, browserFetch),
        { provider: a.provider, adapter, key: a.key, model });
    },
    async generateImage({ prompt, size }) {
      const { adapter, a } = pick();
      if (!adapter.capabilities?.image) throw Object.assign(new Error(`${a.provider} cannot generate images`), { code: 'AI_CAP' });
      return adapter.generateImage({ prompt, size, model: a.model || adapter.DEFAULT_MODEL, key: a.key }, browserFetch);
    },
    // Document import (PDF / image → structured blocks). studio.importDocument calls this;
    // it was missing here, so /ai/read-document threw "ai.readDocument is not a function"
    // and the live "Import document" feature broke for every provider. Delegate to the
    // adapter (all three offered providers implement readDocument); a provider without it
    // (e.g. Groq) gets a clean AI_CAP message the UI routes to Settings, not a raw TypeError.
    async readDocument({ system, instruction, fileBase64, mimeType, json }) {
      const { adapter, a } = pick();
      if (typeof adapter.readDocument !== 'function') throw Object.assign(new Error(`${a.provider} cannot read documents — use a provider that supports document import (e.g. Anthropic or Gemini).`), { code: 'AI_CAP' });
      const model = a.model || adapter.DEFAULT_MODEL;
      return runHealing((m) => adapter.readDocument({ system, instruction, fileBase64, mimeType, json, model: m, key: a.key }, browserFetch),
        { provider: a.provider, adapter, key: a.key, model });
    },
    // The current provider's declared capabilities ({ text, vision, document, image }).
    // The router surfaces this in GET /settings/ai so the composer can gate capability-
    // dependent buttons (e.g. ✦ Generate image) exactly as it did against the old server.
    capabilities() { const { adapter } = pick(); return adapter.capabilities || {}; },

    // Layer 1 — live model list for the Settings "↻ refresh models" datalist. Uses the
    // stored key, which BYOK holds only for the ACTIVE provider, so listing a different
    // provider (no key) returns [] gracefully rather than firing a doomed 401. Never throws:
    // the router wraps this as { models } and loadModels() reads r.models||[].
    async listModels(provider) {
      const a = cfg.getAi();
      const id = provider || a.provider;
      const adapter = ADAPTERS[id];
      if (!adapter || typeof adapter.listModels !== 'function') return [];
      const key = (id === a.provider) ? a.key : '';
      if (!key) return [];
      return adapter.listModels({ key }, browserFetch);
    },
    // Layer 1 — resolve the provider's LATEST sensible chat model (stable alias / live query /
    // offline default) so activation pins a current id instead of a stale hardcoded one. The
    // adapter's resolveLatestModel never throws (a missing key / offline degrades to the
    // offline default), so this always yields a usable id or '' for an unknown provider.
    async resolveLatestModel(provider) {
      const a = cfg.getAi();
      const id = provider || a.provider;
      const adapter = ADAPTERS[id];
      if (!adapter || typeof adapter.resolveLatestModel !== 'function') return '';
      const key = (id === a.provider) ? a.key : '';
      return adapter.resolveLatestModel({ key }, browserFetch);
    },
  };
}
