import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeRouter } from './router.js';
import * as playgrounds from './lib/playgrounds/index.js';

// Regression: the client router replaced a Fastify server that auto-decoded path
// params. Callers encodeURIComponent() route params, so a preset name with a space
// ("Coffee brewing methods") arrives as "Coffee%20brewing%20methods". Without
// decoding, getPreset() searched for the literal %20 name, missed, and returned
// null → the interactive template form loaded empty for EVERY space-named preset.
test('router decodes url-encoded path segments (preset name with spaces)', async () => {
  const { api } = makeRouter({ playgrounds });

  // What the composer actually sends (encoded) must resolve the preset.
  const enc = await api('/playgrounds/sortable-table/preset/' + encodeURIComponent('Coffee brewing methods'));
  assert.ok(enc.params, 'encoded preset name should resolve, not return null');
  assert.deepEqual(enc.params.columns, ['Method', 'Minutes', 'Faff', 'Verdict']);
  assert.equal(enc.params.rows.length, 4);

  // A second space-named preset in the same family.
  const grid = await api('/playgrounds/sortable-table/preset/' + encodeURIComponent('Comparison grid'));
  assert.deepEqual(grid.params.columns, ['Option', 'Cost', 'Speed', 'Note']);
});

test('router preset route: unknown name → { params: null }, no throw', async () => {
  const { api } = makeRouter({ playgrounds });
  const none = await api('/playgrounds/sortable-table/preset/' + encodeURIComponent('No Such Preset'));
  assert.equal(none.params, null);
});

test('router decode is defensive: a malformed %-escape falls back to the raw segment', async () => {
  const { api } = makeRouter({ playgrounds });
  // "%ZZ" is not a valid escape — decodeURIComponent throws; the router must not.
  const r = await api('/playgrounds/sortable-table/preset/%ZZ');
  assert.equal(r.params, null); // no matching preset, but crucially no exception
});

// Regression: PUT /settings/ai used to return {ok:true}, but saveSettings() calls
// renderSettings(putResult) which reads .default/.providers → after a successful key
// save the panel falsely showed "No active model — paste a provider's key". PUT must
// return the SAME fresh status shape as GET.
test('PUT /settings/ai returns the fresh status shape (not {ok:true})', async () => {
  const saved = { provider: 'anthropic', key: '', model: '' };
  const config = {
    getAi: () => saved,
    save: (patch) => {
      if (patch.aiProvider) saved.provider = patch.aiProvider;
      if (patch.aiKey) saved.key = patch.aiKey;
      if (patch.aiModel) saved.model = patch.aiModel;
    },
  };
  const { api } = makeRouter({ config });
  const r = await api('/settings/ai', {
    method: 'PUT',
    body: JSON.stringify({ default: 'anthropic', providers: { anthropic: { apiKey: 'sk-test', model: 'claude-x' } } }),
  });
  assert.equal(r.ok, undefined, 'must NOT be the old {ok:true} shape');
  assert.equal(r.default, 'anthropic');
  assert.ok(r.providers && r.providers.anthropic, 'must carry providers[default]');
  assert.equal(r.providers.anthropic.configured, true); // key was saved → shows as configured
  assert.equal(r.providers.anthropic.model, 'claude-x');
});
