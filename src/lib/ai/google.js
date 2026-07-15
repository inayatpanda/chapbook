import { looseJson } from './_json.js';
import { pickLatestFromList, latestModelOffline } from './pickLatest.js';
/* Google Gemini generateContent API adapter — raw HTTP, no SDK.
   Mirrors the Anthropic adapter contract exactly. */

export const capabilities = { text: true, vision: true, document: true, image: true };
export const DEFAULT_MODEL = 'gemini-flash-latest';

const BASE = 'https://generativelanguage.googleapis.com/v1beta/models';

// Pass the API key in the x-goog-api-key HEADER, not the URL query string. Google's API
// accepts both, but `?key=…` lands in URL/access logs (the key leaks). (L1)
const headers = (key) => ({ 'content-type': 'application/json', ...(key ? { 'x-goog-api-key': key } : {}) });

// Gemini's responseSchema does NOT accept `additionalProperties`.
// Deep-clone the schema and remove every `additionalProperties` key recursively.
function stripAdditionalProps(schema) {
  if (!schema || typeof schema !== 'object') return schema;
  if (Array.isArray(schema)) return schema.map(stripAdditionalProps);
  const out = {};
  for (const [k, v] of Object.entries(schema)) {
    if (k === 'additionalProperties') continue;
    out[k] = stripAdditionalProps(v);
  }
  return out;
}

export function buildText({ system, prompt, maxTokens, model, key, json, baseUrl }) {
  const url = `${BASE}/${model || DEFAULT_MODEL}:generateContent`;
  const body = {
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    ...(system ? { systemInstruction: { parts: [{ text: system }] } } : {}),
    generationConfig: {
      maxOutputTokens: maxTokens ?? 4000,
      // Gemini 2.5 / flash-latest are "thinking" models — hidden reasoning tokens are billed
      // against maxOutputTokens FIRST, truncating JSON on modest budgets (→ AI_PARSE). Disable.
      thinkingConfig: { thinkingBudget: 0 },
      ...(json ? { responseMimeType: 'application/json', responseSchema: stripAdditionalProps(json) } : {}),
    },
  };
  return { url, headers: headers(key), body: JSON.stringify(body) };
}

export function buildVision({ system, prompt, imageBase64, mimeType, maxTokens, model, key, baseUrl }) {
  const url = `${BASE}/${model || DEFAULT_MODEL}:generateContent`;
  const body = {
    contents: [{ role: 'user', parts: [
      { inlineData: { mimeType: mimeType || 'image/jpeg', data: imageBase64 } },
      { text: prompt },
    ] }],
    generationConfig: { maxOutputTokens: maxTokens ?? 300, thinkingConfig: { thinkingBudget: 0 } },
  };
  return { url, headers: headers(key), body: JSON.stringify(body) };
}

export function parseText(json) {
  // Gemini blocks via several finishReasons (SAFETY, RECITATION, PROHIBITED_CONTENT, OTHER, …),
  // any of which yields empty parts — throw rather than silently returning ''.
  const reason = json?.candidates?.[0]?.finishReason;
  if (reason && reason !== 'STOP' && reason !== 'MAX_TOKENS') {
    throw Object.assign(new Error(`Gemini declined this request (${reason}).`), { code: 'AI_REFUSAL' });
  }
  return (json?.candidates?.[0]?.content?.parts || []).map((p) => p.text || '').join('').trim();
}

async function call(built, fetchImpl = fetch) {
  const res = await fetchImpl(built.url, { method: 'POST', headers: built.headers, body: built.body });
  // Read the body as text first: error responses from proxies/CDNs (502/504) are often
  // HTML, so res.json() would throw a bare SyntaxError and lose the HTTP status.
  const raw = await res.text();
  let json = null;
  try { json = raw ? JSON.parse(raw) : {}; } catch { /* non-JSON body */ }
  if (!res.ok) throw Object.assign(new Error(json?.error?.message || `Gemini API ${res.status}`), { code: 'AI_HTTP', status: res.status, provider: 'google', providerCode: json?.error?.code, providerStatus: json?.error?.status });
  if (json === null) throw Object.assign(new Error(`Gemini returned a non-JSON response (HTTP ${res.status}).`), { code: 'AI_HTTP', status: res.status });
  return json;
}

export async function readDocument({ system, instruction, fileBase64, mimeType, json, model, key, baseUrl }, fetchImpl = fetch) {
  const url = `${BASE}/${model || DEFAULT_MODEL}:generateContent`;
  const body = {
    contents: [{ role: 'user', parts: [
      { inlineData: { mimeType, data: fileBase64 } },
      { text: instruction },
    ] }],
    ...(system ? { systemInstruction: { parts: [{ text: system }] } } : {}),
    generationConfig: {
      maxOutputTokens: 4000,
      thinkingConfig: { thinkingBudget: 0 },
      ...(json ? { responseMimeType: 'application/json', responseSchema: stripAdditionalProps(json) } : {}),
    },
  };
  const built = { url, headers: headers(key), body: JSON.stringify(body) };
  const raw_json = await call(built, fetchImpl);
  const text = parseText(raw_json);
  if (!json) return { text };
  try { return { text, json: looseJson(text) }; }
  catch { throw Object.assign(new Error(`AI returned non-JSON output: ${text.slice(0, 120)}`), { code: 'AI_PARSE', text }); }
}

export async function generateImage({ prompt, size, model, key, baseUrl }, fetchImpl = fetch) {
  // Imagen lives at a separate model id from the configured TEXT model — never POST :predict
  // against a gemini text model (it 404s). Only honour `model` if it's actually an Imagen id.
  const imageModel = (model && /imagen/i.test(model)) ? model : 'imagen-3.0-generate-002';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${imageModel}:predict`;
  const body = { instances: [{ prompt }], parameters: { sampleCount: 1 } };
  const built = { url, headers: headers(key), body: JSON.stringify(body) };
  const json = await call(built, fetchImpl);
  const b64 = json?.predictions?.[0]?.bytesBase64Encoded;
  if (!b64) throw Object.assign(new Error('Google Imagen response had no bytesBase64Encoded'), { code: 'AI_PARSE' });
  return { base64: b64, mimeType: 'image/png' };
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
  return [...new Set(
    (json.models || [])
      .filter((m) => (m.supportedGenerationMethods || []).includes('generateContent'))
      .map((m) => (m.name || '').replace(/^models\//, ''))
      .filter(Boolean)
  )].sort();
}

// Raw model entries (text-capable, keeping `name`) for the pick-latest heuristic.
// Gemini's list carries no per-model timestamp, so pickLatest orders by version number.
function parseModelsRaw(json) {
  return (json.models || [])
    .filter((m) => (m.supportedGenerationMethods || []).includes('generateContent'))
    .map((m) => ({ name: m.name }))
    .filter((m) => m.name);
}

async function fetchModelsJson({ key }, fetchImpl) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models?pageSize=200`;
  const res = await fetchImpl(url, { method: 'GET', headers: headers(key) });
  const raw = await res.text();
  let json = null;
  try { json = raw ? JSON.parse(raw) : {}; } catch { /* non-JSON body */ }
  if (!res.ok) throw Object.assign(new Error(json?.error?.message || `Gemini API ${res.status}`), { code: 'AI_HTTP', status: res.status, provider: 'google', providerCode: json?.error?.code, providerStatus: json?.error?.status });
  if (json === null) throw Object.assign(new Error(`Gemini returned a non-JSON response (HTTP ${res.status}).`), { code: 'AI_HTTP', status: res.status });
  return json;
}

export async function listModels(opts = {}, fetchImpl = fetch) {
  return parseModels(await fetchModelsJson(opts, fetchImpl));
}

export async function listModelsRaw(opts = {}, fetchImpl = fetch) {
  return parseModelsRaw(await fetchModelsJson(opts, fetchImpl));
}

// Resolve the latest sensible TEXT model with no explicit override. Google publishes a
// stable `gemini-flash-latest` alias, so we don't even need the key to give a good answer
// — but a live query lets pickLatest confirm/upgrade it. Never throws: any failure
// (offline, no key) degrades to the offline alias.
export async function resolveLatestModel(opts = {}, fetchImpl = fetch) {
  try {
    const picked = pickLatestFromList('google', await listModelsRaw(opts, fetchImpl));
    if (picked) return picked;
  } catch { /* offline / no key → fall through */ }
  return latestModelOffline('google');
}
