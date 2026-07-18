// GitHub seam — browser-direct REST client using the user's token (CORS-supported).
// Mirrors what core/posts.js needs from the old server/github.js. No server, no config-at-rest.
const API = 'https://api.github.com';
const enc = (p) => String(p).split('/').map(encodeURIComponent).join('/');

// UTF-8-safe base64 (browser btoa is latin1-only; Node fallback for tests)
const toB64 = (s) => {
  const bytes = new TextEncoder().encode(s);
  if (typeof btoa !== 'undefined') { let bin = ''; bytes.forEach(c => (bin += String.fromCharCode(c))); return btoa(bin); }
  return Buffer.from(bytes).toString('base64');
};
const fromB64 = (b64) => {
  const clean = String(b64 || '').replace(/\s/g, '');
  const bin = typeof atob !== 'undefined' ? atob(clean) : Buffer.from(clean, 'base64').toString('binary');
  return new TextDecoder().decode(Uint8Array.from(bin, c => c.charCodeAt(0)));
};

export function makeGithub(gh, fetchImpl = fetch) {
  const headers = () => ({ Authorization: `Bearer ${gh.token}`, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' });
  const repoBase = `${API}/repos/${gh.owner}/${gh.repo}`;
  const base = `${repoBase}/contents`;
  async function err(res) { let m = `GitHub ${res.status}`; try { const j = await res.json(); m = j.message || m; } catch {} return Object.assign(new Error(m), { status: res.status }); }
  async function gj(url, opts) { const res = await fetchImpl(url, { ...opts, headers: headers() }); if (!res.ok) throw await err(res); return res.json(); }
  return {
    async getFile(path) {
      const res = await fetchImpl(`${base}/${enc(path)}?ref=${gh.branch}`, { headers: headers() });
      if (res.status === 404) return null;
      if (!res.ok) throw await err(res);
      const j = await res.json();
      return { sha: j.sha, content: fromB64(j.content) };
    },
    async putFile(path, content, message, sha) {
      const res = await fetchImpl(`${base}/${enc(path)}`, { method: 'PUT', headers: headers(),
        body: JSON.stringify({ message, content: toB64(content), branch: gh.branch, ...(sha ? { sha } : {}) }) });
      if (!res.ok) throw await err(res);
      return { commit: (await res.json()).commit?.sha };
    },
    async putBinaryB64(path, b64, message, sha) {
      const res = await fetchImpl(`${base}/${enc(path)}`, { method: 'PUT', headers: headers(),
        body: JSON.stringify({ message, content: String(b64).replace(/\s/g, ''), branch: gh.branch, ...(sha ? { sha } : {}) }) });
      if (!res.ok) throw await err(res);
      return { commit: (await res.json()).commit?.sha };
    },
    async deleteFile(path, message, sha) {
      const res = await fetchImpl(`${base}/${enc(path)}`, { method: 'DELETE', headers: headers(),
        body: JSON.stringify({ message, branch: gh.branch, sha }) });
      if (!res.ok) throw await err(res);
      return true;
    },
    async listDir(path) {
      const res = await fetchImpl(`${base}/${enc(path)}?ref=${gh.branch}`, { headers: headers() });
      if (res.status === 404) return [];
      if (!res.ok) throw await err(res);
      const j = await res.json();
      return Array.isArray(j) ? j.map(e => ({ name: e.name, path: e.path, sha: e.sha, type: e.type })) : [];
    },
    async getBinary(path) {
      const res = await fetchImpl(`${base}/${enc(path)}?ref=${gh.branch}`, { headers: headers() });
      if (res.status === 404) return null;
      if (!res.ok) throw await err(res);
      const j = await res.json();
      // The Contents API inlines base64 only for files under 1MB. For 1–100MB blobs it
      // returns content:"" with encoding:"none" (and >100MB errors) — so returning
      // j.content blindly hands callers an EMPTY blob and silently corrupts the image on
      // the next commit. When the content isn't inlined, fetch the real bytes via the Git
      // Blobs API using the sha (base64-encoded, no size cap on read). Same { base64, sha }.
      const inlined = (j.content || '').replace(/\s/g, '');
      if (j.encoding !== 'none' && (inlined || !(j.size > 0))) return { base64: inlined, sha: j.sha };
      const blob = await gj(`${repoBase}/git/blobs/${j.sha}`);
      return { base64: String(blob.content || '').replace(/\s/g, ''), sha: j.sha };
    },
    // List every committed file under a directory prefix in ONE recursive git-trees call.
    // Filters the tree to blobs under `prefix`. Returns [{ path, size }]. Empty if absent.
    async listTree(prefix) {
      const ref = await gj(`${repoBase}/git/ref/heads/${gh.branch}`);
      const treeSha = ref && ref.object && ref.object.sha;
      if (!treeSha) return [];
      const tree = await gj(`${repoBase}/git/trees/${treeSha}?recursive=1`);
      if (!tree || !Array.isArray(tree.tree)) return [];
      const pfx = String(prefix || '').replace(/\/+$/, '') + '/';
      return tree.tree.filter((e) => e.type === 'blob' && e.path.startsWith(pfx)).map((e) => ({ path: e.path, size: e.size || 0 }));
    },
    // atomic multi-file commit via the Git Data API.
    // changes: [{ path, content?:string, base64?:string, delete?:true }]
    async commitMany(changes, message) {
      const ref = await gj(`${repoBase}/git/ref/heads/${gh.branch}`);
      const baseCommitSha = ref.object.sha;
      const baseCommit = await gj(`${repoBase}/git/commits/${baseCommitSha}`);
      const tree = [];
      for (const c of changes) {
        if (c.delete) { tree.push({ path: c.path, mode: '100644', type: 'blob', sha: null }); continue; }
        const enc2 = c.base64 != null ? 'base64' : 'utf-8';
        const content = c.base64 != null ? String(c.base64).replace(/\s/g, '') : c.content;
        const blob = await gj(`${repoBase}/git/blobs`, { method: 'POST', body: JSON.stringify({ content, encoding: enc2 }) });
        tree.push({ path: c.path, mode: '100644', type: 'blob', sha: blob.sha });
      }
      const newTree = await gj(`${repoBase}/git/trees`, { method: 'POST', body: JSON.stringify({ base_tree: baseCommit.tree.sha, tree }) });
      const newCommit = await gj(`${repoBase}/git/commits`, { method: 'POST', body: JSON.stringify({ message, tree: newTree.sha, parents: [baseCommitSha] }) });
      await gj(`${repoBase}/git/refs/heads/${gh.branch}`, { method: 'PATCH', body: JSON.stringify({ sha: newCommit.sha }) });
      return { commit: newCommit.sha };
    },
    // The signed-in user's OWN repos, newest first — for the device-flow repo picker.
    // Uses only the token (owner/repo not needed). Browser-direct (api.github.com sends CORS).
    async listRepos() {
      const j = await gj(`${API}/user/repos?per_page=100&affiliation=owner&sort=updated`);
      return (Array.isArray(j) ? j : []).map((r) => ({
        fullName: r.full_name, name: r.name, owner: r.owner && r.owner.login,
        branch: r.default_branch || 'main', private: !!r.private,
      }));
    },
    // Who the current token belongs to — for "Signed in as @login".
    async whoami() {
      const j = await gj(`${API}/user`);
      return { login: j.login, name: j.name, avatar: j.avatar_url };
    },
    // Create a new repo from a template repo (the "build your own blog" path).
    // Browser-direct (api.github.com sends CORS). The new repo is PUBLIC by default.
    async generateFromTemplate({ templateOwner, templateRepo, owner, name, description = '', isPrivate = false }) {
      const j = await gj(`${API}/repos/${enc(templateOwner)}/${enc(templateRepo)}/generate`, {
        method: 'POST',
        body: JSON.stringify({ owner, name, description, include_all_branches: false, private: !!isPrivate }),
      });
      return { fullName: j.full_name, name: j.name, owner: j.owner && j.owner.login, branch: j.default_branch || 'main', htmlUrl: j.html_url };
    },
    // Turn on GitHub Pages with Source = GitHub Actions. Idempotent: POST creates,
    // a 409 (already enabled) falls back to PUT. Returns the Pages URL (may be null until built).
    async enablePages({ owner, repo }) {
      const url = `${API}/repos/${enc(owner)}/${enc(repo)}/pages`;
      const body = JSON.stringify({ build_type: 'workflow' });
      let res = await fetchImpl(url, { method: 'POST', headers: headers(), body });
      if (res.status === 409) res = await fetchImpl(url, { method: 'PUT', headers: headers(), body });
      if (!res.ok && res.status !== 409) throw await err(res);
      const j = await res.json().catch(() => ({}));
      return { url: j.html_url || null, built: !!(j.status && j.status !== 'null') };
    },
    // Point a repo's GitHub Pages site at a custom domain: PUT /repos/{owner}/{repo}/pages
    // with { cname }. Idempotent — re-setting the same domain is a no-op success. If Pages
    // isn't enabled yet (404), enable it (Source = Actions) then retry once. A 422 for a
    // CNAME that's already configured on this repo is treated as success. Returns
    // { ok, alreadySet } so the UI can phrase the result kindly. Only throws on a genuine
    // failure (bad token, or the domain already taken by a DIFFERENT repo).
    async setPagesDomain({ owner, repo, cname }) {
      const url = `${API}/repos/${enc(owner)}/${enc(repo)}/pages`;
      const body = JSON.stringify({ cname });
      const put = () => fetchImpl(url, { method: 'PUT', headers: headers(), body });
      let res = await put();
      if (res.status === 404) {
        // Pages not turned on yet — enable with the Actions builder, then retry the cname PUT.
        await this.enablePages({ owner, repo }).catch(() => {});
        res = await put();
      }
      if (res.ok || res.status === 204) return { ok: true, alreadySet: false };
      if (res.status === 422) {
        // 422 is ambiguous: it's benign ONLY when the domain is already set on THIS repo
        // ("taken by your site" / "already set" / "is the same"). GitHub uses the SAME status
        // for a domain that's "already taken" by a DIFFERENT user's repo — that MUST surface
        // as a failure, never a false success. So a plain "already taken" (i.e. NOT "…by your
        // site") always throws; only the this-repo phrasings return ok.
        const e = await err(res);
        const msg = e.message || '';
        if (/already taken/i.test(msg) && !/taken by your site/i.test(msg)) throw e;
        if (/taken by your site|already set|is the same/i.test(msg)) return { ok: true, alreadySet: true };
        throw e;
      }
      throw await err(res);
    },
    // Read the repo's GitHub Pages state — for the custom-domain "verify" check. Returns the
    // parsed JSON (incl. { cname, status, https_enforced, https_certificate }) or null when
    // Pages isn't enabled yet (404). The pure interpreter is core/domain.js pagesDomainStatus.
    async getPages({ owner, repo }) {
      const res = await fetchImpl(`${API}/repos/${enc(owner)}/${enc(repo)}/pages`, { headers: headers() });
      if (res.status === 404) return null;
      if (!res.ok) throw await err(res);
      return res.json();
    },
  };
}
