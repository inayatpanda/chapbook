import { looseJson } from './_json.js';
import { pickLatestFromList, latestModelOffline } from './pickLatest.js';
/* OpenAI Chat Completions API adapter — raw HTTP, no SDK.
   Mirrors the Anthropic adapter contract exactly. */

export const capabilities = { text: true, vision: true, document: false, image: true };
export const DEFAULT_MODEL = 'gpt-4o';

const ENDPOINT = 'https://api.openai.com/v1/chat/completions';
const headers = (key) => ({
  'content-type': 'application/json',
  'Authorization': 'Bearer ' + key,
});

export function buildText({ system, prompt, maxTokens, model, key, json, baseUrl }) {
  const body = {
    model: model || DEFAULT_MODEL,
    messages: [
      ...(system ? [{ role: 'system', content: system }] : []),
      { role: 'user', content: prompt },
    ],
    max_tokens: maxTokens ?? 4000,
  };
  if (json) body.response_format = { type: 'json_schema', json_schema: { name: 'helm_output', schema: json, strict: true } };
  return { url: ENDPOINT, headers: headers(key), body: JSON.stringify(body) };
}

export function buildVision({ system, prompt, imageBase64, mimeType, maxTokens, model, key, baseUrl }) {
  const body = {
    model: model || DEFAULT_MODEL,
    messages: [
      ...(system ? [{ role: 'system', content: system }] : []),
      { role: 'user', content: [
        { type: 'text', text: prompt },
        { type: 'image_url', image_url: { url: 'data:' + (mimeType || 'image/jpeg') + ';base64,' + imageBase64 } },
      ] },
    ],
    max_tokens: maxTokens ?? 300,
  };
  return { url: ENDPOINT, headers: headers(key), body: JSON.stringify(body) };
}

export function parseText(json) {
  if (json?.choices?.[0]?.finish_reason === 'content_filter') throw Object.assign(new Error('OpenAI declined this request (content_filter).'), { code: 'AI_REFUSAL' });
  return (json?.choices?.[0]?.message?.content || '').trim();
}

async function call(built, fetchImpl = fetch) {
  const res = await fetchImpl(built.url, { method: 'POST', headers: built.headers, body: built.body });
  // Read the body as text first: error responses from proxies/CDNs (502/504) are often
  // HTML, so res.json() would throw a bare SyntaxError and lose the HTTP status.
  const raw = await res.text();
  let json = null;
  try { json = raw ? JSON.parse(raw) : {}; } catch { /* non-JSON body */ }
  if (!res.ok) throw Object.assign(new Error(json?.error?.message || `OpenAI API ${res.status}`), { code: 'AI_HTTP', status: res.status, provider: 'openai', providerCode: json?.error?.code, providerType: json?.error?.type });
  if (json === null) throw Object.assign(new Error(`OpenAI returned a non-JSON response (HTTP ${res.status}).`), { code: 'AI_HTTP', status: res.status });
  return json;
}

export async function readDocument({ system, instruction, fileBase64, mimeType, json, model, key, baseUrl }, fetchImpl = fetch) {
  if (mimeType === 'application/pdf') {
    throw Object.assign(new Error('OpenAI cannot read PDFs here'), { code: 'AI_CAP', status: 400 });
  }
  const body = {
    model: model || DEFAULT_MODEL,
    messages: [
      ...(system ? [{ role: 'system', content: system }] : []),
      { role: 'user', content: [
        { type: 'text', text: instruction },
        { type: 'image_url', image_url: { url: 'data:' + mimeType + ';base64,' + fileBase64 } },
      ] },
    ],
    max_tokens: 4000,
  };
  if (json) body.response_format = { type: 'json_schema', json_schema: { name: 'helm_output', schema: json, strict: true } };
  const built = { url: ENDPOINT, headers: headers(key), body: JSON.stringify(body) };
  const raw_json = await call(built, fetchImpl);
  const text = parseText(raw_json);
  if (!json) return { text };
  try { return { text, json: looseJson(text) }; }
  catch { throw Object.assign(new Error(`AI returned non-JSON output: ${text.slice(0, 120)}`), { code: 'AI_PARSE', text }); }
}

// gpt-image-1 accepts only this fixed set of sizes; anything else 400s. Map unknown
// sizes (or none) to the 1024x1024 default; pass valid ones through unchanged.
const IMAGE_SIZES = new Set(['1024x1024', '1536x1024', '1024x1536', 'auto']);

export async function generateImage({ prompt, size, model, key, baseUrl }, fetchImpl = fetch) {
  const url = 'https://api.openai.com/v1/images/generations';
  const body = {
    model: model || 'gpt-image-1',
    prompt,
    size: IMAGE_SIZES.has(size) ? size : '1024x1024',
    n: 1,
  };
  const built = { url, headers: headers(key), body: JSON.stringify(body) };
  const json = await call(built, fetchImpl);
  const item = json?.data?.[0];
  if (item?.b64_json) return { base64: item.b64_json, mimeType: 'image/png' };
  if (item?.url) return { url: item.url };
  throw Object.assign(new Error('OpenAI image response had no b64_json or url'), { code: 'AI_PARSE' });
}

export async function generateText(opts, fetchImpl) {
  const json = await call(buildText(opts), fetchImpl);
  const text = parseText(json);
  if (!opts.json) return { text };
  try { return { text, json: looseJson(text) }; }
  catch { throw Object.assign(new Error(`AI returned non-JSON output: ${text.slice(0, 120)}`), { code: 'AI_PARSE', text }); }
}

export async function describeImage(opts, fetchImpl) {
  return { text: parseText(await call(buildVision(opts), fetchImpl)) };
}

export function parseModels(json) {
  return [...new Set((json.data || []).map((m) => m.id).filter(Boolean))].sort();
}

// Raw entries (keeping the `created` Unix timestamp) for the pick-latest heuristic.
// OpenAI's chat-latest aliases have proven unstable (chatgpt-4o-latest was removed,
// gpt-4o retired), so there's no alias to trust — the live list + recency is the source.
function parseModelsRaw(json) {
  return (json.data || [])
    .filter((m) => m && m.id)
    .map((m) => ({ id: m.id, created: m.created }));
}

async function fetchModelsJson({ key }, fetchImpl) {
  const url = 'https://api.openai.com/v1/models';
  const hdrs = { 'Authorization': 'Bearer ' + key };
  const res = await fetchImpl(url, { method: 'GET', headers: hdrs });
  const raw = await res.text();
  let json = null;
  try { json = raw ? JSON.parse(raw) : {}; } catch { /* non-JSON body */ }
  if (!res.ok) throw Object.assign(new Error(json?.error?.message || `OpenAI API ${res.status}`), { code: 'AI_HTTP', status: res.status, provider: 'openai', providerCode: json?.error?.code, providerType: json?.error?.type });
  if (json === null) throw Object.assign(new Error(`OpenAI returned a non-JSON response (HTTP ${res.status}).`), { code: 'AI_HTTP', status: res.status });
  return json;
}

export async function listModels(opts = {}, fetchImpl = fetch) {
  return parseModels(await fetchModelsJson(opts, fetchImpl));
}

export async function listModelsRaw(opts = {}, fetchImpl = fetch) {
  return parseModelsRaw(await fetchModelsJson(opts, fetchImpl));
}

// Resolve the latest sensible TEXT model with no explicit override: query the live list
// and pick the newest GPT/chat model by `created`. No stable alias to lean on, so a
// failed/offline query degrades to SAFE_DEFAULT.
export async function resolveLatestModel(opts = {}, fetchImpl = fetch) {
  try {
    const picked = pickLatestFromList('openai', await listModelsRaw(opts, fetchImpl));
    if (picked) return picked;
  } catch { /* offline / no key → fall through */ }
  return latestModelOffline('openai');
}
