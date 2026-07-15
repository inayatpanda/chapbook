// Sticker catalogue — funny old-school / retro die-cut stickers, by genre.
//
// ── THIN AGGREGATOR ──────────────────────────────────────────────────────────
// The actual stickers live in per-genre modules under ./stickers/<genre>.js, one
// file per genre. This file ONLY: (1) statically imports EVERY genre module
// (the list below is COMPLETE — filler agents populate existing module files and
// must NEVER edit this aggregator), and (2) flattens them into the public
// listStickers() shape. The shared retro-style toolkit is ./stickers/_style.js.
//
// FOR FILLER AGENTS adding stickers to a genre:
//   import { mkSticker, RETRO, frame, path, circle, rect, line, text } from './_style.js';
//   …then append mkSticker(id, name, inner, { viewBox:[w,h], … }) entries to that
//   module's `stickers` array. Do NOT touch this aggregator or _style.js.
//
// ── GENRE LINE-UP + per-genre target counts (aim ~200 total) ─────────────────
//   travel ............... ~12   (4 filled)
//   monuments ............ ~12   (4 filled)
//   science .............. ~12   (4 filled)
//   paintings (Art) ...... ~12   (3 filled)
//   flora-fauna .......... ~14   (4 filled)
//   general .............. ~14   (5 filled)
//   food-drink ........... ~14   (STUB)
//   sport-games .......... ~14   (STUB)
//   music ................ ~12   (STUB)
//   medical-anatomy ...... ~14   (STUB)
//   space ................ ~12   (STUB)
//   weather-nature ....... ~14   (STUB)
//   tech ................. ~14   (STUB)
//   emotions-reactions ... ~14   (STUB)
//   transport ............ ~14   (STUB)
//   history .............. ~12   (STUB)
//                          ────
//                          ~210 target (lands ~200 after de-dup/curation)
//
// A sticker is a decorative inline <svg>. The Studio drops it as a `figure` block
// (a figure whose svg IS a sticker), so it reuses ALL of the figure infrastructure
// for free: render (`.fig` inline SVG on the site), the SVG sanitiser, figure
// drag-resize, and the image-base overlay ("slap onto an image").
//
// listStickers() → [{ id, name, genre, viewBox, svg }]
//   - genre groups the palette (the editor UI groups dynamically by `genre`, in
//     catalogue order of first appearance; empty-stub genres simply don't show).
//   - svg is a FULL self-contained inline <svg> string (viewBox, no pixel width/
//     height so it scales to its container) and is guaranteed sanitise-clean
//     (mkSticker() asserts this at module-load time).
//
// Pure data + tiny string builders. ESM, browser-safe (esbuild-bundled into the
// Studio): NO node built-ins, NO I/O.

// ── static imports of EVERY genre module (complete; fillers don't edit this) ──
import travel from './stickers/travel.js';
import monuments from './stickers/monuments.js';
import science from './stickers/science.js';
import paintings from './stickers/paintings.js';
import floraFauna from './stickers/flora-fauna.js';
import general from './stickers/general.js';
import foodDrink from './stickers/food-drink.js';
import sportGames from './stickers/sport-games.js';
import music from './stickers/music.js';
import medicalAnatomy from './stickers/medical-anatomy.js';
import space from './stickers/space.js';
import weatherNature from './stickers/weather-nature.js';
import tech from './stickers/tech.js';
import emotionsReactions from './stickers/emotions-reactions.js';
import transport from './stickers/transport.js';
import history from './stickers/history.js';

// Display order = palette order. Each entry: { genre, label, stickers:[{id,name,svg}] }.
const MODULES = [
  travel, monuments, science, paintings, floraFauna, general,
  foodDrink, sportGames, music, medicalAnatomy, space, weatherNature,
  tech, emotionsReactions, transport, history,
];

// Every genre id this catalogue knows about, in palette order (filled + stubs).
export const STICKER_GENRE_IDS = MODULES.map((m) => m.genre);

// Genre → friendly label, for any consumer that wants a heading.
export const STICKER_GENRE_LABELS = Object.fromEntries(MODULES.map((m) => [m.genre, m.label]));

// The ORIGINAL six genres — kept as a stable export for back-compat (tests assert
// this advertises exactly the founding genres). New genres flow through
// listStickers()/STICKER_GENRE_IDS, not this constant.
export const STICKER_GENRES = ['travel', 'monuments', 'science', 'paintings', 'flora-fauna', 'general'];

// The full ordered catalogue. Flattens every module's stickers into the public
// shape { id, name, genre, viewBox:[w,h], svg }. De-dupes by id (first wins),
// preserving module/declaration order so the palette is stable.
export function listStickers() {
  const out = [];
  const seen = new Set();
  for (const mod of MODULES) {
    const list = Array.isArray(mod && mod.stickers) ? mod.stickers : [];
    for (const s of list) {
      if (!s || !s.id || seen.has(s.id)) continue;
      seen.add(s.id);
      out.push({
        id: s.id,
        name: s.name,
        genre: mod.genre,
        viewBox: viewBoxOf(s.svg),
        svg: s.svg,
      });
    }
  }
  return out;
}

// Look up a single sticker by id (or null). Convenience for any consumer.
export function getSticker(id) {
  return listStickers().find((s) => s.id === id) || null;
}

// Parse the [w,h] from an <svg viewBox="0 0 w h"> string (defaults [120,120]).
function viewBoxOf(svg) {
  const m = /viewBox="0 0 ([\d.]+) ([\d.]+)"/.exec(String(svg || ''));
  return m ? [Number(m[1]), Number(m[2])] : [120, 120];
}
