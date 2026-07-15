// Browser Partner core — stateless port of server/partner.js. No SQLite: the caller passes
// the prior session in and persists the returned one (in the storage seam). The `ai` seam is
// injected; intent-filling reuses the (browser-safe) studio engines.
import { suggestInteractive, genImage, seoSuggest, factGuardLine } from '../lib/studio.js';
import { validateDoc, renderPreviewHtml, serialiseBlocks } from '../lib/blocks.js';
import { looseJson } from '../lib/ai/_json.js';
import { checkDoc } from '../lib/prepublish.js';

const rid = () => 'p-' + (globalThis.crypto?.randomUUID ? globalThis.crypto.randomUUID() : Math.random().toString(36).slice(2));

export function createSession() {
  return { sessionId: rid(), history: [], doc: { version: 0, blocks: [] }, meta: {}, versions: [], updatedAt: null };
}
export function appendVersion(session, doc, meta) {
  const version = session.versions.length + 1;
  const entry = { version, doc: { ...doc, version }, meta: { ...meta } };
  session.versions.push(entry); session.doc = entry.doc; session.meta = entry.meta;
  return session;
}
export function revertSession(session, version) {
  const entry = (session.versions || []).find((v) => v.version === version);
  if (!entry) throw Object.assign(new Error('version not found'), { status: 404 });
  session.doc = { ...entry.doc }; session.meta = { ...entry.meta };
  return session;
}

// Pure: build the system prompt from injected data. `factGuard` is the profile-driven
// "never invent …" line (defaults to the generic one when not passed).
export function assembleContext({ style, voicePosts = [], index = [], factGuard }) {
  const exemplars = voicePosts.map((p, i) => `--- VOICE EXAMPLE ${i + 1}: "${p.title}" ---\n${(p.body || '').slice(0, 1800)}`).join('\n\n');
  const catalogue = index.map((p) => `- "${p.title}" [${(p.tags || []).join(', ')}] ${p.date || ''}`).join('\n');
  const guard = factGuard || factGuardLine();   // generic default when no profile passed
  return [
    style,
    `You are the writer's conversational writing partner for their blog. Each turn you return JSON {reply, doc, meta}:`,
    `- reply: a short, plain chat message (what you did / a question back).`,
    `- doc: the WHOLE post as a block document {version, blocks[]}. Block types: heading{level,text}, text{html}, image{alt,caption} (or {_intent:"generate",brief}), quote{html,cite}, divider, gallery, embed, table, playground (or {type:"playground",_intent:"interactive",brief}). Always return the complete, updated document.`,
    `- meta: {title, tags (topic slugs), description}.`,
    `Write in their voice (a guide, not a cage — capture the spirit). Be concise and accurate; ${guard.replace(/^Do not/, 'do not')} British spelling.`,
    voicePosts.length ? `Match the voice of these examples:\n${exemplars}` : '',
    index.length ? `The blog already contains (don't repeat these; you may suggest follow-ups or link them):\n${catalogue}` : '',
  ].filter(Boolean).join('\n\n');
}

// Async: gather live context from the repo via the posts core (2 most recent as voice pack).
// `style` is the profile-composed house voice; `profile` drives the fact-guard line.
export async function gatherContext(posts, style, profile) {
  const index = await posts.listPosts();
  const voicePosts = [];
  for (const p of index.slice(0, 2)) { const full = await posts.getPost(p.slug); if (full) voicePosts.push({ title: full.data.title, body: full.body }); }
  return assembleContext({ style, factGuard: factGuardLine(profile), voicePosts, index: index.map((p) => ({ title: p.title, tags: p.tags, date: p.date })) });
}

// Resolve power-tool intent blocks + SEO. Engines reuse studio.js with the ai seam passed through.
export async function fillIntents(doc, meta, { ai, engines = {} } = {}) {
  const E = { suggestInteractive, genImage, seoSuggest, ...engines };
  const blocks = [];
  for (const b of (doc.blocks || [])) {
    try {
      if (b.type === 'playground' && b._intent === 'interactive') {
        const r = await E.suggestInteractive({ description: b.brief || 'an interactive' }, ai);
        const blk = (r && r.block) || {};
        blocks.push({ type: 'playground', html: blk.html || '', css: blk.css || '', js: blk.js || '', domId: blk.domId, placement: b.placement || 'standard' });
        continue;
      }
      if (b.type === 'image' && b._intent === 'generate') {
        const r = await E.genImage({ prompt: b.brief || 'illustration', size: '1024x1024' }, ai);
        blocks.push({ type: 'image', base64: r.base64, file: r.file || 'gen.jpg', alt: b.alt || '', caption: b.caption || '', placement: b.placement || 'standard', size: b.size || 'lg' });
        continue;
      }
    } catch { blocks.push({ type: 'text', html: `<em>[Couldn't build: ${(b.brief || b.type)}. Edit me.]</em>` }); continue; }
    blocks.push(b);
  }
  const filledDoc = { ...doc, blocks };
  let nextMeta = { ...meta };
  if (!nextMeta.description || !(nextMeta.tags && nextMeta.tags.length)) {
    try {
      const seo = await E.seoSuggest({ title: nextMeta.title || '', body: serialiseBlocks(blocks, { slug: 'partner' }) }, ai);
      const j = (seo && seo.json) || {};
      if (!nextMeta.description && j.description) nextMeta.description = j.description;
      if (!(nextMeta.tags && nextMeta.tags.length) && j.tags) nextMeta.tags = j.tags;
    } catch { /* leave meta */ }
  }
  return { doc: filledDoc, meta: nextMeta };
}

// One stateless turn: ask → fill → validate (one re-ask) → append a version → return the session.
export async function runTurn({ session, message }, deps = {}) {
  const ai = deps.ai;
  const render = deps.render || ((doc) => renderPreviewHtml(doc.blocks || [], { slug: 'partner' }));
  const fill = deps.fill || ((doc, meta) => fillIntents(doc, meta, { ai }));
  const context = deps.context || '';
  session = session || createSession();
  session.history.push({ role: 'user', content: message });

  const prompt = [
    'Conversation so far:', session.history.map((m) => `${m.role.toUpperCase()}: ${m.content}`).join('\n'),
    'Current document (JSON):', JSON.stringify(session.doc),
    'Current meta (JSON):', JSON.stringify(session.meta),
    'Respond with the JSON {reply, doc, meta} for the updated post.',
  ].join('\n\n');

  const ask = async () => { const { text } = await ai.generateText({ system: context, prompt, maxTokens: 16000, effort: 'medium' }); return looseJson(text); };
  // The session already has content when the user is EDITING; a model that answers without
  // echoing the whole document ("Done." with no doc — live e2e: llama-4-scout did exactly
  // this) must NOT wipe the draft. Treat a missing/empty doc on a non-empty session as a
  // malformed turn: throw → retry once → the fallback reply keeps the existing doc.
  const hadContent = !!(session.doc && Array.isArray(session.doc.blocks) && session.doc.blocks.length > 0);
  const attempt = async () => {
    const out = await ask();
    if (hadContent && (!out.doc || !Array.isArray(out.doc.blocks) || out.doc.blocks.length === 0)) {
      throw Object.assign(new Error('turn omitted the document — refusing to wipe the draft'), { code: 'PT_DOC_DROPPED' });
    }
    const rawDoc = out.doc || { blocks: [] };
    const meta = { ...session.meta, ...(out.meta || {}) };
    const filled = await fill(rawDoc, meta);
    const doc = filled.doc || rawDoc;
    validateDoc(doc);
    if (hadContent && (!Array.isArray(doc.blocks) || doc.blocks.length === 0)) {
      throw Object.assign(new Error('turn produced an empty document — refusing to wipe the draft'), { code: 'PT_DOC_DROPPED' });
    }
    return { reply: out.reply || '', doc, meta: filled.meta || meta };
  };

  let result = null;
  try { result = await attempt(); }
  catch { try { result = await attempt(); } catch {
    session.history.push({ role: 'assistant', content: 'I had trouble updating the draft — left it as it was. Try rephrasing?' });
    return { session, reply: session.history.at(-1).content, doc: session.doc, meta: session.meta, html: render(session.doc), version: session.versions.length };
  } }
  appendVersion(session, result.doc, result.meta);
  session.history.push({ role: 'assistant', content: result.reply });
  return { session, reply: result.reply, doc: session.doc, meta: session.meta, html: render(session.doc), version: session.versions.length };
}

// Publish a session's current doc via the posts core (browser-direct GitHub).
export async function publishSession(session, posts) {
  const check = checkDoc({ doc: session.doc, meta: session.meta, slug: 'partner' });
  if (!check.ok) return { ok: false, errors: check.errors, warnings: check.warnings };
  const slug = await posts.suggestSlug(session.meta.title || 'untitled');
  const r = await posts.publishBlocks(slug, session.doc, { ...session.meta, draft: false });
  return { ok: true, slug, url: r.url, commit: r.commit, warnings: check.warnings };
}
