// Run:  node --test src/seams/github.test.mjs
// Exercises the browser-direct GitHub seam. Two audited correctness bugs are pinned here:
//   • setPagesDomain must NOT report success for a domain taken by ANOTHER user's repo.
//   • getBinary must NOT return an empty blob for large (>1MB) files the Contents API
//     serves with content:"" / encoding:"none" — it must fetch the real bytes via Git Blobs.
// The seam takes an injected fetch, so every call is a stub (no network), mirroring ai.test.mjs.
import { test } from 'node:test';
import assert from 'node:assert/strict';

const { makeGithub, isFastForwardConflict } = await import('./github.js');

const GH = { token: 'ghp-test', owner: 'me', repo: 'blog', branch: 'main' };

// A minimal Response-like: json() resolves the given payload; ok derives from status.
const res = (status, payload) => ({ ok: status >= 200 && status < 300, status, json: async () => payload });

// ── Fix: setPagesDomain custom-domain false-success ──────────────────────────
// GitHub 422s BOTH "already set on this repo" (benign) and "already taken" by a DIFFERENT
// repo (a real failure) — the latter must never masquerade as ok.

test('setPagesDomain: 422 "already set on this repo" → ok (benign, this repo already has it)', async () => {
  const fetchImpl = async (url, init = {}) => {
    assert.equal((init.method || 'GET').toUpperCase(), 'PUT');
    return res(422, { message: 'The custom domain www.foo.com is already set on this repo.' });
  };
  const gh = makeGithub(GH, fetchImpl);
  const r = await gh.setPagesDomain({ owner: 'me', repo: 'blog', cname: 'www.foo.com' });
  assert.deepEqual(r, { ok: true, alreadySet: true });
});

test('setPagesDomain: 422 "is already taken" (by ANOTHER repo) → throws, never ok', async () => {
  const fetchImpl = async () => res(422, { message: 'The custom domain www.foo.com is already taken.' });
  const gh = makeGithub(GH, fetchImpl);
  await assert.rejects(
    () => gh.setPagesDomain({ owner: 'me', repo: 'blog', cname: 'www.foo.com' }),
    (e) => e.status === 422 && /already taken/i.test(e.message),
  );
});

test('setPagesDomain: 422 "taken by your site" → ok (this repo owns it, despite "already taken")', async () => {
  // The trickiest phrasing: contains BOTH "already taken" AND "taken by your site". It means
  // YOUR site already has the domain, so it must return ok — the guard's ordering handles it.
  const fetchImpl = async () => res(422, { message: 'The custom domain www.foo.com is already taken by your site.' });
  const gh = makeGithub(GH, fetchImpl);
  const r = await gh.setPagesDomain({ owner: 'me', repo: 'blog', cname: 'www.foo.com' });
  assert.deepEqual(r, { ok: true, alreadySet: true });
});

test('setPagesDomain: a clean 2xx → ok, alreadySet false', async () => {
  const fetchImpl = async () => res(200, { cname: 'www.foo.com' });
  const gh = makeGithub(GH, fetchImpl);
  assert.deepEqual(await gh.setPagesDomain({ owner: 'me', repo: 'blog', cname: 'www.foo.com' }), { ok: true, alreadySet: false });
});

// ── Fix: getBinary large-file corruption ─────────────────────────────────────
// The Contents API inlines base64 only for <1MB files; 1–100MB files come back with
// content:"" and encoding:"none", so returning j.content blindly hands callers an EMPTY blob.

test('getBinary: small file inlined by the Contents API → returns its base64, no extra fetch', async () => {
  const calls = [];
  const fetchImpl = async (url) => {
    calls.push(String(url));
    return res(200, { content: 'QUJD\n', encoding: 'base64', sha: 'small-sha', size: 3 });
  };
  const gh = makeGithub(GH, fetchImpl);
  const out = await gh.getBinary('media/tiny.png');
  assert.deepEqual(out, { base64: 'QUJD', sha: 'small-sha' });
  assert.equal(calls.length, 1, 'only the Contents call — no Blobs round-trip for a small file');
  assert.ok(!calls.some((u) => u.includes('/git/blobs/')), 'never hit the Blobs API');
});

test('getBinary: large file (encoding:"none", content:"") → fetches the real bytes via Git Blobs', async () => {
  const calls = [];
  const fetchImpl = async (url) => {
    const u = String(url);
    calls.push(u);
    if (u.includes('/git/blobs/big-sha')) return res(200, { content: 'QklHQkxPQg==\n', encoding: 'base64', sha: 'big-sha' });
    // Contents API for a >1MB file: no inline content.
    return res(200, { content: '', encoding: 'none', sha: 'big-sha', size: 5_000_000 });
  };
  const gh = makeGithub(GH, fetchImpl);
  const out = await gh.getBinary('media/huge.png');
  assert.deepEqual(out, { base64: 'QklHQkxPQg==', sha: 'big-sha' });   // the actual blob bytes, not ''
  assert.ok(calls.some((u) => u.includes('/git/blobs/big-sha')), 'fetched the blob by sha');
});

test('getBinary: content empty while size>0 (even without encoding:"none") also falls back to Blobs', async () => {
  const fetchImpl = async (url) => {
    const u = String(url);
    if (u.includes('/git/blobs/b2')) return res(200, { content: 'Wlla==', encoding: 'base64', sha: 'b2' });
    return res(200, { content: '', encoding: 'base64', sha: 'b2', size: 2_000_000 });
  };
  const gh = makeGithub(GH, fetchImpl);
  assert.deepEqual(await gh.getBinary('media/x.png'), { base64: 'Wlla==', sha: 'b2' });
});

test('getBinary: 404 → null (missing file), unchanged', async () => {
  const gh = makeGithub(GH, async () => ({ ok: false, status: 404, json: async () => ({}) }));
  assert.equal(await gh.getBinary('media/nope.png'), null);
});

// ── Fix: stale-HEAD publish/delete loop ──────────────────────────────────────
// Firing two commits faster than the browser HTTP cache expires (GitHub sends
// Cache-Control: max-age=60 on GETs) made commitMany build on a STALE parent sha →
// the refs PATCH failed "Update is not a fast forward" and Retry looped on the same
// cached read. Two guards are pinned here: every read bypasses the HTTP cache
// (cache:'no-store'), and a detected fast-forward/ref conflict re-fetches HEAD and
// rebuilds the commit on the current tip exactly once.

test('isFastForwardConflict: 422 "Update is not a fast forward" → true', () => {
  assert.equal(isFastForwardConflict(Object.assign(new Error('Update is not a fast forward'), { status: 422 })), true);
});

test('isFastForwardConflict: 422 "Reference cannot be updated" → true', () => {
  assert.equal(isFastForwardConflict(Object.assign(new Error('Reference cannot be updated'), { status: 422 })), true);
});

test('isFastForwardConflict: 409 compare-and-swap mismatch ("is at … but expected …") → true', () => {
  assert.equal(isFastForwardConflict(Object.assign(new Error('main is at 1111111 but expected 2222222'), { status: 409 })), true);
});

test('isFastForwardConflict: 401 bad credentials → false (never auto-retry auth failures)', () => {
  assert.equal(isFastForwardConflict(Object.assign(new Error('Bad credentials'), { status: 401 })), false);
});

test('isFastForwardConflict: 422 generic validation failure → false', () => {
  assert.equal(isFastForwardConflict(Object.assign(new Error('Validation Failed'), { status: 422 })), false);
  assert.equal(isFastForwardConflict(null), false);
  assert.equal(isFastForwardConflict(new Error('Update is not a fast forward')), false, 'no status → not a ref conflict');
});

// Fetch stub for commitMany: serves ref reads from `refShas` in order, fails the refs
// PATCH with `patchFails` conflict errors before letting one succeed. Records calls.
function commitManyStub({ refShas, patchFails = 0 }) {
  const calls = [];
  let refReads = 0, patches = 0;
  const fetchImpl = async (url, init = {}) => {
    const u = String(url), method = (init.method || 'GET').toUpperCase();
    calls.push({ url: u, method, init, body: init.body ? JSON.parse(init.body) : null });
    if (u.includes('/git/ref/heads/')) return res(200, { object: { sha: refShas[Math.min(refReads++, refShas.length - 1)] } });
    if (u.includes('/git/commits/') && method === 'GET') { const sha = u.split('/').pop(); return res(200, { sha, tree: { sha: 'tree-of-' + sha } }); }
    if (u.endsWith('/git/blobs') && method === 'POST') return res(200, { sha: 'blob-1' });
    if (u.endsWith('/git/trees') && method === 'POST') return res(200, { sha: 'newtree-1' });
    if (u.endsWith('/git/commits') && method === 'POST') { const parent = JSON.parse(init.body).parents[0]; return res(201, { sha: 'commit-on-' + parent }); }
    if (u.includes('/git/refs/heads/') && method === 'PATCH') {
      if (patches++ < patchFails) return res(422, { message: 'Update is not a fast forward' });
      return res(200, {});
    }
    throw new Error('unexpected call: ' + method + ' ' + u);
  };
  return { fetchImpl, calls };
}

test('commitMany: reads the branch ref with cache:"no-store" (bypasses the 60s GitHub HTTP cache)', async () => {
  const { fetchImpl, calls } = commitManyStub({ refShas: ['tip-a'] });
  const gh = makeGithub(GH, fetchImpl);
  await gh.commitMany([{ path: 'a.md', content: 'hi' }], 'msg');
  const refRead = calls.find((c) => c.url.includes('/git/ref/heads/'));
  assert.ok(refRead, 'ref was read');
  assert.equal(refRead.init.cache, 'no-store');
});

test('commitMany: fast-forward conflict → re-fetches HEAD and rebuilds the commit on the NEW tip (one-shot)', async () => {
  const { fetchImpl, calls } = commitManyStub({ refShas: ['stale-tip', 'fresh-tip'], patchFails: 1 });
  const gh = makeGithub(GH, fetchImpl);
  const out = await gh.commitMany([{ path: 'a.md', content: 'hi' }], 'msg');
  assert.equal(out.commit, 'commit-on-fresh-tip', 'final commit is parented on the re-fetched tip');
  const refReads = calls.filter((c) => c.url.includes('/git/ref/heads/'));
  assert.equal(refReads.length, 2, 'HEAD was re-fetched for the retry');
  const commitPosts = calls.filter((c) => c.url.endsWith('/git/commits') && c.method === 'POST');
  assert.deepEqual(commitPosts.map((c) => c.body.parents), [['stale-tip'], ['fresh-tip']]);
  const blobPosts = calls.filter((c) => c.url.endsWith('/git/blobs'));
  assert.equal(blobPosts.length, 1, 'blobs are content-addressed — not re-uploaded on retry');
});

test('commitMany: conflict persisting after the one-shot retry surfaces (no infinite loop)', async () => {
  const { fetchImpl, calls } = commitManyStub({ refShas: ['tip-a', 'tip-b', 'tip-c'], patchFails: 5 });
  const gh = makeGithub(GH, fetchImpl);
  await assert.rejects(() => gh.commitMany([{ path: 'a.md', content: 'hi' }], 'msg'),
    (e) => e.status === 422 && /fast forward/i.test(e.message));
  assert.equal(calls.filter((c) => c.method === 'PATCH').length, 2, 'exactly one retry, then the error stands');
});

test('commitMany: a NON-conflict failure is thrown immediately — no retry', async () => {
  const calls = [];
  const fetchImpl = async (url, init = {}) => {
    const u = String(url), method = (init.method || 'GET').toUpperCase();
    calls.push({ url: u, method });
    if (u.includes('/git/ref/heads/')) return res(200, { object: { sha: 'tip-a' } });
    if (u.includes('/git/commits/') && method === 'GET') return res(200, { sha: 'tip-a', tree: { sha: 't' } });
    if (u.endsWith('/git/blobs') && method === 'POST') return res(200, { sha: 'b' });
    if (u.endsWith('/git/trees') && method === 'POST') return res(200, { sha: 't2' });
    if (u.endsWith('/git/commits') && method === 'POST') return res(201, { sha: 'c2' });
    if (u.includes('/git/refs/heads/') && method === 'PATCH') return res(401, { message: 'Bad credentials' });
    throw new Error('unexpected: ' + u);
  };
  const gh = makeGithub(GH, fetchImpl);
  await assert.rejects(() => gh.commitMany([{ path: 'a.md', content: 'hi' }], 'msg'), (e) => e.status === 401);
  assert.equal(calls.filter((c) => c.method === 'PATCH').length, 1, 'a 401 never triggers the conflict retry');
  assert.equal(calls.filter((c) => c.url.includes('/git/ref/heads/')).length, 1, 'no second HEAD fetch on auth failure');
});
