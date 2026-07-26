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

import { isNativeOrigin } from './nativeLinks.js';

// PURE. Given a fetch `input` (string or URL) and the current `location`, return the absolute
// URL string that should be routed through the native HTTP bridge, or null to leave the request
// to the original fetch. A request is bridged ONLY when we're on a native origin AND the
// resolved URL is an absolute http(s) URL to a DIFFERENT origin than the app's own (the tauri
// host). Same-origin, relative, data:/blob:/tauri:/mailto: and un-classifiable inputs return
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

// Extract a URL string from a fetch `input`. Only plain strings and URL objects are classified;
// a Request object (or anything else) returns null so it passes through to the original fetch —
// the app never fetches with a Request, and faithfully re-bridging one would mean cloning its
// body/headers/signal, which isn't worth the risk here.
function urlString(input) {
  if (typeof input === 'string') return input;
  if (typeof URL !== 'undefined' && input instanceof URL) return input.href;
  return null;
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
      return load().then(
        (tf) => (typeof tf === 'function' ? tf(target, init) : original(input, init)),
        () => original(input, init),                               // plugin load failed → best effort
      );
    };
    return true;
  } catch { return false; }                                        // never break boot
}
