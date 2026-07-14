/* Cloudflare Workers AI image adapter (server side) — free text-to-image via the SAME
   r2-upload-worker the owner already runs. NOT a full AI provider: there's no API key
   and no text/vision path. It exists so the local Helm Studio's /ai/generate-image route
   can reach the Worker's POST /image route (FLUX.1-schnell) exactly like the browser seam
   does in the hosted/BYOK Studio — one image-gen behaviour in BOTH modes, no new config.

   Config is REUSED from config.media.worker = { url, secret } (the same Worker Helm already
   uploads through). publicBase is NOT needed: the image returns as base64, it isn't stored.

   Pure helpers (build/parse) are exported + unit-tested; the network call injects fetch. */

export const capabilities = { text: false, vision: false, document: false, image: true };

const trimSlash = (u) => String(u == null ? '' : u).trim().replace(/\/+$/, '');

// True iff a Worker url+secret are configured — enough to call /image.
export function isWorkerImageConfigured(worker) {
  const w = worker || {};
  return !!(trimSlash(w.url) && String(w.secret == null ? '' : w.secret).trim());
}

// Build { url, init } for POST {worker.url}/image. Throws (code AI_NO_KEY) when unconfigured
// so the route degrades to a clear "configure the Worker" message rather than a raw fetch error.
export function buildImageRequest({ worker, prompt } = {}) {
  const w = worker || {};
  const base = trimSlash(w.url);
  const secret = String(w.secret == null ? '' : w.secret).trim();
  const p = String(prompt == null ? '' : prompt).trim();
  if (!base || !secret) {
    throw Object.assign(new Error('Cloudflare image Worker not configured (config.media.worker url+secret).'), { code: 'AI_NO_KEY', status: 503 });
  }
  if (!p) throw Object.assign(new Error('Give me a prompt to work with.'), { code: 'AI_CAP', status: 400 });
  return {
    url: `${base}/image`,
    init: {
      method: 'POST',
      headers: { Authorization: `Bearer ${secret}`, 'content-type': 'application/json' },
      body: JSON.stringify({ prompt: p }),
    },
  };
}

// Normalise the Worker /image JSON → { base64, mimeType }. The Worker returns
// { image:<base64>, mimeType }; tolerate { base64 } as an alias. Throws (code AI_PARSE)
// with the Worker's own error text when no image came back.
export function parseImageResponse(payload) {
  const p = payload || {};
  const base64 = typeof p.image === 'string' ? p.image : (typeof p.base64 === 'string' ? p.base64 : '');
  if (!base64) {
    const msg = (p && typeof p.error === 'string' && p.error) ? p.error : 'The image Worker returned no image data.';
    throw Object.assign(new Error(msg), { code: 'AI_PARSE' });
  }
  return { base64, mimeType: (typeof p.mimeType === 'string' && p.mimeType) || 'image/png' };
}

// Generate an image via the Worker. `worker` = { url, secret }; fetchImpl injected for tests.
// Returns { base64, mimeType }. HTTP errors surface the Worker's message + status; the route's
// aiErr maps them to a clean response.
export async function generateImage({ worker, prompt }, fetchImpl = fetch) {
  const { url, init } = buildImageRequest({ worker, prompt });
  let res;
  try {
    res = await fetchImpl(url, init);
  } catch (err) {
    throw Object.assign(new Error('Could not reach the image Worker: ' + (err && err.message ? err.message : String(err))), { code: 'AI_HTTP', status: 502 });
  }
  const payload = await (res.json ? res.json().catch(() => ({})) : Promise.resolve({}));
  if (!res.ok) {
    const msg = (payload && typeof payload.error === 'string' && payload.error) ? payload.error : `Image Worker HTTP ${res.status}`;
    throw Object.assign(new Error(msg), { code: 'AI_HTTP', status: res.status });
  }
  return parseImageResponse(payload);
}
