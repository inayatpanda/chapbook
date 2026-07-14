// Food & drink stickers — retro die-cut. TARGET: 14.
//
// Style rules (see ./_style.js): author each sticker with
//   import { mkSticker, RETRO, frame, path, circle, rect, line, text } from './_style.js';
// Decorative colour is fine, but every sticker MUST be self-contained inline SVG
// that passes sanitise() UNCHANGED — NO <script>/on*/<foreignObject>/href/url()/
// external refs/SMIL. mkSticker() asserts this for you.
import { mkSticker, RETRO as C, OUT, LINE, path, circle, ellipse, rect, line } from './_style.js';

export default {
  genre: 'food-drink',
  label: 'Food & drink',
  stickers: [
    mkSticker('coffee-cup', 'Coffee cup', [
      // takeaway cup: tapered body, lid, rising steam
      path('M44 26 q16 6 32 0', { stroke: C.brown, width: LINE, fill: 'none', 'stroke-linecap': 'round' }),
      path('M50 18 q10 4 20 0', { stroke: C.brown, width: LINE, fill: 'none', 'stroke-linecap': 'round' }),
      rect({ x: 34, y: 34, w: 52, h: 14, rx: 4, fill: C.red, stroke: C.ink, width: OUT }),
      path('M38 48 L46 100 H74 L82 48 Z', { fill: C.cream, stroke: C.ink, width: OUT, 'stroke-linejoin': 'round' }),
      rect({ x: 43, y: 64, w: 34, h: 18, rx: 3, fill: C.brown, stroke: C.ink, width: LINE }),
    ].join(''), { viewBox: [120, 120] }),

    mkSticker('hamburger', 'Hamburger', [
      // stacked bun, lettuce, patty
      path('M18 44 q42 -34 84 0 Z', { fill: C.gold, stroke: C.ink, width: OUT, 'stroke-linejoin': 'round' }),
      circle({ cx: 42, cy: 30, r: 2.4, fill: C.cream }),
      circle({ cx: 60, cy: 24, r: 2.4, fill: C.cream }),
      circle({ cx: 78, cy: 30, r: 2.4, fill: C.cream }),
      path('M16 46 q44 16 88 0 V52 q-44 16 -88 0 Z', { fill: C.green, stroke: C.ink, width: LINE, 'stroke-linejoin': 'round' }),
      rect({ x: 18, y: 54, w: 84, h: 16, rx: 6, fill: C.brown, stroke: C.ink, width: OUT }),
      path('M18 74 q42 24 84 0 V78 a8 8 0 0 1 -8 8 H26 a8 8 0 0 1 -8 -8 Z', { fill: C.gold, stroke: C.ink, width: OUT, 'stroke-linejoin': 'round' }),
    ].join(''), { viewBox: [120, 110] }),

    mkSticker('pizza-slice', 'Pizza slice', [
      // triangular slice, crust, pepperoni
      path('M60 14 L102 96 H18 Z', { fill: C.gold, stroke: C.ink, width: OUT, 'stroke-linejoin': 'round' }),
      path('M18 96 H102 L96 86 q-36 14 -72 0 Z', { fill: C.brown, stroke: C.ink, width: LINE, 'stroke-linejoin': 'round' }),
      circle({ cx: 60, cy: 56, r: 7, fill: C.red, stroke: C.ink, width: LINE }),
      circle({ cx: 44, cy: 76, r: 6, fill: C.red, stroke: C.ink, width: LINE }),
      circle({ cx: 76, cy: 76, r: 6, fill: C.red, stroke: C.ink, width: LINE }),
      circle({ cx: 60, cy: 32, r: 4, fill: C.red, stroke: C.ink, width: LINE }),
    ].join(''), { viewBox: [120, 110] }),

    mkSticker('ice-cream-cone', 'Ice cream cone', [
      // two scoops on a waffle cone
      path('M44 70 L60 110 L76 70 Z', { fill: C.gold, stroke: C.ink, width: OUT, 'stroke-linejoin': 'round' }),
      line({ x1: 50, y1: 74, x2: 60, y2: 96, stroke: C.brown, width: 2 }),
      line({ x1: 70, y1: 74, x2: 60, y2: 96, stroke: C.brown, width: 2 }),
      circle({ cx: 60, cy: 60, r: 22, fill: C.pink, stroke: C.ink, width: OUT }),
      circle({ cx: 60, cy: 34, r: 18, fill: C.cream, stroke: C.ink, width: OUT }),
      circle({ cx: 60, cy: 20, r: 5, fill: C.red, stroke: C.ink, width: LINE }),
    ].join(''), { viewBox: [120, 120] }),

    mkSticker('cupcake', 'Cupcake', [
      // wrapper + swirl frosting + cherry
      path('M34 64 L42 102 H78 L86 64 Z', { fill: C.paper, stroke: C.ink, width: OUT, 'stroke-linejoin': 'round' }),
      line({ x1: 50, y1: 66, x2: 54, y2: 100, stroke: C.ink, width: 2 }),
      line({ x1: 60, y1: 66, x2: 60, y2: 100, stroke: C.ink, width: 2 }),
      line({ x1: 70, y1: 66, x2: 66, y2: 100, stroke: C.ink, width: 2 }),
      path('M30 64 q4 -22 30 -22 q26 0 30 22 Z', { fill: C.teal, stroke: C.ink, width: OUT, 'stroke-linejoin': 'round' }),
      path('M40 46 q6 -16 20 -16 q14 0 20 16', { fill: C.teal, stroke: C.ink, width: LINE, 'stroke-linejoin': 'round' }),
      circle({ cx: 60, cy: 26, r: 6, fill: C.red, stroke: C.ink, width: LINE }),
    ].join(''), { viewBox: [120, 120] }),

    mkSticker('ring-donut', 'Ring donut', [
      // glazed donut with sprinkles
      circle({ cx: 60, cy: 60, r: 44, fill: C.brown, stroke: C.ink, width: OUT }),
      path('M60 16 a44 44 0 0 1 30 76 a30 30 0 0 0 -30 -52 a30 30 0 0 0 -30 22 a44 44 0 0 1 30 -46 Z', { fill: C.pink, stroke: C.ink, width: LINE, 'stroke-linejoin': 'round' }),
      circle({ cx: 60, cy: 60, r: 16, fill: C.paper, stroke: C.ink, width: OUT }),
      line({ x1: 50, y1: 30, x2: 56, y2: 36, stroke: C.gold, width: 3, 'stroke-linecap': 'round' }),
      line({ x1: 78, y1: 40, x2: 82, y2: 48, stroke: C.teal, width: 3, 'stroke-linecap': 'round' }),
      line({ x1: 36, y1: 56, x2: 42, y2: 60, stroke: C.red, width: 3, 'stroke-linecap': 'round' }),
      line({ x1: 84, y1: 70, x2: 88, y2: 76, stroke: C.gold, width: 3, 'stroke-linecap': 'round' }),
    ].join(''), { viewBox: [120, 120] }),

    mkSticker('taco', 'Taco', [
      // folded shell with fillings
      path('M16 86 q44 -86 88 0 Z', { fill: C.gold, stroke: C.ink, width: OUT, 'stroke-linejoin': 'round' }),
      path('M22 70 q38 -36 76 0', { fill: 'none', stroke: C.brown, width: LINE }),
      path('M28 74 q32 14 64 0 q-6 12 -32 12 q-26 0 -32 -12 Z', { fill: C.green, stroke: C.ink, width: LINE, 'stroke-linejoin': 'round' }),
      circle({ cx: 44, cy: 78, r: 5, fill: C.red, stroke: C.ink, width: 2 }),
      circle({ cx: 60, cy: 80, r: 5, fill: C.red, stroke: C.ink, width: 2 }),
      circle({ cx: 76, cy: 78, r: 5, fill: C.red, stroke: C.ink, width: 2 }),
    ].join(''), { viewBox: [120, 100] }),

    mkSticker('sushi-nigiri', 'Sushi nigiri', [
      // rice base, salmon on top, nori band
      ellipse({ cx: 60, cy: 78, rx: 42, ry: 18, fill: C.paper, stroke: C.ink, width: OUT }),
      path('M20 64 q40 -26 80 0 q4 8 -2 14 q-38 -22 -76 0 q-6 -6 -2 -14 Z', { fill: C.orange, stroke: C.ink, width: OUT, 'stroke-linejoin': 'round' }),
      path('M30 58 q30 -16 60 0', { fill: 'none', stroke: C.cream, width: 2 }),
      path('M42 60 q18 -12 36 0', { fill: 'none', stroke: C.cream, width: 2 }),
      rect({ x: 50, y: 66, w: 20, h: 26, rx: 2, fill: C.navy, stroke: C.ink, width: LINE }),
    ].join(''), { viewBox: [120, 110] }),

    mkSticker('fried-egg', 'Fried egg', [
      // wobbly white with golden yolk
      path('M30 40 q-18 8 -10 28 q-16 14 4 26 q-4 20 18 18 q14 16 32 4 q22 8 26 -12 q18 -10 6 -28 q12 -18 -8 -26 q-2 -22 -24 -16 q-18 -12 -34 2 q-12 -4 -10 4 Z', { fill: C.paper, stroke: C.ink, width: OUT, 'stroke-linejoin': 'round' }),
      circle({ cx: 62, cy: 60, r: 20, fill: C.gold, stroke: C.ink, width: OUT }),
      circle({ cx: 55, cy: 53, r: 5, fill: C.cream }),
    ].join(''), { viewBox: [120, 120] }),

    mkSticker('beer-mug', 'Beer mug', [
      // foamy head, amber body, handle
      path('M34 38 q6 -14 26 -10 q20 -4 26 10 q-26 8 -52 0 Z', { fill: C.cream, stroke: C.ink, width: OUT, 'stroke-linejoin': 'round' }),
      rect({ x: 34, y: 38, w: 52, h: 62, rx: 6, fill: C.gold, stroke: C.ink, width: OUT }),
      path('M86 50 h14 a8 8 0 0 1 8 8 v20 a8 8 0 0 1 -8 8 h-14', { fill: 'none', stroke: C.ink, width: OUT }),
      circle({ cx: 48, cy: 60, r: 3, fill: C.paper }),
      circle({ cx: 64, cy: 72, r: 3, fill: C.paper }),
      circle({ cx: 56, cy: 86, r: 3, fill: C.paper }),
    ].join(''), { viewBox: [120, 120] }),

    mkSticker('wine-glass', 'Wine glass', [
      // bowl of red, stem, base
      path('M38 22 q22 36 44 0 q0 30 -22 36 q-22 -6 -22 -36 Z', { fill: C.plum, stroke: C.ink, width: OUT, 'stroke-linejoin': 'round' }),
      path('M40 30 q20 16 40 0', { fill: 'none', stroke: C.ink, width: LINE }),
      line({ x1: 60, y1: 58, x2: 60, y2: 96, stroke: C.ink, width: OUT }),
      path('M40 100 q20 -8 40 0', { fill: 'none', stroke: C.ink, width: OUT, 'stroke-linecap': 'round' }),
    ].join(''), { viewBox: [120, 120] }),

    mkSticker('cocktail-umbrella', 'Cocktail', [
      // martini glass, cherry, paper umbrella
      path('M24 30 H96 L60 70 Z', { fill: C.teal, stroke: C.ink, width: OUT, 'stroke-linejoin': 'round' }),
      line({ x1: 60, y1: 70, x2: 60, y2: 98, stroke: C.ink, width: OUT }),
      path('M42 100 q18 -8 36 0', { fill: 'none', stroke: C.ink, width: OUT, 'stroke-linecap': 'round' }),
      circle({ cx: 50, cy: 60, r: 6, fill: C.red, stroke: C.ink, width: 2 }),
      line({ x1: 78, y1: 18, x2: 70, y2: 56, stroke: C.brown, width: 2 }),
      path('M58 18 q14 -16 28 0 q-14 6 -28 0 Z', { fill: C.pink, stroke: C.ink, width: LINE, 'stroke-linejoin': 'round' }),
      line({ x1: 58, y1: 18, x2: 86, y2: 18, stroke: C.ink, width: 2 }),
    ].join(''), { viewBox: [120, 120] }),

    mkSticker('cherries', 'Cherries', [
      // two cherries on stems with a leaf
      path('M62 18 q-22 18 -34 50', { fill: 'none', stroke: C.brown, width: LINE, 'stroke-linecap': 'round' }),
      path('M62 18 q14 22 22 48', { fill: 'none', stroke: C.brown, width: LINE, 'stroke-linecap': 'round' }),
      path('M62 18 q24 -12 38 6 q-22 8 -38 -6 Z', { fill: C.green, stroke: C.ink, width: LINE, 'stroke-linejoin': 'round' }),
      circle({ cx: 40, cy: 80, r: 18, fill: C.red, stroke: C.ink, width: OUT }),
      circle({ cx: 82, cy: 84, r: 16, fill: C.red, stroke: C.ink, width: OUT }),
      circle({ cx: 34, cy: 74, r: 4, fill: C.cream }),
      circle({ cx: 77, cy: 79, r: 3.6, fill: C.cream }),
    ].join(''), { viewBox: [120, 120] }),

    mkSticker('croissant', 'Croissant', [
      // crescent pastry with score lines
      path('M22 78 q-6 -28 22 -34 q34 -8 54 12 q12 14 0 26 q-10 -18 -30 -16 q14 6 16 22 q-18 4 -28 -10 q4 16 -8 18 q-16 0 -10 -18 q-8 4 -16 0 Z', { fill: C.gold, stroke: C.ink, width: OUT, 'stroke-linejoin': 'round' }),
      path('M40 56 q14 6 20 18', { fill: 'none', stroke: C.brown, width: 2 }),
      path('M58 50 q14 6 18 16', { fill: 'none', stroke: C.brown, width: 2 }),
    ].join(''), { viewBox: [120, 110] }),
  ],
};
