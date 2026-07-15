// General stickers — retro die-cut catch-all (badges, banners, marks).
// TARGET: ~14 (currently 5 migrated).
// Style: see ./_style.js. Author with mkSticker/RETRO/frame/primitives so every
// sticker is cohesive + sanitise-clean. Append to the `stickers` array below.
import { mkSticker, RETRO as C, OUT, LINE, scallop } from './_style.js';

export default {
  genre: 'general',
  label: 'General',
  stickers: [
    mkSticker('starburst', 'Star burst', [
      `<path d="M60 8 67 38 92 22 78 48 110 50 82 64 100 90 70 78 60 110 50 78 20 90 38 64 10 50 42 48 28 22 53 38 Z" fill="${C.gold}" stroke="${C.ink}" stroke-width="${OUT}" stroke-linejoin="round"/>`,
      `<circle cx="60" cy="58" r="20" fill="${C.red}" stroke="${C.ink}" stroke-width="${LINE}"/>`,
      `<text x="60" y="64" text-anchor="middle" font-family="Georgia, serif" font-weight="700" font-size="16" fill="${C.paper}">WOW</text>`,
    ].join(''), { viewBox: [120, 120] }),

    mkSticker('new-badge', '"NEW!" badge', [
      // scalloped seal
      `<path d="${scallop(60, 60, 50, 12)}" fill="${C.red}" stroke="${C.ink}" stroke-width="${OUT}" stroke-linejoin="round"/>`,
      `<circle cx="60" cy="60" r="36" fill="none" stroke="${C.paper}" stroke-width="${LINE}"/>`,
      `<text x="60" y="68" text-anchor="middle" font-family="Georgia, serif" font-weight="800" font-size="24" fill="${C.paper}" letter-spacing="1">NEW!</text>`,
    ].join(''), { viewBox: [120, 120] }),

    mkSticker('speech-bubble', 'Speech bubble', [
      `<path d="M16 18 L104 18 a8 8 0 0 1 8 8 L112 70 a8 8 0 0 1 -8 8 L52 78 L30 98 L34 78 L16 78 a8 8 0 0 1 -8 -8 L8 26 a8 8 0 0 1 8 -8 Z" fill="${C.teal}" stroke="${C.ink}" stroke-width="${OUT}" stroke-linejoin="round"/>`,
      `<circle cx="40" cy="48" r="5" fill="${C.paper}"/>`,
      `<circle cx="60" cy="48" r="5" fill="${C.paper}"/>`,
      `<circle cx="80" cy="48" r="5" fill="${C.paper}"/>`,
    ].join(''), { viewBox: [120, 110] }),

    mkSticker('arrow-banner', 'Arrow', [
      `<path d="M10 26 L86 26 L86 12 L122 40 L86 68 L86 54 L10 54 Z" fill="${C.orange}" stroke="${C.ink}" stroke-width="${OUT}" stroke-linejoin="round"/>`,
      `<line x1="22" y1="40" x2="78" y2="40" stroke="${C.paper}" stroke-width="${LINE}" stroke-dasharray="4 6" stroke-linecap="round"/>`,
    ].join(''), { viewBox: [130, 80] }),

    mkSticker('heart', 'Heart', [
      `<path d="M60 96 C 8 60 14 20 40 20 C 52 20 60 30 60 38 C 60 30 68 20 80 20 C 106 20 112 60 60 96 Z" fill="${C.red}" stroke="${C.ink}" stroke-width="${OUT}" stroke-linejoin="round"/>`,
      `<path d="M34 36 q6 -8 14 -6" fill="none" stroke="${C.paper}" stroke-width="${LINE}" stroke-linecap="round"/>`,
    ].join(''), { viewBox: [120, 110] }),

    mkSticker('thumbs-up', 'Thumbs up', [
      `<path d="M14 56 L36 56 L36 104 L14 104 Z" fill="${C.blue}" stroke="${C.ink}" stroke-width="${OUT}" stroke-linejoin="round"/>`,
      `<path d="M36 56 L52 56 L56 28 C 58 14 76 16 76 30 L74 52 L98 52 C 108 52 110 62 104 70 C 110 76 106 86 98 86 C 104 92 100 102 90 102 L46 102 L36 96 Z" fill="${C.gold}" stroke="${C.ink}" stroke-width="${OUT}" stroke-linejoin="round"/>`,
      `<path d="M76 68 L96 68 M76 86 L92 86" fill="none" stroke="${C.ink}" stroke-width="2"/>`,
    ].join(''), { viewBox: [120, 120] }),

    mkSticker('lightning', 'Lightning bolt', [
      `<path d="M68 8 L28 64 L56 64 L44 112 L92 48 L62 48 Z" fill="${C.gold}" stroke="${C.ink}" stroke-width="${OUT}" stroke-linejoin="round"/>`,
      `<path d="M62 24 L44 56 L60 56" fill="none" stroke="${C.orange}" stroke-width="${LINE}" stroke-linejoin="round"/>`,
    ].join(''), { viewBox: [120, 120] }),

    mkSticker('smiley-sun', 'Smiley sun', [
      ...Array.from({ length: 12 }, (_, i) => i * 30).map(a =>
        `<path d="M60 6 L66 22 L54 22 Z" fill="${C.gold}" stroke="${C.ink}" stroke-width="2" stroke-linejoin="round" transform="rotate(${a} 60 60)"/>`),
      `<circle cx="60" cy="60" r="34" fill="${C.gold}" stroke="${C.ink}" stroke-width="${OUT}"/>`,
      `<circle cx="48" cy="54" r="4.5" fill="${C.ink}"/>`,
      `<circle cx="72" cy="54" r="4.5" fill="${C.ink}"/>`,
      `<path d="M44 70 q16 16 32 0" fill="none" stroke="${C.ink}" stroke-width="${LINE}" stroke-linecap="round"/>`,
    ].join(''), { viewBox: [120, 120] }),

    mkSticker('rosette', 'Award rosette', [
      ...Array.from({ length: 12 }, (_, i) => i * 30).map(a =>
        `<ellipse cx="60" cy="20" rx="10" ry="16" fill="${C.red}" stroke="${C.ink}" stroke-width="2" transform="rotate(${a} 60 48)"/>`),
      `<path d="M44 60 L34 110 L48 100 L54 112 L62 76 Z" fill="${C.blue}" stroke="${C.ink}" stroke-width="${LINE}" stroke-linejoin="round"/>`,
      `<path d="M76 60 L86 110 L72 100 L66 112 L58 76 Z" fill="${C.blue}" stroke="${C.ink}" stroke-width="${LINE}" stroke-linejoin="round"/>`,
      `<circle cx="60" cy="48" r="22" fill="${C.gold}" stroke="${C.ink}" stroke-width="${OUT}"/>`,
      `<path d="M60 36 L64 46 L74 46 L66 52 L69 62 L60 56 L51 62 L54 52 L46 46 L56 46 Z" fill="${C.red}" stroke="${C.ink}" stroke-width="2" stroke-linejoin="round"/>`,
    ].join(''), { viewBox: [120, 120] }),

    mkSticker('gift-box', 'Gift box', [
      `<rect x="22" y="46" width="76" height="58" rx="4" fill="${C.red}" stroke="${C.ink}" stroke-width="${OUT}"/>`,
      `<rect x="16" y="34" width="88" height="18" rx="3" fill="${C.orange}" stroke="${C.ink}" stroke-width="${OUT}"/>`,
      `<rect x="50" y="34" width="20" height="70" fill="${C.gold}" stroke="${C.ink}" stroke-width="${LINE}"/>`,
      `<path d="M50 34 C 30 14 18 30 50 32 M70 34 C 90 14 102 30 70 32" fill="${C.gold}" stroke="${C.ink}" stroke-width="${LINE}" stroke-linejoin="round"/>`,
    ].join(''), { viewBox: [120, 120] }),

    mkSticker('target', 'Bullseye', [
      `<circle cx="60" cy="60" r="50" fill="${C.red}" stroke="${C.ink}" stroke-width="${OUT}"/>`,
      `<circle cx="60" cy="60" r="36" fill="${C.paper}" stroke="${C.ink}" stroke-width="${LINE}"/>`,
      `<circle cx="60" cy="60" r="22" fill="${C.red}" stroke="${C.ink}" stroke-width="${LINE}"/>`,
      `<circle cx="60" cy="60" r="9" fill="${C.gold}" stroke="${C.ink}" stroke-width="2"/>`,
    ].join(''), { viewBox: [120, 120] }),

    mkSticker('crown', 'Crown', [
      `<path d="M16 88 L24 36 L46 64 L60 26 L74 64 L96 36 L104 88 Z" fill="${C.gold}" stroke="${C.ink}" stroke-width="${OUT}" stroke-linejoin="round"/>`,
      `<rect x="16" y="88" width="88" height="16" rx="3" fill="${C.orange}" stroke="${C.ink}" stroke-width="${OUT}"/>`,
      `<circle cx="24" cy="34" r="5" fill="${C.red}" stroke="${C.ink}" stroke-width="2"/>`,
      `<circle cx="60" cy="24" r="5" fill="${C.red}" stroke="${C.ink}" stroke-width="2"/>`,
      `<circle cx="96" cy="34" r="5" fill="${C.red}" stroke="${C.ink}" stroke-width="2"/>`,
      `<circle cx="42" cy="96" r="4" fill="${C.teal}"/>`,
      `<circle cx="60" cy="96" r="4" fill="${C.teal}"/>`,
      `<circle cx="78" cy="96" r="4" fill="${C.teal}"/>`,
    ].join(''), { viewBox: [120, 120] }),

    mkSticker('padlock', 'Padlock', [
      `<path d="M40 56 L40 40 C 40 16 80 16 80 40 L80 56" fill="none" stroke="${C.ink}" stroke-width="${OUT}" stroke-linecap="round"/>`,
      `<rect x="26" y="54" width="68" height="56" rx="8" fill="${C.gold}" stroke="${C.ink}" stroke-width="${OUT}"/>`,
      `<circle cx="60" cy="78" r="8" fill="${C.brown}" stroke="${C.ink}" stroke-width="${LINE}"/>`,
      `<path d="M60 86 L60 98" fill="none" stroke="${C.ink}" stroke-width="${OUT}" stroke-linecap="round"/>`,
    ].join(''), { viewBox: [120, 120] }),

    mkSticker('sparkle', 'Sparkle', [
      `<path d="M60 8 C 64 44 76 56 112 60 C 76 64 64 76 60 112 C 56 76 44 64 8 60 C 44 56 56 44 60 8 Z" fill="${C.gold}" stroke="${C.ink}" stroke-width="${OUT}" stroke-linejoin="round"/>`,
      `<path d="M24 20 C 26 32 30 36 42 38 C 30 40 26 44 24 56 C 22 44 18 40 6 38 C 18 36 22 32 24 20 Z" fill="${C.teal}" stroke="${C.ink}" stroke-width="2" stroke-linejoin="round"/>`,
      `<path d="M96 70 C 98 80 100 82 110 84 C 100 86 98 88 96 98 C 94 88 92 86 82 84 C 92 82 94 80 96 70 Z" fill="${C.pink}" stroke="${C.ink}" stroke-width="2" stroke-linejoin="round"/>`,
    ].join(''), { viewBox: [120, 120] }),
  ],
};
