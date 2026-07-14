import { test } from 'node:test';
import assert from 'node:assert/strict';
import { listStencils } from './stencils.js';

test('listStencils returns >=10 well-formed stencils with unique ids', () => {
  const list = listStencils();
  assert.ok(Array.isArray(list), 'listStencils returns an array');
  assert.ok(list.length >= 10, `expected >=10 stencils, got ${list.length}`);

  const ids = new Set();
  for (const s of list) {
    assert.equal(typeof s.id, 'string', 'id is a string');
    assert.ok(s.id.length, `${s.id} id non-empty`);
    assert.equal(typeof s.name, 'string', `${s.id} name is a string`);
    assert.ok(s.name.length, `${s.id} name non-empty`);
    assert.equal(typeof s.category, 'string', `${s.id} category is a string`);
    assert.ok(s.category.length, `${s.id} category non-empty`);

    assert.ok(Array.isArray(s.viewBox) && s.viewBox.length === 2, `${s.id} has a [w,h] viewBox`);
    assert.ok(s.viewBox.every((n) => typeof n === 'number' && n > 0), `${s.id} viewBox is positive numbers`);

    assert.ok(Array.isArray(s.strokes) && s.strokes.length >= 1, `${s.id} has >=1 stroke polyline`);
    for (const poly of s.strokes) {
      assert.ok(Array.isArray(poly) && poly.length >= 1, `${s.id} polyline non-empty`);
      for (const pt of poly) {
        assert.ok(Array.isArray(pt) && pt.length === 2, `${s.id} point is [x,y]`);
        assert.ok(typeof pt[0] === 'number' && typeof pt[1] === 'number', `${s.id} point coords are numbers`);
      }
    }

    assert.ok(!ids.has(s.id), `duplicate id: ${s.id}`);
    ids.add(s.id);
  }
});

test('listStencils includes the known arrow + both categories', () => {
  const list = listStencils();
  const ids = list.map((s) => s.id);
  assert.ok(ids.includes('arrow'), 'includes the arrow stencil');
  const cats = new Set(list.map((s) => s.category));
  assert.ok(cats.has('Generic'), 'has a Generic category');
  assert.ok(cats.has('Clinical'), 'has a Clinical category');
});
