import { esc } from './index.js';
export default {
  id: 'countdown',
  name: 'Countdown',
  category: 'data',
  description: 'A live countdown to a future date, ticking down days, hours, minutes and seconds.',
  paramsSchema: {
    type: 'object', additionalProperties: false, required: ['target'],
    properties: {
      title: { type: 'string' },
      target: { type: 'string' },
      doneText: { type: 'string', default: 'It’s here.' },
    },
  },
  presets: [
    { name: 'Countdown to 2030', params: { title: 'Countdown to 2030', target: '2030-01-01' } },
    { name: 'New Year', params: { title: 'New Year', target: '2027-01-01' } },
  ],
  build(params, domId) {
    const title = params.title ? `<div class="pg-cd-title">${esc(params.title)}</div>` : '';
    const target = esc(params.target || '');
    const doneText = esc(params.doneText || 'It’s here.');
    const cells = [
      ['days', 'Days'],
      ['hours', 'Hours'],
      ['mins', 'Minutes'],
      ['secs', 'Seconds'],
    ].map(([role, label]) =>
      `<div class="pg-cd-cell"><span class="pg-cd-num pg-readout" data-role="${role}">–</span>` +
      `<span class="pg-cd-label">${label}</span></div>`).join('');
    const html =
      `<div class="pg-stage" data-target="${target}" data-done="${doneText}">${title}` +
      `<div class="pg-cd-grid" data-role="grid">${cells}</div>` +
      `<div class="pg-cd-done" data-role="done" hidden></div></div>`;
    const css = [
      `#${domId} .pg-cd-title{font-weight:600;margin-bottom:.8rem;color:var(--ink,#e9eef8)}`,
      `#${domId} .pg-cd-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:.6rem}`,
      `#${domId} .pg-cd-cell{display:flex;flex-direction:column;align-items:center;gap:.3rem;padding:1rem .4rem;border-radius:12px;border:1px solid var(--line,#23304a);background:rgba(140,160,200,.06)}`,
      `#${domId} .pg-cd-num{font-size:clamp(1.6rem,7vw,2.6rem);font-weight:700;line-height:1;font-variant-numeric:tabular-nums;color:#22d3ee}`,
      `#${domId} .pg-cd-label{font-size:.72rem;letter-spacing:.06em;text-transform:uppercase;color:var(--ink-dim,#cdd6e6)}`,
      `#${domId} .pg-cd-done{font-size:clamp(1.4rem,6vw,2.2rem);font-weight:700;text-align:center;padding:1.4rem .6rem;color:#2dd4bf}`,
    ].join('\n');
    const jsBody = `
var stage=$('.pg-stage');if(!stage)return;
var grid=$('[data-role=grid]'),done=$('[data-role=done]');
var dEl=$('[data-role=days]'),hEl=$('[data-role=hours]'),mEl=$('[data-role=mins]'),sEl=$('[data-role=secs]');
if(!grid||!done||!dEl||!hEl||!mEl||!sEl)return;
var target=new Date(stage.getAttribute('data-target'));
var doneText=stage.getAttribute('data-done')||'It’s here.';
function pad(n){return(n<10?'0':'')+n;}
function show(msg){grid.hidden=true;done.hidden=false;done.textContent=msg;}
function tick(){
  var diff=target.getTime()-Date.now();
  if(diff<=0){show(doneText);if(root._cdTimer){clearInterval(root._cdTimer);root._cdTimer=null;}return;}
  grid.hidden=false;done.hidden=true;
  var s=Math.floor(diff/1000);
  dEl.textContent=Math.floor(s/86400);
  hEl.textContent=pad(Math.floor(s/3600)%24);
  mEl.textContent=pad(Math.floor(s/60)%60);
  sEl.textContent=pad(s%60);
}
if(root._cdTimer){clearInterval(root._cdTimer);root._cdTimer=null;}
if(isNaN(target.getTime())){show('Set a target date');return;}
tick();
root._cdTimer=setInterval(tick,1000);
`;
    return { html, css, jsBody };
  },
};
