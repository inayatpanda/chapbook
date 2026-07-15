// Run:  node --test studio-app/core/embed.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseEmbedUrl } from './embed.js';

test('detects youtube (watch / youtu.be / shorts)', () => {
  assert.deepEqual(parseEmbedUrl('https://www.youtube.com/watch?v=Can5www-Oz0'), { provider: 'youtube', videoId: 'Can5www-Oz0', src: '' });
  assert.equal(parseEmbedUrl('https://youtu.be/Can5www-Oz0').videoId, 'Can5www-Oz0');
  assert.equal(parseEmbedUrl('https://www.youtube.com/shorts/Can5www-Oz0').provider, 'youtube');
});
test('detects vimeo', () => {
  assert.deepEqual(parseEmbedUrl('https://vimeo.com/123456789'), { provider: 'vimeo', videoId: '123456789', src: '' });
});
test('detects a direct/CDN video URL as self-hosted', () => {
  assert.deepEqual(parseEmbedUrl('https://inayatpanda.com/media/med-abc-web.mp4'), { provider: 'video', videoId: '', src: 'https://inayatpanda.com/media/med-abc-web.mp4' });
  assert.equal(parseEmbedUrl('/videos/x.mp4').provider, 'video');
});
test('blank/unknown → empty', () => {
  assert.deepEqual(parseEmbedUrl(''), { provider: '', videoId: '', src: '' });
  assert.equal(parseEmbedUrl('https://example.com/page').provider, '');
});
