// Remote-Helm seam — turns the hosted Studio into a thin client of the owner's
// LOCAL Helm over a Cloudflare tunnel. When the user picks "Connect to my Helm"
// and saves a tunnel URL + admin token, every Studio api() call is a real fetch
// to ${baseUrl}/studio/api/${path} with the X-Admin-Token header. The laptop's
// Helm does the GitHub/AI work server-side — secrets never leave the laptop, and
// the phone sees the laptop's REAL state (drafts, partner sessions, posts).
//
// Factory takes a fetch impl so it's unit-testable with a stub.

const join = (base, path) => `${base}/studio/api${path.startsWith('/') ? '' : '/'}${path}`;

export function makeRemote(getRemoteHelm, fetchImpl) {
  const f = fetchImpl || (typeof fetch !== 'undefined' ? fetch.bind(globalThis) : null);
  // Mirrors the index.html api() shim's contract: returns parsed JSON, or throws
  // an Error carrying .status (so classifyError() shows the friendly dialog).
  async function request(path, opts = {}) {
    const { baseUrl, token } = getRemoteHelm();
    if (!baseUrl || !token) { const e = new Error('Remote Helm not configured'); e.status = 0; throw e; }
    if (!f) { const e = new Error('fetch unavailable'); e.status = 0; throw e; }
    let r;
    // A FormData body (e.g. the Helm-mode video upload) MUST keep the browser's own
    // multipart Content-Type (it carries the boundary) — never force application/json,
    // or the multipart parse on the remote Helm fails silently.
    const isForm = (typeof FormData !== 'undefined') && (opts.body instanceof FormData);
    const baseHeaders = isForm ? {} : { 'Content-Type': 'application/json' };
    try {
      r = await f(join(baseUrl, path), {
        ...opts,
        headers: { ...baseHeaders, ...(opts.headers || {}), 'X-Admin-Token': token },
      });
    } catch (err) {
      // Network / CORS / offline — no response object. Surface as a status-less error.
      const e = new Error(err && err.message ? err.message : 'Network error'); e.status = 0; e.cause = err; throw e;
    }
    const j = await r.json().catch(() => ({}));
    if (!r.ok) { const e = new Error((j && j.error) || `HTTP ${r.status}`); e.status = r.status; e.payload = j; throw e; }
    return j;
  }
  // Lightweight health probe for the "Test connection" button. Hits an admin-gated
  // read (GET /posts): 200 ⇒ url + token both good; 401 ⇒ bad token; else ⇒ unreachable.
  async function test() {
    try { await request('/posts', { method: 'GET' }); return { ok: true }; }
    catch (e) {
      if (e.status === 401) return { ok: false, reason: 'auth', message: 'Admin token rejected — check the token.' };
      if (e.status === 0) return { ok: false, reason: 'network', message: 'Could not reach that URL — is Helm running and the tunnel up? (CORS/offline)' };
      return { ok: false, reason: 'server', message: e.message || 'Connection failed.' };
    }
  }
  return { request, test };
}
