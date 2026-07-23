// Licence-gate public key — the Ed25519 verify key baked into the Studio at build
// time (window.__LICENCE_PUBLIC_KEY in index.html). Lifted from helm/server/licence.js
// as a bare constant so build.mjs's drift guard doesn't drag in @noble/ed25519 (a
// server-only dependency). Keep this value identical to the inline key in src/index.html.
export const PUBLIC_KEY = '';
