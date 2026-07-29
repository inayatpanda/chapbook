import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

// Regression guard for the iOS WKWebView dead-tap bug (native bundle):
// `backdrop-filter` on #byok-overlay — the ancestor of every onboarding control — promoted the
// layer and mis-registered descendant hit-testing on iOS, so the × (#byok-close) and
// "Create my blog" (#cb-go) buttons became untappable while sibling buttons still worked. The
// blur was also a visual no-op (the overlay's own #04060c background is fully opaque). This is
// an iOS-compositor bug that does not reproduce in desktop WebKit, so the only feasible automated
// guard is a static assertion that the interactive overlay container carries no backdrop-filter.
const appSrc = readFileSync(fileURLToPath(new URL('../src/app.js', import.meta.url)), 'utf8');

// Isolate the #byok-overlay *container* rule: `#byok-overlay{ ... }` (not the descendant
// `#byok-overlay .bc{...}` etc.), which is the layer that must not be backdrop-filtered.
function overlayContainerRule(src) {
  const m = src.match(/#byok-overlay\s*\{([^}]*)\}/);
  return m ? m[1] : null;
}

test('onboarding overlay container declares no backdrop-filter (iOS WKWebView hit-test guard)', () => {
  const rule = overlayContainerRule(appSrc);
  assert.ok(rule, 'could not locate the #byok-overlay container CSS rule in src/app.js');
  assert.doesNotMatch(
    rule,
    /backdrop-filter/i,
    'Do not put backdrop-filter on #byok-overlay: on iOS WKWebView it makes #byok-close and #cb-go untappable. ' +
      'If a blur is needed, apply it to a pointer-events:none sibling layer behind .bc instead.',
  );
});

test('no backdrop-filter anywhere in the onboarding overlay <style> block', () => {
  // Broad belt-and-braces: the whole overlay style scope should stay free of backdrop-filter so
  // it can never be reintroduced on the container (or on a scrolling descendant like .bc).
  const styleMatches = [...appSrc.matchAll(/#byok-overlay[^{]*\{([^}]*)\}/g)].map((m) => m[1]);
  assert.ok(styleMatches.length > 3, 'expected to find several #byok-overlay CSS rules');
  for (const body of styleMatches) {
    assert.doesNotMatch(body, /backdrop-filter/i, 'backdrop-filter must not appear in any #byok-overlay rule');
  }
});
