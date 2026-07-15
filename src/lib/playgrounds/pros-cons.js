import { esc } from './index.js';

export default {
  id: 'pros-cons',
  name: 'Pros & cons',
  category: 'comparison',
  description: 'Weigh a decision — tick the points that matter to you and see which side wins.',
  paramsSchema: {
    type: 'object', additionalProperties: false, required: ['pros', 'cons'],
    properties: {
      title: { type: 'string' },
      subject: { type: 'string' },
      pros: {
        type: 'array', minItems: 1, maxItems: 8,
        items: { type: 'string' },
      },
      cons: {
        type: 'array', minItems: 1, maxItems: 8,
        items: { type: 'string' },
      },
      caption: { type: 'string' },
    },
  },
  presets: [
    { name: 'Should I get a dog?', params: {
      title: 'Should I get a dog?',
      subject: 'Getting a dog',
      pros: ['Unconditional love', 'Forces you outside', 'Great company'],
      cons: ['Tied down', 'Cost', 'Hair everywhere', 'Early walks'],
    } },
    { name: 'Remote vs office', params: {
      title: 'Remote vs office',
      subject: 'Working from home',
      pros: ['No commute', 'Comfort', 'Focus'],
      cons: ['Lonely', 'Blurred boundaries', 'Fewer chance chats'],
      caption: 'Tick what rings true for you.',
    } },
  ],
  build(params, domId) {
    const clean = (arr) => (Array.isArray(arr) ? arr : [])
      .filter((s) => typeof s === 'string' && s.trim())
      .slice(0, 8);
    const pros = clean(params.pros);
    const cons = clean(params.cons);

    const title = params.title ? `<div class="pg-pc-title">${esc(params.title)}</div>` : '';
    const subject = params.subject
      ? `<div class="pg-pc-subject">${esc(params.subject)}</div>` : '';
    const caption = params.caption
      ? `<div class="pg-pc-caption">${esc(params.caption)}</div>` : '';

    const point = (side, label, i) =>
      `<button type="button" class="pg-pc-point" data-role="point" data-side="${side}" data-i="${i}" aria-pressed="false">` +
        `<span class="pg-pc-tick" aria-hidden="true"></span>` +
        `<span class="pg-pc-label">${esc(label)}</span>` +
      `</button>`;

    const prosHtml = pros.map((p, i) => point('pro', p, i)).join('');
    const consHtml = cons.map((c, i) => point('con', c, i)).join('');

    const html =
      `<div class="pg-stage">` +
        title +
        subject +
        `<div class="pg-pc-cols">` +
          `<div class="pg-pc-col pg-pc-col-pro">` +
            `<div class="pg-pc-head">Pros</div>` +
            `<div class="pg-pc-list">${prosHtml}</div>` +
          `</div>` +
          `<div class="pg-pc-col pg-pc-col-con">` +
            `<div class="pg-pc-head">Cons</div>` +
            `<div class="pg-pc-list">${consHtml}</div>` +
          `</div>` +
        `</div>` +
        `<div class="pg-pc-balance" role="img" aria-label="Balance of ticked points">` +
          `<span class="pg-pc-bar pg-pc-bar-pro" data-role="bar-pro" style="width:50%"></span>` +
          `<span class="pg-pc-bar pg-pc-bar-con" data-role="bar-con" style="width:50%"></span>` +
        `</div>` +
        `<div class="pg-pc-foot">` +
          `<span class="pg-readout pg-pc-tally" data-role="tally">0 pros &middot; 0 cons</span>` +
          `<span class="pg-pc-verdict" data-role="verdict">Too close to call</span>` +
        `</div>` +
        caption +
      `</div>`;

    const css = [
      `#${domId} .pg-pc-title{font-weight:700;font-size:1.05rem;color:var(--ink,#e9eef8);margin-bottom:.2rem}`,
      `#${domId} .pg-pc-subject{font-size:.9rem;color:var(--ink-dim,#8b97ac);margin-bottom:.8rem}`,
      `#${domId} .pg-pc-cols{display:grid;grid-template-columns:1fr;gap:.7rem}`,
      `@media(min-width:520px){#${domId} .pg-pc-cols{grid-template-columns:1fr 1fr}}`,
      `#${domId} .pg-pc-head{font-weight:700;font-size:.78rem;letter-spacing:.06em;text-transform:uppercase;margin-bottom:.5rem}`,
      `#${domId} .pg-pc-col-pro .pg-pc-head{color:#2dd4bf}`,
      `#${domId} .pg-pc-col-con .pg-pc-head{color:#f472b6}`,
      `#${domId} .pg-pc-list{display:flex;flex-direction:column;gap:.4rem}`,
      `#${domId} .pg-pc-point{display:flex;align-items:center;gap:.6rem;width:100%;text-align:left;font:inherit;cursor:pointer;padding:.5rem .65rem;border-radius:10px;border:1px solid var(--line,#23304a);background:rgba(140,160,200,.05);color:var(--ink,#e9eef8)}`,
      `#${domId} .pg-pc-point:hover{border-color:#22d3ee66}`,
      `#${domId} .pg-pc-point:focus-visible{outline:2px solid #22d3ee;outline-offset:2px}`,
      `#${domId} .pg-pc-tick{flex:0 0 auto;width:20px;height:20px;border-radius:6px;border:1px solid #3a4865;background:rgba(140,160,200,.12);position:relative;transition:background .2s,border-color .2s}`,
      `#${domId} .pg-pc-tick::after{content:"";position:absolute;left:6px;top:2px;width:5px;height:10px;border:solid #04060c;border-width:0 2px 2px 0;transform:rotate(45deg) scale(0);opacity:0;transition:transform .15s,opacity .15s}`,
      `#${domId} .pg-pc-label{flex:1 1 auto;min-width:0}`,
      `#${domId} .pg-pc-col-pro .pg-pc-point.on{border-color:#2dd4bf66;background:rgba(45,212,191,.1)}`,
      `#${domId} .pg-pc-col-pro .pg-pc-point.on .pg-pc-tick{background:#2dd4bf;border-color:#2dd4bf}`,
      `#${domId} .pg-pc-col-con .pg-pc-point.on{border-color:#f472b666;background:rgba(244,114,182,.1)}`,
      `#${domId} .pg-pc-col-con .pg-pc-point.on .pg-pc-tick{background:#f472b6;border-color:#f472b6}`,
      `#${domId} .pg-pc-point.on .pg-pc-tick::after{transform:rotate(45deg) scale(1);opacity:1}`,
      `#${domId} .pg-pc-balance{display:flex;height:14px;margin-top:1rem;border-radius:99px;overflow:hidden;border:1px solid var(--line,#23304a);background:rgba(140,160,200,.08)}`,
      `#${domId} .pg-pc-bar{display:block;height:100%;transition:width .35s ease}`,
      `#${domId} .pg-pc-bar-pro{background:linear-gradient(90deg,#2dd4bf,#22d3ee)}`,
      `#${domId} .pg-pc-bar-con{background:linear-gradient(90deg,#818cf8,#f472b6)}`,
      `#${domId} .pg-pc-foot{display:flex;align-items:center;justify-content:space-between;gap:.8rem;margin-top:.7rem;flex-wrap:wrap}`,
      `#${domId} .pg-pc-tally{font-variant-numeric:tabular-nums;font-size:.85rem;color:var(--ink-dim,#8b97ac)}`,
      `#${domId} .pg-pc-verdict{font-weight:700;color:var(--ink,#e9eef8)}`,
      `#${domId} .pg-pc-verdict.lean-pro{color:#2dd4bf}`,
      `#${domId} .pg-pc-verdict.lean-con{color:#f472b6}`,
      `#${domId} .pg-pc-caption{margin-top:.7rem;font-size:.85rem;color:var(--ink-dim,#8b97ac)}`,
      `#${domId}.pg-pc-reduce .pg-pc-bar,#${domId}.pg-pc-reduce .pg-pc-tick,#${domId}.pg-pc-reduce .pg-pc-tick::after{transition:none}`,
    ].join('\n');

    const jsBody = `
if(reduced)root.classList.add('pg-pc-reduce');
var points=$$('[data-role=point]');
if(!points.length)return;
var barPro=$('[data-role=bar-pro]');
var barCon=$('[data-role=bar-con]');
var tally=$('[data-role=tally]');
var verdict=$('[data-role=verdict]');
function refresh(){
  var p=0,c=0;
  points.forEach(function(b){
    if(!b.classList.contains('on'))return;
    if(b.getAttribute('data-side')==='pro')p++;else c++;
  });
  var sum=p+c;
  var pPct=sum?Math.round((p/sum)*100):50;
  if(barPro)barPro.style.width=pPct+'%';
  if(barCon)barCon.style.width=(sum?100-pPct:50)+'%';
  if(tally)tally.innerHTML=p+' pro'+(p===1?'':'s')+' &middot; '+c+' con'+(c===1?'':'s');
  if(verdict){
    var v='Too close to call',cls='';
    if(p>c){v='Leaning yes';cls='lean-pro';}
    else if(c>p){v='Leaning no';cls='lean-con';}
    verdict.textContent=v;
    verdict.className='pg-pc-verdict'+(cls?' '+cls:'');
  }
}
points.forEach(function(b){
  b.addEventListener('click',function(){
    var on=b.classList.toggle('on');
    b.setAttribute('aria-pressed',on?'true':'false');
    refresh();
  });
});
refresh();
`;

    return { html, css, jsBody };
  },
};
