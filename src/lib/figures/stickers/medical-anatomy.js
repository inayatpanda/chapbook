// Medical & anatomy stickers — retro die-cut. TARGET: ~14.
//
// Style rules (see ./_style.js): author each sticker with mkSticker/RETRO/
// primitives. Decorative colour is fine, but every sticker MUST be self-contained
// inline SVG that passes sanitise() UNCHANGED — NO <script>/on*/<foreignObject>/
// href/url()/external refs/SMIL. mkSticker() asserts this for you.
//
// A warm, friendly health & anatomy set — long bone, vertebra, knee joint, ribcage,
// stethoscope, plaster cast, crutch, first-aid feel — kept tasteful (NO gore).
import { mkSticker, RETRO as C, OUT, LINE, disc } from './_style.js';

export default {
  genre: 'medical-anatomy',
  label: 'Medical & anatomy',
  stickers: [
    mkSticker('long-bone', 'Long bone', [
      // classic dog-bone femur silhouette, knobbly ends
      `<path d="M28 30 a14 14 0 0 1 22 6 a14 14 0 0 1 22 -2 l0 0 q-2 14 -16 18 L66 86 q14 4 16 18 a14 14 0 0 1 -22 -2 a14 14 0 0 1 -22 6 q-12 -8 -2 -20 q-12 -2 -10 -16 q-12 -10 0 -20 q-4 -12 8 -16 Z" fill="${C.cream}" stroke="${C.ink}" stroke-width="${OUT}" stroke-linejoin="round"/>`,
      `<path d="M48 44 L60 76" fill="none" stroke="${C.ink}" stroke-width="2" stroke-linecap="round"/>`,
    ].join(''), { viewBox: [120, 120] }),

    mkSticker('vertebra', 'Vertebra', [
      disc(60, 60, 46, C.gold),
      // top-down vertebra: round body + wing-like transverse processes + spinous tip
      `<ellipse cx="60" cy="78" rx="26" ry="16" fill="${C.cream}" stroke="${C.ink}" stroke-width="${OUT}"/>`,
      `<circle cx="60" cy="50" r="14" fill="${C.paper}" stroke="${C.ink}" stroke-width="${OUT}"/>`,
      `<path d="M40 56 q-22 -6 -26 6 q16 6 26 0 Z" fill="${C.cream}" stroke="${C.ink}" stroke-width="${LINE}" stroke-linejoin="round"/>`,
      `<path d="M80 56 q22 -6 26 6 q-16 6 -26 0 Z" fill="${C.cream}" stroke="${C.ink}" stroke-width="${LINE}" stroke-linejoin="round"/>`,
      `<path d="M60 36 l8 -14 -16 0 Z" fill="${C.cream}" stroke="${C.ink}" stroke-width="${LINE}" stroke-linejoin="round"/>`,
    ].join(''), { viewBox: [120, 120] }),

    mkSticker('knee-joint', 'Knee joint', [
      // stylised hinge joint: femur above, tibia below, round kneecap
      `<path d="M40 14 q-6 30 0 42 q4 8 14 8 q14 0 14 -10 l0 -40 Z" fill="${C.cream}" stroke="${C.ink}" stroke-width="${OUT}" stroke-linejoin="round"/>`,
      `<path d="M44 70 q-4 22 2 36 l28 0 q4 -20 -2 -36 q-6 6 -14 6 q-8 0 -14 -6 Z" fill="${C.cream}" stroke="${C.ink}" stroke-width="${OUT}" stroke-linejoin="round"/>`,
      `<circle cx="42" cy="58" r="11" fill="${C.orange}" stroke="${C.ink}" stroke-width="${OUT}"/>`,
      `<path d="M58 50 l8 8 M58 58 l8 8" fill="none" stroke="${C.ink}" stroke-width="2" stroke-linecap="round"/>`,
    ].join(''), { viewBox: [120, 120] }),

    mkSticker('ribcage', 'Ribcage', [
      // friendly front-on ribcage: central sternum + paired curved ribs
      `<rect x="54" y="22" width="12" height="64" rx="5" fill="${C.cream}" stroke="${C.ink}" stroke-width="${OUT}"/>`,
      `<path d="M54 32 q-30 4 -32 26" fill="none" stroke="${C.ink}" stroke-width="${LINE}" stroke-linecap="round"/>`,
      `<path d="M54 46 q-28 4 -30 24" fill="none" stroke="${C.ink}" stroke-width="${LINE}" stroke-linecap="round"/>`,
      `<path d="M54 60 q-24 4 -26 22" fill="none" stroke="${C.ink}" stroke-width="${LINE}" stroke-linecap="round"/>`,
      `<path d="M54 74 q-18 4 -20 18" fill="none" stroke="${C.ink}" stroke-width="${LINE}" stroke-linecap="round"/>`,
      `<path d="M66 32 q30 4 32 26" fill="none" stroke="${C.ink}" stroke-width="${LINE}" stroke-linecap="round"/>`,
      `<path d="M66 46 q28 4 30 24" fill="none" stroke="${C.ink}" stroke-width="${LINE}" stroke-linecap="round"/>`,
      `<path d="M66 60 q24 4 26 22" fill="none" stroke="${C.ink}" stroke-width="${LINE}" stroke-linecap="round"/>`,
      `<path d="M66 74 q18 4 20 18" fill="none" stroke="${C.ink}" stroke-width="${LINE}" stroke-linecap="round"/>`,
    ].join(''), { viewBox: [120, 110] }),

    mkSticker('skull-anatomical', 'Skull', [
      // clean anatomical skull, friendly not spooky
      `<path d="M60 16 C32 16 22 40 22 58 q0 16 12 22 l0 14 q0 6 8 6 l36 0 q8 0 8 -6 l0 -14 q12 -6 12 -22 C98 40 88 16 60 16 Z" fill="${C.paper}" stroke="${C.ink}" stroke-width="${OUT}" stroke-linejoin="round"/>`,
      `<circle cx="44" cy="54" r="9" fill="${C.navy}" stroke="${C.ink}" stroke-width="${LINE}"/>`,
      `<circle cx="76" cy="54" r="9" fill="${C.navy}" stroke="${C.ink}" stroke-width="${LINE}"/>`,
      `<path d="M60 64 l-6 12 12 0 Z" fill="${C.ink}"/>`,
      `<line x1="48" y1="92" x2="48" y2="104" stroke="${C.ink}" stroke-width="2"/>`,
      `<line x1="60" y1="92" x2="60" y2="106" stroke="${C.ink}" stroke-width="2"/>`,
      `<line x1="72" y1="92" x2="72" y2="104" stroke="${C.ink}" stroke-width="2"/>`,
    ].join(''), { viewBox: [120, 116] }),

    mkSticker('stethoscope', 'Stethoscope', [
      `<path d="M34 20 q-6 40 8 54 q14 14 28 0 q14 -14 8 -54" fill="none" stroke="${C.navy}" stroke-width="${OUT}" stroke-linecap="round"/>`,
      `<circle cx="34" cy="18" r="5" fill="${C.gold}" stroke="${C.ink}" stroke-width="2"/>`,
      `<circle cx="86" cy="18" r="5" fill="${C.gold}" stroke="${C.ink}" stroke-width="2"/>`,
      `<path d="M60 80 q0 18 18 22" fill="none" stroke="${C.navy}" stroke-width="${OUT}" stroke-linecap="round"/>`,
      `<circle cx="82" cy="104" r="14" fill="${C.teal}" stroke="${C.ink}" stroke-width="${OUT}"/>`,
      `<circle cx="82" cy="104" r="6" fill="${C.paper}" stroke="${C.ink}" stroke-width="2"/>`,
    ].join(''), { viewBox: [120, 124] }),

    mkSticker('syringe', 'Syringe', [
      `<rect x="30" y="38" width="48" height="20" rx="4" fill="${C.cream}" stroke="${C.ink}" stroke-width="${OUT}" transform="rotate(-45 54 48)"/>`,
      `<line x1="40" y1="24" x2="68" y2="52" stroke="${C.ink}" stroke-width="2"/>`,
      `<line x1="48" y1="32" x2="60" y2="44" stroke="${C.teal}" stroke-width="${LINE}"/>`,
      `<rect x="22" y="20" width="16" height="10" rx="2" fill="${C.red}" stroke="${C.ink}" stroke-width="${LINE}" transform="rotate(-45 30 25)"/>`,
      `<line x1="74" y1="58" x2="100" y2="84" stroke="${C.ink}" stroke-width="${OUT}" stroke-linecap="round"/>`,
      `<line x1="100" y1="84" x2="106" y2="90" stroke="${C.ink}" stroke-width="2" stroke-linecap="round"/>`,
    ].join(''), { viewBox: [120, 110] }),

    mkSticker('pill-capsule', 'Pill capsule', [
      // tilted two-tone capsule
      `<rect x="22" y="46" width="76" height="36" rx="18" fill="${C.paper}" stroke="${C.ink}" stroke-width="${OUT}" transform="rotate(-30 60 64)"/>`,
      `<path d="M60 28 a18 18 0 0 0 -16 9 l-22 38 a18 18 0 0 0 32 18 Z" fill="${C.red}" stroke="${C.ink}" stroke-width="${LINE}"/>`,
      `<circle cx="70" cy="48" r="3" fill="${C.paper}"/>`,
    ].join(''), { viewBox: [120, 120] }),

    mkSticker('sticking-plaster', 'Plaster', [
      `<rect x="22" y="46" width="76" height="28" rx="14" fill="${C.gold}" stroke="${C.ink}" stroke-width="${OUT}" transform="rotate(-20 60 60)"/>`,
      `<rect x="46" y="40" width="28" height="40" rx="5" fill="${C.cream}" stroke="${C.ink}" stroke-width="${LINE}" transform="rotate(-20 60 60)"/>`,
      `<circle cx="50" cy="52" r="2.5" fill="${C.ink}"/>`,
      `<circle cx="60" cy="60" r="2.5" fill="${C.ink}"/>`,
      `<circle cx="70" cy="68" r="2.5" fill="${C.ink}"/>`,
      `<circle cx="68" cy="50" r="2.5" fill="${C.ink}"/>`,
      `<circle cx="52" cy="70" r="2.5" fill="${C.ink}"/>`,
    ].join(''), { viewBox: [120, 120] }),

    mkSticker('first-aid-cross', 'First aid', [
      disc(60, 60, 46, C.red),
      `<path d="M48 28 h24 v20 h20 v24 h-20 v20 h-24 v-20 h-20 v-24 h20 Z" fill="${C.paper}" stroke="${C.ink}" stroke-width="${OUT}" stroke-linejoin="round"/>`,
    ].join(''), { viewBox: [120, 120] }),

    mkSticker('brain', 'Brain', [
      // friendly stylised brain with folds
      `<path d="M34 50 q-14 4 -10 18 q-8 10 4 18 q0 12 16 12 q8 8 16 0 q8 8 16 0 q16 0 16 -12 q12 -8 4 -18 q4 -14 -10 -18 q-4 -14 -18 -10 q-8 -6 -16 2 q-12 -6 -18 8 Z" fill="${C.pink}" stroke="${C.ink}" stroke-width="${OUT}" stroke-linejoin="round"/>`,
      `<path d="M60 36 q0 30 0 60" fill="none" stroke="${C.ink}" stroke-width="2"/>`,
      `<path d="M44 52 q8 4 4 12 M76 52 q-8 4 -4 12 M40 76 q10 -2 12 6 M80 76 q-10 -2 -12 6" fill="none" stroke="${C.ink}" stroke-width="2" stroke-linecap="round"/>`,
    ].join(''), { viewBox: [120, 116] }),

    mkSticker('tooth', 'Tooth', [
      `<path d="M40 22 q20 -10 40 0 q12 8 8 28 q-3 16 -8 34 q-4 14 -10 0 q-4 -16 -10 -16 q-6 0 -10 16 q-6 14 -10 0 q-5 -18 -8 -34 q-4 -20 8 -28 Z" fill="${C.paper}" stroke="${C.ink}" stroke-width="${OUT}" stroke-linejoin="round"/>`,
      `<path d="M46 36 q14 -6 28 0" fill="none" stroke="${C.ink}" stroke-width="2" stroke-linecap="round"/>`,
      `<path d="M70 40 q4 8 0 22" fill="none" stroke="${C.gold}" stroke-width="${LINE}" stroke-linecap="round"/>`,
    ].join(''), { viewBox: [120, 116] }),

    mkSticker('plaster-cast', 'Plaster cast', [
      // forearm cast with toe-end + sling-style bands, plus a doodle signature mark
      `<path d="M40 16 q40 0 44 24 q4 28 -4 58 q-4 14 -20 14 q-16 0 -20 -14 q-8 -30 -4 -58 q4 -22 4 -24 Z" fill="${C.paper}" stroke="${C.ink}" stroke-width="${OUT}" stroke-linejoin="round"/>`,
      `<path d="M38 40 q26 6 48 0 M38 60 q26 6 48 0 M40 80 q24 6 44 0" fill="none" stroke="${C.ink}" stroke-width="2"/>`,
      `<path d="M44 22 q16 -8 32 0" fill="${C.cream}" stroke="${C.ink}" stroke-width="${LINE}"/>`,
      `<path d="M52 70 q6 4 12 0" fill="none" stroke="${C.blue}" stroke-width="2" stroke-linecap="round"/>`,
    ].join(''), { viewBox: [120, 120] }),

    mkSticker('crutch', 'Crutch', [
      // underarm crutch
      `<path d="M44 16 q16 -6 32 0 l0 8 q-16 -6 -32 0 Z" fill="${C.gold}" stroke="${C.ink}" stroke-width="${OUT}" stroke-linejoin="round"/>`,
      `<line x1="50" y1="22" x2="56" y2="62" stroke="${C.brown}" stroke-width="${OUT}" stroke-linecap="round"/>`,
      `<line x1="70" y1="22" x2="64" y2="62" stroke="${C.brown}" stroke-width="${OUT}" stroke-linecap="round"/>`,
      `<rect x="48" y="40" width="24" height="9" rx="4" fill="${C.cream}" stroke="${C.ink}" stroke-width="${LINE}"/>`,
      `<line x1="60" y1="62" x2="60" y2="100" stroke="${C.brown}" stroke-width="${OUT}" stroke-linecap="round"/>`,
      `<circle cx="60" cy="106" r="6" fill="${C.navy}" stroke="${C.ink}" stroke-width="${LINE}"/>`,
    ].join(''), { viewBox: [120, 120] }),
  ],
};
