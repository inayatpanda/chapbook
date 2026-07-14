import { esc } from './index.js';
export default {
  id: 'time-since',
  name: 'Time since',
  category: 'history',
  description: 'How long ago something happened — live, down to the second.',
  paramsSchema: {
    type: 'object', additionalProperties: false, required: ['event', 'date'],
    properties: {
      title: { type: 'string' },
      event: { type: 'string' },
      date: { type: 'string' },
      caption: { type: 'string' },
    },
  },
  presets: [
    { name: 'Since the Moon landing', params: { title: 'Time since the Moon landing', event: 'Apollo 11 touched down', date: '1969-07-20' } },
    { name: 'Since the Web went public', params: { title: 'Time since the Web went public', event: 'The World Wide Web opened to all', date: '1991-08-06' } },
  ],
  build(params, domId) {
    const title = params.title ? `<div class="pg-ts-title">${esc(params.title)}</div>` : '';
    const event = esc(params.event || '');
    const date = esc(params.date || '');
    const caption = params.caption ? `<div class="pg-ts-caption">${esc(params.caption)}</div>` : '';
    const html =
      `<div class="pg-stage" data-date="${date}">${title}` +
      `<div class="pg-ts-event">${event}</div>` +
      `<div class="pg-ts-date" data-role="date"></div>` +
      `<div class="pg-ts-elapsed" data-role="elapsed">` +
      `<div class="pg-ts-cell"><span class="pg-ts-num pg-readout" data-role="years">–</span><span class="pg-ts-label">Years</span></div>` +
      `<div class="pg-ts-cell"><span class="pg-ts-num pg-readout" data-role="days">–</span><span class="pg-ts-label">Days</span></div>` +
      `<div class="pg-ts-cell pg-ts-clock"><span class="pg-ts-num pg-readout" data-role="clock">–</span><span class="pg-ts-label">Hours · Mins · Secs</span></div>` +
      `</div>` +
      `<div class="pg-ts-msg" data-role="msg" hidden></div>${caption}</div>`;
    const css = [
      `#${domId} .pg-ts-title{font-weight:600;margin-bottom:.6rem;color:var(--ink,#e9eef8)}`,
      `#${domId} .pg-ts-event{font-size:clamp(1.1rem,4vw,1.5rem);font-weight:700;color:#22d3ee;line-height:1.2}`,
      `#${domId} .pg-ts-date{font-size:.82rem;letter-spacing:.04em;color:var(--ink-dim,#cdd6e6);margin:.25rem 0 1rem}`,
      `#${domId} .pg-ts-elapsed{display:grid;grid-template-columns:1fr 1fr;gap:.6rem}`,
      `#${domId} .pg-ts-clock{grid-column:1 / -1}`,
      `#${domId} .pg-ts-cell{display:flex;flex-direction:column;align-items:center;gap:.3rem;padding:.9rem .4rem;border-radius:12px;border:1px solid var(--line,#23304a);background:rgba(140,160,200,.06)}`,
      `#${domId} .pg-ts-num{font-size:clamp(1.5rem,7vw,2.4rem);font-weight:700;line-height:1;font-variant-numeric:tabular-nums;color:#2dd4bf}`,
      `#${domId} .pg-ts-clock .pg-ts-num{color:#818cf8;letter-spacing:.02em}`,
      `#${domId} .pg-ts-label{font-size:.7rem;letter-spacing:.06em;text-transform:uppercase;color:var(--ink-dim,#cdd6e6)}`,
      `#${domId} .pg-ts-msg{font-size:clamp(1rem,4vw,1.3rem);font-weight:600;text-align:center;padding:1.2rem .6rem;color:#fbbf24}`,
      `#${domId} .pg-ts-caption{margin-top:.9rem;font-size:.82rem;color:var(--ink-dim,#cdd6e6)}`,
    ].join('\n');
    const jsBody = `
var stage=$('.pg-stage');if(!stage)return;
var elapsed=$('[data-role=elapsed]'),msg=$('[data-role=msg]'),dateEl=$('[data-role=date]');
var yEl=$('[data-role=years]'),dEl=$('[data-role=days]'),cEl=$('[data-role=clock]');
if(!elapsed||!msg||!dateEl||!yEl||!dEl||!cEl)return;
var start=new Date(stage.getAttribute('data-date'));
function pad(n){return(n<10?'0':'')+n;}
function show(m){elapsed.hidden=true;dateEl.hidden=true;msg.hidden=false;msg.textContent=m;}
if(root._tsTimer){clearInterval(root._tsTimer);root._tsTimer=null;}
if(isNaN(start.getTime())){show('That date doesn’t look right.');return;}
try{
  dateEl.textContent=start.toLocaleDateString('en-GB',{day:'numeric',month:'long',year:'numeric'});
}catch(e){dateEl.textContent=stage.getAttribute('data-date');}
function tick(){
  var diff=Date.now()-start.getTime();
  if(diff<0){show('That’s still in the future — check back later.');if(root._tsTimer){clearInterval(root._tsTimer);root._tsTimer=null;}return;}
  elapsed.hidden=false;dateEl.hidden=false;msg.hidden=true;
  var totalS=Math.floor(diff/1000);
  var totalDays=Math.floor(totalS/86400);
  var years=Math.floor(totalDays/365.25);
  var days=totalDays-Math.floor(years*365.25);
  yEl.textContent=years;
  dEl.textContent=days;
  cEl.textContent=pad(Math.floor(totalS/3600)%24)+':'+pad(Math.floor(totalS/60)%60)+':'+pad(totalS%60);
}
tick();
root._tsTimer=setInterval(tick,1000);
`;
    return { html, css, jsBody };
  },
};
