/* Family: moon phases — a circular moon in SVG with a slider running through
   the ~29.5-day lunar cycle. Drag and watch it wax and wane; the readout names
   the phase and the approximate day. For anything about the Moon, time, tides
   or just a satisfying thing to nudge. */
import { esc } from './index.js';

export default {
  id: 'moon-phase',
  name: 'Moon phases',
  category: 'explorer',
  description: 'Drag through a lunar month and watch the moon wax and wane, with the phase named as you go.',
  paramsSchema: {
    type: 'object', additionalProperties: false,
    properties: {
      title: { type: 'string', title: 'Optional label above the moon' },
      caption: { type: 'string', title: 'One-line caption' },
    },
  },
  presets: [
    { name: 'A month of moons', params: { title: 'A month of moons',
      caption: 'Drag from new to full and back — the whole cycle is about 29.5 days.' } },
    { name: "Where's the moon tonight?", params: { title: "Where's the moon tonight?",
      caption: 'Drag to roughly where we are in the cycle.' } },
  ],
  build(params, domId) {
    const title = params.title ? `<div class="pg-mp-title">${esc(params.title)}</div>` : '';
    const caption = params.caption ? `<div class="pg-mp-cap pg-readout" data-role="cap">${esc(params.caption)}</div>` : '';
    const html =
      `<div class="pg-stage">${title}` +
      `<svg class="pg-mp-svg" viewBox="0 0 200 200" data-role="svg" role="img" aria-label="The Moon">` +
      `<defs><clipPath id="${domId}-clip"><circle cx="100" cy="100" r="90"></circle></clipPath></defs>` +
      `<circle cx="100" cy="100" r="90" fill="#0a0f1c" stroke="rgba(140,160,200,.25)" stroke-width="1.5"></circle>` +
      `<g clip-path="url(#${domId}-clip)">` +
      `<path data-role="lit" d="" fill="#e9eef8"></path>` +
      `</g>` +
      `<circle cx="100" cy="100" r="90" fill="none" stroke="rgba(140,160,200,.25)" stroke-width="1.5"></circle>` +
      `</svg>` +
      `<div class="pg-mp-out pg-readout" data-role="out" aria-live="polite"></div>` +
      `<div class="pg-row"><label style="flex:1">Cycle progress` +
      `<input type="range" data-role="slider" min="0" max="100" value="50" step="any" aria-label="Progress through the lunar cycle"></label></div>` +
      caption + `</div>`;
    const css = [
      `#${domId} .pg-mp-title{font-size:.9rem;color:var(--ink-dim,#9fb3c8);margin:0 0 .5rem}`,
      `#${domId} .pg-mp-svg{display:block;width:100%;max-width:240px;margin-inline:auto}`,
      `#${domId} [data-role=lit]{transition:d .2s ease}`,
      `#${domId} .pg-mp-out{text-align:center;font-size:1.15rem;font-weight:700;margin:.5rem 0 .4rem}`,
      `#${domId} .pg-mp-out small{display:block;font-size:.78rem;font-weight:400;color:var(--ink-dim,#9fb3c8);margin-top:.15rem}`,
      `#${domId} .pg-mp-cap{text-align:center}`,
      `#${domId}.pg-mp-reduce [data-role=lit]{transition:none}`,
    ].join('\n');
    const jsBody = `
var lit=$('[data-role=lit]'),out=$('[data-role=out]'),slider=$('[data-role=slider]');
if(!lit||!out||!slider)return;
if(reduced)root.classList.add('pg-mp-reduce');
var cx=100,cy=100,R=90,CYCLE=29.5;
var SVGNS='http://www.w3.org/2000/svg';
// Lit shape: combine the bright limb (a half-circle) with a half-ellipse whose
// horizontal radius follows the terminator. p in [0,1]: 0/1=new, 0.5=full.
function litPath(p){
  var k=Math.cos(p*2*Math.PI);      // +1 at new, -1 at full
  var ex=R*Math.abs(k);             // terminator ellipse horizontal radius
  var top='M '+cx+' '+(cy-R), bot=cx+' '+(cy+R);
  // waxing (p<0.5) lights the RIGHT limb; waning lights the LEFT limb.
  if(p<0.5){
    // bright right semicircle, sweep down the right side
    var limb='A '+R+' '+R+' 0 0 1 '+bot;
    // terminator edge back up to top
    var sweep=(k>=0)?0:1;           // gibbous (k<0) bulges left, crescent bulges right
    var term='A '+ex+' '+R+' 0 0 '+sweep+' '+cx+' '+(cy-R);
    return top+' '+limb+' '+term+' Z';
  } else {
    // bright left semicircle, sweep down the left side
    var limb2='A '+R+' '+R+' 0 0 0 '+bot;
    var sweep2=(k>=0)?1:0;
    var term2='A '+ex+' '+R+' 0 0 '+sweep2+' '+cx+' '+(cy-R);
    return top+' '+limb2+' '+term2+' Z';
  }
}
function phaseName(p){
  var f=((p%1)+1)%1;
  if(f<0.03||f>0.97)return 'New moon';
  if(f<0.22)return 'Waxing crescent';
  if(f<0.28)return 'First quarter';
  if(f<0.47)return 'Waxing gibbous';
  if(f<0.53)return 'Full moon';
  if(f<0.72)return 'Waning gibbous';
  if(f<0.78)return 'Last quarter';
  return 'Waning crescent';
}
function set(v){
  var p=Math.max(0,Math.min(100,v))/100;
  if(p<=0.001||p>=0.999){lit.setAttribute('d','');}
  else if(Math.abs(p-0.5)<0.002){
    // full moon: a complete disc
    lit.setAttribute('d','M '+cx+' '+(cy-R)+' A '+R+' '+R+' 0 1 1 '+cx+' '+(cy+R)+' A '+R+' '+R+' 0 1 1 '+cx+' '+(cy-R)+' Z');
  } else { lit.setAttribute('d',litPath(p)); }
  var day=Math.round(p*CYCLE*10)/10;
  out.innerHTML=phaseName(p)+'<small>Day '+day.toFixed(1)+' of '+CYCLE+'</small>';
}
slider.addEventListener('input',function(){set(parseFloat(slider.value));});
set(parseFloat(slider.value));
`;
    return { html, css, jsBody };
  },
};
