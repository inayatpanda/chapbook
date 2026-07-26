// Pure helpers for the native (Tauri iOS/Android/desktop) file-SAVE interceptor.
//
// WHY: WKWebView (iOS/macOS) — and the custom-scheme origin generally (tauri://localhost /
// http://tauri.localhost) — ignore `<a download>` and will not persist a `blob:` or `data:`
// URL to disk. So EVERY Chapbook export silently fails on the native wrappers: the .html export
// (Interactive maker), the flipbook GIF/video, the share-card image, an imported/exported PDF,
// and the drafts JSON export all build a Blob/data-URL and click a hidden `<a download>` that
// the webview drops on the floor. On the hosted web build these anchors work exactly as before.
//
// FIX (impure installer in src/app.js, gated on isNativeOrigin): a native-only capture-phase
// click interceptor on `a[download]` reads the blob/data bytes, opens the OS Save dialog
// (tauri-plugin-dialog) and writes the bytes to the chosen path (tauri-plugin-fs). These PURE
// helpers do the classification/derivation the installer needs — URL kind, data: mime + decode,
// filename + extension, dialog filters — with NO DOM or Tauri dependency, so they unit-test
// cleanly and carry no runtime cost on the web (the installer that calls them never runs there).

// Which download URLs the native interceptor handles: only `blob:` and `data:`. An `<a download>`
// pointing at an http(s) or same-origin file is a normal navigation the webview/fetch-bridge can
// already handle, so it is left alone. Returns 'blob' | 'data' | null. Pure.
export function downloadUrlKind(url) {
  if (typeof url !== 'string') return null;
  if (/^blob:/i.test(url)) return 'blob';
  if (/^data:/i.test(url)) return 'data';
  return null;
}

// The MIME type a `data:` URL declares, lower-cased (e.g. 'image/png' from
// 'data:image/png;base64,…'), or '' when none is given ('data:,hi' → '' → treated as text). Pure.
export function mimeFromDataUrl(url) {
  if (typeof url !== 'string') return '';
  const m = /^data:([^;,]*)[;,]/i.exec(url);
  return m && m[1] ? m[1].trim().toLowerCase() : '';
}

// Decode a `data:` URL to { mime, bytes: Uint8Array }. Handles base64 and percent-encoded (text)
// payloads. Returns null on a malformed input and NEVER throws. Pure (uses the universal `atob`
// + TextEncoder globals; no DOM). The interceptor uses this so a data:-URL export (e.g. the PNG
// share card) is saved without a network round-trip.
export function decodeDataUrl(url) {
  if (typeof url !== 'string' || !/^data:/i.test(url)) return null;
  const comma = url.indexOf(',');
  if (comma < 0) return null;
  const meta = url.slice(5, comma);          // between "data:" and the first ","
  const body = url.slice(comma + 1);
  const mime = (meta.split(';')[0] || '').trim().toLowerCase();
  const isB64 = /(^|;)base64$/i.test(meta) || /;base64/i.test(meta);
  try {
    let bytes;
    if (isB64) {
      const bin = atob(body.replace(/\s+/g, ''));
      bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    } else {
      bytes = new TextEncoder().encode(decodeURIComponent(body));
    }
    return { mime, bytes };
  } catch { return null; }
}

// MIME → file extension for the export types Chapbook actually produces (and a few neighbours).
// Returns '' for an unknown/blank MIME, so the caller falls back to the download attribute's own
// extension. Pure.
const MIME_EXT = {
  'image/png': 'png', 'image/jpeg': 'jpg', 'image/jpg': 'jpg', 'image/gif': 'gif',
  'image/webp': 'webp', 'image/apng': 'apng', 'image/svg+xml': 'svg', 'image/bmp': 'bmp',
  'application/json': 'json', 'text/html': 'html', 'text/plain': 'txt', 'text/markdown': 'md',
  'text/css': 'css', 'application/javascript': 'js', 'text/javascript': 'js',
  'application/pdf': 'pdf', 'application/zip': 'zip',
  'video/mp4': 'mp4', 'video/webm': 'webm', 'video/quicktime': 'mov', 'audio/mpeg': 'mp3',
  'audio/wav': 'wav', 'audio/webm': 'weba',
};
export function extensionForMime(mime) {
  if (typeof mime !== 'string') return '';
  return MIME_EXT[mime.trim().toLowerCase()] || '';
}

// Derive a safe, sensible filename for the Save dialog from the anchor's `download` attribute
// (preferred) and, as a fallback for the extension, the MIME (from the data: URL or the Blob's
// type). Guarantees a non-empty base and — where determinable — a plausible extension. Strips any
// path separators a value might carry so it can't escape the chosen directory. Pure.
export function deriveDownloadFilename(downloadAttr, mime, fallbackBase) {
  let name = (typeof downloadAttr === 'string' ? downloadAttr : '').trim();
  name = name.replace(/[\\/]+/g, '_').replace(/^\.+/, '').trim();
  if (!name) name = (typeof fallbackBase === 'string' && fallbackBase.trim()) ? fallbackBase.trim() : 'download';
  if (!/\.[A-Za-z0-9]{1,8}$/.test(name)) {
    const ext = extensionForMime(mime);
    if (ext) name += '.' + ext;
  }
  return name;
}

// Human labels for the Save-dialog filter, keyed by extension. Anything unlisted falls back to
// "<EXT> file".
const FILTER_LABELS = {
  png: 'PNG image', jpg: 'JPEG image', jpeg: 'JPEG image', gif: 'GIF image', webp: 'WebP image',
  svg: 'SVG image', bmp: 'Bitmap image', apng: 'Animated PNG',
  json: 'JSON file', html: 'HTML file', txt: 'Text file', md: 'Markdown file', css: 'CSS file',
  js: 'JavaScript file', pdf: 'PDF document', zip: 'Zip archive',
  mp4: 'MP4 video', webm: 'WebM video', mov: 'QuickTime video', mp3: 'MP3 audio', wav: 'WAV audio',
};

// Build the Tauri save-dialog `filters` array from the final filename's extension. Returns [] when
// there is no usable extension (the dialog then shows all files). Pure.
export function dialogFiltersFor(filename) {
  const m = /\.([A-Za-z0-9]{1,8})$/.exec(typeof filename === 'string' ? filename : '');
  if (!m) return [];
  const ext = m[1].toLowerCase();
  return [{ name: FILTER_LABELS[ext] || ext.toUpperCase() + ' file', extensions: [ext] }];
}
