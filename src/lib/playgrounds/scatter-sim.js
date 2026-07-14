/* Family: scatter simulator — a button repeatedly draws random samples and plots
   them as dots against a threshold line, tracking a running count of total draws,
   how many crossed the threshold ("hits"), and the smallest value seen. Models the
   shipped p-hacking simulator: keep clicking and watch how often a "significant"
   result appears purely by chance. Math.random drives the draws (client-side at view
   time — determinism is not needed). Honours reduced-motion: dots are placed without
   any entrance animation. */
import { esc } from './index.js';

export default {
  id: 'scatter-sim',
  name: 'Scatter simulator',
  category: 'quantitative',
  description: 'A button repeatedly draws random samples, plots dots against a threshold, and counts how many cross it. For chance / rare-event explainers.',
  paramsSchema: {
    type: 'object', additionalProperties: false,
    required: ['threshold'],
    properties: {
      title: { type: 'string', title: 'Optional label above the plot' },
      runLabel: { type: 'string', title: 'Draw-button label', default: 'Run once' },
      resetLabel: { type: 'string', title: 'Reset-button label', default: 'Reset' },
      threshold: { type: 'number', title: 'Threshold 0..1 (the line dots are compared against)' },
      thresholdLabel: { type: 'string', title: 'Label for the threshold line' },
      sampleKind: { type: 'string', title: 'Sample distribution', enum: ['uniform', 'normal'], default: 'uniform' },
      hitLabel: { type: 'string', title: 'Word for a crossing draw', default: 'hits' },
      caption: { type: 'string', title: 'One-line caption under the readouts' },
    },
  },
  presets: [
    {
      name: 'p-hacking (p<0.05)',
      params: {
        title: 'Keep testing and something will "work"',
        runLabel: 'Run a test',
        resetLabel: 'Reset',
        threshold: 0.05,
        thresholdLabel: 'p = 0.05',
        sampleKind: 'uniform',
        hitLabel: 'significant',
        caption: 'No real effect — each test is pure noise. About 1 in 20 still lands below the line.',
      },
    },
    {
      name: 'rare-event counter',
      params: {
        title: 'How often does the rare thing happen?',
        runLabel: 'Sample',
        resetLabel: 'Clear',
        threshold: 0.1,
        thresholdLabel: '10% cut-off',
        sampleKind: 'normal',
        hitLabel: 'rare events',
        caption: 'Most draws cluster mid-range; only the occasional sample dips into the tail.',
      },
    },
  ],
  build(params, domId) {
    const title = params.title ? `<div class="pg-sc-title">${esc(params.title)}</div>` : '';
    const runLabel = esc(params.runLabel || 'Run once');
    const resetLabel = esc(params.resetLabel || 'Reset');
    const caption = params.caption ? `<div class="pg-readout pg-sc-caption" data-role="caption"></div>` : '';
    const plot =
      `<svg viewBox="0 0 360 220" role="img" aria-label="Scatter of random samples plotted against a threshold line" class="pg-sc-plot">` +
      `<line x1="40" y1="190" x2="340" y2="190" stroke="#3a4866"/><line x1="40" y1="20" x2="40" y2="190" stroke="#3a4866"/>` +
      `<text x="14" y="20" fill="#717d99" font-size="10" transform="rotate(-90 14 20)" text-anchor="end">value →</text>` +
      `<line data-role="threshold" x1="40" y1="190" x2="340" y2="190" stroke="#f472b6" stroke-width="1.6" stroke-dasharray="4 4"/>` +
      `<text data-role="thresholdlabel" x="340" y="0" fill="#f472b6" font-size="10" text-anchor="end"></text>` +
      `<g data-role="dots"></g></svg>`;
    const html =
      `<div class="pg-stage">${title}${plot}` +
      `<div class="pg-sc-readouts">` +
      `<div class="pg-readout">total <b data-role="total">0</b></div>` +
      `<div class="pg-readout"><b data-role="hitname"></b> <b data-role="hits">0</b></div>` +
      `<div class="pg-readout">smallest <b data-role="min">–</b></div>` +
      `</div>${caption}` +
      `<div class="pg-controls pg-sc-controls" role="group" aria-label="Run the simulation">` +
      `<button type="button" data-role="run" class="pg-sc-btn pg-sc-run">${runLabel}</button>` +
      `<button type="button" data-role="reset" class="pg-sc-btn">${resetLabel}</button>` +
      `</div></div>`;
    const css = [
      `#${domId} .pg-sc-title{font-size:.9rem;color:var(--ink-dim,#9fb3c8);margin:0 0 .7rem}`,
      `#${domId} .pg-sc-plot{width:100%;height:auto;display:block}`,
      `#${domId} .pg-sc-readouts{display:flex;flex-wrap:wrap;gap:.6rem 1.4rem;margin:.7rem 0 .2rem}`,
      `#${domId} .pg-sc-readouts b{color:#fff}`,
      `#${domId} .pg-sc-caption{color:var(--ink-dim,#9fb3c8);margin:.2rem 0 0}`,
      `#${domId} .pg-sc-controls{display:flex;gap:.5rem;margin-top:1rem}`,
      `#${domId} .pg-sc-btn{appearance:none;background:transparent;border:1px solid var(--line,#23304a);border-radius:8px;padding:.5rem 1.1rem;color:var(--ink-dim,#9fb3c8);font:inherit;cursor:pointer;transition:.2s}`,
      `#${domId} .pg-sc-btn:hover{border-color:#22d3ee;color:#22d3ee}`,
      `#${domId} .pg-sc-run{border-color:#22d3ee;color:#22d3ee}`,
      `@media(max-width:620px){#${domId} .pg-sc-readouts{flex-direction:column;gap:.4rem}#${domId} .pg-sc-controls{flex-direction:column}}`,
    ].join('\n');
    const jsBody = `
var thr=(typeof CONFIG.threshold==='number')?CONFIG.threshold:0.5;
if(thr<0)thr=0;if(thr>1)thr=1;
var kind=CONFIG.sampleKind==='normal'?'normal':'uniform';
var run=$('[data-role=run]'),reset=$('[data-role=reset]'),dots=$('[data-role=dots]');
var totalEl=$('[data-role=total]'),hitsEl=$('[data-role=hits]'),minEl=$('[data-role=min]'),hitName=$('[data-role=hitname]'),capEl=$('[data-role=caption]');
var thrLine=$('[data-role=threshold]'),thrLabel=$('[data-role=thresholdlabel]');
if(!run)return;
function cl(x){return x<0?0:x>1?1:x;}
function px(i){var col=i%26;return 50+col*11;}
function row(i){return Math.floor(i/26);}
function py(v){return 190-cl(v)*170;}
var thrY=py(thr);
if(thrLine){thrLine.setAttribute('y1',thrY.toFixed(1));thrLine.setAttribute('y2',thrY.toFixed(1));}
if(thrLabel){thrLabel.setAttribute('y',(thrY-4).toFixed(1));thrLabel.textContent=CONFIG.thresholdLabel||('threshold '+thr);}
if(hitName)hitName.textContent=CONFIG.hitLabel||'hits';
if(capEl)capEl.textContent=CONFIG.caption||'';
function draw(){
  if(kind==='normal'){var u1=Math.random()||1e-9,u2=Math.random();var z=Math.sqrt(-2*Math.log(u1))*Math.cos(2*Math.PI*u2);return cl(0.5+z/6);}
  return Math.random();
}
var total=0,hits=0,minSeen=null;
var NS='http://www.w3.org/2000/svg';
function plot(v){
  if(!dots)return;
  var i=total-1;var cx=px(i),cy=py(v),r=row(i);
  var c=document.createElementNS(NS,'circle');
  c.setAttribute('cx',(cx+(r%2?5:0)).toFixed(1));
  c.setAttribute('cy',cy.toFixed(1));
  c.setAttribute('r','3.4');
  var hit=v<=thr;
  c.setAttribute('fill',hit?'#f472b6':'#2dd4bf');
  c.setAttribute('opacity', reduced?'0.95':'0');
  dots.appendChild(c);
  if(!reduced){c.style.transition='opacity .3s';requestAnimationFrame(function(){c.setAttribute('opacity','0.95');});}
}
function once(){
  var v=draw();total++;
  if(v<=thr)hits++;
  if(minSeen==null||v<minSeen)minSeen=v;
  plot(v);
  if(totalEl)totalEl.textContent=String(total);
  if(hitsEl)hitsEl.textContent=String(hits);
  if(minEl)minEl.textContent=(minSeen==null?'–':minSeen.toFixed(3));
}
run.addEventListener('click',once);
if(reset)reset.addEventListener('click',function(){
  total=0;hits=0;minSeen=null;
  if(dots)dots.innerHTML='';
  if(totalEl)totalEl.textContent='0';
  if(hitsEl)hitsEl.textContent='0';
  if(minEl)minEl.textContent='–';
});
`;
    return { html, css, jsBody };
  },
};
