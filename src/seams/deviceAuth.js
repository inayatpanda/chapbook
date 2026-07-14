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
  const post = async (step, params) => {
    const res = await fetchImpl(relayBase, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ step, params }),
    });
    return res.json();
  };
  return {
    // Step 1 — ask GitHub for a device + user code.
    async requestCode() {
      if (!clientId) { const e = new Error('Device sign-in is not configured.'); e.kind = 'config'; throw e; }
      const j = await post('code', { client_id: clientId, scope });
      if (j.error || !j.device_code) {
        const e = new Error(j.error_description || j.error || 'Could not start sign-in.'); e.kind = 'start'; throw e;
      }
      return j;
    },
    // Step 3 — a single poll.
    async pollOnce(deviceCode) {
      const j = await post('token', { client_id: clientId, device_code: deviceCode, grant_type: GRANT });
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
    async authorize({ onCode, sleep = (ms) => new Promise((r) => setTimeout(r, ms)), signal } = {}) {
      const code = await this.requestCode();
      if (onCode) onCode({ userCode: code.user_code, verificationUri: code.verification_uri, expiresIn: code.expires_in });
      let interval = code.interval || 5;
      const deadline = code.expires_in || 900;
      let waited = 0;
      while (waited < deadline) {
        if (signal && signal.aborted) { const e = new Error('Sign-in cancelled.'); e.kind = 'aborted'; throw e; }
        await sleep(interval * 1000);
        waited += interval;
        const r = await this.pollOnce(code.device_code);
        if (r.status === 'ok') return { token: r.token, scope: r.scope };
        if (r.status === 'slow_down') interval = r.interval || interval + 5;
      }
      const e = new Error('The code expired — start sign-in again.'); e.kind = 'expired_token'; throw e;
    },
  };
}
