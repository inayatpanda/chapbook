// Client-side router — re-implements the /studio/api/* surface against the portable core
// + browser seams, so the existing UI's api() shim works with no server.
// deps: { posts, partner, ai, storage, studio, playgrounds, figures, stencils, stickers, blocks, prepublish, templates, config, gh }
import { getSiteConfig, putSiteConfig } from './core/siteConfig.js';
import { getTopicsConfig, putTopicsConfig } from './core/topicsConfig.js';
import { parseThread, serializeThread, buildAskPrompt } from './core/thread.js';
export function makeRouter(deps) {
  const { posts, partner, ai, storage, studio, playgrounds, figures, stencils, stickers, blocks, prepublish, templates, config, gh } = deps;
  let _ctx = null; // cached partner system-context (gathered once per load)
  // The author/voice profile drives every AI prompt. Read fresh per call so a Settings
  // edit takes effect immediately; null/undefined → the studio engines use their generic
  // default. Defensive: `config` may be absent in unit tests that exercise a single route.
  const profile = () => ((config && config.getProfile) ? config.getProfile() : null) || undefined;
  // Build the partner context from the user's OWN posts (voice examples) + the
  // profile-composed house voice. studio.buildStyle(profile) composes the voice; the
  // partner core appends the per-post exemplars + catalogue.
  const ctx = async () => (_ctx ||= await partner.gatherContext(posts, studio.buildStyle ? studio.buildStyle(profile()) : (studio.STUDIO_STYLE || ''), profile()));
  // Learn-from-their-posts: the 1–2 most-recent posts as voice examples for draft/expand.
  // Best-effort: offline / empty repo → []. Cached for the page load alongside _ctx.
  let _voice = null;
  const voicePosts = async () => {
    if (_voice) return _voice;
    try {
      const index = await posts.listPosts();
      const out = [];
      for (const p of index.slice(0, 2)) { const full = await posts.getPost(p.slug); if (full) out.push({ title: full.data?.title || p.title, body: full.body || '' }); }
      return (_voice = out);
    } catch { return (_voice = []); }
  };
  const notFound = (p) => { throw Object.assign(new Error('not found: ' + p), { status: 404 }); };
  const qp = (path) => { const i = path.indexOf('?'); return i < 0 ? {} : Object.fromEntries(new URLSearchParams(path.slice(i + 1))); };
  const clean = (path) => { const i = path.indexOf('?'); return i < 0 ? path : path.slice(0, i); };

  async function api(rawPath, opts = {}) {
    const method = (opts.method || 'GET').toUpperCase();
    const body = opts.body && typeof opts.body === 'string' ? JSON.parse(opts.body) : (opts.body || {});
    const query = qp(rawPath);
    // Decode each path segment the way the original Fastify server did — callers
    // encodeURIComponent() route params (e.g. a preset name "Coffee brewing methods"
    // → "Coffee%20brewing%20methods"), and without decoding, name lookups (getPreset,
    // getFigurePreset, slugs with reserved chars) silently miss and return null.
    // Defensive: a malformed %-escape throws, so fall back to the raw segment.
    const seg = clean(rawPath).replace(/^\/+|\/+$/g, '').split('/') // e.g. ['posts','my-slug','blocks']
      .map((s) => { try { return decodeURIComponent(s); } catch { return s; } });
    const [a, b, c, d] = seg;

    // ---- playgrounds (pure core) ----
    if (a === 'playgrounds' && !b) return playgrounds.listFamilies();
    if (a === 'playgrounds' && c === 'preset') return { params: playgrounds.getPreset(b, d) };
    if (a === 'playgrounds' && b === 'build') return { block: playgrounds.buildInstance(body.familyId, body.params || {}, body.domId) };
    if (a === 'playgrounds' && b === 'suggest') return studio.suggestInteractive({ description: body.description, profile: profile() }, ai);
    if (a === 'playgrounds' && b === 'tweak') return studio.tweakInteractive({ familyId: body.familyId, params: body.params || {}, instruction: body.instruction, profile: profile() }, ai);
    if (a === 'playgrounds' && b === 'invent') return studio.inventInteractive({ description: body.description, profile: profile() }, ai);

    // ---- figures (parametric SVG line-art; pure core) ----
    if (a === 'figures' && !b) return { families: figures.listFamilies() };
    // Draw-mode stencil palette: clean pre-made polyline shapes (pure core).
    if (a === 'figures' && b === 'stencils') return { stencils: stencils.listStencils() };
    // Sticker forge: curated retro/vintage die-cut stickers by genre (pure core).
    // A sticker is a figure (svg = a sticker) → reuses figure render + drag-resize + image-base.
    if (a === 'figures' && b === 'stickers') return { stickers: stickers.listStickers() };
    // AI "generate a sticker" → a sanitised retro die-cut sticker as a figure block.
    if (a === 'figures' && (b === 'sticker' || clean(rawPath) === '/figures/sticker'))
      return studio.generateSticker({ description: body.description, genre: body.genre, profile: profile() }, ai);
    if (a === 'figures' && b === 'build') {
      const animate = body.animate || 'draw';
      const { svg } = figures.build(body.familyId, body.params || {}, { animate });
      return { block: { type: 'figure', svg, animation: animate } };
    }
    if (a === 'figures' && b === 'suggest') return studio.suggestFigure({ description: body.description, animate: body.animate || 'draw', profile: profile() }, ai);
    if (a === 'figures' && b === 'tweak') return studio.tweakFigure({ familyId: body.familyId, params: body.params || {}, instruction: body.instruction, animate: body.animate || 'draw', profile: profile() }, ai);
    // bespoke AI figure modes (Studio Figure panel: Describe / Voice / Photo) — match the
    // full route literal so the wiring is explicit and traceable in the bundled client.
    if (a === 'figures' && (b === 'invent' || clean(rawPath) === '/figures/invent'))
      return studio.inventFigure({ description: body.description, animate: body.animate || 'draw', profile: profile() }, ai);
    if (a === 'figures' && (b === 'vectorise' || clean(rawPath) === '/figures/vectorise'))
      return studio.vectoriseSketch({ image: body.image, mimeType: body.mimeType, animate: body.animate || 'draw', profile: profile() }, ai);
    if (a === 'figures' && b === 'label-suggest') return studio.suggestLabels({ description: body.description, svg: body.svg, profile: profile() }, ai);

    // ---- citations: AI Tidy works everywhere (ai seam). PubMed lookup is
    // intentionally NOT here — eutils needs a server proxy for CORS, so in BYOK
    // mode the client gets a 404 and falls back to a clear toast (DOI/Crossref
    // lookup still works because it's done browser-side in index.html). ----
    if (a === 'citations' && b === 'format') return studio.formatCitation({ raw: body.raw, style: body.style || 'vancouver' }, ai);   // own non-house voice — no profile

    // ---- goblin mode (studio engine + ai seam): hurl ~5 chaotic post ideas to beat the
    // blank page → {ideas:[{hook,angle}]}. Sparks, not copy — the UI sends an idea to the
    // inbox or starts a draft from it. Topic optional (no topic = fully feral).
    if (a === 'goblin') return studio.goblinMode({ topic: body.topic, seed: body.seed, profile: profile() }, ai);

    // ---- editor pass (studio engine + ai seam): a whole-draft critique of the current post
    // in the locked house voice → {summary, score, findings:[{category,severity,quote,issue,
    // suggestion}]}. Suggestions ONLY — never auto-edits or auto-publishes; the UI shows the
    // findings and the owner edits by hand.
    if (a === 'editor' && b === 'pass') return studio.editorPass({ doc: body.doc, profile: profile() }, ai);

    // ---- social repurpose (studio engine + ai seam): one source → thread/carousel parts.
    // Nothing posts — the UI shows the parts as editable cards the owner shares manually.
    if (a === 'social' && b === 'repurpose') return studio.repurposeThread({ source: body.source, format: body.format, profile: profile() }, ai);

    // ---- AI assist (studio engines + ai seam). The author/voice profile is folded
    // into every house-voice prompt; draft/expand also get the user's OWN recent posts
    // as voice examples (learn-from-posts). alt-text/generate-image/read-document use
    // neutral, voice-free prompts, so they take no profile. ----
    if (a === 'ai') {
      if (b === 'draft') return studio.draftPost({ ...body, profile: profile(), voicePosts: await voicePosts() }, ai);
      if (b === 'social-pack') return studio.socialPack({ ...body, profile: profile() }, ai);
      if (b === 'structure') return studio.structureNotes({ ...body, profile: profile() }, ai);
      if (b === 'alt-text') return studio.altText(body, ai);
      if (b === 'seo') return studio.seoSuggest({ ...body, profile: profile() }, ai);
      if (b === 'rewrite') return studio.rewriteText({ ...body, profile: profile() }, ai);
      if (b === 'generate-image') return studio.genImage(body, ai);
      if (b === 'read-document') return studio.importDocument(body, ai); // .docx: needs the browser zlib adapter (deferred)
    }

    // ---- short social draft (studio engine + ai seam) → { post, hooks } ----
    // The fork renamed this engine's route to /ai/draft, but the LIVE Share → Compose
    // "✦ Draft it" button (and the legacy AI-assist button) still POST bare /draft. Without
    // this alias that call 404s and the social composer silently fails. Map it to the SAME
    // studio.draftPost engine as /ai/draft so both paths behave identically.
    if (a === 'draft') return studio.draftPost({ ...body, profile: profile(), voicePosts: await voicePosts() }, ai);

    // ---- prepublish + preview (pure core) ----
    if (a === 'posts' && c === 'preview') return { html: blocks.renderPreviewHtml((body.doc?.blocks) || [], { slug: b }) };
    if (a === 'posts' && c === 'check') {
      let knownSlugs = null;
      try { knownSlugs = (await posts.listPosts()).map((p) => p.slug); } catch { /* offline */ }
      return prepublish.checkDoc({ doc: body.doc, meta: body.meta, slug: b, knownSlugs });
    }
    // Quality lint. The hosted BYOK client can't HEAD/GET cross-origin (CORS), so it
    // runs the synchronous checkDoc (internal links validated) and marks the external
    // check as skipped — the UI shows "external links aren't checked in this hosted app".
    if (a === 'posts' && (b === 'lint' || c === 'lint')) {
      const slug = (b === 'lint') ? (body.slug || 'post') : b;
      let knownSlugs = null;
      try { knownSlugs = (await posts.listPosts()).map((p) => p.slug); } catch { /* offline */ }
      const res = prepublish.checkDoc({ doc: body.doc, meta: body.meta, slug, knownSlugs });
      const note = (res.externalCount || 0)
        ? `${res.externalCount} external link${res.externalCount === 1 ? '' : 's'} — reachability isn't checked in this hosted app.`
        : 'No external links to check.';
      return { ...res, polish: [...res.polish, { group: 'External links', level: 'green', items: [note] }], externalChecked: 0, externalSkipped: true };
    }

    // ---- markdown → blocks (offline parser; powers paste + Import Markdown) ----
    if (a === 'md-to-blocks') return blocks.blocksFromMarkdown(body.markdown || '');

    // ---- media library (github seam): committed images under public/images/posts/
    // grouped by slug, for reuse (insert a url reference, no re-upload) ----
    if (a === 'media' && b === 'images') return { groups: await posts.listMediaImages() };

    // ---- short-form video + media upload (LOCAL-server-only) ----
    // Rendering needs the helm/video deps + Chromium, and video upload/transcode
    // (/media/*) needs ffmpeg + the local archive + config.media creds — none of
    // which the hosted BYOK Studio has. Every /video/* and /media/* route returns a
    // clear 503 the UI explains, rather than a confusing 404. (Deriving a storyboard
    // is cheap, but rendering/transcoding is the point, so both are gated to local.)
    if (a === 'video' || a === 'media') {
      throw Object.assign(
        new Error('Video upload and transcoding need a server-side backend, which this app does not have. Use the BYOK R2 route in Settings → Video storage.'),
        { status: 503, code: 'VIDEO_LOCAL_ONLY' },
      );
    }

    // ---- posts (github seam) ----
    if (a === 'posts' && !b && method === 'GET') return posts.listPosts();
    if (a === 'topics') return posts.getTopics();
    if (a === 'slug') return posts.suggestSlug(query.title || 'untitled');
    if (a === 'templates') return templates.list();
    if (a === 'posts' && b && !c && method === 'GET') return posts.getPost(b);
    // PUT /posts/:slug — patch frontmatter (title/description/tags/accent/image). Used by the
    // bulk-retag flow; loops one call per selected post. No new destructive route needed.
    if (a === 'posts' && b && !c && method === 'PUT') return posts.updatePost(b, body || {});
    if (a === 'posts' && c === 'blocks' && method === 'GET') {
      const draft = await storage.get('blockdrafts', b);
      if (draft) {
        // surface the published date (if any) so the UI can decide whether the local
        // autosave is newer → draft-recovery prompt.
        let publishedAt = null;
        try { const p = await posts.getPost(b); publishedAt = p && p.data ? p.data.date : null; } catch { /* offline / new */ }
        return { source: 'draft', doc: draft.doc, data: draft.meta || {}, draftSavedAt: draft.savedAt || null, publishedAt };
      }
      const r = await posts.getPostBlocks(b);
      return r || notFound(rawPath);
    }
    if (a === 'posts' && c === 'blocks' && method === 'PUT') { await storage.put('blockdrafts', { id: b, doc: body.doc, meta: body.meta, savedAt: new Date().toISOString() }); return { slug: b, saved: true }; }
    if (a === 'posts' && c === 'blocks' && method === 'DELETE') { await storage.del('blockdrafts', b); return { slug: b, discarded: true }; }
    if (a === 'posts' && c === 'publish') { const r = await posts.publishBlocks(b, body.doc, body.meta || {}); await storage.del('blockdrafts', b); return r; }

    // ---- version history / snapshots (storage 'versions'; cap newest ~20 per slug) ----
    // Mirrors the /figures/shapes storage pattern. Snapshot shape: { slug, ts, seq, label, doc, meta }.
    // Ordering uses `seq` (a strictly-monotonic counter) as the primary key so two snapshots
    // taken in the same millisecond still order deterministically (ts can collide).
    const sortVersions = (list) => list.slice().sort((x, y) => (y.seq || 0) - (x.seq || 0) || (y.ts || '').localeCompare(x.ts || ''));
    if (a === 'posts' && c === 'versions' && method === 'GET') {
      return { versions: sortVersions((await storage.all('versions')).filter((v) => v.slug === b)) };
    }
    if (a === 'posts' && c === 'versions' && method === 'POST') {
      const existing = (await storage.all('versions')).filter((v) => v.slug === b);
      const seq = existing.reduce((mx, v) => Math.max(mx, v.seq || 0), 0) + 1;
      const ts = new Date().toISOString();
      const id = 'v-' + b + '-' + (globalThis.crypto?.randomUUID?.() || (Date.now() + '-' + seq));
      const rec = { id, slug: b, ts, seq, label: body.label || 'Snapshot', doc: body.doc, meta: body.meta || {} };
      await storage.put('versions', rec);
      // cap: keep the 20 newest for this slug, drop the rest
      for (const old of sortVersions([...existing, rec]).slice(20)) await storage.del('versions', old.id);
      return rec;
    }
    if (a === 'posts' && c === 'republish') return posts.republishPost(b);
    if (a === 'posts' && c === 'takedown') return posts.takedownPost(b);
    if (a === 'posts' && c === 'duplicate') return posts.duplicatePost(b);
    if (a === 'posts' && b && !c && method === 'DELETE') return posts.deletePost(b);
    if (a === 'posts' && c === 'photos' && method === 'GET') return []; // legacy photo grid not used in block mode (v1)

    // ---- expand → blog DRAFT (never auto-publish) ----
    if (a === 'expand') {
      const article = await studio.expandToBlog({ idea: body.idea, post: body.post, profile: profile(), voicePosts: await voicePosts() }, ai);
      const slug = await posts.suggestSlug(article.title || 'untitled');
      const doc = blocks.rawDocFromMarkdown(article.body || '');
      const r = await posts.publishBlocks(slug, doc, { title: article.title, description: article.description, tags: article.tags || [], draft: true });
      return { slug, title: article.title, draft: true, url: r.url, commit: r.commit, note: 'Saved as a draft — review and publish from Posts' };
    }

    // ---- partner (storage sessions, stateless turn) ----
    if (a === 'partner' && b === 'turn') {
      const session = body.sessionId ? (await storage.get('partner', body.sessionId)) : null;
      const out = await partner.runTurn({ session, message: body.message }, { ai, context: await ctx() });
      out.session.updatedAt = new Date().toISOString();
      await storage.put('partner', { id: out.session.sessionId, ...out.session });
      return { sessionId: out.session.sessionId, reply: out.reply, doc: out.doc, meta: out.meta, html: out.html, version: out.version };
    }
    if (a === 'partner' && b && c === 'revert') { const s = await storage.get('partner', b); partner.revertSession(s, body.version); await storage.put('partner', { id: s.sessionId, ...s }); return s; }
    if (a === 'partner' && b && c === 'publish') { const s = await storage.get('partner', b); return partner.publishSession(s, posts); }
    if (a === 'partner' && b && !c && method === 'GET') return (await storage.get('partner', b)) || notFound(rawPath);

    // ---- idea inbox (storage) — quick captures that promote to a post draft ----
    // An idea = { id, text, createdAt, tags? }. Mirrors the /drafts CRUD pattern.
    if (a === 'ideas' && !b && method === 'GET') return (await storage.all('ideas')).sort((x, y) => (y.createdAt || y.id || '').localeCompare(x.createdAt || x.id || ''));
    if (a === 'ideas' && !b && method === 'POST') {
      const id = 'i-' + (globalThis.crypto?.randomUUID?.() || Date.now());
      const rec = { id, text: String(body.text || '').trim(), tags: Array.isArray(body.tags) ? body.tags : [], createdAt: body.createdAt || new Date().toISOString() };
      await storage.put('ideas', rec); return rec;
    }
    if (a === 'ideas' && b && method === 'PUT') {
      const cur = (await storage.get('ideas', b)) || { id: b };
      const rec = { ...cur, ...body, id: b };
      if (rec.text != null) rec.text = String(rec.text).trim();
      if (!Array.isArray(rec.tags)) rec.tags = [];
      await storage.put('ideas', rec); return rec;
    }
    if (a === 'ideas' && b && method === 'DELETE') { await storage.del('ideas', b); return { deleted: b }; }

    // ---- social drafts (storage) ----
    if (a === 'drafts' && !b && method === 'GET') return (await storage.all('drafts')).sort((x, y) => (y.id || '').localeCompare(x.id || ''));
    if (a === 'drafts' && !b && method === 'POST') { const id = 'd-' + (globalThis.crypto?.randomUUID?.() || Date.now()); const rec = { id, ...body }; await storage.put('drafts', rec); return rec; }
    if (a === 'drafts' && b && method === 'PUT') { const rec = { id: b, ...body }; await storage.put('drafts', rec); return rec; }
    if (a === 'drafts' && b && method === 'DELETE') { await storage.del('drafts', b); return { deleted: b }; }

    // ---- thread sidecar (storage 'threads') - device-local conversation layer for the
    // chat-mode editor, keyed by post slug or provisional draft id. Mirrors the /drafts
    // record-keyed-by-id idiom; parseThread strips the record id back off on read, so GET
    // returns exactly the thread shape. GET returns NULL when the record is absent - a
    // saved turn-less thread must stay distinguishable from "never saved", or per-post
    // mode memory breaks (a post toggled to Chat with zero turns would reopen in Doc).
    // /thread/turn goes to the SAME ai seam text call the /draft engine uses.
    if (a === 'thread' && b === 'turn' && method === 'POST') {
      const { system, user, wantsInsertable } = buildAskPrompt(body || {});
      const { text } = await ai.generateText({ system, prompt: user, maxTokens: 900 });
      return { text, insertable: wantsInsertable };
    }
    if (a === 'thread' && b && method === 'GET') {
      const raw = await storage.get('threads', b);
      return raw ? parseThread(typeof raw === 'string' ? raw : JSON.stringify(raw)) : null;
    }
    if (a === 'thread' && b && method === 'PUT') {
      const cleaned = parseThread(serializeThread(body || {})); // validates + strips junk
      await storage.put('threads', { id: b, ...cleaned });
      return { ok: true };
    }
    if (a === 'thread' && b && method === 'DELETE') { await storage.del('threads', b); return { ok: true }; }

    // ---- my shapes (storage) — saved drawings re-placed from the stencil palette.
    // A saved shape has the SAME { viewBox:[w,h], strokes:[[[x,y],…]] } shape as a stencil,
    // so the Draw-mode palette reuses placeStencilAt() unchanged.
    if (a === 'figures' && b === 'shapes' && !c && method === 'GET') return { shapes: (await storage.all('shapes')).sort((x, y) => (y.id || '').localeCompare(x.id || '')) };
    if (a === 'figures' && b === 'shapes' && !c && method === 'POST') { const id = 's-' + (globalThis.crypto?.randomUUID?.() || Date.now()); const rec = { id, name: body.name || 'Shape', viewBox: body.viewBox, strokes: body.strokes }; await storage.put('shapes', rec); return rec; }
    if (a === 'figures' && b === 'shapes' && c && method === 'DELETE') { await storage.del('shapes', c); return { deleted: c }; }

    // ---- settings/ai (config; never returns a key) ----
    // These two model sub-routes are guarded with c==='…' and MUST stay BEFORE the generic
    // status route below (which matches a==='settings'&&b==='ai'&&GET with NO `!c` guard) —
    // otherwise /settings/ai/models and /settings/ai/latest-model would fall through to it and
    // return the status object instead of their own shapes.
    // GET /settings/ai/models?provider= → { models } for the Settings datalist. Graceful:
    // unconfigured / offline / no listModels → { models: [] } (loadModels reads r.models||[]).
    if (a === 'settings' && b === 'ai' && c === 'models' && method === 'GET') {
      try { return { models: (ai && ai.listModels) ? await ai.listModels(query.provider) : [] }; }
      catch { return { models: [] }; }
    }
    // GET /settings/ai/latest-model?provider= → { model } — the provider's resolved latest
    // chat model, for pinning on activation. Graceful '' fallback (latestModelFor reads r.model).
    if (a === 'settings' && b === 'ai' && c === 'latest-model' && method === 'GET') {
      try { return { model: (ai && ai.resolveLatestModel) ? await ai.resolveLatestModel(query.provider) : '' }; }
      catch { return { model: '' }; }
    }
    // GET must carry the provider's capabilities ({ image, vision, document, … }) — the
    // composer reads providers[default].capabilities to gate capability-dependent buttons
    // (e.g. ✦ Generate image). Omitting it left that button permanently disabled for BYOK
    // users on an image-capable provider (OpenAI/Gemini). Mirrors the old server's shape.
    // Fresh AI status, the shape the composer's renderSettings() expects. Used by BOTH
    // GET and PUT — PUT must return this (not {ok:true}), else saveSettings()'s
    // renderSettings(putResult) reads undefined providers/default and falsely renders
    // "No active model — paste a provider's key" right after a SUCCESSFUL key save.
    const aiStatus = () => {
      const ai_ = config.getAi(); const caps = (ai && ai.capabilities) ? ai.capabilities() : {};
      return { default: ai_.provider, providers: { [ai_.provider]: { configured: !!ai_.key, model: ai_.model, capabilities: caps } } };
    };
    // Generic AI status. NOTE: no `!c` guard — the c==='models'/'latest-model' sub-routes
    // above intentionally intercept those paths first; anything else under settings/ai lands here.
    if (a === 'settings' && b === 'ai' && method === 'GET') return aiStatus();
    if (a === 'settings' && b === 'ai' && method === 'PUT') {
      const patch = {}; if (body.default) patch.aiProvider = body.default;
      const p = body.providers && body.default && body.providers[body.default];
      if (p?.apiKey) patch.aiKey = p.apiKey;
      // Config holds ONE key for the active provider. Switching to a DIFFERENT provider with no
      // new key must NOT carry the old provider's key over (it would 401 every call while the
      // panel falsely showed "configured"). Clear it so the new provider starts keyless.
      else if (body.default && body.default !== config.getAi().provider) patch.aiKey = '';
      if (p?.model) patch.aiModel = p.model;
      config.save(patch); return aiStatus(); // fresh status so the panel reflects the save
    }

    // ---- settings/profile (config seam; the author/voice profile, browser-only) ----
    // GET returns the stored profile (or null) + the onboarding questions; PUT merges
    // a partial update. No secrets — returned in full. Drives every AI prompt above.
    if (a === 'settings' && b === 'profile') {
      if (method === 'PUT') { const p = config && config.saveProfile ? config.saveProfile(body.profile || body || {}) : { profile: studio.normaliseProfile ? studio.normaliseProfile(body.profile || body) : (body.profile || body) }; return { ok: true, profile: p.profile }; }
      return { profile: (config && config.getProfile) ? config.getProfile() : null, questions: studio.ONBOARDING_QUESTIONS };
    }

    // ---- settings/site (github seam; read/write src/data/site.json) ----
    if (a === 'settings' && b === 'site') {
      if (method === 'PUT') {
        const { commit } = await putSiteConfig(gh, body.data, body.sha);
        return { ok: true, commit };
      }
      return getSiteConfig(gh); // GET → { data, sha }
    }

    // ---- settings/topics (github seam; read/write src/data/topics.json) ----
    if (a === 'settings' && b === 'topics') {
      if (method === 'PUT') {
        const { commit } = await putTopicsConfig(gh, body.data, body.sha);
        return { ok: true, commit };
      }
      return getTopicsConfig(gh); // GET → { data, sha } (data is the topics array)
    }

    return notFound(rawPath);
  }
  return { api };
}
