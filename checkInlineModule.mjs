// Parse-check the Studio's inline `<script type="module">` blocks.
//
// WHY: build.mjs string-manipulates index.html (brand rename, boot-gate swap, path
// rewrite) but NEVER parses the big inline module — so a SyntaxError in it (e.g. a
// duplicate top-level `function`/`const` declaration) sails through the build, the
// smoke check, and the whole test suite, then blanks the entire app in the browser
// (a module that fails to parse runs nothing). This happened once ("Identifier
// 'fmtBytes' has already been declared"). This module is the guard-rail: build.mjs
// and a unit test both run it, so that class of bug can never ship again.
//
// The check uses Node's own `--check` (the same V8 parser the browser runs), in
// MODULE mode (a `.mjs` file), which is what makes duplicate lexical declarations a
// hard error. It only PARSES — it never executes — so browser globals (document,
// window, …) and unresolved imports are irrelevant.

import { execFileSync } from 'node:child_process';
import { writeFileSync, rmSync, mkdtempSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

// Extract the body of every inline `<script type="module">` (i.e. WITHOUT a src=…
// attribute) from an HTML string. Matches to the first `</script>` exactly like the
// HTML parser does, so an unescaped `</script>` in the JS would break here AND in the
// browser — surfacing the same real problem.
export function extractInlineModules(html) {
  return [...String(html).matchAll(/<script\s+type="module"\s*>([\s\S]*?)<\/script>/g)].map((m) => m[1]);
}

// Parse ES-module source the way the browser does. Returns { ok, error }.
export function parseCheckModule(code) {
  const dir = mkdtempSync(join(tmpdir(), 'helm-modcheck-'));
  const file = join(dir, 'inline.mjs'); // .mjs → Node parses it as a module (strict).
  try {
    writeFileSync(file, String(code));
    execFileSync(process.execPath, ['--check', file], { stdio: ['ignore', 'ignore', 'pipe'] });
    return { ok: true, error: null };
  } catch (e) {
    const msg = (e && e.stderr ? e.stderr.toString() : String(e && e.message)).trim();
    return { ok: false, error: msg };
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

// Convenience: check every inline module in an HTML string. Throws on the first that
// fails, with a legible message. Returns the count checked.
export function assertInlineModulesParse(html, label = 'index.html') {
  const mods = extractInlineModules(html);
  if (mods.length === 0) throw new Error(`inline-module check: no inline <script type="module"> found in ${label}`);
  mods.forEach((code, i) => {
    const r = parseCheckModule(code);
    if (!r.ok) {
      throw new Error(`inline-module check: module #${i + 1} in ${label} FAILS to parse — this would blank the app:\n${r.error}`);
    }
  });
  return mods.length;
}
