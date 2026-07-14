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
