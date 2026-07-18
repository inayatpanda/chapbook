import test from 'node:test';
import assert from 'node:assert/strict';
import { createThread, appendTurn, acceptTurn, dismissTurn, turnsFor, serializeThread, parseThread, buildAskPrompt } from './thread.js';

test('createThread: v1, chat mode, empty turns', () => {
  assert.deepEqual(createThread(), { v: 1, mode: 'chat', turns: [] });
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
