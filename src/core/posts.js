// Browser posts core — the GitHub-backed post operations, ported from server/posts.js
// to run against the github SEAM (no SQLite, no node). Block drafts live in the storage
// seam (handled by the router), so the DB draft functions are gone.
import { parse, serialise, readGallery, writeGallery } from '../lib/frontmatter.js';
import * as blocks from '../lib/blocks.js';
import { SAFE_IMAGE_DATA_URL } from '../lib/figures/svg.js';
import { slugify as slugPure } from './slug.js';

const BLOG_DIR = 'src/content/blog';
const postPath = (slug) => `${BLOG_DIR}/${slug}.md`;
const imgDir = (slug) => `${BLOG_DIR}/_images/${slug}`;
const blocksPath = (slug) => `${BLOG_DIR}/_blocks/${slug}.json`;
const publicImgDir = (slug) => `public/images/posts/${slug}`;
const relImg = (slug, file) => `./_images/${slug}/${file}`;
const todayISO = () => new Date().toISOString().slice(0, 10);
// Single source of truth for slug generation lives in ./slug.js (unit-tested). Keep the
// legacy `|| 'post'` fallback here so an all-symbol title still yields a usable slug.
function slugify(title) { return slugPure(title) || 'post'; }
// Image extension for a NEW (base64-only) gallery upload, from its data-URL mime.
// MIME subtypes are case-insensitive (SAFE_IMAGE_DATA_URL accepts data:image/JPEG), so
// the derived extension is LOWERCASED before use: makeGalleryNamer's `taken` set stores
// lowercased names, and a preserved-case "gallery-1.JPEG" would slip past it as a
// case-only sibling of a kept "gallery-1.jpeg" — the SAME file on a case-insensitive
// checkout (macOS). jpeg/JPEG/JPG all normalise to jpg.
function galleryExt(im) {
  const m = /^data:image\/(\w+);base64,/i.exec(im.base64 || '');
  if (!m) return 'jpg';
  const t = m[1].toLowerCase();
  return t === 'jpeg' ? 'jpg' : t;
}

// Filenames for NEW gallery uploads must be unique across the WHOLE post, not per
// block: every gallery's images share one _images/<slug>/ directory and one commitMany
// tree, so two galleries that each restarted at gallery-1 emitted duplicate tree paths
// (commit rejected, or one image silently superseding the other). `makeGalleryNamer`
// returns a per-publish allocator: `taken` seeds with every file already referenced in
// the doc (kept files are never renamed), and a post-wide slot counter numbers new
// uploads — so a single all-new gallery still yields gallery-1, gallery-2, … exactly as
// before, while a candidate that collides with a kept/allocated name bumps past it.
function makeGalleryNamer(docBlocks) {
  const taken = new Set();
  for (const b of docBlocks) {
    if (b && b.type === 'gallery' && Array.isArray(b.images)) {
      for (const im of b.images) if (im && im.file) taken.add(String(im.file).toLowerCase());
    }
  }
  let slot = 0;
  return (im) => {
    slot++;                                  // counts EVERY gallery image slot in doc order
    if (im.file) return im.file;             // already-committed image keeps its name
    const ext = galleryExt(im);
    let n = slot;
    while (taken.has(`gallery-${n}.${ext}`)) n++;
    const file = `gallery-${n}.${ext}`;
    taken.add(file.toLowerCase());
    return file;
  };
}

export function makePosts(gh) {
  async function uniqueSlug(base) { let slug = base, n = 2; while (await gh.getFile(postPath(slug))) slug = `${base}-${n++}`; return slug; }

  async function getPost(slug) {
    const f = await gh.getFile(postPath(slug));
    if (!f) return null;
    const { data, body } = parse(f.content);
    const photos = (await gh.listDir(imgDir(slug))).filter((e) => e.type === 'file');
    return { slug, data, body, sha: f.sha, photos };
  }

  async function setDraft(slug, draft) {
    const cur = await getPost(slug);
    if (!cur) throw Object.assign(new Error('not found'), { status: 404 });
    const md = serialise({ data: { ...cur.data, draft }, body: cur.body });
    const { commit } = await gh.putFile(postPath(slug), md, `studio: ${draft ? 'take down' : 'republish'} ${slug}`, cur.sha);
    return { slug, draft, commit };
  }

  // Patch frontmatter fields only (title/description/tags/accent/image) — used by the bulk
  // retag flow, which loops PUT /posts/:slug. Mirrors server/posts.js updatePost.
  async function updatePost(slug, patch) {
    const cur = await getPost(slug);
    if (!cur) throw Object.assign(new Error('not found'), { status: 404 });
    const data = { ...cur.data };
    if (patch.title != null) data.title = patch.title;
    if (patch.description != null) data.description = patch.description;
    if (patch.tags != null) data.tags = patch.tags;
    if (patch.accent != null) data.accent = patch.accent;
    if (patch.image !== undefined) { if (patch.image) data.image = patch.image; else delete data.image; }
    const body = patch.body != null ? patch.body : cur.body;
    const md = serialise({ data, body });
    const { commit } = await gh.putFile(postPath(slug), md, `studio: edit ${slug}`, cur.sha);
    return { slug, commit };
  }

  return {
    async getTopics() { const f = await gh.getFile('src/data/topics.json'); return f ? JSON.parse(f.content) : []; },

    async listPosts() {
      const entries = (await gh.listDir(BLOG_DIR)).filter((e) => e.type === 'file' && e.name.endsWith('.md'));
      const out = [];
      for (const e of entries) {
        const f = await gh.getFile(e.path);
        const { data, body } = parse(f.content);
        out.push({
          slug: e.name.replace(/\.md$/, ''), title: data.title || e.name, date: data.date || '',
          draft: data.draft === true, publishAt: data.publishAt || '', tags: Array.isArray(data.tags) ? data.tags : [],
          series: data.series || '', seriesPart: Number.isFinite(Number(data.seriesPart)) ? Number(data.seriesPart) : null,
          photoCount: readGallery(body).length,
        });
      }
      return out.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
    },

    getPost,
    suggestSlug(title) { return uniqueSlug(slugify(title || 'untitled')); },

    // Media library: every committed post image under public/images/posts/, grouped by
    // slug, so the composer can REUSE an existing image (insert a /images/posts/... url
    // reference) instead of re-uploading. One recursive git-trees call via gh.listTree.
    async listMediaImages() {
      const PREFIX = 'public/images/posts';
      const EXT = /\.(png|jpe?g|webp|gif|avif|svg)$/i;
      const entries = (await gh.listTree(PREFIX)).filter((e) => EXT.test(e.path));
      const groups = new Map();
      for (const e of entries) {
        const rest = e.path.slice(PREFIX.length + 1);
        const i = rest.indexOf('/');
        if (i < 0) continue;
        const slug = rest.slice(0, i);
        const file = rest.slice(i + 1);
        if (!file || file.includes('/')) continue;
        const url = `/images/posts/${slug}/${file}`;
        if (!groups.has(slug)) groups.set(slug, []);
        groups.get(slug).push({ slug, file, url, size: e.size });
      }
      return [...groups.entries()]
        .map(([slug, images]) => ({ slug, images: images.sort((a, b) => a.file.localeCompare(b.file)) }))
        .sort((a, b) => a.slug.localeCompare(b.slug));
    },
    takedownPost: (slug) => setDraft(slug, true),
    republishPost: (slug) => setDraft(slug, false),
    updatePost,

    // sidecar (block JSON) → legacy (markdown). The router checks the storage draft first.
    async getPostBlocks(slug) {
      const post = await getPost(slug);
      if (!post) return null;
      const side = await gh.getFile(blocksPath(slug));
      if (side) {
        const doc = JSON.parse(side.content);
        for (const b of doc.blocks) {
          if (b.type === 'image' && b.file) b.src = `/images/posts/${slug}/${b.file}`;
          // A published figure backdrop (M2 extracted it to base.file) resolves to the same
          // /images/posts/<slug>/ path — set base.src so the composer preview renders it.
          if (b.type === 'figure' && b.base && b.base.file && !b.base.base64) b.base.src = `/images/posts/${slug}/${b.base.file}`;
        }
        return { source: 'sidecar', doc, data: post.data };
      }
      return { source: 'legacy', doc: blocks.rawDocFromMarkdown(post.body), data: post.data };
    },

    async deletePost(slug) {
      const cur = await getPost(slug);
      if (!cur) throw Object.assign(new Error('not found'), { status: 404 });
      const photos = await gh.listDir(imgDir(slug));
      const sidecar = await gh.getFile(blocksPath(slug));
      const pubImgs = await gh.listDir(publicImgDir(slug));
      const changes = [
        { path: postPath(slug), delete: true },
        ...photos.map((p) => ({ path: p.path, delete: true })),
        ...(sidecar ? [{ path: blocksPath(slug), delete: true }] : []),
        ...pubImgs.map((p) => ({ path: p.path, delete: true })),
      ];
      const { commit } = await gh.commitMany(changes, `studio: delete ${slug}`);
      return { deleted: slug, commit };
    },

    async duplicatePost(slug) {
      const cur = await getPost(slug);
      if (!cur) throw Object.assign(new Error('not found'), { status: 404 });
      const newSlug = await uniqueSlug(slugify(`${cur.data.title || slug}-copy`));
      const rewrite = (s) => (s || '').split(`_images/${slug}/`).join(`_images/${newSlug}/`).split(`images/posts/${slug}/`).join(`images/posts/${newSlug}/`);
      const data = { ...cur.data, title: `${cur.data.title || slug} (copy)`, date: todayISO(), draft: true };
      // A duplicate is a PLAIN draft: drop any inherited schedule, else duplicating a
      // scheduled post silently creates a second post that goes live on the same date.
      delete data.publishAt;
      const changes = [{ path: postPath(newSlug), content: serialise({ data, body: rewrite(cur.body) }) }];
      const side = await gh.getFile(blocksPath(slug));
      if (side) changes.push({ path: blocksPath(newSlug), content: rewrite(side.content) });
      for (const [dir, dst] of [[imgDir(slug), imgDir(newSlug)], [publicImgDir(slug), publicImgDir(newSlug)]]) {
        for (const f of (await gh.listDir(dir)).filter((e) => e.type === 'file')) {
          const bin = await gh.getBinary(f.path);
          if (bin) changes.push({ path: `${dst}/${f.name}`, base64: bin.base64 });
        }
      }
      const { commit } = await gh.commitMany(changes, `studio: duplicate ${slug} → ${newSlug}`);
      return { slug: newSlug, from: slug, url: `/blog/${newSlug}/`, commit };
    },

    async publishBlocks(slug, doc, meta) {
      blocks.validateDoc(doc);
      const imageChanges = [];
      const galleryName = makeGalleryNamer(doc.blocks); // post-wide unique names for new gallery uploads
      const storedBlocks = doc.blocks.map((b, bi) => {
        // Reference mode: an image reused from elsewhere in the repo carries a `url` and no
        // base64 — never re-extract or re-commit its bytes; keep the url reference as-is.
        if (b.type === 'image' && b.url && !b.base64) { const { base64, src, file, ...ref } = b; return ref; }
        if (b.type === 'image' && b.base64) { imageChanges.push({ path: `${publicImgDir(slug)}/${b.file}`, base64: b.base64 }); const { base64, src, url, ...ref } = b; return ref; }
        if (b.type === 'image') { const { src, ...ref } = b; return ref; }
        if (b.type === 'gallery' && Array.isArray(b.images)) {
          const images = b.images.map((im) => { const file = galleryName(im || {}); if (im && im.base64) imageChanges.push({ path: `${imgDir(slug)}/${file}`, base64: im.base64 }); return { file, alt: (im && im.alt) || '' }; });
          return { ...b, images };
        }
        // Figure base image (M2): an author-time `base.base64` data URL is otherwise committed
        // INLINE by the serialiser (figureInner). Extract it to a committed file — mirroring the
        // image/gallery pipeline — and reference it by `base.file`, so the markdown stays lean.
        if (b.type === 'figure' && b.base) {
          // Already a committed backdrop (re-published figure): keep the file ref, drop any
          // resolved src/base64 so the sidecar JSON stays clean (mirrors the image src strip).
          if (b.base.file) return { ...b, base: { file: b.base.file, alt: b.base.alt || '' } };
          if (b.base.base64) {
            // Only a SAFE raster is extracted (matches figureInner's guard); base.base64 is a
            // full data URL, so strip the `data:...;base64,` prefix to the raw bytes commitMany
            // wants. An unsafe/non-raster backdrop is dropped (overlay svg still renders).
            const du = String(b.base.base64);
            const m = SAFE_IMAGE_DATA_URL.test(du) && /^data:image\/([a-z+]+);base64,([\s\S]+)$/i.exec(du);
            if (m) {
              const ext = m[1].toLowerCase() === 'jpeg' ? 'jpg' : m[1].toLowerCase();
              const file = `figure-base-${bi + 1}.${ext}`;
              imageChanges.push({ path: `${publicImgDir(slug)}/${file}`, base64: m[2] });
              return { ...b, base: { file, alt: b.base.alt || '' } };
            }
            const { base, ...rest } = b;
            return rest;
          }
        }
        return b;
      });
      const storedDoc = { version: 1, blocks: storedBlocks };
      // References → footnote definitions (serialiser) + persisted frontmatter, so the
      // editor restores the full list on re-open. Mirrors server/posts.js.
      const citations = (Array.isArray(meta.citations) ? meta.citations : [])
        .filter((c) => c && c.id)
        .map((c) => ({ id: String(c.id), text: String(c.text == null ? '' : c.text) }));
      const body = blocks.serialiseBlocks(storedBlocks, { slug, citations });
      const md = serialise({ data: {
        title: meta.title, description: (meta.description || '').slice(0, 155) || meta.title,
        date: meta.date || todayISO(), tags: meta.tags || [],
        ...(meta.series && String(meta.series).trim() ? { series: String(meta.series).trim() } : {}),
        ...(meta.series && String(meta.series).trim() && Number.isFinite(Number(meta.seriesPart)) ? { seriesPart: Number(meta.seriesPart) } : {}),
        accent: meta.accent || '#2dd4bf',
        ...(meta.image ? { image: meta.image } : {}),
        ...(meta.glyph ? { glyph: meta.glyph } : {}),
        // Reading template: the editor always sends one (default 'observatory'); carry it
        // through and let serialise() omit the default — previously the allowlist dropped
        // it entirely, so a chosen template was silently lost on every publish.
        ...(meta.template ? { template: String(meta.template) } : {}),
        ...(meta.theme && meta.theme !== 'dark' ? { theme: meta.theme } : {}),
        ...(citations.length ? { citations } : {}),
        // A scheduled post is committed as a hidden draft carrying publishAt; the site's
        // GitHub Action flips draft→false once publishAt is due. Force draft:true whenever
        // publishAt is set so a scheduled post can never go live early.
        ...((meta.draft || meta.publishAt) ? { draft: true } : {}),
        ...(meta.publishAt ? { publishAt: meta.publishAt } : {}),
      }, body });
      const changes = [
        { path: postPath(slug), content: md },
        { path: blocksPath(slug), content: JSON.stringify(storedDoc, null, 2) },
        ...imageChanges,
      ];
      const { commit } = await gh.commitMany(changes, meta.publishAt ? `studio: schedule ${slug} for ${meta.publishAt}` : `studio: publish ${slug}`);
      return { slug, url: `/blog/${slug}/`, commit };
    },
  };
}
