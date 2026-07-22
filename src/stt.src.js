// Chapbook dictation engine — main-thread side of the on-device Whisper STT.
//
// esbuild-bundled → /stt.js (mirrors darkroom-upload.src.js; loaded directly by
// index.html's inline module, NOT part of studio.js). The pure logic
// (provider selection, state machine, text append) is bundled in from
// core/stt.js (unit-tested there); the heavy work runs in /stt-worker.js.
//
// Split of labour (agreed design):
//   main thread : getUserMedia + MediaRecorder (in index.html's chatInitMic),
//                 blob → 16 kHz mono Float32 decode (below — AudioContext/
//                 OfflineAudioContext are Window-only, so decode CANNOT live in
//                 the worker; rendering is off-main-thread internally anyway);
//   worker      : transformers.js pipeline init (one-time ~30 MB same-origin
//                 download, cached by the SW) + Whisper inference.
import {
  STT_PROVIDERS, STT_ENGINE_KEY, STT_MAX_RECORD_MS,
  resolveSttProvider, sttNext, appendDictation, preloadPct, mergeProgress,
} from './core/stt.js';

export {
  STT_PROVIDERS, STT_ENGINE_KEY, STT_MAX_RECORD_MS,
  resolveSttProvider, sttNext, appendDictation,
};

// Everything the whisper path needs, feature-detected. (No SpeechRecognition
// requirement — that is the webspeech provider's own concern.)
export function whisperSupported() {
  try {
    return !!(globalThis.Worker && globalThis.WebAssembly
      && globalThis.MediaRecorder
      && navigator.mediaDevices && navigator.mediaDevices.getUserMedia
      && globalThis.AudioContext && globalThis.OfflineAudioContext);
  } catch (_) { return false; }
}

// ── audio decode: recorded Blob (webm/opus, mp4/aac, wav…) → 16 kHz mono Float32 ──
// The spike-proven path: WebAudio decode + OfflineAudioContext resample/downmix.
// The manual WAV fallback keeps PCM16 wavs working where decodeAudioData balks.
function parseWav(buf) {
  const dv = new DataView(buf);
  let off = 12;
  while (off + 8 <= dv.byteLength) {
    const id = String.fromCharCode(dv.getUint8(off), dv.getUint8(off + 1), dv.getUint8(off + 2), dv.getUint8(off + 3));
    const size = dv.getUint32(off + 4, true);
    if (id === 'data') {
      const n = Math.floor(Math.min(size, dv.byteLength - off - 8) / 2);
      const out = new Float32Array(n);
      for (let i = 0; i < n; i++) out[i] = dv.getInt16(off + 8 + i * 2, true) / 32768;
      return out;
    }
    off += 8 + size + (size % 2);
  }
  throw new Error('no data chunk');
}

export async function decodeTo16kMono(arrayBuffer) {
  try {
    const probe = new AudioContext();
    const decoded = await probe.decodeAudioData(arrayBuffer.slice(0));
    await probe.close();
    const targetLen = Math.max(1, Math.ceil(decoded.duration * 16000));
    const off = new OfflineAudioContext(1, targetLen, 16000);
    const src = off.createBufferSource();
    src.buffer = decoded;
    src.connect(off.destination);
    src.start();
    const rendered = await off.startRendering();
    return rendered.getChannelData(0);
  } catch (_) {
    return parseWav(arrayBuffer); // PCM16 mono WAV (the format we control in tests)
  }
}

// ── whisper provider: { id, label, disclosure, isAvailable, preload, transcribe } ──
// One shared worker per provider instance; the model pipeline is cached inside the
// worker after the first build, so preload-once → transcribe-many is cheap.
export function createWhisperProvider() {
  let worker = null;
  let seq = 0;
  let epoch = 0;             // bumped by cancel(); guards the pre-worker decode phase
  const pending = new Map(); // id → { resolve, reject, onProgress, files }

  const failAll = (message) => {
    for (const p of pending.values()) p.reject(new Error(message));
    pending.clear();
  };

  const ensureWorker = () => {
    if (worker) return worker;
    worker = new Worker('/stt-worker.js', { type: 'module' });
    worker.onmessage = (ev) => {
      const { id, type } = ev.data || {};
      const p = pending.get(id);
      if (!p) return;
      if (type === 'progress') {
        // Aggregate per-file byte counts into one percentage for the UI.
        p.files.set(ev.data.file, mergeProgress(p.files.get(ev.data.file), ev.data));
        if (p.onProgress) p.onProgress({ pct: preloadPct(p.files.values()), file: ev.data.file, status: ev.data.status });
        return;
      }
      pending.delete(id);
      if (type === 'error') p.reject(new Error(ev.data.message || 'Transcription failed.'));
      else p.resolve(ev.data);
    };
    worker.onerror = () => {
      // Worker script failed to load or crashed — reject everything with a friendly
      // reason and let the next call spawn a fresh worker.
      failAll('The dictation engine failed to start. Reload the app and try again.');
      try { worker.terminate(); } catch (_) { /* already gone */ }
      worker = null;
    };
    return worker;
  };

  const call = (msg, transfer, onProgress) => new Promise((resolve, reject) => {
    const id = ++seq;
    pending.set(id, { resolve, reject, onProgress, files: new Map() });
    ensureWorker().postMessage({ id, ...msg }, transfer || []);
  });

  return {
    id: STT_PROVIDERS.whisper.id,
    label: STT_PROVIDERS.whisper.label,
    disclosure: STT_PROVIDERS.whisper.disclosure,
    isAvailable: whisperSupported,
    // Download + build the pipeline (one-time ~30 MB, then SW-cached).
    // onProgress({ pct, file, status }) ticks through the model files.
    preload({ onProgress } = {}) {
      return call({ type: 'preload' }, [], onProgress).then(() => undefined);
    },
    // Blob (recorded audio) or ready Float32Array (16 kHz mono) → final text.
    async transcribe(input, { onProgress } = {}) {
      // Capture the cancel epoch SYNCHRONOUSLY, before the first await. The Blob
      // decode below runs on the main thread BEFORE any worker request is placed
      // in `pending`, so a cancel() landing mid-decode has nothing to reject —
      // without this guard the decode would finish and spawn a fresh worker/asr()
      // AFTER the cancel, risking a second concurrent asr() once a new dictation
      // starts. Re-checking the epoch after decode makes the cancel a hard stop.
      const myEpoch = epoch;
      let audio = input;
      if (typeof Blob !== 'undefined' && input instanceof Blob) {
        audio = await decodeTo16kMono(await input.arrayBuffer());
      }
      if (myEpoch !== epoch) throw new Error('Dictation was cancelled.');
      if (!(audio instanceof Float32Array)) throw new Error('transcribe: expected a Blob or Float32Array');
      const r = await call({ type: 'transcribe', audio }, [audio.buffer], onProgress);
      return r.text || '';
    },
    // Hard cancel: reject everything pending AND terminate the worker. postMessage
    // can't interrupt an in-flight asr() — only termination can — and leaving it
    // running risks a SECOND concurrent asr() on the same pipeline when the user
    // starts again (ONNX session reentrancy is unproven). The next preload/
    // transcribe spawns a fresh worker; the model reloads from the SW cache.
    // Bumping `epoch` also aborts any transcribe still in its pre-worker decode
    // phase (see transcribe()), so decode can't spawn a worker after this returns.
    cancel() {
      epoch++;
      failAll('Dictation was cancelled.');
      if (worker) {
        try { worker.terminate(); } catch (_) { /* already gone */ }
        worker = null;
      }
    },
  };
}
