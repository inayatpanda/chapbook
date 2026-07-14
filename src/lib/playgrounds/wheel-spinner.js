import { esc } from './index.js';

export default {
  id: 'wheel-spinner',
  name: 'Decision wheel',
  category: 'game',
  description: 'Spin a wheel of options and let it pick one at random, for when you genuinely cannot decide.',
  paramsSchema: {
    type: 'object', additionalProperties: false, required: ['options'],
    properties: {
      title: { type: 'string' },
      options: { type: 'array', minItems: 2, maxItems: 8, items: { type: 'string' } },
    },
  },
  presets: [
    { name: "What's for dinner?", params: { title: "What's for dinner?", options: ['Pizza', 'Curry', 'Pasta', 'Tacos', 'Leftovers', 'Surprise me'] } },
    { name: 'Yes / No / Ask again', params: { title: 'Yes / No / Ask again', options: ['Yes', 'No', 'Ask again later'] } },
  ],
  build(params, domId) {
    const all = Array.isArray(params.options) ? params.options.map((o) => String(o == null ? '' : o).trim()).filter(Boolean) : [];
    const options = all.slice(0, 8);
    while (options.length < 2) options.push('Option ' + (options.length + 1));
    const title = params.title ? `<div class="pg-ws-title">${esc(params.title)}</div>` : '';

    const html = `<div class="pg-stage">${title}` +
      `<div class="pg-ws-wrap">` +
      `<svg class="pg-ws-svg" viewBox="0 0 200 200" role="img" aria-label="Decision wheel">` +
      `<g data-role="wheel" transform="rotate(0 100 100)"></g>` +
      `<polygon class="pg-ws-pointer" points="100,6 92,24 108,24"></polygon>` +
      `<circle class="pg-ws-hub" cx="100" cy="100" r="10"></circle>` +
      `</svg>` +
      `</div>` +
      `<div class="pg-controls"><div class="pg-row">` +
      `<button type="button" class="pg-ws-btn" data-role="spin">Spin</button>` +
      `</div></div>` +
      `<div class="pg-readout pg-ws-out" data-role="out">Give it a spin.</div>` +
      `</div>`;

    const css = [
      `#${domId} .pg-ws-title{font-weight:700;margin-bottom:.6rem;color:var(--ink,#e9eef8)}`,
      `#${domId} .pg-ws-wrap{display:flex;justify-content:center;margin:.2rem 0 .8rem}`,
      `#${domId} .pg-ws-svg{width:100%;max-width:260px;height:auto;overflow:visible}`,
      `#${domId} [data-role=wheel]{transform-box:view-box;transform-origin:100px 100px;transition:transform 4s cubic-bezier(.17,.67,.18,1)}`,
      `#${domId} .pg-ws-seg{stroke:#04060c;stroke-width:1}`,
      `#${domId} .pg-ws-label{fill:#04060c;font-size:9px;font-weight:700;dominant-baseline:middle}`,
      `#${domId} .pg-ws-pointer{fill:#fbbf24;stroke:#04060c;stroke-width:1}`,
      `#${domId} .pg-ws-hub{fill:#0a0f1c;stroke:#23304a;stroke-width:2}`,
      `#${domId} .pg-ws-btn{font:inherit;font-weight:600;cursor:pointer;border:1px solid #22d3ee;background:rgba(34,211,238,.14);color:var(--ink,#e9eef8);padding:.45rem 1.1rem;border-radius:9px;transition:background .15s,border-color .15s}`,
      `#${domId} .pg-ws-btn:hover{background:rgba(34,211,238,.24)}`,
      `#${domId} .pg-ws-btn[disabled]{opacity:.5;cursor:default}`,
      `#${domId} .pg-readout{margin:.6rem 0;color:var(--ink-dim,#cdd6e6)}`,
      `#${domId} .pg-ws-out b{color:var(--ink,#e9eef8)}`,
      `#${domId}.pg-ws-reduce [data-role=wheel]{transition:none}`,
    ].join('\n');

    const jsBody = `
var OPTIONS=${JSON.stringify(options)};
var PALETTE=['#2dd4bf','#22d3ee','#818cf8','#f472b6','#fbbf24','#34d399','#60a5fa','#c084fc'];
if(reduced)root.classList.add('pg-ws-reduce');
var wheel=$('[data-role=wheel]'), spinBtn=$('[data-role=spin]'), out=$('[data-role=out]');
if(!wheel||!spinBtn||!out)return;
var NS='http://www.w3.org/2000/svg';
var CX=100, CY=100, R=90, N=OPTIONS.length, STEP=360/N;

// polar -> cartesian; angle 0 = top (12 o'clock), increasing clockwise
function pt(angle,radius){
  var rad=(angle-90)*Math.PI/180;
  return { x:CX+radius*Math.cos(rad), y:CY+radius*Math.sin(rad) };
}

function buildWheel(){
  while(wheel.firstChild)wheel.removeChild(wheel.firstChild);
  for(var i=0;i<N;i++){
    var a0=i*STEP, a1=(i+1)*STEP;
    var p0=pt(a0,R), p1=pt(a1,R);
    var large=(a1-a0)>180?1:0;
    var d='M '+CX+' '+CY+' L '+p0.x.toFixed(2)+' '+p0.y.toFixed(2)+
          ' A '+R+' '+R+' 0 '+large+' 1 '+p1.x.toFixed(2)+' '+p1.y.toFixed(2)+' Z';
    var seg=document.createElementNS(NS,'path');
    seg.setAttribute('class','pg-ws-seg');
    seg.setAttribute('d',d);
    seg.setAttribute('fill',PALETTE[i%PALETTE.length]);
    wheel.appendChild(seg);
    // label, rotated to sit along its wedge
    var mid=a0+STEP/2;
    var lp=pt(mid,R*0.62);
    var txt=document.createElementNS(NS,'text');
    txt.setAttribute('class','pg-ws-label');
    txt.setAttribute('x',lp.x.toFixed(2));
    txt.setAttribute('y',lp.y.toFixed(2));
    txt.setAttribute('text-anchor','middle');
    var rot=mid; if(rot>90&&rot<270)rot+=180;
    txt.setAttribute('transform','rotate('+rot.toFixed(2)+' '+lp.x.toFixed(2)+' '+lp.y.toFixed(2)+')');
    var label=OPTIONS[i];
    txt.textContent=label.length>14?label.slice(0,13)+'…':label;
    wheel.appendChild(txt);
  }
}
buildWheel();

var spinning=false, current=0;

function show(i){ out.innerHTML='→ <b>'+OPTIONS[i].replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')+'</b>'; }

function spin(){
  if(spinning)return;
  var win=Math.floor(Math.random()*N);
  if(reduced){ current=0; wheel.style.transform='rotate(0deg)'; show(win); return; }
  spinning=true; spinBtn.disabled=true; out.textContent='Spinning…';
  // angle (clockwise) that the chosen wedge centre currently sits at; rotate to bring it to the top
  var mid=win*STEP+STEP/2;
  var turns=5+Math.floor(Math.random()*3);
  var base=current - (current%360);          // strip current full turns
  var target=base + turns*360 + (360-mid);   // land wedge centre under the top pointer
  current=target;
  // animate via the CSS transform PROPERTY so the CSS transition runs; setting the SVG
  // transform ATTRIBUTE instead would not trigger the transition (it would jump).
  wheel.style.transform='rotate('+target.toFixed(2)+'deg)';
  var done=false;
  function finish(){ if(done)return; done=true; spinning=false; spinBtn.disabled=false; show(win); }
  wheel.addEventListener('transitionend',finish,{ once:true });
  setTimeout(finish,4300); // fallback if transitionend doesn't fire
}

spinBtn.addEventListener('click',spin);
`;

    return { html, css, jsBody };
  },
};
