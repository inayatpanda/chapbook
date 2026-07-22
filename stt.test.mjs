// Integration guards for the on-device dictation (Whisper STT) feature.
//
// The 65 MB runtime+model NEVER enters git — it is staged into dist/ per deploy by
// scripts/stage-stt.mjs from the pinned manifest in scripts/stt-files.mjs. These
// tests hold the whole seam together WITHOUT the big files: manifest integrity
// (exact file set, pinned revisions, well-formed hashes), the worker's spike-
// confirmed inference recipe, the build/deploy wiring, the CSP additions, and the
// service worker's cache rules. The unit suite must stay runnable offline.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  STT_TRANSFORMERS_VERSION, STT_ORT_WEB_VERSION,
  STT_VENDOR_FILES, STT_MODELS, STT_MODEL_FILE_NAMES,
  STT_VENDOR_DEST, STT_MODELS_DEST,
} from './scripts/stt-files.mjs';
import { readShellPaths } from './scripts/sw-cache-name.mjs';

const SHA_RE = /^[0-9a-f]{64}$/;

/* ── pinned manifest integrity ── */

test('stt-files: versions pinned exactly (transformers 4.2.0 + its ort pin)', () => {
  assert.equal(STT_TRANSFORMERS_VERSION, '4.2.0');
  assert.equal(STT_ORT_WEB_VERSION, '1.26.0-dev.20260416-b7804b056c');
});

test('stt-files: vendor set is exactly transformers.min.js + the ort asyncify pair', () => {
  assert.deepEqual(STT_VENDOR_FILES.map((f) => f.file), [
    'transformers.min.js',
    'ort-wasm-simd-threaded.asyncify.mjs',
    'ort-wasm-simd-threaded.asyncify.wasm',
  ]);
  for (const f of STT_VENDOR_FILES) {
    assert.match(f.sha256, SHA_RE, `${f.file} sha256 malformed`);
    assert.ok(Number.isInteger(f.size) && f.size > 0, `${f.file} size`);
    assert.ok(f.tarPath.startsWith('package/dist/'), `${f.file} tarPath`);
  }
  // the plain browser ESM build — NOT the .web.min.js variant (spike-confirmed)
  assert.ok(!STT_VENDOR_FILES.some((f) => f.file.includes('.web.')));
});

test('stt-files: both model exports pin revision + the exact 7-file set', () => {
  assert.equal(STT_MODELS.primary.id, 'onnx-community/whisper-tiny.en');
  assert.equal(STT_MODELS.primary.revision, '2575352d61be1bf7225cf8f8b268a4678025fc58');
  assert.equal(STT_MODELS.xenova.id, 'Xenova/whisper-tiny.en');
  assert.equal(STT_MODELS.xenova.revision, '79fb389fc764e7c395bd330e9531d9d32ada7049');
  for (const model of Object.values(STT_MODELS)) {
    assert.deepEqual(Object.keys(model.files).sort(), [...STT_MODEL_FILE_NAMES].sort(),
      `${model.id}: staged files must be exactly the spike-verified request set`);
    for (const [name, pin] of Object.entries(model.files)) {
      assert.match(pin.sha256, SHA_RE, `${model.id}/${name} sha256 malformed`);
      assert.ok(Number.isInteger(pin.size) && pin.size > 0, `${model.id}/${name} size`);
    }
  }
  // q8 dtype maps to the *_quantized.onnx exports — both must be present
  assert.ok(STT_MODEL_FILE_NAMES.includes('onnx/encoder_model_quantized.onnx'));
  assert.ok(STT_MODEL_FILE_NAMES.includes('onnx/decoder_model_merged_quantized.onnx'));
});

test('stt-files: totals are in the known ~65 MB envelope (catches a fat-finger pin)', () => {
  const vendor = STT_VENDOR_FILES.reduce((n, f) => n + f.size, 0);
  const model = Object.values(STT_MODELS.primary.files).reduce((n, f) => n + f.size, 0);
  assert.ok(vendor > 20e6 && vendor < 30e6, `vendor total ${vendor}`);
  assert.ok(model > 40e6 && model < 50e6, `model total ${model}`);
});

test('stt-files: staging destinations live under gitignored dist/', () => {
  assert.equal(STT_VENDOR_DEST, 'dist/app/vendor/stt');
  assert.equal(STT_MODELS_DEST, 'dist/app/models');
  const gitignore = readFileSync('.gitignore', 'utf8');
  assert.match(gitignore, /^dist\/$/m, 'dist/ must be gitignored');
  assert.match(gitignore, /^src\/stt\.js$/m, 'generated src/stt.js must be gitignored');
  assert.match(gitignore, /^src\/stt-worker\.js$/m, 'generated src/stt-worker.js must be gitignored');
});

/* ── the worker carries the spike-confirmed recipe, verbatim ── */

const worker = readFileSync('src/stt-worker.src.js', 'utf8');

test('stt-worker: same-origin only — no remote models, staged local paths', () => {
  assert.match(worker, /env\.allowRemoteModels = false/);
  assert.match(worker, /'\/app\/models\/'/);
  assert.match(worker, /'\/app\/vendor\/stt\/'/);
  assert.match(worker, /import\([\s\S]{0,80}'\/app\/vendor\/stt\/transformers\.min\.js'/,
    'transformers must be dynamically imported from the staged path, never bundled');
  assert.match(worker, /numThreads = 1/, 'single-threaded — no COOP/COEP requirement');
});

test('stt-worker: model ids match the staged manifest (primary + fallback)', () => {
  assert.ok(worker.includes(`'${STT_MODELS.primary.id}'`));
  assert.ok(worker.includes(`'${STT_MODELS.xenova.id}'`));
});

test('stt-worker: the two REQUIRED inference settings are present', () => {
  // default optimization level crashes the q8 decoder (spike: TransposeDQWeights…)
  assert.match(worker, /graphOptimizationLevel: 'basic'/);
  // without return_timestamps the chunk merge deterministically drops mid-clip text
  assert.match(worker, /chunk_length_s: 30, stride_length_s: 5, return_timestamps: true/);
  assert.match(worker, /dtype: 'q8'/);
  assert.match(worker, /device: 'wasm'/);
});

/* ── build + deploy wiring ── */

test('build.mjs: bundles both stt entry points and ships them to dist root', () => {
  const build = readFileSync('build.mjs', 'utf8');
  assert.match(build, /entryPoints: \['src\/stt\.src\.js'\]/);
  assert.match(build, /entryPoints: \['src\/stt-worker\.src\.js'\]/);
  assert.match(build, /external: \['\/app\/vendor\/stt\/\*'\]/,
    'the staged transformers import must stay external to the worker bundle');
  assert.match(build, /'stt\.js', 'stt-worker\.js'/, 'both bundles must be copied to dist/');
});

test('package.json: stage-stt wired into both deploys + runnable standalone', () => {
  const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
  assert.equal(pkg.scripts['stage:stt'], 'node scripts/stage-stt.mjs');
  for (const s of ['deploy:draft', 'deploy:prod']) {
    assert.ok(pkg.scripts[s].includes('node scripts/stage-stt.mjs'),
      `${s} must stage the STT assets after build`);
    assert.ok(pkg.scripts[s].indexOf('stage-stt') < pkg.scripts[s].indexOf('netlify deploy'),
      `${s} must stage BEFORE deploying`);
  }
});

test('index.html: the inline module loads the engine from /stt.js', () => {
  const html = readFileSync('src/index.html', 'utf8');
  assert.match(html, /from '\/stt\.js'/);
  assert.match(html, /id="chatMic"[^>]*aria-label="Dictate"/, 'mic keeps its a11y label');
});

/* ── CSP: wasm-unsafe-eval added, nothing else loosened ── */

test('netlify.toml: script-src gains exactly wasm-unsafe-eval', () => {
  const toml = readFileSync('netlify.toml', 'utf8');
  assert.match(toml, /script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval'/);
  assert.ok(!toml.includes("'unsafe-eval'"), 'plain unsafe-eval must never appear');
});

test('tauri.conf.json: desktop CSP gains wasm-unsafe-eval too', () => {
  const conf = JSON.parse(readFileSync('desktop/src-tauri/tauri.conf.json', 'utf8'));
  const csp = conf.app.security.csp;
  assert.ok(csp.includes("'wasm-unsafe-eval'"), 'desktop script-src needs wasm-unsafe-eval');
  assert.ok(!csp.includes(" 'unsafe-eval'"), 'plain unsafe-eval must never appear');
});

/* ── service worker: runtime cache-first for STT, shell precache untouched ── */

const sw = readFileSync('src/sw.js', 'utf8');

test('sw.js: STT assets are NOT precached (SHELL stays lean)', () => {
  const shell = readShellPaths(sw);
  assert.ok(!shell.some((p) => p.startsWith('/app/vendor/stt') || p.startsWith('/app/models')),
    'the 65 MB STT set must never enter the SHELL precache');
});

test('sw.js: cache-first runtime rule covers both staged prefixes', () => {
  assert.match(sw, /STT_PREFIXES = \['\/app\/vendor\/stt\/', '\/app\/models\/'\]/);
  assert.match(sw, /caches\.open\(STT_CACHE\)/);
});

test('sw.js: activate keeps the STT cache across shell updates', () => {
  assert.match(sw, /k !== CACHE && k !== STT_CACHE/,
    'the activate sweep must exempt the STT cache or every app update re-downloads the model');
});

test('sw.js: cache-name stamping still targets the shell CACHE, not STT_CACHE', () => {
  // withCacheName replaces the FIRST `const CACHE = '…'`; STT_CACHE must survive it.
  const stamped = sw.replace(/const CACHE = '[^']+'/, "const CACHE = 'chapbook-12345678'");
  assert.ok(stamped.includes("const STT_CACHE = 'chapbook-stt-v1'"));
  assert.ok(stamped.includes("const CACHE = 'chapbook-12345678'"));
});
