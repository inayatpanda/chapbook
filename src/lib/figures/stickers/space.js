// Space stickers — retro die-cut. TARGET: 12.
//
// Style rules (see ./_style.js): author each sticker with
//   import { mkSticker, RETRO, frame, path, circle, rect, line, text } from './_style.js';
// Decorative colour is fine, but every sticker MUST be self-contained inline SVG
// that passes sanitise() UNCHANGED — NO <script>/on*/<foreignObject>/href/url()/
// external refs/SMIL. mkSticker() asserts this for you. Append to `stickers` below.
//
// Ideas: ringed planet (Saturn), crescent moon, shooting star, UFO, astronaut
// helmet, satellite, telescope, comet, galaxy spiral, alien, constellation.
import { mkSticker, RETRO as C, OUT, LINE, disc } from './_style.js';

export default {
  genre: 'space',
  label: 'Space',
  stickers: [
    mkSticker('rocket-launch', 'Lift-off', [
      `<path d="M60 10 C44 26 38 50 38 76 H82 C82 50 76 26 60 10 Z" fill="${C.paper}" stroke="${C.ink}" stroke-width="${OUT}" stroke-linejoin="round"/>`,
      `<circle cx="60" cy="44" r="11" fill="${C.blue}" stroke="${C.ink}" stroke-width="${LINE}"/>`,
      `<path d="M38 64 L20 86 L40 78 Z" fill="${C.red}" stroke="${C.ink}" stroke-width="${LINE}" stroke-linejoin="round"/>`,
      `<path d="M82 64 L100 86 L80 78 Z" fill="${C.red}" stroke="${C.ink}" stroke-width="${LINE}" stroke-linejoin="round"/>`,
      `<path d="M50 76 H70 L64 100 L60 92 L56 100 Z" fill="${C.orange}" stroke="${C.ink}" stroke-width="${LINE}" stroke-linejoin="round"/>`,
      `<path d="M56 100 L60 116 L64 100" fill="${C.gold}" stroke="${C.ink}" stroke-width="2"/>`,
    ].join(''), { viewBox: [120, 120] }),

    mkSticker('ringed-planet', 'Saturn', [
      disc(60, 60, 46, C.navy),
      `<ellipse cx="60" cy="60" rx="60" ry="18" fill="none" stroke="${C.gold}" stroke-width="${OUT}" transform="rotate(-18 60 60)"/>`,
      `<circle cx="60" cy="60" r="26" fill="${C.orange}" stroke="${C.ink}" stroke-width="${OUT}"/>`,
      `<path d="M40 54 q20 8 40 0" fill="none" stroke="${C.gold}" stroke-width="2"/>`,
      `<path d="M44 68 q16 6 32 0" fill="none" stroke="${C.gold}" stroke-width="2"/>`,
    ].join(''), { viewBox: [120, 120] }),

    mkSticker('five-point-star', 'Star', [
      `<path d="M60 12 L73 46 L110 48 L80 70 L91 106 L60 84 L29 106 L40 70 L10 48 L47 46 Z" fill="${C.gold}" stroke="${C.ink}" stroke-width="${OUT}" stroke-linejoin="round"/>`,
      `<path d="M60 32 L67 50 L60 62 L53 50 Z" fill="${C.orange}"/>`,
    ].join(''), { viewBox: [120, 118] }),

    mkSticker('crescent-moon', 'Crescent moon', [
      disc(60, 60, 46, C.navy),
      `<path d="M74 24 A40 40 0 1 0 74 96 A30 30 0 1 1 74 24 Z" fill="${C.gold}" stroke="${C.ink}" stroke-width="${OUT}" stroke-linejoin="round"/>`,
      `<circle cx="54" cy="44" r="4" fill="${C.cream}"/>`,
      `<circle cx="50" cy="70" r="3" fill="${C.cream}"/>`,
    ].join(''), { viewBox: [120, 120] }),

    mkSticker('flying-saucer', 'UFO', [
      `<ellipse cx="60" cy="40" rx="20" ry="14" fill="${C.teal}" stroke="${C.ink}" stroke-width="${OUT}"/>`,
      `<ellipse cx="60" cy="56" rx="48" ry="18" fill="${C.blue}" stroke="${C.ink}" stroke-width="${OUT}"/>`,
      `<circle cx="40" cy="58" r="4" fill="${C.gold}" stroke="${C.ink}" stroke-width="2"/>`,
      `<circle cx="60" cy="62" r="4" fill="${C.gold}" stroke="${C.ink}" stroke-width="2"/>`,
      `<circle cx="80" cy="58" r="4" fill="${C.gold}" stroke="${C.ink}" stroke-width="2"/>`,
      `<path d="M48 72 L40 108 H80 L72 72" fill="${C.gold}" stroke="${C.ink}" stroke-width="2" opacity="0.85" stroke-linejoin="round"/>`,
    ].join(''), { viewBox: [120, 116] }),

    mkSticker('astronaut-helmet', 'Helmet', [
      `<circle cx="60" cy="60" r="48" fill="${C.paper}" stroke="${C.ink}" stroke-width="${OUT}"/>`,
      `<path d="M28 54 a32 26 0 0 1 64 0 v18 a32 22 0 0 1 -64 0 Z" fill="${C.navy}" stroke="${C.ink}" stroke-width="${OUT}"/>`,
      `<path d="M40 50 q14 -14 30 -6" fill="none" stroke="${C.teal}" stroke-width="${LINE}" stroke-linecap="round"/>`,
      `<rect x="14" y="52" width="10" height="20" rx="3" fill="${C.gold}" stroke="${C.ink}" stroke-width="2"/>`,
      `<rect x="96" y="52" width="10" height="20" rx="3" fill="${C.gold}" stroke="${C.ink}" stroke-width="2"/>`,
    ].join(''), { viewBox: [120, 120] }),

    mkSticker('comet', 'Comet', [
      `<path d="M12 104 Q52 64 92 28" fill="none" stroke="${C.teal}" stroke-width="${OUT}" stroke-linecap="round"/>`,
      `<path d="M20 96 Q56 68 88 40" fill="none" stroke="${C.gold}" stroke-width="${LINE}" stroke-linecap="round"/>`,
      `<circle cx="92" cy="28" r="16" fill="${C.orange}" stroke="${C.ink}" stroke-width="${OUT}"/>`,
      `<circle cx="88" cy="24" r="5" fill="${C.gold}"/>`,
    ].join(''), { viewBox: [120, 116] }),

    mkSticker('shooting-star', 'Shooting star', [
      // curved motion trail sweeping up from lower-left to the star at upper-right
      `<path d="M10 108 Q40 88 64 56" fill="none" stroke="${C.teal}" stroke-width="${OUT}" stroke-linecap="round"/>`,
      `<path d="M22 104 Q46 86 66 60" fill="none" stroke="${C.gold}" stroke-width="${LINE}" stroke-linecap="round"/>`,
      // the star itself, up and to the right
      `<path d="M82 14 L90 38 L116 40 L96 56 L103 82 L82 67 L61 82 L68 56 L48 40 L74 38 Z" fill="${C.gold}" stroke="${C.ink}" stroke-width="${OUT}" stroke-linejoin="round"/>`,
      `<path d="M82 30 L86 42 L82 50 L78 42 Z" fill="${C.orange}"/>`,
      // sparkles trailing along the path
      `<path d="M40 80 l3 7 7 3 -7 3 -3 7 -3 -7 -7 -3 7 -3 z" fill="${C.gold}" stroke="${C.ink}" stroke-width="2" stroke-linejoin="round"/>`,
      `<circle cx="22" cy="96" r="3" fill="${C.paper}" stroke="${C.ink}" stroke-width="2"/>`,
    ].join(''), { viewBox: [120, 120] }),

    mkSticker('satellite', 'Satellite', [
      `<rect x="46" y="44" width="28" height="32" rx="4" fill="${C.navy}" stroke="${C.ink}" stroke-width="${OUT}"/>`,
      `<rect x="10" y="48" width="30" height="24" rx="3" fill="${C.blue}" stroke="${C.ink}" stroke-width="${LINE}"/>`,
      `<rect x="80" y="48" width="30" height="24" rx="3" fill="${C.blue}" stroke="${C.ink}" stroke-width="${LINE}"/>`,
      `<line x1="25" y1="48" x2="25" y2="72" stroke="${C.ink}" stroke-width="2"/>`,
      `<line x1="95" y1="48" x2="95" y2="72" stroke="${C.ink}" stroke-width="2"/>`,
      `<path d="M60 44 q-2 -22 18 -30" fill="none" stroke="${C.ink}" stroke-width="${LINE}"/>`,
      `<circle cx="80" cy="12" r="7" fill="${C.gold}" stroke="${C.ink}" stroke-width="2"/>`,
    ].join(''), { viewBox: [120, 96] }),

    mkSticker('friendly-alien', 'Alien', [
      `<path d="M60 14 C32 14 24 40 30 64 C34 84 46 102 60 102 C74 102 86 84 90 64 C96 40 88 14 60 14 Z" fill="${C.green}" stroke="${C.ink}" stroke-width="${OUT}" stroke-linejoin="round"/>`,
      `<ellipse cx="46" cy="56" rx="9" ry="14" fill="${C.ink}"/>`,
      `<ellipse cx="74" cy="56" rx="9" ry="14" fill="${C.ink}"/>`,
      `<circle cx="48" cy="52" r="3" fill="${C.paper}"/>`,
      `<circle cx="76" cy="52" r="3" fill="${C.paper}"/>`,
      `<path d="M50 82 q10 8 20 0" fill="none" stroke="${C.ink}" stroke-width="${LINE}" stroke-linecap="round"/>`,
      `<line x1="48" y1="14" x2="42" y2="2" stroke="${C.ink}" stroke-width="${LINE}"/>`,
      `<line x1="72" y1="14" x2="78" y2="2" stroke="${C.ink}" stroke-width="${LINE}"/>`,
      `<circle cx="42" cy="2" r="4" fill="${C.gold}" stroke="${C.ink}" stroke-width="2"/>`,
      `<circle cx="78" cy="2" r="4" fill="${C.gold}" stroke="${C.ink}" stroke-width="2"/>`,
    ].join(''), { viewBox: [120, 112] }),

    mkSticker('spiral-galaxy', 'Galaxy', [
      disc(60, 60, 46, C.plum),
      `<path d="M60 60 q24 -8 30 14 q4 24 -24 26 q-30 0 -34 -28 q-2 -32 32 -36 q34 -2 38 30" fill="none" stroke="${C.pink}" stroke-width="${OUT}" stroke-linecap="round"/>`,
      `<path d="M60 60 q-22 8 -28 -12" fill="none" stroke="${C.gold}" stroke-width="${LINE}" stroke-linecap="round"/>`,
      `<circle cx="60" cy="60" r="8" fill="${C.gold}" stroke="${C.ink}" stroke-width="2"/>`,
      `<circle cx="30" cy="40" r="2" fill="${C.paper}"/>`,
      `<circle cx="92" cy="80" r="2" fill="${C.paper}"/>`,
    ].join(''), { viewBox: [120, 120] }),

    mkSticker('blazing-sun', 'Blazing sun', [
      `<circle cx="60" cy="60" r="30" fill="${C.gold}" stroke="${C.ink}" stroke-width="${OUT}"/>`,
      `<circle cx="60" cy="60" r="18" fill="${C.orange}" stroke="${C.ink}" stroke-width="${LINE}"/>`,
      `<path d="M60 6 L66 26 H54 Z" fill="${C.gold}" stroke="${C.ink}" stroke-width="2" stroke-linejoin="round"/>`,
      `<path d="M60 114 L66 94 H54 Z" fill="${C.gold}" stroke="${C.ink}" stroke-width="2" stroke-linejoin="round"/>`,
      `<path d="M6 60 L26 54 V66 Z" fill="${C.gold}" stroke="${C.ink}" stroke-width="2" stroke-linejoin="round"/>`,
      `<path d="M114 60 L94 54 V66 Z" fill="${C.gold}" stroke="${C.ink}" stroke-width="2" stroke-linejoin="round"/>`,
      `<path d="M22 22 L40 34 L34 40 Z" fill="${C.gold}" stroke="${C.ink}" stroke-width="2" stroke-linejoin="round"/>`,
      `<path d="M98 22 L80 34 L86 40 Z" fill="${C.gold}" stroke="${C.ink}" stroke-width="2" stroke-linejoin="round"/>`,
      `<path d="M22 98 L40 86 L34 80 Z" fill="${C.gold}" stroke="${C.ink}" stroke-width="2" stroke-linejoin="round"/>`,
      `<path d="M98 98 L80 86 L86 80 Z" fill="${C.gold}" stroke="${C.ink}" stroke-width="2" stroke-linejoin="round"/>`,
    ].join(''), { viewBox: [120, 120] }),
  ],
};
