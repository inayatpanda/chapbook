import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  PALETTE, el, line, poly, path, circle, rect, arrow, label, leader,
  panel, grid, drawCss, motionCss, sanitise, viewBox, svgWrap,
} from './svg.js';

// ---- PALETTE -------------------------------------------------------------
test('PALETTE maps tokens to CSS custom properties (not hex)', () => {
  assert.equal(PALETTE.ink, 'var(--ink)');
  assert.equal(PALETTE.inkDim, 'var(--ink-dim)');
  assert.equal(PALETTE.teal, 'var(--teal)');
  assert.equal(PALETTE.cyan, 'var(--cyan)');
  assert.equal(PALETTE.violet, 'var(--violet)');
  for (const v of Object.values(PALETTE)) assert.ok(!v.includes('#'), `${v} must not be hex`);
});

// ---- el ------------------------------------------------------------------
test('el serialises a self-closing element with attrs', () => {
  const s = el('circle', { cx: 1, cy: 2, r: 3 });
  assert.match(s, /^<circle /);
  assert.match(s, /cx="1"/);
  assert.match(s, /\/>$/);
});

test('el skips null/undefined attrs', () => {
  const s = el('line', { x1: 0, y1: null, x2: undefined, y2: 5 });
  assert.match(s, /x1="0"/);
  assert.match(s, /y2="5"/);
  assert.ok(!s.includes('y1='));
  assert.ok(!s.includes('x2='));
});

test('el renders children (string and array) with a close tag', () => {
  assert.equal(el('g', {}, '<x/>'), '<g><x/></g>');
  assert.equal(el('g', {}, ['<a/>', '<b/>']), '<g><a/><b/></g>');
});

// ---- primitives ----------------------------------------------------------
test('line defaults stroke to var(--ink) and contains no hex colour (c)', () => {
  const s = line({ x1: 0, y1: 0, x2: 10, y2: 10 });
  assert.ok(s.includes('var(--ink)'), 'should use var(--ink)');
  assert.ok(!s.includes('#'), 'should contain no # hex colour');
  assert.match(s, /<line /);
});

test('line honours stroke + width overrides', () => {
  const s = line({ x1: 0, y1: 0, x2: 1, y2: 1, stroke: 'var(--teal)', width: 3 });
  assert.ok(s.includes('var(--teal)'));
  assert.match(s, /stroke-width="3"/);
});

test('poly builds a polyline from [x,y] points with fill none', () => {
  const s = poly([[0, 0], [10, 0], [10, 10]]);
  assert.match(s, /<polyline /);
  assert.match(s, /points="0,0 10,0 10,10"/);
  assert.match(s, /fill="none"/);
});

test('path emits a stroked path with default fill none', () => {
  const s = path('M0 0 L10 10');
  assert.match(s, /<path /);
  assert.match(s, /d="M0 0 L10 10"/);
  assert.match(s, /fill="none"/);
  assert.ok(s.includes('var(--ink)'));
});

test('circle and rect are stroked, fill none by default', () => {
  const c = circle({ cx: 5, cy: 5, r: 4 });
  assert.match(c, /<circle /);
  assert.match(c, /fill="none"/);
  assert.ok(c.includes('var(--ink)'));
  const r = rect({ x: 0, y: 0, w: 10, h: 6, rx: 2 });
  assert.match(r, /<rect /);
  assert.match(r, /width="10"/);
  assert.match(r, /height="6"/);
  assert.match(r, /rx="2"/);
  assert.match(r, /fill="none"/);
});

test('rect fill override is honoured', () => {
  const r = rect({ x: 0, y: 0, w: 4, h: 4, fill: 'var(--teal)' });
  assert.ok(r.includes('var(--teal)'));
});

test('arrow draws a line plus an arrowhead (group with >1 segment)', () => {
  const a = arrow({ x1: 0, y1: 0, x2: 20, y2: 0 });
  assert.match(a, /<line /);
  assert.ok(/<path |<polyline /.test(a), 'arrowhead is a path or polyline');
  assert.ok(a.includes('var(--ink)'));
});

test('arrow with a label includes the escaped text', () => {
  const a = arrow({ x1: 0, y1: 0, x2: 20, y2: 0, label: 'a & b' });
  assert.match(a, /<text/);
  assert.ok(a.includes('a &amp; b'));
});

// ---- label ---------------------------------------------------------------
test('label uses var(--font-display) with a fallback and var(--ink) fill', () => {
  const s = label('Hi', 10, 20);
  assert.match(s, /<text/);
  assert.ok(s.includes('var(--font-display)'));
  assert.ok(/(sans-serif|serif)/.test(s), 'has a generic font fallback');
  assert.ok(s.includes('var(--ink)'));
  assert.match(s, /x="10"/);
  assert.match(s, /y="20"/);
});

test('label HTML-escapes & < >', () => {
  const s = label('A & B < C > D', 0, 0);
  assert.ok(s.includes('A &amp; B &lt; C &gt; D'));
  assert.ok(!/<\s*C/.test(s.replace('&lt;', '')), 'no raw < before C');
});

test('label opts override font-size and text-anchor', () => {
  const s = label('x', 0, 0, { size: 22, anchor: 'end' });
  assert.match(s, /font-size="22"/);
  assert.match(s, /text-anchor="end"/);
});

// ---- leader --------------------------------------------------------------
test('leader is a thin dim connector', () => {
  const s = leader([0, 0], [10, 10]);
  assert.match(s, /<line /);
  assert.ok(s.includes('var(--ink-dim)'));
  assert.match(s, /x1="0"/);
  assert.match(s, /x2="10"/);
});

// ---- panel ---------------------------------------------------------------
test('panel is a rounded dim-bordered region, fill none', () => {
  const s = panel({ x: 0, y: 0, w: 100, h: 50, label: 'P' });
  assert.match(s, /<rect /);
  assert.match(s, /rx="/);
  assert.ok(s.includes('var(--ink-dim)'));
  assert.match(s, /fill="none"/);
  assert.ok(s.includes('P'));
});

// ---- grid ----------------------------------------------------------------
test('grid returns col/row/x/y coordinates', () => {
  const cells = grid(2, 2, 10);
  assert.equal(cells.length, 4);
  assert.deepEqual(cells[0], { col: 0, row: 0, x: 0, y: 0 });
  const last = cells[cells.length - 1];
  assert.equal(last.x, last.col * 10);
  assert.equal(last.y, last.row * 10);
  assert.equal(last.col, 1);
  assert.equal(last.row, 1);
});

// ---- drawCss -------------------------------------------------------------
test('drawCss has fig-draw keyframes + reduced-motion guard (d)', () => {
  const css = drawCss('.s');
  assert.ok(css.includes('@keyframes fig-draw'), 'has @keyframes fig-draw');
  assert.ok(css.includes('prefers-reduced-motion'), 'has reduced-motion media');
  assert.ok(css.includes('.s'), 'targets the selector');
  assert.ok(css.includes('stroke-dashoffset'), 'animates stroke-dashoffset');
});

// ---- motionCss -----------------------------------------------------------
test('motionCss defines named keyframes + reduced-motion guard', () => {
  const css = motionCss('spin', '0%{opacity:0} 100%{opacity:1}');
  assert.ok(css.includes('@keyframes spin'));
  assert.ok(css.includes('opacity:1') || css.includes('opacity:0'));
  assert.ok(css.includes('prefers-reduced-motion'));
});

// ---- viewBox / svgWrap ---------------------------------------------------
test('viewBox formats coordinates', () => {
  assert.equal(viewBox(100, 50), '0 0 100 50');
});

test('svgWrap has viewBox + xmlns + role, no width/height (e)', () => {
  const s = svgWrap('<g/>', '0 0 100 100');
  assert.match(s, /viewBox="0 0 100 100"/);
  assert.ok(!/\bwidth=/.test(s), 'no width attr');
  assert.ok(!/\bheight=/.test(s), 'no height attr');
  assert.ok(s.includes('xmlns'));
  assert.match(s, /role="img"/);
  assert.ok(s.includes('<g/>'));
});

test('svgWrap inlines a <style> only when styleCss is non-empty', () => {
  assert.ok(!svgWrap('<g/>', '0 0 1 1').includes('<style'));
  const s = svgWrap('<g/>', '0 0 1 1', '.x{opacity:1}');
  assert.ok(s.includes('<style'));
  assert.ok(s.includes('.x{opacity:1}'));
});

// ---- sanitise (security critical) ----------------------------------------
test('sanitise strips <script>, on* handlers, foreignObject, external href; keeps #/data (a)', () => {
  const dirty = '<svg>' +
    '<script>alert(1)</script>' +
    '<rect onclick="x()"/>' +
    '<foreignObject><div>hi</div></foreignObject>' +
    '<a href="http://evil.com">x</a>' +
    '<use href="#a"/>' +
    '<image href="data:image/png;base64,xx"/>' +
    '</svg>';
  const clean = sanitise(dirty);
  assert.ok(!/<script/i.test(clean), 'no script tag');
  assert.ok(!/alert\(1\)/.test(clean), 'no script body');
  assert.ok(!/onclick/i.test(clean), 'no onclick handler');
  assert.ok(!/<foreignObject/i.test(clean), 'no foreignObject');
  assert.ok(!/evil\.com/.test(clean), 'external href removed');
  assert.ok(clean.includes('href="#a"'), 'anchor href kept');
  assert.ok(clean.includes('data:image/png;base64,xx'), 'data href kept');
});

test('sanitise keeps allowed style animation but removes disallowed property (b)', () => {
  const dirty = '<svg><style>.s{animation: fig-draw 1s; background:url(http://x)}</style></svg>';
  const clean = sanitise(dirty);
  assert.ok(clean.includes('animation'), 'keeps animation');
  assert.ok(!/background/i.test(clean), 'removes background');
  assert.ok(!/http:\/\/x/.test(clean), 'removes external url in style');
});

test('sanitise handles case/quote/whitespace variations', () => {
  const dirty = '<svg>' +
    '<SCRIPT>bad()</SCRIPT>' +
    "<g ONCLICK='y()' onmouseover = \"z()\">" +
    '<a XLINK:HREF="https://evil.com">x</a>' +
    '<a href = "//evil.com">x</a>' +
    '<script  src="x.js" />' +
    '</svg>';
  const clean = sanitise(dirty);
  assert.ok(!/script/i.test(clean), 'no script (any case)');
  assert.ok(!/onclick/i.test(clean), 'no ONCLICK');
  assert.ok(!/onmouseover/i.test(clean), 'no onmouseover with spaces');
  assert.ok(!/evil\.com/.test(clean), 'no protocol-relative or https external href');
  assert.ok(!/bad\(\)/.test(clean) && !/y\(\)/.test(clean) && !/z\(\)/.test(clean));
});

test('sanitise output of our own primitives is unchanged in substance', () => {
  const svg = svgWrap(line({ x1: 0, y1: 0, x2: 10, y2: 10 }), '0 0 10 10', drawCss('.s'));
  const clean = sanitise(svg);
  assert.ok(clean.includes('var(--ink)'));
  assert.ok(clean.includes('@keyframes fig-draw'));
});

// ---- sanitise C1: data: href allow-list (raster only) --------------------
test('sanitise strips data:svg/data:html hrefs but keeps safe raster + #anchor (C1)', () => {
  const dirty = '<svg>' +
    '<use href="data:image/svg+xml;base64,PHN2Zz48L3N2Zz4=">x</use>' +
    '<image href="data:image/png;base64,iVBOR"/>' +
    '<image xlink:href="data:text/html,<b>x</b>"/>' +
    '<use href="#a"/>' +
    '</svg>';
  const clean = sanitise(dirty);
  assert.ok(!/data:image\/svg\+xml/i.test(clean), 'data:image/svg+xml href removed');
  assert.ok(!/data:text\/html/i.test(clean), 'data:text/html href removed');
  assert.ok(clean.includes('href="data:image/png;base64,iVBOR"'), 'safe raster data href kept');
  assert.ok(clean.includes('href="#a"'), 'anchor href kept');
});

test('sanitise strips unquoted dangerous data: hrefs, keeps raster (C1)', () => {
  const dirty = '<svg>' +
    '<use href=data:image/svg+xml;base64,PHN2Zz4=>x</use>' +
    '<image href=data:image/png;base64,iVBOR>' +
    '</svg>';
  const clean = sanitise(dirty);
  assert.ok(!/data:image\/svg\+xml/i.test(clean), 'unquoted data:svg href removed');
  assert.ok(clean.includes('href=data:image/png;base64,iVBOR'), 'unquoted safe raster href kept');
});

// ---- sanitise C2: SMIL animation elements --------------------------------
test('sanitise strips SMIL <animate>/<set>/<animateTransform>/<animateMotion> (C2)', () => {
  const dirty = '<svg>' +
    '<a href="#x">' +
    '<set attributeName="href" to="javascript:alert(1)"/>' +
    '<animate attributeName="href" to="javascript:alert(1)"/>' +
    '<animateTransform attributeType="XML" type="rotate"/>' +
    '<animateMotion path="M0 0"/>' +
    '<rect/></a>' +
    '</svg>';
  const clean = sanitise(dirty);
  assert.ok(!/<animate\b/i.test(clean), 'no <animate>');
  assert.ok(!/<set\b/i.test(clean), 'no <set>');
  assert.ok(!/<animateTransform\b/i.test(clean), 'no <animateTransform>');
  assert.ok(!/<animateMotion\b/i.test(clean), 'no <animateMotion>');
  assert.ok(!/javascript:/i.test(clean), 'javascript: payload gone with the element');
});

test('sanitise strips SMIL open/close pairs and any-case (C2)', () => {
  const dirty = '<svg><ANIMATE attributeName="x">noop</ANIMATE><set>k</set></svg>';
  const clean = sanitise(dirty);
  assert.ok(!/<\/?animate\b/i.test(clean), 'no animate open/close (any case)');
  assert.ok(!/<\/?set\b/i.test(clean), 'no set open/close');
});
