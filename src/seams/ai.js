// AI seam — browser-direct calls to the user's provider, reusing the existing (pure-ish)
// adapters' request build/parse. Key + provider come from the config seam. Ollama dropped.
import * as anthropic from '../lib/ai/anthropic.js';
import * as openai from '../lib/ai/openai.js';
import * as google from '../lib/ai/google.js';
import * as groq from '../lib/ai/groq.js';

const ADAPTERS = { anthropic, openai, google, groq };

export function makeAi(cfg, fetchImpl = fetch) {
  // Anthropic requires an explicit opt-in header for direct browser use; add it transparently.
  const browserFetch = (url, opts = {}) => {
    const headers = { ...(opts.headers || {}) };
    if (String(url).includes('api.anthropic.com')) headers['anthropic-dangerous-direct-browser-access'] = 'true';
    return fetchImpl(url, { ...opts, headers });
  };
  const pick = () => { const a = cfg.getAi(); return { adapter: ADAPTERS[a.provider] || anthropic, a }; };
  return {
    async generateText({ system, prompt, maxTokens, json, effort }) {
      const { adapter, a } = pick();
      return adapter.generateText({ system, prompt, maxTokens, json, effort, model: a.model || adapter.DEFAULT_MODEL, key: a.key }, browserFetch);
    },
    async describeImage({ prompt, imageBase64, mimeType, maxTokens }) {
      const { adapter, a } = pick();
      if (!adapter.capabilities?.vision) throw Object.assign(new Error(`${a.provider} cannot read images`), { code: 'AI_CAP' });
      return adapter.describeImage({ prompt, imageBase64, mimeType, maxTokens, model: a.model || adapter.DEFAULT_MODEL, key: a.key }, browserFetch);
    },
    async generateImage({ prompt, size }) {
      const { adapter, a } = pick();
      if (!adapter.capabilities?.image) throw Object.assign(new Error(`${a.provider} cannot generate images`), { code: 'AI_CAP' });
      return adapter.generateImage({ prompt, size, model: a.model || adapter.DEFAULT_MODEL, key: a.key }, browserFetch);
    },
  };
}
