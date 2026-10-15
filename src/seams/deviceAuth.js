// GitHub Device Flow seam — gets a user token WITHOUT a manually-created PAT.
// Talks to GitHub's device endpoints THROUGH the secret-less relay (those endpoints
// send no CORS headers, so the browser can't call them directly). The token it returns
// is stored only in the browser, exactly like the BYOK PAT, and used the same way.
//
//   clientId  — the OAuth App's PUBLIC Client ID (injected into the page at build).
//   relayBase — URL of the relay function (default '/.netlify/functions/gh-device').
// Factory takes a fetch impl so it's unit-testable with a stub.

const GRANT = 'urn:ietf:params:oauth:grant-type:device_code';

export function makeDeviceAuth({ clientId, relayBase, scope = 'public_repo' }, fetchImpl = fetch) {
  const post = async (step, params, signal) => {
    // M6 — surface relay/GitHub errors as a human message instead of a raw JSON dump or a
    // silent stall. A network failure to the relay throws a friendly "couldn't reach" error;
    // an unparseable body (a 5xx HTML page, a gateway error) throws with the status. But any
    // usable JSON object is returned AS-IS — including the OAuth device-flow codes
    // (authorization_pending / slow_down / expired_token / access_denied), which GitHub
    // returns HTTP 200 for. We deliberately do NOT throw purely on !res.ok, so a status quirk
    // on a polling response can never break the poll loop; requestCode/pollOnce interpret it.
    let res;
    try {
      res = await fetchImpl(relayBase, {
        method: 'POST',
        signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(30000)]) : AbortSignal.timeout(30000),
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ step, params }),
      });
    } catch (cause) {
      if (signal?.aborted) { const e = new Error('Sign-in cancelled.'); e.kind = 'aborted'; throw e; }
      const e = new Error('Could not reach the sign-in service — check your connection, then try again.');
      e.kind = 'network'; throw e;
    }
    let data = null;
    try { data = await res.json(); } catch { /* non-JSON body handled below */ }
    if (!res.ok && res.status >= 500) { const e = new Error('The sign-in service is temporarily unavailable. Please retry in a moment.'); e.kind = 'relay'; e.status = res.status; throw e; }
    if (data && typeof data === 'object' && (res.ok || data.error || data.access_token || data.device_code || data.user_code)) {
      return data;
    }
    const e = new Error(`The sign-in service is unavailable right now (HTTP ${res.status || '?'}). Please try again in a moment.`);
    e.kind = 'relay'; e.status = res.status; throw e;
  };
  return {
    // Step 1 — ask GitHub for a device + user code.
    async requestCode(signal) {
      if (!clientId) { const e = new Error('Device sign-in is not configured.'); e.kind = 'config'; throw e; }
      const j = await post('code', { client_id: clientId, scope }, signal);
      if (j.error || !j.device_code) {
        const e = new Error(j.error_description || j.error || 'Could not start sign-in.'); e.kind = 'start'; throw e;
      }
      return j;
    },
    // Step 3 — a single poll.
    async pollOnce(deviceCode, signal) {
      const j = await post('token', { client_id: clientId, device_code: deviceCode, grant_type: GRANT }, signal);
      if (j.access_token) return { status: 'ok', token: j.access_token, scope: j.scope || scope };
      if (j.error === 'authorization_pending') return { status: 'pending' };
      if (j.error === 'slow_down') return { status: 'slow_down', interval: j.interval };
      const e = new Error(
        j.error === 'expired_token' ? 'The code expired — start sign-in again.'
        : j.error === 'access_denied' ? 'Sign-in was cancelled.'
        : (j.error_description || j.error || 'Sign-in failed.'));
      e.kind = j.error || 'failed';
      throw e;
    },
    // Steps 1 + 3 orchestrated. onCode receives { userCode, verificationUri, expiresIn }
    // so the UI can show the code immediately. sleep + signal are injectable/optional.
    async authorize({ onCode, onRetry, sleep = (ms) => new Promise((resolve, reject) => {
      const timer = setTimeout(done, ms);
      function done() { signal?.removeEventListener('abort', abort); resolve(); }
      function abort() { clearTimeout(timer); signal?.removeEventListener('abort', abort); reject(Object.assign(new Error('Sign-in cancelled.'), { kind: 'aborted' })); }
      if (signal?.aborted) abort(); else signal?.addEventListener('abort', abort, { once: true });
    }), signal } = {}) {
      const code = await this.requestCode(signal);
      if (signal?.aborted) throw Object.assign(new Error('Sign-in cancelled.'), { kind: 'aborted' });
      if (onCode) onCode({ userCode: code.user_code, verificationUri: code.verification_uri, expiresIn: code.expires_in });
      let interval = code.interval || 5;
      const deadline = code.expires_in || 900;
      let waited = 0, failures = 0;
      const started = Date.now();
      while (Math.max(waited, (Date.now() - started) / 1000) < deadline) {
        if (signal && signal.aborted) { const e = new Error('Sign-in cancelled.'); e.kind = 'aborted'; throw e; }
        await sleep(interval * 1000);
        waited += interval;
        if (signal?.aborted) throw Object.assign(new Error('Sign-in cancelled.'), { kind: 'aborted' });
        let r;
        try { r = await this.pollOnce(code.device_code, signal); failures = 0; }
        catch (e) {
          if ((e.kind === 'network' || e.status >= 500) && ++failures <= 3) { onRetry?.(); continue; }
          throw e;
        }
        if (r.status === 'ok') return { token: r.token, scope: r.scope };
        if (r.status === 'slow_down') interval = Math.max(interval + 5, Number(r.interval) || 0);
      }
      const e = new Error('The code expired — start sign-in again.'); e.kind = 'expired_token'; throw e;
    },
  };
}
