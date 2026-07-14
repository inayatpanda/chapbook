#!/usr/bin/env node
// Release grep-gate: fail (exit 1) if the built dist/ leaks any owner-personalisation
// or Helm-era string. Run directly after `npm run build`:  node scripts/grep-gate.mjs
//
// NOT wired into package.json (npm run gate comes later) — invoke it directly.
//
// One allowlisted exception: the licence revoke-list URL below. If it appears it is
// Helm-published static data and is permitted; it's stripped before matching and each
// occurrence is reported as SKIPPED-ALLOWED.
import { readdirSync, statSync, readFileSync } from 'node:fs';
import { join, extname } from 'node:path';

const DIST = 'dist';
const ALLOWED = 'https://inayatpanda.com/licences/revoked.json';

// Forbidden patterns (case-sensitive, exactly as specified by the release contract).
const PATTERNS = [
  /inayatpanda\.com/,
  /inayatpanda-site/,
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
];

// Binary/asset extensions the text gate should not read.
const SKIP_EXT = new Set([
  '.png', '.jpg', '.jpeg', '.gif', '.webp', '.ico', '.avif',
  '.woff', '.woff2', '.ttf', '.otf', '.eot', '.map',
]);

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
  let text;
  try { text = readFileSync(file, 'utf8'); } catch { continue; }
  scanned++;
  const lines = text.split('\n');
  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];
    // Strip the allowlisted revoke-list URL before matching; note each occurrence.
    if (line.includes(ALLOWED)) {
      console.log(`SKIPPED-ALLOWED ${file}:${i + 1} — licence revoke-list URL`);
      allowedHits++;
      line = line.split(ALLOWED).join('');
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
console.log(`grep-gate: clean ✓ — ${scanned} file(s) scanned, ${allowedHits} allowlisted revoke-URL reference(s) skipped`);
