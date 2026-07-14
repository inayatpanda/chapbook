// Browser posts core — the GitHub-backed post operations, ported from server/posts.js
// to run against the github SEAM (no SQLite, no node). Block drafts live in the storage
// seam (handled by the router), so the DB draft functions are gone.
import { parse, serialise, readGallery, writeGallery } from '../lib/frontmatter.js';
import * as blocks from '../lib/blocks.js';

const BLOG_DIR = 'src/content/blog';
const postPath = (slug) => `${BLOG_DIR}/${slug}.md`;
const imgDir = (slug) => `${BLOG_DIR}/_images/${slug}`;
const blocksPath = (slug) => `${BLOG_DIR}/_blocks/${slug}.json`;
const publicImgDir = (slug) => `public/images/posts/${slug}`;
const relImg = (slug, file) => `./_images/${slug}/${file}`;
const todayISO = () => new Date().toISOString().slice(0, 10);
function slugify(title) {
  return String(title || '').toLowerCase().trim()
    .replace(/[^\w\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '')
    .slice(0, 60) || 'post';
}
function galleryFilename(im, i) {
  if (im.file) return im.file;
  const m = /^data:image\/(\w+);base64,/.exec(im.base64 || '');
  const ext = m ? (m[1] === 'jpeg' ? 'jpg' : m[1]) : 'jpg';
  return `gallery-${i + 1}.${ext}`;
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
        for (const b of doc.blocks) if (b.type === 'image' && b.file) b.src = `/images/posts/${slug}/${b.file}`;
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
      const storedBlocks = doc.blocks.map((b) => {
        // Reference mode: an image reused from elsewhere in the repo carries a `url` and no
        // base64 — never re-extract or re-commit its bytes; keep the url reference as-is.
        if (b.type === 'image' && b.url && !b.base64) { const { base64, src, file, ...ref } = b; return ref; }
        if (b.type === 'image' && b.base64) { imageChanges.push({ path: `${publicImgDir(slug)}/${b.file}`, base64: b.base64 }); const { base64, src, url, ...ref } = b; return ref; }
        if (b.type === 'image') { const { src, ...ref } = b; return ref; }
        if (b.type === 'gallery' && Array.isArray(b.images)) {
          const images = b.images.map((im, i) => { const file = galleryFilename(im || {}, i); if (im && im.base64) imageChanges.push({ path: `${imgDir(slug)}/${file}`, base64: im.base64 }); return { file, alt: (im && im.alt) || '' }; });
          return { ...b, images };
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
