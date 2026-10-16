// No signing secret is hosted here. Requests require a domain-separated Ed25519
// signature from the existing private worker, a short lifetime and replay guard.
import { createPublicKey, verify } from 'node:crypto';
import { PUBLIC_KEY } from '../../src/lib/licence-pubkey.js';
import { withMigrationGuard } from '../lib/migration-guard.mjs';
import { openFulfilStore, openControlStore, privateStoreAdapter, validPath } from '../lib/fulfil-store.mjs';

export const API_ORIGIN = 'https://chapbook.rqai.co.uk';
export const signingMessage = (raw, origin = API_ORIGIN) => Buffer.from('rqai-private-store-v1\n' + origin + '\n' + raw);
const json = (body, status = 200) => Response.json(body, { status, headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' } });
export function createHandler({ store, control, publicKey = PUBLIC_KEY, now = Date.now, origin = API_ORIGIN } = {}) {
  return async req => {
    if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);
    const raw = await req.text();
    if (Buffer.byteLength(raw) > 2_000_000) return json({ error: 'request_too_large' }, 413);
    let request;
    try {
      const key = createPublicKey({ key: Buffer.from('302a300506032b6570032100' + publicKey, 'hex'), format: 'der', type: 'spki' });
      const signature = Buffer.from(req.headers.get('x-rqai-signature') || '', 'base64url');
      if (!verify(null, signingMessage(raw, origin), key, signature)) return json({ error: 'unauthorised' }, 401);
      request = JSON.parse(raw);
    } catch { return json({ error: 'unauthorised' }, 401); }
    if (!request || !Number.isSafeInteger(request.ts) || Math.abs(now() - request.ts) > 180_000 || !/^[a-f0-9]{32}$/.test(request.nonce || '')) return json({ error: 'expired_request' }, 401);
    const { op, path, record, sha } = request;
    if (!['get', 'list', 'put', 'del', 'prune-auth'].includes(op) || (op !== 'prune-auth' && !validPath(path, { directory: op === 'list' }))) return json({ error: 'invalid_operation' }, 400);
    if (op === 'put' && (!record || typeof record !== 'object' || Array.isArray(record))) return json({ error: 'invalid_record' }, 400);
    const dataStore = store || openFulfilStore();
    const controls = control || openControlStore();
    const adapter = privateStoreAdapter(dataStore, controls);
    try {
      if (['put', 'del', 'prune-auth'].includes(op)) {
        const receipt = await controls.setJSON('nonces/' + request.nonce, { expires: now() + 300_000 }, { onlyIfNew: true });
        if (!receipt.modified) return json({ error: 'replayed_request' }, 409);
      }
      if (op === 'prune-auth') {
        const { blobs } = await controls.list({ prefix: 'nonces/' });
        let removed = 0;
        for (const b of blobs) {
          const item = await controls.get(b.key, { type: 'json' });
          if (item && item.expires < now()) { await controls.delete(b.key); removed++; }
        }
        return json({ removed });
      }
      if (op === 'get') return json(await adapter.get(path));
      if (op === 'list') return json(await adapter.list(path));
      if (op === 'put') return json({ sha: await adapter.put(path, record, '', sha) });
      await adapter.del(path, sha);
      return json({ deleted: true });
    } catch (e) {
      // Never include customer content or credentials in responses/logs.
      return json({ error: e.status === 409 ? 'conflict' : 'storage_unavailable' }, e.status === 409 ? 409 : 503);
    }
  };
}
export default withMigrationGuard(createHandler());
