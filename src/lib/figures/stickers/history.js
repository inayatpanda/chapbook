// History stickers — retro die-cut. TARGET: ~12.
//
// Style rules (see ./_style.js): author each sticker with mkSticker/RETRO/
// primitives. Decorative colour is fine, but every sticker MUST be self-contained
// inline SVG that passes sanitise() UNCHANGED — NO <script>/on*/<foreignObject>/
// href/url()/external refs/SMIL. mkSticker() asserts this for you.
//
// Artefacts only (monuments owns columns/arches): scroll, hourglass, sundial,
// crown, sword & shield, knight helmet, amphora, ammonite fossil, gramophone,
// typewriter, quill & inkpot, treasure chest, oil lamp.
import { mkSticker, RETRO as C, OUT, LINE, disc } from './_style.js';

export default {
  genre: 'history',
  label: 'History',
  stickers: [
    mkSticker('ancient-scroll', 'Scroll', [
      `<rect x="28" y="30" width="64" height="56" fill="${C.paper}" stroke="${C.ink}" stroke-width="${LINE}"/>`,
      `<path d="M28 30 q-14 0 -14 12 q0 12 14 12 Z" fill="${C.cream}" stroke="${C.ink}" stroke-width="${OUT}"/>`,
      `<path d="M92 30 q14 0 14 12 q0 12 -14 12 Z" fill="${C.cream}" stroke="${C.ink}" stroke-width="${OUT}"/>`,
      `<path d="M28 86 q-14 0 -14 12 q0 12 14 12 Z" fill="${C.cream}" stroke="${C.ink}" stroke-width="${OUT}"/>`,
      `<path d="M92 86 q14 0 14 12 q0 12 -14 12 Z" fill="${C.cream}" stroke="${C.ink}" stroke-width="${OUT}"/>`,
      `<rect x="14" y="86" width="92" height="12" fill="${C.cream}" stroke="${C.ink}" stroke-width="${OUT}"/>`,
      `<rect x="14" y="30" width="92" height="12" fill="${C.cream}" stroke="${C.ink}" stroke-width="${OUT}"/>`,
      `<line x1="40" y1="54" x2="80" y2="54" stroke="${C.ink}" stroke-width="2"/>`,
      `<line x1="40" y1="64" x2="80" y2="64" stroke="${C.ink}" stroke-width="2"/>`,
      `<line x1="40" y1="74" x2="68" y2="74" stroke="${C.ink}" stroke-width="2"/>`,
    ].join(''), { viewBox: [120, 128] }),

    mkSticker('hourglass', 'Hourglass', [
      `<rect x="28" y="14" width="64" height="10" rx="3" fill="${C.brown}" stroke="${C.ink}" stroke-width="${OUT}"/>`,
      `<rect x="28" y="96" width="64" height="10" rx="3" fill="${C.brown}" stroke="${C.ink}" stroke-width="${OUT}"/>`,
      `<path d="M36 24 L84 24 L64 60 L84 96 L36 96 L56 60 Z" fill="${C.paper}" stroke="${C.ink}" stroke-width="${OUT}" stroke-linejoin="round"/>`,
      `<path d="M44 30 L76 30 L62 56 L58 56 Z" fill="${C.gold}"/>`,
      `<path d="M52 86 L68 86 L64 70 L56 70 Z" fill="${C.gold}"/>`,
      `<line x1="60" y1="58" x2="60" y2="74" stroke="${C.gold}" stroke-width="2"/>`,
    ].join(''), { viewBox: [120, 120] }),

    mkSticker('sundial', 'Sundial', [
      disc(60, 70, 42, C.cream),
      `<path d="M60 70 L60 30 L78 70 Z" fill="${C.navy}" stroke="${C.ink}" stroke-width="${LINE}" stroke-linejoin="round"/>`,
      `<line x1="60" y1="36" x2="60" y2="30" stroke="${C.ink}" stroke-width="2"/>`,
      `<line x1="60" y1="100" x2="60" y2="106" stroke="${C.ink}" stroke-width="2"/>`,
      `<line x1="26" y1="70" x2="20" y2="70" stroke="${C.ink}" stroke-width="2"/>`,
      `<line x1="94" y1="70" x2="100" y2="70" stroke="${C.ink}" stroke-width="2"/>`,
      `<line x1="36" y1="46" x2="32" y2="42" stroke="${C.ink}" stroke-width="2"/>`,
      `<line x1="84" y1="46" x2="88" y2="42" stroke="${C.ink}" stroke-width="2"/>`,
      `<circle cx="60" cy="70" r="5" fill="${C.gold}" stroke="${C.ink}" stroke-width="2"/>`,
    ].join(''), { viewBox: [120, 120] }),

    mkSticker('royal-crown', 'Royal crown', [
      `<path d="M22 84 L22 44 L40 60 L60 32 L80 60 L98 44 L98 84 Z" fill="${C.gold}" stroke="${C.ink}" stroke-width="${OUT}" stroke-linejoin="round"/>`,
      `<rect x="22" y="84" width="76" height="14" rx="3" fill="${C.gold}" stroke="${C.ink}" stroke-width="${OUT}"/>`,
      `<circle cx="22" cy="42" r="6" fill="${C.red}" stroke="${C.ink}" stroke-width="2"/>`,
      `<circle cx="60" cy="30" r="6" fill="${C.red}" stroke="${C.ink}" stroke-width="2"/>`,
      `<circle cx="98" cy="42" r="6" fill="${C.red}" stroke="${C.ink}" stroke-width="2"/>`,
      `<circle cx="60" cy="91" r="5" fill="${C.teal}" stroke="${C.ink}" stroke-width="2"/>`,
      `<circle cx="40" cy="91" r="4" fill="${C.plum}" stroke="${C.ink}" stroke-width="2"/>`,
      `<circle cx="80" cy="91" r="4" fill="${C.plum}" stroke="${C.ink}" stroke-width="2"/>`,
    ].join(''), { viewBox: [120, 112] }),

    mkSticker('sword-shield', 'Sword & shield', [
      `<path d="M30 24 q30 -8 60 0 q4 40 -30 70 q-34 -30 -30 -70 Z" fill="${C.navy}" stroke="${C.ink}" stroke-width="${OUT}" stroke-linejoin="round"/>`,
      `<line x1="60" y1="30" x2="60" y2="86" stroke="${C.gold}" stroke-width="${LINE}"/>`,
      `<line x1="38" y1="52" x2="82" y2="52" stroke="${C.gold}" stroke-width="${LINE}"/>`,
      `<line x1="92" y1="18" x2="64" y2="46" stroke="${C.ink}" stroke-width="${OUT}" stroke-linecap="round"/>`,
      `<path d="M92 18 l8 -4 -4 8 Z" fill="${C.gold}" stroke="${C.ink}" stroke-width="2"/>`,
      `<line x1="58" y1="40" x2="74" y2="56" stroke="${C.brown}" stroke-width="${OUT}" stroke-linecap="round"/>`,
    ].join(''), { viewBox: [120, 104] }),

    mkSticker('knight-helmet', 'Knight helmet', [
      `<path d="M30 30 q30 -16 60 0 q6 40 -6 60 l-48 0 q-12 -20 -6 -60 Z" fill="${C.blue}" stroke="${C.ink}" stroke-width="${OUT}" stroke-linejoin="round"/>`,
      `<rect x="34" y="44" width="52" height="8" rx="3" fill="${C.ink}"/>`,
      `<line x1="44" y1="56" x2="44" y2="84" stroke="${C.ink}" stroke-width="${LINE}"/>`,
      `<line x1="54" y1="56" x2="54" y2="84" stroke="${C.ink}" stroke-width="${LINE}"/>`,
      `<line x1="64" y1="56" x2="64" y2="84" stroke="${C.ink}" stroke-width="${LINE}"/>`,
      `<line x1="74" y1="56" x2="74" y2="84" stroke="${C.ink}" stroke-width="${LINE}"/>`,
      `<path d="M58 30 q4 -16 14 -20 q-2 14 -8 20 Z" fill="${C.red}" stroke="${C.ink}" stroke-width="2" stroke-linejoin="round"/>`,
    ].join(''), { viewBox: [120, 100] }),

    mkSticker('greek-amphora', 'Amphora', [
      `<path d="M44 24 L76 24 L74 36 q22 12 18 38 q-4 30 -32 30 q-28 0 -32 -30 q-4 -26 18 -38 Z" fill="${C.orange}" stroke="${C.ink}" stroke-width="${OUT}" stroke-linejoin="round"/>`,
      `<path d="M44 30 q-16 4 -14 18 q2 8 12 6" fill="none" stroke="${C.ink}" stroke-width="${LINE}" stroke-linecap="round"/>`,
      `<path d="M76 30 q16 4 14 18 q-2 8 -12 6" fill="none" stroke="${C.ink}" stroke-width="${LINE}" stroke-linecap="round"/>`,
      `<line x1="36" y1="58" x2="84" y2="58" stroke="${C.ink}" stroke-width="2"/>`,
      `<line x1="34" y1="72" x2="86" y2="72" stroke="${C.ink}" stroke-width="2"/>`,
      `<path d="M48 64 l6 -6 6 6 6 -6 6 6" fill="none" stroke="${C.navy}" stroke-width="2"/>`,
      `<rect x="42" y="18" width="36" height="8" rx="2" fill="${C.orange}" stroke="${C.ink}" stroke-width="${LINE}"/>`,
    ].join(''), { viewBox: [120, 120] }),

    mkSticker('ammonite-fossil', 'Ammonite', [
      disc(60, 60, 46, C.cream),
      `<path d="M60 60 m0 -2 a2 2 0 1 1 -2 2 a8 8 0 1 0 8 -8 a16 16 0 1 0 16 16 a26 26 0 1 0 -26 26 a36 36 0 1 0 36 -36" fill="none" stroke="${C.brown}" stroke-width="${OUT}" stroke-linecap="round"/>`,
      `<line x1="60" y1="60" x2="38" y2="42" stroke="${C.brown}" stroke-width="2"/>`,
      `<line x1="60" y1="60" x2="84" y2="52" stroke="${C.brown}" stroke-width="2"/>`,
      `<line x1="60" y1="60" x2="80" y2="84" stroke="${C.brown}" stroke-width="2"/>`,
    ].join(''), { viewBox: [120, 120] }),

    mkSticker('gramophone', 'Gramophone', [
      `<path d="M50 70 L40 30 q40 -22 56 8 Z" fill="${C.gold}" stroke="${C.ink}" stroke-width="${OUT}" stroke-linejoin="round"/>`,
      `<ellipse cx="68" cy="28" rx="30" ry="12" fill="${C.gold}" stroke="${C.ink}" stroke-width="${OUT}" transform="rotate(20 68 28)"/>`,
      `<line x1="50" y1="70" x2="46" y2="92" stroke="${C.brown}" stroke-width="${OUT}" stroke-linecap="round"/>`,
      `<rect x="26" y="90" width="56" height="14" rx="4" fill="${C.brown}" stroke="${C.ink}" stroke-width="${OUT}"/>`,
      `<circle cx="54" cy="97" r="14" fill="${C.navy}" stroke="${C.ink}" stroke-width="${LINE}"/>`,
      `<circle cx="54" cy="97" r="3" fill="${C.paper}"/>`,
    ].join(''), { viewBox: [120, 116] }),

    mkSticker('typewriter', 'Typewriter', [
      `<rect x="22" y="58" width="76" height="34" rx="5" fill="${C.navy}" stroke="${C.ink}" stroke-width="${OUT}"/>`,
      `<rect x="34" y="22" width="52" height="22" rx="3" fill="${C.paper}" stroke="${C.ink}" stroke-width="${OUT}"/>`,
      `<line x1="34" y1="22" x2="34" y2="14" stroke="${C.ink}" stroke-width="2"/>`,
      `<line x1="86" y1="22" x2="86" y2="14" stroke="${C.ink}" stroke-width="2"/>`,
      `<rect x="40" y="44" width="40" height="14" rx="2" fill="${C.red}" stroke="${C.ink}" stroke-width="${LINE}"/>`,
      `<circle cx="34" cy="76" r="4" fill="${C.cream}" stroke="${C.ink}" stroke-width="2"/>`,
      `<circle cx="46" cy="76" r="4" fill="${C.cream}" stroke="${C.ink}" stroke-width="2"/>`,
      `<circle cx="58" cy="76" r="4" fill="${C.cream}" stroke="${C.ink}" stroke-width="2"/>`,
      `<circle cx="70" cy="76" r="4" fill="${C.cream}" stroke="${C.ink}" stroke-width="2"/>`,
      `<rect x="40" y="84" width="40" height="6" rx="3" fill="${C.cream}" stroke="${C.ink}" stroke-width="2"/>`,
    ].join(''), { viewBox: [120, 100] }),

    mkSticker('quill-inkpot', 'Quill & ink', [
      `<path d="M88 16 q-40 14 -56 56 q-2 6 4 4 q40 -22 54 -56 q2 -6 -2 -4 Z" fill="${C.teal}" stroke="${C.ink}" stroke-width="${OUT}" stroke-linejoin="round"/>`,
      `<path d="M52 60 q14 -22 34 -40" fill="none" stroke="${C.ink}" stroke-width="2"/>`,
      `<line x1="40" y1="72" x2="34" y2="84" stroke="${C.ink}" stroke-width="${LINE}" stroke-linecap="round"/>`,
      `<path d="M24 78 L60 78 L56 104 L28 104 Z" fill="${C.navy}" stroke="${C.ink}" stroke-width="${OUT}" stroke-linejoin="round"/>`,
      `<ellipse cx="42" cy="78" rx="18" ry="6" fill="${C.blue}" stroke="${C.ink}" stroke-width="${LINE}"/>`,
    ].join(''), { viewBox: [120, 116] }),

    mkSticker('treasure-chest', 'Treasure chest', [
      `<rect x="20" y="54" width="80" height="46" rx="4" fill="${C.brown}" stroke="${C.ink}" stroke-width="${OUT}"/>`,
      `<path d="M20 54 q0 -24 40 -24 q40 0 40 24 Z" fill="${C.brown}" stroke="${C.ink}" stroke-width="${OUT}" stroke-linejoin="round"/>`,
      `<line x1="20" y1="54" x2="100" y2="54" stroke="${C.ink}" stroke-width="${LINE}"/>`,
      `<rect x="34" y="40" width="8" height="60" fill="${C.gold}" stroke="${C.ink}" stroke-width="2"/>`,
      `<rect x="78" y="40" width="8" height="60" fill="${C.gold}" stroke="${C.ink}" stroke-width="2"/>`,
      `<rect x="52" y="60" width="16" height="18" rx="2" fill="${C.gold}" stroke="${C.ink}" stroke-width="${LINE}"/>`,
      `<circle cx="60" cy="67" r="3" fill="${C.ink}"/>`,
      `<circle cx="44" cy="42" r="5" fill="${C.gold}" stroke="${C.ink}" stroke-width="2"/>`,
      `<circle cx="76" cy="42" r="5" fill="${C.gold}" stroke="${C.ink}" stroke-width="2"/>`,
    ].join(''), { viewBox: [120, 110] }),
  ],
};
