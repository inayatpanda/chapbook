import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { makePosts } from './src/core/posts.js';
const html = readFileSync(new URL('./src/index.html', import.meta.url), 'utf8');
const metaStart = html.indexOf('function metaFromData(');
const metaEnd = html.indexOf('/* ── open block editor', metaStart);
const openStart = html.indexOf('async function openBlockEditor(');
const openEnd = html.indexOf('window.openBlockEditor = openBlockEditor;', openStart);
assert.ok(metaStart > 0 && metaEnd > metaStart && openEnd > openStart);

async function open(result, recovery = () => {}) {
  const fields = new Map();
  const c = vm.createContext({
    window: {}, VALID_TEMPLATES: ['observatory'],
    $: id => { if (!fields.has(id)) fields.set(id, {}); return fields.get(id); },
    chatRelease() {}, resetSessionWords() {}, setSaveState() {}, setAskMode() {},
    loadThread: async () => {}, go() {}, setMetaDescUI() {}, renderBlocks() {},
    updateWordCount() {}, loadEditorSettings: async () => {}, offerDraftRecovery: recovery,
    api: async () => result,
    showError: e => { throw e; },
  });
  vm.runInContext(html.slice(metaStart, metaEnd) + html.slice(openStart, openEnd), c);
  assert.equal(await c.openBlockEditor('test-post'), true);
  return c.meta;
}

for (const expected of [{ draft: false }, { draft: true }, { draft: true, publishAt: '2030-11-01T09:00:00Z' }]) {
  test(`publish → reopen preserves ${JSON.stringify(expected)}`, async () => {
    const files = new Map();
    const posts = makePosts({
      getFile: async path => files.has(path) ? { content: files.get(path), sha: 'sha' } : null,
      listDir: async () => [],
      commitMany: async changes => { for (const c of changes) files.set(c.path, c.content); return { commit: 'commit' }; },
    });
    await posts.publishBlocks('test-post', { version: 1, blocks: [{ id: 'a', type: 'text', html: 'A post.' }] }, { title: 'Test', ...expected });
    const loaded = await open(await posts.getPostBlocks('test-post'));
    assert.equal(loaded.draft, expected.draft);
    assert.equal(loaded.publishAt, expected.publishAt || '');
  });
}

test('legacy local drafts without a draft flag remain private', async () => {
  const loaded = await open({ source: 'draft', doc: { version: 1, blocks: [] }, data: { title: 'Unsynced draft' } });
  assert.equal(loaded.draft, true);
});

test('legacy local edits of an existing public post retain its public status', async () => {
  const loaded = await open({ source: 'draft', doc: { version: 1, blocks: [] }, data: { title: 'Existing post' }, publishedAt: '2026-10-16' });
  assert.equal(loaded.draft, false);
});

for (const [name, publishedAt, expectPrompt] of [
  ['new local draft', null, false],
  ['offline draft with unknown remote date', undefined, false],
  ['invalid remote date', 'not-a-date', false],
  ['newer local edits of a known remote post', '2026-10-17T09:00:00Z', true],
  ['older local autosave', '2026-10-19T09:00:00Z', false],
]) {
  test(`${name} offers discard only when a remote version is known`, async () => {
    const recoveries = [];
    await open({ source: 'draft', data: { title: 'Saved work', draft: true },
      doc: { version: 1, blocks: [{ id: 'a', type: 'text', html: 'The only saved copy.' }] },
      draftSavedAt: '2026-10-18T09:00:00Z', publishedAt },
      (...args) => recoveries.push(args));
    assert.equal(recoveries.length, expectPrompt ? 1 : 0);
  });
}
