# Chat-Thread Editor ("Thread") Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a Chat mode to the block editor where the post renders as a message thread on an elevated canvas and the AI joins as an explicitly-addressed, guidance-first partner (spec: `docs/superpowers/specs/2026-07-18-chat-thread-editor-design.md`).

**Architecture:** Chat mode is a *presentation layer* over the existing editor — the block list gets a `.thread-on` class and CSS does the bubble/canvas styling; block editing stays `chatBind`. Conversation state lives in a new pure module `src/core/thread.js`, persisted device-locally through the existing storage seam via new `/thread/:id` router routes. AI turns go through a new `/thread/turn` route that reuses the `ai` seam. The blocks doc, its schema, and publishing are untouched.

**Tech Stack:** Vanilla ES modules, esbuild bundle (`node build.mjs`), `node --test`, no new dependencies.

## Global Constraints

- Node >= 22.5; tests via `npm test` (root `node --test`); repo suite baseline **732 pass, 0 fail** — must never drop.
- NO em-dashes in any user-facing string (repo-wide rule enforced by tests).
- Inline handlers in `src/index.html` resolve against `window` — any inline `onclick` name MUST be `window.`-assigned; prefer `addEventListener` from the inline module.
- Do NOT edit `src/studio.js` / `src/darkroom-upload.js` (generated; rebuild with `node build.mjs`).
- Published blocks doc must be byte-identical for existing posts (no schema change).
- `Date.now()` allowed in app code, but every pure function takes `now`/id params so tests stay deterministic.
- Dark theme is default; light theme via `:root[data-theme="light"]`-style override (this app: `document.documentElement.dataset.theme==='light'`). All new CSS must handle both.
- Commit after each task (message style: `feat(thread): …`), code only — no push.

## File Structure

- `src/core/thread.js` (new) — thread state machine + prompt assembly + sidecar (de)serialisation. Pure, DOM-free.
- `src/core/thread.test.mjs` (new) — its tests.
- `src/router.js` (modify) — `/thread/:id` GET/PUT/DELETE (sidecar via storage seam) + `/thread/turn` POST (AI call).
- `src/router.test.mjs` (modify) — route tests with stub seams.
- `src/index.html` (modify) — canvas + bubble CSS, Chat/Doc toggle, turn rendering, Ask affordances, persistence wiring, isSel retirement.

---

### Task 1: `src/core/thread.js` — pure thread module

**Files:**
- Create: `src/core/thread.js`
- Test: `src/core/thread.test.mjs`

**Interfaces:**
- Produces (later tasks rely on these exact names):
  - `createThread() -> {v:1, mode:'chat', turns:[]}`
  - `appendTurn(thread, {role:'aside'|'assistant', kind:'guidance'|'insertable', text, blockRef=null}, now) -> turn` (mutates thread, returns turn with `id` `'t'+now.toString(36)+'-'+counter`, `ts:now`, `state:'open'`)
  - `acceptTurn(thread, id) -> turn|null` (sets `state:'accepted'`; only valid on `kind:'insertable'`, else returns null unchanged)
  - `dismissTurn(thread, id) -> turn|null` (sets `state:'dismissed'`)
  - `turnsFor(thread, blockRef) -> turn[]` (open+dismissed excluded? NO — returns turns with `state!=='dismissed'` anchored to that blockRef; `blockRef=null` = thread tail)
  - `serializeThread(thread) -> string` / `parseThread(json) -> thread` (invalid/legacy input -> `createThread()`; unknown `v` -> best-effort keep turns that validate)
  - `buildAskPrompt({ask:'aside'|'reply'|'tighten'|'continue'|'title', text, block, title, prevBlock, nextBlock, profile}) -> {system, user, wantsInsertable}` — `wantsInsertable` is `true` ONLY for `tighten`, `continue`, `title`; `aside`/`reply` are guidance (system prompt explicitly forbids drafting full replacement text and asks for questions/nudges/feedback).

- [ ] **Step 1: Write the failing tests** — `src/core/thread.test.mjs`:

```js
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
```

- [ ] **Step 2: Run** `node --test src/core/thread.test.mjs` — expect FAIL (module missing).
- [ ] **Step 3: Implement `src/core/thread.js`** (complete):

```js
// Thread sidecar - the conversation layer of the chat-mode editor. Pure and DOM-free:
// blocks stay the single source of truth for CONTENT; this module only holds the
// author's asides, the AI's turns, and where they anchor. Device-local by design
// (never committed to the user's repo).
const ROLES = new Set(['aside', 'assistant']);
const KINDS = new Set(['guidance', 'insertable']);
const STATES = new Set(['open', 'accepted', 'dismissed']);
let _c = 0;

export function createThread() { return { v: 1, mode: 'chat', turns: [] }; }

export function appendTurn(thread, { role, kind, text, blockRef = null }, now) {
  const turn = { id: 't' + Number(now).toString(36) + '-' + (_c++), role, kind,
    text: String(text || ''), blockRef, ts: now, state: 'open' };
  thread.turns.push(turn);
  return turn;
}

const find = (thread, id) => thread.turns.find((t) => t.id === id) || null;
export function acceptTurn(thread, id) {
  const t = find(thread, id);
  if (!t || t.kind !== 'insertable') return null;
  t.state = 'accepted'; return t;
}
export function dismissTurn(thread, id) {
  const t = find(thread, id);
  if (!t) return null;
  t.state = 'dismissed'; return t;
}
export function turnsFor(thread, blockRef) {
  return thread.turns.filter((t) => t.blockRef === blockRef && t.state !== 'dismissed');
}

export function serializeThread(thread) { return JSON.stringify(thread); }

const validTurn = (t) => t && typeof t === 'object' && typeof t.id === 'string' &&
  ROLES.has(t.role) && KINDS.has(t.kind) && typeof t.text === 'string' &&
  (t.blockRef === null || typeof t.blockRef === 'string') &&
  typeof t.ts === 'number' && STATES.has(t.state);

export function parseThread(json) {
  let raw;
  try { raw = JSON.parse(json); } catch { return createThread(); }
  if (!raw || typeof raw !== 'object' || raw.v !== 1) return createThread();
  return { v: 1, mode: raw.mode === 'doc' ? 'doc' : 'chat',
    turns: Array.isArray(raw.turns) ? raw.turns.filter(validTurn) : [] };
}

// ---- prompt assembly ------------------------------------------------------
// Guidance-first (owner rule): aside/reply NEVER produce insertable text - the
// system prompt forbids drafting; tighten/continue/title explicitly ask for text.
const INSERTABLE_ASKS = new Set(['tighten', 'continue', 'title']);
const blockText = (b) => !b ? '' : (b.text || b.caption || b.alt || '').slice(0, 2000);

export function buildAskPrompt({ ask, text = '', block = null, title = '', prevBlock = null, nextBlock = null, profile = null }) {
  const wantsInsertable = INSERTABLE_ASKS.has(ask);
  const voice = profile && profile.voice ? `\nAuthor voice notes: ${String(profile.voice).slice(0, 500)}` : '';
  const system = wantsInsertable
    ? `You help an author write a blog post. Reply ONLY with the requested text, ready to drop into the post. No preamble, no quotes around it.${voice}`
    : `You are a writing guide inside the author's composer. Respond with a short question, nudge, or piece of feedback that moves their thinking forward. Do not write or draft post text for them; guide, do not ghostwrite.${voice}`;
  const ctx = [];
  if (title) ctx.push(`Post title: ${title}`);
  if (prevBlock) ctx.push(`Previous block: ${blockText(prevBlock)}`);
  if (block) ctx.push(`Focus block (${block.type}): ${blockText(block)}`);
  if (nextBlock) ctx.push(`Next block: ${blockText(nextBlock)}`);
  const asks = {
    aside: `The author says: ${text}`,
    reply: `The author asks about the focus block: ${text || '(no message - give your reaction to the block)'}`,
    tighten: 'Tighten the focus block: same meaning, fewer words, keep the author voice.',
    continue: 'Continue the post from the focus block with one natural next paragraph.',
    title: 'Suggest one strong title for this post. Reply with the title text only.',
  };
  return { system, user: ctx.concat([asks[ask] || asks.aside]).join('\n\n'), wantsInsertable };
}
```

- [ ] **Step 4: Run** `node --test src/core/thread.test.mjs` — expect all PASS. Then `npm test` — 732 + new all green.
- [ ] **Step 5: Commit** `git add src/core/thread.js src/core/thread.test.mjs && git commit -m "feat(thread): pure thread module - turns, sidecar codec, ask prompts"`

---

### Task 2: router routes — sidecar CRUD + AI turn

**Files:**
- Modify: `src/router.js` (add routes; follow the existing `/drafts` + `/draft` handler patterns — read them first)
- Test: `src/router.test.mjs` (append; follow its existing stub-seam pattern)

**Interfaces:**
- Consumes: Task 1's `buildAskPrompt`, `parseThread`, `serializeThread`.
- Produces (Task 4/5 rely on): `GET /thread/:id -> thread` (fresh `createThread()` when absent), `PUT /thread/:id {thread} -> {ok:true}` (validated via parseThread(serialize) round-trip), `DELETE /thread/:id -> {ok:true}`, `POST /thread/turn {ask, text, block, title, prevBlock, nextBlock} -> {text, insertable}`.
- Storage collection name: `'threads'`, keyed by post slug or provisional draft id.

- [ ] **Step 1: Write failing route tests** in `src/router.test.mjs` (mirror the file's existing makeRouter stub setup; stub `ai.generate`/the text call the file's other AI-route tests stub — copy their seam shape exactly):

```js
test('thread routes: GET missing id returns a fresh thread; PUT round-trips; DELETE clears', async () => {
  const r = mk(); // the file's existing helper that builds a router with in-memory storage
  const fresh = await r.handle('GET', '/thread/my-post');
  assert.deepEqual(fresh, { v: 1, mode: 'chat', turns: [] });
  const t = { v: 1, mode: 'doc', turns: [{ id: 't1', role: 'aside', kind: 'guidance', text: 'x', blockRef: null, ts: 1, state: 'open' }] };
  assert.deepEqual(await r.handle('PUT', '/thread/my-post', t), { ok: true });
  assert.deepEqual(await r.handle('GET', '/thread/my-post'), t);
  await r.handle('DELETE', '/thread/my-post');
  assert.deepEqual(await r.handle('GET', '/thread/my-post'), { v: 1, mode: 'chat', turns: [] });
});

test('thread turn: guidance ask returns insertable:false and calls the ai seam once', async () => {
  const calls = [];
  const r = mk({ ai: { async generate({ system, user }) { calls.push({ system, user }); return 'why that angle?'; } } });
  const res = await r.handle('POST', '/thread/turn', { ask: 'reply', text: 'good?', block: { type: 'text', text: 'para' }, title: 'T' });
  assert.deepEqual(res, { text: 'why that angle?', insertable: false });
  assert.equal(calls.length, 1);
  assert.match(calls[0].system, /guide/i);
});

test('thread turn: tighten returns insertable:true', async () => {
  const r = mk({ ai: { async generate() { return 'tighter.'; } } });
  const res = await r.handle('POST', '/thread/turn', { ask: 'tighten', block: { type: 'text', text: 'wordy' } });
  assert.deepEqual(res, { text: 'tighter.', insertable: true });
});
```

(Adapter note for the implementer: `mk`/`r.handle` are placeholders for THIS file's actual helper + dispatch signature — `src/router.test.mjs` already tests routes; reuse its exact conventions and its existing ai-seam stub shape. The assertions above are the contract.)

- [ ] **Step 2: Run** `node --test src/router.test.mjs` — expect FAIL (routes missing).
- [ ] **Step 3: Implement** in `src/router.js`: import `{ createThread, parseThread, serializeThread, buildAskPrompt }` from `./core/thread.js`. Add, following the `/drafts` route block's structure and the storage seam's API exactly as `/drafts` uses it:

```js
// Thread sidecar - device-local conversation layer for the chat-mode editor.
if (method === 'GET' && m(path, '/thread/:id')) {
  const raw = await storage.get('threads', params.id);
  return raw ? parseThread(typeof raw === 'string' ? raw : JSON.stringify(raw)) : createThread();
}
if (method === 'PUT' && m(path, '/thread/:id')) {
  const clean = parseThread(serializeThread(body || {}));   // validates + strips junk
  await storage.put('threads', params.id, clean);
  return { ok: true };
}
if (method === 'DELETE' && m(path, '/thread/:id')) { await storage.del('threads', params.id); return { ok: true }; }
if (method === 'POST' && path === '/thread/turn') {
  const { system, user, wantsInsertable } = buildAskPrompt(body || {});
  const text = await ai.generate({ system, user });          // match the seam call the other AI routes use
  return { text, insertable: wantsInsertable };
}
```

(`m`, `params`, `storage`, `ai` = this file's existing helpers/seams; match its real dispatch idiom. If the ai seam's text call is named differently (e.g. `ai.text`/`ai.complete`), use the same call `/draft` uses.)

- [ ] **Step 4: Run** `node --test src/router.test.mjs` then `npm test` — all green.
- [ ] **Step 5: Commit** `git commit -am "feat(thread): /thread sidecar CRUD + /thread/turn ai route"`

---

### Task 3: canvas + bubbles + Chat/Doc toggle (presentation only)

**Files:**
- Modify: `src/index.html` (CSS block near the editor styles; toolbar near `id="cmdkBtn"`; inline module near the editor code)

**Interfaces:**
- Produces: `_threadMode` (bool), `setThreadMode(on)` (window-assigned), `#threadToggleBtn`, CSS classes `.thread-canvas`, `.thread-on`, `.turn`, `.turn-aside`, `.turn-assistant`, `.turn-error`. Task 4 renders `.turn` elements; Task 5 persists the mode.

- [ ] **Step 1: CSS.** Locate the editor style region (search `/* Pages & tabs (nav) editor`ic anchor or the `#v-editor` styles) and add:

```css
/* ── chat-mode canvas: the post as a conversation. The canvas is an elevated
   surface (owner: "big container, lighter background") - literal light panel in
   light theme, one-step-elevated surface in dark. Bubbles float on it. ── */
.thread-canvas{border-radius:20px;padding:1rem 1rem 5.5rem;background:var(--surface);
  border:1px solid var(--line);box-shadow:0 8px 30px rgba(0,0,0,.18)}
[data-theme="light"] .thread-canvas{background:#fbfaf7;box-shadow:0 8px 30px rgba(30,30,60,.07)}
.thread-on .blk{max-width:78%;margin-left:auto;border-radius:16px 16px 4px 16px;
  background:var(--bg-1);border:1px solid var(--line);padding:.7rem .9rem}
.thread-on .blk.editing{max-width:100%;margin-left:0}
.turn{max-width:78%;margin:.5rem auto .5rem 0;border-radius:16px 16px 16px 4px;
  padding:.65rem .85rem;font-size:.92rem;line-height:1.45;border:1px solid var(--line)}
.turn-aside{max-width:60%;margin-left:auto;margin-right:0;font-style:italic;
  border-radius:16px 16px 4px 16px;color:var(--mut);background:transparent;border-style:dashed}
.turn-assistant{background:var(--surface-2,var(--bg-1));color:var(--ink)}
.turn-error{border-color:#b4552f;color:#c96}
.turn-acts{display:flex;gap:.4rem;margin-top:.45rem}
.turn-acts button{font-size:.78rem;padding:.25rem .6rem;border-radius:999px}
.thread-typing{opacity:.7;font-style:italic}
```

(Variable names `--surface`, `--bg-1`, `--line`, `--mut`, `--ink` are the app's existing tokens — verify each exists with grep before use; substitute the file's actual token if a name differs. `.blk` = verify the real per-block wrapper class in `renderBlockEl` and use that; `.editing` = the real bound-block class `chatBind` applies.)

- [ ] **Step 2: Toggle button.** Next to the command-palette button (`id="cmdkBtn"`, ~line 3621) add:

```html
<button class="btn ghost" type="button" id="threadToggleBtn" aria-label="Switch between chat and document view"></button>
```

- [ ] **Step 3: Mode wiring.** In the inline module near the editor code:

```js
/* ── chat-mode presentation: a class flip over the SAME block list. Doc mode is
   the untouched editor; nothing here re-implements block editing (chatBind). ── */
let _threadMode = false;
function setThreadMode(on){
  _threadMode = !!on;
  const host = $('BLOCK_LIST_CONTAINER_ID');            // the real block-list element - resolve via renderBlockEl's parent
  if(!host) return;
  host.classList.toggle('thread-canvas', _threadMode);
  host.classList.toggle('thread-on', _threadMode);
  const btn = $('threadToggleBtn');
  if(btn) btn.innerHTML = _threadMode ? tico('file-text') + ' Doc' : tico('message-circle') + ' Chat';
  if(window.__threadRenderTurns) window.__threadRenderTurns();   // Task 4 hook; harmless no-op before it exists
}
window.setThreadMode = setThreadMode;
$('threadToggleBtn')?.addEventListener('click', () => setThreadMode(!_threadMode));
```

Replace `BLOCK_LIST_CONTAINER_ID` with the actual id (find where `renderBlockEl` output is appended). Verify `tico` names exist in `icons-sprite.svg` (`grep 'id="ti-message-circle"' src/icons-sprite.svg`); fall back to any existing chat/document icon ids.
- [ ] **Step 4: Entry points.** In `startNewPost` (new posts) call `setThreadMode(true)`; in `openBlockEditor` call `setThreadMode(false)` for now (Task 5 replaces both with the persisted per-post mode). The saved tick: where `setSaveState` writes its label, when `_threadMode` show `✓ saved` instead of the doc-mode label (read `setSaveState` first; smallest possible change).
- [ ] **Step 5: Verify.** `node build.mjs` (build's inline-module guard = the syntax gate) then `npm test` — 0 fail. Manual: `python3 -m http.server 4173 -d dist` → open `/app`, new post → canvas + right-aligned bubbles; toggle flips to the untouched Doc editor; block tap still edits.
- [ ] **Step 6: Commit** `git commit -am "feat(thread): canvas + bubble presentation + chat/doc toggle"`

---

### Task 4: Ask affordances + AI turns UI

**Files:**
- Modify: `src/index.html`

**Interfaces:**
- Consumes: Task 2 routes, Task 3 classes/`_threadMode`, Task 1 turn shapes (via routes), existing `api()`, `classifyError`, `isNoKeyErr`, `toast`, `tico`, `chatSend`, `mkId`.
- Produces: module-level `_thread` (current thread object), `renderTurns()` (assigned to `window.__threadRenderTurns`), `askPartner(ask, {text, blockId})`, `#chatAskToggle`, `#threadChips`.

- [ ] **Step 1: Compose-bar Ask toggle.** Next to `#chatMic`/`#chatSendBtn` (~line 3656) add `<button type="button" id="chatAskToggle" aria-label="Ask the Partner instead of writing into the post">✦</button>`. Wiring: a module flag `_askMode`; toggling adds class `on`; when `_askMode` and the user sends, intercept in the same place `chatSend` is invoked from the send button/Enter (wrap the existing listener): call `askPartner('aside', {text})` instead of `chatSend()`, then clear input + `_askMode`.
- [ ] **Step 2: Quick chips.** `<div id="threadChips" hidden></div>` directly above the compose bar. Render three buttons (`Continue this thought`, `Tighten`, `Suggest a title`) when `_threadMode` and the editor has ≥1 block; each calls `askPartner('continue'|'tighten'|'title', {blockId: lastBlockId()})`.
- [ ] **Step 3: Bubble actions.** In the `.chat-acts` row builder (~8925), when `_threadMode` append `Reply`, `Tighten`, `Continue` buttons calling `askPartner('reply'|'tighten'|'continue', {blockId})` (`Reply` first focuses the compose bar in ask mode with the block pinned).
- [ ] **Step 4: `askPartner` + `renderTurns`** (complete logic; adapt names to real block-doc accessors):

```js
let _thread = null;   // loaded/saved in Task 5; until then createThread-shaped literal
let _askBusy = false;
async function askPartner(ask, { text = '', blockId = null } = {}){
  if(_askBusy) return; _askBusy = true;
  const doc = currentDoc();                              // the editor's real in-memory blocks doc accessor
  const i = blockId ? doc.blocks.findIndex(b => b.id === blockId) : -1;
  const payload = { ask, text, title: currentTitle(),
    block: i >= 0 ? doc.blocks[i] : null,
    prevBlock: i > 0 ? doc.blocks[i-1] : null, nextBlock: i >= 0 ? doc.blocks[i+1] || null : null };
  const pending = { id: 'pending', role: 'assistant', kind: 'guidance', text: '…', blockRef: blockId, ts: Date.now(), state: 'open', typing: true };
  _thread.turns.push(pending); renderTurns();
  try {
    const r = await api('/thread/turn', { method: 'POST', body: JSON.stringify(payload) });
    _thread.turns.pop();
    _thread.turns.push({ id: 't' + Date.now().toString(36) + '-' + _thread.turns.length,
      role: 'assistant', kind: r.insertable ? 'insertable' : 'guidance', text: r.text, blockRef: blockId, ts: Date.now(), state: 'open' });
    if (ask !== 'aside') {} else _thread.turns.splice(_thread.turns.length - 1, 0,
      { id: 'a' + Date.now().toString(36), role: 'aside', kind: 'guidance', text, blockRef: blockId, ts: Date.now(), state: 'open' });
    saveThread();                                        // Task 5; define as no-op stub here
  } catch (e) {
    _thread.turns.pop();
    const err = classifyError({ raw: e });
    const friendly = isNoKeyErr(e) ? 'Connect an AI provider in Settings → Keys to chat with the Partner.' : err.message;
    _thread.turns.push({ id: 'e' + Date.now().toString(36), role: 'assistant', kind: 'guidance', text: friendly, blockRef: blockId, ts: Date.now(), state: 'open', error: true, retry: { ask, text, blockId } });
  } finally { _askBusy = false; renderTurns(); }
}
```

`renderTurns()`: remove all `.turn` nodes, then for each block element (matching the block wrapper class) insert after it the `.turn` elements for `turnsFor(_thread, blockId)`-equivalent filtering (inline: `_thread.turns.filter(t => t.blockRef === id && t.state !== 'dismissed')`), and append `blockRef:null` turns at the list end. Assistant turn DOM: text + `.turn-acts` — insertable+open → `Accept · Retry · Dismiss`; guidance → `Dismiss` only; `error:true` → class `turn-error` + `Retry` (re-calls `askPartner(retry.ask, retry)`). Accept: insert `{type:'text', text: turn.text, id: mkId()}` after `blockRef`'s index (or replace that block's text when the ask was `tighten` — replace, don't insert, for tighten; `title` asks set the title field instead), mark turn accepted, `markDirty()`, re-render blocks + turns. Assign `window.__threadRenderTurns = renderTurns`.
- [ ] **Step 5: Verify.** `node build.mjs && npm test` green. Manual on the local server WITHOUT an AI key: ask → friendly no-key bubble (not an auth error); with a key configured the call path matches `/draft`'s behavior. Escape/dismiss/accept flows by hand; tighten replaces, continue inserts.
- [ ] **Step 6: Commit** `git commit -am "feat(thread): ask affordances, ai turns, accept/dismiss/retry"`

---

### Task 5: persistence + per-post mode + provisional migration

**Files:**
- Modify: `src/index.html`

**Interfaces:**
- Consumes: Task 2 `/thread/:id` routes; the editor's slug/provisional-id variables (find where `startNewPost` stores the provisional draft id and where publish reserves the real slug).
- Produces: `loadThread(id)`, `saveThread()` (debounced 800ms, replaces Task 4 stub), `migrateThread(fromId, toId)`.

- [ ] **Step 1: Implement.**

```js
let _threadId = null, _threadSaveT = 0;
async function loadThread(id){
  _threadId = id;
  try { _thread = await api('/thread/' + encodeURIComponent(id)); }
  catch { _thread = { v: 1, mode: 'chat', turns: [] }; }
  setThreadMode(isNewPostEntry() ? _thread.mode !== 'doc' : _thread.mode === 'chat');
  renderTurns();
}
function saveThread(){
  clearTimeout(_threadSaveT);
  _threadSaveT = setTimeout(() => {
    _thread.mode = _threadMode ? 'chat' : 'doc';
    api('/thread/' + encodeURIComponent(_threadId), { method: 'PUT', body: JSON.stringify(_thread) }).catch(() => {});
  }, 800);
}
async function migrateThread(fromId, toId){
  if (!fromId || fromId === toId) { _threadId = toId; return; }
  _threadId = toId; saveThread();
  api('/thread/' + encodeURIComponent(fromId), { method: 'DELETE' }).catch(() => {});
}
```

Wire: `startNewPost` → `loadThread(provisionalId)`; `openBlockEditor(slug)` → `loadThread(slug)`; slug reservation success (`reserveSlug` call sites in doPublish/doSchedule) → `migrateThread(provisionalId, slug)`; `setThreadMode` also calls `saveThread()` (mode memory). Spec default rule: new posts default chat, existing posts default doc → `isNewPostEntry()` = the same signal `editorSection==='write'` uses.
- [ ] **Step 2: Verify.** Build + tests green. Manual: chat with a draft, close, reopen → turns and mode restored; publish → thread survives under the real slug.
- [ ] **Step 3: Commit** `git commit -am "feat(thread): per-draft persistence, mode memory, provisional migration"`

---

### Task 6: retire the dead isSel path

**Files:**
- Modify: `src/index.html` (delete `attachResize` + the `isSel` gate ~10721, the per-block `▲▼✕` context toolbar block ~10724-10742, the dead `.be-fmt` bar render ~8544 — all confirmed unreachable by today's audit since `selectedId` is never set; `#selFmt` replaced formatting and Task 3+ replaced the rest)

- [ ] **Step 1:** Delete the dead branches; grep that `attachResize`, the toolbar builder, and the `.be-fmt` renderer have no remaining callers; keep `#selFmt` (live).
- [ ] **Step 2:** `node build.mjs && npm test` — green; manual smoke: block editing, placement chips, formatting bar all still work in both modes.
- [ ] **Step 3: Commit** `git commit -am "refactor(thread): remove dead isSel selection path"`

---

### Task 7: verification milestone + Codex review

- [ ] **Step 1:** `node build.mjs`; `npm test` (expect >= 732 + new, 0 fail); serve dist and run a Playwright smoke of: new post in chat mode, toggle, ask (no-key path), accept-insert, reopen-resume, Doc-mode regression pass over the editor toolbar buttons.
- [ ] **Step 2:** Codex cross-check (owner's routing):
  `/Applications/ChatGPT.app/Contents/Resources/codex exec --cd /Users/inayatsmac/Projects/chapbook --skip-git-repo-check --sandbox read-only -m gpt-5.6-sol -c model_reasoning_effort=high "<review prompt over the feature diff>" < /dev/null`
- [ ] **Step 3:** Fix everything sol confirms; re-run tests; final commit.
