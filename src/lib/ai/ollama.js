import { looseJson } from './_json.js';
/* Ollama local API adapter — raw HTTP, no SDK, no auth.
   Mirrors the Anthropic adapter contract exactly. */

export const capabilities = { text: true, vision: true, document: false, image: false };
export const DEFAULT_MODEL = 'llama3.2';

const DEFAULT_BASE_URL = 'http://127.0.0.1:11434';
const headers = () => ({ 'content-type': 'application/json' });

// Map our cross-provider `maxTokens` onto Ollama's `options.num_predict` so local output is
// bounded like every other adapter (otherwise Ollama generates unbounded). (L3)
const numPredict = (maxTokens) => (Number.isFinite(Number(maxTokens)) && Number(maxTokens) > 0
  ? { options: { num_predict: Number(maxTokens) } }
  : {});

export function buildText({ system, prompt, maxTokens, model, json, baseUrl }) {
  const url = `${baseUrl || DEFAULT_BASE_URL}/api/chat`;
  const body = {
    model: model || DEFAULT_MODEL,
    messages: [
      ...(system ? [{ role: 'system', content: system }] : []),
      { role: 'user', content: prompt },
    ],
    stream: false,
    ...numPredict(maxTokens),
    ...(json ? { format: 'json' } : {}),
  };
  return { url, headers: headers(), body: JSON.stringify(body) };
}

export function buildVision({ prompt, imageBase64, maxTokens, model, baseUrl }) {
  const url = `${baseUrl || DEFAULT_BASE_URL}/api/chat`;
  const body = {
    model: model || DEFAULT_MODEL,
    messages: [{ role: 'user', content: prompt, images: [imageBase64] }],
    stream: false,
    ...numPredict(maxTokens),
  };
  return { url, headers: headers(), body: JSON.stringify(body) };
}

export function parseText(json) {
  // Ollama can return HTTP 200 with an {error} body — surface it with a status like every other adapter.
  if (json?.error) throw Object.assign(new Error(String(json.error)), { code: 'AI_HTTP', status: 200 });
  return (json?.message?.content || '').trim();
}

async function call(built, fetchImpl = fetch) {
  const res = await fetchImpl(built.url, { method: 'POST', headers: built.headers, body: built.body });
  // Read the body as text first: error responses from proxies/CDNs (502/504) are often
  // HTML, so res.json() would throw a bare SyntaxError and lose the HTTP status.
  const raw = await res.text();
  let json = null;
  try { json = raw ? JSON.parse(raw) : {}; } catch { /* non-JSON body */ }
  if (!res.ok) throw Object.assign(new Error(json?.error?.message || `Ollama API ${res.status}`), { code: 'AI_HTTP', status: res.status });
  if (json === null) throw Object.assign(new Error(`Ollama returned a non-JSON response (HTTP ${res.status}).`), { code: 'AI_HTTP', status: res.status });
  return json;
}

export async function readDocument({ system, instruction, fileBase64, mimeType, json, model, baseUrl }, fetchImpl = fetch) {
  if (mimeType === 'application/pdf') {
    throw Object.assign(new Error('Ollama cannot read PDFs here'), { code: 'AI_CAP', status: 400 });
  }
  const url = `${baseUrl || DEFAULT_BASE_URL}/api/chat`;
  const body = {
    model: model || DEFAULT_MODEL,
    messages: [
      ...(system ? [{ role: 'system', content: system }] : []),
      { role: 'user', content: instruction, images: [fileBase64] },
    ],
    stream: false,
    ...(json ? { format: 'json' } : {}),
  };
  const built = { url, headers: headers(), body: JSON.stringify(body) };
  const raw_json = await call(built, fetchImpl);
  const text = parseText(raw_json);
  if (!json) return { text };
  try { return { text, json: looseJson(text) }; }
  catch { throw Object.assign(new Error(`AI returned non-JSON output: ${text.slice(0, 120)}`), { code: 'AI_PARSE', text }); }
}

export async function generateImage(_opts, _fetchImpl = fetch) {
  throw Object.assign(new Error('Ollama does not generate images'), { code: 'AI_CAP', status: 400 });
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
  return [...new Set((json.models || []).map((m) => m.name).filter(Boolean))].sort();
}

export async function listModels({ key, baseUrl } = {}, fetchImpl = fetch) {
  const base = baseUrl || DEFAULT_BASE_URL;
  const url = `${base}/api/tags`;
  const res = await fetchImpl(url, { method: 'GET', headers: headers() });
  const raw = await res.text();
  let json = null;
  try { json = raw ? JSON.parse(raw) : {}; } catch { /* non-JSON body */ }
  if (!res.ok) throw Object.assign(new Error(json?.error?.message || `Ollama API ${res.status}`), { code: 'AI_HTTP', status: res.status });
  if (json === null) throw Object.assign(new Error(`Ollama returned a non-JSON response (HTTP ${res.status}).`), { code: 'AI_HTTP', status: res.status });
  return parseModels(json);
}
