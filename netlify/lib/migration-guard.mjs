import { openControlStore } from './fulfil-store.mjs';

export const MIGRATION_STATE_KEY = 'maintenance/cutover.json';

// The operator changes this durable flag through the provider's private API.
// There is no public unlock route. The old store stays paused after DNS moves;
// copying the flag also leaves the destination paused until reconciliation.
export function withMigrationGuard(handler, {
  enabled = () => process.env.CHAPBOOK_MIGRATION_GUARD === '1',
  readState = () => openControlStore().get(MIGRATION_STATE_KEY, { type:'json', consistency:'strong' }),
} = {}) {
  return async (request, context) => {
    if (enabled() && request.method !== 'OPTIONS') {
      try {
        const state = await readState();
        if (state !== null && state !== undefined && state.paused !== false) throw Error('paused');
      } catch {
        return Response.json({ error:'maintenance', message:'Account services are briefly unavailable. Please try again shortly.' }, {
          status:503, headers:{'Cache-Control':'no-store','Retry-After':'60'},
        });
      }
    }
    return handler(request, context);
  };
}
