/* Family: chart-data — render a small dataset as a hand-drawn SVG bar or line chart
   with axis labels. Hovering or tapping a bar / point shows its label + value in a
   readout. No external charting library: bars are <rect>s, the line is a <polyline>
   with <circle> points, the y-axis is scaled to the data max. Keyboard users can tab
   to each point (focusable) to read its value. Models a simple data explainer where
   the figures themselves are the argument. Reduced-motion: no entrance animation. */
import { esc } from './index.js';

const pointSchema = {
  type: 'object', additionalProperties: false,
  required: ['label', 'value'],
  properties: {
    label: { type: 'string', title: 'X-axis label for this point' },
    value: { type: 'number', title: 'Y value' },
  },
};

export default {
  id: 'chart-data',
  name: 'Chart (data)',
  category: 'quantitative',
  description: 'A small dataset drawn as an SVG bar or line chart with axis labels — hover or tap a point to read its value. No external libraries.',
  paramsSchema: {
    type: 'object', additionalProperties: false,
    required: ['data'],
    properties: {
      title: { type: 'string', title: 'Optional label above the chart' },
      kind: { type: 'string', enum: ['bar', 'line'], default: 'bar' },
      xLabel: { type: 'string', title: 'Optional x-axis label' },
      yLabel: { type: 'string', title: 'Optional y-axis label' },
      unit: { type: 'string', title: 'Optional unit suffix on values', default: '' },
      data: { type: 'array', minItems: 2, maxItems: 12, items: pointSchema },
    },
  },
  presets: [
    {
      name: 'Bar chart',
      params: {
        title: 'Cases by region',
        kind: 'bar',
        xLabel: 'Region',
        yLabel: 'Cases',
        unit: '',
        data: [
          { label: 'North', value: 42 },
          { label: 'East', value: 58 },
          { label: 'South', value: 35 },
          { label: 'West', value: 64 },
          { label: 'Central', value: 49 },
        ],
      },
    },
    {
      name: 'Line trend',
      params: {
        title: 'Range of movement over rehab',
        kind: 'line',
        xLabel: 'Week',
        yLabel: 'Degrees',
        unit: '°',
        data: [
          { label: 'Wk 1', value: 40 },
          { label: 'Wk 2', value: 65 },
          { label: 'Wk 3', value: 90 },
          { label: 'Wk 4', value: 110 },
          { label: 'Wk 6', value: 135 },
          { label: 'Wk 8', value: 155 },
        ],
      },
    },
  ],
  build(params, domId) {
    const kind = params.kind === 'line' ? 'line' : 'bar';
    const title = params.title ? `<div class="pg-ch-title">${esc(params.title)}</div>` : '';
    const xLabel = params.xLabel ? `<div class="pg-ch-xlabel">${esc(params.xLabel)}</div>` : '';
    const yLabel = params.yLabel
      ? `<text class="pg-ch-ylabel" x="14" y="20" fill="#717d99" font-size="11" transform="rotate(-90 14 20)" text-anchor="end">${esc(params.yLabel)}</text>`
      : '';
    const html =
      `<div class="pg-stage">${title}` +
      `<svg viewBox="0 0 380 230" role="img" aria-label="${esc((params.title || 'Data') + ' chart')}" class="pg-ch-svg">` +
      `<line x1="44" y1="200" x2="364" y2="200" stroke="#3a4866"/>` +
      `<line x1="44" y1="14" x2="44" y2="200" stroke="#3a4866"/>` +
      `<g data-role="gridlabels"></g>` +
      yLabel +
      `<g data-role="plot"></g>` +
      `<g data-role="xticks"></g>` +
      `</svg>${xLabel}` +
      `<div class="pg-readout pg-ch-readout" data-role="readout" aria-live="polite">Hover or tap a point to read its value.</div>` +
      `</div>`;
    const css = [
      `#${domId} .pg-ch-title{font-size:.9rem;color:var(--ink-dim,#9fb3c8);margin:0 0 .7rem}`,
      `#${domId} .pg-ch-svg{width:100%;height:auto;display:block}`,
      `#${domId} .pg-ch-xlabel{font-size:.78rem;color:var(--ink-faint,#717d99);text-align:center;margin:.3rem 0 0}`,
      `#${domId} .pg-ch-bar{fill:var(--cyan,#22d3ee);cursor:pointer;transition:fill .15s}`,
      `#${domId} .pg-ch-bar:hover,#${domId} .pg-ch-bar:focus{fill:#2dd4bf;outline:none}`,
      `#${domId} .pg-ch-line{fill:none;stroke:var(--cyan,#22d3ee);stroke-width:2.4}`,
      `#${domId} .pg-ch-dot{fill:#2dd4bf;stroke:#04060c;stroke-width:2;cursor:pointer;transition:r .15s}`,
      `#${domId} .pg-ch-dot:hover,#${domId} .pg-ch-dot:focus{fill:#818cf8;outline:none}`,
      `#${domId} .pg-ch-xt{fill:var(--ink-faint,#717d99);font-size:9px}`,
      `#${domId} .pg-ch-gl{fill:var(--ink-faint,#717d99);font-size:9px}`,
      `#${domId} .pg-ch-readout{margin-top:.7rem;color:var(--ink-dim,#9fb3c8)}`,
      `#${domId} .pg-ch-readout b{color:#fff}`,
      `@media(max-width:620px){#${domId} .pg-ch-xt{font-size:8px}}`,
    ].join('\n');
    const jsBody = `
var E=function(s){return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');};
var data=(CONFIG.data||[]).slice(0,12).filter(function(d){return d&&typeof d.value==='number'&&isFinite(d.value);});
var n=data.length;
if(!n)return;
var kind=CONFIG.kind==='line'?'line':'bar';
var unit=CONFIG.unit||'';
var plot=$('[data-role=plot]'),xticks=$('[data-role=xticks]'),grid=$('[data-role=gridlabels]'),readout=$('[data-role=readout]');
if(!plot)return;
var NS='http://www.w3.org/2000/svg';
var x0=44,x1=364,yTop=14,yBot=200;
var vals=data.map(function(d){return d.value;});
var maxV=Math.max.apply(null,vals),minV=Math.min.apply(null,vals);
if(kind==='bar'){minV=Math.min(0,minV);}
if(maxV===minV){maxV=minV+1;}
function ny(v){return yBot-((v-minV)/(maxV-minV))*(yBot-yTop);}
function fmt(v){var r=Math.round(v*100)/100;return (r%1===0?String(r):String(r))+unit;}
function show(d){if(readout)readout.innerHTML=E(d.label)+': <b>'+E(fmt(d.value))+'</b>';}
function clear(){if(readout)readout.textContent='Hover or tap a point to read its value.';}
// y-axis gridline labels (min / mid / max)
if(grid){
  var g='';var mid=(minV+maxV)/2;
  [maxV,mid,minV].forEach(function(v){
    var y=ny(v);
    g+='<line x1="44" y1="'+y.toFixed(1)+'" x2="364" y2="'+y.toFixed(1)+'" stroke="#23304a" stroke-dasharray="2 4"/>';
    g+='<text class="pg-ch-gl" x="40" y="'+(y+3).toFixed(1)+'" text-anchor="end">'+E(fmt(v))+'</text>';
  });
  grid.innerHTML=g;
}
// x positions
var span=x1-x0;
function cx(i){return n===1?(x0+span/2):(x0+(i/(n-1))*span);}
function bandCx(i){var bw=span/n;return x0+bw*i+bw/2;}
// x tick labels
if(xticks){
  var xt='';data.forEach(function(d,i){
    var x=(kind==='bar')?bandCx(i):cx(i);
    xt+='<text class="pg-ch-xt" x="'+x.toFixed(1)+'" y="214" text-anchor="middle">'+E(d.label)+'</text>';
  });
  xticks.innerHTML=xt;
}
plot.innerHTML='';
function focusable(el,d){
  el.setAttribute('tabindex','0');
  el.setAttribute('role','img');
  el.setAttribute('aria-label',d.label+': '+fmt(d.value));
  el.addEventListener('mouseenter',function(){show(d);});
  el.addEventListener('mouseleave',clear);
  el.addEventListener('focus',function(){show(d);});
  el.addEventListener('blur',clear);
  el.addEventListener('click',function(){show(d);});
  el.addEventListener('touchstart',function(){show(d);},{passive:true});
}
if(kind==='bar'){
  var bw=span/n,zeroY=ny(Math.max(0,minV)<=0?0:minV);
  var baseY=ny(minV<0?0:minV);
  data.forEach(function(d,i){
    var bx=x0+bw*i+bw*0.18,w=bw*0.64;
    var top=ny(d.value);
    var by=Math.min(top,baseY),h=Math.abs(baseY-top);
    var rect=document.createElementNS(NS,'rect');
    rect.setAttribute('class','pg-ch-bar');
    rect.setAttribute('x',bx.toFixed(1));
    rect.setAttribute('y',by.toFixed(1));
    rect.setAttribute('width',w.toFixed(1));
    rect.setAttribute('height',Math.max(0,h).toFixed(1));
    rect.setAttribute('rx','2');
    focusable(rect,d);
    plot.appendChild(rect);
  });
}else{
  var pts=data.map(function(d,i){return cx(i).toFixed(1)+','+ny(d.value).toFixed(1);}).join(' ');
  var pl=document.createElementNS(NS,'polyline');
  pl.setAttribute('class','pg-ch-line');
  pl.setAttribute('points',pts);
  plot.appendChild(pl);
  data.forEach(function(d,i){
    var c=document.createElementNS(NS,'circle');
    c.setAttribute('class','pg-ch-dot');
    c.setAttribute('cx',cx(i).toFixed(1));
    c.setAttribute('cy',ny(d.value).toFixed(1));
    c.setAttribute('r','4.5');
    focusable(c,d);
    plot.appendChild(c);
  });
}
`;
    return { html, css, jsBody };
  },
};
