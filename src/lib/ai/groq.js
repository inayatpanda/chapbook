import { looseJson } from './_json.js';
/* Groq adapter — OpenAI-compatible Chat Completions over raw HTTP, no SDK.
   Groq serves open models (Llama, etc.) very fast and cheap, with a generous free tier;
   its API mirrors OpenAI's /chat/completions, so this mirrors the OpenAI adapter's
   build/parse contract. TEXT ONLY here (drafting/goblin) — not vision/documents/images. */

export const capabilities = { text: true, vision: false, document: false, image: false };
export const DEFAULT_MODEL = 'llama-3.3-70b-versatile';

const BASE = 'https://api.groq.com/openai/v1';
const ENDPOINT = `${BASE}/chat/completions`;
const headers = (key) => ({
  'content-type': 'application/json',
  'Authorization': 'Bearer ' + key,
});

// JSON output: Groq supports OpenAI's response_format {type:"json_object"} broadly, but
// json_schema strict mode is model-dependent — so we ask for a JSON object AND embed the
// schema in the prompt, then parse leniently (looseJson tolerates fences/preamble). Works
// on any Groq chat model without relying on strict-schema support.
export function buildText({ system, prompt, maxTokens, model, key, json }) {
  const userPrompt = json
    ? `${prompt || ''}\n\nReturn ONLY a JSON object conforming to this JSON Schema — no prose, no markdown fences:\n${JSON.stringify(json)}`
    : prompt;
  const body = {
    model: model || DEFAULT_MODEL,
    messages: [
      ...(system ? [{ role: 'system', content: system }] : []),
      { role: 'user', content: userPrompt },
    ],
    max_tokens: maxTokens ?? 4000,
  };
  if (json) body.response_format = { type: 'json_object' };
  return { url: ENDPOINT, headers: headers(key), body: JSON.stringify(body) };
}

export function parseText(json) {
  if (json?.choices?.[0]?.finish_reason === 'content_filter') throw Object.assign(new Error('Groq declined this request (content_filter).'), { code: 'AI_REFUSAL' });
  return (json?.choices?.[0]?.message?.content || '').trim();
}

async function call(built, fetchImpl = fetch) {
  const res = await fetchImpl(built.url, { method: 'POST', headers: built.headers, body: built.body });
  // Read the body as text first: error responses from proxies/CDNs (502/504) are often
  // HTML, so res.json() would throw a bare SyntaxError and lose the HTTP status.
  const raw = await res.text();
  let json = null;
  try { json = raw ? JSON.parse(raw) : {}; } catch { /* non-JSON body */ }
  if (!res.ok) throw Object.assign(new Error(json?.error?.message || `Groq API ${res.status}`), { code: 'AI_HTTP', status: res.status });
  if (json === null) throw Object.assign(new Error(`Groq returned a non-JSON response (HTTP ${res.status}).`), { code: 'AI_HTTP', status: res.status });
  return json;
}

export async function generateText(opts, fetchImpl) {
  const json = await call(buildText(opts), fetchImpl);
  const text = parseText(json);
  if (!opts.json) return { text };
  try { return { text, json: looseJson(text) }; }
  catch { throw Object.assign(new Error(`AI returned non-JSON output: ${text.slice(0, 120)}`), { code: 'AI_PARSE', text }); }
}

export function parseModels(json) {
  return [...new Set((json.data || []).map((m) => m.id).filter(Boolean))].sort();
}

export async function listModels({ key } = {}, fetchImpl = fetch) {
  const res = await fetchImpl(`${BASE}/models`, { method: 'GET', headers: { 'Authorization': 'Bearer ' + key } });
  const raw = await res.text();
  let json = null;
  try { json = raw ? JSON.parse(raw) : {}; } catch { /* non-JSON body */ }
  if (!res.ok) throw Object.assign(new Error(json?.error?.message || `Groq API ${res.status}`), { code: 'AI_HTTP', status: res.status });
  return parseModels(json || {});
}

// No resolveLatestModel: Groq's /models list mixes chat, audio (whisper) and guard models
// with no stable "-latest" alias, so activation uses the offline DEFAULT_MODEL (a known
// current chat model), overridable under "Advanced — override model" in Settings.
