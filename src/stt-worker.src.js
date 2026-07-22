// Whisper STT worker — model init + inference OFF the UI thread.
//
// esbuild-bundled → /stt-worker.js (see build.mjs), spawned as a MODULE worker by
// /stt.js. The heavy runtime (transformers.js 4.2.0 + its ONNX WASM backend) is
// NOT bundled: it is staged same-origin into /app/vendor/stt/ by
// scripts/stage-stt.mjs and dynamically imported here on first use, so the app
// bundles stay small and nothing 65 MB ever enters git.
//
// The recipe below is the SPIKE-CONFIRMED one (scratchpad/whisper-en-spike):
//   • model onnx-community/whisper-tiny.en, dtype q8, device wasm, 1 thread;
//   • session_options.graphOptimizationLevel:'basic' is REQUIRED — the default
//     level crashes the q8 decoder ("TransposeDQWeightsForMatMulNBits Missing
//     required scale");
//   • long-form calls MUST pass return_timestamps:true — without it the chunk
//     merge deterministically DROPS mid-clip text (~13 s lost on a 50 s clip);
//   • env.allowRemoteModels=false + localModelPath → everything same-origin,
//     no hub fetch, no CDN, works under CSP script-src 'self' 'wasm-unsafe-eval'.
//
// Protocol (all messages carry the caller's id):
//   in : { id, type:'preload' }
//   in : { id, type:'transcribe', audio: Float32Array }  (16 kHz mono, transferred)
//   out: { id, type:'progress', file, loaded, total, status }   (model download)
//   out: { id, type:'ready' } | { id, type:'result', text } | { id, type:'error', message, detail }
//
// NOTE (deviation from the build brief, with reason): audio DECODE happens on the
// main thread, not here — AudioContext/OfflineAudioContext are Window-only APIs
// and do not exist in dedicated workers. Decode is async (and OfflineAudioContext
// renders off the main thread internally); the expensive part — inference — is
// what this worker isolates.

const STT_VENDOR_PATH = '/app/vendor/stt/';
const STT_MODEL_PATH = '/app/models/';
const STT_MODEL_PRIMARY = 'onnx-community/whisper-tiny.en';
const STT_MODEL_FALLBACK = 'Xenova/whisper-tiny.en';

let _asrLoading = null; // in-flight/settled pipeline init — cached after first build

// transformers 4.2.0 requests shared model files once per consumer with NO in-flight
// dedup (measured E2E: config.json 3×, each ~10-30 MB .onnx 2× → ~111 MB first-use
// instead of 67.7 MB; the SW's cache-first rule can't help because the duplicates are
// CONCURRENT misses). Dedupe same-origin STT fetches while the pipeline initialises;
// the map is cleared once init settles (the weights live in WASM memory after that,
// and a failed init must retry with real fetches).
const _inflight = new Map();
const _rawFetch = self.fetch.bind(self);
self.fetch = (input, init) => {
  const url = typeof input === 'string' ? input : (input && input.url) || '';
  if (!url.includes(STT_MODEL_PATH) && !url.includes(STT_VENDOR_PATH)) return _rawFetch(input, init);
  if (!_inflight.has(url)) _inflight.set(url, _rawFetch(input, init));
  return _inflight.get(url).then((r) => r.clone());
};

async function loadPipeline(post) {
  const { pipeline, env } = await import(/* staged, never bundled */ '/app/vendor/stt/transformers.min.js');

  // Self-hosting: every byte comes from this origin. No hub, no CDN.
  env.allowRemoteModels = false;
  env.allowLocalModels = true;
  env.localModelPath = STT_MODEL_PATH;
  // The service worker's cache-first rule for /app/vendor/stt/ + /app/models/ owns
  // caching — transformers' own Cache-API store would double-hold ~43 MB.
  env.useBrowserCache = false;
  env.backends.onnx.wasm.wasmPaths = STT_VENDOR_PATH;
  env.backends.onnx.wasm.numThreads = 1; // single-threaded: no COOP/COEP needed

  const opts = {
    dtype: 'q8',
    device: 'wasm',
    session_options: { graphOptimizationLevel: 'basic' }, // REQUIRED (see header)
    progress_callback: (p) => {
      if (p && p.file) post({ type: 'progress', status: p.status || '', file: p.file, loaded: p.loaded || 0, total: p.total || 0 });
    },
  };
  try {
    return await pipeline('automatic-speech-recognition', STT_MODEL_PRIMARY, opts);
  } catch (primaryErr) {
    // stage-stt.mjs can stage the pinned Xenova export instead (CHAPBOOK_STT_MODEL=xenova);
    // exactly one model set exists in a given deploy, so try the fallback path before
    // giving up — but surface the PRIMARY error if both are absent.
    try {
      return await pipeline('automatic-speech-recognition', STT_MODEL_FALLBACK, opts);
    } catch (_fallbackErr) {
      throw primaryErr;
    }
  }
}

function ensureAsr(post) {
  if (!_asrLoading) {
    _asrLoading = loadPipeline(post).then((asr) => {
      _inflight.clear(); // release the buffered responses — the model is in WASM memory now
      return asr;
    }).catch((e) => {
      _inflight.clear();
      _asrLoading = null; // a failed init must not poison every later attempt
      throw e;
    });
  }
  return _asrLoading;
}

// One friendly, actionable line for the UI; the raw message rides in `detail`.
function friendly(e) {
  const raw = String((e && e.message) || e || 'unknown error');
  if (/fetch|network|404|Failed to load|not found/i.test(raw)) {
    return 'The dictation model could not be loaded. Check your connection and try again.';
  }
  if (/memory|allocat/i.test(raw)) {
    return 'The device ran out of memory while transcribing. Try a shorter recording.';
  }
  return 'Transcription failed on this device. Try again.';
}

self.onmessage = async (ev) => {
  const { id, type, audio } = ev.data || {};
  const post = (m) => self.postMessage({ id, ...m });
  try {
    if (type === 'preload') {
      await ensureAsr(post);
      post({ type: 'ready' });
      return;
    }
    if (type === 'transcribe') {
      if (!(audio instanceof Float32Array)) throw new Error('transcribe: expected Float32Array audio');
      const asr = await ensureAsr(post);
      // Built-in long-form chunking (30 s windows, 5 s stride) + return_timestamps —
      // the exact spike-verified call; NO custom VAD/merge (round-2 agreement).
      const out = await asr(audio, { chunk_length_s: 30, stride_length_s: 5, return_timestamps: true });
      post({ type: 'result', text: (out && out.text ? String(out.text) : '').trim() });
      return;
    }
    post({ type: 'error', message: 'Unknown dictation request.', detail: `unknown message type: ${type}` });
  } catch (e) {
    post({ type: 'error', message: friendly(e), detail: String((e && e.message) || e) });
  }
};
