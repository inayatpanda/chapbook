// Unit tests for the dictation core (core/stt.js): provider selection (the
// cloud engine must NEVER be silently selected), the mic-button state machine,
// transcript insertion, and download-progress aggregation.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  STT_PROVIDERS, STT_ENGINE_KEY, STT_MAX_RECORD_MS, STT_STATES,
  resolveSttProvider, sttNext, appendDictation, preloadPct, mergeProgress,
} from './stt.js';

/* ── provider metadata ── */

test('STT_PROVIDERS: both providers carry id/label/disclosure', () => {
  for (const id of ['whisper', 'webspeech']) {
    const p = STT_PROVIDERS[id];
    assert.equal(p.id, id);
    assert.ok(p.label.length > 0);
    assert.ok(p.disclosure.length > 0);
  }
});

test('STT_PROVIDERS: whisper discloses on-device privacy; webspeech discloses the cloud', () => {
  assert.equal(STT_PROVIDERS.whisper.label, 'Private transcription');
  assert.equal(STT_PROVIDERS.webspeech.label, 'Live dictation');
  assert.match(STT_PROVIDERS.whisper.disclosure, /on this device|never leaves/i);
  assert.match(STT_PROVIDERS.webspeech.disclosure, /cloud/i);
});

test('constants: storage key and the 5-minute recording cap', () => {
  assert.equal(STT_ENGINE_KEY, 'chapbook.stt.engine');
  assert.equal(STT_MAX_RECORD_MS, 5 * 60 * 1000);
});

/* ── provider selection ── */

test('resolveSttProvider: whisper is the default when available', () => {
  assert.equal(resolveSttProvider(null, { whisper: true, webspeech: true }), 'whisper');
  assert.equal(resolveSttProvider(undefined, { whisper: true, webspeech: false }), 'whisper');
  assert.equal(resolveSttProvider('whisper', { whisper: true, webspeech: true }), 'whisper');
});

test('resolveSttProvider: webspeech ONLY on explicit opt-in and availability', () => {
  assert.equal(resolveSttProvider('webspeech', { whisper: true, webspeech: true }), 'webspeech');
  assert.equal(resolveSttProvider('webspeech', { whisper: false, webspeech: true }), 'webspeech');
  // opted in but the engine is gone → fall back to the private default
  assert.equal(resolveSttProvider('webspeech', { whisper: true, webspeech: false }), 'whisper');
});

test('resolveSttProvider: never silently selects the cloud engine', () => {
  // whisper unavailable + NO opt-in → no engine, even though webspeech exists
  assert.equal(resolveSttProvider(null, { whisper: false, webspeech: true }), null);
  assert.equal(resolveSttProvider('whisper', { whisper: false, webspeech: true }), null);
});

test('resolveSttProvider: garbage input degrades safely', () => {
  assert.equal(resolveSttProvider('yodel', { whisper: true, webspeech: true }), 'whisper');
  assert.equal(resolveSttProvider(null, null), null);
  assert.equal(resolveSttProvider('webspeech', {}), null);
});

/* ── state machine ── */

test('sttNext: the happy path — idle → preparing → recording → transcribing → idle', () => {
  assert.equal(sttNext('idle', 'prepare'), 'preparing');
  assert.equal(sttNext('preparing', 'ready'), 'recording');
  assert.equal(sttNext('recording', 'stop'), 'transcribing');
  assert.equal(sttNext('transcribing', 'done'), 'idle');
});

test('sttNext: prepared runs skip straight to recording', () => {
  assert.equal(sttNext('idle', 'record'), 'recording');
});

test('sttNext: cancel paths return to idle from every live state', () => {
  assert.equal(sttNext('preparing', 'cancel'), 'idle');
  assert.equal(sttNext('recording', 'cancel'), 'idle');
  assert.equal(sttNext('transcribing', 'cancel'), 'idle');
});

test('sttNext: failures sink to error, which only resets to idle', () => {
  assert.equal(sttNext('preparing', 'fail'), 'error');
  assert.equal(sttNext('recording', 'fail'), 'error');
  assert.equal(sttNext('transcribing', 'fail'), 'error');
  assert.equal(sttNext('error', 'reset'), 'idle');
  assert.equal(sttNext('error', 'record'), null);
});

test('sttNext: invalid transitions return null (caller keeps its state)', () => {
  assert.equal(sttNext('idle', 'stop'), null);            // nothing to stop
  assert.equal(sttNext('transcribing', 'record'), null);  // taps ignored mid-transcribe
  assert.equal(sttNext('recording', 'record'), null);     // already recording
  assert.equal(sttNext('preparing', 'prepare'), null);
  assert.equal(sttNext('nonsense', 'record'), null);      // unknown state
  assert.equal(sttNext('idle', undefined), null);
});

test('STT_STATES: exactly the five documented states', () => {
  assert.deepEqual([...STT_STATES].sort(),
    ['error', 'idle', 'preparing', 'recording', 'transcribing']);
});

/* ── transcript insertion ── */

test('appendDictation: one clean boundary space, no doubling', () => {
  assert.equal(appendDictation('', 'Hello there.'), 'Hello there.');
  assert.equal(appendDictation('Draft one.', 'And two.'), 'Draft one. And two.');
  assert.equal(appendDictation('Trailing space ', 'kept single.'), 'Trailing space kept single.');
  assert.equal(appendDictation('Line\n', 'after newline'), 'Line\nafter newline');
});

test('appendDictation: empty/whitespace transcripts leave the input untouched', () => {
  assert.equal(appendDictation('Keep me.', ''), 'Keep me.');
  assert.equal(appendDictation('Keep me.', '   '), 'Keep me.');
  assert.equal(appendDictation('Keep me.', null), 'Keep me.');
});

test('appendDictation: transcript whitespace is trimmed before insertion', () => {
  assert.equal(appendDictation('Base.', '  padded  '), 'Base. padded');
  assert.equal(appendDictation(null, ' solo '), 'solo');
});

/* ── download-progress aggregation ── */

test('preloadPct: aggregates loaded/total across files, clamped 0-100', () => {
  assert.equal(preloadPct([]), 0);
  assert.equal(preloadPct([{ loaded: 50, total: 100 }]), 50);
  assert.equal(preloadPct([{ loaded: 100, total: 100 }, { loaded: 0, total: 100 }]), 50);
  assert.equal(preloadPct([{ loaded: 300, total: 100 }]), 100); // over-report clamps
});

test('preloadPct: unknown totals contribute nothing (no divide-by-zero)', () => {
  assert.equal(preloadPct([{ loaded: 10, total: 0 }]), 0);
  assert.equal(preloadPct([{ loaded: 10 }, null]), 0);
  assert.equal(preloadPct([{ loaded: 5, total: 10 }, { loaded: 0, total: 0 }]), 50);
});

test('mergeProgress: the initiate → progress → done lifecycle', () => {
  let f = mergeProgress(undefined, { status: 'initiate' });
  assert.deepEqual(f, { loaded: 0, total: 0 });
  f = mergeProgress(f, { status: 'progress', loaded: 40, total: 100 });
  assert.deepEqual(f, { loaded: 40, total: 100 });
  // 'done' carries NO byte counts — it must COMPLETE the file, never zero it
  f = mergeProgress(f, { status: 'done' });
  assert.deepEqual(f, { loaded: 100, total: 100 });
});

test('mergeProgress: monotonic — a late out-of-order tick cannot regress', () => {
  const f = mergeProgress({ loaded: 80, total: 100 }, { status: 'progress', loaded: 60, total: 100 });
  assert.deepEqual(f, { loaded: 80, total: 100 });
});

test('mergeProgress: done with never-known total falls back to bytes seen', () => {
  assert.deepEqual(mergeProgress({ loaded: 55, total: 0 }, { status: 'done' }), { loaded: 55, total: 55 });
  assert.deepEqual(mergeProgress(null, { status: 'done' }), { loaded: 0, total: 0 });
});
