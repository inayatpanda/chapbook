import { looseJson } from './_json.js';
import { pickLatestFromList, latestModelOffline } from './pickLatest.js';
/* Anthropic Messages API adapter — raw HTTP, no SDK.
   Confirmed shapes (claude-api skill, 2026-06-13). See the Phase 1B plan. */

export const capabilities = { text: true, vision: true, document: true, image: false };
export const DEFAULT_MODEL = 'claude-opus-4-8';

const ENDPOINT = 'https://api.anthropic.com/v1/messages';
const headers = (key) => ({
  'content-type': 'application/json',
  'x-api-key': key,
  'anthropic-version': '2023-06-01',
});

// Fable/Mythos: `thinking` must NOT be configured (always-on; an explicit value 400s),
// but `output_config.effort` IS the supported depth control and is safe to send.
// Everyone else opts into adaptive thinking only when an effort is requested.
function thinkingFor(model, effort) {
  const out = {};
  const isFable = /^claude-(fable|mythos)-/.test(model);
  if (effort) out.output_config = { effort };
  if (!isFable && effort) out.thinking = { type: 'adaptive' };
  return out;
}

export function buildText({ system, prompt, maxTokens, model, key, json, effort }) {
  const body = {
    model: model || DEFAULT_MODEL,
    max_tokens: maxTokens ?? 4000,
    ...(system ? { system } : {}),
    messages: [{ role: 'user', content: prompt }],
    ...thinkingFor(model || DEFAULT_MODEL, effort),
  };
  if (json) body.output_config = { ...(body.output_config || {}), format: { type: 'json_schema', schema: json } };
  return { url: ENDPOINT, headers: headers(key), body: JSON.stringify(body) };
}

export function buildVision({ system, prompt, imageBase64, mimeType, maxTokens, model, key }) {
  const body = {
    model: model || DEFAULT_MODEL,
    max_tokens: maxTokens ?? 300,
    ...(system ? { system } : {}),
    messages: [{ role: 'user', content: [
      { type: 'image', source: { type: 'base64', media_type: mimeType || 'image/jpeg', data: imageBase64 } },
      { type: 'text', text: prompt },
    ] }],
  };
  return { url: ENDPOINT, headers: headers(key), body: JSON.stringify(body) };
}

export function parseText(json) {
  if (json?.stop_reason === 'refusal') throw Object.assign(new Error('Anthropic declined this request (refusal).'), { code: 'AI_REFUSAL' });
  const text = (json?.content || []).filter((b) => b.type === 'text').map((b) => b.text || '').join('').trim();
  if (json?.stop_reason === 'max_tokens') return text; // caller may note truncation
  return text;
}

async function call(built, fetchImpl = fetch) {
  const res = await fetchImpl(built.url, { method: 'POST', headers: built.headers, body: built.body });
  // Read the body as text first: error responses from proxies/CDNs (502/504) are often
  // HTML, so res.json() would throw a bare SyntaxError and lose the HTTP status.
  const raw = await res.text();
  let json = null;
  try { json = raw ? JSON.parse(raw) : {}; } catch { /* non-JSON body */ }
  if (!res.ok) throw Object.assign(new Error(json?.error?.message || `Anthropic API ${res.status}`), { code: 'AI_HTTP', status: res.status });
  if (json === null) throw Object.assign(new Error(`Anthropic returned a non-JSON response (HTTP ${res.status}).`), { code: 'AI_HTTP', status: res.status });
  return json;
}

export async function readDocument({ system, instruction, fileBase64, mimeType, json, model, key, baseUrl }, fetchImpl = fetch) {
  const isPdf = mimeType === 'application/pdf';
  const docBlock = isPdf
    ? { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: fileBase64 } }
    : { type: 'image', source: { type: 'base64', media_type: mimeType, data: fileBase64 } };
  const body = {
    model: model || DEFAULT_MODEL,
    max_tokens: 4000,
    ...(system ? { system } : {}),
    messages: [{ role: 'user', content: [docBlock, { type: 'text', text: instruction }] }],
  };
  if (json) body.output_config = { format: { type: 'json_schema', schema: json } };
  const built = { url: ENDPOINT, headers: headers(key), body: JSON.stringify(body) };
  const raw_json = await call(built, fetchImpl);
  const text = parseText(raw_json);
  if (!json) return { text };
  try { return { text, json: looseJson(text) }; }
  catch { throw Object.assign(new Error(`AI returned non-JSON output: ${text.slice(0, 120)}`), { code: 'AI_PARSE', text }); }
}

export async function generateImage(_opts, _fetchImpl = fetch) {
  throw Object.assign(new Error('Anthropic does not generate images'), { code: 'AI_CAP', status: 400 });
}

// Re-ask for JSON via the prompt instead of output_config.format. Anthropic's structured
// output rejects schemas with additionalProperties:true or >24 optional params (HTTP 400) —
// too strict for the composer's variable block/param/interactive schemas. The prompt-for-JSON
// path has no such limit; looseJson tolerates fences/preamble.
function buildTextPromptJson(opts) {
  const hint = `\n\nReturn ONLY a JSON object conforming to this JSON Schema — no prose, no markdown fences:\n${JSON.stringify(opts.json)}`;
  return buildText({ ...opts, json: undefined, prompt: `${opts.prompt || ''}${hint}` });
}

export async function generateText(opts, fetchImpl) {
  if (!opts.json) return { text: parseText(await call(buildText(opts), fetchImpl)) };

  // Prefer native structured output. Fall back to prompt-for-JSON only when the schema is
  // rejected (400) or the strict output won't parse — auth/overload/refusal still surface.
  let nativeText = null;
  try { nativeText = parseText(await call(buildText(opts), fetchImpl)); }
  catch (e) { if (e.status !== 400) throw e; /* schema too complex → fall through */ }
  if (nativeText != null) {
    try { return { text: nativeText, json: looseJson(nativeText) }; }
    catch { /* unexpectedly unparseable strict output → try prompt-for-JSON */ }
  }
  const text = parseText(await call(buildTextPromptJson(opts), fetchImpl));
  try { return { text, json: looseJson(text) }; }
  catch { throw Object.assign(new Error(`AI returned non-JSON output: ${text.slice(0, 120)}`), { code: 'AI_PARSE', text }); }
}

export async function describeImage(opts, fetchImpl) {
  return { text: parseText(await call(buildVision(opts), fetchImpl)) };
}

export function parseModels(json) {
  return [...new Set((json.data || []).map((m) => m.id).filter(Boolean))].sort();
}

// Raw entries (keeping `created_at`) so pick-latest can order by true release recency.
// Anthropic publishes NO "-latest" text alias, so the live list is the only way to learn
// the current model — its dated aliases (claude-sonnet-4-6, …) bake in the version.
function parseModelsRaw(json) {
  return (json.data || [])
    .filter((m) => m && m.id)
    .map((m) => ({ id: m.id, created_at: m.created_at }));
}

async function fetchModelsJson({ key }, fetchImpl) {
  const url = 'https://api.anthropic.com/v1/models?limit=1000';
  const hdrs = { 'x-api-key': key, 'anthropic-version': '2023-06-01' };
  const res = await fetchImpl(url, { method: 'GET', headers: hdrs });
  const raw = await res.text();
  let json = null;
  try { json = raw ? JSON.parse(raw) : {}; } catch { /* non-JSON body */ }
  if (!res.ok) throw Object.assign(new Error(json?.error?.message || `Anthropic API ${res.status}`), { code: 'AI_HTTP', status: res.status });
  if (json === null) throw Object.assign(new Error(`Anthropic returned a non-JSON response (HTTP ${res.status}).`), { code: 'AI_HTTP', status: res.status });
  return json;
}

export async function listModels(opts = {}, fetchImpl = fetch) {
  return parseModels(await fetchModelsJson(opts, fetchImpl));
}

export async function listModelsRaw(opts = {}, fetchImpl = fetch) {
  return parseModelsRaw(await fetchModelsJson(opts, fetchImpl));
}

// Resolve the latest sensible TEXT model with no explicit override: query the live list
// and pick the newest Claude chat model (Sonnet/Opus/Haiku, newest by created_at).
// No alias to lean on, so a failed/offline query degrades to SAFE_DEFAULT (claude-opus-4-8).
export async function resolveLatestModel(opts = {}, fetchImpl = fetch) {
  try {
    const picked = pickLatestFromList('anthropic', await listModelsRaw(opts, fetchImpl));
    if (picked) return picked;
  } catch { /* offline / no key → fall through */ }
  return latestModelOffline('anthropic');
}
