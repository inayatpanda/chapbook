// Weather & nature stickers — retro die-cut. TARGET: 14.
//
// Style rules (see ./_style.js): author each sticker with
//   import { mkSticker, RETRO, frame, path, circle, rect, line, text } from './_style.js';
// Decorative colour is fine, but every sticker MUST be self-contained inline SVG
// that passes sanitise() UNCHANGED — NO <script>/on*/<foreignObject>/href/url()/
// external refs/SMIL. mkSticker() asserts this for you. Append to `stickers` below.
//
// Ideas: sun with rays, cloud, rainbow, lightning bolt, raindrop, snowflake,
// mountain, wave, campfire, tree (pine), volcano, tornado, crescent moon, fog.
import { mkSticker, RETRO as C, OUT, LINE, disc } from './_style.js';

export default {
  genre: 'weather-nature',
  label: 'Weather & nature',
  stickers: [
    mkSticker('sunny-rays', 'Sunshine', [
      `<circle cx="60" cy="60" r="26" fill="${C.gold}" stroke="${C.ink}" stroke-width="${OUT}"/>`,
      `<line x1="60" y1="8" x2="60" y2="26" stroke="${C.orange}" stroke-width="${OUT}" stroke-linecap="round"/>`,
      `<line x1="60" y1="94" x2="60" y2="112" stroke="${C.orange}" stroke-width="${OUT}" stroke-linecap="round"/>`,
      `<line x1="8" y1="60" x2="26" y2="60" stroke="${C.orange}" stroke-width="${OUT}" stroke-linecap="round"/>`,
      `<line x1="94" y1="60" x2="112" y2="60" stroke="${C.orange}" stroke-width="${OUT}" stroke-linecap="round"/>`,
      `<line x1="23" y1="23" x2="36" y2="36" stroke="${C.orange}" stroke-width="${OUT}" stroke-linecap="round"/>`,
      `<line x1="97" y1="23" x2="84" y2="36" stroke="${C.orange}" stroke-width="${OUT}" stroke-linecap="round"/>`,
      `<line x1="23" y1="97" x2="36" y2="84" stroke="${C.orange}" stroke-width="${OUT}" stroke-linecap="round"/>`,
      `<line x1="97" y1="97" x2="84" y2="84" stroke="${C.orange}" stroke-width="${OUT}" stroke-linecap="round"/>`,
      `<path d="M48 64 q12 12 24 0" fill="none" stroke="${C.ink}" stroke-width="${LINE}" stroke-linecap="round"/>`,
    ].join(''), { viewBox: [120, 120] }),

    mkSticker('fluffy-cloud', 'Cloud', [
      `<path d="M30 78 a20 20 0 0 1 4 -39 a26 26 0 0 1 50 -4 a18 18 0 0 1 6 43 Z" fill="${C.paper}" stroke="${C.ink}" stroke-width="${OUT}" stroke-linejoin="round"/>`,
      `<path d="M40 58 q14 -8 30 -2" fill="none" stroke="${C.blue}" stroke-width="2" stroke-linecap="round"/>`,
    ].join(''), { viewBox: [120, 96] }),

    mkSticker('rain-cloud', 'Rain cloud', [
      `<path d="M30 56 a18 18 0 0 1 4 -35 a24 24 0 0 1 46 -4 a16 16 0 0 1 5 39 Z" fill="${C.navy}" stroke="${C.ink}" stroke-width="${OUT}" stroke-linejoin="round"/>`,
      `<line x1="40" y1="64" x2="34" y2="86" stroke="${C.blue}" stroke-width="${OUT}" stroke-linecap="round"/>`,
      `<line x1="58" y1="66" x2="52" y2="92" stroke="${C.teal}" stroke-width="${OUT}" stroke-linecap="round"/>`,
      `<line x1="76" y1="64" x2="70" y2="86" stroke="${C.blue}" stroke-width="${OUT}" stroke-linecap="round"/>`,
    ].join(''), { viewBox: [120, 100] }),

    mkSticker('snowflake', 'Snowflake', [
      disc(60, 60, 46, C.blue),
      `<line x1="60" y1="18" x2="60" y2="102" stroke="${C.paper}" stroke-width="${OUT}" stroke-linecap="round"/>`,
      `<line x1="24" y1="39" x2="96" y2="81" stroke="${C.paper}" stroke-width="${OUT}" stroke-linecap="round"/>`,
      `<line x1="24" y1="81" x2="96" y2="39" stroke="${C.paper}" stroke-width="${OUT}" stroke-linecap="round"/>`,
      `<path d="M60 30 l-8 8 m8 -8 l8 8" fill="none" stroke="${C.paper}" stroke-width="${LINE}" stroke-linecap="round"/>`,
      `<path d="M60 90 l-8 -8 m8 8 l8 -8" fill="none" stroke="${C.paper}" stroke-width="${LINE}" stroke-linecap="round"/>`,
      `<circle cx="60" cy="60" r="6" fill="${C.cream}" stroke="${C.ink}" stroke-width="2"/>`,
    ].join(''), { viewBox: [120, 120] }),

    mkSticker('rainbow-arc', 'Rainbow', [
      `<path d="M14 96 a46 46 0 0 1 92 0" fill="none" stroke="${C.red}" stroke-width="8" stroke-linecap="round"/>`,
      `<path d="M24 96 a36 36 0 0 1 72 0" fill="none" stroke="${C.gold}" stroke-width="8" stroke-linecap="round"/>`,
      `<path d="M34 96 a26 26 0 0 1 52 0" fill="none" stroke="${C.green}" stroke-width="8" stroke-linecap="round"/>`,
      `<path d="M44 96 a16 16 0 0 1 32 0" fill="none" stroke="${C.blue}" stroke-width="8" stroke-linecap="round"/>`,
      `<path d="M14 96 a46 46 0 0 1 92 0" fill="none" stroke="${C.ink}" stroke-width="2"/>`,
      `<path d="M44 96 a16 16 0 0 1 32 0" fill="none" stroke="${C.ink}" stroke-width="2"/>`,
    ].join(''), { viewBox: [120, 104] }),

    mkSticker('lightning-cloud', 'Storm bolt', [
      `<path d="M28 50 a18 18 0 0 1 4 -35 a24 24 0 0 1 46 -4 a16 16 0 0 1 5 39 Z" fill="${C.navy}" stroke="${C.ink}" stroke-width="${OUT}" stroke-linejoin="round"/>`,
      `<path d="M58 56 L42 86 H56 L48 110 L78 72 H62 L72 56 Z" fill="${C.gold}" stroke="${C.ink}" stroke-width="${LINE}" stroke-linejoin="round"/>`,
    ].join(''), { viewBox: [120, 118] }),

    mkSticker('sunset-hill', 'Sunset', [
      disc(60, 60, 46, C.orange),
      `<circle cx="60" cy="52" r="18" fill="${C.gold}" stroke="${C.ink}" stroke-width="${LINE}"/>`,
      `<line x1="30" y1="46" x2="90" y2="46" stroke="${C.orange}" stroke-width="2"/>`,
      `<line x1="34" y1="54" x2="86" y2="54" stroke="${C.orange}" stroke-width="2"/>`,
      `<path d="M16 84 q24 -22 44 -6 q22 16 44 -2 v30 h-88 z" fill="${C.green}" stroke="${C.ink}" stroke-width="${OUT}" stroke-linejoin="round"/>`,
    ].join(''), { viewBox: [120, 120] }),

    mkSticker('snow-mountain', 'Mountain', [
      `<path d="M10 102 L44 30 L66 72 L80 48 L110 102 Z" fill="${C.navy}" stroke="${C.ink}" stroke-width="${OUT}" stroke-linejoin="round"/>`,
      `<path d="M36 46 L44 30 L54 50 L46 56 L40 50 Z" fill="${C.paper}" stroke="${C.ink}" stroke-width="2" stroke-linejoin="round"/>`,
      `<path d="M73 60 L80 48 L90 66 L82 64 Z" fill="${C.paper}" stroke="${C.ink}" stroke-width="2" stroke-linejoin="round"/>`,
      `<circle cx="92" cy="30" r="11" fill="${C.gold}" stroke="${C.ink}" stroke-width="2"/>`,
    ].join(''), { viewBox: [120, 112] }),

    mkSticker('ocean-wave', 'Wave', [
      disc(60, 60, 46, C.teal),
      `<path d="M18 70 C30 46 48 44 56 60 C62 72 78 72 84 58 C90 46 100 48 102 60 C92 56 88 66 80 70 C70 76 58 70 56 62 C52 50 38 52 32 66 C28 76 22 74 18 70 Z" fill="${C.blue}" stroke="${C.ink}" stroke-width="${OUT}" stroke-linejoin="round"/>`,
      `<path d="M24 80 q18 -6 36 0 q18 6 36 0" fill="none" stroke="${C.paper}" stroke-width="${LINE}" stroke-linecap="round"/>`,
    ].join(''), { viewBox: [120, 120] }),

    mkSticker('campfire', 'Campfire', [
      `<path d="M60 16 C46 34 50 46 58 54 C50 52 46 44 46 38 C36 50 38 78 60 88 C82 78 84 50 74 38 C74 46 70 52 62 54 C70 46 74 34 60 16 Z" fill="${C.orange}" stroke="${C.ink}" stroke-width="${OUT}" stroke-linejoin="round"/>`,
      `<path d="M56 50 q4 -14 8 -18 q6 12 0 24 q-6 -2 -8 -6 z" fill="${C.gold}"/>`,
      `<path d="M24 100 L96 84" stroke="${C.brown}" stroke-width="${OUT}" stroke-linecap="round"/>`,
      `<path d="M96 100 L24 84" stroke="${C.brown}" stroke-width="${OUT}" stroke-linecap="round"/>`,
    ].join(''), { viewBox: [120, 112] }),

    mkSticker('umbrella-rain', 'Umbrella', [
      `<path d="M16 56 a44 44 0 0 1 88 0 Z" fill="${C.red}" stroke="${C.ink}" stroke-width="${OUT}" stroke-linejoin="round"/>`,
      `<path d="M16 56 q14 -10 22 0 q14 -10 22 0 q14 -10 22 0 q14 -10 22 0" fill="none" stroke="${C.ink}" stroke-width="2"/>`,
      `<line x1="60" y1="56" x2="60" y2="98" stroke="${C.ink}" stroke-width="${OUT}"/>`,
      `<path d="M60 98 q0 12 -12 12" fill="none" stroke="${C.ink}" stroke-width="${OUT}" stroke-linecap="round"/>`,
      `<line x1="30" y1="76" x2="26" y2="92" stroke="${C.blue}" stroke-width="${LINE}" stroke-linecap="round"/>`,
      `<line x1="92" y1="76" x2="88" y2="92" stroke="${C.blue}" stroke-width="${LINE}" stroke-linecap="round"/>`,
    ].join(''), { viewBox: [120, 116] }),

    mkSticker('moon-stars', 'Night sky', [
      disc(60, 60, 46, C.plum),
      `<path d="M70 32 A32 32 0 1 0 70 88 A24 24 0 1 1 70 32 Z" fill="${C.gold}" stroke="${C.ink}" stroke-width="${OUT}" stroke-linejoin="round"/>`,
      `<path d="M38 38 L41 46 L49 46 L43 51 L45 59 L38 54 L31 59 L33 51 L27 46 L35 46 Z" fill="${C.cream}" stroke="${C.ink}" stroke-width="2" stroke-linejoin="round"/>`,
      `<circle cx="40" cy="78" r="3" fill="${C.cream}"/>`,
      `<circle cx="78" cy="92" r="2" fill="${C.cream}"/>`,
    ].join(''), { viewBox: [120, 120] }),

    mkSticker('tornado', 'Tornado', [
      `<path d="M16 22 H104 M22 38 H98 M30 54 H88 M40 70 H76 M48 86 H66" fill="none" stroke="${C.navy}" stroke-width="${OUT}" stroke-linecap="round"/>`,
      `<path d="M16 22 Q60 30 104 22 Q74 46 98 38 Q56 50 88 54 Q52 64 76 70 Q50 78 66 86 L56 104" fill="none" stroke="${C.ink}" stroke-width="${LINE}" stroke-linecap="round" stroke-linejoin="round"/>`,
      `<path d="M56 86 L52 104 L60 100 Z" fill="${C.brown}" stroke="${C.ink}" stroke-width="2"/>`,
    ].join(''), { viewBox: [120, 112] }),

    mkSticker('autumn-leaf', 'Autumn leaf', [
      `<path d="M60 12 C30 30 22 64 30 96 C58 86 90 70 96 36 C82 44 70 42 60 12 Z" fill="${C.orange}" stroke="${C.ink}" stroke-width="${OUT}" stroke-linejoin="round"/>`,
      `<path d="M52 88 Q56 52 80 34" fill="none" stroke="${C.brown}" stroke-width="${LINE}" stroke-linecap="round"/>`,
      `<path d="M60 64 L74 54 M56 76 L66 70 M64 50 L78 44" fill="none" stroke="${C.red}" stroke-width="2" stroke-linecap="round"/>`,
      `<path d="M30 96 L24 110" stroke="${C.brown}" stroke-width="${LINE}" stroke-linecap="round"/>`,
    ].join(''), { viewBox: [120, 116] }),
  ],
};
