import { esc } from './index.js';

const CONDITIONS = ['sunny', 'cloudy', 'rainy', 'stormy', 'snowy'];
const LABELS = { sunny: 'Sunny', cloudy: 'Cloudy', rainy: 'Rainy', stormy: 'Stormy', snowy: 'Snowy' };

export default {
  id: 'weather-scene',
  name: 'Weather scene',
  category: 'weather',
  description: 'Tap to switch the weather and watch the little SVG scene change.',
  paramsSchema: {
    type: 'object', additionalProperties: false, required: ['scenes'],
    properties: {
      title: { type: 'string' },
      caption: { type: 'string' },
      scenes: {
        type: 'array', minItems: 2, maxItems: 5,
        items: { type: 'string', enum: CONDITIONS },
      },
    },
  },
  presets: [
    { name: 'Four kinds of British day', params: {
      title: 'Four kinds of British day',
      scenes: ['sunny', 'cloudy', 'rainy', 'stormy'],
      caption: 'All four before lunch, if you are unlucky.' } },
    { name: 'Winter', params: {
      title: 'Winter',
      scenes: ['snowy', 'cloudy', 'sunny'],
      caption: 'Snow, then grey, then a brief, smug bit of sun.' } },
  ],
  build(params, domId) {
    // Validate + de-dupe the scene list, keep order, clamp to 2–5.
    const seen = {};
    let scenes = (Array.isArray(params.scenes) ? params.scenes : [])
      .filter((s) => CONDITIONS.indexOf(s) !== -1 && !seen[s] && (seen[s] = true));
    if (scenes.length < 2) scenes = ['sunny', 'rainy'];
    scenes = scenes.slice(0, 5);

    const title = params.title ? `<div class="pg-ws-title">${esc(params.title)}</div>` : '';
    const caption = params.caption ? `<div class="pg-ws-caption">${esc(params.caption)}</div>` : '';

    const buttons = scenes.map((s, i) =>
      `<button type="button" class="pg-ws-btn" data-role="btn" data-cond="${esc(s)}"` +
      ` aria-pressed="${i === 0 ? 'true' : 'false'}">${esc(LABELS[s])}</button>`).join('');

    const html =
      `<div class="pg-stage">` +
        title +
        `<div class="pg-ws-scene" data-role="scene" aria-live="polite">` +
          `<svg viewBox="0 0 200 140" width="100%" height="100%" role="img" data-role="svg" aria-label="Weather scene"></svg>` +
        `</div>` +
        `<div class="pg-controls pg-ws-controls" role="group" aria-label="Choose the weather">${buttons}</div>` +
        caption +
      `</div>`;

    const css = [
      `#${domId} .pg-ws-title{font-weight:600;color:var(--ink,#e9eef8);margin-bottom:.6rem}`,
      `#${domId} .pg-ws-scene{border-radius:14px;border:1px solid var(--line,#23304a);background:linear-gradient(180deg,rgba(34,211,238,.07),rgba(129,140,248,.05));overflow:hidden;aspect-ratio:200/140}`,
      `#${domId} .pg-ws-scene svg{display:block}`,
      `#${domId} .pg-ws-controls{display:flex;flex-wrap:wrap;gap:.5rem;margin-top:.7rem}`,
      `#${domId} .pg-ws-btn{flex:1 1 auto;min-width:84px;padding:.5rem .8rem;border-radius:10px;border:1px solid var(--line,#23304a);background:rgba(140,160,200,.06);color:var(--ink-dim,#cdd6e6);font:inherit;font-weight:600;cursor:pointer;transition:border-color .2s,background .2s,color .2s}`,
      `#${domId} .pg-ws-btn:hover{border-color:#22d3ee88}`,
      `#${domId} .pg-ws-btn[aria-pressed=true]{background:rgba(34,211,238,.14);border-color:#22d3ee;color:var(--ink,#e9eef8)}`,
      `#${domId} .pg-ws-caption{margin-top:.6rem;color:var(--ink-dim,#cdd6e6);font-size:.92rem;opacity:.9}`,
      // animations — only active when NOT reduced (the .pg-ws-reduce class strips them)
      `@keyframes pg-ws-spin{to{transform:rotate(360deg)}}`,
      `@keyframes pg-ws-fall{from{transform:translateY(-14px);opacity:0}10%{opacity:1}to{transform:translateY(60px);opacity:0}}`,
      `@keyframes pg-ws-flash{0%,72%,100%{opacity:0}74%,82%{opacity:1}}`,
      `#${domId} .pg-ws-rays{transform-box:fill-box;transform-origin:center;animation:pg-ws-spin 28s linear infinite}`,
      `#${domId} .pg-ws-drop{animation:pg-ws-fall 1.1s linear infinite}`,
      `#${domId} .pg-ws-flake{animation:pg-ws-fall 2.6s linear infinite}`,
      `#${domId} .pg-ws-bolt{animation:pg-ws-flash 2.4s ease-in-out infinite}`,
      `#${domId}.pg-ws-reduce .pg-ws-rays,#${domId}.pg-ws-reduce .pg-ws-drop,#${domId}.pg-ws-reduce .pg-ws-flake,#${domId}.pg-ws-reduce .pg-ws-bolt{animation:none}`,
      `#${domId}.pg-ws-reduce .pg-ws-bolt{opacity:1}`,
    ].join('\n');

    const jsBody = `
var NS='http://www.w3.org/2000/svg';
var LABELS=${JSON.stringify(LABELS)};
var svg=$('[data-role=svg]');
var btns=$$('[data-role=btn]');
if(!svg||!btns.length)return;
if(reduced)root.classList.add('pg-ws-reduce');

function el(name,attrs,cls){
  var n=document.createElementNS(NS,name);
  if(attrs)for(var k in attrs)n.setAttribute(k,attrs[k]);
  if(cls)n.setAttribute('class',cls);
  return n;
}
function clear(){ while(svg.firstChild)svg.removeChild(svg.firstChild); }
// a soft grey cloud centred near (cx,cy)
function cloud(cx,cy){
  var g=el('g');
  var fill='#cdd6e6';
  [[cx-22,cy+6,16],[cx,cy-6,22],[cx+24,cy+4,17],[cx+2,cy+10,30]].forEach(function(c){
    g.appendChild(el('circle',{cx:c[0],cy:c[1],r:c[2],fill:fill}));
  });
  g.appendChild(el('rect',{x:cx-30,y:cy+4,width:64,height:18,rx:9,fill:fill}));
  return g;
}

function drawSunny(){
  var g=el('g');
  var rays=el('g',{},'pg-ws-rays');
  for(var i=0;i<12;i++){
    var a=i*30*Math.PI/180;
    var x1=100+Math.cos(a)*30, y1=64+Math.sin(a)*30;
    var x2=100+Math.cos(a)*44, y2=64+Math.sin(a)*44;
    rays.appendChild(el('line',{x1:x1,y1:y1,x2:x2,y2:y2,stroke:'#fbbf24','stroke-width':3,'stroke-linecap':'round'}));
  }
  g.appendChild(rays);
  g.appendChild(el('circle',{cx:100,cy:64,r:24,fill:'#fbbf24'}));
  svg.appendChild(g);
}
function drawCloudy(){
  svg.appendChild(cloud(70,46));
  var c2=cloud(118,70); c2.setAttribute('opacity','.82');
  svg.appendChild(c2);
}
function drawRainy(){
  svg.appendChild(cloud(100,40));
  var rain=el('g');
  for(var i=0;i<7;i++){
    var x=64+i*12;
    var d=el('line',{x1:x,y1:64,x2:x-4,y2:74,stroke:'#22d3ee','stroke-width':2.5,'stroke-linecap':'round'},'pg-ws-drop');
    d.style.animationDelay=(i*0.13)+'s';
    rain.appendChild(d);
  }
  svg.appendChild(rain);
}
function drawStormy(){
  var c=cloud(100,40);
  Array.prototype.forEach.call(c.childNodes,function(n){ if(n.setAttribute)n.setAttribute('fill','#9aa6bd'); });
  svg.appendChild(c);
  var bolt=el('polygon',{points:'100,60 90,86 99,86 92,108 114,78 103,78 110,60',fill:'#fbbf24',stroke:'#fff7d6','stroke-width':1},'pg-ws-bolt');
  svg.appendChild(bolt);
}
function drawSnowy(){
  svg.appendChild(cloud(100,40));
  var snow=el('g');
  for(var i=0;i<7;i++){
    var x=64+i*12;
    var f=el('circle',{cx:x,cy:64,r:3,fill:'#e9eef8'},'pg-ws-flake');
    f.style.animationDelay=(i*0.32)+'s';
    snow.appendChild(f);
  }
  svg.appendChild(snow);
}
var DRAW={sunny:drawSunny,cloudy:drawCloudy,rainy:drawRainy,stormy:drawStormy,snowy:drawSnowy};

function show(cond){
  clear();
  (DRAW[cond]||drawSunny)();
  svg.setAttribute('aria-label',(LABELS[cond]||cond)+' weather');
  btns.forEach(function(b){
    b.setAttribute('aria-pressed', b.getAttribute('data-cond')===cond ? 'true':'false');
  });
}

btns.forEach(function(b){
  b.addEventListener('click',function(){ show(b.getAttribute('data-cond')); });
});
show(btns[0].getAttribute('data-cond'));
`;

    return { html, css, jsBody };
  },
};
