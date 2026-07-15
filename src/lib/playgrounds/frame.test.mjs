import { test } from 'node:test';
import assert from 'node:assert/strict';
import { STD_PROPS, injectStdParams, frameParams, frameWrap } from './frame.js';

test('injectStdParams adds the 5 standard props to an object schema', () => {
  const s = injectStdParams({ type: 'object', properties: { q: { type: 'string' } } });
  for (const k of ['title', 'subtitle', 'caption', 'accent', 'accentCustom']) assert.ok(k in s.properties, k);
  assert.ok('q' in s.properties, 'existing prop preserved');
  assert.equal(s.properties.title['x-inline'], true);
});

test('injectStdParams is idempotent and non-destructive', () => {
  const once = injectStdParams({ type: 'object', properties: {} });
  const twice = injectStdParams(once);
  assert.deepEqual(twice.properties.title, STD_PROPS.title);
  // a family that already declares title keeps its own
  const own = injectStdParams({ type: 'object', properties: { title: { type: 'string', title: 'Mine' } } });
  assert.equal(own.properties.title.title, 'Mine');
});

test('injectStdParams opts: stdParams:false skips; omitStd drops keys', () => {
  const off = injectStdParams({ type: 'object', properties: {} }, { stdParams: false });
  assert.ok(!('title' in (off.properties || {})));
  const partial = injectStdParams({ type: 'object', properties: {} }, { omitStd: ['caption', 'accentCustom'] });
  assert.ok(!('caption' in partial.properties) && !('accentCustom' in partial.properties));
  assert.ok('title' in partial.properties);
});

test('injectStdParams leaves a non-object schema untouched', () => {
  const arr = { type: 'array', items: { type: 'string' } };
  assert.equal(injectStdParams(arr), arr);
});

test('frameParams normalises', () => {
  assert.deepEqual(frameParams({ title: 5, accent: 'rose' }), { title: '5', subtitle: '', caption: '', accent: 'rose', accentCustom: '', maxHeight: 'auto' });
  assert.equal(frameParams({}).accent, 'default');
});

test('frameWrap: no heading fields → html unchanged, css empty', () => {
  const r = frameWrap({ html: '<div>hi</div>', domId: 'x', title: '', subtitle: '', caption: '' });
  assert.equal(r.html, '<div>hi</div>');
  assert.equal(r.css, '');
});

test('frameWrap: with a title → wraps + scoped css, escapes, no blank lines', () => {
  const r = frameWrap({ html: '<div>hi</div>', domId: 'x', title: 'A & B', subtitle: '', caption: 'note' });
  assert.ok(r.html.includes('pg-frame-title') && r.html.includes('A &amp; B'));
  assert.ok(r.html.includes('pg-frame-cap') && r.html.includes('note'));
  assert.ok(r.css.includes('#x .pg-frame-title'));
  assert.ok(!/\n\s*\n/.test(r.html), 'no blank lines in wrapped html');
});

test('frameWrap: maxHeight caps the body with clip + Show-all + expander js', () => {
  const r = frameWrap({ html: '<div>tall</div>', domId: 'x', title: '', subtitle: '', caption: '', maxHeight: 'medium' });
  assert.ok(r.html.includes('pg-frame-clip') && r.html.includes('pg-frame-more'), 'clip + button present');
  assert.ok(r.html.indexOf('pg-frame-more') > r.html.indexOf('</div>'), 'button outside the clipped body');
  assert.ok(r.css.includes('max-height:400px'), 'medium = 400px');
  assert.ok(r.js.includes('pg-clip') && r.js.includes('requestAnimationFrame'), 'measure-after-render js');
  const auto = frameWrap({ html: '<div>t</div>', domId: 'x', title: '', subtitle: '', caption: '', maxHeight: 'auto' });
  assert.equal(auto.html, '<div>t</div>', 'auto = unchanged');
  assert.equal(auto.js, '');
});

test('frameParams carries maxHeight (default auto)', () => {
  assert.equal(frameParams({}).maxHeight, 'auto');
  assert.equal(frameParams({ maxHeight: 'short' }).maxHeight, 'short');
});
