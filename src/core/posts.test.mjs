// Publish-pipeline defects from the e2e audit: duplicate-keeps-schedule, gallery
// tree-path collisions, the dropped reading template, and lossy frontmatter on the
// setDraft/updatePost round-trip. Fake gh seam (same pattern as posts.figure.test.mjs)
// so every test asserts the exact commit changes with no network.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makePosts } from './posts.js';

// A fake gh seam backed by a { path: content } map. Captures putFile/commitMany.
function fakeGh(files = {}) {
  const calls = { commitMany: null, putFile: null };
  const gh = {
    async getFile(path) {
      return Object.prototype.hasOwnProperty.call(files, path)
        ? { sha: 'sha-' + path, content: files[path] } : null;
    },
    async listDir() { return []; },
    async getBinary() { return null; },
    async putFile(path, content, message, sha) { calls.putFile = { path, content, message, sha }; return { commit: 'cafebabe' }; },
    async commitMany(changes, message) { calls.commitMany = { changes, message }; return { commit: 'deadbeef' }; },
  };
  return { gh, calls };
}

const B64 = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQ==';
const PNG64 = 'data:image/png;base64,iVBORw0KGgo=';

// ── duplicate: a copy is a PLAIN draft, never a second scheduled post ─────────

test('duplicatePost drops publishAt — the copy is a plain draft, not scheduled', async () => {
  const src = '---\ntitle: "Scheduled one"\ndate: 2026-07-01\ntags: []\naccent: "#2dd4bf"\ndraft: true\npublishAt: 2026-08-01T09:00:00.000Z\n---\n\nBody.\n';
  const { gh, calls } = fakeGh({ 'src/content/blog/sched.md': src });
  const posts = makePosts(gh);
  const r = await posts.duplicatePost('sched');
  const md = calls.commitMany.changes.find((c) => c.path === `src/content/blog/${r.slug}.md`).content;
  assert.match(md, /draft: true/, 'the duplicate is a draft');
  assert.ok(!/publishAt/.test(md), 'the inherited schedule must be dropped');
});

// ── gallery filenames: unique across the whole post (one commitMany tree) ─────

test('publishBlocks: two galleries in one post emit DISTINCT image paths', async () => {
  const { gh, calls } = fakeGh();
  const posts = makePosts(gh);
  const doc = { version: 1, blocks: [
    { id: 'g1', type: 'gallery', images: [{ base64: B64, alt: 'one' }] },
    { id: 'g2', type: 'gallery', images: [{ base64: B64, alt: 'two' }] },
  ] };
  await posts.publishBlocks('collide', doc, { title: 'T', tags: [] });
  const imgPaths = calls.commitMany.changes
    .filter((c) => c.path.startsWith('src/content/blog/_images/collide/'))
    .map((c) => c.path);
  assert.equal(imgPaths.length, 2, 'both gallery images are committed');
  assert.equal(new Set(imgPaths).size, 2, 'no duplicate tree paths in one commit');
  assert.deepEqual(imgPaths, [
    'src/content/blog/_images/collide/gallery-1.jpg',
    'src/content/blog/_images/collide/gallery-2.jpg',
  ]);
  // the sidecar + markdown reference the same distinct files
  const side = calls.commitMany.changes.find((c) => c.path === 'src/content/blog/_blocks/collide.json').content;
  assert.match(side, /gallery-1\.jpg/);
  assert.match(side, /gallery-2\.jpg/);
});

test('publishBlocks: a single all-new gallery keeps the exact legacy names (byte pin)', async () => {
  const { gh, calls } = fakeGh();
  const posts = makePosts(gh);
  const doc = { version: 1, blocks: [
    { id: 'g1', type: 'gallery', images: [{ base64: B64, alt: 'a' }, { base64: PNG64, alt: 'b' }] },
  ] };
  await posts.publishBlocks('solo', doc, { title: 'T', tags: [] });
  const imgPaths = calls.commitMany.changes
    .filter((c) => c.path.startsWith('src/content/blog/_images/solo/'))
    .map((c) => c.path);
  assert.deepEqual(imgPaths, [
    'src/content/blog/_images/solo/gallery-1.jpg',
    'src/content/blog/_images/solo/gallery-2.png',
  ], 'single-gallery names are unchanged by the uniqueness fix');
});

test('publishBlocks: a new upload never steals the name of a KEPT gallery file', async () => {
  const { gh, calls } = fakeGh();
  const posts = makePosts(gh);
  // slot 2 would be "gallery-2.jpg", but that name is already held by the kept file → bump.
  const doc = { version: 1, blocks: [
    { id: 'g1', type: 'gallery', images: [{ file: 'gallery-2.jpg', alt: 'kept' }, { base64: B64, alt: 'new' }] },
  ] };
  await posts.publishBlocks('keep', doc, { title: 'T', tags: [] });
  const imgPaths = calls.commitMany.changes
    .filter((c) => c.path.startsWith('src/content/blog/_images/keep/'))
    .map((c) => c.path);
  assert.deepEqual(imgPaths, ['src/content/blog/_images/keep/gallery-3.jpg'],
    'the new image bumps past the kept gallery-2.jpg instead of overwriting it');
  const side = calls.commitMany.changes.find((c) => c.path === 'src/content/blog/_blocks/keep.json').content;
  assert.match(side, /gallery-2\.jpg/, 'kept file still referenced');
  assert.match(side, /gallery-3\.jpg/, 'new file referenced under its bumped name');
});

test('publishBlocks: an uppercase-MIME upload cannot mint a case-only near-duplicate', async () => {
  const { gh, calls } = fakeGh();
  const posts = makePosts(gh);
  // MIME subtypes are case-insensitive, so data:image/JPEG is a valid upload — but the
  // namer used to preserve the extension case, minting gallery-N.JPEG alongside kept
  // .jpeg files: a case-only sibling that is the SAME file on a case-insensitive
  // checkout (macOS). The derived extension must be lowercased (JPEG → jpg).
  const doc = { version: 1, blocks: [
    { id: 'g1', type: 'gallery', images: [
      { file: 'gallery-1.jpeg', alt: 'kept' },
      { base64: 'data:image/JPEG;base64,/9j/4AAQSkZJRgABAQAAAQ==', alt: 'new' },
    ] },
  ] };
  await posts.publishBlocks('case', doc, { title: 'T', tags: [] });
  const imgPaths = calls.commitMany.changes
    .filter((c) => c.path.startsWith('src/content/blog/_images/case/'))
    .map((c) => c.path);
  assert.deepEqual(imgPaths, ['src/content/blog/_images/case/gallery-2.jpg'],
    'the new upload gets a lowercased, distinct name (never gallery-2.JPEG)');
});

// ── reading template: survives publish ────────────────────────────────────────

test('publishBlocks carries a chosen reading template into the frontmatter', async () => {
  const { gh, calls } = fakeGh();
  const posts = makePosts(gh);
  const doc = { version: 1, blocks: [{ id: 't1', type: 'text', html: 'hello' }] };
  await posts.publishBlocks('templated', doc, { title: 'T', tags: [], template: 'parchment' });
  const md = calls.commitMany.changes.find((c) => c.path === 'src/content/blog/templated.md').content;
  assert.match(md, /^template: "parchment"$/m, 'the chosen template is written');
});

test('publishBlocks with the default template writes NO template line (byte pin)', async () => {
  const { gh, calls } = fakeGh();
  const posts = makePosts(gh);
  const doc = { version: 1, blocks: [{ id: 't1', type: 'text', html: 'hello' }] };
  await posts.publishBlocks('plain', doc, { title: 'T', tags: [], template: 'observatory' });
  const md = calls.commitMany.changes.find((c) => c.path === 'src/content/blog/plain.md').content;
  assert.ok(!/template:/.test(md), 'the observatory default stays omitted');
});

// ── unknown frontmatter survives the setDraft/updatePost round-trip ───────────

test('republishPost (setDraft) preserves a custom frontmatter field', async () => {
  const src = '---\ntitle: "Keeper"\ndate: 2026-07-01\ntags: []\naccent: "#2dd4bf"\ncustomField: "keep-me"\ndraft: true\n---\n\nBody.\n';
  const { gh, calls } = fakeGh({ 'src/content/blog/keeper.md': src });
  const posts = makePosts(gh);
  await posts.republishPost('keeper');
  const md = calls.putFile.content;
  assert.match(md, /^customField: "keep-me"$/m, 'the custom field survives republish');
  assert.ok(!/draft: true/.test(md), 'republish removed the draft flag');
});

test('updatePost preserves a custom frontmatter field while patching tags', async () => {
  const src = '---\ntitle: "Keeper"\ndate: 2026-07-01\ntags: []\naccent: "#2dd4bf"\ncustomField: "keep-me"\n---\n\nBody.\n';
  const { gh, calls } = fakeGh({ 'src/content/blog/keeper.md': src });
  const posts = makePosts(gh);
  await posts.updatePost('keeper', { tags: ['new-tag'] });
  const md = calls.putFile.content;
  assert.match(md, /^tags: \["new-tag"\]$/m, 'the patch applied');
  assert.match(md, /^customField: "keep-me"$/m, 'the custom field survives the edit');
});

test('updatePost preserves a HYPHENATED custom field (og-image)', async () => {
  const src = '---\ntitle: "Keeper"\ndate: 2026-07-01\ntags: []\nog-image: /x.png\n---\n\nBody.\n';
  const { gh, calls } = fakeGh({ 'src/content/blog/keeper.md': src });
  const posts = makePosts(gh);
  await posts.updatePost('keeper', { tags: ['t'] });
  assert.match(calls.putFile.content, /^og-image: "\/x\.png"$/m, 'og-image survives the edit');
});

test('takedownPost (setDraft) preserves a HYPHENATED custom field (og-image)', async () => {
  const src = '---\ntitle: "Keeper"\ndate: 2026-07-01\ntags: []\nog-image: /x.png\n---\n\nBody.\n';
  const { gh, calls } = fakeGh({ 'src/content/blog/keeper.md': src });
  const posts = makePosts(gh);
  await posts.takedownPost('keeper');
  const md = calls.putFile.content;
  assert.match(md, /^og-image: "\/x\.png"$/m, 'og-image survives take-down');
  assert.match(md, /^draft: true$/m);
});
