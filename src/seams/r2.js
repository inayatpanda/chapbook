// R2 seam (browser) — the ONLY place aws4fetch is touched on the BYOK direct-upload
// path. Bundled into studio.js; exposes window.__studioR2 for the inline video-block UI
// in index.html. aws4fetch is Web-Crypto/fetch based, so it signs SigV4 entirely in the
// browser — no AWS SDK, no Node. The R2 keys live only in this browser (config.r2),
// treated exactly like the GitHub token.
//
// v1 = single PUT (fine for typical phone clips). FUTURE: multipart for large files, and
// a Worker / custom-domain upload route to dodge the SNI filter (see core/r2.js note).
import { AwsClient } from 'aws4fetch';
import { uploadToR2, uploadViaWorker, validateR2Config, validateWorkerConfig, isR2Configured, buildCorsPolicy, classifyR2Error, r2Key, safeName, mapVideoLibrary, generateImageViaWorker, isImageWorkerConfigured } from '../core/r2.js';

export function makeR2(config) {
  // Two upload paths share this seam:
  //   • Worker  — PUT to the Cloudflare Worker (R2 binding). Preferred when the S3
  //               endpoint is broken/blocked. Configured = Worker URL+secret + publicBase.
  //   • Direct  — SigV4 PUT straight to the S3 endpoint (aws4fetch, browser-signed).
  // "Configured" (and so whether the video block shows the button) = either path ready.
  const workerReady = () => !!(config.isR2WorkerConfigured && config.isR2WorkerConfigured());
  return {
    // Pure helpers re-exported so the inline UI gets them without re-importing.
    validate: validateR2Config,
    validateWorker: validateWorkerConfig,
    isConfigured: () => isR2Configured(config.getR2()) || workerReady(),
    isWorker: workerReady,
    corsPolicy: buildCorsPolicy,
    classifyError: classifyR2Error,
    key: r2Key,
    safeName,
    getConfig: () => config.getR2(),
    getWorker: () => (config.getR2Worker ? config.getR2Worker() : { url: '', secret: '' }),

    // Upload a File to the user's own bucket. Returns { url, key }. Routes via the Worker
    // when it's configured (recommended); otherwise a direct SigV4 PUT to the S3 endpoint.
    async upload({ file, onProgress }) {
      if (workerReady()) {
        const worker = config.getR2Worker();
        const { publicBase } = config.getR2();
        return uploadViaWorker({ file, worker, publicBase, onProgress });
      }
      const cfg = config.getR2();
      const { ok, errors } = validateR2Config(cfg);
      if (!ok) throw Object.assign(new Error('R2 not configured: ' + errors.join('; ')), { kind: 'config' });
      const aws = new AwsClient({ accessKeyId: cfg.accessKeyId, secretAccessKey: cfg.secretAccessKey, service: 's3', region: 'auto' });
      return uploadToR2({ signer: aws, file, config: cfg, onProgress });
    },

    // Free text-to-image via the SAME Worker's POST /image route (Workers AI / FLUX-schnell).
    // Configured = Worker url+secret (publicBase NOT needed — the image returns as base64, not
    // stored). Works in BOTH modes (BYOK + local Helm) since this seam is always present.
    // Returns { base64, mimeType }. Throws a friendly error the UI surfaces verbatim.
    isImageWorker: () => isImageWorkerConfigured(config.getR2Worker ? config.getR2Worker() : {}),
    async image({ prompt }) {
      return generateImageViaWorker({ worker: config.getR2Worker(), prompt });
    },

    // List the user's R2 videos via the Worker's GET /list route (BYOK video library).
    // Only meaningful when the Worker route is configured (url+secret+publicBase). Returns
    // the video-library shape ([{ src, publicUrl, title, posterUrl:'', durationS:null, local:false }]),
    // newest first. Throws on a non-2xx / network failure so the UI can fall back to the explainer.
    async listVideos() {
      if (!workerReady()) throw Object.assign(new Error('Worker list not configured'), { kind: 'config' });
      const { url, secret } = config.getR2Worker();
      const { publicBase } = config.getR2();
      const base = String(url || '').replace(/\/+$/, '');
      let res;
      try {
        res = await fetch(base + '/list', { method: 'GET', headers: { Authorization: `Bearer ${secret}` } });
      } catch (err) {
        throw Object.assign(err instanceof Error ? err : new Error(String(err)), { kind: 'blocked' });
      }
      if (!res.ok) {
        const detail = await (res.text ? res.text().catch(() => '') : Promise.resolve(''));
        throw Object.assign(new Error(`Worker list failed: ${res.status}`), { status: res.status, detail });
      }
      const payload = await res.json().catch(() => ({}));
      return mapVideoLibrary(payload, publicBase);
    },
  };
}
