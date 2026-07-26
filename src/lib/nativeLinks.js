// Pure helpers for the native (Tauri iOS/Android/desktop) external-link opener. Kept in
// their own dependency-free module so they can be unit-tested without pulling in app.js's
// browser-only import graph. Everything here is a no-op signal on the hosted web build.

// True only inside the Tauri native wrappers, which serve the app from a custom protocol
// (tauri://localhost) or from http://tauri.localhost. On the hosted web build this is always
// false, so every behaviour gated on it is a strict no-op on the web.
export function isNativeOrigin(loc) {
  if (!loc) return false;
  return loc.protocol === 'tauri:' || /(^|\.)tauri\.localhost$/i.test(loc.hostname || '');
}

// Viewport <meta content> for the current origin. The web build keeps the base content
// verbatim so ALL web browsers retain pinch-zoom (Android Chrome honours user-scalable=no,
// which would remove accessibility zoom on the website). On a native origin the zoom lock
// (maximum-scale=1, user-scalable=no) is appended so the WKWebView/WebView2 wrapper can't be
// zoomed and feels like an app. Idempotent — never appends the lock twice. Pure.
export function viewportContentFor(loc, base) {
  const content = String(base || 'width=device-width, initial-scale=1, viewport-fit=cover');
  if (!isNativeOrigin(loc)) return content;
  if (/user-scalable\s*=\s*no/i.test(content)) return content; // already locked
  return content + ', maximum-scale=1, user-scalable=no';
}

// External-link classifier. Given an anchor's href (absolute or relative) and the current
// location, return the absolute http(s) URL that should be handed to the system browser, or
// null to leave the click to the webview. A link is "external" when it is an http(s) URL to
// a DIFFERENT origin than the app's own (which, on native, is the tauri host) — this covers
// the onboarding "Create one" (github.com/signup), the device-flow "Open GitHub"
// (github.com/login/device) and the two repo/Pages links, all of which the webview would
// otherwise silently drop. Same-origin, relative, in-page (#), mailto:, tel:, blob:, data:
// and tauri: links all return null so they keep behaving natively. Pure.
export function externalUrlToOpen(href, loc) {
  if (!href || !loc) return null;
  let u;
  try { u = new URL(href, loc.href); } catch { return null; }
  if (u.protocol !== 'http:' && u.protocol !== 'https:') return null;
  let selfOrigin;
  try { selfOrigin = new URL(loc.href).origin; } catch { selfOrigin = loc.origin; }
  if (u.origin === selfOrigin) return null;
  return u.href;
}
