// Shared setup controller. A new account/repository is staged until validation succeeds,
// so cancelling a reconnect cannot pair a new token with the old repository.
import { makeGithub } from '../seams/github.js';
import { makeDeviceAuth } from '../seams/deviceAuth.js';
import { githubErrorMessage } from './connection.js';

export function installGithubSetup({ overlay, config, refresh, clientId, relayBase }) {
  const $ = id => overlay.querySelector('#' + id);
  $('byok-msg').setAttribute('role', 'status');
  $('byok-msg').setAttribute('aria-live', 'polite');
  $('gh-signin')?.prepend($('byok-msg'));
  if (!$('byok-close')) {
    const close = document.createElement('button'); close.type = 'button'; close.id = 'byok-close'; close.className = 'ghost'; close.textContent = 'Close setup';
    overlay.querySelector('.bc').prepend(close);
    close.onclick = () => {
      if (config.isReady()) overlay.remove();
      else { $('byok-msg').textContent = 'Choose a website or connect Helm to finish setup.'; }
    };
  }
  const value = id => $(id)?.value.trim() || '';
  let token = config.getGithub().token, login = config.getGithubUser().login;
  let method = config.getGithubUser().method, generation = 0, controller;
  let repos = [];
  const alive = id => overlay.isConnected && id === generation;
  const message = (text, error = false) => {
    if (!$('byok-msg')) return;
    $('byok-msg').textContent = text;
    $('byok-msg').style.color = error ? '#f472b6' : 'var(--mut,#aebbd2)';
    if (error) $('byok-msg').scrollIntoView({ block: 'nearest' });
  };
  const aiSettings = () => ({ aiProvider: value('byok-prov'), aiKey: value('byok-key') });
  const activate = ({ owner, repo, branch, token: nextToken = token, login: nextLogin = login, method: nextMethod = method }) => {
    config.save({ mode: 'byok', ghOwner: owner, ghRepo: repo, ghBranch: branch || 'main', ghToken: nextToken,
      ghLogin: nextLogin, ghAuthMethod: nextMethod, ...aiSettings() });
    refresh();
  };
  const finish = () => { message('Connected. Opening your website…'); setTimeout(() => location.reload(), 250); };
  const cancel = () => { generation++; controller?.abort(); controller = null; if ($('gh-start')) $('gh-start').disabled = false; };
  const observer = new MutationObserver(() => { if (!overlay.isConnected) { cancel(); observer.disconnect(); } });
  observer.observe(document.body, { childList: true });

  $('byok-save').addEventListener('click', async () => {
    if (!value('byok-owner') || !value('byok-repo') || !value('byok-token')) {
      message('Choose an existing website above, create a new one, or enter owner, repository and token under Advanced.', true); return;
    }
    cancel(); const id = generation;
    const button = $('byok-save'); button.disabled = true;
    const next = { owner: value('byok-owner'), repo: value('byok-repo'), branch: value('byok-branch'), token: value('byok-token') };
    message('Checking the account, repository and website settings…');
    try {
      const gh = makeGithub(next), me = await gh.whoami();
      const checked = await gh.checkRepository();
      if (!alive(id)) return;
      activate({ ...next, branch: checked.branch, login: me.login, method: 'token' }); finish();
    } catch (e) { if (alive(id)) message(githubErrorMessage(e), true); }
    finally { button.disabled = false; }
  });
  if (!clientId || !$('gh-start')) return { getAuth: () => ({ token, login, method }), activate };

  $('byok-save').textContent = 'Connect with this token';
  $('byok-token').after($('byok-save'));
  const picker = $('gh-picker');
  picker.style.display = 'block';
  picker.querySelector('.hint').textContent = 'Choose the repository containing your website. Public repositories you can edit are listed. For a private site, use a token under Advanced.';
  const label = picker.querySelector('label'); label.htmlFor = 'gh-repo-select';
  const search = document.createElement('input'); search.id = 'gh-repo-search'; search.type = 'search'; search.placeholder = 'Find a repository…'; search.setAttribute('aria-label', 'Find a repository');
  picker.insertBefore(search, $('gh-repo-select'));
  const status = document.createElement('div'); status.id = 'gh-repo-status'; status.className = 'hint'; status.setAttribute('role', 'status');
  picker.append(status);
  const retry = document.createElement('button'); retry.type = 'button'; retry.id = 'gh-repo-retry'; retry.className = 'ghost'; retry.textContent = 'Refresh repositories'; picker.append(retry);
  const codeBox = $('gh-codebox');
  codeBox.querySelector('.hint').textContent = 'Enter this code on GitHub, then return here:';
  const copy = document.createElement('button'); copy.type = 'button'; copy.className = 'ghost'; copy.id = 'gh-copy-code'; copy.textContent = 'Copy code'; codeBox.append(copy);
  copy.onclick = async () => { try { await navigator.clipboard.writeText($('gh-code').textContent); copy.textContent = 'Code copied'; } catch { message('Select and copy the code above, then paste it on GitHub.'); } };
  const stop = document.createElement('button'); stop.type = 'button'; stop.className = 'ghost'; stop.id = 'gh-cancel'; stop.textContent = 'Cancel sign-in'; codeBox.append(stop);
  stop.onclick = () => { cancel(); codeBox.style.display = 'none'; $('gh-start').disabled = false; message('Sign-in cancelled. Your current connection is unchanged.'); };
  let chip = $('gh-signedin');
  if (!chip) { chip = document.createElement('div'); chip.id = 'gh-signedin'; chip.className = 'hint'; $('gh-start').before(chip); }
  const signedIn = () => {
    chip.textContent = `Signed in as @${login}`;
    chip.style.display = 'block';
    $('gh-start').textContent = 'Switch GitHub account';
    overlay.querySelector('.no-gh')?.setAttribute('hidden','');
    const help = $('gh-start').nextElementSibling;
    if (help?.classList.contains('hint')) help.hidden = true;
    $('gh-create').style.display = 'block';
    codeBox.style.display = 'none';
  };
  const renderRepos = () => {
    const select = $('gh-repo-select'), previous = select.value || `${config.getGithub().owner}/${config.getGithub().repo}`;
    const matching = repos.filter(r => r.fullName.toLowerCase().includes(search.value.toLowerCase()));
    select.replaceChildren();
    for (const repo of matching) { const opt = document.createElement('option'); opt.value = repo.fullName; opt.textContent = repo.fullName; opt.dataset.branch = repo.branch; select.append(opt); }
    if (matching.some(r => r.fullName === previous)) select.value = previous;
    if (!repos.length && !config.isConfigured()) $('gh-create').querySelector('details').open = true;
    select.disabled = !matching.length; $('gh-repo-use').disabled = !matching.length;
    status.textContent = matching.length ? `${matching.length} repositories. We’ll check compatibility before connecting.` : repos.length ? 'No repositories match your search.' : 'No editable public repositories found. You can create a website below or use a private-repository token under Advanced.';
  };
  search.addEventListener('input', renderRepos);
  const loadRepos = async (id = generation) => {
    picker.style.display = 'block'; retry.disabled = true; $('gh-repo-use').disabled = true;
    status.textContent = 'Loading your repositories…';
    try {
      const list = await makeGithub({ token }).listRepos();
      if (!alive(id)) return;
      repos = list.filter(r => !r.private); renderRepos();
    } catch (e) { if (alive(id)) { status.textContent = githubErrorMessage(e); $('gh-repo-use').disabled = true; } }
    finally { retry.disabled = false; }
  };
  const resume = async () => {
    const id = ++generation;
    if (!token) { picker.style.display = 'none'; return; }
    $('gh-start').disabled = true;
    message('Checking your saved GitHub connection…');
    try {
      const me = await makeGithub({ token }).whoami();
      if (!alive(id)) return;
      login = me.login; signedIn(); message('Choose a website to connect, or create a new one.'); await loadRepos(id);
    } catch (e) { if (alive(id)) { message(githubErrorMessage(e), true); status.textContent = 'Could not load repositories. Retry when you are ready.'; } }
    finally { $('gh-start').disabled = false; }
  };
  retry.onclick = () => resume();
  $('gh-have-account')?.addEventListener('click', e => { e.preventDefault(); if (!$('gh-start').disabled) $('gh-start').click(); });
  $('gh-start').addEventListener('click', async () => {
    cancel(); const id = generation; controller = new AbortController();
    $('gh-start').disabled = true; codeBox.style.display = 'block';
    $('gh-code').textContent = ''; $('gh-open').removeAttribute('href');
    $('gh-poll').textContent = 'Requesting a sign-in code…'; message('');
    try {
      const result = await makeDeviceAuth({ clientId, relayBase }).authorize({ signal: controller.signal,
        onCode: ({ userCode, verificationUri }) => {
          if (!alive(id)) return;
          $('gh-code').textContent = userCode; $('gh-open').href = verificationUri;
          $('gh-poll').textContent = 'Waiting for GitHub approval. Leave this page open.';
        },
        onRetry: () => { if (alive(id)) $('gh-poll').textContent = 'Connection interrupted. Retrying with the same code…'; },
      });
      const me = await makeGithub({ token: result.token }).whoami();
      if (!alive(id)) return;
      token = result.token; login = me.login; method = 'device';
      // A first-time account can resume setup on reload. Existing connections stay intact
      // until the replacement repository has been checked and explicitly chosen.
      if (!config.isConfigured()) config.saveDeviceAuth({ token, login });
      signedIn(); message('GitHub approved. Choose your website below.'); await loadRepos(id);
    } catch (e) { if (alive(id)) { codeBox.style.display = 'none'; message(githubErrorMessage(e), true); } }
    finally { if (alive(id)) $('gh-start').disabled = false; }
  });
  $('gh-repo-use').textContent = 'Connect this website';
  $('gh-repo-use').addEventListener('click', async () => {
    const option = $('gh-repo-select').selectedOptions[0]; if (!option) return;
    const [owner, repo] = option.value.split('/'), branch = option.dataset.branch;
    const id = generation; $('gh-repo-use').disabled = true;
    message('Checking repository access and website settings…');
    try {
      await makeGithub({ token, owner, repo, branch }).checkRepository();
      if (!alive(id)) return;
      activate({ owner, repo, branch }); finish();
    } catch (e) { if (alive(id)) message(githubErrorMessage(e), true); }
    finally { $('gh-repo-use').disabled = false; }
  });
  // Existing websites first; creating another site is a deliberate disclosure.
  picker.after($('gh-create'));
  $('gh-create').querySelector('.cb-or')?.remove();
  const create = $('gh-create'), heading = create.querySelector('.cb-head');
  const details = document.createElement('details'), summary = document.createElement('summary');
  summary.textContent = 'Create a new website'; summary.style.cursor = 'pointer'; details.append(summary);
  while (create.firstChild) details.append(create.firstChild);
  heading?.remove(); create.append(details);
  resume();
  return { getAuth: () => ({ token, login, method }), activate };
}
