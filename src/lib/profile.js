/* ============================================================
   Author / voice profile — the single source of truth for WHO the
   Studio is writing as. Every AI prompt's identity + voice text is
   COMPOSED from a profile object instead of being hardcoded, so a
   fresh install gets a GENERIC, non-medical author/voice and the user's
   own identity is supplied at call-time (never hardcoded here).

   Pure + browser-safe (no node built-ins): this module is imported by
   server/studio.js, which is bundled into the BYOK browser Studio, so
   the SAME composition runs locally and in the browser. The profile is
   supplied at call-time (server: config.studio.profile; browser: the
   config seam) — never read from server config in here.

   The profile GUIDES, it does not dictate: the prompt text below tells
   the model to treat it as a starting point and stay flexible (it must
   not rigidly echo the user's literal words).
   ============================================================ */

// The universal rules — true for EVERY author, medical or not. These are the
// non-negotiable house manners; only the identity + subject + flavour change.
const UNIVERSAL_VOICE = [
  '- Measured, intelligent, precise. Confident without bravado.',
  '- Occasionally witty or wry; never goofy, never cringe.',
  '- Plain and direct. State things and let them stand.',
  '- NEVER hype. No "game-changer", "revolutionary", "thrilled to announce", "humbled", "passion", "world-class", "🚀", excessive emojis, or influencer cadence.',
  '- No false modesty ("I was lucky enough to…") and no exaggeration.',
  '- A real point of view is welcome; empty positivity is not.',
  '- British spelling.',
].join('\n');

/* ── Default (fresh install): generic, non-medical ─────────────────────────
   A new user is NOT a surgeon. Neutral name/role, "writes across their own
   interests", and the universal voice rules only — nothing clinical. The
   onboarding Q&A overwrites these the moment the user answers. */
export const DEFAULT_PROFILE = Object.freeze({
  name: 'the author',
  role: 'a writer',
  writesAbout: 'across their own interests',
  voiceNotes: '',
  // factGuard: the thing the model must never fabricate. Generic by default;
  // a clinical author re-adds the medical emphasis via this field (or voiceNotes).
  factGuard: 'facts, statistics or studies',
});

// Fill any missing/blank field from DEFAULT_PROFILE. Accepts a partial object
// (or junk) and always returns a complete, trimmed profile.
export function normaliseProfile(p) {
  const src = (p && typeof p === 'object') ? p : {};
  const pick = (k) => {
    const v = src[k];
    const s = (v == null ? '' : String(v)).trim();
    return s || DEFAULT_PROFILE[k];
  };
  return {
    name: pick('name'),
    role: pick('role'),
    writesAbout: pick('writesAbout'),
    // voiceNotes is genuinely optional — keep it blank rather than defaulting.
    voiceNotes: (src.voiceNotes == null ? '' : String(src.voiceNotes)).trim(),
    factGuard: pick('factGuard'),
  };
}

// A short identity sentence used at the top of most prompts. "an author"/"a writer"
// style roles read naturally after the name without an article.
function identityLine(p) {
  const about = p.writesAbout
    ? `They write ${/^(about|across|on)\b/i.test(p.writesAbout) ? p.writesAbout : 'about ' + p.writesAbout}.`
    : '';
  return `You write short social posts and blog articles for ${p.name}, ${p.role}.${about ? ' ' + about : ''}`;
}

/**
 * Compose the house-voice STYLE prompt from a profile. Drop-in replacement for
 * the old hardcoded STYLE const. The voice rules are universal; identity, subject
 * and any extra voice notes come from the profile. The profile is a STARTING
 * POINT — the model is told to stay flexible, not to parrot it.
 */
export function buildStyle(profile) {
  const p = normaliseProfile(profile);
  return `${identityLine(p)}

VOICE — follow exactly:
${UNIVERSAL_VOICE}${p.voiceNotes ? `\n\nHOW THEY LIKE TO SOUND (a guide, not a script — capture the spirit, don't copy these words):\n${p.voiceNotes}` : ''}

FORMAT for a social post:
- 1 short hook line, then 2–5 tight sentences or a few short lines.
- At most a couple of relevant hashtags, only if they genuinely fit. Often none.
- No "link in bio", no engagement-bait questions unless the topic truly invites one.
- Length: punchy. A LinkedIn post is ~60–150 words; an Instagram caption can be shorter.`;
}

/**
 * The "do not fabricate" guard line, driven by profile.factGuard. Used wherever
 * the old code said "Do not invent clinical facts, statistics or studies".
 * Generic by default; a clinical profile re-adds the medical emphasis.
 */
export function factGuardLine(profile) {
  const p = normaliseProfile(profile);
  return `Do not invent ${p.factGuard} and present them as true — use only what the source supports.`;
}

/**
 * Compose the GOBLIN system prompt (the chaotic idea-hurler) from a profile.
 * Off the house leash on tone, but identity + territory come from the profile,
 * and the ONE hard guard (no fabricated facts-as-true) is profile-driven too.
 */
export function buildGoblinSystem(profile) {
  const p = normaliseProfile(profile);
  const territory = p.writesAbout || 'their own interests';
  return `You are the GOBLIN — a feral, gleeful idea-gremlin who lives in the margins of ${p.name}'s notebook. ${p.name} is ${p.role} who writes a witty, evidence-led blog spanning ${territory}. When they are staring at a blank page, you HURL ideas at them to break the spell.

YOUR JOB — chaos with a point:
- Throw unexpected, provocative, FUN angles. Wild metaphors. Contrarian takes. "Explain X like Y" mashups. Absurd framings. "The unhinged version of…". "What nobody tells you about…". Pick fights with received wisdom. Make them laugh, then make them think.
- Be SPECIFIC and weird, never generic. "5 things about X" is a crime; a sharp, strange, concrete framing is the job.
- Range WIDELY across their territory (${territory}) and the odd corners of it. Surprise them.

LICENCE — you are OFF the house leash:
- You ARE allowed to be cheeky, dramatic, irreverent, gleefully over-the-top. This is brainstorming, not the finished post.
- These are SPARKS — rough provocations to write FROM, not copy to publish. Don't hedge, don't be tasteful, don't sand off the edges.

THE ONE LINE YOU DO NOT CROSS:
- Never invent ${p.factGuard} and present them as true. Absurd metaphors, hypotheticals and "imagine if" framings are encouraged; a fabricated number stated as fact is not. If a hook leans on a claim, frame it as a provocation/question, not a fact.
- British spelling, always.`;
}

/**
 * The Partner system-prompt voice line, profile-driven. Replaces the hardcoded
 * "Write in the house voice. … never invent clinical facts or statistics."
 */
export function partnerVoiceLine(profile) {
  const p = normaliseProfile(profile);
  return `Write in their voice (a guide, not a cage — capture the spirit). Be concise and accurate; never invent ${p.factGuard}. British spelling.`;
}

/* ── Onboarding Q&A ────────────────────────────────────────────────────────
   A few friendly get-to-know-you questions whose answers map onto the profile
   fields. The UI (browser) renders these; this is the single source of truth so
   the field mapping never drifts. Each: { key, q, placeholder, optional? }. */
export const ONBOARDING_QUESTIONS = Object.freeze([
  { key: 'name', q: 'What should I call you?', placeholder: 'e.g. Sam Rivers — or just Sam' },
  { key: 'role', q: 'What do you do, or what are you into?', placeholder: 'e.g. a designer who tinkers with synths' },
  { key: 'writesAbout', q: 'What will you write about?', placeholder: 'e.g. design, music, and the odd travel note' },
  { key: 'voiceNotes', q: 'How do you like to sound? (optional)', placeholder: 'e.g. dry, a bit nerdy, allergic to buzzwords', optional: true },
]);

// Turn raw Q&A answers (keyed by question key) into a normalised profile. Blank
// answers fall back to the generic defaults, so a half-finished onboarding is fine.
export function profileFromAnswers(answers = {}) {
  return normaliseProfile({
    name: answers.name,
    role: answers.role,
    writesAbout: answers.writesAbout,
    voiceNotes: answers.voiceNotes,
    // factGuard is not asked in onboarding — keep the generic default. A clinical
    // user can add medical emphasis through voiceNotes / role, or edit it in Settings.
  });
}
