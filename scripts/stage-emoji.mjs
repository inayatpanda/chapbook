// Stage the multicolour emoji glyph set into dist/ for deploy.
//
// WHY a stage script rather than a sprite in git: the Tabler sprite (src/icons-sprite.svg,
// 1.9 MB) is ONE file because every icon in it is a single currentColor path, so it
// compresses to nothing and can be inlined. Multicolour art cannot work that way — each
// emoji carries its own fills, so a combined sprite would be many megabytes and would land
// in the service worker's shell cache, which the whole app boots from. These ship as
// individual files loaded on demand instead, exactly like the STT assets: never in git
// (dist/ is gitignored; nothing here touches the tree), never in the shell cache.
//
// Sources (build-time only — the runtime never leaves this origin):
//   • unicode-emoji-json (MIT) for names, slugs and groups — the searchable metadata.
//   • Twemoji (CC-BY 4.0) for the art. Chosen over OpenMoji deliberately: OpenMoji is
//     CC BY-SA, and building a derived asset set from it would drag ShareAlike onto a
//     commercial product. CC-BY needs attribution only, which ATTRIBUTION.md carries.
//
// Run:  npm run stage:emoji     (after `npm run build`, which wipes dist/)
import { mkdirSync, writeFileSync, existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { realpathSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const EMOJI_JSON = 'https://cdn.jsdelivr.net/npm/unicode-emoji-json@0.8.0/data-by-group.json';
const TWEMOJI = (code) => `https://cdn.jsdelivr.net/npm/@discordapp/twemoji@15.1.0/dist/svg/${code}.svg`;
const OUT_DIR = 'dist/emoji';
const MANIFEST = 'dist/emoji-manifest.json';
// Downloads are cached here so a rebuild is offline and reproducible. Gitignored.
const CACHE = 'vendor/emoji';

// Twemoji's own filename rule (twemoji.grabTheRightIcon): join the code points as
// lowercase hex, and drop the U+FE0F variation selector UNLESS the sequence contains a
// zero-width joiner. Getting this wrong 404s on exactly the emoji that have a text
// presentation form, which is a large and non-obvious slice of the set.
const U200D = '‍';
export function twemojiCode(emoji) {
  const src = emoji.indexOf(U200D) < 0 ? emoji.replace(/️/g, '') : emoji;
  return [...src].map((ch) => ch.codePointAt(0).toString(16)).join('-');
}

const args = new Set(process.argv.slice(2));
const quiet = args.has('--quiet');
const log = (...a) => { if (!quiet) console.log(...a); };

async function fetchText(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return res.text();
}

// Cache-first so repeat runs cost nothing and work offline.
async function getSvg(code) {
  const cached = join(CACHE, `${code}.svg`);
  if (existsSync(cached)) return readFileSync(cached, 'utf8');
  const svg = await fetchText(TWEMOJI(code));
  writeFileSync(cached, svg);
  return svg;
}

async function main() {
  mkdirSync(CACHE, { recursive: true });
  mkdirSync(OUT_DIR, { recursive: true });

  const groupsCachePath = join(CACHE, '_groups.json');
  let groups;
  if (existsSync(groupsCachePath)) {
    groups = JSON.parse(readFileSync(groupsCachePath, 'utf8'));
  } else {
    groups = JSON.parse(await fetchText(EMOJI_JSON));
    writeFileSync(groupsCachePath, JSON.stringify(groups));
  }

  const manifest = [];
  const missing = [];
  let bytes = 0;

  // Flatten to a work list first so concurrency is easy to bound.
  const work = [];
  for (const g of groups) {
    for (const e of g.emojis || []) work.push({ group: g.name, ...e });
  }
  log(`staging ${work.length} emoji from ${groups.length} groups…`);

  const CONCURRENCY = 12;
  let cursor = 0;
  async function worker() {
    while (cursor < work.length) {
      const item = work[cursor++];
      const code = twemojiCode(item.emoji);
      try {
        const svg = await getSvg(code);
        writeFileSync(join(OUT_DIR, `${item.slug}.svg`), svg);
        bytes += Buffer.byteLength(svg);
        manifest.push({
          n: item.slug,                     // the token name: emoji:<n>
          c: item.group,                    // picker category
          e: item.emoji,                    // the literal character (fallback + copy)
          t: item.name,                     // human name, searched
        });
      } catch (err) {
        missing.push({ slug: item.slug, code, err: String(err.message || err) });
      }
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));

  manifest.sort((a, b) => (a.n < b.n ? -1 : a.n > b.n ? 1 : 0));
  writeFileSync(MANIFEST, JSON.stringify(manifest));

  const mb = (bytes / 1048576).toFixed(1);
  log(`emoji: ${manifest.length} staged → ${OUT_DIR}/ (${mb} MB), manifest → ${MANIFEST}`);
  if (missing.length) {
    log(`emoji: ${missing.length} had no Twemoji asset and were skipped (first 5):`);
    for (const m of missing.slice(0, 5)) log(`  ${m.slug} (${m.code}) — ${m.err}`);
  }
  // A handful of misses is upstream coverage; a large fraction means the filename rule
  // above is wrong, which would silently ship a half-empty picker.
  if (missing.length > work.length * 0.05) {
    console.error(`stage-emoji: ${missing.length}/${work.length} assets missing — that is too many to be upstream gaps. Check twemojiCode().`);
    process.exit(1);
  }
}

// Only run when invoked directly, so the codepoint rule above can be unit tested.
if (process.argv[1] && realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url))) {
  main().catch((e) => { console.error('stage-emoji failed:', e.message || e); process.exit(1); });
}
