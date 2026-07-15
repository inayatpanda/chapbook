// Provider detection for the embed block. Shared by the Studio composer (bundled via
// build.mjs) and unit tests. YouTube/Vimeo → id; a direct .mp4/.webm/.ogg or /videos/
// or CDN URL → self-hosted (provider:'video').
export function parseEmbedUrl(url) {
  const u = (url || '').trim();
  if (!u) return { provider: '', videoId: '', src: '' };
  let m = u.match(/(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{6,})/i);
  if (m) return { provider: 'youtube', videoId: m[1], src: '' };
  m = u.match(/(?:player\.)?vimeo\.com\/(?:video\/)?(\d{6,})/i);
  if (m) return { provider: 'vimeo', videoId: m[1], src: '' };
  if (/\.(mp4|webm|ogg)(\?.*)?$/i.test(u) || /^\/videos\//i.test(u) || /\/media\/.+-web\.mp4/i.test(u))
    return { provider: 'video', src: u, videoId: '' };
  return { provider: '', videoId: '', src: '' };
}
