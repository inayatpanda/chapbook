// Monuments stickers — retro die-cut. TARGET: ~12 (currently 4 migrated).
// Style: see ./_style.js. Author with mkSticker/RETRO/frame/primitives so every
// sticker is cohesive + sanitise-clean. Append to the `stickers` array below.
import { mkSticker, RETRO as C, OUT, LINE, disc } from './_style.js';

export default {
  genre: 'monuments',
  label: 'Monuments',
  stickers: [
    mkSticker('classical-column', 'Classical column', [
      `<rect x="14" y="108" width="62" height="14" rx="2" fill="${C.cream}" stroke="${C.ink}" stroke-width="${OUT}"/>`,
      `<rect x="22" y="30" width="46" height="78" fill="${C.paper}" stroke="${C.ink}" stroke-width="${OUT}"/>`,
      `<line x1="33" y1="34" x2="33" y2="104" stroke="${C.ink}" stroke-width="${LINE}"/>`,
      `<line x1="45" y1="34" x2="45" y2="104" stroke="${C.ink}" stroke-width="${LINE}"/>`,
      `<line x1="57" y1="34" x2="57" y2="104" stroke="${C.ink}" stroke-width="${LINE}"/>`,
      `<rect x="12" y="14" width="66" height="16" rx="3" fill="${C.cream}" stroke="${C.ink}" stroke-width="${OUT}"/>`,
      `<path d="M22 30 q-8 0 -8 -8 M68 30 q8 0 8 -8" fill="none" stroke="${C.ink}" stroke-width="${LINE}"/>`,
    ].join(''), { viewBox: [90, 130] }),

    mkSticker('roman-arch', 'Roman arch', [
      `<path d="M16 110 L16 50 A44 44 0 0 1 104 50 L104 110" fill="${C.paper}" stroke="${C.ink}" stroke-width="${OUT}" stroke-linejoin="round"/>`,
      `<path d="M40 110 L40 56 A20 20 0 0 1 80 56 L80 110 Z" fill="${C.navy}" stroke="${C.ink}" stroke-width="${LINE}"/>`,
      `<rect x="10" y="106" width="100" height="10" rx="2" fill="${C.cream}" stroke="${C.ink}" stroke-width="${OUT}"/>`,
      `<path d="M60 14 l6 12 -12 0 z" fill="${C.gold}" stroke="${C.ink}" stroke-width="2"/>`,
    ].join(''), { viewBox: [120, 120] }),

    mkSticker('obelisk', 'Obelisk', [
      `<rect x="22" y="112" width="36" height="12" rx="2" fill="${C.cream}" stroke="${C.ink}" stroke-width="${OUT}"/>`,
      `<path d="M40 14 L54 30 L52 112 L28 112 L26 30 Z" fill="${C.gold}" stroke="${C.ink}" stroke-width="${OUT}" stroke-linejoin="round"/>`,
      `<path d="M40 14 L54 30 L40 30 Z" fill="${C.orange}" stroke="${C.ink}" stroke-width="2"/>`,
      `<line x1="40" y1="34" x2="40" y2="106" stroke="${C.ink}" stroke-width="${LINE}" stroke-dasharray="3 7"/>`,
    ].join(''), { viewBox: [80, 130] }),

    mkSticker('landmark-badge', 'Landmark badge', [
      disc(60, 60, 46, C.teal),
      // a little hill + flag
      `<path d="M24 84 q20 -34 36 -34 q16 0 36 34 Z" fill="${C.green}" stroke="${C.ink}" stroke-width="${LINE}" stroke-linejoin="round"/>`,
      `<line x1="60" y1="50" x2="60" y2="30" stroke="${C.ink}" stroke-width="${LINE}"/>`,
      `<path d="M60 30 l16 6 -16 6 z" fill="${C.red}" stroke="${C.ink}" stroke-width="2"/>`,
      `<text x="60" y="100" text-anchor="middle" font-family="Georgia, serif" font-weight="700" font-size="11" fill="${C.paper}" letter-spacing="1">VISITED</text>`,
    ].join(''), { viewBox: [120, 120] }),

    mkSticker('pyramid-sun', 'Pyramid & sun', [
      `<circle cx="84" cy="34" r="16" fill="${C.gold}" stroke="${C.ink}" stroke-width="${OUT}"/>`,
      `<path d="M22 104 L60 38 L98 104 Z" fill="${C.orange}" stroke="${C.ink}" stroke-width="${OUT}" stroke-linejoin="round"/>`,
      `<path d="M60 38 L40 104 L60 104 Z" fill="${C.gold}"/>`,
      `<line x1="60" y1="38" x2="60" y2="104" stroke="${C.ink}" stroke-width="${LINE}"/>`,
      `<line x1="12" y1="104" x2="108" y2="104" stroke="${C.ink}" stroke-width="${OUT}" stroke-linecap="round"/>`,
    ].join(''), { viewBox: [120, 116] }),

    mkSticker('iron-tower', 'Iron tower', [
      `<path d="M44 18 L48 50 L36 96 L24 116 L96 116 L84 96 L72 50 L76 18 Z" fill="${C.brown}" stroke="${C.ink}" stroke-width="${OUT}" stroke-linejoin="round"/>`,
      `<path d="M40 62 L80 62 L88 84 L32 84 Z" fill="none" stroke="${C.ink}" stroke-width="${LINE}"/>`,
      `<line x1="48" y1="50" x2="72" y2="50" stroke="${C.ink}" stroke-width="${LINE}"/>`,
      `<path d="M36 96 L60 84 L84 96" fill="none" stroke="${C.ink}" stroke-width="${LINE}"/>`,
      `<line x1="60" y1="18" x2="60" y2="116" stroke="${C.ink}" stroke-width="2"/>`,
      `<rect x="50" y="14" width="20" height="6" fill="${C.gold}" stroke="${C.ink}" stroke-width="2"/>`,
    ].join(''), { viewBox: [120, 124] }),

    mkSticker('clock-tower', 'Clock tower', [
      `<rect x="38" y="40" width="44" height="84" fill="${C.cream}" stroke="${C.ink}" stroke-width="${OUT}"/>`,
      `<path d="M34 40 L60 12 L86 40 Z" fill="${C.green}" stroke="${C.ink}" stroke-width="${OUT}" stroke-linejoin="round"/>`,
      `<circle cx="60" cy="62" r="15" fill="${C.paper}" stroke="${C.ink}" stroke-width="${LINE}"/>`,
      `<line x1="60" y1="62" x2="60" y2="52" stroke="${C.ink}" stroke-width="2"/>`,
      `<line x1="60" y1="62" x2="68" y2="66" stroke="${C.ink}" stroke-width="2"/>`,
      `<rect x="50" y="92" width="20" height="32" rx="9" fill="${C.navy}" stroke="${C.ink}" stroke-width="${LINE}"/>`,
      `<line x1="60" y1="12" x2="60" y2="4" stroke="${C.ink}" stroke-width="2"/>`,
    ].join(''), { viewBox: [120, 130] }),

    mkSticker('leaning-tower', 'Leaning tower', [
      `<path d="M46 116 L52 22 L74 24 L70 116 Z" fill="${C.paper}" stroke="${C.ink}" stroke-width="${OUT}" stroke-linejoin="round"/>`,
      `<line x1="50" y1="42" x2="72" y2="44" stroke="${C.ink}" stroke-width="2"/>`,
      `<line x1="49" y1="60" x2="71" y2="62" stroke="${C.ink}" stroke-width="2"/>`,
      `<line x1="48" y1="78" x2="70" y2="80" stroke="${C.ink}" stroke-width="2"/>`,
      `<line x1="47" y1="96" x2="70" y2="98" stroke="${C.ink}" stroke-width="2"/>`,
      `<path d="M50 22 L52 14 L72 16 L74 24 Z" fill="${C.teal}" stroke="${C.ink}" stroke-width="${LINE}" stroke-linejoin="round"/>`,
      `<rect x="38" y="116" width="40" height="8" rx="2" fill="${C.cream}" stroke="${C.ink}" stroke-width="${OUT}"/>`,
    ].join(''), { viewBox: [110, 130] }),

    mkSticker('domed-palace', 'Domed palace', [
      `<rect x="20" y="74" width="80" height="46" fill="${C.paper}" stroke="${C.ink}" stroke-width="${OUT}"/>`,
      `<path d="M40 74 a20 26 0 0 1 40 0 Z" fill="${C.cream}" stroke="${C.ink}" stroke-width="${OUT}" stroke-linejoin="round"/>`,
      `<line x1="60" y1="48" x2="60" y2="36" stroke="${C.ink}" stroke-width="2"/>`,
      `<circle cx="60" cy="32" r="5" fill="${C.gold}" stroke="${C.ink}" stroke-width="2"/>`,
      `<path d="M50 120 L50 96 a10 12 0 0 1 20 0 L70 120 Z" fill="${C.teal}" stroke="${C.ink}" stroke-width="${LINE}"/>`,
      `<path d="M22 74 a6 14 0 0 1 12 0 Z" fill="${C.cream}" stroke="${C.ink}" stroke-width="2"/>`,
      `<path d="M86 74 a6 14 0 0 1 12 0 Z" fill="${C.cream}" stroke="${C.ink}" stroke-width="2"/>`,
    ].join(''), { viewBox: [120, 124] }),

    mkSticker('liberty-torch', 'Liberty torch', [
      `<path d="M52 116 L48 60 L72 60 L68 116 Z" fill="${C.teal}" stroke="${C.ink}" stroke-width="${OUT}" stroke-linejoin="round"/>`,
      `<rect x="44" y="50" width="32" height="12" rx="3" fill="${C.teal}" stroke="${C.ink}" stroke-width="${LINE}"/>`,
      `<path d="M52 50 L56 30 L64 30 L68 50 Z" fill="${C.cream}" stroke="${C.ink}" stroke-width="${LINE}" stroke-linejoin="round"/>`,
      `<path d="M60 30 C50 18 56 8 60 4 C64 8 70 18 60 30 Z" fill="${C.gold}" stroke="${C.ink}" stroke-width="${LINE}" stroke-linejoin="round"/>`,
      `<line x1="40" y1="116" x2="80" y2="116" stroke="${C.ink}" stroke-width="${OUT}" stroke-linecap="round"/>`,
    ].join(''), { viewBox: [120, 124] }),

    mkSticker('stone-trilithon', 'Stonehenge', [
      `<rect x="22" y="48" width="20" height="68" rx="3" fill="${C.cream}" stroke="${C.ink}" stroke-width="${OUT}"/>`,
      `<rect x="78" y="48" width="20" height="68" rx="3" fill="${C.cream}" stroke="${C.ink}" stroke-width="${OUT}"/>`,
      `<rect x="14" y="28" width="92" height="22" rx="3" fill="${C.brown}" stroke="${C.ink}" stroke-width="${OUT}"/>`,
      `<line x1="32" y1="56" x2="30" y2="108" stroke="${C.ink}" stroke-width="2"/>`,
      `<line x1="88" y1="56" x2="90" y2="108" stroke="${C.ink}" stroke-width="2"/>`,
      `<line x1="10" y1="116" x2="110" y2="116" stroke="${C.ink}" stroke-width="${OUT}" stroke-linecap="round"/>`,
      `<circle cx="92" cy="18" r="9" fill="${C.gold}" stroke="${C.ink}" stroke-width="2"/>`,
    ].join(''), { viewBox: [120, 122] }),

    mkSticker('tiered-pagoda', 'Pagoda temple', [
      `<rect x="48" y="98" width="24" height="22" fill="${C.cream}" stroke="${C.ink}" stroke-width="${OUT}"/>`,
      `<path d="M28 98 q32 -14 64 0 q-6 -12 -16 -16 H44 q-10 4 -16 16 Z" fill="${C.red}" stroke="${C.ink}" stroke-width="${OUT}" stroke-linejoin="round"/>`,
      `<path d="M34 70 q26 -12 52 0 q-6 -12 -14 -16 H48 q-8 4 -14 16 Z" fill="${C.orange}" stroke="${C.ink}" stroke-width="${OUT}" stroke-linejoin="round"/>`,
      `<path d="M40 44 q20 -10 40 0 q-5 -12 -12 -18 H52 q-7 6 -12 18 Z" fill="${C.red}" stroke="${C.ink}" stroke-width="${OUT}" stroke-linejoin="round"/>`,
      `<line x1="60" y1="26" x2="60" y2="14" stroke="${C.ink}" stroke-width="2"/>`,
      `<circle cx="60" cy="11" r="5" fill="${C.gold}" stroke="${C.ink}" stroke-width="2"/>`,
      `<line x1="14" y1="120" x2="106" y2="120" stroke="${C.ink}" stroke-width="${OUT}" stroke-linecap="round"/>`,
    ].join(''), { viewBox: [120, 126] }),
  ],
};
