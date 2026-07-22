// Stage the on-device dictation (Whisper STT) assets into dist/ for deploy.
// Runs AFTER `npm run build` (which wipes dist/) — wired into deploy:draft /
// deploy:prod next to stage-installers.mjs, and runnable standalone for local
// dev:  npm run stage:stt   (then serve dist/ — the mic's whisper path needs it).
//
// WHY a stage script: the model + WASM runtime total ~65 MB — they must NEVER
// enter git (dist/ is gitignored; nothing here touches the tree). Everything is
// version-pinned in scripts/stt-files.mjs with per-file size + sha-256, so any
// upstream drift (re-published model file, mutated tarball, truncated download)
// fails the deploy LOUD instead of shipping a silently different model.
//
// Sources (build-time only — the runtime never leaves this origin):
//   • npm registry tarballs for transformers.min.js + the ort asyncify pair
//     (@huggingface/transformers 4.2.0 and its onnxruntime-web pin);
//   • huggingface.co resolve URLs AT THE PINNED REVISION for the model files.
//
// Env:
//   CHAPBOOK_STT_MODEL=xenova   stage the verified fallback export instead
//                               (the worker tries primary → fallback at runtime)
//   CHAPBOOK_STT_SRC=<dir>      offline source: a directory in the STAGED layout
//                               (vendor/stt/* + models/<id>/*), e.g. a previous
//                               dist/app — files are copied and STILL hash-checked.

import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync, readFileSync, rmSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { tmpdir } from 'node:os';
import { createHash } from 'node:crypto';
import {
  STT_VENDOR_FILES, STT_MODELS, STT_MODEL_FILE_NAMES,
  STT_VENDOR_DEST, STT_MODELS_DEST,
} from './stt-files.mjs';

const model = STT_MODELS[process.env.CHAPBOOK_STT_MODEL === 'xenova' ? 'xenova' : 'primary'];
const LOCAL_SRC = process.env.CHAPBOOK_STT_SRC || '';

const sha256 = (buf) => createHash('sha256').update(buf).digest('hex');

// Verify a staged buffer against its pin; a mismatch is always fatal.
function verify(name, buf, pin) {
  if (buf.length !== pin.size) {
    console.error(`stage-stt: ${name} size ${buf.length} != pinned ${pin.size} — upstream drift or truncated download. Refusing to stage.`);
    process.exit(1);
  }
  const h = sha256(buf);
  if (h !== pin.sha256) {
    console.error(`stage-stt: ${name} sha256 ${h} != pinned ${pin.sha256} — upstream drift. Refusing to stage.`);
    process.exit(1);
  }
}

function put(dest, buf) {
  mkdirSync(dirname(dest), { recursive: true });
  writeFileSync(dest, buf);
}

async function fetchBuf(url) {
  const res = await fetch(url, { redirect: 'follow' });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} for ${url}`);
  return Buffer.from(await res.arrayBuffer());
}

// One member out of an npm tarball (tar -xOzf streams it to stdout — no temp tree).
const tarballCache = new Map(); // pkg@version → tgz path in tmp
async function npmMember(pkg, version, tarPath) {
  const key = `${pkg}@${version}`;
  if (!tarballCache.has(key)) {
    const base = pkg.startsWith('@') ? pkg.split('/')[1] : pkg;
    const url = `https://registry.npmjs.org/${pkg}/-/${base}-${version}.tgz`;
    console.log(`stage-stt: fetching ${url}`);
    const tgz = await fetchBuf(url);
    const tmp = join(tmpdir(), `chapbook-stt-${base}-${version}.tgz`);
    writeFileSync(tmp, tgz);
    tarballCache.set(key, tmp);
  }
  return execFileSync('tar', ['-xOzf', tarballCache.get(key), tarPath],
    { maxBuffer: 256 * 1024 * 1024 });
}

async function stageVendor() {
  for (const f of STT_VENDOR_FILES) {
    const dest = join(STT_VENDOR_DEST, f.file);
    const buf = LOCAL_SRC
      ? readFileSync(join(LOCAL_SRC, 'vendor/stt', f.file))
      : Buffer.from(await npmMember(f.pkg, f.version, f.tarPath));
    verify(f.file, buf, f);
    put(dest, buf);
    console.log(`staged ${dest}  ${(buf.length / 1e6).toFixed(1)} MB  sha256 ${f.sha256.slice(0, 12)}…`);
  }
}

async function stageModel() {
  const base = `https://huggingface.co/${model.id}/resolve/${model.revision}`;
  for (const name of STT_MODEL_FILE_NAMES) {
    const pin = model.files[name];
    const dest = join(STT_MODELS_DEST, model.id, name);
    const buf = LOCAL_SRC
      ? readFileSync(join(LOCAL_SRC, 'models', model.id, name))
      : await fetchBuf(`${base}/${name}`);
    verify(`${model.id}/${name}`, buf, pin);
    put(dest, buf);
    console.log(`staged ${dest}  ${(buf.length / 1e6).toFixed(1)} MB  sha256 ${pin.sha256.slice(0, 12)}…`);
  }
}

if (!existsSync('dist')) {
  console.error('stage-stt: dist/ does not exist — run `npm run build` first.');
  process.exit(1);
}
// A previous stage may have put the OTHER model export here (dist/ survives between
// manual runs) — the worker probes primary-then-fallback, so stale extras must go.
rmSync(STT_MODELS_DEST, { recursive: true, force: true });

try {
  await stageVendor();
  await stageModel();
} catch (e) {
  console.error(`stage-stt: ${String(e && e.message || e)}`);
  console.error(LOCAL_SRC
    ? `stage-stt: local source ${LOCAL_SRC} is missing files — it must hold vendor/stt/* and models/${model.id}/* in the staged layout.`
    : 'stage-stt: download failed. Offline? Point CHAPBOOK_STT_SRC at a previously staged dist/app directory.');
  process.exit(1);
}

const total = STT_VENDOR_FILES.reduce((n, f) => n + f.size, 0)
  + STT_MODEL_FILE_NAMES.reduce((n, f) => n + model.files[f].size, 0);
console.log(`staged STT runtime + model '${model.id}' @ ${model.revision.slice(0, 8)} — ${(total / 1e6).toFixed(1)} MB total, every file sha-256 verified`);
