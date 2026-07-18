import test from 'node:test';
import assert from 'node:assert/strict';
import { createThread, appendTurn, acceptTurn, dismissTurn, turnsFor, serializeThread, parseThread, buildAskPrompt, addScratch, removeScratch } from './thread.js';

test('createThread: v1, chat mode, empty turns + empty scratch', () => {
  assert.deepEqual(createThread(), { v: 1, mode: 'chat', turns: [], scratch: [] });
});

test('appendTurn: deterministic id from now, ts stamped, state open', () => {
  const t = createThread();
  const a = appendTurn(t, { role: 'aside', kind: 'guidance', text: 'hi' }, 1000);
  const b = appendTurn(t, { role: 'assistant', kind: 'insertable', text: 'draft', blockRef: 'b1' }, 1000);
  assert.equal(t.turns.length, 2);
  assert.notEqual(a.id, b.id);              // same now, counter diverges
  assert.equal(a.ts, 1000);
  assert.equal(a.state, 'open');
  assert.equal(b.blockRef, 'b1');
});

test('acceptTurn: only insertable turns accept; guidance returns null unchanged', () => {
  const t = createThread();
  const g = appendTurn(t, { role: 'assistant', kind: 'guidance', text: 'why?' }, 1);
  const i = appendTurn(t, { role: 'assistant', kind: 'insertable', text: 'x' }, 2);
  assert.equal(acceptTurn(t, g.id), null);
  assert.equal(g.state, 'open');
  assert.equal(acceptTurn(t, i.id).state, 'accepted');
});

test('dismissTurn: hides from turnsFor', () => {
  const t = createThread();
  const a = appendTurn(t, { role: 'assistant', kind: 'guidance', text: 'x', blockRef: 'b1' }, 1);
  appendTurn(t, { role: 'assistant', kind: 'guidance', text: 'y', blockRef: 'b1' }, 2);
  dismissTurn(t, a.id);
  assert.deepEqual(turnsFor(t, 'b1').map(x => x.text), ['y']);
});

test('turnsFor: null blockRef is the thread tail bucket', () => {
  const t = createThread();
  appendTurn(t, { role: 'aside', kind: 'guidance', text: 'tail' }, 1);
  appendTurn(t, { role: 'assistant', kind: 'guidance', text: 'anchored', blockRef: 'b9' }, 2);
  assert.deepEqual(turnsFor(t, null).map(x => x.text), ['tail']);
});

test('serialize/parse round-trip; garbage input yields a fresh thread', () => {
  const t = createThread();
  appendTurn(t, { role: 'aside', kind: 'guidance', text: 'hello' }, 5);
  assert.deepEqual(parseThread(serializeThread(t)), t);
  assert.deepEqual(parseThread('not json'), createThread());
  assert.deepEqual(parseThread('{"v":99}'), createThread());
});

test('parseThread: keeps only turns that validate', () => {
  const raw = JSON.stringify({ v: 1, mode: 'doc', turns: [
    { id: 't1', role: 'aside', kind: 'guidance', text: 'ok', blockRef: null, ts: 1, state: 'open' },
    { bogus: true },
  ]});
  const t = parseThread(raw);
  assert.equal(t.mode, 'doc');
  assert.equal(t.turns.length, 1);
  assert.equal(t.turns[0].text, 'ok');
});

// The app hangs extra fields on turns — `retry` (re-ask payload; also how a sheet-drafted
// turn is recognised) and `acceptedBlockId` (which block an accept inserted, so repeated
// Continue-accepts chain in order). parseThread filters whole turn objects but must never
// strip these, or accept-ordering and Retry break after a reload.
test('parseThread: keeps extra turn fields (acceptedBlockId, retry) across the round-trip', () => {
  const raw = JSON.stringify({ v: 1, mode: 'chat', turns: [
    { id: 't1', role: 'assistant', kind: 'insertable', text: 'next para', blockRef: 'b1',
      ts: 1, state: 'accepted', acceptedBlockId: 'nb1', retry: { ask: 'continue', text: '', blockId: 'b1' } },
  ]});
  const t = parseThread(raw);
  assert.equal(t.turns.length, 1);
  assert.equal(t.turns[0].acceptedBlockId, 'nb1');
  assert.deepEqual(t.turns[0].retry, { ask: 'continue', text: '', blockId: 'b1' });
  assert.deepEqual(parseThread(serializeThread(t)), t);   // and again through the PUT path
});

test('buildAskPrompt: tighten/continue/title are insertable; aside/reply are guidance-only', () => {
  for (const ask of ['tighten', 'continue', 'title']) {
    assert.equal(buildAskPrompt({ ask, text: '', block: { type: 'text', text: 'para' }, title: 'T' }).wantsInsertable, true);
  }
  for (const ask of ['aside', 'reply']) {
    const p = buildAskPrompt({ ask, text: 'what do you think?', block: null, title: 'T' });
    assert.equal(p.wantsInsertable, false);
    assert.match(p.system, /guide|question|nudge|feedback/i);
    assert.match(p.system, /do not (write|draft)/i);
  }
});

test('buildAskPrompt: block + neighbours + title flow into the user prompt', () => {
  const p = buildAskPrompt({ ask: 'tighten', text: '', title: 'My Post',
    block: { type: 'text', text: 'wordy paragraph' },
    prevBlock: { type: 'heading', text: 'Intro' }, nextBlock: null });
  assert.match(p.user, /My Post/);
  assert.match(p.user, /wordy paragraph/);
  assert.match(p.user, /Intro/);
});

// ---- field-aware asks (spec addendum 9) -----------------------------------

test('buildAskPrompt: title ask with a current title asks for ONE variation, offered not imposed', () => {
  const p = buildAskPrompt({ ask: 'title', field: 'title', title: 'My Post' });
  assert.equal(p.wantsInsertable, true);
  assert.match(p.user, /one|ONE/);
  assert.match(p.user, /variation|alternative/i);
  assert.match(p.user, /take or leave|may use or ignore/i);   // offered, never imposed
  assert.match(p.user, /My Post/);                            // the current title is the seed
});

test('buildAskPrompt: title ask with NO title yet falls back to suggesting a fresh title', () => {
  const p = buildAskPrompt({ ask: 'title', field: 'title', title: '' });
  assert.equal(p.wantsInsertable, true);
  assert.match(p.user, /Suggest one strong title/);
});

test('buildAskPrompt: heading field shades guidance toward a variation/sharpening suggestion', () => {
  const p = buildAskPrompt({ ask: 'reply', text: 'thoughts?', field: 'heading',
    block: { type: 'heading', text: 'Why ships sink' } });
  assert.equal(p.wantsInsertable, false);
  assert.match(p.system, /heading/i);
  assert.match(p.system, /variation|sharpen/i);
  assert.match(p.system, /do not (write|draft)/i);   // guidance-first rule survives the shading
});

test('buildAskPrompt: body-text field shades guidance toward encouragement/reaction, never a rewrite', () => {
  for (const ask of ['reply', 'aside']) {
    const p = buildAskPrompt({ ask, text: 'how is this?', field: 'text',
      block: { type: 'text', text: 'a paragraph' } });
    assert.equal(p.wantsInsertable, false);
    assert.match(p.system, /encouragement|reaction|small suggestion/i);
    assert.match(p.system, /never rewrite|do not rewrite/i);
    assert.match(p.system, /do not (write|draft)/i);
  }
});

test('buildAskPrompt: field never changes wantsInsertable for ANY ask type', () => {
  for (const field of ['title', 'heading', 'text', 'image', null]) {
    for (const ask of ['tighten', 'continue', 'title']) {
      assert.equal(buildAskPrompt({ ask, field, block: { type: 'text', text: 'x' }, title: 'T' }).wantsInsertable, true);
    }
    for (const ask of ['aside', 'reply']) {
      assert.equal(buildAskPrompt({ ask, field, block: { type: 'text', text: 'x' }, title: 'T' }).wantsInsertable, false);
    }
  }
});

test('buildAskPrompt: insertable asks keep the write-only system prompt (no guidance shading)', () => {
  const p = buildAskPrompt({ ask: 'tighten', field: 'heading', block: { type: 'heading', text: 'H' } });
  assert.match(p.system, /Reply ONLY with the requested text/);
  assert.doesNotMatch(p.system, /sharpen/i);
});

// ---- rough-draft scratch (spec addendum 9: Rough draft rail) ---------------

test('addScratch: newest first, id/ts stamped, trims, returns the jot', () => {
  const t = createThread();
  const a = addScratch(t, '  first thought  ', 1000);
  const b = addScratch(t, 'second thought', 2000);
  assert.equal(t.scratch.length, 2);
  assert.deepEqual(t.scratch.map(x => x.text), ['second thought', 'first thought']);
  assert.equal(a.text, 'first thought');
  assert.equal(a.ts, 1000);
  assert.notEqual(a.id, b.id);
  assert.equal(addScratch(t, '   ', 3000), null);   // blank jots never land
  assert.equal(t.scratch.length, 2);
});

test('addScratch: initialises a missing scratch array (pre-scratch in-memory threads)', () => {
  const t = { v: 1, mode: 'chat', turns: [] };
  addScratch(t, 'hello', 1);
  assert.deepEqual(t.scratch.map(x => x.text), ['hello']);
});

test('removeScratch: removes by id and returns the jot; unknown id returns null', () => {
  const t = createThread();
  const a = addScratch(t, 'keep', 1);
  const b = addScratch(t, 'drop', 2);
  assert.equal(removeScratch(t, b.id).text, 'drop');
  assert.deepEqual(t.scratch.map(x => x.text), ['keep']);
  assert.equal(removeScratch(t, 'nope'), null);
  assert.equal(removeScratch({ v: 1, mode: 'chat', turns: [] }, a.id), null);
  assert.equal(t.scratch.length, 1);
});

test('scratch: serialize/parse round-trip keeps jots (the PUT path re-parses)', () => {
  const t = createThread();
  addScratch(t, 'a stray sentence', 5);
  addScratch(t, 'an idea', 6);
  assert.deepEqual(parseThread(serializeThread(t)), t);
});

test('parseThread: old sidecars without scratch parse to scratch []', () => {
  const raw = JSON.stringify({ v: 1, mode: 'chat', turns: [] });
  assert.deepEqual(parseThread(raw).scratch, []);
});

test('parseThread: drops malformed scratch entries, keeps valid jots', () => {
  const raw = JSON.stringify({ v: 1, mode: 'chat', turns: [], scratch: [
    { id: 's1', text: 'good', ts: 1 },
    { id: 42, text: 'bad id', ts: 2 },
    { id: 's3', text: null, ts: 3 },
    { id: 's4', text: 'no ts' },
    'garbage',
    null,
  ]});
  const t = parseThread(raw);
  assert.deepEqual(t.scratch, [{ id: 's1', text: 'good', ts: 1 }]);
});

test('parseThread: non-array scratch resets to []', () => {
  const raw = JSON.stringify({ v: 1, mode: 'chat', turns: [], scratch: { not: 'an array' } });
  assert.deepEqual(parseThread(raw).scratch, []);
});
