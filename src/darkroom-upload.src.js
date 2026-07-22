// Darkroom uploader (Studio screen) — the client-side controller for #v-darkroom.
//
// Flow: pick a post → drop a batch of photos → for each, read EXIF from the ORIGINAL
// (before resize) + resize in-browser → review thumbnails, edit caption/tags/album (per
// image + bulk) → one atomic commit of the resized images + a merged meta.json to the blog
// repo under src/content/blog/_images/<slug>/. The Phase-1 Darkroom then displays them.
//
// EXIF-on-resize trap: resize.js re-encodes through a canvas, which STRIPS EXIF — so we read
// DateTimeOriginal/Make/Model from the ORIGINAL File first, and persist them in the
// sidecar (the blog reads date/camera from meta.json, not the resized image). GPS is
// neither read nor persisted (privacy — see readExif below).
//
// No secrets at rest: the GitHub token is held in the browser (BYOK). Nothing leaves the
// browser until the user clicks Commit; the pre-commit summary states exactly what will go.
//
// Deps are injected by index.html's inline module (initDarkroom) so we reuse its api()/toast()/
// esc() and the BYOK GitHub seam (window.__studioGh) rather than duplicating them.

// NOTE on imports: this file is esbuild-bundled → public/studio/darkroom-upload.js.
//   • './resize.js' and './vendor/exifr.esm.js' are kept EXTERNAL (resolved by the browser
//     relative to the OUTPUT location — /studio/… locally, /… in the flattened dist), so the
//     specifiers are written as they must appear in the OUTPUT, beside index.html.
//   • './core/darkroomMeta.js' is bundled IN (single source of truth, unit-tested), so its
//     path is relative to THIS source file in studio-app/.
import { resizeToBase64 } from './resize.js';
import exifr from './vendor/exifr.esm.js';
import { normaliseExif, buildEntry, parseExistingMeta, mergeMeta, safeImageName, dedupeAgainst } from './core/darkroomMeta.js';

const IMG_DIR = (slug) => `src/content/blog/_images/${slug}`;
const META_PATH = (slug) => `${IMG_DIR(slug)}/meta.json`;

// Size guards (I4) — the resized JPEGs are normally ~1–2 MB, but a huge PNG screenshot can
// re-encode large. Skip anything implausibly big per image, and cap the whole batch, to stay
// well under GitHub's blob/contents limits and secondary rate limits during the commit loop.
const MAX_IMG_BYTES = 10 * 1024 * 1024;   // ~10 MB per image (post-resize), per the spec
const MAX_BATCH_BYTES = 40 * 1024 * 1024; // ~40 MB total across one commit
const MAX_BATCH_COUNT = 40;               // and no more than 40 photos in one commit
const fmtMB = (b) => (b / (1024 * 1024)).toFixed(1) + ' MB';

// Module state — the staged batch + the chosen post. Reset on each view entry.
let D = null;          // injected deps { api, toast, esc, gh }
let photos = [];       // [{ id, filename, base64, bytes, w, h, exif:{date,camera,gps}, caption, tags:[], album }]
let posts = [];        // [{ slug, title, photoCount }]
let busy = false;

const $ = (id) => document.getElementById(id);
const mkId = () => 'dk-' + Math.random().toString(36).slice(2, 9);

// Is a Helm backend reachable for this Studio session? Only the local same-origin Helm build
// (no hosted config object) archives originals server-side via api() /media/image/*.
// The hosted product is pure BYOK ("this device only") — NO Helm, so there is NO local archive;
// it stays browser-resize → GitHub exactly as before (documented limitation).
function helmReachable() {
  if (typeof window === 'undefined') return false;
  if (!window.__studioConfig) return true;                                    // local same-origin Helm build
  return false;                                                               // hosted product in BYOK mode
}

// A Helm-backed `gh` seam. When the Studio is connected to a Helm (local same-origin, or a phone
// over the tunnel) there is NO browser GitHub token — the token lives server-side. So the repo
// ops route THROUGH the Helm (D.api → the admin-gated /repo/* routes), which signs them with the
// owner's stored token. Mirrors the BYOK seam's listTree/getFile/commitMany contract EXACTLY so
// commit() is unchanged, but reports byok:false, helm:true so the gate can tell them apart.
function helmGh() {
  const api = D && D.api;
  return {
    byok: false,
    helm: true,
    async listTree(prefix) {
      const r = await api('/repo/tree?prefix=' + encodeURIComponent(prefix || ''));
      return (r && r.entries) || [];
    },
    async getFile(path) {
      const r = await api('/repo/file?path=' + encodeURIComponent(path || ''));
      return (r && r.file) || null;                 // { sha, content } | null — same shape as BYOK
    },
    async commitMany(changes, message) {
      return await api('/repo/commit', { method: 'POST', body: JSON.stringify({ changes, message }) });
    },
  };
}

// Pick the repo seam for the current session, in priority order:
//   1. a BYOK browser token (window.__studioGh.byok) → commit browser-direct, unchanged;
//   2. else a reachable Helm → route repo ops through the server's stored token (helmGh);
//   3. else null → the caller shows the friendly "connect a token / a Helm" prompt.
// Keeping BYOK first means the existing browser-commit path for other users is 100% untouched.
function resolveGh() {
  const byok = (typeof window !== 'undefined' && window.__studioGh) || (D && D.gh);
  if (byok && byok.byok) return byok;
  if (helmReachable() && D && typeof D.api === 'function') return helmGh();
  return null;
}
const esc = (s) => (D && D.esc ? D.esc(s) : String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])));
const toast = (t) => { if (D && D.toast) D.toast(t); };

// Read EXIF from the ORIGINAL file (never throws — a photo with no/locked EXIF just yields nulls).
//
// NOTE the options: the vendored LITE exifr build does NOT support `pick` — passing it
// throws "undefined is not iterable" for EVERY file, which the catch below used to swallow,
// so date/camera were silently never read (QA regression, fixed + pinned by unit tests).
// `{ gps: false }` IS supported and serves the privacy goal better than `pick` did: the GPS
// block is never even parsed, so coordinates never enter browser memory. The staged shape
// additionally hard-nulls `gps` (belt-and-braces; buildEntry never persists it either way).
// Exported for the unit tests (they feed it a real EXIF-bearing jpeg).
export async function readExif(file) {
  try {
    const raw = await exifr.parse(file, { gps: false });
    const { date, camera } = normaliseExif(raw);
    return { date, camera, gps: null };
  } catch {
    return { date: null, camera: null, gps: null };
  }
}

// A short, friendly "12 Aug 2024" from an ISO date (or '' if none). British order.
function fmtDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

// ---- post picker ----------------------------------------------------------
// P2: which slug should stay selected after the <select> is rebuilt. Keep the previously
// selected slug when it still exists in the new list (staged `photos` stay targeted at the SAME
// post); otherwise fall back to the first slug. A blind rebuild leaves NOTHING selected, so the
// browser silently picks the FIRST option while `photos` persist — Commit could target the wrong
// post. PURE (no DOM): prevValue + slug list in → the slug to select out ('' when the list empty).
export function pickSelectValue(prevValue, slugs) {
  const list = (Array.isArray(slugs) ? slugs : []).map((s) => String(s == null ? '' : s));
  const prev = String(prevValue == null ? '' : prevValue);
  if (prev && list.includes(prev)) return prev;
  return list.length ? list[0] : '';
}

// P2: the last REAL post selection (a non-empty slug), tracked OUTSIDE the DOM. The live
// <select> value alone is not enough: a failed load replaces the options with an empty-valued
// error option, so after an error-then-success cycle the DOM remembers NOTHING and the rebuild
// would silently fall back to the FIRST post while staged `photos` persist — exactly the
// wrong-post-commit hazard pickSelectValue exists to kill. Updated on every successful restore
// and on every user change of #dkPost; every rebuild restores from it via pickSelectValue.
let lastPostSlug = '';

async function loadPosts() {
  const sel = $('dkPost');
  if (!sel) return;
  // Capture the current selection BEFORE the options are overwritten (the 'Loading…' line below
  // already wipes sel.value). Only a NON-empty live value updates the tracked slug — an empty
  // value means the select is showing a placeholder/error option, and overwriting the tracked
  // slug with '' is precisely how a failed load used to lose the selection (P2).
  if (sel.value) lastPostSlug = sel.value;
  sel.innerHTML = '<option value="">Loading posts…</option>';
  try {
    posts = (await D.api('/posts')) || [];
    if (!posts.length) { sel.innerHTML = '<option value="">No posts yet — create one first</option>'; return; }
    // I1: the `/posts` photoCount is the BODY-gallery count, NOT the Darkroom (_images/<slug>/)
    // count, so it never changes after a Darkroom upload and reads like a failed commit. Drop it
    // from the option label; the true Darkroom count for the selected post is shown by showDarkroomCount().
    sel.innerHTML = posts.map((p) =>
      `<option value="${esc(p.slug)}">${esc(p.title || p.slug)}</option>`
    ).join('');
    // Restore the TRACKED selection so neither re-entry nor an error-then-success cycle silently
    // re-points staged photos (P2), then re-sync the tracker with what actually stuck.
    sel.value = pickSelectValue(lastPostSlug, posts.map((p) => p.slug));
    lastPostSlug = sel.value;
    showDarkroomCount();
  } catch (e) {
    sel.innerHTML = '<option value="">Could not load posts</option>';
    toast((e && e.message) || 'Could not load posts');
  }
}

// Show the TRUE number of photos already in the selected post's _images/<slug>/ (I1). One
// listTree call per selection (not per post, to avoid N API calls / rate limits). Best-effort:
// stays silent if the seam/listing is unavailable. A request token guards against races when
// the user changes the selection quickly.
let countSeq = 0;
async function showDarkroomCount() {
  const el = $('dkCount');
  if (!el) return;
  const slug = ($('dkPost') && $('dkPost').value || '').trim();
  const gh = resolveGh(); // BYOK token, else the Helm-backed seam, else null
  if (!slug) { el.textContent = ''; return; }
  if (!gh || typeof gh.listTree !== 'function') { el.textContent = ''; return; }
  const seq = ++countSeq;
  el.textContent = 'Checking existing photos…';
  const names = await existingImageNames(gh, slug);
  if (seq !== countSeq) return; // a newer selection superseded this one
  if (!names) { el.textContent = ''; return; } // couldn't check (transient) — stay silent (best-effort count)
  const c = names.length;
  el.textContent = c ? `${c} photo${c === 1 ? '' : 's'} already in this post's gallery` : 'No photos in this post yet';
}

// ---- staging a dropped/selected batch -------------------------------------
// P2 (HEIC/empty-MIME): split a dropped batch into files we'll try to decode vs. ones to skip.
// An EMPTY MIME type PASSES — Chrome/macOS report HEIC with NO type, and resize.js already emits
// a friendly per-file "Couldn't read that image" if it genuinely can't decode, so an empty-type
// file must REACH decode instead of vanishing silently. Only a real NON-image MIME is skipped.
// PURE (no DOM): a file list in → { accepted, skipped } out.
export function partitionImageFiles(fileList) {
  const accepted = [], skipped = [];
  for (const f of [...(fileList || [])].filter(Boolean)) {
    const type = f.type || '';
    if (type === '' || /^image\//.test(type)) accepted.push(f);
    else skipped.push(f);
  }
  return { accepted, skipped };
}

async function addFiles(fileList) {
  // P3: the drop zone stays clickable/droppable during a commit, but commit() has already captured
  // the count + dedupe, so a late add would silently diverge from what's being committed. No-op.
  if (busy) { toast('Hang on — finishing the current commit…'); return; }
  const { accepted, skipped } = partitionImageFiles(fileList);
  // Tell the user when genuinely non-image files were dropped instead of returning without a word.
  if (skipped.length) toast('Skipped ' + skipped.length + ' file' + (skipped.length > 1 ? 's' : '') + " that aren't photos");
  const files = accepted;
  if (!files.length) return;
  toast('Reading ' + files.length + ' photo' + (files.length > 1 ? 's' : '') + '…');
  let added = 0, skippedBig = 0, skippedCap = 0;
  let batchBytes = photos.reduce((s, p) => s + (p.bytes || 0), 0);
  for (const file of files) {
    // Batch cap (I4): stop staging once the count/size limit is hit — the rest can go in a 2nd commit.
    if (photos.length >= MAX_BATCH_COUNT) { skippedCap++; continue; }
    try {
      const exif = await readExif(file);                 // ORIGINAL first (EXIF lives here)
      const { filename, base64, bytes, width, height } = await resizeToBase64(file); // then strip-EXIF resize
      // Per-image size guard (I4): skip an implausibly large resized image with a clear message.
      if (bytes > MAX_IMG_BYTES) {
        skippedBig++;
        toast('Skipped ' + (file.name || 'a photo') + ' — too large (' + fmtMB(bytes) + ', limit ' + fmtMB(MAX_IMG_BYTES) + ')');
        continue;
      }
      // Batch total-size guard (I4): don't let one commit grow past the cap.
      if (batchBytes + bytes > MAX_BATCH_BYTES) { skippedCap++; continue; }
      batchBytes += bytes;
      // Sanitise the filename to a safe basename (C1) the moment it's staged — no traversal/odd
      // chars survive. Collision-with-existing dedupe happens at commit (needs the repo listing).
      const safe = safeImageName(filename, { fallbackStem: 'photo-' + (photos.length + 1) });
      // Retain the ORIGINAL File so that, in Helm mode, the full-res master can be archived
      // server-side (data/originals/) instead of being thrown away. Pure BYOK ignores it and
      // commits the in-browser `base64` resize as today. The File reference is cheap (no copy).
      photos.push({ id: mkId(), filename: safe, base64, bytes, w: width, h: height, exif, caption: '', tags: [], album: '', file });
      added++;
    } catch (err) {
      toast('Skipped ' + (file.name || 'a photo') + ': ' + ((err && err.message) || err));
    }
  }
  if (added) toast('Staged ' + added + ' photo' + (added > 1 ? 's' : ''));
  if (skippedCap) toast('Batch full (' + MAX_BATCH_COUNT + ' photos / ' + fmtMB(MAX_BATCH_BYTES) + ') — commit these, then add the rest.');
  if (added || skippedBig || skippedCap) renderGrid();
}

// Ensure unique filenames within the staged batch AND against the post's already-committed
// images, so an upload NEVER overwrites an existing photo (C1) or clobbers its meta.json entry.
// resize.js names by original stem (two "IMG.jpg" collide); a re-drop could also hit an existing
// gallery-1.jpg. `existingNames` are the files already in _images/<slug>/. Mutates photo.filename.
function dedupeFilenames(existingNames = []) {
  const deduped = dedupeAgainst(photos.map((p) => p.filename), existingNames);
  photos.forEach((p, i) => { p.filename = deduped[i]; });
}

// List the filenames already committed under the post's _images/<slug>/ folder (minus meta.json).
// Used to dedupe new uploads against existing photos. Returns null (NOT []) when the folder can't
// be listed — a missing seam or a transient GitHub error. C1: [] would read as "empty folder" and
// disable dedupe, letting a commit OVERWRITE existing photos, so commit() must treat null as
// "couldn't check" and abort. A genuinely-empty (but SUCCESSFUL) listing still returns [].
export async function existingImageNames(gh, slug) {
  if (!gh || typeof gh.listTree !== 'function') return null;
  try {
    const entries = await gh.listTree(IMG_DIR(slug));
    return (entries || [])
      .map((e) => (e.path || '').split('/').pop())
      .filter((name) => name && name.toLowerCase() !== 'meta.json');
  } catch {
    return null;
  }
}

// ---- review grid ----------------------------------------------------------
function renderGrid() {
  const grid = $('dkGrid');
  const summary = $('dkSummary');
  if (!grid) return;
  if (!photos.length) {
    grid.innerHTML = '<p class="sub" style="color:var(--faint);text-align:center;padding:1.4rem 0">No photos staged yet. Drop some above.</p>';
    if (summary) summary.textContent = '';
    $('dkBulkBar').style.display = 'none';
    $('dkCommit').disabled = true;
    return;
  }
  $('dkBulkBar').style.display = 'flex';
  $('dkCommit').disabled = busy;
  grid.innerHTML = photos.map((p) => {
    const meta = [fmtDate(p.exif && p.exif.date), p.exif && p.exif.camera].filter(Boolean).join(' · ');
    const chips = (p.tags || []).map((t, i) =>
      `<span class="dk-chip" data-id="${p.id}" data-i="${i}">${esc(t)}<button type="button" class="dk-chip-x" data-id="${p.id}" data-i="${i}" aria-label="Remove tag">×</button></span>`
    ).join('');
    return `
    <div class="dk-cell" data-id="${p.id}">
      <div class="dk-thumb"><img src="data:image/jpeg;base64,${p.base64}" alt="" loading="lazy"/>
        <button type="button" class="dk-del" data-id="${p.id}" title="Remove from batch" aria-label="Remove from batch">×</button></div>
      <div class="dk-meta">${meta ? esc(meta) : '<span style="color:var(--faint)">no EXIF — date falls back to the post</span>'}</div>
      <input class="dk-cap" data-id="${p.id}" type="text" placeholder="Caption (optional)" value="${esc(p.caption)}" />
      <div class="dk-chips" data-id="${p.id}">${chips}<input class="dk-tagin" data-id="${p.id}" type="text" placeholder="add tag…" /></div>
      <input class="dk-alb" data-id="${p.id}" type="text" placeholder="Album (optional)" value="${esc(p.album)}" />
    </div>`;
  }).join('');
  wireGrid();
  if (summary) {
    const slug = $('dkPost').value || '(no post selected)';
    const albums = [...new Set(photos.map((p) => p.album).filter(Boolean))];
    summary.textContent = `${photos.length} photo${photos.length > 1 ? 's' : ''} → ${slug}` +
      (albums.length ? ` · album${albums.length > 1 ? 's' : ''}: ${albums.join(', ')}` : '');
  }
}

const findPhoto = (id) => photos.find((p) => p.id === id);

function wireGrid() {
  const grid = $('dkGrid');
  grid.querySelectorAll('.dk-del').forEach((b) => b.addEventListener('click', () => {
    photos = photos.filter((p) => p.id !== b.dataset.id); renderGrid();
  }));
  grid.querySelectorAll('.dk-cap').forEach((inp) => inp.addEventListener('input', () => {
    const p = findPhoto(inp.dataset.id); if (p) p.caption = inp.value;
  }));
  grid.querySelectorAll('.dk-alb').forEach((inp) => inp.addEventListener('input', () => {
    const p = findPhoto(inp.dataset.id); if (p) p.album = inp.value;
  }));
  grid.querySelectorAll('.dk-chip-x').forEach((b) => b.addEventListener('click', () => {
    const p = findPhoto(b.dataset.id); if (p) { p.tags.splice(Number(b.dataset.i), 1); renderGrid(); }
  }));
  grid.querySelectorAll('.dk-tagin').forEach((inp) => inp.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter' && e.key !== ',') return;
    e.preventDefault();
    const p = findPhoto(inp.dataset.id); const t = inp.value.trim();
    if (p && t && !p.tags.includes(t)) { p.tags.push(t); renderGrid(); setTimeout(() => { const n = $('dkGrid').querySelector(`.dk-tagin[data-id="${p.id}"]`); if (n) n.focus(); }, 0); }
    else inp.value = '';
  }));
}

// ---- bulk bar -------------------------------------------------------------
function bulkTags() {
  const raw = ($('dkBulkTags').value || '').split(',').map((s) => s.trim()).filter(Boolean);
  if (!raw.length) return;
  for (const p of photos) for (const t of raw) if (!p.tags.includes(t)) p.tags.push(t);
  $('dkBulkTags').value = '';
  renderGrid();
  toast('Applied tag' + (raw.length > 1 ? 's' : '') + ' to all');
}
function bulkAlbum() {
  const a = ($('dkBulkAlbum').value || '').trim();
  if (!a) return;
  for (const p of photos) p.album = a;
  renderGrid();
  toast('Set album on all');
}

// Push each staged photo's ORIGINAL full-res File to the Helm image archive so the master
// is preserved locally on the Mac (data/originals/). Runs only when a Helm backend is
// reachable (helmReachable()); a no-op otherwise (pure BYOK keeps no original — documented).
//
// Flow per photo (mirrors the Helm-mode video upload): POST the File (multipart) → resize on
// the server → record the returned mediaId on the photo. We DON'T call the archive's publish
// (the browser still owns the repo commit below, keeping its single atomic commit) — the
// archive's job here is purely to keep the full-res master. Best-effort: failures warn and
// never block the publish (the resized image still goes to GitHub via the browser commit).
async function archiveOriginals(slug, btn) {
  if (!helmReachable() || !D || typeof D.api !== 'function') return;
  const withFiles = photos.filter((p) => p && p.file);
  if (!withFiles.length) return;
  let archived = 0;
  for (let i = 0; i < withFiles.length; i++) {
    const p = withFiles[i];
    if (btn) btn.textContent = `Archiving original ${i + 1}/${withFiles.length}…`;
    try {
      const fd = new FormData();
      fd.append('file', p.file, p.file.name || p.filename);
      const up = await D.api('/media/image/upload', { method: 'POST', body: fd });
      if (up && up.id) {
        p.mediaId = up.id;
        await D.api('/media/image/' + up.id + '/resize', { method: 'POST' });
        archived++;
      }
    } catch (e) {
      // Best-effort: a missing endpoint (older Helm), a network blip, or a too-big original
      // must not block the publish. The resized copy still goes out via the browser commit.
      toast('Could not archive the original for ' + (p.filename || 'a photo') + ' — publishing the resized copy only');
    }
  }
  if (archived) toast('Archived ' + archived + ' original' + (archived > 1 ? 's' : '') + ' ✓');
}

// ---- commit ---------------------------------------------------------------
async function commit() {
  if (busy) return;
  const slug = ($('dkPost').value || '').trim();
  if (!slug) return toast('Pick a post first');
  if (!photos.length) return toast('Stage some photos first');
  // BYOK token if present → commit browser-direct (unchanged). Otherwise, if connected to a Helm,
  // route the repo read + commit through the server's stored token. Neither → the friendly prompt.
  const gh = resolveGh();
  if (!gh) {
    return toast('Uploading photos needs your GitHub token — open Settings to connect.');
  }

  const n = photos.length;
  const albums = [...new Set(photos.map((p) => p.album).filter(Boolean))];
  const ok = confirm(
    `Commit ${n} photo${n > 1 ? 's' : ''} to “${slug}”` +
    (albums.length ? ` (album${albums.length > 1 ? 's' : ''}: ${albums.join(', ')})` : '') +
    `?\n\nThe resized images + an updated meta.json go straight to your repo in one commit, then the blog rebuilds.`
  );
  if (!ok) return;

  busy = true; renderGrid();
  const btn = $('dkCommit'); if (btn) { btn.disabled = true; btn.textContent = 'Reading meta.json…'; }
  try {
    // Dedupe staged filenames against what's ALREADY committed under _images/<slug>/ (C1) so an
    // upload never overwrites an existing photo or clobbers its meta entry. Done now (not at stage
    // time) because it needs the live repo listing; colliding names get -2, -3… appended.
    const existingNames = await existingImageNames(gh, slug);
    if (existingNames === null) {
      // C1: couldn't confirm what's already there → we can't guarantee we won't overwrite a
      // committed photo. Abort BEFORE any archive/commit; the finally block resets the button.
      toast("Couldn't check existing photos on GitHub — try again in a moment");
      return;
    }
    dedupeFilenames(existingNames);

    // HELM IMAGE ARCHIVE: when a Helm backend is reachable, push each ORIGINAL full-res file
    // to the server first so the irreplaceable master is kept on the Mac (data/originals/).
    // Best-effort — a failed archive must NOT block the publish, so we warn and carry on with
    // the existing browser-resize → GitHub commit (which still goes out below, unchanged). In
    // pure BYOK mode there is no Helm, so this is skipped and no local original is kept.
    await archiveOriginals(slug, btn);

    // Read-modify-write the sidecar so we never clobber other photos' entries.
    const existing = await gh.getFile(META_PATH(slug)); // {sha,content} | null
    const merged = mergeMeta(
      parseExistingMeta(existing && existing.content),
      Object.fromEntries(photos.map((p) => [p.filename, buildEntry({ exif: p.exif, caption: p.caption, tags: p.tags, album: p.album })]))
    );
    if (btn) btn.textContent = `Committing ${n} photo${n > 1 ? 's' : ''}…`;

    const changes = [
      ...photos.map((p) => ({ path: `${IMG_DIR(slug)}/${p.filename}`, base64: p.base64 })),
      { path: META_PATH(slug), content: JSON.stringify(merged, null, 2) },
    ];
    const res = await gh.commitMany(changes, `studio: add ${n} photo${n > 1 ? 's' : ''} to ${slug}`);

    toast('Committed ' + n + ' photo' + (n > 1 ? 's' : '') + ' ✓');
    showSuccess(slug, n, res && res.commit, await siteOrigin());
    photos = [];
    await loadPosts();
    $('dkPost').value = slug;
    showDarkroomCount(); // refresh the true _images/<slug>/ count now the new photos are committed
    renderGrid();
  } catch (e) {
    if (typeof window !== 'undefined' && window.showError) window.showError(e, { title: 'Could not upload the photos' });
    else toast((e && e.message) || 'Commit failed');
  } finally {
    busy = false;
    if (btn) { btn.disabled = false; btn.textContent = 'Commit photos'; }
    renderGrid();
  }
}

// Normalise a configured site `url` to a bare scheme+host (no trailing slash); junk/empty → ''.
// Mirrors core/shareIntents.js normaliseOrigin so the Darkroom link matches the Studio's Share
// links exactly. PURE (no DOM/network). Used to absolutise the success-card href below.
export function normaliseSiteOrigin(url) {
  const raw = String(url == null ? '' : url).trim();
  if (!raw) return '';
  let u; try { u = new URL(/^https?:\/\//i.test(raw) ? raw : 'https://' + raw); } catch { return ''; }
  return (u.origin && u.origin !== 'null') ? u.origin : '';
}

// Build the "Open your blog's Darkroom" href. M4/P2: do NOT guess an `<owner>.github.io/<repo>/`
// Pages URL — hosted buyers use custom domains and that guess 404s. Instead absolutise against the
// CONFIGURED site origin (site.json `url`) when we know it; else a RELATIVE `/darkroom/`, which is
// correct on the local same-origin Helm build (Studio IS the blog) and when the origin is unknown.
// PURE (no DOM): a site url (or '') in → the href out.
export function darkroomHref(siteUrl) {
  const o = normaliseSiteOrigin(siteUrl);
  return o ? o + '/darkroom/' : '/darkroom/';
}

// Memoising site-origin resolver factory. Caches the IN-FLIGHT promise (concurrent success-card
// renders share ONE fetch) and keeps it only when a NON-empty origin resolved. A failed or empty
// fetch clears the cache so the NEXT call retries — caching '' permanently is exactly the bug this
// replaces: one transient /settings/site error and every later hosted success card fell back to
// the relative '/darkroom/' forever. Never rejects; callers always get a string ('' = unknown).
// PURE (no DOM/window): fetchOrigin() in → memoised async resolver out. Exported for unit tests.
export function createSiteOriginResolver(fetchOrigin) {
  let inflight = null; // Promise<string> while fetching / after a non-empty resolve; null = retry
  return function resolve() {
    if (inflight) return inflight;
    inflight = Promise.resolve()
      .then(fetchOrigin)
      .then((origin) => {
        const o = String(origin == null ? '' : origin);
        if (!o) inflight = null;      // resolved but empty → not a real origin, retry next render
        return o;
      })
      .catch(() => { inflight = null; return ''; }); // failed → forget, retry next render
    return inflight;
  };
}

// The buyer's blog origin (site.json `url`) — the SAME source the Studio's _siteOrigin() reads via
// /settings/site. Only the hosted product (window.__studioConfig present) can be cross-origin; the
// local build has no __studioConfig and is same-origin, so we skip the fetch and stay relative.
// Best-effort ('' → relative fallback); a failed fetch is retried on the next success card.
const resolveSiteOrigin = createSiteOriginResolver(async () => {
  const r = await D.api('/settings/site');
  return (r && r.data && r.data.url) || '';
});
async function siteOrigin() {
  if (typeof window === 'undefined' || !window.__studioConfig || !D || typeof D.api !== 'function') return '';
  return resolveSiteOrigin();
}

// Success card. Names the post so the owner can find the new shots, and links their blog's
// Darkroom (absolute for hosted cross-origin blogs, relative on the same-origin local build).
function showSuccess(slug, n, commit, origin) {
  const el = $('dkDone');
  if (!el) return;
  const href = darkroomHref(origin);
  el.innerHTML =
    `<div class="dk-done-card">✓ ${n} photo${n > 1 ? 's' : ''} committed to <b>${esc(slug)}</b>` +
    (commit ? ` <code style="opacity:.7">${esc(String(commit).slice(0, 7))}</code>` : '') +
    `. The blog will rebuild in a minute or two.<br>` +
    `<a href="${esc(href)}" target="_blank" rel="noopener" style="color:#22d3ee;text-decoration:underline">Open your blog's Darkroom →</a></div>`;
  el.style.display = 'block';
  clearTimeout(showSuccess._t);
  showSuccess._t = setTimeout(() => { el.style.display = 'none'; }, 20000);
}

// ---- drop zone + input wiring (idempotent: only wire once) ----------------
let wired = false;
function wireOnce() {
  if (wired) return; wired = true;
  const dz = $('dkDrop');
  const input = $('dkInput');
  if (input) input.addEventListener('change', (e) => { addFiles(e.target.files); e.target.value = ''; });
  // Camera capture: a SEPARATE input with capture="environment" (opens the rear camera on mobile;
  // a harmless file-picker on desktop). Routes through the SAME addFiles handler → resize + EXIF.
  const cam = $('dkCamInput');
  if (cam) cam.addEventListener('change', (e) => { addFiles(e.target.files); e.target.value = ''; });
  const camBtn = $('dkCamBtn');
  if (camBtn) camBtn.addEventListener('click', (e) => { e.stopPropagation(); cam && cam.click(); });
  if (dz) {
    dz.addEventListener('click', () => input && input.click());
    dz.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); input && input.click(); } });
    ['dragenter', 'dragover'].forEach((ev) => dz.addEventListener(ev, (e) => { e.preventDefault(); dz.classList.add('drag'); }));
    ['dragleave', 'drop'].forEach((ev) => dz.addEventListener(ev, (e) => { e.preventDefault(); dz.classList.remove('drag'); }));
    dz.addEventListener('drop', (e) => { if (e.dataTransfer && e.dataTransfer.files) addFiles(e.dataTransfer.files); });
  }
  const post = $('dkPost');
  if (post) post.addEventListener('change', () => {
    // Track the user's real choice (P2) — never let a placeholder/error option ('' value) clobber it.
    if (post.value) lastPostSlug = post.value;
    showDarkroomCount(); renderGrid();
  });
  const bt = $('dkBulkTagsBtn'); if (bt) bt.addEventListener('click', bulkTags);
  const ba = $('dkBulkAlbumBtn'); if (ba) ba.addEventListener('click', bulkAlbum);
  const cm = $('dkCommit'); if (cm) cm.addEventListener('click', commit);
}

// Public entry — index.html calls this when the Darkroom view opens.
export function initDarkroom(deps) {
  D = deps || {};
  wireOnce();
  // Show the "needs a token" banner only when NEITHER a BYOK token NOR a Helm is available —
  // resolveGh() returns a usable seam (BYOK or Helm-backed) in both working modes, null otherwise.
  const warn = $('dkWarn');
  if (warn) warn.style.display = resolveGh() ? 'none' : 'block';
  loadPosts();
  renderGrid();
}

// Hand a File (or FileList) into the SAME staging pipeline the drop zone uses
// (EXIF → resize → review grid). Lets the always-reachable Camera route a captured
// photo into the Darkroom without re-implementing the resize/commit flow. Callers
// must ensure the Darkroom view is initialised first (openDarkroom()); addFiles()
// needs the injected deps (toast) and renders into #dkGrid, which only exist then.
export function darkroomAddFiles(filesOrList) {
  const list = (filesOrList instanceof FileList || Array.isArray(filesOrList))
    ? filesOrList : [filesOrList].filter(Boolean);
  return addFiles(list);
}

if (typeof window !== 'undefined') {
  window.initDarkroom = initDarkroom;
  window.__dkAddFiles = darkroomAddFiles;
}
