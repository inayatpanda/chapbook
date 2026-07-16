/* Pure "pick the latest sensible TEXT model" heuristics — no I/O, no config, no fetch.
   Tested with node --test (server/ai/pickLatest.test.mjs).

   WHY this exists: hardcoded model-version strings go stale. `gemini-2.0-flash`
   already 404s; OpenAI retired `gpt-4o` / `chatgpt-4o-latest` (Feb 2026). So when a
   provider is activated with no explicit override, we resolve the latest sensible TEXT
   model — preferring a provider-maintained stable "-latest" alias, else querying the
   live model list and picking the newest capable general model.

   Two layers, both pure:
     • LATEST_ALIAS[provider]  — the stable alias to prefer when the provider maintains one.
     • pickLatestFromList(provider, rawModels) — the dynamic fallback heuristic over a
       provider's raw /models array (the shapes each adapter's listModelsRaw returns). */

// Provider-maintained stable "always-latest" aliases. Prefer these when present —
// they resolve server-side to the current model and never 404 on a version bump.
//   google → gemini-flash-latest  (verified: resolves to the current fast Gemini today)
// Anthropic and OpenAI deliberately have NO entry: Anthropic publishes no "-latest"
// text alias at all (its dated aliases like claude-sonnet-4-6 bake in the version), and
// OpenAI's chat-latest aliases have proven unstable (chatgpt-4o-latest was removed).
// For those two we always resolve via the live list (pickLatestFromList) and only fall
// back to SAFE_DEFAULT if the query fails.
export const LATEST_ALIAS = {
  google: 'gemini-flash-latest',
};

// Last-resort default per provider when BOTH the alias is absent AND the live query
// fails (offline, no key yet). Never 404s today; kept current. Ollama is user-specified.
export const SAFE_DEFAULT = {
  anthropic: 'claude-opus-4-8',
  openai: 'gpt-4o',
  google: 'gemini-flash-latest',
  // Groq has no "-latest" alias, so activation resolves the newest chat model from the live
  // list (pickLatestFromList) and only falls back to this known-current id offline.
  groq: 'llama-3.3-70b-versatile',
  ollama: '',
};

// Substrings that disqualify a model from being a general TEXT pick, per concern.
// Matched case-insensitively against the model id.
const EXCLUDE = [
  // non-text modalities / specialised heads
  'image', 'imagen', 'vision', 'tts', 'audio', 'speech', 'whisper', 'realtime',
  'embedding', 'embed', 'moderation', 'rerank', 'guard', 'transcribe',
  'dall-e', 'dalle', 'sora', 'veo', 'aqa', 'gemma',
  // Groq-specific non-chat heads: 'orpheus' is a TTS family (canopylabs/orpheus-*) and
  // 'compound' is an agentic wrapper (groq/compound[-mini]) — neither is a plain chat model,
  // so an auto-pick must never land on them.
  'orpheus', 'compound',
  // Reasoning-first models leak <think>/analysis into the text (see stripThink) and burn the
  // budget mid-reasoning — auto-pick must skip them even when the base name contains a
  // whitelisted family (e.g. Groq's `deepseek-r1-distill-llama-70b` matches 'llama').
  'deepseek', 'distill', 'r1-', '-r1',
  // previews / experiments / dated snapshots we don't want as the default
  'preview', 'experimental', '-exp', 'nightly', 'thinking', 'search',
];

// Generation-family hints — a model whose id contains one of these is a "general chat"
// model and is preferred over anything that matches none. Order is irrelevant; presence
// is what matters. (Fast general families first, then capable ones.)
const PREFERRED_HINTS = {
  anthropic: ['sonnet', 'opus', 'haiku', 'claude'],
  openai: ['gpt', 'chatgpt', 'o4', 'o3'],
  google: ['flash', 'pro', 'gemini'],
  // Groq serves open chat models from several families — whitelist ONLY plain-instruct ones
  // so a pick can't wander onto a specialised id (the Arabic-only allam-*, or anything the
  // EXCLUDE list above screens out: whisper/guard/orpheus/compound). Qwen and gpt-oss are
  // deliberately ABSENT: they are reasoning-first families that leak <think>/analysis
  // scaffolding into the text (live e2e 2026-07-15: an auto-healed qwen3.6 burned the whole
  // token budget inside <think> and returned no answer). Users can still type them manually.
  groq: ['llama', 'mixtral'],
  ollama: [],
};

const lc = (s) => String(s == null ? '' : s).toLowerCase();

// Is this id a sensible general TEXT model for `provider`? Excludes other modalities,
// previews, experiments, and (for OpenAI/Anthropic) requires a known chat family hint
// so we never pick e.g. a bare fine-tune or an unrelated product id.
export function isTextModel(provider, id) {
  const s = lc(id);
  if (!s) return false;
  if (EXCLUDE.some((bad) => s.includes(bad))) return false;
  const hints = PREFERRED_HINTS[provider] || [];
  if (hints.length && !hints.some((h) => s.includes(h))) return false;
  return true;
}

// Extract a comparable recency key from a raw model entry. OpenAI uses `created`
// (Unix seconds), Anthropic uses `created_at` (ISO string). Returns a number (ms or s,
// only relative ordering matters) or null when no timestamp is present (Google's list
// carries none — we fall back to version-number ordering there).
function recencyOf(m) {
  if (m == null || typeof m !== 'object') return null;
  if (typeof m.created === 'number') return m.created;
  if (typeof m.created_at === 'string') {
    const t = Date.parse(m.created_at);
    return Number.isNaN(t) ? null : t;
  }
  return null;
}

// Pull the bare model id out of a raw entry (OpenAI/Anthropic: `id`; Google: `name`
// like "models/gemini-flash-latest"). Returns '' when absent.
function idOf(m) {
  if (m == null || typeof m !== 'object') return '';
  if (typeof m.id === 'string') return m.id;
  if (typeof m.name === 'string') return m.name.replace(/^models\//, '');
  return '';
}

// Highest dotted/dashed version number embedded in an id, as a comparable array of ints.
// "gemini-3.5-flash" → [3,5]; "gpt-4o" → [4]; "claude-opus-4-8" → [4,8]. Used to break
// ties / order when no timestamp is available (Google).
function versionKey(id) {
  const nums = (lc(id).match(/\d+/g) || []).map((n) => parseInt(n, 10));
  return nums.length ? nums : [-1];
}

function cmpVersion(a, b) {
  const av = versionKey(a);
  const bv = versionKey(b);
  const n = Math.max(av.length, bv.length);
  for (let i = 0; i < n; i++) {
    const d = (av[i] || 0) - (bv[i] || 0);
    if (d) return d;
  }
  return 0;
}

/**
 * Given a provider id and the raw model-list array from that provider's API, return the
 * id of the newest sensible general TEXT model — or '' if none qualifies (caller then
 * falls back to the alias / SAFE_DEFAULT). Pure and total: never throws.
 *
 * Ranking: filter to text models, then order by live timestamp (newest first) when the
 * entries carry one, otherwise by embedded version number (highest first). Among equal
 * keys, the shorter id wins (prefers the clean alias over a dated snapshot duplicate).
 */
export function pickLatestFromList(provider, rawModels) {
  const list = Array.isArray(rawModels) ? rawModels : [];
  const candidates = [];
  for (const m of list) {
    const id = idOf(m);
    if (!isTextModel(provider, id)) continue;
    candidates.push({ id, recency: recencyOf(m) });
  }
  if (!candidates.length) return '';

  // Prefer a provider's stable "-latest" alias if the live list actually contains it.
  const alias = LATEST_ALIAS[provider];
  if (alias && candidates.some((c) => c.id === alias)) return alias;

  const haveTimestamps = candidates.some((c) => c.recency != null);
  candidates.sort((a, b) => {
    if (haveTimestamps) {
      // Order purely by recency; only when timestamps tie do we prefer the cleaner id.
      // (Don't fall through to version-number ordering here — a dated snapshot like
      // "gpt-5.5-2026-04-23" carries MORE numbers than "gpt-5.5" and would otherwise win.)
      const d = (b.recency ?? -Infinity) - (a.recency ?? -Infinity);
      if (d) return d;
      return a.id.length - b.id.length; // clean alias before dated-snapshot duplicate
    }
    const v = cmpVersion(b.id, a.id); // no timestamps (Google): order by version number
    if (v) return v;
    return a.id.length - b.id.length;
  });
  return candidates[0].id;
}

/**
 * Resolve the latest model id for a provider WITHOUT a live query — the pure, offline
 * answer. Returns the provider's stable alias when it has one, else its SAFE_DEFAULT.
 * Used as the graceful fallback when the live model-list query is unavailable, and as
 * the synchronous default the Studio/config layers seed before any key is present.
 */
export function latestModelOffline(provider) {
  const id = String(provider == null ? '' : provider).trim();
  if (Object.prototype.hasOwnProperty.call(LATEST_ALIAS, id)) return LATEST_ALIAS[id];
  return Object.prototype.hasOwnProperty.call(SAFE_DEFAULT, id) ? SAFE_DEFAULT[id] : '';
}
