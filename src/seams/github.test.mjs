// Run:  node --test src/seams/github.test.mjs
// Exercises the browser-direct GitHub seam. Two audited correctness bugs are pinned here:
//   • setPagesDomain must NOT report success for a domain taken by ANOTHER user's repo.
//   • getBinary must NOT return an empty blob for large (>1MB) files the Contents API
//     serves with content:"" / encoding:"none" — it must fetch the real bytes via Git Blobs.
// The seam takes an injected fetch, so every call is a stub (no network), mirroring ai.test.mjs.
import { test } from 'node:test';
import assert from 'node:assert/strict';

const { makeGithub } = await import('./github.js');

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
