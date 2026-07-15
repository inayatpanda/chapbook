// Science stickers — retro die-cut. TARGET: ~12 (currently 4 migrated).
// Style: see ./_style.js. Author with mkSticker/RETRO/frame/primitives so every
// sticker is cohesive + sanitise-clean. Append to the `stickers` array below.
import { mkSticker, RETRO as C, OUT, LINE } from './_style.js';

export default {
  genre: 'science',
  label: 'Science',
  stickers: [
    mkSticker('atom', 'Atom', [
      `<ellipse cx="60" cy="60" rx="48" ry="20" fill="none" stroke="${C.blue}" stroke-width="${OUT}"/>`,
      `<ellipse cx="60" cy="60" rx="48" ry="20" fill="none" stroke="${C.teal}" stroke-width="${LINE}" transform="rotate(60 60 60)"/>`,
      `<ellipse cx="60" cy="60" rx="48" ry="20" fill="none" stroke="${C.red}" stroke-width="${LINE}" transform="rotate(-60 60 60)"/>`,
      `<circle cx="60" cy="60" r="9" fill="${C.gold}" stroke="${C.ink}" stroke-width="${LINE}"/>`,
    ].join(''), { viewBox: [120, 120] }),

    mkSticker('beaker', 'Beaker / flask', [
      `<path d="M40 16 L40 48 L18 100 a8 8 0 0 0 7 12 L75 112 a8 8 0 0 0 7 -12 L60 48 L60 16 Z" fill="${C.paper}" stroke="${C.ink}" stroke-width="${OUT}" stroke-linejoin="round"/>`,
      `<path d="M28 78 L72 78 L80 96 a8 8 0 0 1 -7 12 L25 108 a8 8 0 0 1 -7 -12 Z" fill="${C.teal}" stroke="${C.ink}" stroke-width="${LINE}" stroke-linejoin="round"/>`,
      `<rect x="36" y="10" width="28" height="8" rx="3" fill="${C.gold}" stroke="${C.ink}" stroke-width="2"/>`,
      `<circle cx="40" cy="92" r="3" fill="${C.paper}"/>`,
      `<circle cx="56" cy="98" r="2.5" fill="${C.paper}"/>`,
    ].join(''), { viewBox: [100, 120] }),

    mkSticker('dna', 'DNA helix', [
      `<path d="M24 14 C 64 40 16 64 56 90 C 64 96 64 110 60 120" fill="none" stroke="${C.red}" stroke-width="${OUT}" stroke-linecap="round"/>`,
      `<path d="M56 14 C 16 40 64 64 24 90 C 16 96 16 110 20 120" fill="none" stroke="${C.blue}" stroke-width="${OUT}" stroke-linecap="round"/>`,
      `<line x1="30" y1="28" x2="50" y2="28" stroke="${C.gold}" stroke-width="${LINE}"/>`,
      `<line x1="26" y1="50" x2="54" y2="50" stroke="${C.teal}" stroke-width="${LINE}"/>`,
      `<line x1="30" y1="72" x2="50" y2="72" stroke="${C.gold}" stroke-width="${LINE}"/>`,
      `<line x1="28" y1="98" x2="52" y2="98" stroke="${C.teal}" stroke-width="${LINE}"/>`,
    ].join(''), { viewBox: [80, 130] }),

    mkSticker('rocket', 'Rocket', [
      `<path d="M45 12 C 66 32 66 64 60 86 L30 86 C 24 64 24 32 45 12 Z" fill="${C.paper}" stroke="${C.ink}" stroke-width="${OUT}" stroke-linejoin="round"/>`,
      `<circle cx="45" cy="44" r="9" fill="${C.blue}" stroke="${C.ink}" stroke-width="${LINE}"/>`,
      `<path d="M30 86 L16 104 L30 96 Z" fill="${C.red}" stroke="${C.ink}" stroke-width="${LINE}" stroke-linejoin="round"/>`,
      `<path d="M60 86 L74 104 L60 96 Z" fill="${C.red}" stroke="${C.ink}" stroke-width="${LINE}" stroke-linejoin="round"/>`,
      `<path d="M38 96 L52 96 L46 122 Z" fill="${C.orange}" stroke="${C.ink}" stroke-width="${LINE}" stroke-linejoin="round"/>`,
    ].join(''), { viewBox: [90, 130] }),

    mkSticker('microscope', 'Microscope', [
      `<rect x="24" y="100" width="72" height="12" rx="5" fill="${C.navy}" stroke="${C.ink}" stroke-width="${OUT}"/>`,
      `<path d="M52 28 C 30 38 26 70 38 92 L52 86 C 44 70 46 46 60 40 Z" fill="${C.teal}" stroke="${C.ink}" stroke-width="${OUT}" stroke-linejoin="round"/>`,
      `<rect x="48" y="20" width="22" height="16" rx="5" fill="${C.gold}" stroke="${C.ink}" stroke-width="${LINE}"/>`,
      `<rect x="56" y="36" width="8" height="40" fill="${C.cream}" stroke="${C.ink}" stroke-width="2"/>`,
      `<rect x="42" y="88" width="40" height="8" fill="${C.red}" stroke="${C.ink}" stroke-width="${LINE}"/>`,
      `<circle cx="60" cy="92" r="4" fill="${C.paper}" stroke="${C.ink}" stroke-width="2"/>`,
    ].join(''), { viewBox: [120, 120] }),

    mkSticker('magnet', 'Horseshoe magnet', [
      `<path d="M30 96 L30 56 a30 30 0 0 1 60 0 L90 96 L66 96 L66 56 a6 6 0 0 0 -12 0 L54 96 Z" fill="${C.red}" stroke="${C.ink}" stroke-width="${OUT}" stroke-linejoin="round"/>`,
      `<rect x="28" y="96" width="26" height="16" fill="${C.cream}" stroke="${C.ink}" stroke-width="${LINE}"/>`,
      `<rect x="66" y="96" width="26" height="16" fill="${C.cream}" stroke="${C.ink}" stroke-width="${LINE}"/>`,
      `<path d="M16 40 l10 6 -10 6" fill="none" stroke="${C.blue}" stroke-width="${LINE}" stroke-linecap="round" stroke-linejoin="round"/>`,
      `<path d="M104 40 l-10 6 10 6" fill="none" stroke="${C.blue}" stroke-width="${LINE}" stroke-linecap="round" stroke-linejoin="round"/>`,
    ].join(''), { viewBox: [120, 120] }),

    mkSticker('lightbulb', 'Bright idea', [
      `<path d="M60 14 C 32 14 22 44 38 66 C 46 76 46 84 46 92 L74 92 C 74 84 74 76 82 66 C 98 44 88 14 60 14 Z" fill="${C.gold}" stroke="${C.ink}" stroke-width="${OUT}" stroke-linejoin="round"/>`,
      `<rect x="46" y="92" width="28" height="10" fill="${C.cream}" stroke="${C.ink}" stroke-width="${LINE}"/>`,
      `<rect x="48" y="102" width="24" height="8" fill="${C.brown}" stroke="${C.ink}" stroke-width="2"/>`,
      `<path d="M54 58 L60 40 L66 58 L60 70 Z" fill="${C.red}" stroke="${C.ink}" stroke-width="2" stroke-linejoin="round"/>`,
      `<line x1="20" y1="34" x2="30" y2="40" stroke="${C.orange}" stroke-width="${LINE}" stroke-linecap="round"/>`,
      `<line x1="100" y1="34" x2="90" y2="40" stroke="${C.orange}" stroke-width="${LINE}" stroke-linecap="round"/>`,
      `<line x1="60" y1="6" x2="60" y2="14" stroke="${C.orange}" stroke-width="${LINE}" stroke-linecap="round"/>`,
    ].join(''), { viewBox: [120, 120] }),

    mkSticker('gear', 'Cog wheel', [
      `<path d="M60 8 l8 12 16 -4 4 16 14 6 -6 14 6 14 -14 6 -4 16 -16 -4 -8 12 -8 -12 -16 4 -4 -16 -14 -6 6 -14 -6 -14 14 -6 4 -16 16 4 Z" fill="${C.teal}" stroke="${C.ink}" stroke-width="${OUT}" stroke-linejoin="round"/>`,
      `<circle cx="60" cy="60" r="20" fill="${C.cream}" stroke="${C.ink}" stroke-width="${LINE}"/>`,
      `<circle cx="60" cy="60" r="8" fill="${C.gold}" stroke="${C.ink}" stroke-width="2"/>`,
    ].join(''), { viewBox: [120, 120] }),

    mkSticker('telescope', 'Telescope', [
      `<path d="M16 78 L84 30 L98 48 L34 100 Z" fill="${C.navy}" stroke="${C.ink}" stroke-width="${OUT}" stroke-linejoin="round"/>`,
      `<path d="M80 26 L102 42 L96 52 L74 36 Z" fill="${C.gold}" stroke="${C.ink}" stroke-width="${LINE}" stroke-linejoin="round"/>`,
      `<rect x="44" y="56" width="14" height="10" fill="${C.red}" stroke="${C.ink}" stroke-width="2" transform="rotate(-35 51 61)"/>`,
      `<path d="M40 96 L34 116 M48 100 L62 114" fill="none" stroke="${C.ink}" stroke-width="${OUT}" stroke-linecap="round"/>`,
      `<circle cx="100" cy="18" r="3" fill="${C.gold}"/>`,
      `<circle cx="88" cy="12" r="2" fill="${C.gold}"/>`,
    ].join(''), { viewBox: [120, 120] }),

    mkSticker('molecule', 'Benzene ring', [
      `<path d="M60 16 L96 38 L96 82 L60 104 L24 82 L24 38 Z" fill="${C.cream}" stroke="${C.ink}" stroke-width="${OUT}" stroke-linejoin="round"/>`,
      `<circle cx="60" cy="60" r="20" fill="none" stroke="${C.teal}" stroke-width="${LINE}"/>`,
      `<circle cx="60" cy="16" r="7" fill="${C.red}" stroke="${C.ink}" stroke-width="2"/>`,
      `<circle cx="96" cy="38" r="7" fill="${C.blue}" stroke="${C.ink}" stroke-width="2"/>`,
      `<circle cx="96" cy="82" r="7" fill="${C.gold}" stroke="${C.ink}" stroke-width="2"/>`,
      `<circle cx="60" cy="104" r="7" fill="${C.red}" stroke="${C.ink}" stroke-width="2"/>`,
      `<circle cx="24" cy="82" r="7" fill="${C.blue}" stroke="${C.ink}" stroke-width="2"/>`,
      `<circle cx="24" cy="38" r="7" fill="${C.gold}" stroke="${C.ink}" stroke-width="2"/>`,
    ].join(''), { viewBox: [120, 120] }),

    mkSticker('prism', 'Prism + light', [
      `<path d="M58 18 L98 92 L18 92 Z" fill="${C.navy}" stroke="${C.ink}" stroke-width="${OUT}" stroke-linejoin="round"/>`,
      `<line x1="6" y1="52" x2="50" y2="56" stroke="${C.paper}" stroke-width="${LINE}" stroke-linecap="round"/>`,
      `<line x1="60" y1="58" x2="112" y2="44" stroke="${C.red}" stroke-width="2" stroke-linecap="round"/>`,
      `<line x1="60" y1="60" x2="112" y2="54" stroke="${C.orange}" stroke-width="2" stroke-linecap="round"/>`,
      `<line x1="60" y1="62" x2="112" y2="64" stroke="${C.gold}" stroke-width="2" stroke-linecap="round"/>`,
      `<line x1="60" y1="64" x2="112" y2="74" stroke="${C.teal}" stroke-width="2" stroke-linecap="round"/>`,
      `<line x1="60" y1="66" x2="112" y2="84" stroke="${C.blue}" stroke-width="2" stroke-linecap="round"/>`,
    ].join(''), { viewBox: [120, 120] }),

    mkSticker('magnifier', 'Magnifying glass', [
      `<circle cx="50" cy="48" r="34" fill="${C.cream}" stroke="${C.ink}" stroke-width="${OUT}"/>`,
      `<circle cx="50" cy="48" r="24" fill="${C.blue}" stroke="${C.ink}" stroke-width="${LINE}"/>`,
      `<path d="M40 38 a16 16 0 0 1 14 -6" fill="none" stroke="${C.paper}" stroke-width="${LINE}" stroke-linecap="round"/>`,
      `<rect x="72" y="74" width="16" height="40" rx="7" fill="${C.brown}" stroke="${C.ink}" stroke-width="${OUT}" transform="rotate(-45 80 94)"/>`,
    ].join(''), { viewBox: [120, 120] }),
  ],
};
