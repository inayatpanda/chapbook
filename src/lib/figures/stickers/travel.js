// Travel stickers — retro die-cut. TARGET: ~12 (currently 4 migrated).
// Style: see ./_style.js. Author with mkSticker/RETRO/frame/primitives so every
// sticker is cohesive + sanitise-clean. Append to the `stickers` array below.
import { mkSticker, RETRO as C, OUT, LINE, disc, svg } from './_style.js';

export default {
  genre: 'travel',
  label: 'Travel',
  stickers: [
    mkSticker('passport-stamp', 'Passport stamp', [
      // wonky double-ring rubber-stamp look
      `<circle cx="60" cy="60" r="50" fill="none" stroke="${C.red}" stroke-width="${OUT}"/>`,
      `<circle cx="60" cy="60" r="40" fill="none" stroke="${C.red}" stroke-width="${LINE}"/>`,
      `<path d="M40 52 L60 36 L80 52 L72 52 L72 70 L48 70 L48 52 Z" fill="${C.red}"/>`,
      `<text x="60" y="92" text-anchor="middle" font-family="Georgia, serif" font-weight="700" font-size="13" fill="${C.red}" letter-spacing="2">ARRIVED</text>`,
    ].join(''), { viewBox: [120, 120] }),

    mkSticker('vintage-suitcase', 'Vintage suitcase', [
      `<rect x="22" y="14" width="22" height="12" rx="5" fill="none" stroke="${C.ink}" stroke-width="${OUT}"/>`,
      `<rect x="14" y="26" width="92" height="62" rx="8" fill="${C.brown}" stroke="${C.ink}" stroke-width="${OUT}"/>`,
      `<rect x="14" y="44" width="92" height="10" fill="${C.gold}" stroke="${C.ink}" stroke-width="${LINE}"/>`,
      `<rect x="44" y="36" width="32" height="20" rx="3" fill="${C.cream}" stroke="${C.ink}" stroke-width="${LINE}"/>`,
      `<circle cx="34" cy="70" r="4" fill="${C.gold}" stroke="${C.ink}" stroke-width="2"/>`,
      `<circle cx="86" cy="70" r="4" fill="${C.gold}" stroke="${C.ink}" stroke-width="2"/>`,
    ].join(''), { viewBox: [120, 100] }),

    mkSticker('paper-plane', 'Paper plane', [
      `<path d="M14 40 L106 18 L66 96 L56 64 Z" fill="${C.paper}" stroke="${C.ink}" stroke-width="${OUT}" stroke-linejoin="round"/>`,
      `<path d="M14 40 L56 64 L106 18" fill="${C.blue}" stroke="${C.ink}" stroke-width="${LINE}" stroke-linejoin="round"/>`,
      `<path d="M22 56 q24 14 50 20" fill="none" stroke="${C.teal}" stroke-width="${LINE}" stroke-dasharray="4 6" stroke-linecap="round"/>`,
    ].join(''), { viewBox: [120, 110] }),

    mkSticker('compass-rose', 'Compass rose', [
      disc(60, 60, 46, C.navy),
      `<path d="M60 18 L70 60 L60 102 L50 60 Z" fill="${C.gold}" stroke="${C.ink}" stroke-width="${LINE}" stroke-linejoin="round"/>`,
      `<path d="M18 60 L60 50 L102 60 L60 70 Z" fill="${C.paper}" stroke="${C.ink}" stroke-width="${LINE}" stroke-linejoin="round"/>`,
      `<path d="M60 60 L60 18 L50 60 Z" fill="${C.red}"/>`,
      `<circle cx="60" cy="60" r="7" fill="${C.gold}" stroke="${C.ink}" stroke-width="2"/>`,
    ].join(''), { viewBox: [120, 120] }),

    mkSticker('hot-air-balloon', 'Hot-air balloon', [
      `<path d="M60 12 C28 12 22 44 22 58 C22 80 44 92 60 96 C76 92 98 80 98 58 C98 44 92 12 60 12 Z" fill="${C.red}" stroke="${C.ink}" stroke-width="${OUT}" stroke-linejoin="round"/>`,
      `<path d="M48 14 C40 32 40 78 52 95" fill="none" stroke="${C.ink}" stroke-width="${LINE}"/>`,
      `<path d="M72 14 C80 32 80 78 68 95" fill="none" stroke="${C.ink}" stroke-width="${LINE}"/>`,
      `<path d="M60 12 C56 36 56 72 60 96" fill="none" stroke="${C.ink}" stroke-width="${LINE}"/>`,
      `<path d="M48 95 q12 8 24 0" fill="${C.gold}" stroke="${C.ink}" stroke-width="${LINE}"/>`,
      `<line x1="52" y1="98" x2="50" y2="110" stroke="${C.ink}" stroke-width="2"/>`,
      `<line x1="68" y1="98" x2="70" y2="110" stroke="${C.ink}" stroke-width="2"/>`,
      `<rect x="48" y="108" width="24" height="14" rx="2" fill="${C.brown}" stroke="${C.ink}" stroke-width="${OUT}"/>`,
    ].join(''), { viewBox: [120, 124] }),

    mkSticker('ships-anchor', 'Anchor', [
      `<circle cx="60" cy="22" r="11" fill="none" stroke="${C.ink}" stroke-width="${OUT}"/>`,
      `<line x1="60" y1="33" x2="60" y2="96" stroke="${C.ink}" stroke-width="${OUT}"/>`,
      `<line x1="36" y1="46" x2="84" y2="46" stroke="${C.ink}" stroke-width="${OUT}"/>`,
      `<path d="M22 70 q0 30 38 32 q38 -2 38 -32" fill="none" stroke="${C.ink}" stroke-width="${OUT}" stroke-linecap="round"/>`,
      `<path d="M22 70 l-8 8 l16 4 z" fill="${C.navy}" stroke="${C.ink}" stroke-width="2"/>`,
      `<path d="M98 70 l8 8 l-16 4 z" fill="${C.navy}" stroke="${C.ink}" stroke-width="2"/>`,
    ].join(''), { viewBox: [120, 120] }),

    mkSticker('palm-beach', 'Palm beach', [
      disc(60, 60, 46, C.blue),
      `<path d="M18 86 q42 -16 84 0 v18 h-84 z" fill="${C.gold}" stroke="${C.ink}" stroke-width="${LINE}"/>`,
      `<path d="M70 32 q2 30 -2 56" fill="none" stroke="${C.brown}" stroke-width="${OUT}" stroke-linecap="round"/>`,
      `<path d="M70 32 q-24 -8 -34 4" fill="${C.green}" stroke="${C.ink}" stroke-width="2"/>`,
      `<path d="M70 32 q24 -8 34 4" fill="${C.green}" stroke="${C.ink}" stroke-width="2"/>`,
      `<path d="M70 32 q-14 -18 -30 -16" fill="${C.green}" stroke="${C.ink}" stroke-width="2"/>`,
      `<path d="M70 32 q14 -18 30 -16" fill="${C.green}" stroke="${C.ink}" stroke-width="2"/>`,
      `<circle cx="38" cy="40" r="9" fill="${C.gold}" stroke="${C.ink}" stroke-width="2"/>`,
    ].join(''), { viewBox: [120, 120] }),

    mkSticker('mountain-peak', 'Mountain peak', [
      disc(60, 60, 46, C.teal),
      `<path d="M18 92 L46 44 L62 70 L78 38 L102 92 Z" fill="${C.navy}" stroke="${C.ink}" stroke-width="${OUT}" stroke-linejoin="round"/>`,
      `<path d="M40 52 L46 44 L54 56 L48 60 L44 54 Z" fill="${C.paper}"/>`,
      `<path d="M70 50 L78 38 L88 56 L80 58 L74 52 Z" fill="${C.paper}"/>`,
      `<circle cx="40" cy="34" r="8" fill="${C.gold}" stroke="${C.ink}" stroke-width="2"/>`,
    ].join(''), { viewBox: [120, 120] }),

    mkSticker('retro-camera', 'Retro camera', [
      `<rect x="14" y="36" width="92" height="64" rx="8" fill="${C.navy}" stroke="${C.ink}" stroke-width="${OUT}"/>`,
      `<path d="M40 36 l8 -12 h24 l8 12 z" fill="${C.navy}" stroke="${C.ink}" stroke-width="${OUT}" stroke-linejoin="round"/>`,
      `<circle cx="60" cy="68" r="20" fill="${C.gold}" stroke="${C.ink}" stroke-width="${OUT}"/>`,
      `<circle cx="60" cy="68" r="10" fill="${C.teal}" stroke="${C.ink}" stroke-width="${LINE}"/>`,
      `<circle cx="92" cy="48" r="5" fill="${C.red}" stroke="${C.ink}" stroke-width="2"/>`,
      `<rect x="22" y="44" width="14" height="8" rx="2" fill="${C.paper}" stroke="${C.ink}" stroke-width="2"/>`,
    ].join(''), { viewBox: [120, 110] }),

    mkSticker('map-pin', 'Map pin', [
      `<path d="M60 14 C36 14 22 32 22 52 C22 78 60 110 60 110 C60 110 98 78 98 52 C98 32 84 14 60 14 Z" fill="${C.red}" stroke="${C.ink}" stroke-width="${OUT}" stroke-linejoin="round"/>`,
      `<circle cx="60" cy="50" r="16" fill="${C.paper}" stroke="${C.ink}" stroke-width="${LINE}"/>`,
      `<circle cx="60" cy="50" r="6" fill="${C.gold}" stroke="${C.ink}" stroke-width="2"/>`,
    ].join(''), { viewBox: [120, 120] }),

    mkSticker('globe-trotter', 'Globe', [
      disc(60, 60, 46, C.blue),
      `<ellipse cx="60" cy="60" rx="20" ry="46" fill="none" stroke="${C.paper}" stroke-width="${LINE}"/>`,
      `<line x1="14" y1="60" x2="106" y2="60" stroke="${C.paper}" stroke-width="${LINE}"/>`,
      `<path d="M36 40 q14 8 36 2 q10 8 26 6" fill="none" stroke="${C.paper}" stroke-width="2"/>`,
      `<path d="M34 84 q18 -6 30 0 q12 6 24 -2" fill="none" stroke="${C.paper}" stroke-width="2"/>`,
      `<path d="M40 50 q14 4 30 -2 l-2 14 q-16 6 -28 -2 z" fill="${C.green}" stroke="${C.ink}" stroke-width="2"/>`,
    ].join(''), { viewBox: [120, 120] }),

    mkSticker('camping-tent', 'Camping tent', [
      `<path d="M14 100 L60 24 L106 100 Z" fill="${C.orange}" stroke="${C.ink}" stroke-width="${OUT}" stroke-linejoin="round"/>`,
      `<path d="M60 24 L60 100" stroke="${C.ink}" stroke-width="${LINE}"/>`,
      `<path d="M60 100 L48 60 L60 44 L72 60 Z" fill="${C.navy}" stroke="${C.ink}" stroke-width="${LINE}" stroke-linejoin="round"/>`,
      `<line x1="60" y1="24" x2="60" y2="14" stroke="${C.ink}" stroke-width="2"/>`,
      `<path d="M60 14 l12 5 -12 5 z" fill="${C.red}" stroke="${C.ink}" stroke-width="2"/>`,
      `<line x1="10" y1="100" x2="110" y2="100" stroke="${C.ink}" stroke-width="${OUT}" stroke-linecap="round"/>`,
    ].join(''), { viewBox: [120, 112] }),

    mkSticker('travel-postcard', 'Postcard', [
      `<rect x="12" y="24" width="96" height="72" rx="5" fill="${C.paper}" stroke="${C.ink}" stroke-width="${OUT}"/>`,
      `<line x1="60" y1="30" x2="60" y2="90" stroke="${C.ink}" stroke-width="2"/>`,
      `<rect x="78" y="32" width="22" height="16" rx="2" fill="${C.cream}" stroke="${C.ink}" stroke-width="2"/>`,
      `<path d="M82 36 l6 5 6 -5" fill="none" stroke="${C.ink}" stroke-width="2"/>`,
      `<line x1="68" y1="58" x2="100" y2="58" stroke="${C.ink}" stroke-width="2"/>`,
      `<line x1="68" y1="68" x2="100" y2="68" stroke="${C.ink}" stroke-width="2"/>`,
      `<line x1="68" y1="78" x2="92" y2="78" stroke="${C.ink}" stroke-width="2"/>`,
      `<path d="M20 78 L34 52 L42 66 L50 48 L52 78 Z" fill="${C.teal}" stroke="${C.ink}" stroke-width="2" stroke-linejoin="round"/>`,
      `<circle cx="46" cy="40" r="5" fill="${C.gold}" stroke="${C.ink}" stroke-width="2"/>`,
    ].join(''), { viewBox: [120, 110] }),
  ],
};
