// Thread sidecar - the conversation layer of the chat-mode editor. Pure and DOM-free:
// blocks stay the single source of truth for CONTENT; this module only holds the
// author's asides, the AI's turns, and where they anchor. Device-local by design
// (never committed to the user's repo).
const ROLES = new Set(['aside', 'assistant']);
const KINDS = new Set(['guidance', 'insertable']);
const STATES = new Set(['open', 'accepted', 'dismissed']);
let _c = 0;

// Per-turn text cap (chars). 256K chars is roughly 50,000 words — far beyond any real
// turn (prompt assembly clips block text to 2,000 chars), but it stops a hostile or
// corrupt sidecar from pinning tens of MB in memory: the stress harness fed parseThread
// a valid 52MB single-turn JSON and the full text was retained and re-serialised on
// every save. parseThread DROPS an over-cap turn (it fails validation like any other
// malformed shape); appendTurn truncates so in-app writes always stay valid.
export const MAX_TURN_TEXT_CHARS = 256 * 1024;

// Doc is the default mode everywhere (owner decision 2026-07-21: Chat is opt-in);
// a saved 'chat' is per-post memory and is always honoured exactly.
export function createThread() { return { v: 1, mode: 'doc', turns: [], scratch: [] }; }

// Guidance-first role×kind invariant (owner rule): only known roles/kinds may enter
// the thread, and an aside (the AUTHOR speaking) is NEVER insertable — only the
// assistant's explicitly-requested drafts are. acceptTurn gates on kind==='insertable',
// so enforcing this here (and in parseThread's validTurn) means an aside can never BE
// insertable and therefore can never be accepted into the post.
const validRoleKind = (role, kind) =>
  ROLES.has(role) && KINDS.has(kind) && !(role === 'aside' && kind === 'insertable');

export function appendTurn(thread, { role, kind, text, blockRef = null }, now) {
  if (!validRoleKind(role, kind)) return null;   // reject: no turn, no mutation
  const turn = { id: 't' + Number(now).toString(36) + '-' + (_c++), role, kind,
    text: String(text || '').slice(0, MAX_TURN_TEXT_CHARS), blockRef, ts: now, state: 'open' };
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
  validRoleKind(t.role, t.kind) && typeof t.text === 'string' &&
  t.text.length <= MAX_TURN_TEXT_CHARS &&   // size cap — see MAX_TURN_TEXT_CHARS
  (t.blockRef === null || typeof t.blockRef === 'string') &&
  typeof t.ts === 'number' && STATES.has(t.state);

const validJot = (s) => s && typeof s === 'object' && typeof s.id === 'string' &&
  typeof s.text === 'string' && typeof s.ts === 'number';

export function parseThread(json) {
  let raw;
  try { raw = JSON.parse(json); } catch { return createThread(); }
  if (!raw || typeof raw !== 'object' || raw.v !== 1) return createThread();
  return { v: 1, mode: raw.mode === 'chat' ? 'chat' : 'doc',   // saved modes honoured exactly; anything else falls to the Doc default
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

// The reply format for the title workshop: three options the chips can re-parse.
const TITLE_FORMAT = 'Reply with exactly three options, one per line - no numbering, no bullets, no quotes, nothing else.';

export function buildAskPrompt({ ask, text = '', field = null, block = null, title = '', prevBlock = null, nextBlock = null, profile = null, recentReactions = null }) {
  const wantsInsertable = INSERTABLE_ASKS.has(ask);
  const voice = profile && profile.voice ? `\nAuthor voice notes: ${String(profile.voice).slice(0, 500)}` : '';
  // Reaction steering (spec §9 parked bundle): a compact liked/disliked digest of the
  // author's thumb reactions, computed by the caller (summarizeReactions). Tone only -
  // it steers taste, never agency, and never changes which asks are insertable.
  const steer = recentReactions
    ? `\nThe author reacted to some of your earlier guidance - lean toward what the author liked and away from what they disliked:\n${String(recentReactions).slice(0, 1200)}`
    : '';
  const system = wantsInsertable
    ? `You help an author write a blog post. Reply ONLY with the requested text, ready to drop into the post. No preamble, no quotes around it.${voice}${steer}`
    : `You are a writing guide inside the author's composer. Respond with a short question, nudge, or piece of feedback that moves their thinking forward.${FIELD_NOTES[field] || ''} Do not write or draft post text for them; guide, do not ghostwrite.${voice}${steer}`;
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
    // Title workshop: a post that already has a title gets THREE short variations of
    // it - offers the author can take or leave, never an imposition; a titleless post
    // gets three fresh candidates. One AI call either way; the chips re-parse the lines.
    title: title
      ? `Offer THREE short variations of the current title - alternatives the author can take or leave. ${TITLE_FORMAT}`
      : `Suggest three strong titles for this post - offers the author can take or leave. ${TITLE_FORMAT}`,
  };
  return { system, user: ctx.concat([asks[ask] || asks.aside]).join('\n\n'), wantsInsertable };
}

// ---- title workshop (spec §9 parked bundle) --------------------------------
// Re-parse a title-ask reply into tappable options. Tolerant of a model that
// ignores the format contract: numbering/bullets are stripped, wrapping quotes
// dropped, empties and (case-insensitive) duplicates skipped, capped at three.
export function parseTitleOptions(text) {
  const out = [], seen = new Set();
  for (const line of String(text == null ? '' : text).split(/\r?\n/)) {
    const t = line.trim()
      .replace(/^(?:[-*•]|\d+[.)])\s+/, '')                       // list prefixes
      .replace(/^["'“‘]+|["'”’]+$/g, '')      // wrapping quotes (straight + smart)
      .trim();
    if (!t) continue;
    const key = t.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(t);
    if (out.length === 3) break;
  }
  return out;
}

// ---- reaction thumbs → ask steering (spec §9 parked bundle) ----------------
// A compact digest of the author's 👍/👎 on the Partner's guidance: the last ten
// reacted guidance turns, each clipped to 80 chars. Asides, insertables and error
// bubbles never steer. Null when nothing was reacted (callers omit the field).
export function summarizeReactions(turns) {
  const reacted = (Array.isArray(turns) ? turns : []).filter((t) => t && t.role === 'assistant'
    && t.kind === 'guidance' && !t.error && (t.reaction === 'up' || t.reaction === 'down'));
  if (!reacted.length) return null;
  return reacted.slice(-10).map((t) => {
    const s = String(t.text || '').replace(/\s+/g, ' ').trim();
    return `The author ${t.reaction === 'up' ? 'liked' : 'disliked'}: "${s.slice(0, 80)}${s.length > 80 ? '…' : ''}"`;
  }).join('\n');
}
