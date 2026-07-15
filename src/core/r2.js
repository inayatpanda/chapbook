// Pure, browser-/test-safe helpers for the BYOK direct-to-R2 video upload path.
//
// No DOM, no network, no aws4fetch import in THIS file — the network-bearing seam
// (studio-app/seams/r2.js) injects an `AwsClient`-shaped signer into uploadToR2 so
// these helpers stay unit-testable with `node --test` and never make a real call.
//
// Direction of travel (see seams/r2.js): single PUT is fine for typical phone clips.
// FUTURE upgrades — multipart upload for large files, and a Worker / custom-domain
// route to dodge the SNI-based ISP filtering of *.r2.cloudflarestorage.com — would
// live alongside these helpers. Raw upload only here; Helm stays the optimise/transcode
// path (archive original → transcode web copy + poster).

const trimSlash = (u) => String(u == null ? '' : u).trim().replace(/\/+$/, '');

// ── config validation ──────────────────────────────────────────────────────
// Returns { ok, errors:[…], config } where `config` is the normalised shape.
// `publicBase` is REQUIRED — we set the block's <video src> to `${publicBase}/${key}`,
// so without it a successful PUT would still have no playable URL.
export function validateR2Config(raw) {
  const c = raw || {};
  const config = {
    endpoint: trimSlash(c.endpoint),
    bucket: String(c.bucket == null ? '' : c.bucket).trim(),
    accessKeyId: String(c.accessKeyId == null ? '' : c.accessKeyId).trim(),
    secretAccessKey: String(c.secretAccessKey == null ? '' : c.secretAccessKey).trim(),
    publicBase: trimSlash(c.publicBase),
  };
  const errors = [];
  if (!config.endpoint) errors.push('endpoint is required (e.g. https://<account>.r2.cloudflarestorage.com)');
  else if (!/^https?:\/\//i.test(config.endpoint)) errors.push('endpoint must start with https://');
  if (!config.bucket) errors.push('bucket is required');
  else if (/[/\s]/.test(config.bucket)) errors.push('bucket must not contain spaces or slashes');
  if (!config.accessKeyId) errors.push('accessKeyId is required');
  if (!config.secretAccessKey) errors.push('secretAccessKey is required');
  if (!config.publicBase) errors.push('publicBase is required (the public URL your bucket/domain serves objects from)');
  else if (!/^https?:\/\//i.test(config.publicBase)) errors.push('publicBase must start with https://');
  return { ok: errors.length === 0, errors, config };
}

// True iff every required field is present + well-formed. Mirrors config.isR2Configured().
export function isR2Configured(raw) {
  return validateR2Config(raw).ok;
}

// ── object-key naming ───────────────────────────────────────────────────────
// Strip path separators + risky chars, collapse runs, keep the extension. Never empty.
export function safeName(name) {
  const raw = String(name == null ? '' : name).trim();
  const base = raw.split(/[\\/]/).pop() || '';            // drop any directory part
  const dot = base.lastIndexOf('.');
  let stem = dot > 0 ? base.slice(0, dot) : base;
  let ext = dot > 0 ? base.slice(dot + 1) : '';
  stem = stem.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80);
  ext = ext.toLowerCase().replace(/[^a-z0-9]+/g, '').slice(0, 8);
  if (!stem) stem = 'video';
  return ext ? `${stem}.${ext}` : stem;
}

// key = videos/<ts36>-<safeName>. The ts36 prefix keeps uploads unique + roughly sortable
// without reading the bucket first (no list/dedupe round-trip on the BYOK path).
export function r2Key(name, now = Date.now()) {
  const ts = Math.floor(now).toString(36);
  return `videos/${ts}-${safeName(name)}`;
}

// content-type from the file (browser sets file.type for camera clips); fall back by ext.
const CT = { mp4: 'video/mp4', m4v: 'video/mp4', mov: 'video/quicktime', webm: 'video/webm', ogg: 'video/ogg', ogv: 'video/ogg' };
export function contentTypeFor(file) {
  if (file && typeof file.type === 'string' && file.type) return file.type;
  const ext = (String((file && file.name) || '').split('.').pop() || '').toLowerCase();
  return CT[ext] || 'application/octet-stream';
}

// ── CORS policy builder ─────────────────────────────────────────────────────
// R2 rejects a browser PUT unless the bucket allows the Studio origin. We can't set
// this for the user (no account API on the BYOK path), so on a CORS/preflight failure
// we surface this copy-pasteable policy + where to paste it.
export function buildCorsPolicy(origin = 'https://chapbook.rqai.co.uk') {
  const policy = [
    {
      AllowedOrigins: [origin],
      AllowedMethods: ['PUT', 'GET'],
      AllowedHeaders: ['*'],
      ExposeHeaders: ['ETag'],
      MaxAgeSeconds: 3600,
    },
  ];
  return {
    origin,
    policy,
    json: JSON.stringify(policy, null, 2),
    // Where to paste it. Cloudflare dashboard path, current as of build.
    where: 'Cloudflare dashboard → R2 → your bucket → Settings → CORS policy → "Add CORS policy", paste the JSON, Save. Then retry the upload.',
  };
}

// ── error classification ────────────────────────────────────────────────────
// A browser fetch can't tell a true CORS denial from a network drop — both surface as
// a TypeError "Failed to fetch" with no response. We classify by best-effort signals so
// the UI can show the right remedy (CORS policy vs VPN/WARP for the SNI filter).
export function classifyR2Error(err) {
  const msg = String((err && err.message) || err || '').toLowerCase();
  const status = err && err.status;
  if (status === 403) return { kind: 'forbidden', message: 'R2 rejected the upload (403) — check the access key has write access to this bucket, and that the bucket name + endpoint are correct.' };
  if (status && status >= 400) return { kind: 'http', message: `R2 returned ${status}. ${(err && err.detail) || ''}`.trim() };
  // No HTTP status → preflight/network failure. "Failed to fetch" / TypeError covers
  // both a missing CORS policy AND ISP/mobile filtering of Cloudflare R2's SNI.
  if (/failed to fetch|networkerror|load failed|typeerror|tls|handshake|err_/.test(msg)) {
    return {
      kind: 'blocked',
      // Surfaced verbatim by the UI; pairs with the CORS-policy panel + the filter line.
      message: 'Upload blocked — your network may be filtering Cloudflare R2 (common on UK ISPs/mobile). Turn on a VPN/WARP, or use a network without the filter. If you are on an unfiltered network, your bucket may just need a CORS policy (shown below).',
    };
  }
  return { kind: 'unknown', message: (err && err.message) || 'Upload failed.' };
}

// ── the upload itself (signer injected) ─────────────────────────────────────
// `signer` is an aws4fetch AwsClient (or any { fetch(url, init) } with SigV4). Kept as a
// param so tests pass a fake and assert URL/headers/key without touching the network.
// Returns { url, key }. Throws a classified-friendly error (status attached when known).
export async function uploadToR2({ signer, file, config, key, onProgress }) {
  const { ok, errors, config: cfg } = validateR2Config(config);
  if (!ok) throw Object.assign(new Error('R2 not configured: ' + errors.join('; ')), { kind: 'config' });
  if (!file) throw Object.assign(new Error('No file selected.'), { kind: 'config' });
  const objKey = key || r2Key(file.name);
  const url = `${cfg.endpoint}/${cfg.bucket}/${objKey}`;
  const contentType = contentTypeFor(file);
  if (onProgress) onProgress(0.05, 'Uploading…');
  let res;
  try {
    res = await signer.fetch(url, { method: 'PUT', body: file, headers: { 'content-type': contentType } });
  } catch (err) {
    // Network/preflight throw — no response object. Re-throw for classifyR2Error.
    throw Object.assign(err instanceof Error ? err : new Error(String(err)), { kind: 'blocked' });
  }
  if (!res.ok) {
    const detail = await (res.text ? res.text().catch(() => '') : Promise.resolve(''));
    throw Object.assign(new Error(`R2 PUT failed: ${res.status}`), { status: res.status, detail });
  }
  if (onProgress) onProgress(1, 'Done');
  return { url: `${cfg.publicBase}/${objKey}`, key: objKey };
}

// ── public-readability check (H2) ────────────────────────────────────────────
// A successful AUTHENTICATED PUT does NOT mean visitors can GET the object: a private bucket
// or a disabled/throttled *.r2.dev returns 403/404, so the <video> is dead on the published
// blog. After upload we do an UNAUTHENTICATED ranged GET of the public URL and classify it.
// `fetchImpl` is injected for tests (defaults to global fetch).
//
// A cross-origin fetch to r2.dev is frequently CORS-blocked EVEN WHEN the object is perfectly
// readable by a <video> tag (media playback isn't CORS-gated), so a network/opaque failure is
// reported as readable:null (UNKNOWN) — never a false "broken" warning. The caller can then
// fall back to a media-element probe. We only assert readable:false on the unambiguous
// not-public statuses (401/403/404). Returns { readable: true|false|null, status, message }.
export async function checkPublicReadable({ url, fetchImpl } = {}) {
  const doFetch = fetchImpl || (typeof fetch !== 'undefined' ? fetch : null);
  const u = String(url == null ? '' : url).trim();
  if (!u || !doFetch) return { readable: null, status: 0, message: '' };
  const warn = (status) => `Video uploaded, but its public URL is not readable${status ? ` (HTTP ${status})` : ''} — visitors will see a broken video. Enable public access (R2 → your bucket → Settings → Public access / r2.dev) or connect a custom domain, then re-check.`;
  let res;
  try {
    // Range: bytes=0-0 → a 206 with a single byte, so we never download the whole clip. When
    // the bucket has no CORS policy for this origin the request is blocked → caught below.
    res = await doFetch(u, { method: 'GET', headers: { Range: 'bytes=0-0' }, cache: 'no-store' });
  } catch {
    return { readable: null, status: 0, message: '' };   // blocked (often CORS) — unknown; let the caller probe
  }
  try { if (res && res.body && res.body.cancel) res.body.cancel(); } catch { /* ignore */ }
  const status = (res && typeof res.status === 'number') ? res.status : 0;
  if (res && (res.ok || status === 206)) return { readable: true, status, message: '' };
  if (status === 401 || status === 403 || status === 404) return { readable: false, status, message: warn(status) };
  return { readable: null, status, message: '' };         // other/opaque → unknown
}

// ── Worker upload route (bypasses the S3 endpoint) ──────────────────────────
// Recommended when <acct>.r2.cloudflarestorage.com is broken/blocked: PUT the file to
// the Cloudflare Worker (cloudflare/r2-upload-worker), which writes it to the bucket via
// an R2 binding. No SigV4, no aws4fetch — just a Bearer secret + the object key header.
//
// `worker` = { url, secret }; `publicBase` is the bucket's public URL (reused from the R2
// fields — required to form the playable src). `fetchImpl` is injected so tests assert
// URL/headers/key without a real call. Returns { url, key }. Throws (status attached on
// an HTTP error; a network throw is re-thrown with kind:'blocked' for classifyR2Error).
export function validateWorkerConfig({ worker, publicBase } = {}) {
  const w = worker || {};
  const cfg = { url: trimSlash(w.url), secret: String(w.secret == null ? '' : w.secret).trim(), publicBase: trimSlash(publicBase) };
  const errors = [];
  if (!cfg.url) errors.push('Worker URL is required (the *.workers.dev address from `wrangler deploy`)');
  else if (!/^https?:\/\//i.test(cfg.url)) errors.push('Worker URL must start with https://');
  if (!cfg.secret) errors.push('Worker secret is required (the UPLOAD_SECRET you set on the Worker)');
  if (!cfg.publicBase) errors.push('publicBase is required (the public URL your bucket serves objects from)');
  else if (!/^https?:\/\//i.test(cfg.publicBase)) errors.push('publicBase must start with https://');
  return { ok: errors.length === 0, errors, config: cfg };
}

export async function uploadViaWorker({ fetchImpl, file, worker, publicBase, key, onProgress } = {}) {
  const { ok, errors, config: cfg } = validateWorkerConfig({ worker, publicBase });
  if (!ok) throw Object.assign(new Error('Worker not configured: ' + errors.join('; ')), { kind: 'config' });
  if (!file) throw Object.assign(new Error('No file selected.'), { kind: 'config' });
  const doFetch = fetchImpl || (typeof fetch !== 'undefined' ? fetch : null);
  if (!doFetch) throw Object.assign(new Error('No fetch available.'), { kind: 'config' });
  const objKey = key || r2Key(file.name);
  const contentType = contentTypeFor(file);
  if (onProgress) onProgress(0.05, 'Uploading…');
  let res;
  try {
    res = await doFetch(cfg.url, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${cfg.secret}`, 'X-Key': objKey, 'content-type': contentType },
      body: file,
    });
  } catch (err) {
    throw Object.assign(err instanceof Error ? err : new Error(String(err)), { kind: 'blocked' });
  }
  if (!res.ok) {
    const detail = await (res.text ? res.text().catch(() => '') : Promise.resolve(''));
    throw Object.assign(new Error(`Worker upload failed: ${res.status}`), { status: res.status, detail });
  }
  if (onProgress) onProgress(1, 'Done');
  return { url: `${cfg.publicBase}/${objKey}`, key: objKey };
}

// ── Worker image route (free text-to-image) ─────────────────────────────────
// The SAME Worker (cloudflare/r2-upload-worker) also runs Cloudflare Workers AI's free
// FLUX.1-schnell model on POST /image (Bearer secret), so the Studio gets free image
// generation in BOTH modes with NO extra config — it reuses the Worker url+secret.
// publicBase is NOT needed here (the image comes back as base64, it isn't stored).
//
// These helpers are PURE (no DOM, no network): config check, request build, response parse.
// The network call lives in seams/r2.js (image()). Returns { base64, mimeType }.

// True iff a Worker URL + secret are present — enough to call /image (publicBase not needed).
export function isImageWorkerConfigured({ url, secret } = {}) {
  return !!(trimSlash(url) && String(secret == null ? '' : secret).trim());
}

// Build the { url, init } for a POST /image call. Throws (kind:'config') if not configured.
export function buildImageRequest({ worker, prompt } = {}) {
  const w = worker || {};
  const base = trimSlash(w.url);
  const secret = String(w.secret == null ? '' : w.secret).trim();
  const p = String(prompt == null ? '' : prompt).trim();
  if (!base || !secret) throw Object.assign(new Error('Image Worker not configured: set the Worker URL + secret in Settings.'), { kind: 'config' });
  if (!p) throw Object.assign(new Error('Give me a prompt to work with.'), { kind: 'config' });
  return {
    url: `${base}/image`,
    init: {
      method: 'POST',
      headers: { Authorization: `Bearer ${secret}`, 'content-type': 'application/json' },
      body: JSON.stringify({ prompt: p }),
    },
  };
}

// Normalise the Worker /image JSON into { base64, mimeType }. The Worker responds
// { image:<base64>, mimeType:'image/png' }; tolerate { base64 } as an alias. Throws a
// clear error when the payload carries no image (so the UI shows a useful message).
export function parseImageResponse(payload) {
  const p = payload || {};
  const base64 = typeof p.image === 'string' ? p.image : (typeof p.base64 === 'string' ? p.base64 : '');
  if (!base64) {
    const err = (p && typeof p.error === 'string' && p.error) ? p.error : 'No image came back — try a different prompt.';
    throw Object.assign(new Error(err), { kind: 'image' });
  }
  return { base64, mimeType: (typeof p.mimeType === 'string' && p.mimeType) || 'image/png' };
}

// Generate an image via the Worker /image route. `worker` = { url, secret }; `fetchImpl`
// injected so tests assert URL/headers/body without a real call. Returns { base64, mimeType }.
// Throws a friendly error (status attached on HTTP error; network throw → kind:'blocked').
export async function generateImageViaWorker({ fetchImpl, worker, prompt } = {}) {
  const { url, init } = buildImageRequest({ worker, prompt });
  const doFetch = fetchImpl || (typeof fetch !== 'undefined' ? fetch : null);
  if (!doFetch) throw Object.assign(new Error('No fetch available.'), { kind: 'config' });
  let res;
  try {
    res = await doFetch(url, init);
  } catch (err) {
    throw Object.assign(err instanceof Error ? err : new Error(String(err)), { kind: 'blocked' });
  }
  const payload = await (res.json ? res.json().catch(() => ({})) : Promise.resolve({}));
  if (!res.ok) {
    const detail = (payload && typeof payload.error === 'string' && payload.error) ? payload.error : `Worker image failed: ${res.status}`;
    throw Object.assign(new Error(detail), { status: res.status });
  }
  return parseImageResponse(payload);
}

// ── Worker list route (BYOK video library) ──────────────────────────────────
// The hosted/BYOK Studio has no Helm to ask for a video listing, so it asks the
// SAME Worker (GET /list, Bearer secret) which enumerates the bucket's videos/
// prefix via its R2 binding and returns { videos:[{ key, size, uploaded }] }.
//
// These helpers are PURE: parse the Worker JSON, derive a human title from an
// object key, and map each entry to the Studio's video-library shape. No DOM,
// no network — the network call lives in seams/r2.js (listR2Videos).

// A friendly title from an object key. Drops the videos/ prefix + the ts36-
// uniqueness stamp r2Key() prepends, strips the extension, and turns the slug
// back into spaced words. 'videos/0-my-clip.mp4' → 'my clip'. Never empty.
export function titleFromKey(key) {
  let base = String(key == null ? '' : key).trim();
  base = base.split(/[\\/]/).pop() || '';          // drop any directory part (videos/…)
  const dot = base.lastIndexOf('.');
  if (dot > 0) base = base.slice(0, dot);           // drop the extension
  base = base.replace(/^[0-9a-z]+-/i, '');          // drop the leading ts36- stamp, if present
  base = base.replace(/[-_]+/g, ' ').replace(/\s+/g, ' ').trim();
  return base || 'Video';
}

// Recognised web-video file extensions — used to filter the Worker /list (which
// returns every object under the videos/ prefix) down to actual playable videos,
// so stray non-video objects (e.g. a leftover .txt) never clutter the library.
const VIDEO_EXTS = new Set(['mp4', 'webm', 'mov', 'm4v', 'ogv', 'ogg', 'mkv', 'avi']);
export function isVideoKey(key) {
  const m = /\.([a-z0-9]+)$/i.exec(String(key == null ? '' : key).trim());
  return !!m && VIDEO_EXTS.has(m[1].toLowerCase());
}

// Parse the Worker /list JSON into a clean, newest-first array of { key, size,
// uploaded }. Tolerant of a bare array or { videos:[…] }; ignores entries with
// no key; coerces size to a number and uploaded to a string when present.
export function parseVideoList(payload) {
  const rows = Array.isArray(payload) ? payload
    : (payload && Array.isArray(payload.videos) ? payload.videos : []);
  const out = [];
  for (const r of rows) {
    if (!r || typeof r !== 'object') continue;
    const key = String(r.key == null ? '' : r.key).trim();
    if (!key) continue;
    if (!isVideoKey(key)) continue;   // skip stray non-video objects under the videos/ prefix
    const size = Number.isFinite(Number(r.size)) ? Number(r.size) : null;
    const uploaded = r.uploaded == null ? '' : String(r.uploaded);
    out.push({ key, size, uploaded });
  }
  // Newest first by uploaded; entries with no timestamp sink to the bottom.
  out.sort((a, b) => {
    const ta = Date.parse(a.uploaded) || 0;
    const tb = Date.parse(b.uploaded) || 0;
    return tb - ta;
  });
  return out;
}

// Map one parsed { key, … } entry to the video-library card shape the grid in
// index.html renders. publicBase + key → the share-anywhere URL. BYOK uploads
// carry no poster or duration (the Worker only knows the bucket), so posterUrl
// is '' (the grid then draws a tasteful placeholder tile) and durationS is null.
export function videoEntryFromKey(entry, publicBase) {
  const base = trimSlash(publicBase);
  const key = (entry && entry.key) ? String(entry.key) : '';
  const src = base && key ? `${base}/${key}` : '';
  return {
    src,
    publicUrl: src,
    title: titleFromKey(key),
    posterUrl: '',
    durationS: null,
    local: false,
    ...(entry && entry.size != null ? { size: entry.size } : {}),
    ...(entry && entry.uploaded ? { uploaded: entry.uploaded } : {}),
  };
}

// Whole-listing convenience: parse → map → array of library entries. Pure.
export function mapVideoLibrary(payload, publicBase) {
  return parseVideoList(payload).map((e) => videoEntryFromKey(e, publicBase));
}
