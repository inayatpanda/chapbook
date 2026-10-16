const KEY = 'studio.editorPanelWidths.v1';
const PANELS = {
  outline: { id: 'outlineRail', label: 'Resize Rough draft panel', min: 140, max: 300, initial: 180, direction: 1 },
  settings: { id: 'settingsRail', label: 'Resize post settings panel', min: 220, max: 420, initial: 280, direction: -1 },
};

export function mountEditorPanels(doc = document, storage) {
  const root = doc.getElementById('editorOuter');
  if (!root || root.dataset.resizable === 'true') return;
  root.dataset.resizable = 'true';
  try { storage ??= doc.defaultView.localStorage; } catch { /* private storage can be unavailable */ }
  let saved = {};
  try { saved = JSON.parse(storage?.getItem(KEY) || '{}') || {}; } catch { /* invalid preferences use defaults */ }
  const widths = {};
  const persist = () => { try { storage?.setItem(KEY, JSON.stringify(widths)); } catch { /* resizing still works */ } };
  for (const [name, spec] of Object.entries(PANELS)) {
    const panel = doc.getElementById(spec.id);
    if (!panel) continue;
    const handle = doc.createElement('button');
    handle.type = 'button';
    handle.className = `editor-resizer editor-resizer--${name}`;
    handle.setAttribute('role', 'separator');
    handle.setAttribute('aria-orientation', 'vertical');
    handle.setAttribute('aria-label', spec.label);
    handle.setAttribute('aria-controls', spec.id);
    handle.setAttribute('aria-valuemin', String(spec.min));
    handle.setAttribute('aria-valuemax', String(spec.max));
    handle.title = 'Drag to resize · arrow keys adjust · double-click to reset';
    const apply = value => {
      const width = Math.max(spec.min, Math.min(spec.max, Number.isFinite(value) ? Math.round(value) : spec.initial));
      widths[name] = width;
      root.style.setProperty(`--editor-${name}-width`, `${width}px`);
      handle.setAttribute('aria-valuenow', String(width));
      handle.setAttribute('aria-valuetext', `${width} pixels`);
    };
    apply(saved[name]);
    let drag = null;
    const finish = cancelled => {
      if (!drag) return;
      const { pointer, width } = drag;
      drag = null;
      if (cancelled) apply(width);
      root.classList.remove('is-resizing');
      handle.classList.remove('is-dragging');
      if (handle.hasPointerCapture(pointer)) handle.releasePointerCapture(pointer);
      persist();
    };
    handle.addEventListener('pointerdown', event => {
      if (event.button !== 0 || drag) return;
      event.preventDefault();
      handle.focus();
      drag = { pointer: event.pointerId, x: event.clientX, width: widths[name] };
      handle.setPointerCapture(event.pointerId);
      root.classList.add('is-resizing');
      handle.classList.add('is-dragging');
    });
    handle.addEventListener('pointermove', event => {
      if (drag?.pointer === event.pointerId) apply(drag.width + (event.clientX - drag.x) * spec.direction);
    });
    handle.addEventListener('pointerup', event => { if (drag?.pointer === event.pointerId) finish(false); });
    handle.addEventListener('pointercancel', event => { if (drag?.pointer === event.pointerId) finish(true); });
    handle.addEventListener('lostpointercapture', () => finish(false));
    handle.addEventListener('dblclick', () => { apply(spec.initial); persist(); });
    handle.addEventListener('keydown', event => {
      if (event.key === 'Escape' && drag) { event.preventDefault(); finish(true); return; }
      const step = event.shiftKey ? 40 : 10;
      const value = event.key === 'ArrowLeft' ? widths[name] - step * spec.direction
        : event.key === 'ArrowRight' ? widths[name] + step * spec.direction
        : event.key === 'Home' ? spec.min : event.key === 'End' ? spec.max : null;
      if (value == null) return;
      event.preventDefault(); apply(value); persist();
    });
    panel.appendChild(handle);
  }
}

export function initEditorPanels() {
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => mountEditorPanels(), { once: true });
  else mountEditorPanels();
}
