#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// Owner QA gallery — headless screenshots of every marketing page (+ the /app
// activation gate) at three widths, assembled into ONE self-contained local HTML
// gallery for owner review.
//
//   node scripts/qa-gallery.mjs                       # self-serves dist/ on :5055
//   node scripts/qa-gallery.mjs http://localhost:5055 # self-serves on :5055
//   node scripts/qa-gallery.mjs https://<draft>.netlify.app   # shoots a remote deploy
//
// Output → <scratchpad>/qa-gallery/  (gallery.html + all PNGs). NOT committed.
//
// Playwright is dev-only and NOT a chapbook dependency; this resolves it from the
// local node_modules, then a few known external locations (sibling repos / npx
// cache), and SKIPs cleanly (exit 0) if none is found — exactly like make-og.mjs.
//
// PII discipline: the app is loaded FRESH (no seeded licence) so the /app shot is
// the activation gate a stranger sees — no owner licence/config in any pixel. The
// marketing pages carry only blog-name placeholders. `/` is shot WITHOUT a licence
// so the boot-shim does not bounce it to /app.
// ─────────────────────────────────────────────────────────────────────────────
import { createServer } from 'node:http';
import { readFileSync, existsSync, statSync, mkdirSync, writeFileSync, rmSync, readdirSync } from 'node:fs';
import { join, extname, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';
import { homedir } from 'node:os';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const DIST = join(ROOT, 'dist');
const OUT_DIR = '/private/tmp/claude-501/-Users-inayatsmac/ed687118-687c-4f1c-96b1-ad3db56038f1/scratchpad/qa-gallery';

// Pages to shoot (9) × widths (3) = 27 base shots. /app is the activation gate.
const PAGES = [
  { path: '/', label: 'Home' },
  { path: '/features', label: 'Features' },
  { path: '/themes', label: 'Themes' },
  { path: '/pricing', label: 'Pricing' },
  { path: '/download', label: 'Download' },
  { path: '/privacy', label: 'Privacy (legal)' },
  { path: '/terms', label: 'Terms (legal)' },
  { path: '/refunds', label: 'Refunds (legal)' },
  { path: '/app', label: 'App activation gate' },
];
const WIDTHS = [1280, 768, 390];

// ── static server mirroring Netlify pretty-URLs (/, /features→.html, /app→app/index.html) ──
const MIME = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp',
  '.woff2': 'font/woff2', '.xml': 'application/xml; charset=utf-8', '.txt': 'text/plain; charset=utf-8',
  '.ico': 'image/x-icon', '.webm': 'video/webm', '.mp4': 'video/mp4', '.map': 'application/json',
};
function resolveFile(urlPath) {
  let p = decodeURIComponent(urlPath.split('?')[0]);
  if (p === '/') return join(DIST, 'index.html');
  if (p === '/app' || p === '/app/') return join(DIST, 'app', 'index.html');
  if (p.endsWith('/')) p += 'index.html';
  const direct = join(DIST, p);
  if (existsSync(direct) && statSync(direct).isFile()) return direct;
  if (!extname(p)) {
    const html = join(DIST, p + '.html');
    if (existsSync(html)) return html;
    const idx = join(DIST, p, 'index.html');
    if (existsSync(idx)) return idx;
  }
  return direct; // let it 404
}
function startServer(port) {
  const server = createServer((req, res) => {
    const file = resolveFile(req.url || '/');
    if (!existsSync(file) || !statSync(file).isFile()) { res.writeHead(404); res.end('not found'); return; }
    res.writeHead(200, { 'content-type': MIME[extname(file).toLowerCase()] || 'application/octet-stream' });
    res.end(readFileSync(file));
  });
  return new Promise((resolve, reject) => {
    server.on('error', reject);
    server.listen(port, '127.0.0.1', () => resolve(server));
  });
}

// ── resolve Playwright from local, sibling repos, or the npx cache ─────────────
// Playwright's index.js is CJS; imported as ESM its API (chromium/devices) lands on
// `.default`, so we normalise to a { chromium, devices } shape.
function normalise(mod) {
  const d = mod?.default || {};
  const chromium = mod?.chromium || d.chromium;
  const devices = mod?.devices || d.devices;
  return chromium ? { chromium, devices } : null;
}
async function resolvePlaywright() {
  try { const n = normalise(await import('playwright')); if (n) return n; } catch { /* not local */ }
  const require = createRequire(import.meta.url);
  const searchPaths = [];
  if (process.env.PLAYWRIGHT_DIR) searchPaths.push(process.env.PLAYWRIGHT_DIR);
  searchPaths.push(join(homedir(), 'Projects', 'chapbook-template'));
  searchPaths.push(join(homedir(), 'Projects', 'chapbook-tutorials'));
  const npx = join(homedir(), '.npm', '_npx');
  try {
    for (const d of readdirSync(npx)) searchPaths.push(join(npx, d));
  } catch { /* no npx cache */ }
  for (const base of searchPaths) {
    try {
      const entry = require.resolve('playwright', { paths: [base] });
      const n = normalise(await import(pathToFileURL(entry).href));
      if (n) return n;
    } catch { /* keep searching */ }
  }
  return null;
}

async function main() {
  const arg = process.argv[2];
  let base = arg && /^https?:\/\//.test(arg) ? arg.replace(/\/$/, '') : null;
  let selfServe = !base || /^https?:\/\/(localhost|127\.0\.0\.1)/i.test(base);
  let port = 5055;
  if (base) { try { const u = new URL(base); if (u.port) port = Number(u.port); } catch { /* ignore */ } }

  if (!existsSync(DIST)) {
    console.error('qa-gallery: dist/ not found — run `npm run build` first.');
    process.exit(1);
  }
  const pw = await resolvePlaywright();
  if (!pw || !pw.chromium) {
    console.log('qa-gallery: Playwright not found (local/sibling/npx). SKIP — install Playwright to build the gallery.');
    process.exit(0);
  }

  let server = null;
  if (selfServe) {
    server = await startServer(port);
    base = `http://127.0.0.1:${port}`;
    console.log(`qa-gallery: serving dist/ at ${base}`);
  } else {
    console.log(`qa-gallery: shooting remote ${base}`);
  }

  // reset output dir
  rmSync(OUT_DIR, { recursive: true, force: true });
  mkdirSync(OUT_DIR, { recursive: true });

  const browser = await pw.chromium.launch({ args: ['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'] });
  const iPhone = pw.devices['iPhone 14'];
  const shots = []; // { file, page, width, label, variant }

  async function shoot(ctx, urlPath, width, label, variant, opts = {}) {
    const page = await ctx.newPage();
    try {
      await page.goto(base + urlPath, { waitUntil: 'load', timeout: 45000 });
      await page.addStyleTag({ content: '*{scroll-behavior:auto !important} .mkt-nav{position:static !important}' }).catch(() => {});
      await page.waitForTimeout(1400); // fonts, hero, iframe theme paint
      if (opts.before) { await opts.before(page); await page.waitForTimeout(900); }
      // Force lazy images to load and scroll the whole page so nothing below the
      // fold (e.g. the 20-theme screenshot strip) is captured blank.
      await page.evaluate(async () => {
        document.querySelectorAll('img[loading="lazy"]').forEach((i) => { i.loading = 'eager'; });
        const h = () => document.documentElement.scrollHeight;
        for (let y = 0; y < h(); y += 500) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 60)); }
        window.scrollTo(0, 0);
        await Promise.all([...document.images].filter((i) => !i.complete).map((i) => new Promise((r) => { i.onload = i.onerror = r; })));
      }).catch(() => {});
      await page.waitForTimeout(400);
      const name = `${variant || label.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${width}.png`;
      const file = join(OUT_DIR, name);
      if (opts.locator) {
        // Element screenshot (on-screen, freshly painted) — used for the live theme
        // switcher so the switched theme is captured unambiguously (a fullPage stitch
        // can show the static intro-loop poster instead of the live iframe state).
        const loc = page.locator(opts.locator);
        await loc.scrollIntoViewIfNeeded();
        await page.waitForTimeout(400);
        await loc.screenshot({ path: file });
      } else {
        await page.screenshot({ path: file, fullPage: opts.fullPage !== false });
      }
      shots.push({ file: name, page: urlPath, width, label: variant ? `${label} (${variant.split('-').slice(1, -1).join(' ') || 'variant'})` : label, variant: !!variant });
      console.log(`  shot ${name}`);
    } catch (e) {
      console.error(`  FAIL ${urlPath} @${width}: ${e.message}`);
    } finally {
      await page.close();
    }
  }

  // Base grid: every page at each width. Desktop widths use a plain context;
  // 390 uses the iPhone-14 device descriptor. No licence is ever seeded.
  for (const width of WIDTHS) {
    const ctx = width === 390
      ? await browser.newContext({ ...iPhone })
      : await browser.newContext({ viewport: { width, height: width >= 1280 ? 900 : 1024 }, deviceScaleFactor: 1 });
    for (const pg of PAGES) {
      await shoot(ctx, pg.path, width, pg.label);
    }
    await ctx.close();
  }

  // ── Variant shots (owner asked for these specifically) ──────────────────────
  // /themes switched to 2 contrasting themes via the live switcher's postMessage.
  const vctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 1 });
  for (const theme of ['broadsheet', 'neon']) {
    await shoot(vctx, '/themes', 1280, 'Themes', `themes-${theme}-1280`, {
      locator: '.switcher-grid',
      before: async (page) => {
        // Click the real switcher chip AND postMessage into the sample-post iframe,
        // retrying until the iframe's data-blog-theme actually flips (the iframe's
        // CSS loads async, so an early single message can be lost).
        await page.evaluate(async (t) => {
          const chip = document.querySelector(`.chip[data-theme="${t}"]`);
          const fr = document.getElementById('theme-frame');
          for (let i = 0; i < 20; i++) {
            if (chip) chip.click();
            if (fr && fr.contentWindow) fr.contentWindow.postMessage({ blogTheme: t }, location.origin);
            await new Promise((r) => setTimeout(r, 150));
            if (fr && fr.contentDocument && fr.contentDocument.documentElement.getAttribute('data-blog-theme') === t) break;
          }
        }, theme);
      },
    });
  }
  // /pricing trial-form SUCCESS state (stub the fetch so no real request is sent).
  await shoot(vctx, '/pricing', 1280, 'Pricing', 'pricing-form-success-1280', {
    before: async (page) => {
      await page.evaluate(() => {
        // Stub the trial endpoint to the real success shape ({ ok, message }) so the
        // form shows its confirmation state without sending a request. The handler
        // reads r.ok && (await r.json()).message.
        window.fetch = async () => ({ ok: true, status: 200, json: async () => ({ message: 'Check your email for your 7-day key.' }) });
        const form = document.querySelector('.trial-form');
        if (form) { form.email.value = 'demo@example.com'; form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true })); }
      });
    },
  });
  await vctx.close();

  await browser.close();
  if (server) server.close();

  // ── assemble the self-contained gallery.html ────────────────────────────────
  const b64 = (name) => `data:image/png;base64,${readFileSync(join(OUT_DIR, name)).toString('base64')}`;
  const byWidth = (w) => shots.filter((s) => s.width === w && !s.variant);
  const variants = shots.filter((s) => s.variant);
  const section = (title, list) => `
    <h2>${title}</h2>
    <div class="grid">
      ${list.map((s) => `
        <figure>
          <figcaption><b>${s.label}</b><span>${s.page} · ${s.width}px</span></figcaption>
          <img loading="lazy" src="${b64(s.file)}" alt="${s.label} at ${s.width}px">
        </figure>`).join('')}
    </div>`;
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Chapbook marketing site — QA gallery</title>
<style>
  :root{color-scheme:dark}
  body{margin:0;background:#0b1120;color:#e6edf7;font:15px/1.5 -apple-system,system-ui,sans-serif;padding:28px}
  h1{font-size:26px;margin:0 0 4px} .sub{color:#8fa1bd;margin:0 0 24px;font-size:14px}
  h2{font-size:18px;margin:34px 0 12px;border-bottom:1px solid rgba(230,237,247,.12);padding-bottom:6px}
  .grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(360px,1fr));gap:18px}
  figure{margin:0;border:1px solid rgba(230,237,247,.12);border-radius:10px;overflow:hidden;background:#070c16}
  figcaption{display:flex;justify-content:space-between;gap:10px;padding:9px 12px;font-size:13px;border-bottom:1px solid rgba(230,237,247,.09)}
  figcaption span{color:#8fa1bd} img{display:block;width:100%;height:auto}
</style></head><body>
  <h1>Chapbook marketing site — QA gallery</h1>
  <p class="sub">${shots.length} shots · source ${base} · generated ${new Date().toISOString()}. Review the theme page especially (flagship differentiator). No owner PII in any pixel.</p>
  ${section('Desktop — 1280px', byWidth(1280))}
  ${section('Tablet — 768px', byWidth(768))}
  ${section('Mobile — 390px (iPhone 14)', byWidth(390))}
  ${variants.length ? section('Variants — switched themes + trial-form success', variants) : ''}
</body></html>`;
  const galleryPath = join(OUT_DIR, 'gallery.html');
  writeFileSync(galleryPath, html);
  const base27 = shots.filter((s) => !s.variant).length;
  console.log(`\nwrote ${galleryPath} (${base27} base + ${variants.length} variant shots)`);
}

main().catch((e) => { console.error(`qa-gallery: ${e.stack || e}`); process.exit(1); });
