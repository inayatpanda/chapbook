// Art / paintings stickers — retro die-cut. TARGET: ~12 (currently 3 migrated).
// Style: see ./_style.js. Author with mkSticker/RETRO/frame/primitives so every
// sticker is cohesive + sanitise-clean. Append to the `stickers` array below.
// NOTE: genre id stays 'paintings' (label shown as "Art").
import { mkSticker, RETRO as C, OUT, LINE } from './_style.js';

export default {
  genre: 'paintings',
  label: 'Art',
  stickers: [
    mkSticker('palette', 'Artist palette', [
      `<path d="M58 12 C 18 12 8 48 18 70 C 26 88 50 92 56 78 C 60 68 74 70 74 82 C 74 98 110 86 110 52 C 110 26 92 12 58 12 Z" fill="${C.cream}" stroke="${C.ink}" stroke-width="${OUT}" stroke-linejoin="round"/>`,
      `<circle cx="40" cy="34" r="7" fill="${C.red}" stroke="${C.ink}" stroke-width="2"/>`,
      `<circle cx="64" cy="28" r="7" fill="${C.gold}" stroke="${C.ink}" stroke-width="2"/>`,
      `<circle cx="86" cy="36" r="7" fill="${C.teal}" stroke="${C.ink}" stroke-width="2"/>`,
      `<circle cx="90" cy="60" r="7" fill="${C.plum}" stroke="${C.ink}" stroke-width="2"/>`,
      `<circle cx="36" cy="58" r="7" fill="${C.blue}" stroke="${C.ink}" stroke-width="2"/>`,
    ].join(''), { viewBox: [120, 110] }),

    mkSticker('framed-canvas', 'Framed canvas', [
      `<rect x="14" y="12" width="92" height="86" rx="4" fill="${C.gold}" stroke="${C.ink}" stroke-width="${OUT}"/>`,
      `<rect x="26" y="24" width="68" height="62" fill="${C.paper}" stroke="${C.ink}" stroke-width="${LINE}"/>`,
      `<path d="M26 70 q16 -30 30 -16 q12 12 24 -6 l14 0 0 24 Z" fill="${C.green}" stroke="${C.ink}" stroke-width="2" stroke-linejoin="round"/>`,
      `<circle cx="74" cy="36" r="6" fill="${C.orange}" stroke="${C.ink}" stroke-width="2"/>`,
    ].join(''), { viewBox: [120, 110] }),

    mkSticker('paintbrush', 'Paintbrush', [
      `<rect x="32" y="14" width="16" height="60" rx="6" fill="${C.brown}" stroke="${C.ink}" stroke-width="${OUT}"/>`,
      `<rect x="30" y="70" width="20" height="14" fill="${C.gold}" stroke="${C.ink}" stroke-width="${LINE}"/>`,
      `<path d="M30 84 L50 84 L46 116 a14 14 0 0 1 -12 0 Z" fill="${C.red}" stroke="${C.ink}" stroke-width="${OUT}" stroke-linejoin="round"/>`,
      `<path d="M38 116 q2 8 2 12 M40 116 q-1 8 -3 12" fill="none" stroke="${C.red}" stroke-width="${LINE}" stroke-linecap="round"/>`,
    ].join(''), { viewBox: [80, 130] }),

    mkSticker('easel', 'Easel + canvas', [
      `<path d="M30 102 L46 22 L74 22 L90 102 M60 22 L60 110" fill="none" stroke="${C.brown}" stroke-width="${OUT}" stroke-linecap="round" stroke-linejoin="round"/>`,
      `<rect x="30" y="20" width="60" height="50" rx="3" fill="${C.paper}" stroke="${C.ink}" stroke-width="${OUT}"/>`,
      `<path d="M34 60 q14 -26 26 -12 q10 12 22 -8 l4 0 0 20 Z" fill="${C.teal}" stroke="${C.ink}" stroke-width="2" stroke-linejoin="round"/>`,
      `<circle cx="50" cy="34" r="6" fill="${C.gold}" stroke="${C.ink}" stroke-width="2"/>`,
      `<line x1="36" y1="84" x2="84" y2="84" stroke="${C.brown}" stroke-width="${LINE}" stroke-linecap="round"/>`,
    ].join(''), { viewBox: [120, 120] }),

    mkSticker('gold-frame', 'Ornate frame', [
      `<rect x="14" y="14" width="92" height="92" rx="4" fill="${C.gold}" stroke="${C.ink}" stroke-width="${OUT}"/>`,
      `<rect x="26" y="26" width="68" height="68" fill="${C.brown}" stroke="${C.ink}" stroke-width="${LINE}"/>`,
      `<rect x="34" y="34" width="52" height="52" fill="${C.navy}" stroke="${C.ink}" stroke-width="2"/>`,
      `<circle cx="14" cy="14" r="7" fill="${C.gold}" stroke="${C.ink}" stroke-width="2"/>`,
      `<circle cx="106" cy="14" r="7" fill="${C.gold}" stroke="${C.ink}" stroke-width="2"/>`,
      `<circle cx="14" cy="106" r="7" fill="${C.gold}" stroke="${C.ink}" stroke-width="2"/>`,
      `<circle cx="106" cy="106" r="7" fill="${C.gold}" stroke="${C.ink}" stroke-width="2"/>`,
    ].join(''), { viewBox: [120, 120] }),

    mkSticker('brush-jar', 'Brush jar', [
      `<path d="M30 54 L90 54 L84 108 a6 6 0 0 1 -6 6 L42 114 a6 6 0 0 1 -6 -6 Z" fill="${C.teal}" stroke="${C.ink}" stroke-width="${OUT}" stroke-linejoin="round"/>`,
      `<path d="M30 54 L90 54 L88 70 L32 70 Z" fill="${C.paper}" stroke="${C.ink}" stroke-width="${LINE}" stroke-linejoin="round"/>`,
      `<line x1="50" y1="54" x2="44" y2="10" stroke="${C.brown}" stroke-width="${OUT}" stroke-linecap="round"/>`,
      `<line x1="44" y1="10" x2="44" y2="4" stroke="${C.red}" stroke-width="6" stroke-linecap="round"/>`,
      `<line x1="64" y1="54" x2="68" y2="14" stroke="${C.brown}" stroke-width="${OUT}" stroke-linecap="round"/>`,
      `<line x1="68" y1="14" x2="69" y2="8" stroke="${C.gold}" stroke-width="6" stroke-linecap="round"/>`,
      `<line x1="76" y1="54" x2="82" y2="20" stroke="${C.brown}" stroke-width="${OUT}" stroke-linecap="round"/>`,
      `<line x1="82" y1="20" x2="83" y2="14" stroke="${C.plum}" stroke-width="6" stroke-linecap="round"/>`,
    ].join(''), { viewBox: [120, 120] }),

    mkSticker('swatch-strip', 'Colour swatches', [
      `<rect x="22" y="20" width="76" height="84" rx="6" fill="${C.paper}" stroke="${C.ink}" stroke-width="${OUT}"/>`,
      `<rect x="32" y="28" width="56" height="14" fill="${C.red}" stroke="${C.ink}" stroke-width="2"/>`,
      `<rect x="32" y="46" width="56" height="14" fill="${C.gold}" stroke="${C.ink}" stroke-width="2"/>`,
      `<rect x="32" y="64" width="56" height="14" fill="${C.teal}" stroke="${C.ink}" stroke-width="2"/>`,
      `<rect x="32" y="82" width="56" height="14" fill="${C.plum}" stroke="${C.ink}" stroke-width="2"/>`,
    ].join(''), { viewBox: [120, 120] }),

    mkSticker('ink-quill', 'Ink pot + quill', [
      `<path d="M34 70 L86 70 L82 106 a6 6 0 0 1 -6 6 L44 112 a6 6 0 0 1 -6 -6 Z" fill="${C.navy}" stroke="${C.ink}" stroke-width="${OUT}" stroke-linejoin="round"/>`,
      `<rect x="44" y="60" width="32" height="12" rx="3" fill="${C.cream}" stroke="${C.ink}" stroke-width="${LINE}"/>`,
      `<path d="M62 62 C 78 40 96 22 108 12 C 96 30 86 50 76 66 Z" fill="${C.red}" stroke="${C.ink}" stroke-width="${OUT}" stroke-linejoin="round"/>`,
      `<line x1="92" y1="34" x2="78" y2="52" stroke="${C.ink}" stroke-width="2"/>`,
    ].join(''), { viewBox: [120, 120] }),

    mkSticker('paint-splat', 'Paint splat', [
      `<path d="M60 16 C 78 18 86 34 80 50 C 96 48 110 60 100 76 C 110 88 98 106 82 98 C 84 114 66 118 58 104 C 46 116 28 108 34 92 C 18 94 14 74 30 68 C 16 56 28 38 44 46 C 42 28 50 16 60 16 Z" fill="${C.red}" stroke="${C.ink}" stroke-width="${OUT}" stroke-linejoin="round"/>`,
      `<circle cx="60" cy="62" r="14" fill="${C.gold}" stroke="${C.ink}" stroke-width="2"/>`,
      `<circle cx="100" cy="30" r="5" fill="${C.red}" stroke="${C.ink}" stroke-width="2"/>`,
      `<circle cx="22" cy="100" r="4" fill="${C.red}" stroke="${C.ink}" stroke-width="2"/>`,
    ].join(''), { viewBox: [120, 120] }),

    mkSticker('spotlight-art', 'Gallery spotlight', [
      `<path d="M16 8 L40 8 L92 110 L68 110 Z" fill="${C.gold}" stroke="${C.ink}" stroke-width="2" stroke-linejoin="round" opacity="0.85"/>`,
      `<rect x="6" y="6" width="22" height="14" rx="4" fill="${C.navy}" stroke="${C.ink}" stroke-width="${OUT}"/>`,
      `<rect x="56" y="48" width="52" height="56" rx="3" fill="${C.brown}" stroke="${C.ink}" stroke-width="${OUT}"/>`,
      `<rect x="66" y="58" width="32" height="36" fill="${C.paper}" stroke="${C.ink}" stroke-width="${LINE}"/>`,
      `<path d="M66 84 q8 -18 16 -8 q6 8 16 -6 l0 24 Z" fill="${C.teal}" stroke="${C.ink}" stroke-width="2" stroke-linejoin="round"/>`,
    ].join(''), { viewBox: [120, 120] }),

    mkSticker('pencil', 'Charcoal pencil', [
      `<rect x="36" y="14" width="22" height="68" fill="${C.gold}" stroke="${C.ink}" stroke-width="${OUT}" transform="rotate(20 47 48)"/>`,
      `<path d="M55 92 L70 102 L78 84 Z" fill="${C.cream}" stroke="${C.ink}" stroke-width="${LINE}" stroke-linejoin="round"/>`,
      `<path d="M70 102 L78 84 L80 93 Z" fill="${C.ink}"/>`,
      `<rect x="34" y="12" width="22" height="10" fill="${C.red}" stroke="${C.ink}" stroke-width="2" transform="rotate(20 45 17)"/>`,
    ].join(''), { viewBox: [120, 120] }),

    mkSticker('watercolour-blobs', 'Watercolour blobs', [
      `<path d="M40 30 C 58 28 60 50 46 56 C 30 62 20 44 28 36 C 31 32 35 31 40 30 Z" fill="${C.teal}" stroke="${C.ink}" stroke-width="${OUT}" stroke-linejoin="round"/>`,
      `<path d="M82 38 C 100 38 102 60 86 64 C 70 68 62 50 70 42 C 73 39 78 38 82 38 Z" fill="${C.red}" stroke="${C.ink}" stroke-width="${OUT}" stroke-linejoin="round"/>`,
      `<path d="M60 76 C 80 74 84 98 66 102 C 48 106 38 86 48 78 C 51 76 56 76 60 76 Z" fill="${C.gold}" stroke="${C.ink}" stroke-width="${OUT}" stroke-linejoin="round"/>`,
      `<circle cx="36" cy="42" r="4" fill="${C.paper}"/>`,
      `<circle cx="78" cy="50" r="4" fill="${C.paper}"/>`,
    ].join(''), { viewBox: [120, 120] }),
  ],
};
