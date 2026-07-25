import { validateDoc } from './blocks.js';
import { listFamilies, getFamily, buildInstance } from './playgrounds/index.js';
import { listFamilies as listFigureFamilies, build as buildFigure } from './figures/registry.js';
import { sanitise } from './figures/svg.js';
import { buildStyle, buildGoblinSystem, factGuardLine, DEFAULT_PROFILE } from './profile.js';

/* ============================================================
   Studio — the AI drafting brain.
   Uses the provider-agnostic AI layer so drafting works
   through whatever provider the owner configures.

   The house voice is no longer hardcoded: every prompt's identity
   + voice text is COMPOSED from an author/voice PROFILE (passed in
   per call). A fresh install gets a generic, non-medical voice
   (DEFAULT_PROFILE); the user's own identity is supplied at call-time.

   Each exported function accepts an optional `profile` — server routes
   pass config.studio.profile; the browser router passes the config-seam
   profile. When omitted, DEFAULT_PROFILE keeps the generic voice.
   ============================================================ */

// buildStyle(profile) replaces the old hardcoded STYLE const. A profile-less
// call still works (generic default), so existing call sites and tests degrade
// gracefully. The `factGuardLine` is profile-driven too ("clinical facts" only
// when the profile says so).
const styleFor = (profile) => buildStyle(profile);
const guardFor = (profile) => factGuardLine(profile);

// A short blog-domain descriptor for the visual-asset prompts (interactive/figure/
// sticker generation), driven by the profile's subjects. Replaces an old hardcoded
// subject list (e.g. "history / cooking / technology blog"). Falls back to a neutral phrase.
const blogDomainFor = (profile) => {
  const about = (profile && profile.writesAbout && String(profile.writesAbout).trim());
  return about ? `a dark-themed blog about ${about}` : 'a dark-themed personal blog';
};
// The short "do not invent" clause for visual-asset prompts, profile-driven. The old
// code hardcoded a domain-specific facts clause; now a generic profile says
// "facts or specific statistics" and a specialist profile can narrow it.
const visualGuardFor = (profile) => {
  const p = (profile && profile.factGuard) ? String(profile.factGuard) : DEFAULT_PROFILE.factGuard;
  // factGuard is e.g. "facts, statistics or studies" (a specialist profile may narrow it).
  return `Do not invent ${p} or specific statistics — keep any numbers clearly illustrative.`;
};

const TONES = {
  professional: 'Tone: professional and measured — the default house voice.',
  wry: 'Tone: a touch wry and dry-humoured, still precise. Never goofy.',
  plain: 'Tone: plain and spare. Short words, no flourish.',
  playful: 'Tone: a little playful and warm, but never hype or cringe.',
};
const LENGTHS = { short: '40–80 words.', medium: '80–150 words.', long: '150–250 words.' };
const tone = (t) => TONES[t] || TONES.professional;
const len = (l) => LENGTHS[l] || LENGTHS.medium;

/* Learn-from-their-posts: fold a few of the user's OWN posts into a prompt as
   VOICE EXAMPLES, so the model matches how they actually write — intentionally
   diverging from the literal onboarding answers. `voicePosts` is [{title, body}]
   (the caller — server partner.gatherContext / browser router — supplies the 1–2
   most recent). Each excerpt is capped so the prompt stays lean. Returns '' when
   there are none, so the block simply drops out. The framing tells the model these
   are a GUIDE to the cadence, not text to copy. */
function voiceExamplesBlock(voicePosts = []) {
  const list = (Array.isArray(voicePosts) ? voicePosts : [])
    .filter((p) => p && (p.body || p.title))
    .slice(0, 2);
  if (!list.length) return '';
  const ex = list.map((p, i) =>
    `--- VOICE EXAMPLE ${i + 1}${p.title ? `: "${String(p.title)}"` : ''} ---\n${String(p.body || '').slice(0, 1400)}`
  ).join('\n\n');
  return `Here is how they actually write — match this cadence and texture, but do NOT copy phrasings; write fresh on the new topic:\n${ex}\n\n`;
}

/** Draft 1 social post + 2 alt hooks. Returns {post, hooks[]}. */
// Hard cap on free-text prose fed to a paid model. Without it, the only bound is the 12 MB
// body limit (~3M tokens/request, repeatable) → cost-amplification. 12k chars (~3k tokens)
// is generous for any single idea/passage/source. (H7)
const AI_INPUT_CAP = 12000;
const capInput = (s) => String(s == null ? '' : s).slice(0, AI_INPUT_CAP);

export async function draftPost({ idea, platform = 'linkedin', extra = '', tone: toneKey = 'professional', length = 'medium', profile, voicePosts = [], provider } = {}, ai) {
  idea = capInput(idea);
  extra = capInput(extra);
  const user = `Platform: ${platform}.
${tone(toneKey)}
Length: ${len(length)}
Raw idea / topic:
"""${idea}"""
${extra ? `Extra context: ${extra}\n` : ''}${voiceExamplesBlock(voicePosts)}Write ONE finished post in their voice for this platform. Then, on a new line after a literal "---HOOKS---" separator, give 2 alternative opening hook lines (one per line), each a different angle. Do not number them. No preamble, no commentary.`;
  const { text } = await ai.generateText({ provider, system: styleFor(profile), prompt: user, maxTokens: 900 });
  const [post, hookBlock = ''] = String(text).split('---HOOKS---');
  const hooks = hookBlock.split('\n').map((h) => h.replace(/^[-*\d.\s]+/, '').trim()).filter(Boolean).slice(0, 3);
  return { post: post.trim(), hooks };
}

/** Expand into a full blog article. Returns {title, description, tags, body} via structured output. */
export async function expandToBlog({ idea, post = '', profile, voicePosts = [], provider } = {}, ai) {
  const schema = { type: 'object', additionalProperties: false,
    properties: { title: { type: 'string' }, description: { type: 'string' }, tags: { type: 'array', items: { type: 'string' } }, body: { type: 'string' } },
    required: ['title', 'description', 'tags', 'body'] };
  const user = `Write a longer blog article on this topic, in their voice.
Topic / seed:
"""${idea}"""
${post ? `They already drafted this short post on it:\n"""${post}"""\n` : ''}${voiceExamplesBlock(voicePosts)}Write a blog article (500–900 words) in clean Markdown for the "body" field. Use a few "## " subheadings. Measured and substantive, not padded. British spelling. No front-matter, no H1 in the body. "description" is a one-sentence card summary; "tags" are lower-case topic tags.`;
  const { json } = await ai.generateText({ provider, system: styleFor(profile), prompt: user, maxTokens: 2500, json: schema, effort: 'medium' });
  return json;
}

/** One source → per-platform optimised variants. Returns an object keyed by requested platform. */
export async function socialPack({ source, platforms = ['linkedin', 'instagram', 'x'], tone: toneKey = 'professional', url = '', profile, provider } = {}, ai) {
  source = capInput(source); // (H7)
  const allowed = platforms.filter((p) => ['linkedin', 'instagram', 'x', 'facebook'].includes(p));
  const props = {}; allowed.forEach((p) => { props[p] = { type: 'string' }; });
  const schema = { type: 'object', additionalProperties: false, properties: props, required: allowed };
  const link = String(url || '').trim();
  // The link is appended deterministically below (per-platform), so tell the model NOT to
  // include URLs itself — Instagram strips caption links, so it gets a "link in bio" line.
  const linkNote = link ? `
A link to the full article WILL be appended automatically, so do NOT write any URL yourself.
- linkedin: leave room; end on a line that invites reading the full piece.
- instagram: end naturally; do not mention a URL (Instagram can't link captions).
- x: keep it tight — keep the post itself ≤ 250 characters so the link fits.` : '';
  const user = `${tone(toneKey)}
From this source material, write ONE optimised post per requested platform, each in their voice.
- linkedin: ~80–150 words, a strong first line, at most a couple of hashtags if they fit.
- instagram: shorter, caption-style; a hook line then a few tight lines.
- x: ≤ 280 characters, punchy, no thread.
- facebook: conversational, 50–120 words, reads like talking to colleagues — no hashtag pile.${linkNote}
Source material:
"""${source}"""`;
  const { json } = await ai.generateText({ provider, system: styleFor(profile), prompt: user, maxTokens: 1200, json: schema });
  if (!link) return json;
  // Append the link per platform: LinkedIn + X get the URL; Instagram gets "link in bio".
  const out = { ...json };
  if (out.linkedin) out.linkedin = `${out.linkedin.trim()}\n\nFull article → ${link}`;
  if (out.x) out.x = `${out.x.trim()} ${link}`;
  if (out.instagram) out.instagram = `${out.instagram.trim()}\n\nFull article — link in bio 🔗`;
  return out;
}

/**
 * One source → a multi-part repurposing: an X/Twitter thread (numbered tweets) or a
 * LinkedIn carousel (slide texts). Returns { format, parts: [string] }. House voice.
 * Nothing is posted — the caller shows the parts as editable cards the owner shares
 * manually (Copy / native share sheet). British spelling; no fabricated facts (profile-driven guard).
 */
export async function repurposeThread({ source, format = 'x-thread', profile, provider } = {}, ai) {
  const src = capInput(String(source || '').trim()); // (H7)
  if (src.length < 3) throw Object.assign(new Error('Give me some source text to repurpose.'), { status: 400 });
  const fmt = format === 'li-carousel' ? 'li-carousel' : 'x-thread';
  const schema = { type: 'object', additionalProperties: false,
    properties: { parts: { type: 'array', items: { type: 'string' } } }, required: ['parts'] };
  const guide = fmt === 'li-carousel'
    ? `Produce a LinkedIn CAROUSEL: 5–8 slides. Each "parts" entry is the text for ONE slide.
- Slide 1 is the hook/cover: a strong title line, very few words.
- Each middle slide makes ONE point in a sentence or two — short enough to read on a phone-sized card.
- The final slide is a quiet close or takeaway. Do NOT write "swipe", "link in bio", slide numbers, or hashtags inside the slides.`
    : `Produce an X (Twitter) THREAD: 4–8 tweets. Each "parts" entry is ONE tweet.
- Number each tweet "n/" at the start (1/, 2/, …). Keep every tweet ≤ 270 characters including the number.
- Tweet 1 is the hook and must stand alone. Each subsequent tweet advances one idea.
- No "link in bio". At most one or two hashtags in the whole thread, only if they truly fit — usually none.`;
  const user = `Repurpose the source below into their voice.
${guide}
${guardFor(profile)} British spelling.
Source material:
"""${src}"""`;
  const { json } = await ai.generateText({ provider, system: styleFor(profile), prompt: user, maxTokens: 1600, json: schema });
  const parts = (Array.isArray(json && json.parts) ? json.parts : [])
    .map((p) => String(p == null ? '' : p).trim())
    .filter(Boolean);
  if (!parts.length) throw Object.assign(new Error('No parts came back — try again.'), { code: 'AI_REFUSAL', status: 422 });
  return { format: fmt, parts };
}

/* ── Goblin mode (AI) ────────────────────────────────────────────────────────
   A deliberately CHAOTIC idea-hurler to beat the blank page. It does NOT use the
   measured house voice — it has its own system prompt that LICENSES wit, absurd
   framings and contrarian angles. The output is SPARKS, not publishable copy: ~5
   punchy hooks + one-line angles to provoke writing. The one hard guard survives:
   no fabricated facts/statistics presented as true — absurd metaphors and
   "what if" framings are fine, invented numbers-as-fact are not. British spelling.
   The system prompt is COMPOSED from the profile (buildGoblinSystem) so the goblin
   ranges across THE USER'S territory, not a hardcoded surgical one. */

/**
 * Goblin mode — hurl ~5 deliberately chaotic post ideas to beat the blank page.
 * Returns { ideas: [{ hook, angle }] }. With a `topic`, riffs feral on it; without,
 * goes fully feral across the owner's whole territory. A passed `seed` (and the topic)
 * are folded into the prompt to nudge run-to-run variety; the model's temperature does
 * the rest. SPARKS, not publishable copy. British spelling; no fabricated facts-as-true.
 */
export async function goblinMode({ topic = '', seed, profile, provider } = {}, ai) {
  const t = String(topic || '').trim();
  const territory = (profile && profile.writesAbout) ? String(profile.writesAbout) : DEFAULT_PROFILE.writesAbout;
  const schema = { type: 'object', additionalProperties: false,
    properties: { ideas: { type: 'array', items: { type: 'object', additionalProperties: false,
      properties: { hook: { type: 'string' }, angle: { type: 'string' } },
      required: ['hook', 'angle'] } } },
    required: ['ideas'] };
  // Fold the seed + topic into the prompt to push variety run-to-run (the model's own
  // temperature does the heavy lifting; this just nudges it down a different path).
  const spice = (seed == null || seed === '') ? Math.random().toString(36).slice(2, 8) : String(seed).slice(0, 40);
  const user = `${t
    ? `Riff CHAOTICALLY on this topic: """${t}""". Stay roughly in its orbit but come at it from angles they'd never expect.`
    : `No topic given — go FULLY FERAL across their whole territory (${territory}, and the odd corners of it). Range wide; surprise them.`}

Hurl EXACTLY 5 ideas. Each idea is:
- "hook": a punchy, provocative title/opening line (a few words to a short sentence) — the kind that makes them stop scrolling.
- "angle": ONE line saying what the post actually does / the unexpected take it runs with.

Make all 5 genuinely DIFFERENT from each other — different shapes (a contrarian take, a wild metaphor, an "explain like…", an absurd framing, a "what nobody admits"). No two should rhyme. Be specific and a little unhinged.

(chaos seed: ${spice} — let it send you somewhere new.)`;
  const { json } = await ai.generateText({ provider, system: buildGoblinSystem(profile), prompt: user, maxTokens: 1100, json: schema, temperature: 1 });
  const ideas = (Array.isArray(json && json.ideas) ? json.ideas : [])
    .map((i) => ({ hook: String((i && i.hook) || '').trim(), angle: String((i && i.angle) || '').trim() }))
    .filter((i) => i.hook || i.angle)
    .slice(0, 6);
  if (!ideas.length) throw Object.assign(new Error('The goblin came up empty — give it a poke (try again).'), { code: 'AI_REFUSAL', status: 422 });
  return { ideas };
}

/* ── AI editor pass ──────────────────────────────────────────────────────────
   A whole-draft critique of the current post, judged against the owner's LOCKED
   house voice + an editor rubric. It surfaces actionable FINDINGS only — it never
   auto-edits or auto-publishes, and never returns rewritten blocks (a hard project
   rule). The owner reads the notes and edits by hand. Browser-safe (no node
   built-ins): bundled into the BYOK Studio alongside goblinMode. */

// Browser-safe block→plain-text: strips block markup to plain text for the model,
// keeping headings/quotes so structure findings have something to point at, and emitting
// a short marker line for non-text blocks (interactive/figure/image/embed/gallery) so the
// model can SEE what is already there (e.g. won't suggest adding an interactive when one
// exists) and critiques prose inside tables/raw blocks. No DOM, no node built-ins.
const stripTags = (s) => String(s == null ? '' : s).replace(/<[^>]+>/g, ' ').replace(/&[a-z#0-9]+;/gi, ' ').replace(/\s+/g, ' ').trim();
function docToPlainText(doc) {
  const blks = Array.isArray(doc && doc.blocks) ? doc.blocks : [];
  return blks.map((b) => {
    if (!b) return '';
    if (b.type === 'heading') return `## ${String(b.text || '')}`;
    if (b.type === 'text' || b.type === 'quote') {
      return stripTags(b.html != null ? b.html : (b.text || ''));
    }
    // Non-text blocks: a marker line so the model knows they exist (these are NOT prose —
    // see the <40-char prose guard in editorPass, which strips markers before measuring).
    if (b.type === 'playground') {
      return `[interactive: ${stripTags(b.name || b.familyId || b.title) || 'playground'}]`;
    }
    if (b.type === 'figure') {
      return `[figure: ${stripTags(b.label || b.title || b.caption) || 'figure'}]`;
    }
    if (b.type === 'image') {
      const alt = stripTags(b.alt);
      return alt ? `[image: ${alt}]` : '[image]';
    }
    if (b.type === 'embed') {
      let where = '';
      const raw = String(b.url || b.src || b.provider || '').trim();
      if (raw) { try { where = new URL(raw).host; } catch { where = stripTags(b.provider) || raw.slice(0, 60); } }
      return `[embed: ${where || 'embed'}]`;
    }
    if (b.type === 'gallery') {
      const n = Array.isArray(b.images) ? b.images.length : (Array.isArray(b.items) ? b.items.length : 0);
      return `[gallery: ${n} image${n === 1 ? '' : 's'}]`;
    }
    // table → include its text content so prose in cells IS critiqued.
    if (b.type === 'table') {
      const rows = Array.isArray(b.rows) ? b.rows : [];
      const txt = rows.map((row) => (Array.isArray(row) ? row : [])
        .map((cell) => stripTags(cell && typeof cell === 'object' ? (cell.html != null ? cell.html : cell.text) : cell))
        .filter(Boolean).join(' | ')).filter(Boolean).join('\n');
      return txt || stripTags(b.html != null ? b.html : b.text);
    }
    // raw → include its text/markdown content so any prose in it is critiqued.
    if (b.type === 'raw') {
      return stripTags(b.html != null ? b.html : (b.markdown != null ? b.markdown : (b.text || b.content)));
    }
    return '';
  }).filter(Boolean).join('\n\n');
}

const EDITOR_RUBRIC = `
EDITOR RUBRIC — you are now their line editor. Critique the WHOLE draft below against their rules and return STRUCTURED findings. Suggestions ONLY: do NOT rewrite the post, do NOT return edited copy — point at problems and propose tighter alternatives they can choose to apply.

Judge against these, by category:
- voice: flag HYPE ("world-class", "passionate", "game-changer", "revolutionary", "cutting-edge", "seamless", "unlock", "leverage", "in today's fast-paced…"), humble HEDGING ("I was lucky enough to…", "I just…", "I'm no expert but…"), marketing FILLER, and "Let's talk"/CTA fluff. Their voice IS allowed to be witty and dry — that is GOOD; never flag wit, dry humour or a strong point of view. Flag only hype, hedging and filler.
- structure: a buried lede, a weak opening line, a weak or missing close, heading-hierarchy jumps (H2→H4), and sections that run too long.
- clarity: flabby or wordy sentences, needless passive voice, undefined jargon, and repetition — give a tighter rewrite in the suggestion.
- engagement: where an interactive playground or a figure/diagram would strengthen a point (he aims for at least one interactive per post).
- spelling: British-spelling slips (color→colour, -ize→-ise where the British form takes -ise, etc.).

For each finding give: category, severity (must-fix | consider | nit), the offending quote (verbatim from the draft, or "" if it is a whole-draft/structural note), a one-line issue, and a concrete suggestion (a tighter rewrite where it applies). Order findings most-important first. At most 25 findings — the few that matter, not a pedantic sweep.
Do NOT invent facts, statistics or studies in your suggestions — only tighten what they already wrote; never add a claim they did not make.
"summary" is one or two sentences on the draft overall. "score" is 0–100: higher means closer to their voice and more ready to publish. British spelling throughout your notes.`;

/**
 * Editor pass — whole-draft critique in the locked house voice. Converts the block
 * `doc` to plain text, asks the model (STYLE + EDITOR RUBRIC) to grade it and list
 * actionable findings, and returns { summary, score, findings:[{category, severity,
 * quote, issue, suggestion}] }. Findings are trimmed, empties dropped, capped at 25;
 * category/severity are clamped to their enums. A genuinely CLEAN draft (a summary
 * and/or score with zero findings) is a SUCCESS — it returns { ..., findings: [] } so
 * the UI shows its "Looks clean" state. Too little prose → 400; only a response with
 * nothing usable (no summary AND no score AND no findings) → AI_REFUSAL/422. NEVER
 * mutates the doc or returns edited blocks — suggestions only (a hard project rule).
 * British spelling in the rubric.
 */
export async function editorPass({ doc, profile, provider } = {}, ai) {
  const text = docToPlainText(doc);
  // Measure ACTUAL prose for the too-short guard: drop heading markers ("## ") and the
  // bracketed non-text markers ("[interactive: …]", "[figure: …]", etc.) so a draft that is
  // only a playground/figure still reads as "not enough written yet". The full `text`
  // (markers included) is what the model sees, so it knows those blocks exist.
  const prose = text.replace(/^##\s+/gm, '').replace(/^\[[^\]]*\]$/gm, '').trim();
  if (prose.length < 40) {
    throw Object.assign(new Error('There isn’t enough written yet to critique — write a paragraph or two, then run the editor pass.'), { status: 400 });
  }
  const CATEGORIES = ['voice', 'structure', 'clarity', 'engagement', 'spelling'];
  const SEVERITIES = ['must-fix', 'consider', 'nit'];
  const schema = {
    type: 'object', additionalProperties: false,
    required: ['summary', 'score', 'findings'],
    properties: {
      summary: { type: 'string' },
      score: { type: 'integer' },
      findings: { type: 'array', items: {
        type: 'object', additionalProperties: false,
        required: ['category', 'severity', 'issue', 'suggestion'],
        properties: {
          category: { type: 'string', enum: CATEGORIES },
          severity: { type: 'string', enum: SEVERITIES },
          quote: { type: 'string' },
          issue: { type: 'string' },
          suggestion: { type: 'string' },
        },
      } },
    },
  };
  const user = `Critique this draft. Return ONLY the JSON the schema requires.

DRAFT (plain text; "## " marks a heading):
"""${text.slice(0, 12000)}"""`;
  const { json } = await ai.generateText({ provider, system: styleFor(profile) + '\n' + EDITOR_RUBRIC, prompt: user, maxTokens: 2800, json: schema, effort: 'medium' });
  const summary = String((json && json.summary) || '').trim();
  // A missing/null score stays null (Number(null) would coerce to 0 and read as a real grade).
  const rawScore = json == null ? null : json.score;
  let score = (rawScore == null || rawScore === '') ? null : Number(rawScore);
  score = Number.isFinite(score) ? Math.max(0, Math.min(100, Math.round(score))) : null;
  const findings = (Array.isArray(json && json.findings) ? json.findings : [])
    .map((f) => ({
      category: CATEGORIES.includes(f && f.category) ? f.category : 'clarity',
      severity: SEVERITIES.includes(f && f.severity) ? f.severity : 'consider',
      quote: String((f && f.quote) || '').trim(),
      issue: String((f && f.issue) || '').trim(),
      suggestion: String((f && f.suggestion) || '').trim(),
    }))
    .filter((f) => f.issue || f.suggestion)   // a finding with neither is noise
    .slice(0, 25);
  // Only a genuinely empty response is a refusal: no summary AND no score AND no findings.
  // A clean draft (summary and/or score, zero findings) is a SUCCESS → the UI shows "Looks clean".
  if (!findings.length && !summary && score == null) {
    throw Object.assign(new Error('No editor notes came back — try again.'), { code: 'AI_REFUSAL', status: 422 });
  }
  return { summary, score, findings };
}

/** Rough notes → a validated block document {version, blocks[]}. */
export async function structureNotes({ notes, profile, provider } = {}, ai) {
  notes = capInput(notes); // (H7)
  const schema = { type: 'object', additionalProperties: false,
    properties: { blocks: { type: 'array', items: { type: 'object', additionalProperties: false,
      properties: { type: { type: 'string', enum: ['heading', 'text', 'quote'] }, level: { type: 'integer' }, text: { type: 'string' } },
      required: ['type', 'text'] } } },
    required: ['blocks'] };
  const user = `Turn these rough notes into a structured set of blocks for a blog post, in their voice.
Use 'heading' (level 2 or 3), 'text' (a paragraph; inline markdown **bold** *italic* [text](url) allowed), and 'quote' blocks. Don't invent facts; structure what's there.
Notes:
"""${notes}"""`;
  const { json } = await ai.generateText({ provider, system: styleFor(profile), prompt: user, maxTokens: 2500, json: schema, effort: 'medium' });
  const src = Array.isArray(json?.blocks) ? json.blocks : [];
  const blocks = src.map((b, i) => {
    const id = `gen-${Date.now()}-${i}`;
    if (b.type === 'heading') return { id, type: 'heading', level: b.level === 3 ? 3 : 2, text: String(b.text || '') };
    if (b.type === 'quote') return { id, type: 'quote', html: String(b.text || '') };
    return { id, type: 'text', html: String(b.text || '') };
  });
  const doc = { version: 1, blocks };
  try { validateDoc(doc); }
  catch (e) { throw Object.assign(new Error(`AI produced an invalid block doc: ${e.message}`), { code: 'AI_STRUCTURE', status: 502 }); }
  return doc;
}

/** Factual alt-text for an image (vision). Returns {alt}. */
export async function altText({ imageBase64, mimeType = 'image/jpeg', provider } = {}, ai) {
  const { text } = await ai.describeImage({ provider, imageBase64, mimeType, maxTokens: 120,
    prompt: 'Write a single concise alt-text sentence (max 140 characters) describing this image factually for a blog. Do not start with "image of" or "photo of". British spelling. Return only the sentence.' });
  return { alt: String(text || '').trim().replace(/^["']|["']$/g, '').slice(0, 200) };
}

/** Inline rewrite of a selected passage. action ∈ rewrite|tighten|wittier|british|expand|simplify. */
const REWRITE_ACTIONS = {
  rewrite:  'Rewrite this passage more clearly and naturally, keeping the meaning and roughly the same length.',
  tighten:  'Tighten this passage: cut filler, hedging and redundancy while keeping every real point. Shorter is better.',
  wittier:  'Make this passage a touch wittier and drier, in keeping with the established voice — never add hype, never change the facts.',
  british:  'Correct this passage to British spelling and idiom. Change nothing else.',
  expand:   'Expand this passage by one or two sentences with a concrete example or specific detail. Do not pad or add hype.',
  simplify: 'Rewrite this passage so a reader with no background in the subject understands it, without dumbing down or losing the facts.',
};
export async function rewriteText({ text, action = 'rewrite', profile, provider } = {}, ai) {
  const t = capInput(String(text || '').trim()); // (H7)
  if (t.length < 2) throw Object.assign(new Error('Select some text to rewrite.'), { status: 400 });
  const instr = REWRITE_ACTIONS[action] || REWRITE_ACTIONS.rewrite;
  const user = `${instr}

Return ONLY the rewritten passage — no preamble, no surrounding quotes, no markdown fences, no explanation. Preserve any inline emphasis (**bold**, *italic*) and links if present.

PASSAGE:
${t}`;
  const { text: out } = await ai.generateText({ provider, system: styleFor(profile), prompt: user, maxTokens: 900 });
  return { text: String(out || '').trim().replace(/^["']|["']$/g, '') };
}

/** Suggest a meta description + tags for a post. Returns {description, tags[]}. */
export async function seoSuggest({ title = '', body = '', profile, provider } = {}, ai) {
  const schema = { type: 'object', additionalProperties: false,
    properties: { description: { type: 'string' }, tags: { type: 'array', items: { type: 'string' } } }, required: ['description', 'tags'] };
  const user = `For this blog post, write a one-sentence meta description (max ~160 characters) and up to 6 lower-case topical tags. British spelling. Measured, not clickbait.
Title: ${title}
Body:
"""${String(body).slice(0, 4000)}"""`;
  const { json } = await ai.generateText({ provider, system: styleFor(profile), prompt: user, maxTokens: 400, json: schema });
  return { description: String(json.description || ''), tags: (json.tags || []).map((x) => String(x).toLowerCase().trim()).filter(Boolean).slice(0, 6) };
}

/* ── Citation tidy (AI) ─────────────────────────────────────────────────────
   Reformat ONE messy free-text reference into a clean citation in the chosen
   style. Deterministic DOI (Crossref) / PMID (eutils) lookups are preferred and
   need no AI; this is the fallback for a reference typed/pasted by hand. It uses
   its OWN system prompt (not the house voice) — a reference is bibliographic
   data, not prose. The cardinal rule is: NEVER invent. Only reformat what is
   given; omit anything missing. */
const CITATION_STYLES = {
  vancouver: 'Vancouver (numbered, UK medical standard): "Surname AB, Surname CD. Article title. Abbreviated Journal. Year;Volume(Issue):Pages." List up to six authors then ", et al". Include "doi: 10.xxxx/..." at the end if a DOI is present.',
  ama: 'AMA: similar to Vancouver but the journal title is italicised in print; here, plain text: "Surname AB, Surname CD. Article title. Journal. Year;Volume(Issue):Pages. doi:..."',
  harvard: 'Harvard (author–date): "Surname, A.B. and Surname, C.D. (Year) \'Article title\', Journal, Volume(Issue), pp. Pages."',
};
const CITATION_SYSTEM = `You are a meticulous medical librarian. You reformat a single bibliographic reference into a requested citation style. You output ONLY the one formatted reference string — no preamble, no numbering, no surrounding quotes, no commentary.

Absolute rules:
- NEVER invent or guess any detail. Use ONLY what is present in the input. If a field (author, year, journal, volume, pages, DOI) is missing, simply omit it — do not fabricate it, do not write "n.d." or placeholders.
- Do not "correct" facts (do not change a year, a title, or an author you are unsure about).
- British spelling.
- Normalise author initials, punctuation, and spacing to the requested style; that is the only transformation you perform on the substance.`;

/** Tidy ONE messy reference into a clean citation string. Returns {text}. */
export async function formatCitation({ raw, style = 'vancouver', provider } = {}, ai) {
  const input = String(raw || '').trim();
  if (input.length < 4) throw Object.assign(new Error('Give me a reference to tidy.'), { status: 400 });
  const styleKey = String(style || 'vancouver').toLowerCase();
  const styleNote = CITATION_STYLES[styleKey] || CITATION_STYLES.vancouver;
  const schema = { type: 'object', additionalProperties: false,
    properties: { text: { type: 'string' } }, required: ['text'] };
  const user = `Reformat the reference below into ${styleKey.toUpperCase()} style.
Style guide: ${styleNote}

Return JSON {"text": "<the one formatted reference>"}. Use ONLY the details present below; omit anything missing. Do not invent authors, years, journals, volumes, pages or DOIs.

REFERENCE (messy, as given):
"""${input}"""`;
  const { json } = await ai.generateText({ provider, system: CITATION_SYSTEM, prompt: user, maxTokens: 400, json: schema });
  const text = String((json && json.text) || '').trim().replace(/^["']|["']$/g, '').replace(/\s+/g, ' ');
  if (!text) throw Object.assign(new Error('Could not format that reference.'), { code: 'AI_REFUSAL', status: 422 });
  return { text };
}

/** Import a document (PDF/image) via the AI layer → a validated block doc {version, blocks[]}. */
export async function importDocument({ fileBase64, mimeType, provider } = {}, ai) {
  const schema = { type: 'object', additionalProperties: false,
    properties: { blocks: { type: 'array', items: { type: 'object', additionalProperties: false,
      properties: {
        type: { type: 'string', enum: ['heading', 'text', 'quote', 'table'] },
        level: { type: 'integer' },
        text: { type: 'string' },
        header: { type: 'array', items: { type: 'string' } },
        rows: { type: 'array', items: { type: 'array', items: { type: 'string' } } },
      },
      required: ['type'] } } },
    required: ['blocks'] };
  const { json } = await ai.readDocument({
    system: 'Extract this document into clean blocks. British spelling. Do not invent content — only what is in the document.',
    instruction: 'Extract the document into a structured list of blocks (headings, paragraphs as text, quotes, tables). Preserve order. Do not invent content.',
    fileBase64, mimeType, json: schema, provider });
  const src = Array.isArray(json?.blocks) ? json.blocks : [];
  let i = 0;
  const blocks = src.map((b) => {
    const id = `imp-${i++}`;
    if (b.type === 'heading') return { id, type: 'heading', level: b.level === 3 ? 3 : 2, text: String(b.text || '') };
    if (b.type === 'quote') return { id, type: 'quote', html: String(b.text || '') };
    if (b.type === 'table') return {
      id, type: 'table',
      header: Array.isArray(b.header) ? b.header.map((h) => String(h ?? '')) : [],
      rows: Array.isArray(b.rows) ? b.rows.map((r) => (Array.isArray(r) ? r.map((c) => String(c ?? '')) : [])) : [],
    };
    return { id, type: 'text', html: String(b.text || '') };
  });
  const doc = { version: 1, blocks };
  validateDoc(doc);
  return doc;
}

/** Generate an image via the AI layer. Returns {base64, mimeType} (or passes through {url}). */
export async function genImage({ prompt, size, provider } = {}, ai) {
  const r = await ai.generateImage({ provider, prompt, size });
  if (r && r.url) return { url: r.url };
  return { base64: r.base64, mimeType: r.mimeType };
}

/**
 * AI "describe → build": map a plain-language description to the best interactive
 * template family, generate params for it, and build a ready playground block.
 * Returns { familyId, params, reason, block } — the composer opens the form prefilled.
 * Two small AI calls: (1) pick the family (strict enum), (2) fill its params.
 */
export async function suggestInteractive({ description, profile, provider } = {}, ai) {
  const fams = listFamilies();
  const catalogue = fams.map((f) => `- ${f.id} [${f.category}]: ${f.name} — ${f.description}`).join('\n');
  const pickSchema = {
    type: 'object', additionalProperties: false, required: ['familyId'],
    properties: { familyId: { type: 'string', enum: fams.map((f) => f.id) }, reason: { type: 'string' } },
  };
  const pick = await ai.generateText({
    provider, chain: 'interactive', maxTokens: 800, json: pickSchema,
    system: 'You match a desired interactive widget to the single best template family id from a fixed catalogue. Reply only as the JSON schema requires.',
    prompt: `Template families:\n${catalogue}\n\nThe author wants an interactive that: "${String(description).slice(0, 600)}".\nPick the single best familyId.`,
  });
  const familyId = (pick.json && pick.json.familyId && fams.some((f) => f.id === pick.json.familyId))
    ? pick.json.familyId : fams[0].id;
  const fam = getFamily(familyId);
  const filled = await ai.generateText({
    provider, chain: 'interactive', maxTokens: 3000, effort: 'medium', json: fam.paramsSchema,
    system: `You produce the JSON params object for an interactive teaching widget, valid against the provided JSON schema. British spelling. Labels/captions concise, accurate, never hype. Choose sensible numbers and ranges. ${visualGuardFor(profile)} IMPORTANT for any formula/expression field: refer to a slider/input value as V.<key> (e.g. V.r, not bare r), use Math.* for functions, and curve y-expressions use the sweep variable t in the range 0..1.`,
    prompt: `Template: ${fam.name} — ${fam.description}\nThe author wants: "${String(description).slice(0, 600)}".\nReturn the params object that best realises this with the ${fam.name} template.`,
  });
  const params = (filled && filled.json) || {};
  const block = buildInstance(familyId, params);   // families guard/default imperfect params
  return { familyId, params, reason: pick.json && pick.json.reason, block };
}

/**
 * Adjust an EXISTING interactive with a plain-language instruction.
 * Keeps the same family; the AI returns updated params (everything not asked to change
 * preserved). Returns { familyId, params, block } — the composer rebuilds in place.
 */
export async function tweakInteractive({ familyId, params = {}, instruction, profile, provider } = {}, ai) {
  const fam = getFamily(familyId);
  if (!fam) throw Object.assign(new Error('Unknown interactive family: ' + familyId), { status: 400 });
  const instr = String(instruction || '').trim();
  if (instr.length < 2) throw Object.assign(new Error('Tell me what to change.'), { status: 400 });
  const filled = await ai.generateText({
    provider, chain: 'interactive', maxTokens: 3000, effort: 'medium', json: fam.paramsSchema,
    system: `You edit the JSON params of an interactive teaching widget. Return the COMPLETE updated params object, valid against the schema — preserve everything the author did NOT ask to change. British spelling, concise labels, never hype. ${visualGuardFor(profile)} For any formula/expression field: refer to a slider/input value as V.<key> (e.g. V.r), use Math.* for functions, and curve y-expressions use the sweep variable t in 0..1.`,
    prompt: `Template: ${fam.name} — ${fam.description}\nCurrent params:\n${JSON.stringify(params).slice(0, 4000)}\n\nApply this change: "${instr.slice(0, 600)}".\nReturn the full updated params object.`,
  });
  const next = (filled && filled.json) || params;
  const block = buildInstance(familyId, next);   // family guards/defaults imperfect params
  return { familyId, params: next, block };
}

/**
 * AI "describe → figure": map a plain-language description to the best figure
 * family (parametric SVG line-art), generate params for it, and build a ready
 * figure block. Returns { familyId, params, block } — the composer opens prefilled.
 * Two small AI calls: (1) pick the family (strict enum), (2) fill its params.
 */
export async function suggestFigure({ description, animate = 'draw', profile, provider } = {}, ai) {
  const fams = listFigureFamilies();
  const catalogue = fams.map((f) =>
    `- ${f.id} [${f.category}]: ${f.name} — ${f.description}\n    params: ${JSON.stringify(f.paramsSchema).slice(0, 400)}`).join('\n');
  const pickSchema = {
    type: 'object', additionalProperties: false, required: ['familyId'],
    properties: { familyId: { type: 'string', enum: fams.map((f) => f.id) }, reason: { type: 'string' } },
  };
  const pick = await ai.generateText({
    provider, maxTokens: 800, json: pickSchema,
    system: 'You match a desired diagram to the single best figure family id from a fixed catalogue of parametric SVG line-art families. Reply only as the JSON schema requires.',
    prompt: `Figure families:\n${catalogue}\n\nThe author wants a figure that: "${String(description).slice(0, 600)}".\nPick the single best familyId.`,
  });
  const familyId = (pick.json && pick.json.familyId && fams.some((f) => f.id === pick.json.familyId))
    ? pick.json.familyId : fams[0].id;
  const fam = fams.find((f) => f.id === familyId);
  const filled = await ai.generateText({
    provider, maxTokens: 3000, effort: 'medium', json: fam.paramsSchema,
    system: `You produce the JSON params object for a clean, minimal SVG figure (line-art diagram), valid against the provided JSON schema. British spelling. Labels/captions concise, accurate, never hype. ${visualGuardFor(profile)} Keep it minimal and uncluttered.`,
    prompt: `Figure family: ${fam.name} — ${fam.description}\nThe author wants: "${String(description).slice(0, 600)}".\nReturn the params object that best realises this with the ${fam.name} family.`,
  });
  const params = (filled && filled.json) || {};
  const { svg } = buildFigure(familyId, params, { animate });   // family guards/defaults imperfect params
  return { familyId, params, block: { type: 'figure', svg, animation: animate } };
}

/**
 * Adjust an EXISTING figure with a plain-language instruction. Keeps the same
 * family; the AI returns updated params (everything not asked to change preserved).
 * Returns { familyId, params, block } — the composer rebuilds in place.
 */
export async function tweakFigure({ familyId, params = {}, instruction, animate = 'draw', profile, provider } = {}, ai) {
  const fams = listFigureFamilies();
  const fam = fams.find((f) => f.id === familyId);
  if (!fam) throw Object.assign(new Error('Unknown figure family: ' + familyId), { status: 400 });
  const instr = String(instruction || '').trim();
  if (instr.length < 2) throw Object.assign(new Error('Tell me what to change.'), { status: 400 });
  const filled = await ai.generateText({
    provider, maxTokens: 3000, effort: 'medium', json: fam.paramsSchema,
    system: `You edit the JSON params of an SVG figure (line-art diagram). Return the COMPLETE updated params object, valid against the schema — preserve everything the author did NOT ask to change. British spelling, concise accurate labels, never hype. ${visualGuardFor(profile)} Keep it minimal and uncluttered.`,
    prompt: `Figure family: ${fam.name} — ${fam.description}\nCurrent params:\n${JSON.stringify(params).slice(0, 4000)}\n\nApply this change: "${instr.slice(0, 600)}".\nReturn the full updated params object.`,
  });
  const updatedParams = (filled && filled.json) || params;
  const { svg } = buildFigure(familyId, updatedParams, { animate });   // family guards/defaults imperfect params
  return { familyId, params: updatedParams, block: { type: 'figure', svg, animation: animate } };
}

/**
 * Invent a BESPOKE interactive (playground) from a plain-language description —
 * for ideas no template family covers. The AI writes self-contained html/css/js.
 * Nothing is inserted or published here: the caller renders the result in a
 * sandboxed iframe for the owner to APPROVE first. Returns a playground-shaped
 * block { domId, title, html, css, js, notes } plus jsError (null when the JS parses).
 */
export async function inventInteractive({ description, base, profile, provider } = {}, ai) {
  const desc = String(description || '').trim();
  if (desc.length < 4) throw Object.assign(new Error('Describe the interactive you want'), { status: 400 });
  // MODIFY mode: when an existing widget is supplied, the AI edits it in place and
  // returns the COMPLETE updated widget (used by the standalone maker's duplicate-and-
  // modify flow). Reuse the existing domId so the JS root-scoping stays valid.
  const hasBase = !!(base && (String(base.html || '').trim() || String(base.js || '').trim()));
  const domId = (hasBase && base.domId) ? String(base.domId) : ('pg-' + Math.random().toString(36).slice(2, 9));
  const schema = {
    type: 'object', additionalProperties: false,
    required: ['title', 'html', 'js'],
    properties: {
      title: { type: 'string' },
      html: { type: 'string' },
      css: { type: 'string' },
      js: { type: 'string' },
      notes: { type: 'string' },
    },
  };
  const rules = `HARD RULES — the widget must run first time with no console errors:
- Vanilla JS only. No external libraries, no <script src>, no fetch/network, no localStorage/cookies. Entirely self-contained.
- Your HTML is placed inside <div class="playground" id="${domId}">…</div>. Do NOT repeat that wrapper. Scope every DOM lookup to it: write your JS as (function(){ const root = document.getElementById('${domId}'); if(!root) return; /* root.querySelector(...) */ })(); — never use document-wide selectors and never use inline on* attributes (they are stripped).
- Use the host classes where natural: .pg-stage (main visual area), .pg-controls, .pg-row, .pg-field, .pg-readout (live numbers), <label><b>…</b></label>; sliders are <input type="range">.
- Dark theme is already applied (near-black background, light text). Do not set a page background. Use the site accents teal #2dd4bf, cyan #22d3ee, violet #818cf8 for highlights.
- Honour reduced motion: gate any continuous animation behind window.matchMedia('(prefers-reduced-motion: reduce)').
- British spelling; concise, accurate labels; never hype. ${visualGuardFor(profile)}`;
  const tail = `Return ONLY the JSON the schema requires; put a one-line plain-language summary in "notes".`;
  const system = hasBase
    ? `You MODIFY an existing small, self-contained interactive teaching widget ("playground") for ${blogDomainFor(profile)}. Apply the requested change and return the COMPLETE updated widget (HTML, optional CSS, JS) — never a diff or a fragment.

${rules}
- Preserve everything that already works; change only what the instruction asks for. Keep the same overall idea unless the instruction says otherwise.
${tail}`
    : `You invent a small, self-contained interactive teaching widget ("playground") for ${blogDomainFor(profile)}. Output HTML, optional CSS, and JS that bring one idea to life — a slider, a toggle, a small simulation, an animated SVG diagram.

${rules}
${tail}`;
  const prompt = hasBase
    ? `Here is the existing widget's code.

--- HTML ---
${String(base.html || '').slice(0, 6000)}

--- CSS ---
${String(base.css || '').slice(0, 3000)}

--- JS ---
${String(base.js || '').slice(0, 6000)}

Apply this change: "${desc.slice(0, 800)}". Return the complete updated widget.`
    : `Invent an interactive that: "${desc.slice(0, 800)}". Keep it focused and compact so the whole thing fits comfortably — a tight, working widget beats an elaborate one.`;
  // Generous budget: JSON-escaped html+css+js is token-heavy and truncation = invalid JSON.
  const r = await ai.generateText({
    provider, maxTokens: 14000, effort: 'medium', json: schema,
    system, prompt,
  });
  const out = (r && r.json) || {};
  let jsError = null;
  try { if (String(out.js || '').trim()) new Function(String(out.js)); }
  catch (e) { jsError = e.message; }
  return {
    block: { domId, title: out.title || 'Interactive', html: out.html || '', css: out.css || '', js: out.js || '' },
    notes: out.notes || '',
    jsError,
  };
}

/**
 * Invent a BESPOKE figure (inline SVG line-art) from a plain-language description —
 * for diagrams no figure family covers. The AI writes one self-contained <svg> using
 * only theme CSS variables for colour and (optionally) inlined CSS for animation.
 * The svg IS the artifact (no family rebuild). ALWAYS run through sanitise() before
 * returning — the prompt forbids unsafe content, the sanitiser enforces it.
 * Returns { block: { type:'figure', kind:'invent', svg, title, animation }, notes }.
 */
export async function inventFigure({ description, animate = 'draw', profile, provider } = {}, ai) {
  const desc = String(description || '').trim();
  if (desc.length < 4) throw Object.assign(new Error('Describe the figure you want'), { status: 400 });
  const wantsAnim = animate && animate !== 'none';
  const schema = {
    type: 'object', additionalProperties: false,
    required: ['svg', 'title'],
    properties: {
      svg: { type: 'string' },
      title: { type: 'string' },
      notes: { type: 'string' },
    },
  };
  const system = `You draw a single, self-contained inline <svg> line-art figure for ${blogDomainFor(profile)}. Clean, minimal, NYT-style schematic line art.

HARD RULES — the figure must render safely and inherit the site theme:
- Return ONE <svg>…</svg> element only. Use a viewBox and set NO width/height pixel attributes on the <svg> (it scales to its container).
- Colour ONLY via the site's CSS theme variables: var(--ink) (primary line/text), var(--ink-dim) (secondary/faint), var(--teal), var(--cyan), var(--violet) for accents. NEVER use hex codes, rgb(), or named colours.
- Minimal and clean: prefer strokes over fills; use fill="none" on shapes where a stroke suffices. Thin, confident lines. No clutter, no drop-shadows, no gradients.
- ${wantsAnim
    ? 'If animated, use ONLY inlined CSS inside a single <style> element: @keyframes plus transform / opacity / stroke-dashoffset / animation. Include a @media (prefers-reduced-motion: reduce) guard that disables motion (snap to the final/drawn state).'
    : 'Static figure: do not animate.'}
- NEVER use <script>, <foreignObject>, on* event handlers, external references, url(), or remote links. Entirely self-contained.
- British spelling on any labels. Schematic only — ${visualGuardFor(profile)}
Return ONLY the JSON the schema requires; put a one-line plain-language summary in "notes".`;
  // Generous budget: a JSON-escaped svg (paths + style) is token-heavy; truncation = invalid JSON.
  const r = await ai.generateText({
    provider, maxTokens: 8000, effort: 'medium', json: schema,
    system, prompt: `Draw a figure that: "${desc.slice(0, 800)}". Keep it focused and compact — a tight, legible diagram beats an elaborate one.`,
  });
  const out = (r && r.json) || {};
  const cleanSvg = sanitise(String(out.svg || ''));
  return {
    block: { type: 'figure', kind: 'invent', svg: cleanSvg, title: out.title || 'Figure', animation: animate },
    notes: out.notes || '',
  };
}

/**
 * Generate a BESPOKE retro / vintage die-cut STICKER from a plain-language description —
 * a funny old-school sticker the owner can drop into a post (it rides the figure block, so
 * it drag-resizes and can be slapped onto an image as an overlay). Mirrors inventFigure: the
 * AI writes ONE self-contained inline <svg> that is the artifact. ALWAYS run through
 * sanitise() before returning — the prompt forbids unsafe content, the sanitiser enforces it.
 * Unlike a figure, a sticker is decorative, so it MAY use tasteful retro colour (not theme
 * vars). Returns { block: { type:'figure', kind:'sticker', svg, title, animation:'none' }, notes }.
 */
export async function generateSticker({ description, genre = '', profile, provider } = {}, ai) {
  const desc = String(description || '').trim();
  if (desc.length < 3) throw Object.assign(new Error('Describe the sticker you want'), { status: 400 });
  const g = String(genre || '').trim();
  const schema = {
    type: 'object', additionalProperties: false,
    required: ['svg', 'title'],
    properties: {
      svg: { type: 'string' },
      title: { type: 'string' },
      notes: { type: 'string' },
    },
  };
  const system = `You design a single, self-contained inline <svg> RETRO / VINTAGE DIE-CUT STICKER — the kind a traveller slaps on a suitcase or a notebook. Playful, bold, characterful. It will be dropped onto a dark-themed blog and may be placed over a photo, so it must read on its own at any size.

HARD RULES — the sticker must render safely:
- Return ONE <svg>…</svg> element only. Use a viewBox (e.g. "0 0 120 120") and set NO width/height pixel attributes on the <svg> (it scales to its container).
- Die-cut look: a BOLD dark outline (around stroke-width 5) on the main silhouette, and an offset pale "sticker border" ring just outside it. Confident, chunky shapes — not thin line-art.
- COLOUR IS ENCOURAGED here (a sticker is decorative): use a warm, slightly faded RETRO palette — tomato red, mustard gold, teal, navy, cream/off-white paper, warm brown. Use plain hex codes or named colours freely. Do NOT use CSS theme variables (this is a sticker, not a figure).
- Keep it self-contained and FLAT: no gradients, no filters, no drop-shadow elements, no clip-paths referencing external ids, no <image>, no <use> of external refs.
- Static only: do NOT animate, do NOT include a <style> or <script>.
- NEVER use <script>, <foreignObject>, on* event handlers, external references, url(), or remote links. Entirely self-contained.
- Any words on the sticker must use British spelling, be short and punchy (e.g. "NEW!", "VISITED"), and use a generic serif/sans font-family on <text> — never a web-font url(). ${guardFor(profile)}
${g ? `- Genre to lean into: ${g}.\n` : ''}Return ONLY the JSON the schema requires; put a one-line plain-language summary in "notes".`;
  // A JSON-escaped svg (paths + fills) is token-heavy; allot a generous budget so a truncated
  // response can't yield invalid JSON.
  const r = await ai.generateText({
    provider, maxTokens: 6000, effort: 'medium', json: schema,
    system, prompt: `Design a retro die-cut sticker that: "${desc.slice(0, 600)}".${g ? ` Genre: ${g}.` : ''} Keep it one bold, legible motif — a tight sticker beats a busy one.`,
  });
  const out = (r && r.json) || {};
  const cleanSvg = sanitise(String(out.svg || ''));
  return {
    block: { type: 'figure', kind: 'sticker', svg: cleanSvg, title: out.title || 'Sticker', animation: 'none' },
    notes: out.notes || '',
  };
}

/**
 * Vectorise a SKETCH or PHOTO into clean, minimal inline SVG line-art (a VISION call).
 * Mirrors importDocument: the image base64 + mimeType are passed to the ai.readDocument seam
 * (a data: URL prefix is stripped to bare base64). Requests structured JSON {svg,title,notes}.
 * The svg IS the artifact — ALWAYS run through sanitise() before returning (the prompt forbids
 * unsafe content; the sanitiser enforces it). Render-only: the composer previews it; nothing
 * inserts until the owner approves.
 * Returns { block: { type:'figure', kind:'traced', svg, title, animation }, notes }.
 */
export async function vectoriseSketch({ image, mimeType = 'image/png', animate = 'draw', profile, provider } = {}, ai) {
  const raw = String(image || '');
  if (!raw) throw Object.assign(new Error('Provide an image to trace'), { status: 400 });
  // Accept a data: URL or bare base64 — extract the bytes + mime exactly as the routes do.
  const m = /^data:([^;]+);base64,(.*)$/s.exec(raw);
  const fileBase64 = m ? m[2] : raw;
  if (m) mimeType = mimeType || m[1];
  const wantsAnim = animate && animate !== 'none';
  const schema = {
    type: 'object', additionalProperties: false,
    required: ['svg', 'title'],
    properties: {
      svg: { type: 'string' },
      title: { type: 'string' },
      notes: { type: 'string' },
    },
  };
  const system = `You trace the provided sketch/photo into a clean, minimal NYT-style line-art inline <svg> for ${blogDomainFor(profile)}. Schematic, confident line work — not a literal pixel copy.

HARD RULES — the figure must render safely and inherit the site theme:
- Return ONE <svg>…</svg> element only. Use a viewBox and set NO width/height pixel attributes on the <svg> (it scales to its container).
- Colour ONLY via the site's CSS theme variables: var(--ink) (primary line/text), var(--ink-dim) (secondary/faint), var(--teal), var(--cyan), var(--violet) for accents. NEVER use hex codes, rgb(), or named colours.
- Minimal and clean: prefer strokes over fills; use fill="none" on shapes where a stroke suffices. Thin, confident lines. No clutter, no drop-shadows, no gradients.
- ${wantsAnim
    ? 'If animated, use ONLY inlined CSS inside a single <style> element: @keyframes plus transform / opacity / stroke-dashoffset / animation. Include a @media (prefers-reduced-motion: reduce) guard that disables motion (snap to the final/drawn state).'
    : 'Static figure: do not animate.'}
- NEVER use <script>, <foreignObject>, on* event handlers, external references, url(), or remote links. Entirely self-contained.
- British spelling on any labels. Schematic only — trace ONLY what is present in the image; do NOT invent structures, labels, or detail not visible in it.
Return ONLY the JSON the schema requires; put a one-line plain-language summary in "notes".`;
  // VISION + structured-output call: use the readDocument seam (the same vision+json method
  // importDocument uses) so the image bytes are actually forwarded to the model. generateText is
  // TEXT-ONLY and would silently drop the image; readDocument accepts fileBase64 + mimeType AND a
  // json schema. A JSON-escaped svg is token-heavy, so the seam allots a generous budget.
  const { json: out = {} } = await ai.readDocument({
    provider, fileBase64, mimeType, json: schema, system,
    instruction: 'Trace the provided sketch/photo into a clean, minimal NYT-style line-art inline SVG, following the rules exactly.',
  });
  const cleanSvg = sanitise(String(out.svg || ''));
  return {
    block: { type: 'figure', kind: 'traced', svg: cleanSvg, title: out.title || 'Traced', animation: animate },
    notes: out.notes || '',
  };
}

/**
 * Suggest candidate labels a reader might want on a figure — e.g. key parts / features —
 * from a short description and/or the figure svg as context. Structured JSON {labels:[{text}]}.
 * Suggestions only: plausible, well-known labels; never invented facts. Capped at ~8.
 * Returns { labels }.
 */
export async function suggestLabels({ description = '', svg = '', profile, provider } = {}, ai) {
  const schema = {
    type: 'object', additionalProperties: false, required: ['labels'],
    properties: { labels: { type: 'array', items: {
      type: 'object', additionalProperties: false, required: ['text'],
      properties: { text: { type: 'string' } },
    } } },
  };
  const system = `You suggest short candidate labels a reader might want annotated on a diagram (e.g. key parts, features). British spelling. Suggest only plausible, well-known labels for the subject — never invent ${(profile && profile.factGuard) || DEFAULT_PROFILE.factGuard}, specific measurements, or details you cannot be confident about. Keep each label to a few words. Return ONLY the JSON the schema requires.`;
  const user = `Suggest up to 8 candidate labels for this figure.
Description: "${String(description).slice(0, 600)}"${svg ? `\nFigure SVG (context):\n${String(svg).slice(0, 2000)}` : ''}`;
  const r = await ai.generateText({ provider, system, prompt: user, maxTokens: 500, json: schema });
  const src = Array.isArray(r?.json?.labels) ? r.json.labels : [];
  const labels = src
    .map((l) => ({ text: String((l && l.text) ?? l ?? '').trim() }))
    .filter((l) => l.text)
    .slice(0, 8);
  return { labels };
}

// Back-compat: STUDIO_STYLE is the GENERIC-default house voice (no profile). Callers
// that want the live author voice should compose it from the profile via buildStyle()
// — re-exported here so partner.js / the browser router can build it per session.
export const STUDIO_STYLE = buildStyle(DEFAULT_PROFILE);
export { buildStyle, buildGoblinSystem, factGuardLine, normaliseProfile, profileFromAnswers, ONBOARDING_QUESTIONS, DEFAULT_PROFILE } from './profile.js';
