// Emotions & reactions stickers — retro die-cut. TARGET: 14.
//
// Style rules (see ./_style.js): author each sticker with mkSticker/RETRO/disc/
// primitives so the whole set stays cohesive + sanitise-clean. Decorative colour
// is fine, but every sticker MUST be self-contained inline SVG that passes
// sanitise() UNCHANGED — NO <script>/on*/<foreignObject>/href/url()/external
// refs/SMIL. mkSticker() asserts this for you.
import { mkSticker, RETRO as C, OUT, LINE, disc } from './_style.js';

export default {
  genre: 'emotions-reactions',
  label: 'Emotions & reactions',
  stickers: [
    mkSticker('grin-face', 'Big grin', [
      disc(60, 60, 46, C.gold),
      `<circle cx="44" cy="50" r="6" fill="${C.ink}"/>`,
      `<circle cx="76" cy="50" r="6" fill="${C.ink}"/>`,
      `<path d="M36 70 q24 30 48 0 z" fill="${C.red}" stroke="${C.ink}" stroke-width="${LINE}" stroke-linejoin="round"/>`,
      `<path d="M36 70 h48" stroke="${C.ink}" stroke-width="${LINE}" stroke-linecap="round"/>`,
    ].join(''), { viewBox: [120, 120] }),

    mkSticker('sad-face', 'Sad face', [
      disc(60, 60, 46, C.blue),
      `<circle cx="44" cy="52" r="6" fill="${C.ink}"/>`,
      `<circle cx="76" cy="52" r="6" fill="${C.ink}"/>`,
      `<path d="M40 84 q20 -22 40 0" fill="none" stroke="${C.ink}" stroke-width="${OUT}" stroke-linecap="round"/>`,
      `<path d="M82 56 q4 10 0 18 q-7 -6 0 -18 z" fill="${C.paper}" stroke="${C.ink}" stroke-width="2"/>`,
    ].join(''), { viewBox: [120, 120] }),

    mkSticker('angry-face', 'Angry', [
      disc(60, 60, 46, C.red),
      // furrowed brows angled down toward the centre
      `<path d="M34 44 L52 54" fill="none" stroke="${C.ink}" stroke-width="${OUT}" stroke-linecap="round"/>`,
      `<path d="M86 44 L68 54" fill="none" stroke="${C.ink}" stroke-width="${OUT}" stroke-linecap="round"/>`,
      `<circle cx="46" cy="60" r="5" fill="${C.ink}"/>`,
      `<circle cx="74" cy="60" r="5" fill="${C.ink}"/>`,
      // frown
      `<path d="M40 88 q20 -18 40 0" fill="none" stroke="${C.ink}" stroke-width="${OUT}" stroke-linecap="round"/>`,
    ].join(''), { viewBox: [120, 120] }),

    mkSticker('broken-heart', 'Broken heart', [
      `<path d="M60 102 C18 74 14 44 30 30 C44 18 58 26 60 40 C62 26 76 18 90 30 C106 44 102 74 60 102 Z" fill="${C.pink}" stroke="${C.ink}" stroke-width="${OUT}" stroke-linejoin="round"/>`,
      `<path d="M60 32 L52 50 L66 60 L54 74 L60 100" fill="none" stroke="${C.ink}" stroke-width="${LINE}" stroke-linejoin="round"/>`,
    ].join(''), { viewBox: [120, 120] }),

    mkSticker('star-struck', 'Star-struck', [
      disc(60, 60, 46, C.gold),
      `<path d="M44 38 l5 11 12 1 -9 8 3 12 -11 -7 -11 7 3 -12 -9 -8 12 -1 z" fill="${C.orange}" stroke="${C.ink}" stroke-width="2" stroke-linejoin="round"/>`,
      `<path d="M76 38 l5 11 12 1 -9 8 3 12 -11 -7 -11 7 3 -12 -9 -8 12 -1 z" fill="${C.orange}" stroke="${C.ink}" stroke-width="2" stroke-linejoin="round"/>`,
      `<path d="M38 76 q22 24 44 0 z" fill="${C.red}" stroke="${C.ink}" stroke-width="${LINE}" stroke-linejoin="round"/>`,
    ].join(''), { viewBox: [120, 120] }),

    mkSticker('surprised-face', 'Surprised', [
      disc(60, 60, 46, C.gold),
      // raised brows arching high above the eyes
      `<path d="M36 42 q10 -8 20 -2" fill="none" stroke="${C.ink}" stroke-width="${LINE}" stroke-linecap="round"/>`,
      `<path d="M64 40 q10 -6 20 2" fill="none" stroke="${C.ink}" stroke-width="${LINE}" stroke-linecap="round"/>`,
      `<circle cx="46" cy="58" r="6" fill="${C.ink}"/>`,
      `<circle cx="74" cy="58" r="6" fill="${C.ink}"/>`,
      // open round mouth
      `<circle cx="60" cy="82" r="12" fill="${C.red}" stroke="${C.ink}" stroke-width="${LINE}"/>`,
    ].join(''), { viewBox: [120, 120] }),

    mkSticker('thumbs-down', 'Thumbs down', [
      `<rect x="20" y="18" width="20" height="46" rx="5" fill="${C.brown}" stroke="${C.ink}" stroke-width="${OUT}"/>`,
      `<path d="M40 60 q0 16 10 28 q6 8 10 4 q4 -4 0 -16 l-3 -12 h26 q10 0 8 -12 l-6 -26 q-2 -10 -14 -10 H40 Z" fill="${C.teal}" stroke="${C.ink}" stroke-width="${OUT}" stroke-linejoin="round"/>`,
      `<path d="M62 56 h22" stroke="${C.ink}" stroke-width="2"/>`,
      `<path d="M60 42 h22" stroke="${C.ink}" stroke-width="2"/>`,
    ].join(''), { viewBox: [120, 120] }),

    mkSticker('ok-hand', 'OK hand', [
      `<circle cx="48" cy="68" r="22" fill="none" stroke="${C.gold}" stroke-width="14"/>`,
      `<circle cx="48" cy="68" r="22" fill="none" stroke="${C.ink}" stroke-width="2"/>`,
      `<circle cx="48" cy="68" r="13" fill="none" stroke="${C.ink}" stroke-width="2"/>`,
      `<path d="M66 56 q14 -22 22 -28" fill="none" stroke="${C.gold}" stroke-width="13" stroke-linecap="round"/>`,
      `<path d="M76 50 q12 -16 18 -22" fill="none" stroke="${C.gold}" stroke-width="11" stroke-linecap="round"/>`,
      `<path d="M84 50 q10 -12 14 -16" fill="none" stroke="${C.gold}" stroke-width="9" stroke-linecap="round"/>`,
    ].join(''), { viewBox: [120, 120] }),

    mkSticker('waving-hand', 'Waving hand', [
      `<path d="M40 102 q-12 -22 -10 -44 l4 -34 q1 -8 8 -8 q7 0 7 8 v22 l3 -30 q1 -8 8 -8 q7 0 7 8 l1 30 l4 -26 q1 -8 8 -7 q7 1 6 9 l-3 28 l8 -16 q4 -7 10 -3 q6 4 2 11 l-12 30 q-6 22 -14 30 z" fill="${C.gold}" stroke="${C.ink}" stroke-width="${OUT}" stroke-linejoin="round"/>`,
      `<path d="M82 22 q12 -4 18 4" fill="none" stroke="${C.teal}" stroke-width="${LINE}" stroke-linecap="round"/>`,
      `<path d="M86 12 q14 -2 20 8" fill="none" stroke="${C.teal}" stroke-width="${LINE}" stroke-linecap="round"/>`,
    ].join(''), { viewBox: [120, 120] }),

    mkSticker('peace-sign', 'Peace sign', [
      `<path d="M38 110 q-8 -26 -6 -46 l-4 -30 q-1 -9 7 -10 q8 -1 9 8 l4 26 l2 -2 l6 -40 q1 -9 9 -8 q8 1 7 10 l-4 36 l4 1 l8 -24 q3 -8 10 -5 q8 3 5 11 l-12 38 q-4 24 -8 35 z" fill="${C.gold}" stroke="${C.ink}" stroke-width="${OUT}" stroke-linejoin="round"/>`,
    ].join(''), { viewBox: [120, 120] }),

    mkSticker('hundred-mark', 'Hundred', [
      `<text x="60" y="74" text-anchor="middle" font-family="Georgia, serif" font-weight="700" font-size="48" fill="${C.red}" stroke="${C.ink}" stroke-width="2">100</text>`,
      `<line x1="20" y1="92" x2="100" y2="92" stroke="${C.red}" stroke-width="${OUT}" stroke-linecap="round"/>`,
      `<line x1="24" y1="100" x2="96" y2="100" stroke="${C.red}" stroke-width="${LINE}" stroke-linecap="round"/>`,
    ].join(''), { viewBox: [120, 120] }),

    mkSticker('laughing-tears', 'Laughing tears', [
      disc(60, 60, 46, C.gold),
      `<path d="M34 44 q10 8 18 4" fill="none" stroke="${C.ink}" stroke-width="${LINE}" stroke-linecap="round"/>`,
      `<path d="M86 44 q-10 8 -18 4" fill="none" stroke="${C.ink}" stroke-width="${LINE}" stroke-linecap="round"/>`,
      `<path d="M34 66 q26 32 52 0 z" fill="${C.red}" stroke="${C.ink}" stroke-width="${LINE}" stroke-linejoin="round"/>`,
      `<path d="M28 56 q-6 14 -2 22 q8 -4 6 -18 z" fill="${C.blue}" stroke="${C.ink}" stroke-width="2"/>`,
      `<path d="M92 56 q6 14 2 22 q-8 -4 -6 -18 z" fill="${C.blue}" stroke="${C.ink}" stroke-width="2"/>`,
    ].join(''), { viewBox: [120, 120] }),

    mkSticker('cool-shades', 'Cool shades', [
      disc(60, 60, 46, C.gold),
      `<path d="M30 48 h60 l-2 6 q-2 4 -8 4 H40 q-6 0 -8 -4 z" fill="${C.navy}"/>`,
      `<rect x="30" y="50" width="26" height="18" rx="6" fill="${C.ink}"/>`,
      `<rect x="64" y="50" width="26" height="18" rx="6" fill="${C.ink}"/>`,
      `<line x1="56" y1="54" x2="64" y2="54" stroke="${C.ink}" stroke-width="${LINE}"/>`,
      `<path d="M40 82 q20 14 40 0" fill="none" stroke="${C.ink}" stroke-width="${OUT}" stroke-linecap="round"/>`,
    ].join(''), { viewBox: [120, 120] }),

    mkSticker('sleepy-zzz', 'Sleepy face', [
      disc(60, 60, 46, C.plum),
      `<path d="M34 52 q8 -6 16 0" fill="none" stroke="${C.ink}" stroke-width="${LINE}" stroke-linecap="round"/>`,
      `<path d="M58 54 q8 -6 16 0" fill="none" stroke="${C.ink}" stroke-width="${LINE}" stroke-linecap="round"/>`,
      `<circle cx="48" cy="76" r="6" fill="${C.pink}"/>`,
      `<circle cx="72" cy="76" r="6" fill="${C.pink}"/>`,
      `<text x="86" y="40" text-anchor="middle" font-family="Georgia, serif" font-weight="700" font-size="20" fill="${C.paper}" stroke="${C.ink}" stroke-width="1">z</text>`,
      `<text x="98" y="26" text-anchor="middle" font-family="Georgia, serif" font-weight="700" font-size="14" fill="${C.paper}" stroke="${C.ink}" stroke-width="1">z</text>`,
    ].join(''), { viewBox: [120, 120] }),
  ],
};
