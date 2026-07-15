// Flora & fauna stickers — retro die-cut. TARGET: ~14 (currently 4 migrated).
// Style: see ./_style.js. Author with mkSticker/RETRO/frame/primitives so every
// sticker is cohesive + sanitise-clean. Append to the `stickers` array below.
import { mkSticker, RETRO as C, OUT, LINE } from './_style.js';

export default {
  genre: 'flora-fauna',
  label: 'Flora & fauna',
  stickers: [
    mkSticker('leaf', 'Leaf', [
      `<path d="M20 100 C 20 40 60 16 92 16 C 92 76 52 100 20 100 Z" fill="${C.green}" stroke="${C.ink}" stroke-width="${OUT}" stroke-linejoin="round"/>`,
      `<path d="M28 92 C 48 60 72 36 88 22" fill="none" stroke="${C.ink}" stroke-width="${LINE}" stroke-linecap="round"/>`,
      `<path d="M52 64 l16 -6 M44 76 l16 -8 M62 50 l14 -4" fill="none" stroke="${C.ink}" stroke-width="2" stroke-linecap="round"/>`,
    ].join(''), { viewBox: [110, 120] }),

    mkSticker('bird', 'Bird', [
      `<path d="M18 64 C 18 36 44 26 64 30 C 80 32 92 24 100 16 C 98 30 96 38 88 44 C 100 46 108 56 108 68 C 86 72 50 84 30 80 C 20 78 18 70 18 64 Z" fill="${C.blue}" stroke="${C.ink}" stroke-width="${OUT}" stroke-linejoin="round"/>`,
      `<path d="M48 50 q18 -8 34 0 q-12 12 -34 0 Z" fill="${C.teal}" stroke="${C.ink}" stroke-width="${LINE}" stroke-linejoin="round"/>`,
      `<circle cx="34" cy="52" r="3.5" fill="${C.ink}"/>`,
      `<path d="M18 56 l-12 2 12 4 Z" fill="${C.gold}" stroke="${C.ink}" stroke-width="2" stroke-linejoin="round"/>`,
    ].join(''), { viewBox: [120, 100] }),

    mkSticker('paw', 'Paw print', [
      `<path d="M30 64 C 30 50 80 50 80 64 C 80 86 64 96 55 96 C 46 96 30 86 30 64 Z" fill="${C.brown}" stroke="${C.ink}" stroke-width="${OUT}" stroke-linejoin="round"/>`,
      `<ellipse cx="28" cy="40" rx="9" ry="12" fill="${C.brown}" stroke="${C.ink}" stroke-width="${LINE}"/>`,
      `<ellipse cx="46" cy="26" rx="9" ry="12" fill="${C.brown}" stroke="${C.ink}" stroke-width="${LINE}"/>`,
      `<ellipse cx="66" cy="26" rx="9" ry="12" fill="${C.brown}" stroke="${C.ink}" stroke-width="${LINE}"/>`,
      `<ellipse cx="84" cy="40" rx="9" ry="12" fill="${C.brown}" stroke="${C.ink}" stroke-width="${LINE}"/>`,
    ].join(''), { viewBox: [110, 110] }),

    mkSticker('flower', 'Flower', [
      `<line x1="55" y1="60" x2="55" y2="112" stroke="${C.green}" stroke-width="${OUT}" stroke-linecap="round"/>`,
      `<path d="M55 92 q-22 -4 -26 -20 q20 -2 26 14 Z" fill="${C.green}" stroke="${C.ink}" stroke-width="2" stroke-linejoin="round"/>`,
      ...[0, 72, 144, 216, 288].map(a =>
        `<ellipse cx="55" cy="32" rx="12" ry="20" fill="${C.pink}" stroke="${C.ink}" stroke-width="${LINE}" transform="rotate(${a} 55 48)"/>`),
      `<circle cx="55" cy="48" r="11" fill="${C.gold}" stroke="${C.ink}" stroke-width="${LINE}"/>`,
    ].join(''), { viewBox: [110, 120] }),

    mkSticker('cat-face', 'Cat face', [
      `<path d="M24 36 L40 56 L80 56 L96 36 L92 72 C 92 96 70 104 60 104 C 50 104 28 96 28 72 Z" fill="${C.gold}" stroke="${C.ink}" stroke-width="${OUT}" stroke-linejoin="round"/>`,
      `<path d="M24 36 L34 60 L46 54 Z" fill="${C.pink}" stroke="${C.ink}" stroke-width="2" stroke-linejoin="round"/>`,
      `<path d="M96 36 L86 60 L74 54 Z" fill="${C.pink}" stroke="${C.ink}" stroke-width="2" stroke-linejoin="round"/>`,
      `<circle cx="46" cy="70" r="5" fill="${C.ink}"/>`,
      `<circle cx="74" cy="70" r="5" fill="${C.ink}"/>`,
      `<path d="M60 80 l-6 6 l6 4 l6 -4 Z" fill="${C.pink}" stroke="${C.ink}" stroke-width="2" stroke-linejoin="round"/>`,
      `<path d="M60 90 v6 M40 84 l-18 -2 M40 90 l-18 6 M80 84 l18 -2 M80 90 l18 6" fill="none" stroke="${C.ink}" stroke-width="2" stroke-linecap="round"/>`,
    ].join(''), { viewBox: [120, 120] }),

    mkSticker('dog-face', 'Dog face', [
      `<path d="M26 30 C 18 30 16 58 26 70 L34 56 Z" fill="${C.brown}" stroke="${C.ink}" stroke-width="${OUT}" stroke-linejoin="round"/>`,
      `<path d="M94 30 C 102 30 104 58 94 70 L86 56 Z" fill="${C.brown}" stroke="${C.ink}" stroke-width="${OUT}" stroke-linejoin="round"/>`,
      `<path d="M34 46 C 34 30 86 30 86 46 C 92 60 88 96 60 100 C 32 96 28 60 34 46 Z" fill="${C.gold}" stroke="${C.ink}" stroke-width="${OUT}" stroke-linejoin="round"/>`,
      `<circle cx="46" cy="64" r="5" fill="${C.ink}"/>`,
      `<circle cx="74" cy="64" r="5" fill="${C.ink}"/>`,
      `<ellipse cx="60" cy="80" rx="9" ry="7" fill="${C.ink}"/>`,
      `<path d="M60 87 v8 M60 95 q-12 4 -16 -4 M60 95 q12 4 16 -4" fill="none" stroke="${C.ink}" stroke-width="2.5" stroke-linecap="round"/>`,
    ].join(''), { viewBox: [120, 120] }),

    mkSticker('fish', 'Fish', [
      `<path d="M12 60 C 36 28 84 28 100 60 C 84 92 36 92 12 60 Z" fill="${C.teal}" stroke="${C.ink}" stroke-width="${OUT}" stroke-linejoin="round"/>`,
      `<path d="M100 60 L120 42 L116 60 L120 78 Z" fill="${C.blue}" stroke="${C.ink}" stroke-width="${LINE}" stroke-linejoin="round"/>`,
      `<path d="M54 34 q14 -16 24 -8 q-2 12 -16 18 Z" fill="${C.blue}" stroke="${C.ink}" stroke-width="2" stroke-linejoin="round"/>`,
      `<circle cx="34" cy="56" r="6" fill="${C.paper}" stroke="${C.ink}" stroke-width="2"/>`,
      `<circle cx="34" cy="56" r="2.5" fill="${C.ink}"/>`,
      `<path d="M58 60 q14 -10 28 0 q-14 10 -28 0 Z M64 60 q10 -7 20 0 q-10 7 -20 0 Z" fill="${C.gold}" stroke="${C.ink}" stroke-width="2" stroke-linejoin="round"/>`,
    ].join(''), { viewBox: [120, 120] }),

    mkSticker('butterfly', 'Butterfly', [
      `<path d="M58 60 C 30 28 8 30 14 56 C 18 78 44 78 58 64 Z" fill="${C.orange}" stroke="${C.ink}" stroke-width="${OUT}" stroke-linejoin="round"/>`,
      `<path d="M62 60 C 90 28 112 30 106 56 C 102 78 76 78 62 64 Z" fill="${C.orange}" stroke="${C.ink}" stroke-width="${OUT}" stroke-linejoin="round"/>`,
      `<path d="M58 62 C 36 84 20 96 24 104 C 40 102 54 86 58 70 Z" fill="${C.gold}" stroke="${C.ink}" stroke-width="${OUT}" stroke-linejoin="round"/>`,
      `<path d="M62 62 C 84 84 100 96 96 104 C 80 102 66 86 62 70 Z" fill="${C.gold}" stroke="${C.ink}" stroke-width="${OUT}" stroke-linejoin="round"/>`,
      `<circle cx="32" cy="50" r="4" fill="${C.paper}"/>`,
      `<circle cx="88" cy="50" r="4" fill="${C.paper}"/>`,
      `<path d="M60 50 L60 86" fill="none" stroke="${C.ink}" stroke-width="${OUT}" stroke-linecap="round"/>`,
      `<path d="M60 50 l-8 -14 M60 50 l8 -14" fill="none" stroke="${C.ink}" stroke-width="2.5" stroke-linecap="round"/>`,
    ].join(''), { viewBox: [120, 120] }),

    mkSticker('toadstool', 'Toadstool', [
      `<path d="M44 64 L40 104 C 40 110 80 110 80 104 L76 64 Z" fill="${C.cream}" stroke="${C.ink}" stroke-width="${OUT}" stroke-linejoin="round"/>`,
      `<path d="M14 64 C 14 30 106 30 106 64 C 106 70 14 70 14 64 Z" fill="${C.red}" stroke="${C.ink}" stroke-width="${OUT}" stroke-linejoin="round"/>`,
      `<circle cx="38" cy="50" r="6" fill="${C.paper}"/>`,
      `<circle cx="60" cy="44" r="7" fill="${C.paper}"/>`,
      `<circle cx="82" cy="50" r="6" fill="${C.paper}"/>`,
      `<circle cx="52" cy="80" r="3" fill="${C.brown}"/>`,
      `<circle cx="68" cy="88" r="3" fill="${C.brown}"/>`,
    ].join(''), { viewBox: [120, 120] }),

    mkSticker('cactus', 'Cactus', [
      `<path d="M34 100 L86 100 L82 70 L38 70 Z" fill="${C.brown}" stroke="${C.ink}" stroke-width="${OUT}" stroke-linejoin="round"/>`,
      `<path d="M34 80 L86 80" fill="none" stroke="${C.ink}" stroke-width="2"/>`,
      `<path d="M50 70 L50 28 C 50 18 70 18 70 28 L70 70 Z" fill="${C.green}" stroke="${C.ink}" stroke-width="${OUT}" stroke-linejoin="round"/>`,
      `<path d="M50 54 C 36 54 30 44 30 32 C 38 32 42 40 50 42 Z" fill="${C.green}" stroke="${C.ink}" stroke-width="${LINE}" stroke-linejoin="round"/>`,
      `<path d="M70 50 C 84 50 90 40 90 28 C 82 28 78 36 70 38 Z" fill="${C.green}" stroke="${C.ink}" stroke-width="${LINE}" stroke-linejoin="round"/>`,
      `<circle cx="60" cy="24" r="6" fill="${C.pink}" stroke="${C.ink}" stroke-width="2"/>`,
    ].join(''), { viewBox: [120, 120] }),

    mkSticker('sunflower', 'Sunflower', [
      `<line x1="60" y1="74" x2="60" y2="114" stroke="${C.green}" stroke-width="${OUT}" stroke-linecap="round"/>`,
      `<path d="M60 96 q-22 -2 -28 -18 q22 -4 28 12 Z" fill="${C.green}" stroke="${C.ink}" stroke-width="2" stroke-linejoin="round"/>`,
      ...Array.from({ length: 12 }, (_, i) => i * 30).map(a =>
        `<ellipse cx="60" cy="20" rx="9" ry="18" fill="${C.gold}" stroke="${C.ink}" stroke-width="2" transform="rotate(${a} 60 50)"/>`),
      `<circle cx="60" cy="50" r="18" fill="${C.brown}" stroke="${C.ink}" stroke-width="${LINE}"/>`,
      `<path d="M52 44 l4 4 M62 44 l4 4 M54 54 l4 4 M64 54 l4 4" fill="none" stroke="${C.ink}" stroke-width="2" stroke-linecap="round"/>`,
    ].join(''), { viewBox: [120, 120] }),

    mkSticker('pine-tree', 'Pine tree', [
      `<rect x="52" y="92" width="16" height="20" rx="2" fill="${C.brown}" stroke="${C.ink}" stroke-width="${OUT}"/>`,
      `<path d="M60 14 L92 54 L72 54 L96 90 L24 90 L48 54 L28 54 Z" fill="${C.green}" stroke="${C.ink}" stroke-width="${OUT}" stroke-linejoin="round"/>`,
      `<path d="M40 70 L80 70 M48 54 L72 54" fill="none" stroke="${C.ink}" stroke-width="2"/>`,
      `<circle cx="60" cy="10" r="6" fill="${C.gold}" stroke="${C.ink}" stroke-width="2"/>`,
    ].join(''), { viewBox: [120, 120] }),

    mkSticker('snail', 'Snail', [
      `<path d="M20 96 L80 96 C 96 96 96 80 80 80 L40 80" fill="none" stroke="${C.ink}" stroke-width="${OUT}" stroke-linecap="round"/>`,
      `<path d="M16 96 C 6 96 6 70 16 64 C 30 56 56 64 56 84 C 56 98 36 102 30 92 C 26 84 36 78 42 84 C 44 88 40 90 40 88" fill="${C.gold}" stroke="${C.ink}" stroke-width="${OUT}" stroke-linejoin="round" stroke-linecap="round"/>`,
      `<path d="M80 80 C 90 80 96 70 96 58 C 96 52 88 50 88 56" fill="${C.teal}" stroke="${C.ink}" stroke-width="${LINE}" stroke-linecap="round"/>`,
      `<path d="M92 44 l2 -10 M86 46 l-4 -10" fill="none" stroke="${C.ink}" stroke-width="2.5" stroke-linecap="round"/>`,
      `<circle cx="94" cy="32" r="3" fill="${C.ink}"/>`,
      `<circle cx="82" cy="34" r="3" fill="${C.ink}"/>`,
    ].join(''), { viewBox: [120, 120] }),

    mkSticker('ladybird', 'Ladybird', [
      `<path d="M20 80 C 20 44 100 44 100 80 C 100 98 20 98 20 80 Z" fill="${C.red}" stroke="${C.ink}" stroke-width="${OUT}" stroke-linejoin="round"/>`,
      `<path d="M40 50 C 40 42 80 42 80 50 C 80 58 40 58 40 50 Z" fill="${C.ink}"/>`,
      `<line x1="60" y1="50" x2="60" y2="96" stroke="${C.ink}" stroke-width="${LINE}"/>`,
      `<circle cx="40" cy="66" r="6" fill="${C.ink}"/>`,
      `<circle cx="80" cy="66" r="6" fill="${C.ink}"/>`,
      `<circle cx="36" cy="84" r="5" fill="${C.ink}"/>`,
      `<circle cx="84" cy="84" r="5" fill="${C.ink}"/>`,
      `<path d="M52 42 l-6 -12 M68 42 l6 -12" fill="none" stroke="${C.ink}" stroke-width="2.5" stroke-linecap="round"/>`,
    ].join(''), { viewBox: [120, 120] }),
  ],
};
