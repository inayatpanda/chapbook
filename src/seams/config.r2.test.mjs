import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeConfig } from './config.js';

// Minimal localStorage fake (the seam only needs get/set/remove).
function fakeLS() {
  const m = new Map();
  return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, v), removeItem: (k) => m.delete(k) };
}

test('saveR2 normalises + trims, getR2 reads it back, isR2Configured true', () => {
  const cfg = makeConfig(fakeLS());
  cfg.saveR2({
    endpoint: 'https://acct.r2.cloudflarestorage.com/',
    bucket: '  media ',
    accessKeyId: ' AKID ',
    secretAccessKey: ' SECRET ',
    publicBase: 'https://media.example.com//',
  });
  const r = cfg.getR2();
  assert.equal(r.endpoint, 'https://acct.r2.cloudflarestorage.com');
  assert.equal(r.bucket, 'media');
  assert.equal(r.accessKeyId, 'AKID');
  assert.equal(r.secretAccessKey, 'SECRET');
  assert.equal(r.publicBase, 'https://media.example.com');
  assert.equal(cfg.isR2Configured(), true);
});

test('saveR2 with a blank secret keeps the previously stored secret', () => {
  const cfg = makeConfig(fakeLS());
  cfg.saveR2({ endpoint: 'https://a.r2.cloudflarestorage.com', bucket: 'b', accessKeyId: 'k', secretAccessKey: 'sek', publicBase: 'https://p.example.com' });
  // Re-save changing only the bucket, leaving secret blank.
  cfg.saveR2({ endpoint: 'https://a.r2.cloudflarestorage.com', bucket: 'b2', accessKeyId: 'k', secretAccessKey: '', publicBase: 'https://p.example.com' });
  const r = cfg.getR2();
  assert.equal(r.bucket, 'b2');
  assert.equal(r.secretAccessKey, 'sek'); // preserved
  assert.equal(cfg.isR2Configured(), true);
});

test('isR2Configured false until every field present; clearR2 wipes it', () => {
  const cfg = makeConfig(fakeLS());
  assert.equal(cfg.isR2Configured(), false);
  cfg.saveR2({ endpoint: 'https://a.r2.cloudflarestorage.com', bucket: 'b', accessKeyId: 'k', secretAccessKey: 'sek', publicBase: '' });
  assert.equal(cfg.isR2Configured(), false); // no publicBase
  cfg.saveR2({ endpoint: 'https://a.r2.cloudflarestorage.com', bucket: 'b', accessKeyId: 'k', secretAccessKey: 'sek', publicBase: 'https://p.example.com' });
  assert.equal(cfg.isR2Configured(), true);
  cfg.clearR2();
  assert.equal(cfg.isR2Configured(), false);
});

test('R2 config is independent of GitHub/remote config (separate keys)', () => {
  const cfg = makeConfig(fakeLS());
  cfg.save({ ghOwner: 'me', ghRepo: 'blog', ghToken: 't' });
  cfg.saveR2({ endpoint: 'https://a.r2.cloudflarestorage.com', bucket: 'b', accessKeyId: 'k', secretAccessKey: 'sek', publicBase: 'https://p.example.com' });
  assert.equal(cfg.isConfigured(), true);   // GitHub still intact
  assert.equal(cfg.isR2Configured(), true); // R2 intact
  assert.equal(cfg.getGithub().token, 't');
});

test('saveR2Worker stores url+secret under r2.worker; trims; getR2Worker reads back', () => {
  const cfg = makeConfig(fakeLS());
  cfg.saveR2Worker({ url: 'https://w.acct.workers.dev/', secret: ' SEK ' });
  const w = cfg.getR2Worker();
  assert.equal(w.url, 'https://w.acct.workers.dev');
  assert.equal(w.secret, 'SEK');
});

test('saveR2Worker with a blank secret keeps the previously stored secret', () => {
  const cfg = makeConfig(fakeLS());
  cfg.saveR2Worker({ url: 'https://w.acct.workers.dev', secret: 'SEK' });
  cfg.saveR2Worker({ url: 'https://w2.acct.workers.dev', secret: '' });
  const w = cfg.getR2Worker();
  assert.equal(w.url, 'https://w2.acct.workers.dev');
  assert.equal(w.secret, 'SEK'); // preserved
});

test('isR2WorkerConfigured needs url+secret AND publicBase; clearR2Worker removes only the worker', () => {
  const cfg = makeConfig(fakeLS());
  cfg.saveR2Worker({ url: 'https://w.acct.workers.dev', secret: 'SEK' });
  assert.equal(cfg.isR2WorkerConfigured(), false); // no publicBase yet
  cfg.saveR2({ endpoint: 'https://a.r2.cloudflarestorage.com', bucket: 'b', accessKeyId: 'k', secretAccessKey: 'sek', publicBase: 'https://p.example.com' });
  // saveR2 must preserve the worker sub-key.
  assert.equal(cfg.getR2Worker().url, 'https://w.acct.workers.dev');
  assert.equal(cfg.isR2WorkerConfigured(), true);
  cfg.clearR2Worker();
  assert.equal(cfg.isR2WorkerConfigured(), false);
  assert.equal(cfg.isR2Configured(), true); // direct R2 fields untouched
});

test('clearR2 wipes the worker sub-key too', () => {
  const cfg = makeConfig(fakeLS());
  cfg.saveR2({ endpoint: 'https://a.r2.cloudflarestorage.com', bucket: 'b', accessKeyId: 'k', secretAccessKey: 'sek', publicBase: 'https://p.example.com' });
  cfg.saveR2Worker({ url: 'https://w.acct.workers.dev', secret: 'SEK' });
  cfg.clearR2();
  assert.equal(cfg.getR2Worker().url, '');
  assert.equal(cfg.isR2WorkerConfigured(), false);
});
