// Run:  node --test server/ai/pickLatest.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  pickLatestFromList,
  latestModelOffline,
  isTextModel,
  LATEST_ALIAS,
  SAFE_DEFAULT,
} from './pickLatest.js';

/* ── isTextModel ─────────────────────────────────────────────────────────── */

test('isTextModel excludes image / tts / embedding / vision / moderation heads', () => {
  assert.equal(isTextModel('openai', 'gpt-image-1'), false);
  assert.equal(isTextModel('openai', 'tts-1-hd'), false);
  assert.equal(isTextModel('openai', 'text-embedding-3-large'), false);
  assert.equal(isTextModel('openai', 'whisper-1'), false);
  assert.equal(isTextModel('openai', 'omni-moderation-latest'), false);
  assert.equal(isTextModel('google', 'imagen-3.0-generate-002'), false);
  assert.equal(isTextModel('google', 'gemini-2.5-flash-tts'), false);
  assert.equal(isTextModel('google', 'embedding-001'), false);
  assert.equal(isTextModel('google', 'veo-3'), false);
});

test('isTextModel excludes previews / experiments / dated-snapshot noise', () => {
  assert.equal(isTextModel('google', 'gemini-3.5-flash-preview-09-2025'), false);
  assert.equal(isTextModel('google', 'gemini-2.0-flash-exp'), false);
  assert.equal(isTextModel('openai', 'gpt-4o-realtime-preview'), false);
  assert.equal(isTextModel('anthropic', 'claude-opus-4-8-thinking'), false);
});

test('isTextModel accepts general chat models per provider', () => {
  assert.equal(isTextModel('anthropic', 'claude-sonnet-4-6'), true);
  assert.equal(isTextModel('anthropic', 'claude-opus-4-8'), true);
  assert.equal(isTextModel('openai', 'gpt-5.5'), true);
  assert.equal(isTextModel('openai', 'chatgpt-4o-latest'), true);
  assert.equal(isTextModel('google', 'gemini-flash-latest'), true);
  assert.equal(isTextModel('google', 'gemini-3.5-flash'), true);
});

test('isTextModel requires a known chat family for openai/anthropic (no bare fine-tunes)', () => {
  assert.equal(isTextModel('anthropic', 'ft:some-random-id'), false);
  assert.equal(isTextModel('openai', 'babbage-002'), false); // no gpt/o3/o4 hint
});

/* ── pickLatestFromList: timestamp ordering (OpenAI / Anthropic) ──────────── */

test('OpenAI: picks the newest text model by `created`, ignoring image/tts/embeddings', () => {
  const list = [
    { id: 'gpt-4o', created: 1715000000 },
    { id: 'gpt-image-1', created: 1760000000 },          // newest but image → excluded
    { id: 'gpt-5.5', created: 1745000000 },              // newest TEXT
    { id: 'text-embedding-3-large', created: 1759000000 },
    { id: 'whisper-1', created: 1700000000 },
  ];
  assert.equal(pickLatestFromList('openai', list), 'gpt-5.5');
});

test('Anthropic: picks the newest text model by ISO `created_at`', () => {
  const list = [
    { id: 'claude-opus-4-6', created_at: '2025-05-14T00:00:00Z' },
    { id: 'claude-sonnet-4-6', created_at: '2025-09-29T00:00:00Z' },
    { id: 'claude-opus-4-8', created_at: '2026-04-01T00:00:00Z' }, // newest
    { id: 'claude-haiku-4-5', created_at: '2025-10-01T00:00:00Z' },
  ];
  assert.equal(pickLatestFromList('anthropic', list), 'claude-opus-4-8');
});

/* ── pickLatestFromList: alias fast-path + version ordering (Google) ──────── */

test('Google: prefers the stable -latest alias when present in the list', () => {
  const list = [
    { name: 'models/gemini-3.5-flash' },
    { name: 'models/gemini-flash-latest' },  // alias → wins even though no timestamp
    { name: 'models/gemini-2.0-flash' },
  ];
  assert.equal(pickLatestFromList('google', list), 'gemini-flash-latest');
});

test('Google: with no alias present, picks the highest version number', () => {
  const list = [
    { name: 'models/gemini-2.0-flash' },
    { name: 'models/gemini-3.5-flash' }, // highest
    { name: 'models/gemini-2.5-flash' },
    { name: 'models/imagen-3.0-generate-002' }, // excluded
  ];
  assert.equal(pickLatestFromList('google', list), 'gemini-3.5-flash');
});

/* ── pickLatestFromList: graceful degradation ────────────────────────────── */

test('empty / non-array / all-excluded lists yield "" (caller then falls back)', () => {
  assert.equal(pickLatestFromList('openai', []), '');
  assert.equal(pickLatestFromList('openai', null), '');
  assert.equal(pickLatestFromList('openai', undefined), '');
  assert.equal(pickLatestFromList('google', [{ name: 'models/imagen-3.0' }, { name: 'models/embedding-001' }]), '');
});

test('pickLatestFromList never throws on malformed entries', () => {
  const junk = [null, 42, 'nope', {}, { id: null }, { id: 'gpt-5.5', created: 1745000000 }];
  assert.equal(pickLatestFromList('openai', junk), 'gpt-5.5');
});

test('ties on timestamp break toward the cleaner (shorter) id', () => {
  const list = [
    { id: 'gpt-5.5-2026-04-23', created: 1745000000 },
    { id: 'gpt-5.5', created: 1745000000 }, // same timestamp, shorter → preferred
  ];
  assert.equal(pickLatestFromList('openai', list), 'gpt-5.5');
});

/* ── latestModelOffline ──────────────────────────────────────────────────── */

test('latestModelOffline returns the stable alias for google, SAFE_DEFAULT otherwise', () => {
  assert.equal(latestModelOffline('google'), 'gemini-flash-latest');
  assert.equal(latestModelOffline('anthropic'), 'claude-opus-4-8');
  assert.equal(latestModelOffline('openai'), 'gpt-4o');
  assert.equal(latestModelOffline('ollama'), '');
});

test('latestModelOffline trims and handles unknown/nullish providers', () => {
  assert.equal(latestModelOffline('  google  '), 'gemini-flash-latest');
  assert.equal(latestModelOffline('nope'), '');
  assert.equal(latestModelOffline(''), '');
  assert.equal(latestModelOffline(undefined), '');
  assert.equal(latestModelOffline(null), '');
});

test('alias map: only google maintains a stable -latest text alias', () => {
  assert.deepEqual(Object.keys(LATEST_ALIAS), ['google']);
});

test('SAFE_DEFAULT covers exactly the four providers', () => {
  assert.deepEqual(Object.keys(SAFE_DEFAULT).sort(), ['anthropic', 'google', 'ollama', 'openai']);
});
