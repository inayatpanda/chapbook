#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// Behavioural release gate (Task 14, P5a)
//
//   node scripts/release-gate.mjs <deploy-url>
//   e.g. node scripts/release-gate.mjs https://<id>--inayat-studio.netlify.app
//
// Probes a DEPLOYED Chapbook (a Netlify draft/deploy-preview URL) and asserts the
// release-critical properties so a broken build is never promoted to production.
//
// It only READS the deploy and POSTs one harmless metrics "visit" — nothing
// destructive. Do NOT point it at production in Task 14; Task 15/16 run it against
// preview/prod.
//
// ── A / B SPLIT (why some checks may SKIP) ───────────────────────────────────
// A portable release-gate must be self-contained, but two properties can only be
// proven in a real browser. So the gate is split:
//
//   (A) HTTP / content checks — done with built-in fetch (Node 22), NO browser.
//       These ALWAYS run and CAN fail the gate. Checks 1-7.
//
//   (B) Browser checks — SW activation (8) and the mandatory XSS assertion (9).
//       These need a headless browser. The gate tries to resolve one from
//       node_modules (playwright, then puppeteer). If none is installed it prints
//       a PROMINENT SKIP ("run Task 15 headless check") and does NOT fail the
//       gate for the skip — but the exit summary loudly lists what still needs a
//       browser run so a human doing cutover cannot miss it.
//
// EXIT CODE reflects only the RUNNABLE checks: exit 1 iff any check FAILed. A
// SKIP never fails the gate, but is surfaced in the summary.
// ─────────────────────────────────────────────────────────────────────────────

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = dirname(SCRIPT_DIR);

// The one live Stripe payment link that MUST be present, and the test-mode prefix
// that MUST NOT appear anywhere in the served HTML.
const LIVE_STRIPE_LINK = 'buy.stripe.com/5kQeVd0C06t7aSLf3IgUM05';
const TEST_STRIPE_PREFIX = 'buy.stripe.com/test_';

const REQUIRED_HEADERS = [
  'content-security-policy',
  'x-frame-options',
  'x-content-type-options',
  'referrer-policy',
  'strict-transport-security',
];

// ── result bookkeeping ───────────────────────────────────────────────────────
const results = []; // { n, name, status: 'PASS'|'FAIL'|'SKIP', detail }
function record(n, name, status, detail) {
  results.push({ n, name, status, detail });
  const tag = status === 'PASS' ? 'PASS' : status === 'FAIL' ? 'FAIL' : 'SKIP';
  console.log(`[${tag}] ${n}. ${name}${detail ? ` — ${detail}` : ''}`);
}
const pass = (n, name, detail) => record(n, name, 'PASS', detail);
const fail = (n, name, detail) => record(n, name, 'FAIL', detail);
const skip = (n, name, detail) => record(n, name, 'SKIP', detail);

// ── fetch with a hard timeout so an unreachable/garbage URL FAILs cleanly ──────
async function fetchT(url, opts = {}, ms = 15000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(new Error(`timeout after ${ms}ms`)), ms);
  try {
    return await fetch(url, { ...opts, redirect: 'manual', signal: ctrl.signal });
  } finally {
    clearTimeout(t);
  }
}

// Short one-line reason from any thrown error (DNS, TLS, timeout, …).
function errStr(e) {
  const cause = e?.cause?.code || e?.cause?.message;
  return `${e?.name || 'Error'}: ${e?.message || e}${cause ? ` (${cause})` : ''}`;
}

// Run a child node process; resolve { code, stdout, stderr } (never rejects).
function run(args, opts = {}) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, args, { cwd: REPO_ROOT, ...opts });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (d) => { stdout += d; });
    child.stderr.on('data', (d) => { stderr += d; });
    child.on('error', (e) => resolve({ code: 1, stdout, stderr: stderr + errStr(e) }));
    child.on('close', (code) => resolve({ code: code ?? 1, stdout, stderr }));
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// (A) HTTP / content checks — always run
// ─────────────────────────────────────────────────────────────────────────────

// Extract the SHELL array literal from the LOCAL dist/sw.js. We assert against
// the artifact that will actually deploy.
function readShell() {
  const sw = readFileSync(join(REPO_ROOT, 'dist', 'sw.js'), 'utf8');
  const m = sw.match(/const\s+SHELL\s*=\s*\[([\s\S]*?)\]/);
  if (!m) throw new Error('SHELL array not found in dist/sw.js');
  const paths = [...m[1].matchAll(/['"]([^'"]+)['"]/g)].map((x) => x[1]);
  if (!paths.length) throw new Error('SHELL array is empty in dist/sw.js');
  return paths;
}

// Check 1 — every URL in the SW shell returns 200 on the deploy.
async function check1_shell(origin) {
  let shell;
  try {
    shell = readShell();
  } catch (e) {
    return fail(1, 'SW shell URLs return 200', `could not read local dist/sw.js: ${errStr(e)}`);
  }
  const bad = [];
  for (const p of shell) {
    const url = new URL(p, origin).href;
    try {
      const res = await fetchT(url);
      if (res.status !== 200) bad.push(`${p} → ${res.status}`);
    } catch (e) {
      bad.push(`${p} → ${errStr(e)}`);
    }
  }
  if (bad.length) return fail(1, 'SW shell URLs return 200', `${bad.length}/${shell.length} not 200: ${bad.join('; ')}`);
  return pass(1, 'SW shell URLs return 200', `${shell.length}/${shell.length} → 200`);
}

// Check 2 — security headers present on `/` AND on a static asset (/sw.js).
async function check2_headers(origin) {
  const targets = ['/', '/sw.js'];
  const missingAll = [];
  for (const p of targets) {
    let res;
    try {
      res = await fetchT(new URL(p, origin).href);
    } catch (e) {
      missingAll.push(`${p}: fetch failed (${errStr(e)})`);
      continue;
    }
    const missing = REQUIRED_HEADERS.filter((h) => !res.headers.get(h));
    if (missing.length) missingAll.push(`${p}: missing ${missing.join(', ')}`);
  }
  if (missingAll.length) return fail(2, 'Security headers on / and /sw.js', missingAll.join(' | '));
  return pass(2, 'Security headers on / and /sw.js', `all ${REQUIRED_HEADERS.length} present on / and /sw.js`);
}

// Check 3 — gh-device OPTIONS preflight → 204 (NOT 502).
async function check3_ghDevicePreflight(origin) {
  const url = new URL('/.netlify/functions/gh-device', origin).href;
  try {
    const res = await fetchT(url, {
      method: 'OPTIONS',
      headers: { Origin: origin, 'Access-Control-Request-Method': 'POST' },
    });
    if (res.status !== 204) return fail(3, 'gh-device OPTIONS preflight → 204', `got ${res.status} (502 = the old undici-204 bug)`);
    return pass(3, 'gh-device OPTIONS preflight → 204', 'status 204');
  } catch (e) {
    return fail(3, 'gh-device OPTIONS preflight → 204', errStr(e));
  }
}

// Check 4 — metrics POST {"type":"visit"} → 204, then GET ?day=<today UTC> → 200 with visit ≥ 1.
// Retries GET up to 5 times with backoff to account for Netlify Blobs read-after-write consistency.
async function check4_metrics(origin) {
  const url = new URL('/.netlify/functions/metrics', origin).href;
  const today = new Date().toISOString().slice(0, 10); // deploy's own today (UTC)
  try {
    const post = await fetchT(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ type: 'visit' }),
    });
    if (post.status !== 204) return fail(4, 'metrics visit → 204 + count', `POST returned ${post.status}, expected 204`);

    // Retry GET up to 5 times with backoff for Netlify Blobs read-after-write consistency.
    const maxRetries = 5;
    const backoffs = [500, 1000, 1500, 2000, 2500]; // ms between attempts
    let get, data, visits;
    let lastError = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      if (attempt > 0) {
        // Wait before retry
        await new Promise(r => setTimeout(r, backoffs[attempt - 1]));
      }
      try {
        get = await fetchT(`${url}?day=${today}`);
        if (get.status !== 200) {
          lastError = `GET ?day=${today} returned ${get.status}, expected 200`;
          continue;
        }
        try { data = await get.json(); } catch (e) {
          lastError = `GET body not JSON: ${errStr(e)}`;
          continue;
        }
        visits = data && typeof data.visit === 'number' ? data.visit : 0;
        // Tolerate concurrent visits: assert ≥ 1, never == 1.
        if (!(visits >= 1)) {
          lastError = `visit count for ${today} is ${visits}, expected ≥ 1`;
          continue;
        }
        // Success!
        return pass(4, 'metrics visit → 204 + count', `POST 204; GET ${today} visit=${visits} (≥1) after ${attempt + 1} attempt(s)`);
      } catch (e) {
        lastError = errStr(e);
      }
    }

    // All retries exhausted
    return fail(4, 'metrics visit → 204 + count', lastError || 'GET retries exhausted');
  } catch (e) {
    return fail(4, 'metrics visit → 204 + count', errStr(e));
  }
}

// Check 5 — grep-gate over LOCAL dist/ must be clean (asserts the artifact is clean pre-promotion).
async function check5_grepGate() {
  const { code, stdout, stderr } = await run([join('scripts', 'grep-gate.mjs')]);
  const last = (stdout.trim().split('\n').pop() || '').trim();
  if (code !== 0) return fail(5, 'grep-gate over dist/ is clean', `exit ${code}: ${(stderr || stdout).trim().split('\n').slice(-3).join(' / ')}`);
  return pass(5, 'grep-gate over dist/ is clean', last || 'exit 0');
}

// Check 6 — no `buy.stripe.com/test_` in served `/` HTML; the live link IS present.
async function check6_stripe(origin) {
  try {
    const res = await fetchT(new URL('/', origin).href);
    if (res.status !== 200) return fail(6, 'Stripe: live link present, no test link', `/ returned ${res.status}`);
    const html = await res.text();
    const hasTest = html.includes(TEST_STRIPE_PREFIX);
    const hasLive = html.includes(LIVE_STRIPE_LINK);
    if (hasTest || !hasLive) {
      const why = [];
      if (hasTest) why.push(`found forbidden ${TEST_STRIPE_PREFIX}`);
      if (!hasLive) why.push(`live link ${LIVE_STRIPE_LINK} MISSING`);
      return fail(6, 'Stripe: live link present, no test link', why.join('; '));
    }
    return pass(6, 'Stripe: live link present, no test link', 'live link present, no test link');
  } catch (e) {
    return fail(6, 'Stripe: live link present, no test link', errStr(e));
  }
}

// Check 7 — every shipped template passes validateDoc (runs the templates test suite).
async function check7_templates() {
  const { code, stdout, stderr } = await run(['--test', join('src', 'lib', 'templates.test.mjs')]);
  if (code !== 0) {
    const tail = (stdout + stderr).trim().split('\n').slice(-6).join(' / ');
    return fail(7, 'templates pass validateDoc', `node --test exit ${code}: ${tail}`);
  }
  const m = stdout.match(/# pass (\d+)/);
  return pass(7, 'templates pass validateDoc', m ? `${m[1]} test(s) pass` : 'exit 0');
}

// ─────────────────────────────────────────────────────────────────────────────
// (B) Browser checks — attempt, else SKIP (never fail on skip)
// ─────────────────────────────────────────────────────────────────────────────

// Resolve a headless browser from node_modules. Returns a thin adapter or null.
async function resolveBrowser() {
  // Playwright (chromium)
  try {
    const pw = await import('playwright');
    const chromium = pw.chromium || pw.default?.chromium;
    if (chromium) {
      return {
        kind: 'playwright',
        async open() {
          const browser = await chromium.launch({ headless: true });
          const page = await browser.newPage();
          return { browser, page, close: () => browser.close() };
        },
      };
    }
  } catch { /* not installed */ }
  // Puppeteer
  try {
    const puppeteer = (await import('puppeteer')).default;
    if (puppeteer?.launch) {
      return {
        kind: 'puppeteer',
        async open() {
          const browser = await puppeteer.launch({ headless: 'new' });
          const page = await browser.newPage();
          return { browser, page, close: () => browser.close() };
        },
      };
    }
  } catch { /* not installed */ }
  return null;
}

// Build a browser IIFE that exposes the app's publish-path sanitiser
// (blocks.js → sanitise.js → DOMPurify) as window.__gate.stripUnsafeHtml.
// esbuild is already a devDependency, so this stays self-contained. Running this
// in a real browser exercises the AUTHORITATIVE DOMPurify barrier — the exact
// live-browser assertion that sanitise.test.mjs defers to this gate.
async function buildSanitiserHarness() {
  const { build } = await import('esbuild');
  const out = await build({
    stdin: {
      contents: "import { stripUnsafeHtml } from './src/lib/blocks.js';\nwindow.__gate = { stripUnsafeHtml };\n",
      resolveDir: REPO_ROOT,
      loader: 'js',
    },
    bundle: true,
    format: 'iife',
    platform: 'browser',
    target: 'es2022',
    write: false,
    legalComments: 'none',
  });
  return out.outputFiles[0].text;
}

// Check 8 — SW activation: active worker + caches includes 'chapbook-v1'.
async function check8_swActivation(origin, page) {
  await page.goto(new URL('/', origin).href, { waitUntil: 'load', timeout: 30000 });
  // Poll for an active worker + the named cache (install caches the shell async).
  const deadline = Date.now() + 20000;
  let state = { hasActive: false, caches: [] };
  while (Date.now() < deadline) {
    state = await page.evaluate(async () => {
      let hasActive = false;
      try {
        const reg = await navigator.serviceWorker.getRegistration();
        hasActive = !!(reg && reg.active);
      } catch { /* SW unsupported */ }
      let keys = [];
      try { keys = await caches.keys(); } catch { /* Cache API unsupported */ }
      return { hasActive, caches: keys };
    });
    if (state.hasActive && state.caches.includes('chapbook-v1')) break;
    await new Promise((r) => setTimeout(r, 750));
  }
  if (!state.hasActive) return fail(8, 'SW activation + chapbook-v1 cache', 'no active service worker after 20s');
  if (!state.caches.includes('chapbook-v1')) {
    return fail(8, 'SW activation + chapbook-v1 cache', `active worker but caches.keys()=[${state.caches.join(', ')}] lacks 'chapbook-v1'`);
  }
  return pass(8, 'SW activation + chapbook-v1 cache', "active worker; caches includes 'chapbook-v1'");
}

// Check 9 — MANDATORY XSS assertion. Drive the app's sanitiseHtml (via blocks.js
// stripUnsafeHtml) in a REAL browser over the audit vectors and assert the payloads
// are NEUTRALISED — i.e. the sanitised output carries no live event-handler.
//
// ── Why we assert "no live on* handler attribute", not "no onerror/onload substring"
// The Task 10 brief phrased this as "output contains NEITHER onerror NOR onload".
// A naive substring match is WRONG and would FALSE-FAIL a secure build: driven
// through DOMPurify in a real Chromium, `<img/src=x/onerror=alert(1)>` serialises to
//   <img src="x/onerror=alert(1)">
// The browser's HTML parser reads the whole `x/onerror=alert(1)` as ONE unquoted
// `src` value (there is no whitespace to start a new attribute), so there is NO
// executable onerror HANDLER — the vector is inert. But the literal substring
// "onerror" survives inside the src value. `<svg/onload=…>` and the whitespace
// variants (`<img src=x onerror=…>`, `<svg onload=…>`) are fully dropped/stripped.
// So the security-correct property is: the sanitised output, parsed as HTML, has NO
// element bearing an `on*` event-handler attribute and NO javascript:/vbscript: URL.
// That is what "neutralised" means and what actually protects the public blog.
async function check9_xss(origin, page) {
  // Both brief audit vectors PLUS the whitespace variants that WOULD execute if the
  // DOMPurify html-profile/FORBID_TAGS config regressed — so the gate catches a real break.
  const PAYLOADS = [
    '<img/src=x/onerror=alert(1)>',
    '<svg/onload=alert(1)>',
    '<img src=x onerror=alert(1)>',
    '<svg onload=alert(1)>',
  ];
  let harness;
  try {
    harness = await buildSanitiserHarness();
  } catch (e) {
    return fail(9, 'XSS: onerror/onload neutralised (MANDATORY)', `could not bundle sanitiser harness: ${errStr(e)}`);
  }
  // Navigate to the DEPLOY (real origin/CSP context). 'unsafe-inline' in the CSP
  // permits the injected inline harness script.
  try {
    await page.goto(new URL('/', origin).href, { waitUntil: 'load', timeout: 30000 });
  } catch { /* fall through: about:blank still gives a real window+DOMPurify */ }
  try {
    await page.addScriptTag({ content: harness });
  } catch {
    // CSP or navigation issue: DOMPurify only needs a window, so retry on about:blank.
    await page.goto('about:blank');
    await page.addScriptTag({ content: harness });
  }
  const out = await page.evaluate((payloads) => {
    const g = window.__gate;
    if (!g || typeof g.stripUnsafeHtml !== 'function') return { error: 'harness not present' };
    // Parse the sanitised output as HTML and report any LIVE event-handler attribute
    // or javascript:/vbscript: URL — the true "did XSS survive" test.
    const leaks = (htmlStr) => {
      const doc = new DOMParser().parseFromString(String(htmlStr), 'text/html');
      const bad = [];
      for (const el of doc.querySelectorAll('*')) {
        for (const a of el.attributes) {
          if (/^on/i.test(a.name)) bad.push(`${el.tagName.toLowerCase()}[${a.name}]`);
          if (/^(href|src|xlink:href)$/i.test(a.name) && /^\s*(javascript|vbscript):/i.test(a.value)) {
            bad.push(`${el.tagName.toLowerCase()}[${a.name}=${a.value.slice(0, 20)}]`);
          }
        }
      }
      return bad;
    };
    return {
      results: payloads.map((p) => {
        const serialised = g.stripUnsafeHtml(p);
        return { in: p, out: serialised, leaks: leaks(serialised) };
      }),
    };
  }, PAYLOADS);
  if (out.error) return fail(9, 'XSS: onerror/onload neutralised (MANDATORY)', out.error);

  const leaks = out.results.filter((r) => r.leaks.length).map((r) => `${r.in} → "${r.out}" :: LIVE ${r.leaks.join(',')}`);
  if (leaks.length) return fail(9, 'XSS: onerror/onload neutralised (MANDATORY)', leaks.join(' | '));
  return pass(9, 'XSS: onerror/onload neutralised (MANDATORY)',
    `${PAYLOADS.length} payloads → no live event-handler / js: URI (neutralised via DOMPurify)`);
}

async function runBrowserChecks(origin) {
  const driver = await resolveBrowser();
  if (!driver) {
    const msg = 'needs a headless browser (playwright/puppeteer) in node_modules — run the Task 15 headless check';
    skip(8, 'SW activation + chapbook-v1 cache', `SKIP (needs browser) — ${msg}`);
    skip(9, 'XSS: onerror/onload neutralised (MANDATORY)', `SKIP — REQUIRED manual check — Task 15 (${msg})`);
    return;
  }
  let session;
  try {
    session = await driver.open();
  } catch (e) {
    skip(8, 'SW activation + chapbook-v1 cache', `SKIP (browser launch failed) — Task 15: ${errStr(e)}`);
    skip(9, 'XSS: onerror/onload neutralised (MANDATORY)', `SKIP — REQUIRED manual check — Task 15 (browser launch failed: ${errStr(e)})`);
    return;
  }
  try {
    await check8_swActivation(origin, session.page);
  } catch (e) {
    fail(8, 'SW activation + chapbook-v1 cache', errStr(e));
  }
  try {
    await check9_xss(origin, session.page);
  } catch (e) {
    fail(9, 'XSS: onerror/onload neutralised (MANDATORY)', errStr(e));
  }
  try { await session.close(); } catch { /* best effort */ }
  console.log(`     (browser checks ran via ${driver.kind})`);
}

// ─────────────────────────────────────────────────────────────────────────────

async function main() {
  const arg = process.argv[2];
  if (!arg) {
    console.error('usage: node scripts/release-gate.mjs <deploy-url>');
    console.error('  e.g. node scripts/release-gate.mjs https://<id>--inayat-studio.netlify.app');
    process.exit(2);
  }
  let origin;
  try {
    origin = new URL(arg).origin;
  } catch {
    console.error(`release-gate: "${arg}" is not a valid URL`);
    process.exit(2);
  }

  console.log(`\nRelease gate → ${origin}`);
  console.log('─'.repeat(72));
  console.log('(A) HTTP / content checks');

  // Run HTTP checks. Each is independently guarded; a thrown error is turned into
  // a clean FAIL so a garbage/unreachable URL never crashes the gate.
  await check1_shell(origin);
  await check2_headers(origin);
  await check3_ghDevicePreflight(origin);
  await check4_metrics(origin);
  await check5_grepGate();
  await check6_stripe(origin);
  await check7_templates();

  console.log('(B) Browser checks');
  await runBrowserChecks(origin);

  // ── summary ────────────────────────────────────────────────────────────────
  const failed = results.filter((r) => r.status === 'FAIL');
  const skipped = results.filter((r) => r.status === 'SKIP');
  const passed = results.filter((r) => r.status === 'PASS');

  console.log('─'.repeat(72));
  console.log(`SUMMARY: ${passed.length} PASS · ${failed.length} FAIL · ${skipped.length} SKIP  (of ${results.length})`);

  if (skipped.length) {
    console.log('\n' + '!'.repeat(72));
    console.log('!! SKIPPED REQUIRED CHECKS — these are NOT proven by this run:');
    for (const s of skipped) console.log(`!!   ${s.n}. ${s.name}`);
    console.log('!! Run them headless in Task 15 (a browser-equipped runner) before cutover.');
    console.log('!'.repeat(72));
  }

  if (failed.length) {
    console.log('\nGATE: FAIL');
    for (const f of failed) console.log(`  ✗ ${f.n}. ${f.name} — ${f.detail}`);
    process.exit(1);
  }
  console.log('\nGATE: PASS (all runnable checks green)');
  process.exit(0);
}

main().catch((e) => {
  // Last-resort guard — the gate must never crash with an unhandled rejection.
  console.error(`\nrelease-gate: unexpected error — ${errStr(e)}`);
  process.exit(1);
});
