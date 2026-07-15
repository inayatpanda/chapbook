import { test } from 'node:test';
import assert from 'node:assert/strict';
import { runTurn, createSession, appendVersion } from './partner.js';

// Regression: a Partner turn whose model reply OMITS the document (live e2e 2026-07-15:
// llama-4-scout answered {"reply":"Done."} with no doc on an edit turn) used to fall back to
// `out.doc || {blocks:[]}` — silently WIPING the draft and versioning the empty doc. The
// guard treats a missing/empty doc on a non-empty session as a malformed turn instead.

const TEXT_DOC = { version: 1, blocks: [{ type: 'text', html: '<p>the draft</p>' }] };
const deps = (replies) => {
  let i = 0;
  return {
    ai: { generateText: async () => ({ text: JSON.stringify(replies[Math.min(i++, replies.length - 1)]) }) },
    fill: async (doc, meta) => ({ doc, meta }),
    render: () => '<html>preview</html>',
    context: 'ctx',
  };
};

function editingSession() {
  const s = createSession();
  appendVersion(s, TEXT_DOC, { title: 'Draft' });
  return s;
}

test('a turn that omits the doc on a non-empty session keeps the draft (fallback reply)', async () => {
  const s = editingSession();
  const r = await runTurn({ session: s, message: 'add a heading' }, deps([{ reply: 'Done.' }]));
  assert.match(r.reply, /trouble updating the draft/);
  assert.equal(r.doc.blocks.length, 1, 'draft must survive');
  assert.equal(r.doc.blocks[0].html, '<p>the draft</p>');
  assert.equal(s.versions.length, 1, 'no empty version appended');
});

test('a turn that returns EMPTY blocks on a non-empty session keeps the draft', async () => {
  const s = editingSession();
  const r = await runTurn({ session: s, message: 'tweak' }, deps([{ reply: 'Done.', doc: { blocks: [] } }]));
  assert.match(r.reply, /trouble updating the draft/);
  assert.equal(r.doc.blocks.length, 1);
});

test('retry succeeds: first turn drops the doc, second echoes it — edit applies', async () => {
  const s = editingSession();
  const updated = { version: 2, blocks: [{ type: 'heading', level: 2, text: 'The shelf test' }, ...TEXT_DOC.blocks] };
  const r = await runTurn({ session: s, message: 'add a heading' },
    deps([{ reply: 'Done.' }, { reply: 'Added.', doc: updated }]));
  assert.equal(r.reply, 'Added.');
  assert.equal(r.doc.blocks.length, 2);
  assert.equal(s.versions.length, 2);
});

test('the FIRST draft on an empty session still works (guard only protects existing content)', async () => {
  const s = createSession();
  const r = await runTurn({ session: s, message: 'draft a post' },
    deps([{ reply: 'Here you go.', doc: TEXT_DOC }]));
  assert.equal(r.reply, 'Here you go.');
  assert.equal(r.doc.blocks.length, 1);
  assert.equal(s.versions.length, 1);
});
