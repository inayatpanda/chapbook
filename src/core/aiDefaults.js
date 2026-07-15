// Provider → OFFLINE-default model. The Studio's Keys flow no longer asks the user to
// pick a model: paste the key, tap "Use this", and the server resolves the provider's
// LATEST sensible model (a stable "-latest" alias where one exists, else a live /models
// query + recency heuristic — see server/ai/pickLatest.js). This map is only the
// synchronous offline fallback used before that resolves, and the blank-override default
// on save. A stale value is still correctable under "Advanced — override model".
//
// Pure + dependency-free so it's unit-tested by node --test and mirrored verbatim by
// the inline copy in public/studio/index.html (the build sanity-checks they agree).
//
// These mirror server/ai/pickLatest.js `latestModelOffline()` — keep them in sync:
//   anthropic → current Claude (no "-latest" alias exists, so the offline pick is the
//               latest known stable id; live activation upgrades it)
//   google    → gemini-flash-latest (a real, stable Google alias)
//   openai    → gpt-4o (offline fallback; live activation resolves the current chat model)
//   groq      → llama-3.3-70b-versatile (offline default; Groq has no "-latest" alias)
//   ollama    → no cloud default (depends on what the user has pulled locally)
export const AI_DEFAULT_MODELS = {
  anthropic: 'claude-opus-4-8',
  openai: 'gpt-4o',
  google: 'gemini-flash-latest',
  groq: 'llama-3.3-70b-versatile',
  ollama: '',
};

// The OFFLINE default model for a provider id, or '' if none (unknown id, or a local
// provider like Ollama where the model depends on what's been pulled). Never throws.
// This is the pre-resolution placeholder/fallback; the live "latest" comes from the
// server's /settings/ai/latest-model route on activation.
export function defaultModelFor(provider) {
  const id = String(provider == null ? '' : provider).trim();
  return Object.prototype.hasOwnProperty.call(AI_DEFAULT_MODELS, id)
    ? AI_DEFAULT_MODELS[id]
    : '';
}
