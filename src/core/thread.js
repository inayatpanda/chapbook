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
