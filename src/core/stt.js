// STT (dictation) core — the PURE logic behind the Studio's mic button.
// Unit-tested here; consumed by src/stt.src.js (the browser engine module) and by
// index.html's chatInitMic. No DOM, no workers, no model code in this file.
//
// Provider contract (implemented in stt.src.js / index.html):
//   { id, label, disclosure, isAvailable(), preload({onProgress}),
//     transcribe(audioBlob|Float32Array, {onProgress}) -> Promise<text> }
// The webspeech provider is a LIVE engine (continuous recognition painting into the
// input), so it carries kind:'live' and start/stop instead of transcribe — that is
// the one deliberate extension to the batch contract.

// Provider metadata — the single source for labels + privacy disclosure copy.
// whisper is the DEFAULT: fully on-device, nothing leaves the browser.
// webspeech is opt-in ONLY (never silently selected): the browser's native engine
// may route audio to a cloud speech service, so its disclosure says so plainly.
export const STT_PROVIDERS = {
  whisper: {
    id: 'whisper',
    label: 'On-device dictation (private)',
    disclosure: 'Speech is transcribed on this device by a local Whisper model. Audio never leaves your browser.',
  },
  webspeech: {
    id: 'webspeech',
    label: 'Browser dictation (cloud)',
    disclosure: 'Uses your browser’s speech service — audio may be sent to the cloud (Chrome routes it to Google).',
  },
};

// localStorage key holding the user's explicit engine choice ('whisper'|'webspeech').
export const STT_ENGINE_KEY = 'chapbook.stt.engine';

// Recording cap: the whole clip is decoded in memory before transcription, so the
// post-stop wait and memory grow with length — auto-stop at five minutes (agreed v1).
export const STT_MAX_RECORD_MS = 5 * 60 * 1000;

// Pick the engine for this tap. stored = the persisted opt-in (or null),
// avail = { whisper: bool, webspeech: bool }.
// Rules (round-2 agreement): whisper is the default whenever it is available;
// webspeech runs ONLY on explicit opt-in AND availability; if whisper is
// unavailable and the user has not opted into the cloud engine, there is NO
// engine (null) — the cloud path is never silently selected.
export function resolveSttProvider(stored, avail) {
  const a = avail || {};
  if (stored === 'webspeech' && a.webspeech) return 'webspeech';
  if (a.whisper) return 'whisper';
  return null;
}

// ── mic-button state machine (whisper record-then-transcribe path) ──
// idle → preparing(one-time model download) → recording → transcribing → idle,
// with error as the failure sink (toast + reset). Invalid transitions return
// null so callers keep their current state (e.g. taps while transcribing).
const STT_TRANSITIONS = {
  idle: { prepare: 'preparing', record: 'recording' },
  preparing: { ready: 'recording', fail: 'error', cancel: 'idle' },
  recording: { stop: 'transcribing', cancel: 'idle', fail: 'error' },
  transcribing: { done: 'idle', fail: 'error', cancel: 'idle' },
  error: { reset: 'idle' },
};
export const STT_STATES = Object.keys(STT_TRANSITIONS);
export function sttNext(state, event) {
  const row = STT_TRANSITIONS[state];
  return (row && row[event]) || null;
}

// Insert a finished transcript after whatever is in the input NOW (reading the
// live value — not a stale snapshot — is what makes concurrent typing safe on
// the whisper path: there are no interim paints, only this one append).
export function appendDictation(existing, text) {
  const base = String(existing == null ? '' : existing);
  const t = String(text == null ? '' : text).trim();
  if (!t) return base;
  if (!base) return t;
  return base + (/\s$/.test(base) ? '' : ' ') + t;
}

// Aggregate per-file model-download progress into one 0-100 number.
// files: iterable of { loaded, total } (bytes). Unknown totals contribute 0.
export function preloadPct(files) {
  let loaded = 0, total = 0;
  for (const f of files) {
    loaded += (f && f.loaded) || 0;
    total += (f && f.total) || 0;
  }
  if (!total) return 0;
  return Math.max(0, Math.min(100, Math.round((loaded / total) * 100)));
}
