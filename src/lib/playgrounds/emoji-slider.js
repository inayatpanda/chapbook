/* Family: emoji slider — a 0–100 slider that maps to the nearest "stop" on a
   scale, showing its emoji + label. For any spectrum you want to feel rather
   than measure (mood, spice, effort, hype…). */
import { esc } from './index.js';

export default {
  id: 'emoji-slider',
  name: 'Emoji scale',
  category: 'explorer',
  description: 'A slider that maps a 0–100 value to the nearest emoji and label on a scale, for any spectrum you want to feel rather than measure.',
  paramsSchema: {
    type: 'object', additionalProperties: false,
    required: ['stops'],
    properties: {
      title: { type: 'string', title: 'Optional label above the scale' },
      stops: {
        type: 'array', title: 'Scale stops (low→high)', minItems: 2, maxItems: 7,
        items: {
          type: 'object', additionalProperties: false, required: ['at', 'emoji', 'label'],
          properties: {
            at: { type: 'number', title: 'Position 0–100', minimum: 0, maximum: 100 },
            emoji: { type: 'string', title: 'Emoji' },
            label: { type: 'string', title: 'Label' },
          },
        },
      },
    },
  },
  presets: [
    {
      name: 'How spicy can you handle?',
      params: {
        title: 'How spicy can you handle?',
        stops: [
          { at: 0, emoji: '🥛', label: 'Mild' },
          { at: 35, emoji: '🌶️', label: 'Warm' },
          { at: 70, emoji: '🔥', label: 'Hot' },
          { at: 100, emoji: '💀', label: 'Regret' },
        ],
      },
    },
    {
      name: 'Monday mood',
      params: {
        title: 'Monday mood',
        stops: [
          { at: 0, emoji: '😴', label: 'Asleep' },
          { at: 50, emoji: '😐', label: 'Coping' },
          { at: 100, emoji: '🤩', label: 'Unstoppable' },
        ],
      },
    },
  ],
  build(params, domId) {
    // sanitise stops: clamp 0–100, keep 2–7, sort low→high
    const stops = (Array.isArray(params.stops) ? params.stops : [])
      .filter((s) => s && typeof s === 'object')
      .map((s) => ({
        at: Math.max(0, Math.min(100, Number(s.at) || 0)),
        emoji: String(s.emoji || '•'),
        label: String(s.label || ''),
      }))
      .sort((a, b) => a.at - b.at)
      .slice(0, 7);
    while (stops.length < 2) stops.push({ at: 100, emoji: '•', label: '' });

    const start = stops[Math.floor((stops.length - 1) / 2)];
    const title = params.title ? `<div class="pg-es-title">${esc(params.title)}</div>` : '';
    const html =
      `<div class="pg-stage">${title}` +
      `<div class="pg-es-readout" aria-live="polite">` +
      `<div class="pg-es-emoji" data-role="emoji">${esc(start.emoji)}</div>` +
      `<div class="pg-es-label pg-readout" data-role="label">${esc(start.label)}</div>` +
      `</div>` +
      `<div class="pg-row"><label style="flex:1">Slide` +
      `<input type="range" data-role="slider" min="0" max="100" value="${start.at}" step="1" aria-label="Scale position 0 to 100"></label></div>` +
      `</div>`;
    const css = [
      `#${domId} .pg-es-title{font-size:.9rem;color:var(--ink-dim,#9fb3c8);margin:0 0 .6rem}`,
      `#${domId} .pg-es-readout{text-align:center;margin:.2rem 0 .8rem}`,
      `#${domId} .pg-es-emoji{font-size:3.4rem;line-height:1;display:inline-block;transform:scale(1);transition:transform .18s ease}`,
      `#${domId} .pg-es-emoji.pg-es-pop{transform:scale(1.28)}`,
      `#${domId}.pg-es-reduce .pg-es-emoji{transition:none}`,
      `#${domId} .pg-es-label{margin-top:.4rem;font-size:1.15rem;font-weight:700;color:#22d3ee}`,
    ].join('\n');
    const jsBody = `
var emoji=$('[data-role=emoji]'),label=$('[data-role=label]'),slider=$('[data-role=slider]');
if(!emoji||!label||!slider)return;
if(reduced)root.classList.add('pg-es-reduce');
var stops=${JSON.stringify(stops)};
var popTimer=null;
function nearest(v){
  var best=stops[0],bd=Math.abs(v-stops[0].at);
  for(var i=1;i<stops.length;i++){var d=Math.abs(v-stops[i].at);if(d<bd){bd=d;best=stops[i];}}
  return best;
}
var last=null;
function set(v){
  var s=nearest(v);
  if(s===last)return;
  last=s;
  emoji.textContent=s.emoji;
  label.textContent=s.label;
  if(!reduced){
    emoji.classList.remove('pg-es-pop');
    void emoji.offsetWidth;            // restart the transition
    emoji.classList.add('pg-es-pop');
    if(popTimer)clearTimeout(popTimer);
    popTimer=setTimeout(function(){emoji.classList.remove('pg-es-pop');},190);
  }
}
slider.addEventListener('input',function(){set(parseFloat(slider.value));});
last=nearest(parseFloat(slider.value));  // sync without popping on first paint
`;
    return { html, css, jsBody };
  },
};
