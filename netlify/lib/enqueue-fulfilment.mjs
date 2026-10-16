import { openFulfilStore, openControlStore, privateStoreAdapter, validPath } from './fulfil-store.mjs';

const same = (a, b) => a.type === b.type && (b.type === 'trial'
  ? canonical(a.email) === canonical(b.email)
  : (a.sessionId || a.paymentId || a.invoiceId || a.paymentIntent) === (b.sessionId || b.paymentId || b.invoiceId || b.paymentIntent));
function canonical(email) {
  const [local, rawDomain] = String(email || '').trim().toLowerCase().split('@');
  const domain = rawDomain === 'googlemail.com' ? 'gmail.com' : rawDomain;
  return `${(domain === 'gmail.com' ? local.replaceAll('.', '') : local).split('+')[0]}@${domain}`;
}
export function makeQueueWriter({ legacyPush, store, control, fetchImpl = fetch } = {}) {
  return async args => {
    const { path, record, token, repo = 'inayatpanda/rqai-sales' } = args;
    if (!validPath(path) || !/^(?:sandbox\/)?queue\//.test(path) || !/^[\w.-]+\/[\w.-]+$/.test(repo)) throw new Error('Invalid queue destination');
    const sandbox = path.startsWith('sandbox/');
    const headers = { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' };
    const response = await fetchImpl(`https://api.github.com/repos/${repo}/contents/${sandbox ? 'sandbox/' : ''}state/control.json`, { headers, signal: AbortSignal.timeout(10_000) });
    if (!response.ok) throw new Error('Fulfilment control unavailable');
    const file = await response.json();
    const config = JSON.parse(Buffer.from(file.content, 'base64').toString());
    if (config.storage !== 'blobs-v1') return legacyPush(args);
    const adapter = privateStoreAdapter(store || openFulfilStore(), control || openControlStore());
    let already = false;
    const current = await adapter.get(path);
    if (current) {
      if (!same(current.record, record)) throw new Error('Conflicting queue record');
      already = true;
    } else {
      try { await adapter.put(path, record, 'queue'); }
      catch (e) {
        if (e.status !== 409) throw e;
        const saved = await adapter.get(path);
        if (!saved || !same(saved.record, record)) throw e;
        already = true;
      }
    }
    // Durability is independent of the wake-up. The half-hour schedule recovers
    // a missed dispatch, so a transient dispatch error cannot lose an order.
    try {
      const wake = await fetchImpl(`https://api.github.com/repos/${repo}/dispatches`, { method: 'POST', headers: { ...headers, 'Content-Type': 'application/json' }, body: JSON.stringify({ event_type: sandbox ? 'test-fulfil-licences' : 'fulfil-licences' }), signal: AbortSignal.timeout(10_000) });
      if (!wake.ok) console.error('[fulfilment] durable record saved; worker wake-up deferred');
    } catch { console.error('[fulfilment] durable record saved; worker wake-up deferred'); }
    return { ok: true, already };
  };
}
