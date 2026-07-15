/* Pure AI dispatch logic — no config import, no I/O. Tested with fake aiConfig + adapters. */

export function isConfigured(providerCfg, id) {
  const c = providerCfg || {};
  return id === 'ollama'
    ? !!c.baseUrl
    : !!(c.apiKey && !String(c.apiKey).startsWith('CHANGE_ME'));
}

export function resolveProvider(aiConfig, adapters, provider) {
  const id = provider || aiConfig?.default || 'anthropic';
  const adapter = adapters[id];
  if (!adapter) throw Object.assign(new Error(`Unknown AI provider: ${id}`), { code: 'AI_PROVIDER', status: 400 });
  return { id, adapter, cfg: aiConfig?.providers?.[id] || {} };
}

// Status for the client: configured booleans + chosen default + each provider's model/capabilities.
// NEVER includes the apiKey value.
export function buildStatus(aiConfig, adapters) {
  const providers = {};
  for (const id of Object.keys(adapters)) {
    const c = aiConfig?.providers?.[id] || {};
    const caps = adapters[id].capabilities || {};
    providers[id] = {
      configured: isConfigured(c, id),
      model: c.model || adapters[id].DEFAULT_MODEL,
      // enumerate only known-safe capability keys — never spread an adapter object toward the client
      capabilities: { text: !!caps.text, vision: !!caps.vision, document: !!caps.document, image: !!caps.image },
      ...(id === 'ollama' ? { baseUrl: c.baseUrl || '' } : {}),
    };
  }
  return { default: aiConfig?.default || 'anthropic', providers };
}

// PURE — does this thrown adapter error mean the requested model no longer exists (the
// provider retired or renamed it)? This is the trigger for mid-use auto-heal, so it must be
// TIGHT: auth (401), quota/rate-limit (429), overload (503) and refusals must NOT classify as
// dead-model (retrying those with a different model would be wrong). Reads the fields each
// adapter's `call()` attaches to the error (HTTP status + the provider's own error code/type/
// status). Total: absent/unknown fields → false, so a normal error never mis-fires.
//   • Groq   — 400 code "model_decommissioned"; 404 code "model_not_found"
//   • OpenAI — 400/404 code "model_not_found"
//   • Anthropic — 404 type "not_found_error" whose message actually names the model
//   • Gemini — 404 google-status "NOT_FOUND" for a model resource
export function isDeadModelError(err) {
  if (!err || typeof err !== 'object') return false;
  const status = Number(err.status) || 0;
  const code = String(err.providerCode == null ? '' : err.providerCode).toLowerCase();
  const type = String(err.providerType == null ? '' : err.providerType).toLowerCase();
  const gStatus = String(err.providerStatus == null ? '' : err.providerStatus).toUpperCase();
  const msg = String(err.message == null ? '' : err.message).toLowerCase();
  const model = String(err.model == null ? '' : err.model).toLowerCase();
  // Groq / OpenAI — explicit machine codes. Groq decommissions with 400, unknown ids 404;
  // OpenAI uses either. The code is unambiguous, so it stands on its own regardless of status.
  if (code === 'model_decommissioned') return true;
  if (code === 'model_not_found') return true;
  // Anthropic — a 404 not_found_error that actually mentions the requested model (a not-found
  // on some OTHER resource, e.g. a bad endpoint, must not trigger a model switch).
  if (status === 404 && type === 'not_found_error' && model && msg.includes(model)) return true;
  // Gemini — a 404 whose google status is NOT_FOUND, for a models/… resource.
  if (status === 404 && gStatus === 'NOT_FOUND' && /model/.test(msg)) return true;
  return false;
}

// Apply a write-only settings patch. Mutates + returns aiConfig. Blank apiKey strings are IGNORED
// (so the client clearing a field never wipes a stored key — keys are write-only).
export function applyProviderPatch(aiConfig, adapters, patch = {}) {
  aiConfig.providers = aiConfig.providers || {};
  if (patch.default && adapters[patch.default]) aiConfig.default = patch.default;
  for (const [id, p] of Object.entries(patch.providers || {})) {
    if (!adapters[id] || !p) continue;
    aiConfig.providers[id] = aiConfig.providers[id] || {};
    if (typeof p.apiKey === 'string' && p.apiKey.trim()) aiConfig.providers[id].apiKey = p.apiKey.trim();
    if (typeof p.model === 'string') aiConfig.providers[id].model = p.model.trim();
    if (typeof p.baseUrl === 'string') aiConfig.providers[id].baseUrl = p.baseUrl.trim();
  }
  return aiConfig;
}
