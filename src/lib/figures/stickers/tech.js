// Tech stickers — retro die-cut. TARGET: ~14.
//
// Style rules (see ./_style.js): author each sticker with mkSticker/RETRO/
// primitives so the whole pack stays cohesive AND sanitise-clean. Decorative
// colour is fine, but every sticker MUST be self-contained inline SVG that
// passes sanitise() UNCHANGED — NO <script>/on*/<foreignObject>/href/url()/
// external refs/SMIL. mkSticker() asserts this for you. Lean retro-tech.
import { mkSticker, RETRO as C, OUT, LINE, disc, path, circle, ellipse, rect, line, text } from './_style.js';

export default {
  genre: 'tech',
  label: 'Tech',
  stickers: [
    mkSticker('floppy-disk', 'Floppy disk', [
      rect({ x: 18, y: 18, w: 84, h: 84, rx: 8, fill: C.navy, stroke: C.ink, width: OUT }),
      // metal shutter
      rect({ x: 38, y: 18, w: 44, h: 30, fill: C.cream, stroke: C.ink, width: LINE }),
      rect({ x: 62, y: 22, w: 12, h: 22, rx: 2, fill: C.navy, stroke: C.ink, width: 2 }),
      // label
      rect({ x: 30, y: 56, w: 60, h: 38, rx: 3, fill: C.paper, stroke: C.ink, width: LINE }),
      line({ x1: 36, y1: 66, x2: 84, y2: 66, stroke: C.ink, width: 2 }),
      line({ x1: 36, y1: 74, x2: 84, y2: 74, stroke: C.ink, width: 2 }),
      line({ x1: 36, y1: 82, x2: 72, y2: 82, stroke: C.ink, width: 2 }),
    ].join(''), { viewBox: [120, 120] }),

    mkSticker('crt-monitor', 'Computer', [
      rect({ x: 14, y: 18, w: 92, h: 68, rx: 8, fill: C.cream, stroke: C.ink, width: OUT }),
      // screen
      rect({ x: 24, y: 26, w: 72, h: 52, rx: 4, fill: C.teal, stroke: C.ink, width: LINE }),
      line({ x1: 34, y1: 40, x2: 64, y2: 40, stroke: C.paper, width: 2 }),
      line({ x1: 34, y1: 50, x2: 78, y2: 50, stroke: C.paper, width: 2 }),
      line({ x1: 34, y1: 60, x2: 56, y2: 60, stroke: C.paper, width: 2 }),
      // stand
      rect({ x: 50, y: 86, w: 20, h: 12, fill: C.navy, stroke: C.ink, width: LINE }),
      rect({ x: 36, y: 98, w: 48, h: 10, rx: 3, fill: C.navy, stroke: C.ink, width: OUT }),
    ].join(''), { viewBox: [120, 120] }),

    mkSticker('smartphone', 'Smartphone', [
      rect({ x: 36, y: 10, w: 48, h: 100, rx: 12, fill: C.navy, stroke: C.ink, width: OUT }),
      rect({ x: 44, y: 22, w: 32, h: 68, rx: 3, fill: C.teal, stroke: C.ink, width: LINE }),
      circle({ cx: 60, cy: 100, r: 5, fill: C.cream, stroke: C.ink, width: 2 }),
      line({ x1: 52, y1: 16, x2: 68, y2: 16, stroke: C.cream, width: 3 }),
      circle({ cx: 60, cy: 50, r: 9, fill: C.gold, stroke: C.ink, width: 2 }),
    ].join(''), { viewBox: [120, 120] }),

    mkSticker('wifi-signal', 'Wi-Fi', [
      disc(60, 60, 46, C.blue),
      circle({ cx: 60, cy: 78, r: 6, fill: C.paper, stroke: C.ink, width: 2 }),
      path('M40 56 Q60 40 80 56', { fill: 'none', stroke: C.paper, width: OUT, 'stroke-linecap': 'round' }),
      path('M30 44 Q60 22 90 44', { fill: 'none', stroke: C.paper, width: OUT, 'stroke-linecap': 'round' }),
    ].join(''), { viewBox: [120, 120] }),

    mkSticker('robot-head', 'Robot', [
      // antenna
      line({ x1: 60, y1: 22, x2: 60, y2: 12, stroke: C.ink, width: OUT }),
      circle({ cx: 60, cy: 10, r: 6, fill: C.red, stroke: C.ink, width: 2 }),
      // head
      rect({ x: 24, y: 24, w: 72, h: 64, rx: 12, fill: C.teal, stroke: C.ink, width: OUT }),
      // eyes
      circle({ cx: 46, cy: 50, r: 9, fill: C.paper, stroke: C.ink, width: LINE }),
      circle({ cx: 46, cy: 50, r: 4, fill: C.ink, stroke: 'none', width: 0 }),
      circle({ cx: 74, cy: 50, r: 9, fill: C.paper, stroke: C.ink, width: LINE }),
      circle({ cx: 74, cy: 50, r: 4, fill: C.ink, stroke: 'none', width: 0 }),
      // mouth
      rect({ x: 42, y: 68, w: 36, h: 10, rx: 3, fill: C.gold, stroke: C.ink, width: LINE }),
      line({ x1: 52, y1: 68, x2: 52, y2: 78, stroke: C.ink, width: 2 }),
      line({ x1: 62, y1: 68, x2: 62, y2: 78, stroke: C.ink, width: 2 }),
      line({ x1: 72, y1: 68, x2: 72, y2: 78, stroke: C.ink, width: 2 }),
    ].join(''), { viewBox: [120, 110] }),

    mkSticker('usb-stick', 'USB stick', [
      // metal connector
      rect({ x: 18, y: 46, w: 24, h: 24, fill: C.cream, stroke: C.ink, width: OUT }),
      rect({ x: 24, y: 52, w: 5, h: 5, fill: C.ink, stroke: 'none', width: 0 }),
      rect({ x: 24, y: 60, w: 5, h: 5, fill: C.ink, stroke: 'none', width: 0 }),
      // body
      rect({ x: 42, y: 38, w: 60, h: 40, rx: 8, fill: C.red, stroke: C.ink, width: OUT }),
      // cap groove + indicator
      line({ x1: 56, y1: 38, x2: 56, y2: 78, stroke: C.ink, width: LINE }),
      circle({ cx: 84, cy: 58, r: 5, fill: C.gold, stroke: C.ink, width: 2 }),
    ].join(''), { viewBox: [120, 110] }),

    mkSticker('microchip', 'Microchip', [
      rect({ x: 34, y: 34, w: 52, h: 52, rx: 6, fill: C.navy, stroke: C.ink, width: OUT }),
      rect({ x: 46, y: 46, w: 28, h: 28, rx: 3, fill: C.teal, stroke: C.ink, width: LINE }),
      circle({ cx: 60, cy: 60, r: 6, fill: C.gold, stroke: C.ink, width: 2 }),
      // pins
      line({ x1: 44, y1: 34, x2: 44, y2: 20, stroke: C.ink, width: LINE }),
      line({ x1: 60, y1: 34, x2: 60, y2: 20, stroke: C.ink, width: LINE }),
      line({ x1: 76, y1: 34, x2: 76, y2: 20, stroke: C.ink, width: LINE }),
      line({ x1: 44, y1: 86, x2: 44, y2: 100, stroke: C.ink, width: LINE }),
      line({ x1: 60, y1: 86, x2: 60, y2: 100, stroke: C.ink, width: LINE }),
      line({ x1: 76, y1: 86, x2: 76, y2: 100, stroke: C.ink, width: LINE }),
      line({ x1: 34, y1: 44, x2: 20, y2: 44, stroke: C.ink, width: LINE }),
      line({ x1: 34, y1: 60, x2: 20, y2: 60, stroke: C.ink, width: LINE }),
      line({ x1: 34, y1: 76, x2: 20, y2: 76, stroke: C.ink, width: LINE }),
      line({ x1: 86, y1: 44, x2: 100, y2: 44, stroke: C.ink, width: LINE }),
      line({ x1: 86, y1: 60, x2: 100, y2: 60, stroke: C.ink, width: LINE }),
      line({ x1: 86, y1: 76, x2: 100, y2: 76, stroke: C.ink, width: LINE }),
    ].join(''), { viewBox: [120, 120] }),

    mkSticker('gear-cog', 'Settings', [
      disc(60, 60, 42, C.orange),
      // teeth
      path('M60 14 L66 26 H54 Z', { fill: C.orange, stroke: C.ink, width: LINE, 'stroke-linejoin': 'round' }),
      path('M60 106 L54 94 H66 Z', { fill: C.orange, stroke: C.ink, width: LINE, 'stroke-linejoin': 'round' }),
      path('M14 60 L26 54 V66 Z', { fill: C.orange, stroke: C.ink, width: LINE, 'stroke-linejoin': 'round' }),
      path('M106 60 L94 66 V54 Z', { fill: C.orange, stroke: C.ink, width: LINE, 'stroke-linejoin': 'round' }),
      path('M27 27 L40 32 L32 40 Z', { fill: C.orange, stroke: C.ink, width: LINE, 'stroke-linejoin': 'round' }),
      path('M93 93 L80 88 L88 80 Z', { fill: C.orange, stroke: C.ink, width: LINE, 'stroke-linejoin': 'round' }),
      path('M93 27 L88 40 L80 32 Z', { fill: C.orange, stroke: C.ink, width: LINE, 'stroke-linejoin': 'round' }),
      path('M27 93 L32 80 L40 88 Z', { fill: C.orange, stroke: C.ink, width: LINE, 'stroke-linejoin': 'round' }),
      circle({ cx: 60, cy: 60, r: 16, fill: C.cream, stroke: C.ink, width: LINE }),
    ].join(''), { viewBox: [120, 120] }),

    mkSticker('cloud', 'Cloud sync', [
      path('M30 84 Q12 84 14 66 Q16 52 32 52 Q34 32 56 32 Q78 32 80 52 Q104 50 104 70 Q104 84 88 84 Z', { fill: C.blue, stroke: C.ink, width: OUT, 'stroke-linejoin': 'round' }),
      // up arrow
      path('M59 76 V58 M59 58 L50 66 M59 58 L68 66', { fill: 'none', stroke: C.paper, width: LINE, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }),
    ].join(''), { viewBox: [120, 110] }),

    mkSticker('battery', 'Battery', [
      rect({ x: 16, y: 38, w: 80, h: 44, rx: 6, fill: C.cream, stroke: C.ink, width: OUT }),
      rect({ x: 96, y: 50, w: 10, h: 20, rx: 3, fill: C.ink, stroke: 'none', width: 0 }),
      // charge cells
      rect({ x: 24, y: 46, w: 16, h: 28, rx: 2, fill: C.green, stroke: C.ink, width: 2 }),
      rect({ x: 44, y: 46, w: 16, h: 28, rx: 2, fill: C.green, stroke: C.ink, width: 2 }),
      rect({ x: 64, y: 46, w: 16, h: 28, rx: 2, fill: C.green, stroke: C.ink, width: 2 }),
    ].join(''), { viewBox: [120, 120] }),

    mkSticker('camera-aperture', 'Camera lens', [
      circle({ cx: 60, cy: 60, r: 44, fill: C.navy, stroke: C.ink, width: OUT }),
      circle({ cx: 60, cy: 60, r: 30, fill: C.cream, stroke: C.ink, width: LINE }),
      // aperture blades
      path('M60 30 L78 42 L60 60 Z', { fill: C.teal, stroke: C.ink, width: 2, 'stroke-linejoin': 'round' }),
      path('M86 54 L84 76 L60 60 Z', { fill: C.gold, stroke: C.ink, width: 2, 'stroke-linejoin': 'round' }),
      path('M72 84 L50 88 L60 60 Z', { fill: C.red, stroke: C.ink, width: 2, 'stroke-linejoin': 'round' }),
      path('M38 78 L30 58 L60 60 Z', { fill: C.orange, stroke: C.ink, width: 2, 'stroke-linejoin': 'round' }),
      path('M34 48 L52 34 L60 60 Z', { fill: C.pink, stroke: C.ink, width: 2, 'stroke-linejoin': 'round' }),
    ].join(''), { viewBox: [120, 120] }),

    mkSticker('joystick', 'Joystick', [
      // base
      ellipse({ cx: 60, cy: 92, rx: 40, ry: 14, fill: C.navy, stroke: C.ink, width: OUT }),
      rect({ x: 28, y: 76, w: 64, h: 16, fill: C.navy, stroke: C.ink, width: LINE }),
      // shaft
      rect({ x: 54, y: 40, w: 12, h: 42, fill: C.cream, stroke: C.ink, width: LINE }),
      // ball top
      circle({ cx: 60, cy: 34, r: 16, fill: C.red, stroke: C.ink, width: OUT }),
      // button
      circle({ cx: 80, cy: 80, r: 6, fill: C.gold, stroke: C.ink, width: 2 }),
    ].join(''), { viewBox: [120, 120] }),

    mkSticker('satellite-dish', 'Satellite dish', [
      // dish
      path('M22 30 Q86 26 96 90 Q40 96 22 30 Z', { fill: C.cream, stroke: C.ink, width: OUT, 'stroke-linejoin': 'round' }),
      // feed arm + horn
      line({ x1: 58, y1: 58, x2: 78, y2: 30, stroke: C.ink, width: LINE }),
      circle({ cx: 78, cy: 30, r: 7, fill: C.red, stroke: C.ink, width: LINE }),
      // mast
      line({ x1: 50, y1: 86, x2: 60, y2: 108, stroke: C.ink, width: OUT }),
      rect({ x: 44, y: 104, w: 32, h: 8, rx: 3, fill: C.navy, stroke: C.ink, width: LINE }),
      // signal arcs
      path('M86 22 Q96 26 98 38', { fill: 'none', stroke: C.teal, width: 2, 'stroke-linecap': 'round' }),
      path('M82 14 Q102 20 104 44', { fill: 'none', stroke: C.teal, width: 2, 'stroke-linecap': 'round' }),
    ].join(''), { viewBox: [120, 120] }),

    mkSticker('terminal', 'Terminal', [
      rect({ x: 14, y: 22, w: 92, h: 76, rx: 8, fill: C.navy, stroke: C.ink, width: OUT }),
      // title bar
      rect({ x: 14, y: 22, w: 92, h: 16, fill: C.ink, stroke: 'none', width: 0 }),
      circle({ cx: 26, cy: 30, r: 3, fill: C.red, stroke: 'none', width: 0 }),
      circle({ cx: 38, cy: 30, r: 3, fill: C.gold, stroke: 'none', width: 0 }),
      circle({ cx: 50, cy: 30, r: 3, fill: C.green, stroke: 'none', width: 0 }),
      // prompt + cursor
      path('M26 58 L36 66 L26 74', { fill: 'none', stroke: C.teal, width: LINE, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }),
      line({ x1: 42, y1: 74, x2: 60, y2: 74, stroke: C.teal, width: LINE, 'stroke-linecap': 'round' }),
      rect({ x: 68, y: 60, w: 10, h: 16, fill: C.paper, stroke: 'none', width: 0 }),
    ].join(''), { viewBox: [120, 120] }),
  ],
};
