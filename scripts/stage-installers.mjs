// Stage the desktop installers into dist/downloads/ for the /download page.
// Runs AFTER `npm run build` (which wipes dist/) and BEFORE `netlify deploy`
// — see the deploy:draft / deploy:prod scripts in package.json.
//
// Source of truth: the newest `desktop-v*` GitHub release on this repo (drafts
// included — CI publishes drafts; the notarized mac DMG is uploaded there too).
// Assets are fetched via `gh api` (works for draft releases, unlike plain
// `gh release download`), renamed to STABLE filenames the page links to, and
// described in downloads/manifest.json (version + size + sha-256) which the
// page fetches to render its fine print. Checksums live ONLY in the manifest —
// one source, no drift.
//
// Fails hard if either DESKTOP installer (mac/win) is missing: a deploy must
// never silently ship the download page with dead links. The Android APK is
// OPTIONAL — if a release lacks one, we warn and omit it (the page hides its
// Android section) rather than blocking the deploy, so every historical/future
// release stays deployable even without an APK.

import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync, statSync, readFileSync, openSync, closeSync } from 'node:fs';
import { createHash } from 'node:crypto';

const REPO = 'inayatpanda/chapbook';
const OUT = 'dist/downloads';

// Stable public names → matcher over the release's asset names.
// `optional` assets warn-and-skip when absent instead of hard-failing (see the
// per-asset loop below): the Android APK is a large (~100 MB) sideload artifact
// not every desktop-v* release carries, whereas a missing mac/win installer is
// always fatal.
const WANTED = [
  { file: 'Chapbook-macOS.dmg', match: (n) => n.endsWith('.dmg'), key: 'mac' },
  { file: 'Chapbook-Windows.exe', match: (n) => n.endsWith('.exe'), key: 'win' },
  { file: 'Chapbook-Android.apk', match: (n) => n.endsWith('.apk'), key: 'android', optional: true },
];

const gh = (args, opts = {}) => execFileSync('gh', args, { encoding: 'utf8', ...opts });

// Newest desktop-v* release, drafts included (created_at from the API, so this
// script stays clock-free and deterministic for a given release state).
const releases = JSON.parse(gh(['api', `repos/${REPO}/releases`]));
const rel = releases
  .filter((r) => r.tag_name?.startsWith('desktop-v'))
  .sort((a, b) => (a.created_at < b.created_at ? 1 : -1))[0];
if (!rel) {
  console.error('stage-installers: no desktop-v* release found on', REPO);
  process.exit(1);
}
const tag = process.env.CHAPBOOK_DESKTOP_TAG || rel.tag_name;
const release = tag === rel.tag_name ? rel : releases.find((r) => r.tag_name === tag);
if (!release) {
  console.error(`stage-installers: release ${tag} not found on`, REPO);
  process.exit(1);
}

mkdirSync(OUT, { recursive: true });
const files = {};
for (const w of WANTED) {
  const asset = release.assets.find((a) => w.match(a.name));
  if (!asset) {
    if (w.optional) {
      // Optional (Android APK): warn loudly and omit from the manifest — no
      // manifest.files[key], so the /download page hides its Android section.
      // The deploy proceeds; mac/win still guard against dead links below.
      console.warn(`stage-installers: ${tag} has no asset matching ${w.file} — omitting ${w.key} from the manifest (optional). The /download page will hide it.`);
      continue;
    }
    console.error(`stage-installers: ${tag} has no asset matching ${w.file} — refusing to deploy dead download links.`);
    process.exit(1);
  }
  // Draft-release assets need the API asset endpoint + octet-stream accept.
  const fd = openSync(`${OUT}/${w.file}`, 'w');
  try {
    gh(['api', `repos/${REPO}/releases/assets/${asset.id}`, '-H', 'Accept: application/octet-stream'],
       { stdio: ['ignore', fd, 'inherit'], maxBuffer: 1024 * 1024 * 256 });
  } finally { closeSync(fd); }
  const buf = readFileSync(`${OUT}/${w.file}`);
  const size = statSync(`${OUT}/${w.file}`).size;
  if (size !== asset.size) {
    console.error(`stage-installers: ${w.file} size ${size} != release asset size ${asset.size} — truncated download?`);
    process.exit(1);
  }
  files[w.key] = {
    file: w.file,
    size,
    sha256: createHash('sha256').update(buf).digest('hex'),
  };
  console.log(`staged ${w.file}  ${(size / 1e6).toFixed(1)} MB  sha256 ${files[w.key].sha256.slice(0, 12)}…`);
}

writeFileSync(`${OUT}/manifest.json`, JSON.stringify({
  version: tag.replace(/^desktop-v/, ''),
  tag,
  released: (release.published_at || release.created_at || '').slice(0, 10),
  files,
}, null, 2) + '\n');
console.log(`staged ${OUT}/manifest.json (version ${tag.replace(/^desktop-v/, '')})`);
