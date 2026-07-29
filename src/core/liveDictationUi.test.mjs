/* Static integration guards for the visible English Live-dictation UI. Browser E2E
   exercises the actual interactions; these assertions keep the disclosure, interim
   results, language and fallback seams from disappearing in a later UI edit. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');

test('voice mode is a visible split control with both named modes', () => {
  assert.match(html, /id="chatVoiceMode"/);
  assert.match(html, /id="chatVoiceMenu"/);
  assert.match(html, />Private transcription</);
  assert.match(html, />Live dictation</);
  assert.match(html, /role="menuitemradio"/);
});

test('Live dictation remains English UK with continuous interim results', () => {
  assert.match(html, /inst\.lang = 'en-GB'/);
  assert.match(html, /inst\.interimResults = true/);
  assert.match(html, /inst\.continuous = true/);
  assert.match(html, /provisional words are appearing/);
});

test('cloud-capable live mode requires the explicit disclosure confirmation', () => {
  assert.match(html, /title: 'Turn on Live dictation\?'/);
  assert.match(html, /STT_PROVIDERS\.webspeech\.disclosure/);
  assert.match(html, /okText: 'Use Live dictation'/);
  assert.doesNotMatch(html, /localStorage\.setItem\(STT_ENGINE_KEY, 'webspeech'\)[\s\S]{0,250}without/i);
});

test('unsupported live recognition is visibly disabled and falls back safely', () => {
  assert.match(html, /liveChoice\.disabled = !engines\.webspeech/);
  assert.match(html, /Live dictation is not available in this browser or app/);
  assert.match(html, /Private transcription remains available/);
});

test('typing during live interim painting stops recognition rather than clobbering edits', () => {
  assert.match(html, /if\(active && !painting\) wsStop\(\)/);
  assert.match(html, /base = el \? el\.value : ''/);
  assert.match(html, /paint\(''\)/);
});

test('voice menu has status announcements and Escape dismissal', () => {
  assert.match(html, /id="chatVoiceStatus" role="status" aria-live="polite"/);
  assert.match(html, /e\.key === 'Escape'/);
  assert.match(html, /modeBtn\.focus\(\)/);
});

test('the mic cannot switch modes through a slow click or hidden context-menu shortcut', () => {
  const micUi = html.slice(html.indexOf('function chatInitMic(){'), html.indexOf('/* ── keyboard-riding'));
  assert.doesNotMatch(micUi, /btn\.addEventListener\('pointerdown'/);
  assert.doesNotMatch(micUi, /btn\.addEventListener\('contextmenu'/);
  assert.match(micUi, /if\(id === 'webspeech'\) wsTap\(\)/);
  assert.match(micUi, /else if\(id === 'whisper'\) whTap\(\)/);
});
