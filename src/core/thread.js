// Thread sidecar - the conversation layer of the chat-mode editor. Pure and DOM-free:
// blocks stay the single source of truth for CONTENT; this module only holds the
// author's asides, the AI's turns, and where they anchor. Device-local by design
// (never committed to the user's repo).
const ROLES = new Set(['aside', 'assistant']);
const KINDS = new Set(['guidance', 'insertable']);
const STATES = new Set(['open', 'accepted', 'dismissed']);
let _c = 0;

export function createThread() { return { v: 1, mode: 'chat', turns: [], scratch: [] }; }

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

// ---- rough-draft scratch (spec addendum 9) --------------------------------
// Per-post jots - quick lines to use in the post later. Device-local like the
// turns (never published); the rail renders in array order, newest first.
export function addScratch(thread, text, now) {
  const t = String(text == null ? '' : text).trim();
  if (!t) return null;
  const jot = { id: 's' + Number(now).toString(36) + '-' + (_c++), text: t, ts: now };
  if (!Array.isArray(thread.scratch)) thread.scratch = [];   // pre-scratch in-memory threads
  thread.scratch.unshift(jot);
  return jot;
}
export function removeScratch(thread, id) {
  if (!Array.isArray(thread.scratch)) return null;
  const i = thread.scratch.findIndex((s) => s && s.id === id);
  if (i < 0) return null;
  return thread.scratch.splice(i, 1)[0];
}

export function serializeThread(thread) { return JSON.stringify(thread); }

const validTurn = (t) => t && typeof t === 'object' && typeof t.id === 'string' &&
  ROLES.has(t.role) && KINDS.has(t.kind) && typeof t.text === 'string' &&
  (t.blockRef === null || typeof t.blockRef === 'string') &&
  typeof t.ts === 'number' && STATES.has(t.state);

const validJot = (s) => s && typeof s === 'object' && typeof s.id === 'string' &&
  typeof s.text === 'string' && typeof s.ts === 'number';

export function parseThread(json) {
  let raw;
  try { raw = JSON.parse(json); } catch { return createThread(); }
  if (!raw || typeof raw !== 'object' || raw.v !== 1) return createThread();
  return { v: 1, mode: raw.mode === 'doc' ? 'doc' : 'chat',
    turns: Array.isArray(raw.turns) ? raw.turns.filter(validTurn) : [],
    scratch: Array.isArray(raw.scratch) ? raw.scratch.filter(validJot) : [] };
}

// ---- prompt assembly ------------------------------------------------------
// Guidance-first (owner rule): aside/reply NEVER produce insertable text - the
// system prompt forbids drafting; tighten/continue/title explicitly ask for text.
const INSERTABLE_ASKS = new Set(['tighten', 'continue', 'title']);
const blockText = (b) => !b ? '' : (b.text || b.caption || b.alt || '').slice(0, 2000);

// `field` (spec addendum 9, context-aware asks) names the surface the author is
// in - 'title' | 'heading' | 'text' | any other block type - and tunes TONE AND
// TARGET only, never agency: guidance asks stay guidance (shaded system prompt),
// insertable asks keep the write-only prompt, and wantsInsertable is untouched.
const FIELD_NOTES = {
  heading: ' The author is working on a heading: offer one variation or a sharpening suggestion they can take or leave, and touch nothing else.',
  text: ' The author is in a body paragraph: respond with encouragement, a conversational reaction, or one small suggestion. Never rewrite their text; rewriting only happens when they explicitly ask to tighten or continue.',
};

export function buildAskPrompt({ ask, text = '', field = null, block = null, title = '', prevBlock = null, nextBlock = null, profile = null }) {
  const wantsInsertable = INSERTABLE_ASKS.has(ask);
  const voice = profile && profile.voice ? `\nAuthor voice notes: ${String(profile.voice).slice(0, 500)}` : '';
  const system = wantsInsertable
    ? `You help an author write a blog post. Reply ONLY with the requested text, ready to drop into the post. No preamble, no quotes around it.${voice}`
    : `You are a writing guide inside the author's composer. Respond with a short question, nudge, or piece of feedback that moves their thinking forward.${FIELD_NOTES[field] || ''} Do not write or draft post text for them; guide, do not ghostwrite.${voice}`;
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
    // A post that already has a title gets ONE short variation of it - an offer the
    // author can take or leave, never an imposition; a titleless post gets a fresh one.
    title: title
      ? 'Offer ONE short variation of the current title - an alternative the author can take or leave. Reply with the title text only.'
      : 'Suggest one strong title for this post. Reply with the title text only.',
  };
  return { system, user: ctx.concat([asks[ask] || asks.aside]).join('\n\n'), wantsInsertable };
}
