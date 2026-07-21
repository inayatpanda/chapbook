import test from 'node:test';
import assert from 'node:assert/strict';
import { createThread, appendTurn, acceptTurn, dismissTurn, turnsFor, serializeThread, parseThread, buildAskPrompt, addScratch, removeScratch, parseTitleOptions, summarizeReactions } from './thread.js';

test('createThread: v1, doc mode (Chat is opt-in), empty turns + empty scratch', () => {
  assert.deepEqual(createThread(), { v: 1, mode: 'doc', turns: [], scratch: [] });
});

// Owner decision 2026-07-21: Doc is the default everywhere; a saved 'chat' is
// per-post memory and must survive the round-trip exactly (mode honoured, not defaulted).
test('parseThread: saved chat mode is honoured; absent/junk mode falls to doc', () => {
  assert.equal(parseThread(JSON.stringify({ v: 1, mode: 'chat', turns: [] })).mode, 'chat');
  assert.equal(parseThread(JSON.stringify({ v: 1, turns: [] })).mode, 'doc');
  assert.equal(parseThread(JSON.stringify({ v: 1, mode: 'banana', turns: [] })).mode, 'doc');
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

// Title workshop (spec §9 parked bundle, now shipped): the explicit title ask returns
// THREE variations in ONE AI call - the prompt is the contract (exactly three, one per
// line, no numbering/quotes) and parseTitleOptions re-parses them at render time.
test('buildAskPrompt: title ask with a current title asks for THREE variations, offered not imposed', () => {
  const p = buildAskPrompt({ ask: 'title', field: 'title', title: 'My Post' });
  assert.equal(p.wantsInsertable, true);
  assert.match(p.user, /three|THREE/i);
  assert.match(p.user, /variation|alternative/i);
  assert.match(p.user, /take or leave|may use or ignore/i);   // offered, never imposed
  assert.match(p.user, /My Post/);                            // the current title is the seed
});

test('buildAskPrompt: title ask with NO title yet asks for three fresh titles', () => {
  const p = buildAskPrompt({ ask: 'title', field: 'title', title: '' });
  assert.equal(p.wantsInsertable, true);
  assert.match(p.user, /three strong title/i);
});

test('buildAskPrompt: BOTH title branches demand one per line, no numbering, no quotes', () => {
  for (const title of ['My Post', '']) {
    const p = buildAskPrompt({ ask: 'title', field: 'title', title });
    assert.match(p.user, /one per line/i);
    assert.match(p.user, /no numbering/i);
    assert.match(p.user, /no quotes/i);
  }
});

test('parseTitleOptions: splits lines, trims, drops empties, caps at three', () => {
  assert.deepEqual(parseTitleOptions('First title\n\n  Second title \nThird title\nFourth title'),
    ['First title', 'Second title', 'Third title']);
  assert.deepEqual(parseTitleOptions('Only one'), ['Only one']);
  assert.deepEqual(parseTitleOptions(''), []);
  assert.deepEqual(parseTitleOptions(null), []);
  assert.deepEqual(parseTitleOptions('   \n \n'), []);
});

test('parseTitleOptions: tolerant of numbered/bulleted lines - prefixes stripped', () => {
  assert.deepEqual(parseTitleOptions('1. Alpha\n2) Beta\n- Gamma'), ['Alpha', 'Beta', 'Gamma']);
  assert.deepEqual(parseTitleOptions('* Alpha\n• Beta\n3. Gamma'), ['Alpha', 'Beta', 'Gamma']);
});

test('parseTitleOptions: strips wrapping quotes and de-dupes (case-insensitive)', () => {
  assert.deepEqual(parseTitleOptions('"Quoted Title"\n“Smart Quoted”\nQuoted title'),
    ['Quoted Title', 'Smart Quoted']);
});

test('parseTitleOptions: windows newlines tolerated', () => {
  assert.deepEqual(parseTitleOptions('A\r\nB\r\nC'), ['A', 'B', 'C']);
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

// ---- reaction thumbs feeding ask context (spec §9 parked bundle) ------------

test('parseThread: reaction and tk extra fields survive the round-trip (the PUT path re-parses)', () => {
  const raw = JSON.stringify({ v: 1, mode: 'chat', turns: [
    { id: 't1', role: 'assistant', kind: 'guidance', text: 'why that angle?', blockRef: null,
      ts: 1, state: 'open', reaction: 'up', tk: 42 },
    { id: 't2', role: 'assistant', kind: 'guidance', text: 'meh', blockRef: null,
      ts: 2, state: 'open', reaction: 'down' },
  ]});
  const t = parseThread(raw);
  assert.equal(t.turns.length, 2);
  assert.equal(t.turns[0].reaction, 'up');
  assert.equal(t.turns[0].tk, 42);
  assert.equal(t.turns[1].reaction, 'down');
  assert.deepEqual(parseThread(serializeThread(t)), t);
});

test('summarizeReactions: compact liked/disliked lines from reacted guidance turns only', () => {
  const turns = [
    { role: 'assistant', kind: 'guidance', text: 'Try opening with the storm.', state: 'open', reaction: 'up' },
    { role: 'assistant', kind: 'guidance', text: 'Cut the second paragraph?', state: 'open', reaction: 'down' },
    { role: 'assistant', kind: 'guidance', text: 'unreacted guidance', state: 'open' },
    { role: 'assistant', kind: 'insertable', text: 'a draft', state: 'open', reaction: 'up' },   // insertable never steers
    { role: 'aside', kind: 'guidance', text: 'my own note', state: 'open', reaction: 'up' },     // the author's aside never steers
    { role: 'assistant', kind: 'guidance', text: 'an error bubble', state: 'open', reaction: 'up', error: true },
  ];
  const s = summarizeReactions(turns);
  assert.match(s, /liked: "Try opening with the storm\."/);
  assert.match(s, /disliked: "Cut the second paragraph\?"/);
  assert.doesNotMatch(s, /unreacted|a draft|my own note|error bubble/);
});

test('summarizeReactions: caps at the last 10 reacted turns, truncates each to 80 chars with …', () => {
  const turns = [];
  for (let i = 0; i < 14; i++) turns.push({ role: 'assistant', kind: 'guidance',
    text: 'guidance number ' + i + ' ' + 'x'.repeat(100), state: 'open', reaction: i % 2 ? 'up' : 'down' });
  const s = summarizeReactions(turns);
  const lines = s.split('\n');
  assert.equal(lines.length, 10);                       // last ~10 only
  assert.doesNotMatch(s, /guidance number 3 /);         // older reactions age out
  assert.match(s, /guidance number 13 /);               // newest kept
  for (const l of lines){ assert.ok(l.length < 120, 'compact line: ' + l.length); assert.match(l, /…"$/); }
});

test('summarizeReactions: null when nothing was reacted (and on junk input)', () => {
  assert.equal(summarizeReactions([]), null);
  assert.equal(summarizeReactions([{ role: 'assistant', kind: 'guidance', text: 'x', state: 'open' }]), null);
  assert.equal(summarizeReactions(null), null);
});

test('buildAskPrompt: recentReactions folds a steering line into the system prompt (guidance AND insertable)', () => {
  const steer = 'The author liked: "Try opening with the storm."';
  for (const ask of ['reply', 'tighten']) {
    const p = buildAskPrompt({ ask, text: 'x', block: { type: 'text', text: 'para' }, recentReactions: steer });
    assert.match(p.system, /lean toward what (the author|they) liked/i);
    assert.match(p.system, /Try opening with the storm/);
  }
});

test('buildAskPrompt: no steering line when recentReactions is absent/empty', () => {
  for (const rr of [undefined, null, '']) {
    const p = buildAskPrompt({ ask: 'reply', text: 'x', recentReactions: rr });
    assert.doesNotMatch(p.system, /lean toward/i);
  }
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

// ---- post-session reply routing (inline module) -----------------------------
// threadReplyKept lives in src/index.html's inline module (the inline module
// can't import core/ at runtime). The DECISION is pure - (reqToken, postToken,
// editorOpen) → keep/discard - so extract the real shipped source and test it
// directly, avoiding the mirror-drift trap slug.js documents.
import { readFileSync } from 'node:fs';
function extractThreadReplyKept(){
  const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  const m = html.match(/function threadReplyKept\([^)]*\)\{[^{}]*\}/);
  assert.ok(m, 'threadReplyKept found in the inline module');
  return new Function('return (' + m[0] + ')')();
}

test('threadReplyKept: kept ONLY when same post-session AND the editor is open', () => {
  const kept = extractThreadReplyKept();
  assert.equal(kept(7, 7, true), true);    // same session, editor open → reply lands live
  assert.equal(kept(7, 8, true), false);   // switched / reopened post → discard
  assert.equal(kept(8, 7, true), false);   // mismatch is symmetric → discard
  assert.equal(kept(7, 7, false), false);  // editor closed → discard even with an equal token
});

test('threadReplyKept: editorOpen coerces truthy/falsy; tokens compare strictly', () => {
  const kept = extractThreadReplyKept();
  assert.equal(kept(7, 7, 0), false);              // falsy open state → discard
  assert.equal(kept(7, 7, 'editor-open'), true);   // truthy open state → keep
  assert.equal(kept('7', 7, true), false);         // no type coercion may keep a reply
  assert.equal(kept(7, 7, true), true);            // and the strict path still keeps
});

// ---- discard-orphan self-heal (boot sweep) ---------------------------------
// When discard's blocks DELETE lands but the thread DELETE fails, an orphaned
// /thread/__untitled__ record survives with no retry affordance (the recovery card
// only checks the BLOCKS record). A once-per-boot sweep deletes it. The DECISION is
// pure - (threadRecord, blocksIsDraft, composingUntitled) → sweep/leave - extracted
// from the shipped inline module like threadReplyKept above.
function extractOrphanSweepEligible(){
  const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  const m = html.match(/function orphanSweepEligible\([^)]*\)\{[^{}]*\}/);
  assert.ok(m, 'orphanSweepEligible found in the inline module');
  return new Function('return (' + m[0] + ')')();
}

test('orphanSweepEligible: sweeps ONLY an orphan - thread record present, blocks draft absent, not composing', () => {
  const ok = extractOrphanSweepEligible();
  const rec = { v: 1, mode: 'chat', turns: [] };
  assert.equal(ok(rec, false, false), true);    // the orphan: sidecar with no blocks record → sweep
  assert.equal(ok(rec, true, false), false);    // blocks draft present → a real recoverable draft, leave it
  assert.equal(ok(null, false, false), false);  // no sidecar → nothing to sweep
  assert.equal(ok(rec, false, true), false);    // an untitled post is being composed → never sweep under it
  assert.equal(ok(rec, true, true), false);     // composing + draft → definitely leave
});

test('orphanSweepEligible: truthiness only - a GET-shaped record object counts, undefined/null never do', () => {
  const ok = extractOrphanSweepEligible();
  assert.equal(ok(undefined, false, false), false);
  assert.equal(ok({ v: 1, mode: 'doc', turns: [], scratch: [] }, 0, 0), true);
});
