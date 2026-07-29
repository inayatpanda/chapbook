#!/usr/bin/env node
// One-time generator for the Open Graph share card → src/marketing/og-image.png (1200x630).
// NOT wired into the build: run it once and commit the PNG. Re-run only to regenerate the card.
//
//   node scripts/make-og.mjs   →  wrote src/marketing/og-image.png (1200x630)
//
// The card is fully self-contained: the brand wordmark + tagline on the midnight→well
// gradient with the teal→cyan→violet accent, in the same self-hosted Space Grotesk / Inter
// faces the site ships (base64-embedded here so the render needs no network or font install).
// No external text, logos, or personal data.
//
// Rendering: prefer Playwright (a dev dependency when present); otherwise fall back to a
// headless Google Chrome / Chromium / Edge binary. If NEITHER is available it SKIPs cleanly
// (exit 0) so a bare checkout is never blocked; the committed PNG stands in that case.
import { readFileSync, writeFileSync, existsSync, unlinkSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { spawnSync } from 'node:child_process';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const FONTS = join(ROOT, 'src/fonts');
const OUT = join(ROOT, 'src/marketing/og-image.png');
const W = 1200;
const H = 630;

const dataFont = (file) => `data:font/woff2;base64,${readFileSync(join(FONTS, file)).toString('base64')}`;
const grotesk = dataFont('space-grotesk-700.woff2');
const inter = dataFont('inter-500.woff2');

// The card. width/height pinned so the screenshot is exactly 1200x630 regardless of chrome.
const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><style>
@font-face{font-family:'Space Grotesk';font-weight:700;font-style:normal;src:url(${grotesk}) format('woff2')}
@font-face{font-family:'Inter';font-weight:500;font-style:normal;src:url(${inter}) format('woff2')}
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:${W}px;height:${H}px}
.card{position:relative;width:${W}px;height:${H}px;overflow:hidden;display:flex;flex-direction:column;
  justify-content:center;padding:0 96px;color:#e6edf7;font-family:'Inter',system-ui,sans-serif;
  background:linear-gradient(160deg,#0b1120 0%,#05070e 100%)}
.glow{position:absolute;inset:0;background:
  radial-gradient(720px 440px at 84% 12%,rgba(34,208,238,.20),transparent 60%),
  radial-gradient(560px 380px at 8% 98%,rgba(139,92,246,.18),transparent 60%)}
.bar{position:absolute;left:0;top:0;width:100%;height:8px;
  background:linear-gradient(90deg,#2dd4bf,#22d0ee 55%,#8b5cf6)}
.eyebrow{position:relative;font-weight:600;font-size:23px;letter-spacing:.17em;text-transform:uppercase;
  color:#22d0ee;margin-bottom:26px}
h1{position:relative;font-family:'Space Grotesk',sans-serif;font-weight:700;font-size:138px;line-height:1;
  letter-spacing:-.03em;background:linear-gradient(100deg,#2dd4bf,#22d0ee 55%,#8b5cf6 120%);
  -webkit-background-clip:text;background-clip:text;color:transparent}
p{position:relative;margin-top:30px;font-size:42px;line-height:1.28;color:rgba(230,237,247,.74);max-width:22ch}
.host{position:absolute;left:96px;bottom:56px;font-size:25px;font-weight:500;letter-spacing:.01em;
  color:rgba(230,237,247,.46)}
</style></head><body>
<div class="card">
  <div class="glow"></div><div class="bar"></div>
  <div class="eyebrow">Local-first blog writing</div>
  <h1>Chapbook</h1>
  <p>Write locally. Publish to a blog you own.</p>
  <div class="host">chapbook.rqai.co.uk</div>
</div></body></html>`;

function assertSize(path) {
  const buf = readFileSync(path);
  const ok = buf.length > 8 && buf[0] === 0x89 && buf[1] === 0x50;
  const w = ok ? buf.readUInt32BE(16) : 0;
  const h = ok ? buf.readUInt32BE(20) : 0;
  return { ok: ok && w === W && h === H, w, h };
}

async function viaPlaywright() {
  let pw;
  try { pw = await import('playwright'); } catch { return false; }
  const browser = await pw.chromium.launch();
  try {
    const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
    await page.setContent(html, { waitUntil: 'networkidle' });
    await page.screenshot({ path: OUT });
  } finally {
    await browser.close();
  }
  return true;
}

function findChrome() {
  const candidates = [
    process.env.CHROME_PATH,
    process.env.PUPPETEER_EXECUTABLE_PATH,
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Chromium.app/Contents/MacOS/Chromium',
    '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
    '/usr/bin/google-chrome',
    '/usr/bin/google-chrome-stable',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
  ].filter(Boolean);
  return candidates.find((p) => { try { return statSync(p).isFile(); } catch { return false; } });
}

function viaChrome() {
  const bin = findChrome();
  if (!bin) return false;
  const tmp = join(tmpdir(), `chapbook-og-${process.pid}.html`);
  writeFileSync(tmp, html);
  try {
    const r = spawnSync(bin, [
      '--headless=new', '--disable-gpu', '--hide-scrollbars', '--no-sandbox',
      '--force-device-scale-factor=1', `--window-size=${W},${H}`,
      '--virtual-time-budget=3000', `--screenshot=${OUT}`, `file://${tmp}`,
    ], { stdio: 'ignore' });
    if (r.status !== 0 && !existsSync(OUT)) return false;
  } finally {
    try { unlinkSync(tmp); } catch {}
  }
  return existsSync(OUT);
}

const engine = (await viaPlaywright()) ? 'playwright' : (viaChrome() ? 'chrome' : null);

if (!engine) {
  console.log('make-og: no Playwright and no Chrome/Chromium binary found; SKIP (committed og-image.png stands).');
  process.exit(0);
}

const size = assertSize(OUT);
if (!size.ok) {
  console.error(`make-og: rendered ${OUT} is ${size.w}x${size.h}, expected ${W}x${H}.`);
  process.exit(1);
}
console.log(`wrote src/marketing/og-image.png (${W}x${H}) via ${engine}`);
