import { config, saveConfig } from '../config.js';
import * as anthropic from './anthropic.js';
import * as openai from './openai.js';
import * as google from './google.js';
import * as ollama from './ollama.js';
import * as groq from './groq.js';
import { isConfigured, resolveProvider, buildStatus, applyProviderPatch } from './dispatch.js';

const ADAPTERS = { anthropic, openai, google, ollama, groq };

function requireConfigured(id, cfg) {
  if (!isConfigured(cfg, id)) {
    throw Object.assign(new Error(`No ${id} key configured — add it in Settings → AI.`), { code: 'AI_NO_KEY', status: 503 });
  }
}

// Text generation resolves through the FALLBACK CHAIN when one is configured
// (config.ai.chain = [{ provider, model? }, …]): try each provider in order, skip any with
// no key, move to the next on ANY error, and surface the last error only if all fail. This
// is how the owner runs "Groq primary → Gemini backup → Haiku last". When no chain is set,
// behaviour is unchanged — the request's provider (or ai.default) is used, single attempt.
// The chain governs TEXT only; vision/document/image tasks still resolve a single provider.
export async function generateText({ provider, system, prompt, maxTokens, json, effort, chain: chainName } = {}) {
  const opts = { system, prompt, maxTokens, json, effort };
  // A NAMED chain (config.ai.chains[chainName]) lets specific tasks use a different fallback
  // order — e.g. interactive HTML/widget generation leads with a stronger coder than the cheap
  // default. Falls back to the global chain, then to a single provider (or ai.default).
  const named = chainName && config.ai?.chains && config.ai.chains[chainName];
  const chain = (Array.isArray(named) && named.length) ? named
    : (Array.isArray(config.ai?.chain) && config.ai.chain.length ? config.ai.chain : [{ provider }]);
  let lastErr = null;
  for (const step of chain) {
    let resolved;
    try { resolved = resolveProvider(config.ai, ADAPTERS, step.provider); }
    catch (e) { lastErr = e; continue; }                       // unknown provider id → skip
    const { id, adapter, cfg } = resolved;
    if (!isConfigured(cfg, id)) {                              // no key → skip to next in chain
      lastErr = lastErr || Object.assign(new Error(`No ${id} key configured — add it in Settings → AI.`), { code: 'AI_NO_KEY', status: 503 });
      continue;
    }
    try {
      return await adapter.generateText({ ...opts,
        model: step.model || cfg.model || adapter.DEFAULT_MODEL, key: cfg.apiKey, baseUrl: cfg.baseUrl });
    } catch (e) { lastErr = e; }                               // this provider failed → try next
  }
  throw lastErr || Object.assign(new Error('No AI provider configured — add a key in Settings → AI.'), { code: 'AI_NO_KEY', status: 503 });
}

export async function describeImage({ provider, prompt, imageBase64, mimeType, maxTokens } = {}) {
  const { id, adapter, cfg } = resolveProvider(config.ai, ADAPTERS, provider);
  requireConfigured(id, cfg);
  if (!adapter.capabilities.vision) throw Object.assign(new Error(`${id} cannot read images.`), { code: 'AI_CAP', status: 400 });
  return adapter.describeImage({ prompt, imageBase64, mimeType, maxTokens,
    model: cfg.model || adapter.DEFAULT_MODEL, key: cfg.apiKey, baseUrl: cfg.baseUrl });
}

export async function readDocument({ provider, system, instruction, fileBase64, mimeType, json } = {}) {
  const { id, adapter, cfg } = resolveProvider(config.ai, ADAPTERS, provider);
  requireConfigured(id, cfg);
  const caps = adapter.capabilities;
  if (!caps.document && !caps.vision) {
    throw Object.assign(new Error(`${id} cannot read documents or images.`), { code: 'AI_CAP', status: 400 });
  }
  return adapter.readDocument({ system, instruction, fileBase64, mimeType, json,
    model: cfg.model || adapter.DEFAULT_MODEL, key: cfg.apiKey, baseUrl: cfg.baseUrl });
}

export async function generateImage({ provider, prompt, size } = {}) {
  const { id, adapter, cfg } = resolveProvider(config.ai, ADAPTERS, provider);
  requireConfigured(id, cfg);
  if (!adapter.capabilities.image) {
    throw Object.assign(new Error(`${id} cannot generate images.`), { code: 'AI_CAP', status: 400 });
  }
  return adapter.generateImage({ prompt, size,
    model: cfg.model || adapter.DEFAULT_MODEL, key: cfg.apiKey, baseUrl: cfg.baseUrl });
}

export function providerStatus() { return buildStatus(config.ai, ADAPTERS); }

export function setProviderConfig(patch = {}) {
  config.ai = config.ai || { default: 'anthropic', providers: {} };
  applyProviderPatch(config.ai, ADAPTERS, patch);
  saveConfig();
  return providerStatus();
}

export async function listModels(provider) {
  const { id, adapter, cfg } = resolveProvider(config.ai, ADAPTERS, provider);
  requireConfigured(id, cfg);
  if (typeof adapter.listModels !== 'function') return [];
  return adapter.listModels({ key: cfg.apiKey, baseUrl: cfg.baseUrl });
}

// Resolve the provider's LATEST sensible text model — alias fast-path for providers that
// maintain one (Google), else a live /models query + recency heuristic, else a graceful
// offline default. Used when activating a provider with no explicit override so we never
// pin a stale hardcoded version (the original bug: gemini-2.0-flash 404'd). Never throws:
// an unconfigured/unknown provider returns ''. The "Advanced — override model" field, when
// set, is applied by setProviderConfig and always wins over this.
export async function resolveLatestModel(provider) {
  const { id, adapter, cfg } = resolveProvider(config.ai, ADAPTERS, provider);
  if (typeof adapter.resolveLatestModel !== 'function') return '';
  // No key yet → still return the provider's best offline guess (alias / safe default)
  // rather than failing: activation must never break.
  return adapter.resolveLatestModel({ key: cfg.apiKey, baseUrl: cfg.baseUrl });
}

export { ADAPTERS };
