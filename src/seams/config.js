// Config seam — the user's repo coordinates + BYOK tokens, stored only in their browser.
// Factory takes a localStorage-shaped object so tests can inject a fake.
//
// Single mode (BYOK) — the user's GitHub + AI keys live only in this browser and
// the client-side router (window.__studioApi) does the GitHub/AI work locally.
const KEY = 'helm.studio.config.v1';

const trimSlash = (u) => (u || '').trim().replace(/\/+$/, '');

// A full localStorage quota (or a Safari private-mode write) makes setItem throw. Left
// unhandled that means the user's keys/settings silently fail to persist. Detect the quota
// error and signal the UI (a 'studio:storage-full' window event the app turns into a toast)
// so the failure is visible; then re-throw so callers can react exactly as before.
const isQuotaError = (e) => !!e && (e.name === 'QuotaExceededError' || e.name === 'NS_ERROR_DOM_QUOTA_REACHED' || e.code === 22 || e.code === 1014);
function signalStorageFull(e) {
  try { if (typeof window !== 'undefined' && window.dispatchEvent) window.dispatchEvent(new CustomEvent('studio:storage-full')); } catch {}
}
function setItemSafe(ls, key, value) {
  try { ls.setItem(key, value); }
  catch (e) { if (isQuotaError(e)) signalStorageFull(e); throw e; }
}

export function makeConfig(ls) {
  const read = () => { try { return JSON.parse(ls.getItem(KEY)) || {}; } catch { return {}; } };
  return {
    all: read,
    save(patch) { const c = { ...read(), ...patch }; setItemSafe(ls, KEY, JSON.stringify(c)); return c; },
    clear() { ls.removeItem(KEY); },
    getGithub() { const c = read(); return { owner: c.ghOwner || '', repo: c.ghRepo || '', branch: c.ghBranch || 'main', token: c.ghToken || '' }; },
    getAi() { const c = read(); return { provider: c.aiProvider || 'anthropic', key: c.aiKey || '', model: c.aiModel || '' }; },

    // --- author / voice profile (drives every AI prompt) ---
    // Stored under config.profile (browser-only, no secrets). null until the user
    // answers onboarding or edits it in Settings → an undefined profile lets the
    // studio engines fall back to their generic, non-medical DEFAULT_PROFILE.
    getProfile() { const p = read().profile; return (p && typeof p === 'object') ? p : null; },
    saveProfile(profile) { return this.save({ profile: { ...(this.getProfile() || {}), ...(profile || {}) } }); },
    hasProfile() { const p = this.getProfile(); return !!(p && (p.name || p.role || p.writesAbout)); },
    isConfigured() { const g = this.getGithub(); return !!(g.owner && g.repo && g.token); }, // AI key optional — only needed for AI features

    // --- device-flow auth (a nicer way to obtain the SAME browser-only token as BYOK) ---
    // The OAuth user token is used exactly like the PAT (Bearer to api.github.com), so it
    // lives under ghToken and the data path stays BYOK. We just record how it arrived + who.
    saveDeviceAuth({ token, login }) { return this.save({ mode: 'byok', ghToken: token || '', ghLogin: login || '', ghAuthMethod: 'device' }); },
    saveRepo({ owner, repo, branch }) { return this.save({ ghOwner: owner || '', ghRepo: repo || '', ghBranch: branch || 'main' }); },
    getGithubUser() { const c = read(); return { login: c.ghLogin || '', method: c.ghAuthMethod || (c.ghToken ? 'token' : '') }; },
    signOut() { return this.save({ ghOwner: '', ghRepo: '', ghToken: '', ghLogin: '', ghAuthMethod: '' }); },

    // --- BYOK direct-to-R2 media (self-host a video on YOUR own Cloudflare R2) ---
    // Stored under config.r2 — keys live only in this browser, treated like ghToken.
    // Independent of Helm: the video block shows "Upload to R2" whenever these are set,
    // even in pure-BYOK mode with no Helm reachable. secretAccessKey is browser-only.
    getR2() { const r = (read().r2) || {}; return { endpoint: r.endpoint || '', bucket: r.bucket || '', accessKeyId: r.accessKeyId || '', secretAccessKey: r.secretAccessKey || '', publicBase: r.publicBase || '' }; },
    saveR2(r2) {
      const cur = this.getR2();
      // Empty secret on save = "keep the stored one" (mirrors write-only key fields elsewhere).
      const secretAccessKey = (r2.secretAccessKey || '').trim() || cur.secretAccessKey;
      // Preserve the Worker sub-key — saving the S3 fields must not drop the Worker route.
      const worker = ((read().r2) || {}).worker;
      const next = { endpoint: trimSlash(r2.endpoint), bucket: (r2.bucket || '').trim(), accessKeyId: (r2.accessKeyId || '').trim(), secretAccessKey, publicBase: trimSlash(r2.publicBase) };
      if (worker) next.worker = worker;
      return this.save({ r2: next });
    },
    clearR2() { return this.save({ r2: {} }); },
    isR2Configured() { const r = this.getR2(); return !!(r.endpoint && r.bucket && r.accessKeyId && r.secretAccessKey && r.publicBase); },

    // --- Worker upload route (recommended when the S3 endpoint is blocked/broken) ---
    // Stored under config.r2.worker. The video block uploads to a Cloudflare Worker
    // (cloudflare/r2-upload-worker) which writes to the SAME bucket via an R2 binding,
    // dodging the broken <acct>.r2.cloudflarestorage.com S3 host entirely. Needs the
    // Worker URL + the shared secret here; publicBase is reused from the R2 fields.
    getR2Worker() { const w = ((read().r2) || {}).worker || {}; return { url: w.url || '', secret: w.secret || '' }; },
    saveR2Worker(w) {
      const cur = this.getR2Worker();
      const secret = (w.secret || '').trim() || cur.secret; // blank = keep stored (write-only)
      const r2 = (read().r2) || {};
      return this.save({ r2: { ...r2, worker: { url: trimSlash(w.url), secret } } });
    },
    clearR2Worker() { const r2 = { ...((read().r2) || {}) }; delete r2.worker; return this.save({ r2 }); },
    // True iff a Worker URL + secret are set AND publicBase is present (needed to form the src).
    isR2WorkerConfigured() { const w = this.getR2Worker(); const r = this.getR2(); return !!(w.url && w.secret && r.publicBase); },

    // Ready to boot once the user's GitHub repo + token are configured (BYOK).
    isReady() { return this.isConfigured(); },
  };
}

const noopLS = { getItem: () => null, setItem() {}, removeItem() {} };
export const config = makeConfig(typeof window !== 'undefined' && window.localStorage ? window.localStorage : noopLS);
