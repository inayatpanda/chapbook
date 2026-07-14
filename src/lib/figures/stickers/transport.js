// Transport stickers — retro die-cut. TARGET: 14.
//
// Style rules (see ./_style.js): author each sticker with mkSticker/RETRO/disc/
// primitives so the whole set stays cohesive + sanitise-clean. Decorative colour
// is fine, but every sticker MUST be self-contained inline SVG that passes
// sanitise() UNCHANGED — NO <script>/on*/<foreignObject>/href/url()/external
// refs/SMIL. mkSticker() asserts this for you.
// (Travel already owns the suitcase/plane/compass/balloon/anchor — vehicles only.)
import { mkSticker, RETRO as C, OUT, LINE } from './_style.js';

// shared wheel: black tyre + cream hub
const wheel = (cx, cy, r = 12) =>
  `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${C.ink}" stroke="${C.ink}" stroke-width="${LINE}"/>` +
  `<circle cx="${cx}" cy="${cy}" r="${r - 6}" fill="${C.paper}" stroke="${C.ink}" stroke-width="2"/>`;

export default {
  genre: 'transport',
  label: 'Transport',
  stickers: [
    mkSticker('classic-car', 'Classic car', [
      `<path d="M12 78 L20 78 Q24 56 40 54 L52 42 Q56 38 64 38 H82 Q92 38 96 50 L100 54 Q112 56 112 70 V78 Z" fill="${C.red}" stroke="${C.ink}" stroke-width="${OUT}" stroke-linejoin="round"/>`,
      `<path d="M54 44 H80 Q86 44 88 52 H56 Z" fill="${C.cream}" stroke="${C.ink}" stroke-width="2"/>`,
      `<line x1="70" y1="44" x2="70" y2="52" stroke="${C.ink}" stroke-width="2"/>`,
      `<rect x="100" y="58" width="10" height="7" rx="2" fill="${C.gold}" stroke="${C.ink}" stroke-width="2"/>`,
      wheel(38, 80, 13),
      wheel(90, 80, 13),
    ].join(''), { viewBox: [120, 100] }),

    mkSticker('double-decker-bus', 'Double-decker bus', [
      `<rect x="14" y="20" width="92" height="68" rx="8" fill="${C.red}" stroke="${C.ink}" stroke-width="${OUT}"/>`,
      `<line x1="14" y1="54" x2="106" y2="54" stroke="${C.ink}" stroke-width="${LINE}"/>`,
      `<rect x="24" y="28" width="18" height="16" rx="2" fill="${C.cream}" stroke="${C.ink}" stroke-width="2"/>`,
      `<rect x="48" y="28" width="18" height="16" rx="2" fill="${C.cream}" stroke="${C.ink}" stroke-width="2"/>`,
      `<rect x="72" y="28" width="18" height="16" rx="2" fill="${C.cream}" stroke="${C.ink}" stroke-width="2"/>`,
      `<rect x="24" y="62" width="18" height="16" rx="2" fill="${C.cream}" stroke="${C.ink}" stroke-width="2"/>`,
      `<rect x="48" y="62" width="18" height="16" rx="2" fill="${C.cream}" stroke="${C.ink}" stroke-width="2"/>`,
      `<rect x="78" y="60" width="20" height="22" rx="2" fill="${C.navy}" stroke="${C.ink}" stroke-width="2"/>`,
      wheel(38, 92, 11),
      wheel(84, 92, 11),
    ].join(''), { viewBox: [120, 108] }),

    mkSticker('bicycle', 'Bicycle', [
      `<circle cx="32" cy="74" r="22" fill="none" stroke="${C.ink}" stroke-width="${OUT}"/>`,
      `<circle cx="92" cy="74" r="22" fill="none" stroke="${C.ink}" stroke-width="${OUT}"/>`,
      `<path d="M32 74 L56 74 L72 44 L92 74 M56 74 L72 44 M56 74 L66 46" fill="none" stroke="${C.teal}" stroke-width="${LINE}" stroke-linejoin="round"/>`,
      `<line x1="62" y1="36" x2="80" y2="36" stroke="${C.ink}" stroke-width="${LINE}" stroke-linecap="round"/>`,
      `<path d="M48 44 h14" stroke="${C.ink}" stroke-width="${LINE}" stroke-linecap="round"/>`,
      `<circle cx="56" cy="74" r="5" fill="${C.gold}" stroke="${C.ink}" stroke-width="2"/>`,
    ].join(''), { viewBox: [120, 104] }),

    mkSticker('motorbike', 'Motorbike', [
      `<circle cx="30" cy="76" r="20" fill="none" stroke="${C.ink}" stroke-width="${OUT}"/>`,
      `<circle cx="92" cy="76" r="20" fill="none" stroke="${C.ink}" stroke-width="${OUT}"/>`,
      `<path d="M30 76 L52 76 L66 56 H86 L92 76" fill="none" stroke="${C.ink}" stroke-width="${LINE}" stroke-linejoin="round"/>`,
      `<path d="M50 58 q12 -4 26 0 q-2 8 -12 8 h-2 q-10 0 -12 -8 z" fill="${C.red}" stroke="${C.ink}" stroke-width="${LINE}"/>`,
      `<path d="M40 56 h18" stroke="${C.ink}" stroke-width="${LINE}" stroke-linecap="round"/>`,
      `<path d="M86 56 l8 -8" stroke="${C.ink}" stroke-width="${LINE}" stroke-linecap="round"/>`,
    ].join(''), { viewBox: [120, 104] }),

    mkSticker('steam-engine', 'Steam engine', [
      `<rect x="14" y="48" width="88" height="40" rx="4" fill="${C.green}" stroke="${C.ink}" stroke-width="${OUT}"/>`,
      `<rect x="66" y="28" width="36" height="22" rx="4" fill="${C.green}" stroke="${C.ink}" stroke-width="${OUT}"/>`,
      `<rect x="76" y="34" width="18" height="12" rx="2" fill="${C.cream}" stroke="${C.ink}" stroke-width="2"/>`,
      `<rect x="22" y="20" width="14" height="14" fill="${C.navy}" stroke="${C.ink}" stroke-width="${LINE}"/>`,
      `<path d="M29 20 q-6 -12 6 -18" fill="none" stroke="${C.paper}" stroke-width="${LINE}" stroke-linecap="round"/>`,
      `<circle cx="36" cy="80" r="8" fill="${C.gold}" stroke="${C.ink}" stroke-width="${LINE}"/>`,
      wheel(34, 92, 11),
      wheel(80, 92, 11),
    ].join(''), { viewBox: [120, 108] }),

    mkSticker('tram', 'Tram', [
      `<rect x="22" y="24" width="76" height="64" rx="10" fill="${C.teal}" stroke="${C.ink}" stroke-width="${OUT}"/>`,
      `<rect x="30" y="34" width="60" height="22" rx="3" fill="${C.cream}" stroke="${C.ink}" stroke-width="2"/>`,
      `<line x1="60" y1="34" x2="60" y2="56" stroke="${C.ink}" stroke-width="2"/>`,
      `<circle cx="42" cy="72" r="5" fill="${C.gold}" stroke="${C.ink}" stroke-width="2"/>`,
      `<circle cx="78" cy="72" r="5" fill="${C.gold}" stroke="${C.ink}" stroke-width="2"/>`,
      `<line x1="60" y1="24" x2="60" y2="10" stroke="${C.ink}" stroke-width="${LINE}"/>`,
      `<line x1="40" y1="10" x2="80" y2="10" stroke="${C.ink}" stroke-width="2"/>`,
      wheel(40, 92, 9),
      wheel(80, 92, 9),
    ].join(''), { viewBox: [120, 108] }),

    mkSticker('sailboat', 'Sailboat', [
      `<path d="M16 84 H104 L92 102 H28 Z" fill="${C.navy}" stroke="${C.ink}" stroke-width="${OUT}" stroke-linejoin="round"/>`,
      `<line x1="60" y1="14" x2="60" y2="84" stroke="${C.ink}" stroke-width="${OUT}" stroke-linecap="round"/>`,
      `<path d="M58 18 L24 78 H58 Z" fill="${C.red}" stroke="${C.ink}" stroke-width="${LINE}" stroke-linejoin="round"/>`,
      `<path d="M64 26 L94 78 H64 Z" fill="${C.gold}" stroke="${C.ink}" stroke-width="${LINE}" stroke-linejoin="round"/>`,
      `<path d="M16 96 q12 8 24 0 q12 -8 24 0 q12 8 24 0 q12 -8 16 0" fill="none" stroke="${C.teal}" stroke-width="2" stroke-linecap="round"/>`,
    ].join(''), { viewBox: [120, 110] }),

    mkSticker('helicopter', 'Helicopter', [
      `<path d="M30 60 Q30 44 56 44 H78 Q98 44 100 64 Q100 78 84 80 H44 Q30 78 30 60 Z" fill="${C.orange}" stroke="${C.ink}" stroke-width="${OUT}" stroke-linejoin="round"/>`,
      `<path d="M98 62 H114 V70 H100 Z" fill="${C.orange}" stroke="${C.ink}" stroke-width="${LINE}" stroke-linejoin="round"/>`,
      `<circle cx="54" cy="62" r="11" fill="${C.cream}" stroke="${C.ink}" stroke-width="${LINE}"/>`,
      `<line x1="56" y1="44" x2="56" y2="26" stroke="${C.ink}" stroke-width="${LINE}"/>`,
      `<line x1="18" y1="24" x2="100" y2="24" stroke="${C.ink}" stroke-width="${OUT}" stroke-linecap="round"/>`,
      `<line x1="110" y1="58" x2="118" y2="74" stroke="${C.ink}" stroke-width="${LINE}" stroke-linecap="round"/>`,
      `<path d="M44 80 H86 M50 80 v8 M80 80 v8 M46 88 H84" fill="none" stroke="${C.ink}" stroke-width="${LINE}" stroke-linecap="round"/>`,
    ].join(''), { viewBox: [120, 100] }),

    mkSticker('vintage-scooter', 'Vintage scooter', [
      `<circle cx="30" cy="80" r="16" fill="none" stroke="${C.ink}" stroke-width="${OUT}"/>`,
      `<circle cx="94" cy="80" r="16" fill="none" stroke="${C.ink}" stroke-width="${OUT}"/>`,
      `<path d="M30 80 Q34 50 56 50 Q74 50 78 64 Q82 80 94 80 Q88 56 78 50 L74 30 H64" fill="${C.teal}" stroke="${C.ink}" stroke-width="${OUT}" stroke-linejoin="round"/>`,
      `<path d="M62 30 h16" stroke="${C.ink}" stroke-width="${LINE}" stroke-linecap="round"/>`,
      `<rect x="50" y="42" width="22" height="9" rx="4" fill="${C.cream}" stroke="${C.ink}" stroke-width="2"/>`,
    ].join(''), { viewBox: [120, 104] }),

    mkSticker('delivery-truck', 'Delivery truck', [
      `<rect x="12" y="42" width="58" height="44" rx="4" fill="${C.gold}" stroke="${C.ink}" stroke-width="${OUT}"/>`,
      `<path d="M70 54 H92 L106 70 V86 H70 Z" fill="${C.red}" stroke="${C.ink}" stroke-width="${OUT}" stroke-linejoin="round"/>`,
      `<rect x="76" y="58" width="16" height="12" rx="2" fill="${C.cream}" stroke="${C.ink}" stroke-width="2"/>`,
      `<rect x="22" y="52" width="38" height="14" rx="2" fill="${C.cream}" stroke="${C.ink}" stroke-width="2"/>`,
      wheel(34, 90, 12),
      wheel(90, 90, 12),
    ].join(''), { viewBox: [120, 108] }),

    mkSticker('taxi-cab', 'Taxi', [
      `<path d="M10 80 L18 80 Q22 58 38 56 L50 44 Q54 40 62 40 H80 Q90 40 94 52 L98 56 Q110 58 110 72 V80 Z" fill="${C.gold}" stroke="${C.ink}" stroke-width="${OUT}" stroke-linejoin="round"/>`,
      `<path d="M52 46 H78 Q84 46 86 54 H54 Z" fill="${C.cream}" stroke="${C.ink}" stroke-width="2"/>`,
      `<rect x="48" y="28" width="24" height="12" rx="2" fill="${C.cream}" stroke="${C.ink}" stroke-width="${LINE}"/>`,
      `<text x="60" y="38" text-anchor="middle" font-family="Georgia, serif" font-weight="700" font-size="9" fill="${C.ink}">TAXI</text>`,
      `<rect x="22" y="64" width="76" height="8" fill="${C.ink}"/>`,
      `<rect x="26" y="65" width="8" height="6" fill="${C.paper}"/>`,
      `<rect x="42" y="65" width="8" height="6" fill="${C.paper}"/>`,
      `<rect x="58" y="65" width="8" height="6" fill="${C.paper}"/>`,
      wheel(38, 82, 13),
      wheel(88, 82, 13),
    ].join(''), { viewBox: [120, 100] }),

    mkSticker('tractor', 'Tractor', [
      `<circle cx="36" cy="80" r="24" fill="${C.ink}" stroke="${C.ink}" stroke-width="2"/>`,
      `<circle cx="36" cy="80" r="13" fill="${C.gold}" stroke="${C.ink}" stroke-width="${LINE}"/>`,
      `<circle cx="92" cy="86" r="14" fill="${C.ink}" stroke="${C.ink}" stroke-width="2"/>`,
      `<circle cx="92" cy="86" r="7" fill="${C.gold}" stroke="${C.ink}" stroke-width="2"/>`,
      `<path d="M60 56 H88 Q96 56 98 70 V82 H72 L66 70 H60 Z" fill="${C.green}" stroke="${C.ink}" stroke-width="${OUT}" stroke-linejoin="round"/>`,
      `<rect x="58" y="36" width="22" height="22" rx="2" fill="${C.green}" stroke="${C.ink}" stroke-width="${OUT}"/>`,
      `<rect x="62" y="40" width="14" height="12" rx="2" fill="${C.cream}" stroke="${C.ink}" stroke-width="2"/>`,
      `<rect x="50" y="30" width="8" height="10" fill="${C.navy}" stroke="${C.ink}" stroke-width="2"/>`,
    ].join(''), { viewBox: [120, 108] }),

    mkSticker('submarine', 'Submarine', [
      `<ellipse cx="58" cy="64" rx="48" ry="24" fill="${C.gold}" stroke="${C.ink}" stroke-width="${OUT}"/>`,
      `<rect x="50" y="26" width="20" height="20" rx="4" fill="${C.gold}" stroke="${C.ink}" stroke-width="${OUT}"/>`,
      `<line x1="60" y1="26" x2="60" y2="12" stroke="${C.ink}" stroke-width="${LINE}" stroke-linecap="round"/>`,
      `<path d="M60 12 h10" stroke="${C.ink}" stroke-width="${LINE}" stroke-linecap="round"/>`,
      `<circle cx="40" cy="64" r="8" fill="${C.cream}" stroke="${C.ink}" stroke-width="${LINE}"/>`,
      `<circle cx="66" cy="64" r="8" fill="${C.cream}" stroke="${C.ink}" stroke-width="${LINE}"/>`,
      `<path d="M106 50 l12 -8 v44 l-12 -8 z" fill="${C.red}" stroke="${C.ink}" stroke-width="${LINE}" stroke-linejoin="round"/>`,
    ].join(''), { viewBox: [120, 108] }),

    mkSticker('hot-rod', 'Hot rod', [
      `<path d="M8 80 L16 80 Q18 64 34 62 L48 50 Q52 46 60 46 H78 Q92 46 96 60 L110 64 Q116 66 116 76 V80 Z" fill="${C.red}" stroke="${C.ink}" stroke-width="${OUT}" stroke-linejoin="round"/>`,
      `<path d="M52 52 H76 Q82 52 84 60 H54 Z" fill="${C.navy}" stroke="${C.ink}" stroke-width="2"/>`,
      `<path d="M96 54 q14 -2 14 -10 q-10 -2 -16 4 z" fill="${C.orange}" stroke="${C.ink}" stroke-width="2" stroke-linejoin="round"/>`,
      `<rect x="22" y="40" width="6" height="14" fill="${C.ink}"/>`,
      `<rect x="32" y="38" width="6" height="16" fill="${C.ink}"/>`,
      wheel(34, 82, 14),
      wheel(94, 82, 16),
    ].join(''), { viewBox: [120, 100] }),
  ],
};
