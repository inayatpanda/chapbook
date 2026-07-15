import { esc } from './index.js';

export default {
  id: 'decision-tree',
  name: 'Decision flow',
  category: 'diagram',
  description: 'Answer a few questions and follow the branches to an outcome.',
  paramsSchema: {
    type: 'object',
    additionalProperties: false,
    required: ['start', 'nodes'],
    properties: {
      title: { type: 'string' },
      caption: { type: 'string' },
      start: { type: 'string' },
      nodes: {
        type: 'object',
        additionalProperties: {
          type: 'object',
          additionalProperties: false,
          properties: {
            q: { type: 'string' },
            outcome: { type: 'string' },
            options: {
              type: 'array',
              items: {
                type: 'object',
                additionalProperties: false,
                required: ['label', 'to'],
                properties: {
                  label: { type: 'string' },
                  to: { type: 'string' },
                },
              },
            },
          },
        },
      },
    },
  },
  presets: [
    {
      name: 'Should you send that text?',
      params: {
        title: 'Should you send that text?',
        start: 'q1',
        nodes: {
          q1: { q: 'Is it after midnight?', options: [{ label: 'Yes', to: 'q2' }, { label: 'No', to: 'q3' }] },
          q2: { q: 'Have you had a drink?', options: [{ label: 'Yes', to: 'no' }, { label: 'No', to: 'q3' }] },
          q3: { q: 'Would you be happy to read it aloud to them tomorrow?', options: [{ label: 'Yes', to: 'yes' }, { label: 'No', to: 'no' }] },
          yes: { outcome: 'Send it. 📨' },
          no: { outcome: 'Sleep on it. Draft it, don’t send it.' },
        },
        caption: 'Not legal advice. Or relationship advice.',
      },
    },
    {
      name: 'What to cook',
      params: {
        title: 'What to cook',
        start: 'q1',
        nodes: {
          q1: { q: 'Got more than 20 minutes?', options: [{ label: 'Yes', to: 'q2' }, { label: 'No', to: 'fast' }] },
          q2: { q: 'Feeling fancy?', options: [{ label: 'Yes', to: 'fancy' }, { label: 'No', to: 'comfort' }] },
          fast: { outcome: 'Beans on toast. No notes.' },
          comfort: { outcome: 'Pasta. Always pasta.' },
          fancy: { outcome: 'Attempt the risotto. Stir with intent.' },
        },
      },
    },
  ],
  build(params, domId) {
    const title = params.title ? `<div class="pg-dt-title">${esc(params.title)}</div>` : '';
    const caption = params.caption ? `<div class="pg-dt-caption">${esc(params.caption)}</div>` : '';
    const nodes = (params.nodes && typeof params.nodes === 'object') ? params.nodes : {};
    const start = typeof params.start === 'string' ? params.start : '';

    const html =
      `<div class="pg-stage">` +
        title +
        `<div class="pg-dt-crumbs" data-role="crumbs" aria-live="polite"></div>` +
        `<div class="pg-dt-card" data-role="card"></div>` +
        `<div class="pg-dt-actions">` +
          `<button type="button" class="pg-dt-restart" data-role="restart" hidden>Start over</button>` +
        `</div>` +
        caption +
      `</div>`;

    const css = [
      `#${domId} .pg-dt-title{font-weight:700;font-size:1.05rem;margin-bottom:.6rem;color:var(--ink,#e9eef8)}`,
      `#${domId} .pg-dt-crumbs{display:flex;flex-wrap:wrap;gap:.35rem;margin-bottom:.7rem;min-height:1.1rem;font-size:.78rem;color:var(--ink-dim,#9fb0c8)}`,
      `#${domId} .pg-dt-crumb{display:inline-flex;align-items:center;gap:.35rem}`,
      `#${domId} .pg-dt-crumb:not(:last-child)::after{content:'›';color:#5b6b88;margin-left:.35rem}`,
      `#${domId} .pg-dt-crumb b{color:#22d3ee;font-weight:600}`,
      `#${domId} .pg-dt-card{border:1px solid var(--line,#23304a);border-radius:14px;padding:1.1rem;background:rgba(140,160,200,.05)}`,
      `#${domId} .pg-dt-q{font-weight:600;font-size:1.05rem;color:var(--ink,#e9eef8);margin-bottom:.85rem}`,
      `#${domId} .pg-dt-opts{display:flex;flex-wrap:wrap;gap:.55rem}`,
      `#${domId} .pg-dt-opt{font:inherit;cursor:pointer;border:1px solid #2dd4bf66;background:rgba(45,212,191,.08);color:var(--ink,#e9eef8);padding:.5rem .9rem;border-radius:999px;transition:background .15s,border-color .15s,transform .08s}`,
      `#${domId} .pg-dt-opt:hover{background:rgba(45,212,191,.18);border-color:#2dd4bf}`,
      `#${domId} .pg-dt-opt:active{transform:translateY(1px)}`,
      `#${domId} .pg-dt-outcome{font-weight:700;font-size:1.25rem;line-height:1.35;color:#fff;text-shadow:0 0 18px rgba(129,140,248,.4)}`,
      `#${domId} .pg-dt-outcome .pg-dt-flag{display:block;font-size:.72rem;font-weight:600;letter-spacing:.08em;text-transform:uppercase;color:#818cf8;margin-bottom:.5rem}`,
      `#${domId} .pg-dt-err{color:#f472b6;font-weight:600}`,
      `#${domId} .pg-dt-actions{margin-top:.8rem}`,
      `#${domId} .pg-dt-restart{font:inherit;cursor:pointer;border:1px solid var(--line,#23304a);background:transparent;color:var(--ink-dim,#9fb0c8);padding:.4rem .8rem;border-radius:8px;transition:color .15s,border-color .15s}`,
      `#${domId} .pg-dt-restart:hover{color:#22d3ee;border-color:#22d3ee66}`,
    ].join('\n');

    const jsBody = `
var NODES=${JSON.stringify(nodes)};
var START=${JSON.stringify(start)};
var card=$('[data-role=card]'),crumbs=$('[data-role=crumbs]'),restart=$('[data-role=restart]');
if(!card)return;
var current=START,path=[];

function clear(el){while(el.firstChild)el.removeChild(el.firstChild);}

function renderCrumbs(){
  clear(crumbs);
  path.forEach(function(step){
    var c=document.createElement('span');c.className='pg-dt-crumb';
    var q=document.createTextNode(step.q+' ');
    var b=document.createElement('b');b.textContent=step.label;
    c.appendChild(q);c.appendChild(b);
    crumbs.appendChild(c);
  });
}

function render(){
  clear(card);
  renderCrumbs();
  var node=NODES&&Object.prototype.hasOwnProperty.call(NODES,current)?NODES[current]:null;
  if(!node){
    var err=document.createElement('div');err.className='pg-dt-err';
    err.textContent='Dead end — that branch points nowhere.';
    card.appendChild(err);
    restart.hidden=false;
    return;
  }
  if(node.outcome!=null){
    var out=document.createElement('div');out.className='pg-dt-outcome';
    var flag=document.createElement('span');flag.className='pg-dt-flag';flag.textContent='Outcome';
    out.appendChild(flag);
    out.appendChild(document.createTextNode(String(node.outcome)));
    card.appendChild(out);
    restart.hidden=false;
    return;
  }
  var q=document.createElement('div');q.className='pg-dt-q';
  q.textContent=node.q!=null?String(node.q):'…';
  card.appendChild(q);
  var opts=document.createElement('div');opts.className='pg-dt-opts';
  var list=Array.isArray(node.options)?node.options:[];
  list.forEach(function(opt){
    var b=document.createElement('button');b.type='button';b.className='pg-dt-opt';
    b.textContent=opt&&opt.label!=null?String(opt.label):'…';
    b.addEventListener('click',function(){
      path.push({q:node.q!=null?String(node.q):'',label:b.textContent});
      current=opt&&opt.to!=null?String(opt.to):'';
      render();
    });
    opts.appendChild(b);
  });
  if(!list.length){
    var none=document.createElement('div');none.className='pg-dt-err';
    none.textContent='No options here — check the flow.';
    opts.appendChild(none);
  }
  card.appendChild(opts);
  restart.hidden=path.length===0;
}

restart.addEventListener('click',function(){current=START;path=[];render();});
render();
`;

    return { html, css, jsBody };
  },
};
