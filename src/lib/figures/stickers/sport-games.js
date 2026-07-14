// Sport & games stickers — retro die-cut. TARGET: ~14.
//
// Style rules (see ./_style.js): author each sticker with mkSticker/RETRO/
// primitives so the whole pack stays cohesive AND sanitise-clean. Decorative
// colour is fine, but every sticker MUST be self-contained inline SVG that
// passes sanitise() UNCHANGED — NO <script>/on*/<foreignObject>/href/url()/
// external refs/SMIL. mkSticker() asserts this for you.
import { mkSticker, RETRO as C, OUT, LINE, disc, path, circle, ellipse, rect, line, text } from './_style.js';

export default {
  genre: 'sport-games',
  label: 'Sport & games',
  stickers: [
    mkSticker('soccer-ball', 'Football', [
      circle({ cx: 60, cy: 60, r: 44, fill: C.paper, stroke: C.ink, width: OUT }),
      // central pentagon
      path('M60 38 L77 51 L70 72 L50 72 L43 51 Z', { fill: C.ink }),
      // spokes out to the rim
      line({ x1: 60, y1: 38, x2: 60, y2: 18, stroke: C.ink, width: LINE }),
      line({ x1: 77, y1: 51, x2: 96, y2: 44, stroke: C.ink, width: LINE }),
      line({ x1: 70, y1: 72, x2: 84, y2: 92, stroke: C.ink, width: LINE }),
      line({ x1: 50, y1: 72, x2: 36, y2: 92, stroke: C.ink, width: LINE }),
      line({ x1: 43, y1: 51, x2: 24, y2: 44, stroke: C.ink, width: LINE }),
    ].join(''), { viewBox: [120, 120] }),

    mkSticker('basketball', 'Basketball', [
      circle({ cx: 60, cy: 60, r: 44, fill: C.orange, stroke: C.ink, width: OUT }),
      line({ x1: 16, y1: 60, x2: 104, y2: 60, stroke: C.ink, width: LINE }),
      line({ x1: 60, y1: 16, x2: 60, y2: 104, stroke: C.ink, width: LINE }),
      path('M28 28 Q60 52 28 92', { fill: 'none', stroke: C.ink, width: LINE }),
      path('M92 28 Q60 52 92 92', { fill: 'none', stroke: C.ink, width: LINE }),
    ].join(''), { viewBox: [120, 120] }),

    mkSticker('tennis-racket', 'Tennis racket', [
      // handle
      rect({ x: 70, y: 78, w: 10, h: 30, rx: 4, fill: C.brown, stroke: C.ink, width: OUT, transform: 'rotate(-30 75 93)' }),
      // head
      ellipse({ cx: 50, cy: 48, rx: 28, ry: 34, fill: C.gold, stroke: C.ink, width: OUT }),
      ellipse({ cx: 50, cy: 48, rx: 19, ry: 25, fill: C.paper, stroke: C.ink, width: LINE }),
      // strings
      line({ x1: 36, y1: 28, x2: 36, y2: 68, stroke: C.ink, width: 2 }),
      line({ x1: 50, y1: 24, x2: 50, y2: 72, stroke: C.ink, width: 2 }),
      line({ x1: 64, y1: 28, x2: 64, y2: 68, stroke: C.ink, width: 2 }),
      line({ x1: 32, y1: 38, x2: 68, y2: 38, stroke: C.ink, width: 2 }),
      line({ x1: 31, y1: 48, x2: 69, y2: 48, stroke: C.ink, width: 2 }),
      line({ x1: 32, y1: 58, x2: 68, y2: 58, stroke: C.ink, width: 2 }),
      // ball
      circle({ cx: 92, cy: 30, r: 11, fill: C.green, stroke: C.ink, width: LINE }),
      path('M83 26 Q92 32 101 26', { fill: 'none', stroke: C.paper, width: 2 }),
    ].join(''), { viewBox: [120, 120] }),

    mkSticker('trophy-cup', 'Trophy cup', [
      // handles
      path('M34 38 Q16 40 26 60 Q32 66 42 62', { fill: 'none', stroke: C.ink, width: OUT }),
      path('M86 38 Q104 40 94 60 Q88 66 78 62', { fill: 'none', stroke: C.ink, width: OUT }),
      // bowl
      path('M30 30 H90 V44 Q90 78 60 84 Q30 78 30 44 Z', { fill: C.gold, stroke: C.ink, width: OUT, 'stroke-linejoin': 'round' }),
      // stem + base
      rect({ x: 54, y: 84, w: 12, h: 14, fill: C.gold, stroke: C.ink, width: LINE }),
      rect({ x: 40, y: 98, w: 40, h: 10, rx: 3, fill: C.brown, stroke: C.ink, width: OUT }),
      // star badge
      path('M60 44 L64 54 L75 54 L66 61 L70 72 L60 65 L50 72 L54 61 L45 54 L56 54 Z', { fill: C.red, stroke: C.ink, width: 2, 'stroke-linejoin': 'round' }),
    ].join(''), { viewBox: [120, 120] }),

    mkSticker('medal-ribbon', 'Medal', [
      // ribbon tails
      path('M44 14 L40 64 L60 52 L80 64 L76 14 Z', { fill: C.red, stroke: C.ink, width: OUT, 'stroke-linejoin': 'round' }),
      line({ x1: 60, y1: 22, x2: 60, y2: 52, stroke: C.paper, width: 3 }),
      // medal
      disc(60, 82, 24, C.gold),
      text('1', 60, 90, { size: 24, fill: C.ink }),
    ].join(''), { viewBox: [120, 120] }),

    mkSticker('dumbbell', 'Dumbbell', [
      rect({ x: 44, y: 52, w: 32, h: 16, rx: 4, fill: C.navy, stroke: C.ink, width: OUT }),
      rect({ x: 16, y: 38, w: 16, h: 44, rx: 5, fill: C.red, stroke: C.ink, width: OUT }),
      rect({ x: 32, y: 46, w: 12, h: 28, rx: 4, fill: C.orange, stroke: C.ink, width: LINE }),
      rect({ x: 88, y: 38, w: 16, h: 44, rx: 5, fill: C.red, stroke: C.ink, width: OUT }),
      rect({ x: 76, y: 46, w: 12, h: 28, rx: 4, fill: C.orange, stroke: C.ink, width: LINE }),
    ].join(''), { viewBox: [120, 120] }),

    mkSticker('dice-pair', 'Dice', [
      // back die
      rect({ x: 56, y: 22, w: 44, h: 44, rx: 9, fill: C.red, stroke: C.ink, width: OUT, transform: 'rotate(12 78 44)' }),
      // front die
      rect({ x: 22, y: 54, w: 46, h: 46, rx: 9, fill: C.paper, stroke: C.ink, width: OUT }),
      // pips (5)
      circle({ cx: 33, cy: 65, r: 4, fill: C.ink, stroke: 'none', width: 0 }),
      circle({ cx: 57, cy: 65, r: 4, fill: C.ink, stroke: 'none', width: 0 }),
      circle({ cx: 45, cy: 77, r: 4, fill: C.ink, stroke: 'none', width: 0 }),
      circle({ cx: 33, cy: 89, r: 4, fill: C.ink, stroke: 'none', width: 0 }),
      circle({ cx: 57, cy: 89, r: 4, fill: C.ink, stroke: 'none', width: 0 }),
    ].join(''), { viewBox: [120, 120] }),

    mkSticker('game-controller', 'Controller', [
      path('M28 44 H92 Q108 44 108 64 Q108 92 92 92 Q80 92 76 80 H44 Q40 92 28 92 Q12 92 12 64 Q12 44 28 44 Z', { fill: C.navy, stroke: C.ink, width: OUT, 'stroke-linejoin': 'round' }),
      // d-pad
      path('M30 58 H38 V66 H46 V74 H38 V82 H30 V74 H22 V66 H30 Z', { fill: C.paper, stroke: C.ink, width: 2, 'stroke-linejoin': 'round' }),
      // buttons
      circle({ cx: 84, cy: 60, r: 6, fill: C.red, stroke: C.ink, width: 2 }),
      circle({ cx: 98, cy: 70, r: 6, fill: C.gold, stroke: C.ink, width: 2 }),
      circle({ cx: 70, cy: 70, r: 6, fill: C.teal, stroke: C.ink, width: 2 }),
      circle({ cx: 84, cy: 80, r: 6, fill: C.green, stroke: C.ink, width: 2 }),
    ].join(''), { viewBox: [120, 120] }),

    mkSticker('chess-knight', 'Chess knight', [
      // base
      rect({ x: 32, y: 96, w: 56, h: 12, rx: 4, fill: C.navy, stroke: C.ink, width: OUT }),
      rect({ x: 40, y: 86, w: 40, h: 12, rx: 3, fill: C.navy, stroke: C.ink, width: LINE }),
      // horse head
      path('M44 86 Q36 64 44 48 Q40 40 46 30 L54 38 Q64 28 80 34 Q92 42 90 64 Q88 78 80 86 Z', { fill: C.cream, stroke: C.ink, width: OUT, 'stroke-linejoin': 'round' }),
      // mane
      path('M46 30 Q40 44 44 60', { fill: 'none', stroke: C.ink, width: LINE }),
      // eye
      circle({ cx: 64, cy: 48, r: 3, fill: C.ink, stroke: 'none', width: 0 }),
    ].join(''), { viewBox: [120, 120] }),

    mkSticker('dartboard', 'Dartboard', [
      circle({ cx: 60, cy: 60, r: 46, fill: C.green, stroke: C.ink, width: OUT }),
      circle({ cx: 60, cy: 60, r: 34, fill: C.cream, stroke: C.ink, width: LINE }),
      circle({ cx: 60, cy: 60, r: 22, fill: C.red, stroke: C.ink, width: LINE }),
      circle({ cx: 60, cy: 60, r: 10, fill: C.gold, stroke: C.ink, width: LINE }),
      circle({ cx: 60, cy: 60, r: 4, fill: C.navy, stroke: C.ink, width: 2 }),
      line({ x1: 60, y1: 14, x2: 60, y2: 106, stroke: C.ink, width: 2 }),
      line({ x1: 14, y1: 60, x2: 106, y2: 60, stroke: C.ink, width: 2 }),
    ].join(''), { viewBox: [120, 120] }),

    mkSticker('bowling', 'Bowling', [
      // pin
      path('M52 16 Q44 26 48 40 Q40 56 44 84 Q44 98 58 98 Q72 98 72 84 Q76 56 68 40 Q72 26 64 16 Q58 12 52 16 Z', { fill: C.paper, stroke: C.ink, width: OUT, 'stroke-linejoin': 'round' }),
      rect({ x: 47, y: 32, w: 22, h: 6, rx: 3, fill: C.red, stroke: C.ink, width: 2 }),
      // ball
      circle({ cx: 92, cy: 84, r: 22, fill: C.navy, stroke: C.ink, width: OUT }),
      circle({ cx: 86, cy: 78, r: 3, fill: C.paper, stroke: C.ink, width: 1.5 }),
      circle({ cx: 96, cy: 76, r: 3, fill: C.paper, stroke: C.ink, width: 1.5 }),
      circle({ cx: 91, cy: 86, r: 3, fill: C.paper, stroke: C.ink, width: 1.5 }),
    ].join(''), { viewBox: [120, 120] }),

    mkSticker('skateboard', 'Skateboard', [
      path('M14 56 Q14 70 30 70 H90 Q106 70 106 56 Q106 52 96 52 H24 Q14 52 14 56 Z', { fill: C.orange, stroke: C.ink, width: OUT, 'stroke-linejoin': 'round' }),
      line({ x1: 34, y1: 70, x2: 34, y2: 80, stroke: C.ink, width: OUT }),
      line({ x1: 86, y1: 70, x2: 86, y2: 80, stroke: C.ink, width: OUT }),
      circle({ cx: 30, cy: 86, r: 8, fill: C.gold, stroke: C.ink, width: LINE }),
      circle({ cx: 90, cy: 86, r: 8, fill: C.gold, stroke: C.ink, width: LINE }),
      line({ x1: 26, y1: 58, x2: 94, y2: 58, stroke: C.ink, width: 2, 'stroke-dasharray': '4 5' }),
    ].join(''), { viewBox: [120, 120] }),

    mkSticker('baseball-bat', 'Baseball', [
      // bat
      path('M30 96 L40 86 Q70 56 96 30 Q102 24 96 18 Q90 12 84 18 Q58 44 28 74 L18 84 Z', { fill: C.brown, stroke: C.ink, width: OUT, 'stroke-linejoin': 'round' }),
      line({ x1: 24, y1: 80, x2: 34, y2: 90, stroke: C.ink, width: 2 }),
      // ball
      circle({ cx: 38, cy: 36, r: 16, fill: C.paper, stroke: C.ink, width: OUT }),
      path('M28 28 Q34 36 28 44', { fill: 'none', stroke: C.red, width: 2 }),
      path('M48 28 Q42 36 48 44', { fill: 'none', stroke: C.red, width: 2 }),
    ].join(''), { viewBox: [120, 120] }),

    mkSticker('whistle', 'Whistle', [
      // body
      path('M24 50 H64 Q86 50 86 70 Q86 92 62 92 Q38 92 30 72 H24 Q16 72 16 62 V60 Q16 50 24 50 Z', { fill: C.red, stroke: C.ink, width: OUT, 'stroke-linejoin': 'round' }),
      // mouthpiece + ring
      rect({ x: 64, y: 40, w: 16, h: 12, rx: 3, fill: C.gold, stroke: C.ink, width: LINE }),
      circle({ cx: 84, cy: 36, r: 8, fill: 'none', stroke: C.ink, width: OUT }),
      // pea + airhole
      circle({ cx: 50, cy: 70, r: 7, fill: C.paper, stroke: C.ink, width: LINE }),
      line({ x1: 30, y1: 54, x2: 60, y2: 54, stroke: C.ink, width: 2 }),
    ].join(''), { viewBox: [120, 110] }),
  ],
};
