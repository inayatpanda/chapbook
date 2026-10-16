import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mountEditorPanels } from './editorPanels.js';
class Element {
  dataset = {}; attrs = {}; handlers = {}; children = []; capture = null;
  style = { setProperty: (k, v) => { this.attrs[k] = v; } };
  classList = { add() {}, remove() {} };
  setAttribute(k, v) { this.attrs[k] = v; }
  addEventListener(k, fn) { this.handlers[k] = fn; }
  appendChild(el) { this.children.push(el); }
  focus() { this.focused = true; }
  setPointerCapture(id) { this.capture = id; }
  hasPointerCapture(id) { return this.capture === id; }
  releasePointerCapture() { this.capture = null; }
  fire(type, event = {}) { this.handlers[type]?.({ preventDefault() {}, pointerId: 1, button: 0, ...event }); }
}
function fixture(initial) {
  const elements = Object.fromEntries(['editorOuter', 'outlineRail', 'settingsRail'].map(id => [id, new Element()]));
  let saved = initial;
  const storage = { getItem: () => saved, setItem: (_, value) => { saved = value; } };
  const doc = { getElementById: id => elements[id], createElement: () => new Element() };
  mountEditorPanels(doc, storage);
  return { doc, storage, elements, left: elements.outlineRail.children[0], right: elements.settingsRail.children[0], saved: () => JSON.parse(saved) };
}

test('dragging either divider follows the pointer and saves widths for reload', () => {
  const f = fixture();
  f.left.fire('pointerdown', { clientX: 180 });
  f.left.fire('pointermove', { clientX: 230 });
  f.left.fire('pointerup');
  f.right.fire('pointerdown', { clientX: 1000 });
  f.right.fire('pointermove', { clientX: 940 });
  f.right.fire('pointerup');
  assert.deepEqual(f.saved(), { outline: 230, settings: 340 });
  const restored = fixture(JSON.stringify(f.saved()));
  assert.equal(restored.left.attrs['aria-valuenow'], '230');
  assert.equal(restored.right.attrs['aria-valuenow'], '340');
});

test('keyboard controls, limits and reset keep the writing area usable', () => {
  const f = fixture();
  f.right.fire('keydown', { key: 'ArrowLeft' });
  assert.equal(f.right.attrs['aria-valuenow'], '290');
  f.left.fire('keydown', { key: 'End' });
  f.left.fire('keydown', { key: 'ArrowRight', shiftKey: true });
  assert.equal(f.left.attrs['aria-valuenow'], '300');
  f.left.fire('keydown', { key: 'Home' });
  assert.equal(f.left.attrs['aria-valuenow'], '140');
  f.right.fire('dblclick');
  assert.equal(f.right.attrs['aria-valuenow'], '280');
});

test('Escape and cancelled pointer gestures restore their starting width', () => {
  for (const cancel of ['pointercancel', 'keydown']) {
    const f = fixture();
    f.left.fire('pointerdown', { clientX: 180 });
    f.left.fire('pointermove', { clientX: 900 });
    assert.equal(f.left.attrs['aria-valuenow'], '300');
    f.left.fire(cancel, { key: 'Escape' });
    assert.equal(f.left.attrs['aria-valuenow'], '180');
    assert.equal(f.left.capture, null);
  }
});

test('bad stored widths are clamped, missing values use defaults and mounting is idempotent', () => {
  const f = fixture('{"outline":-50,"settings":"invalid"}');
  assert.equal(f.left.attrs['aria-valuenow'], '140');
  assert.equal(f.right.attrs['aria-valuenow'], '280');
  mountEditorPanels(f.doc, f.storage);
  assert.equal(f.elements.outlineRail.children.length, 1);
  assert.equal(f.elements.settingsRail.children.length, 1);
});

test('unavailable browser storage does not break resizing', () => {
  const f = fixture();
  const doc = { getElementById: id => new Element(), createElement: () => new Element() };
  assert.doesNotThrow(() => mountEditorPanels(doc, { getItem() { throw Error('blocked'); }, setItem() { throw Error('full'); } }));
  assert.equal(f.left.attrs.role, 'separator');
  assert.equal(f.left.attrs['aria-orientation'], 'vertical');
});
