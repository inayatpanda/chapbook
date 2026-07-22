// Pinned STT asset manifest — the EXACT files the on-device dictation engine runs on.
// Pure data + helpers (imported by scripts/stage-stt.mjs and the unit tests, like
// sw-cache-name.mjs). Every entry pins size AND sha-256, so a build fails LOUD on
// any upstream drift — a re-published model file, a mutated tarball, a truncated
// download. All values were captured from the spike-verified working set
// (scratchpad/whisper-en-spike — the GATE re-spike that proved this recipe).
//
// Runtime layout (all same-origin, gitignored via dist/, staged per deploy):
//   dist/app/vendor/stt/transformers.min.js            ← @huggingface/transformers 4.2.0
//   dist/app/vendor/stt/ort-wasm-simd-threaded.asyncify.{mjs,wasm}
//                                                      ← onnxruntime-web (transformers' pin)
//   dist/app/models/<model id>/{5 json + onnx/2 q8 onnx}

// npm-sourced runtime. transformers.min.js is the plain browser ESM build
// (NOT transformers.web.min.js); the ort asyncify pair is the single-threaded
// WASM backend transformers 4.2.0 requests when numThreads=1 (spike-verified:
// nothing else is fetched at runtime).
export const STT_TRANSFORMERS_VERSION = '4.2.0';
export const STT_ORT_WEB_VERSION = '1.26.0-dev.20260416-b7804b056c';

export const STT_VENDOR_FILES = [
  {
    file: 'transformers.min.js',
    pkg: '@huggingface/transformers', version: STT_TRANSFORMERS_VERSION, tarPath: 'package/dist/transformers.min.js',
    size: 558373, sha256: 'e74bd32ed4453369ebb0edcaa27f6bc6204004a949a0233cdb87b62dda8d6978',
  },
  {
    file: 'ort-wasm-simd-threaded.asyncify.mjs',
    pkg: 'onnxruntime-web', version: STT_ORT_WEB_VERSION, tarPath: 'package/dist/ort-wasm-simd-threaded.asyncify.mjs',
    size: 47389, sha256: '5959c6733039619c9af710d8e1bae8d6e84402787990637be987c2b1bd6c5fa9',
  },
  {
    file: 'ort-wasm-simd-threaded.asyncify.wasm',
    pkg: 'onnxruntime-web', version: STT_ORT_WEB_VERSION, tarPath: 'package/dist/ort-wasm-simd-threaded.asyncify.wasm',
    size: 23567050, sha256: 'e0c0c6d3e73d43b8a249972f8358f845b08cc16fec3c80efafdf8bed40366786',
  },
];

// The 7 files whisper-tiny.en q8 actually requests (spike request-log-verified:
// no vocab.json / normalizer / added_tokens). dtype:'q8' maps to *_quantized.onnx.
export const STT_MODEL_FILE_NAMES = [
  'config.json',
  'generation_config.json',
  'preprocessor_config.json',
  'tokenizer.json',
  'tokenizer_config.json',
  'onnx/encoder_model_quantized.onnx',
  'onnx/decoder_model_merged_quantized.onnx',
];

// PRIMARY: onnx-community export (better English accuracy + punctuation in the gate
// re-spike). FALLBACK: Xenova export, verified behaviourally identical — staged only
// via CHAPBOOK_STT_MODEL=xenova (the worker tries primary then fallback at runtime).
export const STT_MODELS = {
  primary: {
    id: 'onnx-community/whisper-tiny.en',
    revision: '2575352d61be1bf7225cf8f8b268a4678025fc58',
    files: {
      'config.json': { size: 2197, sha256: '251ea843b5901a99efa58c0b99b8052c6019aa3e7d2baf46693a1128ff606233' },
      'generation_config.json': { size: 1646, sha256: '7b2e8451ed5f118e75fdd991409d72119d21d2fef1eba9723f68fb9c57fe5dc9' },
      'preprocessor_config.json': { size: 339, sha256: 'a6a76d28c93edb273669eb9e0b0636a2bddbb1272c3261e47b7ca6dfdbac1b8d' },
      'tokenizer.json': { size: 2405679, sha256: '5eb60cec1e77aeeb6869a2bb5a8e01a84c3fe5d072d75369343021fe6f5310d0' },
      'tokenizer_config.json': { size: 282662, sha256: '93879c3dccdd4b976f709acd85b44778873f30c275e67026f30ca1e4c975230c' },
      'onnx/encoder_model_quantized.onnx': { size: 10124993, sha256: 'e93ec822f16a8fd264e7de972ad17d615ea7334b75a52d54c50c2e18dd503a25' },
      'onnx/decoder_model_merged_quantized.onnx': { size: 30718858, sha256: 'c0592d0749413c960569e1c7fb806b060d5d18f3ebad4a95cbf9a77dc6e9be52' },
    },
  },
  xenova: {
    id: 'Xenova/whisper-tiny.en',
    revision: '79fb389fc764e7c395bd330e9531d9d32ada7049',
    files: {
      'config.json': { size: 2202, sha256: '37a1073be00d19118c06557896c7c148598f4d8277edc0f5bc07c9f5554839f1' },
      'generation_config.json': { size: 1590, sha256: '132c95ba9db45f4498f2eab3fea7c1d6a174005010f8f6b7d20cfd5e9795996b' },
      'preprocessor_config.json': { size: 339, sha256: 'a6a76d28c93edb273669eb9e0b0636a2bddbb1272c3261e47b7ca6dfdbac1b8d' },
      'tokenizer.json': { size: 2128494, sha256: 'c6ee8f089220a5b1188f6426456772572671c6141ae007eecb83c6a8349f5deb' },
      'tokenizer_config.json': { size: 835, sha256: 'e082c1ad251541bf277967a703252cddd4bb37a71a43737e03d050c22ec08238' },
      'onnx/encoder_model_quantized.onnx': { size: 10124913, sha256: '8cc3c6f8563d1b3fbd2c5af9f64c2bed8b020bc593c402d1ef53b9f08fbf1b90' },
      'onnx/decoder_model_merged_quantized.onnx': { size: 30727382, sha256: 'dbb2e063b7fbc41d9803b9698f93ecb035c50cbb3fb87b56cb131e4a5eb99059' },
    },
  },
};

// Where each set lands inside dist/ (the app fetches these same-origin paths).
export const STT_VENDOR_DEST = 'dist/app/vendor/stt';
export const STT_MODELS_DEST = 'dist/app/models';
