// Entry — wires the browser seams + portable core into the client-side router and exposes
// window.__studioApi for the inline UI's api() shim. No server.
import { config } from './seams/config.js';
import { makeGithub } from './seams/github.js';
import { makeDeviceAuth } from './seams/deviceAuth.js';
import { makeAi } from './seams/ai.js';
import { makeRemote } from './seams/remote.js';
import { makeR2 } from './seams/r2.js';
import { storage } from './seams/storage.js';
import { makePosts } from './core/posts.js';
import * as partner from './core/partner.js';
import { makeRouter } from './router.js';
import * as studio from './lib/studio.js';
import * as playgrounds from './lib/playgrounds/index.js';
import * as figures from './lib/figures/registry.js';
import * as stencils from './lib/figures/stencils.js';
import * as stickers from './lib/figures/stickers.js';
import * as blocks from './lib/blocks.js';
import * as prepublish from './lib/prepublish.js';
import { templates } from './core/templates.js';
import * as domain from './core/domain.js';
import * as tour from './core/tour.js';
import * as quotes from './core/quotes.js';
import * as postCalendar from './core/postCalendar.js';
import * as shareIntents from './core/shareIntents.js';
import * as postList from './core/postList.js';

// Public OAuth Client ID + relay base, injected into dist/index.html at build (Task 5).
// Absent in the local server-backed Studio → device sign-in hides, PAT path only.
const GH_CLIENT_ID = (typeof window !== 'undefined' && window.__STUDIO_GH_CLIENT_ID) || '';
const RELAY_BASE = (typeof window !== 'undefined' && window.__STUDIO_RELAY_BASE) || '/.netlify/functions/gh-device';

export function buildApi() {
  const gh = makeGithub(config.getGithub());
  const ai = makeAi(config);
  const posts = makePosts(gh);
  const router = makeRouter({ posts, partner, ai, storage, studio, playgrounds, figures, stencils, stickers, blocks, prepublish, templates, config, gh });
  return router.api;
}

// Remote-Helm seam: when "Connect to my Helm" is configured, the index.html api()
// shim consults window.__studioRemote.active FIRST and does a real fetch to the
// laptop's tunnelled Helm — bypassing the BYOK client router entirely.
const remote = makeRemote(() => config.getRemoteHelm());
export function refreshRemote() {
  if (typeof window === 'undefined') return;
  window.__studioRemote = { active: config.isRemoteHelm(), request: remote.request, test: remote.test };
}

export function refresh() {
  if (typeof window === 'undefined') return;
  window.__studioApi = buildApi();
  window.__studioApiReady = true;
  // Darkroom uploader needs the GitHub seam DIRECTLY (read meta.json + one atomic binary
  // commit) — the api()/router surface is post-shaped, not a generic getFile/commitMany.
  // Expose a tiny BYOK-only handle alongside __studioApi. Only the contents methods the
  // uploader uses are surfaced. Absent/empty in remote-Helm mode (no repo token here).
  const gh = makeGithub(config.getGithub());
  window.__studioGh = {
    byok: config.isConfigured(),
    getFile: gh.getFile,
    commitMany: gh.commitMany,
    // listTree: read the post's existing _images/<slug>/ files so the uploader can dedupe new
    // filenames against what's already committed (never overwrite a prior photo) + show a true count.
    listTree: gh.listTree,
    // setPagesDomain: the Site-settings custom-domain panel commits a CNAME then calls this to
    // register the domain with the Pages API. Bound to gh so `this.enablePages` resolves.
    setPagesDomain: gh.setPagesDomain.bind(gh),
    // getPages: the custom-domain "verify" button reads the live Pages state (cname + cert)
    // so core/domain.js pagesDomainStatus can tell the user whether it's registered/live.
    getPages: gh.getPages,
    repo: () => { const g = config.getGithub(); return { owner: g.owner, repo: g.repo, branch: g.branch }; },
  };
  // BYOK direct-to-R2 video upload seam (aws4fetch, browser-signed). Independent of Helm —
  // the video block surfaces "Upload to R2" whenever R2 keys are configured here.
  window.__studioR2 = makeR2(config);
  refreshRemote();
}

// Onboarding/settings overlay — two connection modes:
//   • "This device only" (BYOK): keys live only in this browser.
//   • "Connect to my Helm": thin client of the laptop's local Helm over a tunnel.
export function renderOnboarding() {
  if (typeof document === 'undefined' || document.getElementById('byok-overlay')) return;
  const c = config.all();
  const r = config.getRemoteHelm();
  const startMode = config.isRemoteHelm() ? 'remote' : 'byok';

  // Manual owner/repo/branch/token fields — the power-user PAT path. Rendered exactly
  // once: inside the sign-in disclosure when a Client ID is injected, else directly.
  const manualFields = `
      <label>GitHub owner / repo</label>
      <div class="row"><input id="byok-owner" placeholder="owner" value="${c.ghOwner || ''}"><input id="byok-repo" placeholder="repo" value="${c.ghRepo || ''}"></div>
      <label>Branch</label><input id="byok-branch" placeholder="main" value="${c.ghBranch || 'main'}">
      <label>GitHub token (fine-grained, contents: read & write)</label><input id="byok-token" type="password" placeholder="github_pat_…" value="${c.ghToken || ''}">`;

  // Device-Flow sign-in block — only when a public OAuth Client ID was injected at build.
  // Manual fields collapse into the "Advanced" disclosure beneath it.
  const signinBlock = `
      <div id="gh-signin">
        <button type="button" id="gh-start">Sign in with GitHub</button>
        <div class="hint">Recommended — no token to create. GitHub shows a page where you type a short code.</div>
        <div class="no-gh">
          <span>No GitHub account? It's free, takes about 2 minutes.</span>
          <a href="https://github.com/signup" target="_blank" rel="noopener">Create one (free) →</a>
          <span class="no-gh-sub">It's just where your blog's files live — no coding. Once you've made it, come back here.</span>
          <a href="#" id="gh-have-account" class="no-gh-back">I've got one — continue ↑</a>
        </div>
        <div id="gh-codebox" style="display:none;margin-top:.8rem;text-align:center">
          <div class="hint" style="margin:0 0 .3rem">Enter this code on GitHub (copied for you):</div>
          <div id="gh-code" style="font:700 1.5rem/1 'Space Grotesk',monospace;letter-spacing:.18em;color:#f4f7fd"></div>
          <a id="gh-open" target="_blank" rel="noopener" style="display:inline-block;margin-top:.6rem;color:#22d3ee;text-decoration:underline">Open GitHub →</a>
          <div class="hint" id="gh-poll" style="margin-top:.4rem">Waiting for you to authorise…</div>
        </div>
        <div id="gh-create" style="display:none;margin-top:.9rem">
          <div class="cb-head">Create a new blog</div>
          <div class="hint" style="margin-top:.2rem">A fresh public repo from the blog template — pick a look and it builds itself. Recommended.</div>
          <label for="cb-name">Blog name</label>
          <input id="cb-name" placeholder="e.g. Bone Deep" autocomplete="off">
          <div class="row" style="margin-top:.2rem">
            <div>
              <label for="cb-theme">Theme</label>
              <select id="cb-theme">
                <optgroup label="Worlds">
                  <option value="observatory" selected>Observatory</option>
                  <option value="vista">Vista</option>
                  <option value="blueprint">Blueprint</option>
                  <option value="atlas">Atlas</option>
                  <option value="daybreak">Daybreak</option>
                  <option value="dune">Dune</option>
                  <option value="rivendell">Rivendell</option>
                </optgroup>
                <optgroup label="Simple blog">
                  <option value="paper">Paper</option>
                  <option value="linen">Linen</option>
                  <option value="mist">Mist</option>
                  <option value="ink">Ink</option>
                </optgroup>
                <optgroup label="Creative">
                  <option value="arcade">Arcade</option>
                  <option value="botanic">Botanic</option>
                  <option value="broadsheet">Broadsheet</option>
                  <option value="aurora">Aurora</option>
                </optgroup>
              </select>
            </div>
            <div>
              <label for="cb-core">Hero figure</label>
              <select id="cb-core">
                <option value="monogram">Monogram</option>
                <option value="tori" selected>Interlocked rings</option>
                <option value="armillary">Armillary sphere</option>
                <option value="star">Star</option>
              </select>
            </div>
          </div>
          <button type="button" id="cb-go" style="margin-top:.9rem">Create my blog</button>
          <div class="msg" id="cb-status"></div>
          <div class="cb-or">or use an existing repo</div>
        </div>
        <div id="gh-picker" style="display:none;margin-top:.9rem">
          <label>Choose the repo to write to</label>
          <select id="gh-repo-select"></select>
          <button type="button" id="gh-repo-use" class="ghost" style="margin-top:.8rem">Use this repo &amp; start</button>
          <div class="hint">Only public repos appear (sign-in grants <code>public_repo</code>). Need a private one? Use a token below.</div>
        </div>
        <details style="margin-top:1rem">
          <summary style="cursor:pointer;color:#aebbd2;font-size:.82rem">Advanced — use a GitHub token instead</summary>
          <div style="margin-top:.6rem">${manualFields}
          </div>
        </details>
      </div>`;

  const ov = document.createElement('div');
  ov.id = 'byok-overlay';
  ov.innerHTML = `
  <style>
    #byok-overlay{position:fixed;inset:0;z-index:9999;background:#04060c;display:grid;place-items:center;padding:1rem;
      font:15px/1.5 'Inter',system-ui,sans-serif;color:#f4f7fd;-webkit-backdrop-filter:blur(8px);backdrop-filter:blur(8px)}
    #byok-overlay .bc{width:min(440px,94vw);max-height:94vh;overflow:auto;background:linear-gradient(180deg,#0f1730,#0b1120);border:1px solid rgba(140,160,200,.18);
      border-radius:18px;padding:1.4rem 1.5rem;box-shadow:0 24px 70px rgba(0,0,0,.6)}
    #byok-overlay h2{font:700 1.25rem 'Space Grotesk',system-ui;margin:0 0 .2rem}
    #byok-overlay h2 b{background:linear-gradient(120deg,#2dd4bf,#22d3ee 55%,#818cf8);-webkit-background-clip:text;background-clip:text;color:transparent}
    #byok-overlay p{color:#aebbd2;font-size:.86rem;margin:.1rem 0 1rem}
    #byok-overlay label{display:block;font:600 .68rem 'Space Grotesk',system-ui;letter-spacing:.08em;text-transform:uppercase;color:#aebbd2;margin:.7rem 0 .25rem}
    #byok-overlay input,#byok-overlay select{width:100%;background:#080c16;border:1px solid rgba(140,160,200,.18);border-radius:10px;color:#f4f7fd;padding:.6em .7em;font:inherit}
    #byok-overlay input:focus,#byok-overlay select:focus{outline:none;border-color:#22d3ee;box-shadow:0 0 0 3px rgba(34,211,238,.22)}
    #byok-overlay .row{display:flex;gap:.5rem}#byok-overlay .row>*{flex:1}
    #byok-overlay button{width:100%;margin-top:1.1rem;border:0;border-radius:12px;padding:.8em;font:700 1rem 'Space Grotesk',system-ui;
      color:#042018;background:linear-gradient(95deg,#2dd4bf,#22d3ee);cursor:pointer}
    #byok-overlay button.ghost{margin-top:.6rem;background:transparent;border:1px solid rgba(140,160,200,.3);color:#aebbd2}
    #byok-overlay .hint{font-size:.74rem;color:#6f7e98;margin-top:.6rem}
    #byok-overlay .msg{font-size:.8rem;margin-top:.6rem;min-height:1em}
    #byok-overlay .modes{display:flex;gap:.5rem;margin:.2rem 0 1rem}
    #byok-overlay .modes button{flex:1;margin:0;padding:.65em .4em;font:700 .82rem 'Space Grotesk',system-ui;border-radius:12px;cursor:pointer;
      background:#080c16;border:1px solid rgba(140,160,200,.22);color:#aebbd2}
    #byok-overlay .modes button[aria-pressed="true"]{background:linear-gradient(95deg,rgba(45,212,191,.18),rgba(34,211,238,.16));border-color:#22d3ee;color:#f4f7fd}
    #byok-overlay [data-pane]{display:none}#byok-overlay [data-pane].on{display:block}
    #byok-overlay #gh-create{border:1px solid rgba(140,160,200,.18);border-radius:14px;padding:.9rem 1rem;background:rgba(8,12,22,.5)}
    #byok-overlay .cb-head{font:700 1rem 'Space Grotesk',system-ui;color:#f4f7fd}
    #byok-overlay .cb-or{display:flex;align-items:center;gap:.6rem;margin:1rem 0 .2rem;font-size:.72rem;color:#6f7e98;text-transform:uppercase;letter-spacing:.08em}
    #byok-overlay .cb-or::before,#byok-overlay .cb-or::after{content:"";flex:1;height:1px;background:rgba(140,160,200,.18)}
    #byok-overlay .no-gh{margin-top:.7rem;padding:.6rem .75rem;border:1px solid rgba(140,160,200,.16);border-radius:10px;
      background:rgba(8,12,22,.4);font-size:.76rem;line-height:1.5;color:#aebbd2}
    #byok-overlay .no-gh a{color:#22d3ee;text-decoration:underline;white-space:nowrap;margin-left:.3rem}
    #byok-overlay .no-gh .no-gh-sub{display:block;margin-top:.2rem;color:#6f7e98}
    #byok-overlay .no-gh a.no-gh-back{display:inline-block;margin:.45rem 0 0;color:#2dd4bf;text-decoration:none;font-weight:700;white-space:normal}
  </style>
  <div class="bc">
    <h2>Set up your <b>Studio</b></h2>
    <p>Choose how this device works. You can switch any time in Settings.</p>
    <div class="modes" role="group" aria-label="Connection mode">
      <button type="button" id="mode-byok" data-mode="byok" aria-pressed="${startMode === 'byok'}">This device only<br><span style="font-weight:400;font-size:.72rem;opacity:.8">bring your own keys</span></button>
      <button type="button" id="mode-remote" data-mode="remote" aria-pressed="${startMode === 'remote'}">Connect to my&nbsp;Helm<br><span style="font-weight:400;font-size:.72rem;opacity:.8">use the laptop's state</span></button>
    </div>

    <div data-pane="byok" class="${startMode === 'byok' ? 'on' : ''}">
      <p style="margin-top:-.4rem">Your keys are stored only in this browser — never on a server. They go straight to GitHub and your AI provider.</p>
      ${GH_CLIENT_ID ? signinBlock : manualFields}
      <label>AI provider</label>
      <select id="byok-prov">
        <option value="anthropic"${(c.aiProvider || 'anthropic') === 'anthropic' ? ' selected' : ''}>Anthropic (Claude)</option>
        <option value="openai"${c.aiProvider === 'openai' ? ' selected' : ''}>OpenAI</option>
        <option value="google"${c.aiProvider === 'google' ? ' selected' : ''}>Google (Gemini)</option>
      </select>
      <label>AI key <span style="opacity:.6">(optional)</span></label><input id="byok-key" type="password" placeholder="sk-… (only needed for AI drafting)" value="${c.aiKey || ''}">
      <button id="byok-save">Save &amp; start</button>
      <div class="msg" id="byok-msg"></div>
    </div>

    <div data-pane="remote" class="${startMode === 'remote' ? 'on' : ''}">
      <p style="margin-top:-.4rem">Run <b>npm&nbsp;run&nbsp;tunnel</b> on your laptop, paste the printed URL below, and your phone edits the laptop's real Studio — drafts, queue, posts. Keys stay on the laptop.</p>
      <label>Helm URL (your tunnel)</label><input id="helm-url" inputmode="url" autocapitalize="off" autocomplete="off" placeholder="https://helm-xxxx.trycloudflare.com" value="${r.baseUrl || ''}">
      <div class="hint" style="margin:.35rem 0 0">Only paste your own Helm/tunnel URL — the admin token is sent to it.</div>
      <label>Admin token</label><input id="helm-token" type="password" autocomplete="off" placeholder="from config/config.json" value="${r.token || ''}">
      <button class="ghost" id="helm-test" style="margin-top:.9rem">Test connection</button>
      <button id="helm-save">Connect &amp; start</button>
      <div class="msg" id="helm-msg"></div>
    </div>
    <div class="hint">You can change these any time in Settings.</div>
  </div>`;
  document.body.appendChild(ov);
  const $ = (id) => document.getElementById(id);
  const v = (id) => ($(id).value || '').trim();

  // mode switch
  const setMode = (m) => {
    $('mode-byok').setAttribute('aria-pressed', String(m === 'byok'));
    $('mode-remote').setAttribute('aria-pressed', String(m === 'remote'));
    ov.querySelectorAll('[data-pane]').forEach((el) => el.classList.toggle('on', el.dataset.pane === m));
  };
  $('mode-byok').addEventListener('click', () => setMode('byok'));
  $('mode-remote').addEventListener('click', () => setMode('remote'));

  // BYOK save
  $('byok-save').addEventListener('click', () => {
    const msg = $('byok-msg');
    if (!v('byok-owner') || !v('byok-repo') || !v('byok-token')) { msg.textContent = 'Fill in owner, repo and GitHub token.'; msg.style.color = '#f472b6'; return; }
    config.save({ mode: 'byok', ghOwner: v('byok-owner'), ghRepo: v('byok-repo'), ghBranch: v('byok-branch') || 'main', ghToken: v('byok-token'), aiProvider: v('byok-prov'), aiKey: v('byok-key') });
    refresh();
    msg.textContent = 'Saved. Loading…'; msg.style.color = '#2dd4bf';
    setTimeout(() => location.reload(), 400);
  });

  // --- Device-Flow sign-in (only present when a Client ID was injected) ---
  if (GH_CLIENT_ID && $('gh-start')) {
    // "I've got one — continue": bring the user back to the Sign-in button after they
    // created their account in the new tab. Just focuses/scrolls it into view.
    const haveAcct = $('gh-have-account');
    if (haveAcct) haveAcct.addEventListener('click', (e) => {
      e.preventDefault();
      const b = $('gh-start');
      if (b) { try { b.scrollIntoView({ block: 'center', behavior: 'smooth' }); } catch {} b.focus(); }
    });
    // The signed-in user's token, captured on success and shared by the create + picker
    // paths below. Falls back to config.getGithub().token (saveDeviceAuth persisted it).
    let sessionToken = '';
    $('gh-start').addEventListener('click', async () => {
      const btn = $('gh-start'); const poll = $('gh-poll'); const msg = $('byok-msg');
      btn.disabled = true; msg.textContent = '';
      $('gh-codebox').style.display = 'block';
      const da = makeDeviceAuth({ clientId: GH_CLIENT_ID, relayBase: RELAY_BASE });
      try {
        const { token } = await da.authorize({
          onCode: ({ userCode, verificationUri }) => {
            $('gh-code').textContent = userCode;
            $('gh-open').href = verificationUri;
            try { navigator.clipboard.writeText(userCode); } catch {}
          },
        });
        poll.textContent = 'Authorised ✓ Loading your account…';
        sessionToken = token;
        const gh = makeGithub({ token });
        const me = await gh.whoami().catch(() => ({ login: '' }));
        config.saveDeviceAuth({ token, login: me.login });
        const repos = (await gh.listRepos().catch(() => [])).filter((r) => !r.private);
        const sel = $('gh-repo-select');
        // Primary path: create a brand-new blog — always available, even with no repos yet.
        $('gh-codebox').style.display = 'none';
        $('gh-create').style.display = 'block';
        // Secondary path: only surface the existing-repo picker when there's something to pick.
        if (repos.length) {
          sel.innerHTML = repos.map((r) => `<option value="${r.fullName}" data-branch="${r.branch}">${r.fullName}</option>`).join('');
          $('gh-picker').style.display = 'block';
        } else {
          $('gh-picker').style.display = 'none';
        }
      } catch (e) {
        $('gh-codebox').style.display = 'none';
        msg.style.color = '#f472b6'; msg.textContent = e.message || 'Sign-in failed.';
        btn.disabled = false;
      }
    });

    $('gh-repo-use').addEventListener('click', () => {
      const opt = $('gh-repo-select').selectedOptions[0];
      if (!opt) return;
      const [owner, repo] = opt.value.split('/');
      config.saveRepo({ owner, repo, branch: opt.dataset.branch || 'main' });
      refresh();
      const msg = $('byok-msg'); msg.style.color = '#2dd4bf'; msg.textContent = 'Saved. Loading…';
      setTimeout(() => location.reload(), 400);
    });

    // --- Create a new blog: generate a repo from the template, set its look, enable Pages, boot.
    $('cb-go').addEventListener('click', async () => {
      const st = $('cb-status');
      const set = (t, ok) => { st.textContent = t; st.style.color = ok ? '#2dd4bf' : (ok === false ? '#f472b6' : '#aebbd2'); };
      const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
      const token = sessionToken || config.getGithub().token;
      if (!token) { set('Sign in with GitHub first.', false); return; }

      const name = (($('cb-name').value) || '').trim();
      if (!name) { set('Give your blog a name.', false); return; }
      let slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'my-blog';

      const go = $('cb-go'); go.disabled = true;
      try {
        const gh = makeGithub({ token });
        const me = await gh.whoami();
        const owner = me.login;
        if (!owner) { set('Could not read your GitHub account — try signing in again.', false); go.disabled = false; return; }

        // Generate from the blog template, retrying the slug on a name collision (-2, -3, …).
        set('Creating your blog…');
        let repo = null;
        for (let i = 0; i < 5; i++) {
          const tryName = i ? `${slug}-${i + 1}` : slug;
          try {
            repo = await gh.generateFromTemplate({ templateOwner: 'inayatpanda', templateRepo: 'blog-template', owner, name: tryName, description: name });
            slug = tryName; break;
          } catch (e) {
            if (!/name already exists|already exists|422/i.test(e.message || '')) throw e;
          }
        }
        if (!repo) { set('Could not find a free name — try another.', false); go.disabled = false; return; }
        const branch = repo.branch || 'main';

        // Write the chosen look into site.json. Poll getFile first — the template content
        // can lag a second or two after generate (getFile returns null until it lands).
        set('Setting it up…');
        const ghRepo = makeGithub({ token, owner, repo: slug, branch });
        let site = null, sha = null;
        for (let i = 0; i < 6; i++) {
          try { const f = await ghRepo.getFile('src/data/site.json'); if (f && f.content) { site = JSON.parse(f.content); sha = f.sha; break; } } catch {}
          await sleep(1500);
        }
        if (site) {
          // Read-modify-write: keep ALL template fields (incl. its default nav); set only our picks.
          Object.assign(site, {
            name, masthead: name,
            defaultTheme: $('cb-theme').value, core: $('cb-core').value,
            url: `https://${owner}.github.io/${slug}/`,
          });
          await ghRepo.putFile('src/data/site.json', JSON.stringify(site, null, 2), 'Set up blog', sha);
        } // else: leave the template defaults; the new repo still works, just unbranded.

        // Best-effort Pages — the template's Actions workflow self-enables on first run,
        // so a failure here must never abort the create.
        try { await gh.enablePages({ owner, repo: slug }); } catch (e) { console.warn('enablePages (non-fatal):', e && e.message); }

        config.saveRepo({ owner, repo: slug, branch });
        refresh();
        // Flag the first-run "write your first post" tour to auto-open once after the reload.
        try { tour.markPending(); } catch {}
        set('Your blog is live-building. Loading…', true);
        setTimeout(() => location.reload(), 800);
      } catch (e) {
        set((e && e.message) ? `Could not create the blog: ${e.message}` : 'Could not create the blog — try again.', false);
        go.disabled = false;
      }
    });
  }

  // Remote: Test connection (probes GET /studio/api/posts via the remote seam)
  $('helm-test').addEventListener('click', async () => {
    const msg = $('helm-msg');
    if (!v('helm-url') || !v('helm-token')) { msg.textContent = 'Enter the Helm URL and admin token.'; msg.style.color = '#f472b6'; return; }
    msg.textContent = 'Testing…'; msg.style.color = '#aebbd2';
    const probe = makeRemote(() => ({ baseUrl: v('helm-url').replace(/\/+$/, ''), token: v('helm-token') }));
    const res = await probe.test();
    if (res.ok) { msg.textContent = 'Connected to your Helm ✓'; msg.style.color = '#2dd4bf'; }
    else { msg.textContent = res.message || 'Connection failed.'; msg.style.color = '#f472b6'; }
  });

  // Remote: Connect & start
  $('helm-save').addEventListener('click', async () => {
    const msg = $('helm-msg');
    if (!v('helm-url') || !v('helm-token')) { msg.textContent = 'Enter the Helm URL and admin token.'; msg.style.color = '#f472b6'; return; }
    msg.textContent = 'Connecting…'; msg.style.color = '#aebbd2';
    const probe = makeRemote(() => ({ baseUrl: v('helm-url').replace(/\/+$/, ''), token: v('helm-token') }));
    const res = await probe.test();
    if (!res.ok) { msg.textContent = res.message || 'Connection failed.'; msg.style.color = '#f472b6'; return; }
    config.saveRemoteHelm({ baseUrl: v('helm-url'), token: v('helm-token') });
    refresh();
    msg.textContent = 'Connected ✓ Loading…'; msg.style.color = '#2dd4bf';
    setTimeout(() => location.reload(), 400);
  });

  setMode(startMode);
}

if (typeof window !== 'undefined') {
  window.__studioConfig = config;       // the static index's boot gate reads this
  window.__studioRefresh = refresh;     // rebuild seams after the repo/keys change
  window.__studioOnboard = renderOnboarding;
  window.__studioMakeRemote = makeRemote; // for ad-hoc Test-connection probes in the UI
  window.__studioDomain = domain;        // pure custom-domain helpers for the Site-settings panel
  window.__studioTour = tour;            // pure first-run tour state/step model (index.html renders it)
  window.__studioQuotes = quotes;        // curated quote library + pure facet/search helpers for the Quote block
  window.__studioCalendar = postCalendar; // pure post-calendar helpers (bucket/classify/month grid) for the Posts calendar view
  window.__studioShare = shareIntents;   // pure Share-flow helpers (intent URLs, post-link, image-list); mirrored inline for the local build
  window.__studioPostList = postList;    // pure Posts-list helpers (optimistic remove-by-slug + already-deleted 404 test)
  refresh();
}
