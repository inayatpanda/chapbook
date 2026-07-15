import { esc } from './index.js';

export default {
  id: 'colour-harmony',
  name: 'Colour harmony',
  category: 'art',
  description: 'Pick a hue and see colours that go with it — complementary, analogous and triadic.',
  paramsSchema: {
    type: 'object',
    additionalProperties: false,
    required: ['hue'],
    properties: {
      title: { type: 'string' },
      hue: { type: 'number', default: 190, minimum: 0, maximum: 360 },
      caption: { type: 'string' },
    },
  },
  presets: [
    { name: 'Find a palette', params: { title: 'Find a palette', hue: 190 } },
    { name: 'Warm start', params: { title: 'Warm start', hue: 25, caption: 'Reds and oranges, plus what sits opposite.' } },
  ],
  build(params, domId) {
    let hue = Number(params.hue);
    if (!isFinite(hue)) hue = 190;
    hue = Math.max(0, Math.min(360, Math.round(hue)));
    const title = params.title ? `<div class="pg-ch-title">${esc(params.title)}</div>` : '';
    const caption = params.caption ? `<div class="pg-ch-caption">${esc(params.caption)}</div>` : '';

    const html = `<div class="pg-stage">${title}
  <div class="pg-controls">
    <div class="pg-row">
      <label class="pg-field"><b>Hue</b>
        <input type="range" min="0" max="360" step="1" value="${hue}" data-role="hue" aria-label="Base hue">
      </label>
      <span class="pg-readout" data-role="hue-out">${hue}°</span>
    </div>
  </div>
  <div class="pg-ch-base">
    <div class="pg-ch-base-swatch" data-role="base-swatch"></div>
    <div class="pg-ch-base-meta">
      <span class="pg-ch-base-label">Base</span>
      <span class="pg-ch-hex" data-role="base-hex">#000000</span>
    </div>
  </div>
  <div class="pg-ch-rows" data-role="rows"></div>
  ${caption}
</div>`;

    const css = [
      `#${domId} .pg-ch-title{font-weight:700;margin-bottom:.6rem;color:#e9eef8}`,
      `#${domId} .pg-ch-caption{margin-top:.8rem;font-size:.85rem;color:#9fb0c8}`,
      `#${domId} .pg-controls{margin-bottom:.9rem}`,
      `#${domId} .pg-row{display:flex;align-items:center;gap:.8rem}`,
      `#${domId} .pg-field{flex:1;display:flex;align-items:center;gap:.6rem;color:#cdd6e6}`,
      `#${domId} .pg-field b{font-weight:600;white-space:nowrap}`,
      `#${domId} .pg-field input[type=range]{flex:1;min-width:0}`,
      `#${domId} .pg-readout{font-variant-numeric:tabular-nums;font-weight:600;color:#22d3ee;min-width:3.2ch;text-align:right}`,
      `#${domId} .pg-ch-base{display:flex;align-items:center;gap:.8rem;margin-bottom:1rem}`,
      `#${domId} .pg-ch-base-swatch{width:64px;height:64px;border-radius:12px;border:1px solid #23304a;flex:none}`,
      `#${domId} .pg-ch-base-meta{display:flex;flex-direction:column;gap:.15rem}`,
      `#${domId} .pg-ch-base-label{font-size:.75rem;text-transform:uppercase;letter-spacing:.06em;color:#9fb0c8}`,
      `#${domId} .pg-ch-hex{font-variant-numeric:tabular-nums;font-weight:600;color:#e9eef8}`,
      `#${domId} .pg-ch-rows{display:flex;flex-direction:column;gap:.9rem}`,
      `#${domId} .pg-ch-rowname{font-size:.78rem;text-transform:uppercase;letter-spacing:.06em;color:#9fb0c8;margin-bottom:.35rem}`,
      `#${domId} .pg-ch-swatches{display:flex;gap:.6rem;flex-wrap:wrap}`,
      `#${domId} .pg-ch-sw{flex:1;min-width:96px;border-radius:10px;border:1px solid #23304a;overflow:hidden}`,
      `#${domId} .pg-ch-chip{height:54px}`,
      `#${domId} .pg-ch-swhex{display:block;padding:.3rem .4rem;font-size:.72rem;font-variant-numeric:tabular-nums;color:#cdd6e6;background:rgba(140,160,200,.06);text-align:center}`,
    ].join('\n');

    const jsBody = `
var slider = $('[data-role=hue]');
if(!slider) return;
var hueOut = $('[data-role=hue-out]');
var baseSwatch = $('[data-role=base-swatch]');
var baseHex = $('[data-role=base-hex]');
var rows = $('[data-role=rows]');
var S = 70, L = 55;

function hslToHex(h, s, l){
  h = ((h % 360) + 360) % 360;
  s /= 100; l /= 100;
  var c = (1 - Math.abs(2 * l - 1)) * s;
  var x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  var m = l - c / 2;
  var r = 0, g = 0, b = 0;
  if(h < 60){ r = c; g = x; }
  else if(h < 120){ r = x; g = c; }
  else if(h < 180){ g = c; b = x; }
  else if(h < 240){ g = x; b = c; }
  else if(h < 300){ r = x; b = c; }
  else { r = c; b = x; }
  function hx(v){ var n = Math.round((v + m) * 255); return ('0' + n.toString(16)).slice(-2); }
  return '#' + hx(r) + hx(g) + hx(b);
}

function makeSwatch(h){
  var hex = hslToHex(h, S, L);
  var sw = document.createElement('div');
  sw.className = 'pg-ch-sw';
  var chip = document.createElement('div');
  chip.className = 'pg-ch-chip';
  chip.style.background = hex;
  var label = document.createElement('span');
  label.className = 'pg-ch-swhex';
  label.textContent = hex;
  sw.appendChild(chip);
  sw.appendChild(label);
  return sw;
}

function makeRow(name, hues){
  var wrap = document.createElement('div');
  var nm = document.createElement('div');
  nm.className = 'pg-ch-rowname';
  nm.textContent = name;
  var strip = document.createElement('div');
  strip.className = 'pg-ch-swatches';
  hues.forEach(function(h){ strip.appendChild(makeSwatch(h)); });
  wrap.appendChild(nm);
  wrap.appendChild(strip);
  return wrap;
}

function render(){
  var h = Number(slider.value) || 0;
  if(hueOut) hueOut.textContent = h + '\\u00B0';
  var baseHexVal = hslToHex(h, S, L);
  if(baseSwatch) baseSwatch.style.background = baseHexVal;
  if(baseHex) baseHex.textContent = baseHexVal;
  if(!rows) return;
  rows.textContent = '';
  rows.appendChild(makeRow('Complementary', [h + 180]));
  rows.appendChild(makeRow('Analogous', [h - 30, h + 30]));
  rows.appendChild(makeRow('Triadic', [h - 120, h + 120]));
}

slider.addEventListener('input', render);
render();
`;

    return { html, css, jsBody };
  },
};
