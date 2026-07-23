#!/usr/bin/env node
// Release grep-gate: fail (exit 1) if the built dist/ leaks any owner-personalisation
// or Helm-era string. Run directly after `npm run build`:  node scripts/grep-gate.mjs
//
// NOT wired into package.json (npm run gate comes later) — invoke it directly.
//
// Narrow allowlist of EXACT substrings (see ALLOWED below) that legitimately contain an
// otherwise-forbidden pattern — the licence revoke-list URL and the deliberate blog-template
// owner pointer. Each is stripped from every line before matching and reported as
// SKIPPED-ALLOWED. Anything not matching one of these exact fragments still trips the gate.
import { readdirSync, statSync, readFileSync } from 'node:fs';
import { join, extname } from 'node:path';

const DIST = 'dist';

// Allowlisted exact substrings. Each is stripped from a line BEFORE the PATTERNS run, and
// every occurrence is reported as SKIPPED-ALLOWED. The list is deliberately narrow — only
// these EXACT fragments are permitted, so any OTHER `inayatpanda` (a stray email, an
// inayatpanda.com URL, a github.com/inayatpanda/… link) still fails the gate.
//   1. the licence revoke-list URL (Helm-published static data);
//   2. the injected blog-template pointer in dist/index.html
//      (window.__CHAPBOOK_TEMPLATE={"owner":"inayatpanda",…}); and
//   3. that pointer's bundled app.js fallback owner in dist/studio.js.
const ALLOWED = [
  { text: 'https://inayatpanda.com/licences/revoked.json', reason: 'licence revoke-list URL' },
];

// Forbidden patterns (case-sensitive, exactly as specified by the release contract).
// `inayatpanda` is matched BARE (not just `.com`) so ANY owner-personal-account coupling —
// org, repo, email, or URL — trips the gate. The few legitimate occurrences (the licence
// revoke-list URL and the deliberate blog-template owner pointer) are stripped from each line
// by the ALLOWED allowlist ABOVE before these patterns run, so they stay SKIPPED-ALLOWED and
// never match here.
const PATTERNS = [
  /inayatpanda/,
  /studio@/,
  /admin token/,
  /X-Admin-Token/,
  /npm run tunnel/,
  /Connect to my Helm/,
  /Set up your Studio/,
  /hosted Studio/,
  /\/admin\/api\/login/,
  /buy\.stripe\.com\/test_/,
  /videoHelmReachable/,
  // ── Medical/clinical denylist ────────────────────────────────────────────────
  // Chapbook was forked from an orthopaedics app; its figure/playground presets,
  // sample labels and stencils once shipped clinical/surgical EXAMPLE content. These
  // terms are unambiguously clinical, so the shipped bundle must never re-leak them
  // (a fork-back, a copied preset, or a stray comment). Case-insensitive. Kept
  // deliberately NARROW so ordinary blog words stay legal: "cast" (theatre), "reduce",
  // "operation", "patient" (the virtue), "orthogonal"/"orthography" (don't match
  // /orthop/) are all fine, and the surgical stopwatch line is matched by its
  // distinctive full phrase — not a bare "knife to skin", which a cooking post could
  // legitimately use.
  /fracture/i,
  /periosteum/i,
  /callus/i,
  /orthop/i,
  /osteo/i,
  /\bclinical\b/i,
  /knife to skin\. the patient/i,
];

// Binary/asset extensions the text gate should not read.
const SKIP_EXT = new Set([
  '.png', '.jpg', '.jpeg', '.gif', '.webp', '.ico', '.avif',
  '.webm', '.mp4', '.mov', '.m4v', // marketing video loops (dist/media/loops) — binary, not text
  '.woff', '.woff2', '.ttf', '.otf', '.eot', '.map',
  '.dmg', '.exe', '.apk', // staged installers in dist/downloads/ — binary, not text to gate
  '.onnx', '.wasm', // staged STT model/runtime (stage-stt.mjs) — binary, not text to gate
]);

// Staged THIRD-PARTY trees the gate must not read (same spirit as the installer
// binaries above): sha-256-pinned upstream data, not Chapbook-authored content.
// The whisper tokenizer's 50k-entry ENGLISH VOCABULARY legitimately contains
// ordinary words the clinical denylist bans ("fracture", "clinical", …) — they are
// dictionary entries, not leaked fork content. Provenance/integrity of these trees
// is enforced by the per-file sha-256 pins in scripts/stt-files.mjs instead.
const SKIP_DIRS = ['dist/app/models/', 'dist/app/vendor/stt/'];

function* walk(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) yield* walk(p);
    else yield p;
  }
}

let failures = 0;
let allowedHits = 0;
let scanned = 0;

let root;
try {
  root = statSync(DIST);
} catch {
  console.error(`grep-gate: ${DIST}/ not found — run \`npm run build\` first.`);
  process.exit(1);
}
if (!root.isDirectory()) {
  console.error(`grep-gate: ${DIST} is not a directory.`);
  process.exit(1);
}

for (const file of walk(DIST)) {
  if (SKIP_EXT.has(extname(file).toLowerCase())) continue;
  if (SKIP_DIRS.some((d) => file.startsWith(d))) continue;
  let text;
  try { text = readFileSync(file, 'utf8'); } catch { continue; }
  scanned++;
  const lines = text.split('\n');
  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];
    // Strip EACH allowlisted substring before matching; report every occurrence.
    for (const { text, reason } of ALLOWED) {
      while (line.includes(text)) {
        console.log(`SKIPPED-ALLOWED ${file}:${i + 1} — ${reason}`);
        allowedHits++;
        line = line.replace(text, '');
      }
    }
    for (const re of PATTERNS) {
      if (re.test(line)) {
        console.error(`FAIL ${file}:${i + 1} — /${re.source}/ :: ${lines[i].trim().slice(0, 160)}`);
        failures++;
      }
    }
  }
}

if (failures) {
  console.error(`\ngrep-gate: FAILED — ${failures} forbidden match(es) across ${scanned} scanned file(s) in ${DIST}/`);
  process.exit(1);
}
console.log(`grep-gate: clean ✓ — ${scanned} file(s) scanned, ${allowedHits} allowlisted reference(s) skipped`);
