# Chat-thread editor ("Thread") — design spec

Date: 2026-07-18 · Status: approved in conversation, pending owner review of this document
Authors: owner + Claude (Fable 5) · Cross-checker: Codex gpt-5.6-sol

## 1. Summary

Make writing a blog post in Chapbook Studio feel like a conversation. The block editor gains a
**Chat mode** in which the post renders as one scrolling message thread inside an elevated
"canvas" container: each block is a sent bubble, the existing compose bar is the chat input, and
the AI Partner participates as a guide. Chat is the default for new posts; the current editor
remains one tap away as **Doc mode**.

The editor already runs a permanent chat-mode composer (`_chatOn`, compose bar with
send/dictate/add-block, per-block `.chat-acts` rows), so this is an evolution of the existing
architecture, not a rewrite.

## 2. Goals

- Writing flows as messages: send a thought, it becomes a block in the thread.
- The AI is a **guide, not a ghostwriter**: nothing the AI says ever enters the post unless the
  author explicitly accepts an insertable suggestion into a block.
- Zero surprise token spend: the AI speaks only when addressed (BYOK).
- Safe rollout on a live product: Doc mode is untouched and always available.

## 3. Non-goals

- No change to the publish pipeline, blocks schema, or GitHub commit format. Published output is
  produced from blocks exactly as today.
- No AI turns are ever committed to the user's repo (privacy: threads may contain half-thoughts).
- No cross-device sync of conversation history in v1 (blocks still sync as today).
- The Partner view, Posts list, and marketing site are unchanged.

## 4. UX

### 4.1 The thread view (Chat mode)

- The whole post-edit area sits in one large rounded **canvas** container, visually lifted from
  the app chrome (owner request). Light theme: soft white panel against the grey chrome. Dark
  theme (default): an elevated surface one step brighter than the page background — "lighter"
  reads as elevation, not literal white. Bubbles float on the canvas; the compose bar docks to
  the canvas's bottom edge.
- Each block renders as a **sent bubble** (right-aligned, compact card). An image block is a
  photo message; a heading is a short bold message; embeds/galleries are media messages. Day
  dividers group writing sessions. A subtle "delivered / saved" tick replaces the autosave label
  (driven by the existing `setSaveState` states).
- Tapping a bubble binds it for in-place editing — this is today's `chatBind`, restyled. The
  existing per-block `.chat-acts` row (move/delete) carries over as the bubble's action row,
  plus the placement chips where the block type has them.
- The toolbar gains a **Chat / Doc** toggle. Doc mode is the current editor, byte-for-byte
  untouched. New posts open in Chat; existing posts remember their last mode (stored per post in
  the thread sidecar; absent sidecar = Doc for existing posts, Chat for new).

### 4.2 Talking to the AI (only when addressed)

Three explicit entry points; each one is a deliberate tap, so token spend is always intentional:

1. **Ask toggle on the compose bar** — flips the next message from "write into the post" to
   "say to the Partner". Author asides render as smaller italic bubbles, visually distinct from
   content bubbles.
2. **Reply on a bubble** — long-press/hover reveals `Reply · Tighten · Continue`; each sends
   that block (plus title and neighbouring context) with the request.
3. **Quick chips** under the newest bubble after an idle pause: `Continue this thought ·
   Tighten · Suggest a title`. Rendering chips is free; tapping one spends tokens.

AI replies stream in as left-aligned assistant bubbles with a typing indicator.

**Guidance-first rule (owner clarification):** by default the Partner replies with guidance —
questions, nudges, feedback — and those bubbles carry **no Accept button at all**. Only when the
author explicitly asked for text (Tighten, Continue, "draft me an intro") does the reply carry
`Accept · Retry · Dismiss`. Accept inserts the text as a block (or replaces the block it was a
reply to); the accepted text visually crosses from assistant bubble to sent bubble. The chat is
the workshop; the post is the shelf.

### 4.3 Errors and the no-key state

- AI failures render as an in-thread error bubble with Retry, using the existing `classifyError`
  (which now preserves typed codes) and `runHealing` from `seams/ai.js`.
- With no AI key configured, the Ask affordances stay visible but route to a friendly chip:
  "Connect a provider in Settings → Keys" (the `isNoKeyErr` path fixed in today's bug wave).
  Everything else in Chat mode works fully offline/keyless.

## 5. Data & persistence

- **Blocks doc: unchanged.** Same schema, same `/posts/:slug/blocks` routes, same publish.
- **Thread sidecar, local-only:** stored via the existing storage seam under `chat.<slug>`
  (new posts use the provisional draft id until a slug is reserved, then migrate). Contents:
  `{ mode: 'chat'|'doc', turns: [{ role:'author-aside'|'assistant', kind:'guidance'|'insertable',
  text, blockRef?, ts, state?:'accepted'|'dismissed' }] }`. Content bubbles are NOT duplicated in
  the sidecar — they render from the blocks doc; the sidecar holds only conversation turns and
  their anchoring (`blockRef` = block id the turn attaches after).
- Reopening a draft resumes the conversation. Quota pressure uses the existing
  `signalStorageFull` path; the sidecar is evictable without data loss (blocks are the truth).

## 6. Architecture

- **`src/core/thread.js` (new, pure):** thread state machine — turn append/accept/dismiss,
  interleaving of turns between block refs, prompt assembly for the three ask paths, sidecar
  (de)serialisation and migration. DOM-free, `node --test` like every core module.
- **`src/index.html`:** the Chat view rendering (bubble renderer over the existing block list),
  the canvas container + CSS (both themes), the Chat/Doc toggle, Ask toggle, reply affordances,
  chips. Reuses `chatBind`, `chatSend`, `.chat-acts`, the compose bar, and `tico` icons.
- **`src/seams/ai.js`:** unchanged contract; thread prompts go through the existing text calls.
- The dead `isSel` selection path (identified in today's audit) is retired for real as part of
  this work rather than left as dormant code.

## 7. Testing

- `core/thread.test.mjs`: state machine, prompt assembly, sidecar round-trip, migration,
  accept/dismiss semantics, guidance-vs-insertable classification.
- Existing HTML-string test conventions for the view: bubble renderer output for each block
  type, canvas/theme classes, toggle wiring (grep-gate style where appropriate).
- No changes to publish tests expected (non-goal 1). Full suite must stay green.

## 8. Rollout & risks

- Chat default for new posts; Doc for existing posts until switched; per-post memory.
- Escape hatch: the toggle. If a block type renders poorly as a bubble, Doc mode is always
  intact.
- Implementation: Fable 5 writes; Codex gpt-5.6-sol reviews each milestone's diff (owner's
  routing). Milestones: (1) core/thread.js + tests, (2) canvas + bubble rendering + toggle,
  (3) Ask/reply/chips + AI turns, (4) persistence + resume, (5) sol review + polish.

## 9. Addendum (owner, 2026-07-18, post-implementation review)

**Turn presentation.** AI suggestions/replies render in a *smaller* font than post content,
in a distinct accent colour (theme-aware tint, not body ink) — visually unmistakable as
"the Partner speaking", never post text. Author asides keep their italic small treatment.

**Context-aware asks (field awareness).** The Partner reads which surface the author is in
and shapes its reply accordingly, staying light-touch:
- Title field → suggest a variation of the title (short, one alternative, offered not imposed).
- Heading block → variation or sharpening suggestion.
- Body/text block → encouragement, a conversational reaction, or a small suggestion — never
  a rewrite unless the author explicitly asked (Tighten/Continue remain the explicit paths).
The existing rule stands: the AI only ever speaks when addressed, and only tighten/continue/
title-style asks yield insertable text. This addendum tunes *tone and target*, not agency.

**Approved improvement bundles (owner-selected 2026-07-18; all free of AI cost except none):**
*Alive bundle:* (a) Inbox ideas surface at the top of a NEW post's thread as tappable
"messages from past-you" (existing promoteIdea flow, chat-native entry); (b) warm re-entry:
reopening a draft renders a local recap line in the thread (sidecar timestamps + block/word
count, no AI call); (c) session momentum: a quiet "+N words this session" beside the saved
tick; (d) Enter sends in chat mode (Shift+Enter = newline), Doc mode unchanged, affordance
visible in the compose bar.
*Polish bundle:* (e) compose-bar camera button on phones — a photo "sent" like a message via
the existing darkroom/resize pipeline; (f) aria-live="polite" on incoming Partner turns;
(g) typing indicator respects prefers-reduced-motion.
*Parked (Smarter Partner bundle, future wave):* title-workshop 3-variation chips, reaction
thumbs feeding ask context, pre-publish-as-conversation chip, token-cost annotation.

**Rough draft rail (owner, 2026-07-18): REPLACES the Outline entirely.**
The editor's left rail becomes a per-post scratchpad for quickly jotting ideas and random
sentences to use in the post later. The Outline (rail + phone sheet + heading navigation)
is removed; the existing mobile toggle button and bottom sheet are repurposed as the Rough
draft entry points on narrow layouts.
- Storage: a `scratch` field on the thread sidecar (core/thread.js schema — parse/serialize
  carry it; device-local, migrates provisional-to-slug with the rest; NOT part of the blocks
  doc, never published).
- Interaction: line-based jots with an always-visible add-note input; tapping a jot places
  its text into the compose bar for edit-then-send (chat-native "use this"); a small delete
  affordance per jot. Doc mode shows the same rail content.
- Distinct from the Inbox: Inbox is global idea capture; Rough draft is per-post scratch.
- FOCUS MODE: the Rough draft stays available in focus mode (owner). Desktop: the rail
  remains visible (focus mode strips the other chrome but keeps the scratchpad); narrow
  layouts: the sheet toggle stays reachable. Rationale: focus mode is precisely when stray
  thoughts need a place to land without breaking the writing flow.
