// Music stickers — retro die-cut. TARGET: 12.
//
// Style rules (see ./_style.js): author each sticker with
//   import { mkSticker, RETRO, frame, path, circle, rect, line, text } from './_style.js';
// Decorative colour is fine, but every sticker MUST be self-contained inline SVG
// that passes sanitise() UNCHANGED — NO <script>/on*/<foreignObject>/href/url()/
// external refs/SMIL. mkSticker() asserts this for you.
import { mkSticker, RETRO as C, OUT, LINE, disc, path, circle, ellipse, rect, line } from './_style.js';

export default {
  genre: 'music',
  label: 'Music',
  stickers: [
    mkSticker('electric-guitar', 'Electric guitar', [
      // angled body, neck, headstock
      path('M28 92 q-12 -14 0 -28 q-10 -16 8 -22 q18 -8 30 6 L96 18 V30 L66 56 q8 16 -8 26 q-14 10 -30 -10 q-10 6 0 0 Z', { fill: C.red, stroke: C.ink, width: OUT, 'stroke-linejoin': 'round' }),
      rect({ x: 60, y: 26, w: 42, h: 8, rx: 3, fill: C.brown, stroke: C.ink, width: LINE, transform: 'rotate(-32 60 26)' }),
      circle({ cx: 42, cy: 64, r: 7, fill: C.gold, stroke: C.ink, width: LINE }),
      line({ x1: 30, y1: 78, x2: 50, y2: 86, stroke: C.ink, width: 2 }),
      line({ x1: 34, y1: 72, x2: 54, y2: 80, stroke: C.ink, width: 2 }),
    ].join(''), { viewBox: [120, 110] }),

    mkSticker('vinyl-record', 'Vinyl record', [
      // black disc, label, grooves
      circle({ cx: 60, cy: 60, r: 48, fill: C.ink, stroke: C.ink, width: OUT }),
      circle({ cx: 60, cy: 60, r: 40, fill: 'none', stroke: C.navy, width: 2 }),
      circle({ cx: 60, cy: 60, r: 32, fill: 'none', stroke: C.navy, width: 2 }),
      circle({ cx: 60, cy: 60, r: 18, fill: C.red, stroke: C.ink, width: LINE }),
      circle({ cx: 60, cy: 60, r: 4, fill: C.paper, stroke: C.ink, width: 2 }),
    ].join(''), { viewBox: [120, 120] }),

    mkSticker('headphones', 'Headphones', [
      // arched band + two cups
      path('M24 70 V58 a36 36 0 0 1 72 0 V70', { fill: 'none', stroke: C.ink, width: OUT, 'stroke-linecap': 'round' }),
      rect({ x: 16, y: 62, w: 18, h: 32, rx: 8, fill: C.teal, stroke: C.ink, width: OUT }),
      rect({ x: 86, y: 62, w: 18, h: 32, rx: 8, fill: C.teal, stroke: C.ink, width: OUT }),
      circle({ cx: 25, cy: 78, r: 4, fill: C.gold }),
      circle({ cx: 95, cy: 78, r: 4, fill: C.gold }),
    ].join(''), { viewBox: [120, 110] }),

    mkSticker('eighth-note', 'Eighth note', [
      // single quaver
      ellipse({ cx: 44, cy: 86, rx: 18, ry: 13, fill: C.navy, stroke: C.ink, width: OUT, transform: 'rotate(-20 44 86)' }),
      line({ x1: 60, y1: 80, x2: 60, y2: 22, stroke: C.ink, width: OUT, 'stroke-linecap': 'round' }),
      path('M60 22 q22 6 18 30 q6 -22 -18 -42 Z', { fill: C.navy, stroke: C.ink, width: LINE, 'stroke-linejoin': 'round' }),
    ].join(''), { viewBox: [120, 120] }),

    mkSticker('cassette-tape', 'Cassette tape', [
      // shell, label, two reels
      rect({ x: 14, y: 28, w: 92, h: 64, rx: 8, fill: C.orange, stroke: C.ink, width: OUT }),
      rect({ x: 26, y: 36, w: 68, h: 18, rx: 3, fill: C.paper, stroke: C.ink, width: LINE }),
      rect({ x: 30, y: 62, w: 60, h: 22, rx: 4, fill: C.cream, stroke: C.ink, width: LINE }),
      circle({ cx: 44, cy: 73, r: 7, fill: C.ink, stroke: C.ink, width: 2 }),
      circle({ cx: 76, cy: 73, r: 7, fill: C.ink, stroke: C.ink, width: 2 }),
      circle({ cx: 44, cy: 73, r: 2.5, fill: C.paper }),
      circle({ cx: 76, cy: 73, r: 2.5, fill: C.paper }),
    ].join(''), { viewBox: [120, 120] }),

    mkSticker('retro-microphone', 'Microphone', [
      // round mic head, grille, stand
      circle({ cx: 60, cy: 40, r: 26, fill: C.navy, stroke: C.ink, width: OUT }),
      line({ x1: 44, y1: 30, x2: 76, y2: 30, stroke: C.gold, width: 2 }),
      line({ x1: 42, y1: 40, x2: 78, y2: 40, stroke: C.gold, width: 2 }),
      line({ x1: 44, y1: 50, x2: 76, y2: 50, stroke: C.gold, width: 2 }),
      rect({ x: 50, y: 64, w: 20, h: 14, rx: 3, fill: C.red, stroke: C.ink, width: LINE }),
      line({ x1: 60, y1: 78, x2: 60, y2: 100, stroke: C.ink, width: OUT }),
      path('M40 102 q20 -8 40 0', { fill: 'none', stroke: C.ink, width: OUT, 'stroke-linecap': 'round' }),
    ].join(''), { viewBox: [120, 120] }),

    mkSticker('piano-keys', 'Piano keys', [
      // white keys with black keys on top
      rect({ x: 16, y: 30, w: 88, h: 60, rx: 6, fill: C.paper, stroke: C.ink, width: OUT }),
      line({ x1: 38, y1: 32, x2: 38, y2: 88, stroke: C.ink, width: 2 }),
      line({ x1: 60, y1: 32, x2: 60, y2: 88, stroke: C.ink, width: 2 }),
      line({ x1: 82, y1: 32, x2: 82, y2: 88, stroke: C.ink, width: 2 }),
      rect({ x: 31, y: 30, w: 12, h: 36, rx: 2, fill: C.ink, stroke: C.ink, width: 2 }),
      rect({ x: 53, y: 30, w: 12, h: 36, rx: 2, fill: C.ink, stroke: C.ink, width: 2 }),
      rect({ x: 75, y: 30, w: 12, h: 36, rx: 2, fill: C.ink, stroke: C.ink, width: 2 }),
    ].join(''), { viewBox: [120, 120] }),

    mkSticker('boombox', 'Boombox', [
      // twin speakers, handle, deck
      path('M40 24 h40', { fill: 'none', stroke: C.ink, width: OUT, 'stroke-linecap': 'round' }),
      rect({ x: 14, y: 30, w: 92, h: 60, rx: 8, fill: C.red, stroke: C.ink, width: OUT }),
      circle({ cx: 38, cy: 60, r: 16, fill: C.cream, stroke: C.ink, width: LINE }),
      circle({ cx: 38, cy: 60, r: 6, fill: C.navy, stroke: C.ink, width: 2 }),
      circle({ cx: 82, cy: 60, r: 16, fill: C.cream, stroke: C.ink, width: LINE }),
      circle({ cx: 82, cy: 60, r: 6, fill: C.navy, stroke: C.ink, width: 2 }),
      rect({ x: 52, y: 40, w: 16, h: 8, rx: 2, fill: C.gold, stroke: C.ink, width: 2 }),
    ].join(''), { viewBox: [120, 110] }),

    mkSticker('trumpet', 'Trumpet', [
      // bell, tubing, valves
      path('M16 60 L52 48 V72 Z', { fill: C.gold, stroke: C.ink, width: OUT, 'stroke-linejoin': 'round' }),
      rect({ x: 50, y: 50, w: 44, h: 20, rx: 6, fill: C.gold, stroke: C.ink, width: OUT }),
      circle({ cx: 100, cy: 60, r: 10, fill: C.gold, stroke: C.ink, width: OUT }),
      line({ x1: 62, y1: 50, x2: 62, y2: 34, stroke: C.ink, width: LINE }),
      line({ x1: 74, y1: 50, x2: 74, y2: 34, stroke: C.ink, width: LINE }),
      line({ x1: 86, y1: 50, x2: 86, y2: 34, stroke: C.ink, width: LINE }),
      circle({ cx: 62, cy: 32, r: 4, fill: C.red, stroke: C.ink, width: 2 }),
      circle({ cx: 74, cy: 32, r: 4, fill: C.red, stroke: C.ink, width: 2 }),
      circle({ cx: 86, cy: 32, r: 4, fill: C.red, stroke: C.ink, width: 2 }),
    ].join(''), { viewBox: [120, 100] }),

    mkSticker('snare-drum', 'Snare drum', [
      // cylinder with lugs and crossed sticks
      ellipse({ cx: 60, cy: 40, rx: 40, ry: 16, fill: C.paper, stroke: C.ink, width: OUT }),
      path('M20 40 V72 a40 16 0 0 0 80 0 V40', { fill: C.red, stroke: C.ink, width: OUT, 'stroke-linejoin': 'round' }),
      line({ x1: 32, y1: 50, x2: 32, y2: 70, stroke: C.gold, width: LINE }),
      line({ x1: 60, y1: 56, x2: 60, y2: 76, stroke: C.gold, width: LINE }),
      line({ x1: 88, y1: 50, x2: 88, y2: 70, stroke: C.gold, width: LINE }),
      line({ x1: 30, y1: 18, x2: 70, y2: 44, stroke: C.brown, width: OUT, 'stroke-linecap': 'round' }),
      line({ x1: 90, y1: 18, x2: 50, y2: 44, stroke: C.brown, width: OUT, 'stroke-linecap': 'round' }),
    ].join(''), { viewBox: [120, 100] }),

    mkSticker('speaker-waves', 'Speaker', [
      // speaker box emitting sound waves
      path('M24 46 H42 L62 28 V92 L42 74 H24 Z', { fill: C.navy, stroke: C.ink, width: OUT, 'stroke-linejoin': 'round' }),
      path('M74 44 q12 16 0 32', { fill: 'none', stroke: C.teal, width: OUT, 'stroke-linecap': 'round' }),
      path('M86 34 q22 26 0 52', { fill: 'none', stroke: C.gold, width: OUT, 'stroke-linecap': 'round' }),
    ].join(''), { viewBox: [120, 120] }),

    mkSticker('treble-clef', 'Treble clef', [
      // stylised G-clef on a badge
      disc(60, 60, 48, C.cream),
      path('M64 24 q-20 6 -20 30 q0 22 18 28 q22 8 22 -14 q0 -16 -18 -16 q-12 0 -12 12 q0 8 8 10', { fill: 'none', stroke: C.plum, width: OUT, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }),
      line({ x1: 64, y1: 24, x2: 60, y2: 88, stroke: C.plum, width: OUT, 'stroke-linecap': 'round' }),
      circle({ cx: 56, cy: 92, r: 6, fill: C.plum, stroke: C.ink, width: 2 }),
    ].join(''), { viewBox: [120, 120] }),
  ],
};
