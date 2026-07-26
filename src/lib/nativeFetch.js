// Native-only fetch bridge for the Tauri iOS/Android/desktop wrappers.
//
// WHY: the native wrappers serve the app from a custom scheme — tauri://localhost (iOS/macOS)
// or http://tauri.localhost (Android/Windows). WKWebView (iOS/macOS) will not complete a
// webview `fetch()` from that custom-scheme page origin to a remote host: the request fails at
// the network layer regardless of the server's CORS headers. (Every host Chapbook calls —
// api.github.com, the AI providers, the device-flow relay — actually returns an
// Access-Control-Allow-Origin that PERMITS the tauri origin, so this is NOT a server-CORS
// rejection and NOT a CSP block; connect-src already lists them.) The net effect is that
// "Create my blog", "use existing repo", AI drafting and device-flow sign-in all silently fail
// on native even though they work on the hosted web build.
//
// FIX: install a native-ONLY `window.fetch` wrapper that routes absolute, cross-origin http(s)
// requests through the Rust HTTP client (tauri-plugin-http), which runs OUTSIDE the webview and
// is not subject to CORS or the custom-scheme limitation. Same-origin and relative requests —
// and EVERY request on the hosted web build — pass through the original `fetch` untouched. On
// the web `isNativeOrigin(location)` is false, so nothing is installed: a genuine no-op there.
//
// The wrapper faithfully forwards method, ALL headers (Authorization, x-api-key,
// anthropic-version, anthropic-dangerous-direct-browser-access, x-goog-api-key, content-type,
// …) and body via the plugin's spec-compatible fetch, and returns a real streamed `Response`
// (the plugin streams the body over an IPC Channel), so callers that read `.text()`/`.json()`
// OR stream `.body` both work.
//
// REQUEST INPUTS: aws4fetch's AwsClient.fetch() — the BYOK direct-to-R2 S3 upload (src/seams/r2.js
// → src/core/r2.js uploadToR2) — calls the global fetch with a signed `Request` OBJECT, not a URL
// string. Without special handling that Request would fall through to the blocked webview fetch and
// the R2 upload would silently fail on native. So the bridge also classifies a Request (by its
// absolute `.url`) and, when it's bridgeable, unwraps it — method, ALL headers (incl. the SigV4
// `Authorization` + `x-amz-*`) and the body via `request.clone().arrayBuffer()` for non-GET/HEAD —
// before handing it to the Tauri http fetch, so that upload leaves the webview too. The body read
// is async, but it happens INSIDE the returned promise; the string/URL fast path is untouched.

import { isNativeOrigin } from './nativeLinks.js';

// PURE. Given a fetch `input` (string, URL or Request) and the current `location`, return the
// absolute URL string that should be routed through the native HTTP bridge, or null to leave the
// request to the original fetch. A request is bridged ONLY when we're on a native origin AND the
// resolved URL is an absolute http(s) URL to a DIFFERENT origin than the app's own (the tauri
// host). A `Request` object is classified by its absolute `.url` (this is the aws4fetch direct-R2
// upload path). Same-origin, relative, data:/blob:/tauri:/mailto: and un-classifiable inputs return
// null so bundled assets and in-app resources keep loading natively. Injectable `loc` for tests.
export function bridgeTarget(input, loc) {
  if (!loc || !isNativeOrigin(loc)) return null;          // web build → never bridge
  const href = urlString(input);
  if (href == null) return null;                          // Request object / unusable input → skip
  let u;
  try { u = new URL(href, loc.href); } catch { return null; }
  if (u.protocol !== 'http:' && u.protocol !== 'https:') return null; // data:/blob:/tauri: → skip
  let selfOrigin;
  try { selfOrigin = new URL(loc.href).origin; } catch { selfOrigin = loc.origin; }
  if (u.origin === selfOrigin) return null;               // same-origin asset/API → native fetch
  return u.href;                                          // external absolute URL → bridge it
}

// Extract a URL string from a fetch `input` for CLASSIFICATION. Plain strings, URL objects AND
// Request objects are classified (a Request exposes an absolute `.url`). Classification stays
// SYNCHRONOUS — only the URL is read here; a Request's headers/body are unwrapped later (in the
// bridged wrapper, and only when the request is actually going to be bridged — see `requestInit`).
// aws4fetch's AwsClient.fetch() reaches the global fetch with a signed `Request`, so classifying it
// is exactly what lets the direct-to-R2 S3 upload route through the Rust bridge on native. Anything
// else returns null so it passes through to the original fetch untouched.
function urlString(input) {
  if (typeof input === 'string') return input;
  if (typeof URL !== 'undefined' && input instanceof URL) return input.href;
  if (isRequest(input) && typeof input.url === 'string') return input.url;
  return null;
}

// True iff `input` is a Fetch `Request`. Guarded so it never throws where `Request` is undefined.
function isRequest(input) {
  return typeof Request !== 'undefined' && input instanceof Request;
}

// Unwrap a Request into a plain `init` the Tauri http fetch can re-issue against the (already
// absolute) target URL. ASYNC because reading the body is async: clone the Request first so the
// original stays intact for a fallback, then read the body as an ArrayBuffer for non-GET/HEAD
// methods — the EXACT signed bytes, so aws4fetch's SigV4 signature stays valid. ALL headers are
// copied verbatim (aws4fetch's `Authorization`, `x-amz-date`, `x-amz-content-sha256`,
// `content-type`, …). An explicit `init` (aws4fetch passes none) still wins, matching the
// fetch(request, init) override semantics. The signal is forwarded so aborts still propagate.
async function requestInit(request, init) {
  const method = request.method || 'GET';
  const headers = {};
  try {
    if (request.headers && typeof request.headers.forEach === 'function') {
      request.headers.forEach((value, key) => { headers[key] = value; });
    }
  } catch { /* headers unreadable → send none rather than throw */ }
  const out = { method, headers };
  const m = String(method).toUpperCase();
  if (m !== 'GET' && m !== 'HEAD') {
    const buf = await request.clone().arrayBuffer();       // exact signed payload bytes
    if (buf && buf.byteLength) out.body = buf;
  }
  if (request.signal) out.signal = request.signal;
  return init ? Object.assign(out, init) : out;
}

// Install the bridge on `win`, guarded by isNativeOrigin(loc). SYNCHRONOUS: it replaces
// `win.fetch` immediately (so seams that capture `fetchImpl = fetch` at construction pick up the
// bridged function), while the actual Tauri fetch is loaded LAZILY on the first bridged request
// via `loadTauriFetch` (a `() => Promise<fetchFn>`, e.g. `() => import('@tauri-apps/plugin-http')
// .then(m => m.fetch)`). Keeping the import lazy means the plugin code never executes on the web.
//
// Returns true when the bridge is installed, false on the web build or bad args. Fully wrapped in
// try/catch so a failure here can NEVER break boot. On a classification error the request falls
// through to the original fetch; if the plugin fails to load, requests fall back to the original
// fetch (best effort — no worse than today) rather than being silently swallowed.
export function installNativeFetchBridge(win, loc, loadTauriFetch) {
  try {
    if (!win || !loc || !isNativeOrigin(loc)) return false;        // web → no-op
    if (typeof win.fetch !== 'function') return false;             // no fetch to wrap
    if (typeof loadTauriFetch !== 'function') return false;
    const original = win.fetch.bind(win);
    let pending = null;                                            // memoised plugin-fetch loader
    const load = () => (pending = pending || Promise.resolve().then(loadTauriFetch));
    win.fetch = function fetch(input, init) {
      let target = null;
      try { target = bridgeTarget(input, loc); } catch { target = null; }
      if (target == null) return original(input, init);            // same-origin/relative → native
      const req = isRequest(input);                                // Request input needs an async unwrap
      return load().then(
        (tf) => {
          if (typeof tf !== 'function') return original(input, init);
          if (!req) return tf(target, init);                       // string/URL fast path (unchanged)
          // Request input (e.g. aws4fetch's signed R2 PUT): unwrap url/method/headers/body. The
          // async body read happens INSIDE this returned promise, so the wrapper stays sync-safe.
          return requestInit(input, init).then(
            (reqInit) => tf(target, reqInit),
            () => original(input, init),                            // unwrap failed → best effort
          );
        },
        () => original(input, init),                               // plugin load failed → best effort
      );
    };
    return true;
  } catch { return false; }                                        // never break boot
}
