// publishBlocks figure-base extraction (M2): an author-time figure backdrop (base.base64)
// must be committed as a FILE, not inlined into the markdown. Uses a fake gh seam so the
// test asserts the emitted commit changes without any network.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makePosts } from './posts.js';

function fakeGh() {
  const calls = { commitMany: null };
  const gh = {
    async getFile() { return null; },
    async listDir() { return []; },
    async commitMany(changes, message) { calls.commitMany = { changes, message }; return { commit: 'deadbeef' }; },
  };
  return { gh, calls };
}

const PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
const RAW = PNG.replace(/^data:image\/png;base64,/, '');
const svg = '<svg xmlns="http://www.w3.org/2000/svg"></svg>';

test('publishBlocks extracts a figure base64 backdrop to a committed file (not inline)', async () => {
  const { gh, calls } = fakeGh();
  const posts = makePosts(gh);
  const doc = { version: 1, blocks: [{ id: 'f1', type: 'figure', svg, base: { base64: PNG, alt: 'bg' } }] };
  await posts.publishBlocks('my-post', doc, { title: 'T', tags: [] });
  const changes = calls.commitMany.changes;

  const img = changes.find((c) => c.path === 'public/images/posts/my-post/figure-base-1.png');
  assert.ok(img, 'figure base committed as a file');
  assert.equal(img.base64, RAW, 'raw base64 committed (data: prefix stripped)');

  const md = changes.find((c) => c.path === 'src/content/blog/my-post.md').content;
  assert.ok(!md.includes('data:image/png;base64'), 'no inline data URL in committed markdown');
  assert.ok(md.includes('/images/posts/my-post/figure-base-1.png'), 'markdown references the file');

  const side = changes.find((c) => c.path === 'src/content/blog/_blocks/my-post.json').content;
  assert.ok(side.includes('figure-base-1.png'), 'sidecar records the file');
  assert.ok(!side.includes('base64'), 'sidecar carries no base64');
});

test('publishBlocks keeps an already-committed figure base.file (no duplicate image change)', async () => {
  const { gh, calls } = fakeGh();
  const posts = makePosts(gh);
  const doc = { version: 1, blocks: [{ id: 'f1', type: 'figure', svg, base: { file: 'figure-base-1.png', src: '/images/posts/my-post/figure-base-1.png', alt: 'bg' } }] };
  await posts.publishBlocks('my-post', doc, { title: 'T', tags: [] });
  const changes = calls.commitMany.changes;
  const imgChanges = changes.filter((c) => c.path.startsWith('public/images/posts/'));
  assert.equal(imgChanges.length, 0, 'no image re-commit for an existing base.file');
  const side = changes.find((c) => c.path === 'src/content/blog/_blocks/my-post.json').content;
  assert.ok(!side.includes('/images/posts/my-post/figure-base-1.png'), 'resolved base.src stripped from sidecar');
});

test('publishBlocks drops an unsafe (non-raster) figure backdrop rather than committing it', async () => {
  const { gh, calls } = fakeGh();
  const posts = makePosts(gh);
  const doc = { version: 1, blocks: [{ id: 'f1', type: 'figure', svg, base: { base64: 'data:text/html;base64,PHNjcmlwdD4=', alt: 'x' } }] };
  await posts.publishBlocks('my-post', doc, { title: 'T', tags: [] });
  const changes = calls.commitMany.changes;
  assert.equal(changes.filter((c) => c.path.startsWith('public/images/posts/')).length, 0, 'unsafe backdrop not committed');
  const md = changes.find((c) => c.path === 'src/content/blog/my-post.md').content;
  assert.ok(!md.includes('data:text/html'), 'unsafe data URL never reaches the markdown');
});
