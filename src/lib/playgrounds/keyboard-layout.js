import { esc } from './index.js';

/**
 * Keyboard-layout reach visualiser. Type a phrase; the keys heat-shade by how
 * often each letter is used, and bars compare how far QWERTY, Dvorak and Colemak
 * send your fingers OFF the home row (home-row letters cost 0; top/bottom cost 1).
 * Pure layout demo — no audio, no animation.
 */
export default {
  id: 'keyboard-layout',
  name: 'Keyboard layout reach',
  category: 'language',
  description: 'Type a phrase and compare how far QWERTY, Dvorak and Colemak send your fingers off the home row; keys heat-shade by use.',
  paramsSchema: {
    type: 'object', additionalProperties: false,
    properties: {
      title: { type: 'string' },
      text: { type: 'string' },
      caption: { type: 'string' },
    },
  },
  presets: [
    { name: 'The pangram', params: { text: 'the quick brown fox jumps over the lazy dog', caption: 'Type your own text, then flip the layout and watch the reaching.' } },
    { name: 'A tongue-twister', params: { text: 'she sells sea shells by the sea shore and the shells she sells are surely seashells', caption: 'Longer text pulls the three layouts further apart.' } },
  ],
  build(params, domId) {
    const text = typeof params.text === 'string' && params.text ? params.text : 'the quick brown fox jumps over the lazy dog';
    const title = params.title ? `<div class="kl-title">${esc(params.title)}</div>` : '';
    const capText = params.caption ? esc(params.caption) : '';

    const html =
      `<div class="pg-stage">` + title +
      `<svg class="kl-kb" viewBox="0 0 460 170" role="img" aria-label="Keyboard heatmap: each key shaded by how often the current text uses that letter"><g data-role="keys"></g></svg>` +
      `<svg class="kl-cmp" viewBox="0 0 460 110" role="img" aria-label="Total finger reaches off the home row, compared across layouts"><g data-role="cmpg"></g></svg>` +
      `<div class="kl-cap" data-role="cap" aria-live="polite">${capText}</div>` +
      `<label class="kl-lab">Your text<textarea data-role="text" rows="2">${esc(text)}</textarea></label>` +
      `<div class="kl-row" role="group" aria-label="Keyboard layout"><button type="button" class="kl-lay on" data-role="lay" data-lay="qwerty" aria-pressed="true">QWERTY</button><button type="button" class="kl-lay" data-role="lay" data-lay="dvorak" aria-pressed="false">Dvorak</button><button type="button" class="kl-lay" data-role="lay" data-lay="colemak" aria-pressed="false">Colemak</button></div>` +
      `<div class="kl-readout">reaches off home row <b data-role="reach">0</b> &middot; on home row <b data-role="home">0%</b></div>` +
      `</div>`;

    const css = [
      `#${domId} .pg-stage{display:grid;gap:.8rem}`,
      `#${domId} .kl-title{font-weight:600;color:var(--ink,#e9eef8)}`,
      `#${domId} .kl-kb,#${domId} .kl-cmp{width:100%;height:auto;display:block}`,
      `#${domId} .kl-cap{min-height:2.4em;color:var(--ink-dim,#cdd6ea);font-size:.98rem;line-height:1.45;border-left:2px solid #22d3ee;padding-left:.8rem}`,
      `#${domId} .kl-lab{display:grid;gap:.35rem;color:var(--ink-dim,#9fb0c8);font-size:.85rem}`,
      `#${domId} textarea[data-role=text]{width:100%;box-sizing:border-box;background:#0c1424;color:#e9edf5;border:1px solid #2a3a5e;border-radius:10px;padding:.6rem .7rem;font:inherit;resize:vertical}`,
      `#${domId} textarea[data-role=text]:focus{outline:none;border-color:#22d3ee}`,
      `#${domId} .kl-row{display:flex;flex-wrap:wrap;gap:.5rem}`,
      `#${domId} .kl-lay{background:#12203b;color:#cdd6ea;border:1px solid #2a3a5e;border-radius:999px;padding:.4rem 1rem;font:inherit;cursor:pointer;transition:border-color .12s,color .12s,background .12s}`,
      `#${domId} .kl-lay:hover{border-color:#22d3ee}`,
      `#${domId} .kl-lay.on{background:#163a36;border-color:#2dd4bf;color:#fff}`,
      `#${domId} .kl-readout{color:var(--ink-dim,#cdd6ea)}`,
      `#${domId} .kl-readout b{color:var(--ink,#fff)}`,
    ].join('\n');

    const jsBody = `
var ROWS={qwerty:['qwertyuiop','asdfghjkl','zxcvbnm'],dvorak:['pyfgcrl','aoeuidhtns','qjkxbmwvz'],colemak:['qwfpgjluy','arstdhneio','zxcvbkm']};
var NAME={qwerty:'QWERTY',dvorak:'Dvorak',colemak:'Colemak'};
var text=$('[data-role=text]'),keysG=$('[data-role=keys]'),cmpG=$('[data-role=cmpg]'),reachEl=$('[data-role=reach]'),homeEl=$('[data-role=home]'),capEl=$('[data-role=cap]');
var lay='qwerty';
function rowOf(l,ch){var r=ROWS[l];for(var i=0;i<3;i++){if(r[i].indexOf(ch)!==-1)return i;}return -1;}
function freq(s){var f={};s=(s||'').toLowerCase();for(var i=0;i<s.length;i++){var c=s.charAt(i);if(c>='a'&&c<='z')f[c]=(f[c]||0)+1;}return f;}
function stats(l,f){var re=0,ho=0,to=0;for(var c in f){var row=rowOf(l,c);if(row===-1)continue;to+=f[c];if(row===1)ho+=f[c];else re+=f[c];}return {reaches:re,home:ho,total:to};}
function maxFreq(f){var m=1;for(var c in f){if(f[c]>m)m=f[c];}return m;}
function shade(n,mx){if(!n)return '#0c1424';var a=0.16+(n/mx)*0.64;return 'rgba(45,212,191,'+a.toFixed(2)+')';}
function drawKb(f){var r=ROWS[lay],mx=maxFreq(f),kw=40,kh=40,gap=6,h='';for(var row=0;row<3;row++){var letters=r[row];var rowW=letters.length*(kw+gap)-gap;var x0=(460-rowW)/2;var y=10+row*(kh+gap);for(var i=0;i<letters.length;i++){var c=letters.charAt(i),x=x0+i*(kw+gap),n=f[c]||0;var st=row===1?'#2dd4bf':'#2a3a5e';h+='<rect x="'+x.toFixed(1)+'" y="'+y+'" width="'+kw+'" height="'+kh+'" rx="7" fill="'+shade(n,mx)+'" stroke="'+st+'" stroke-width="'+(row===1?1.6:1)+'"/>';h+='<text x="'+(x+kw/2).toFixed(1)+'" y="'+(y+kh/2+5)+'" text-anchor="middle" font-family="system-ui,sans-serif" font-size="15" fill="#e9edf5">'+c+'</text>';}}if(keysG)keysG.innerHTML=h;}
function drawCmp(f){var order=['qwerty','dvorak','colemak'];var vals=order.map(function(k){return stats(k,f).reaches;});var mx=Math.max(1,vals[0],vals[1],vals[2]);var h='',x0=110,bh=22,gap=12;for(var i=0;i<order.length;i++){var k=order[i],v=vals[i],y=10+i*(bh+gap),w=(v/mx)*300,on=k===lay;h+='<text x="100" y="'+(y+bh-6)+'" text-anchor="end" font-family="system-ui,sans-serif" font-size="13" fill="'+(on?'#fff':'#aab4cc')+'">'+NAME[k]+'</text>';h+='<rect x="'+x0+'" y="'+y+'" width="'+w.toFixed(1)+'" height="'+bh+'" rx="4" fill="'+(on?'#22d3ee':'#39496e')+'"/>';h+='<text x="'+(x0+w+8).toFixed(1)+'" y="'+(y+bh-6)+'" font-family="system-ui,sans-serif" font-size="13" fill="#cdd6ea">'+v+'</text>';}if(cmpG)cmpG.innerHTML=h;}
function upd(){var f=freq(text?text.value:'');drawKb(f);drawCmp(f);var s=stats(lay,f),q=stats('qwerty',f);if(reachEl)reachEl.textContent=s.reaches;if(homeEl)homeEl.textContent=(s.total?Math.round(s.home/s.total*100):0)+'%';if(capEl)capEl.textContent=s.total>8?(lay==='qwerty'?'QWERTY sends your fingers off the home row '+q.reaches+' times for this text. Flip to Dvorak or Colemak and watch that fall.':NAME[lay]+' keeps far more typing on the home row than QWERTY ('+s.reaches+' reaches against '+q.reaches+').'):'Type a longer sentence to see the layouts pull apart.';}
if(text)text.addEventListener('input',upd);
$$('[data-role=lay]').forEach(function(b){b.addEventListener('click',function(){lay=b.getAttribute('data-lay');$$('[data-role=lay]').forEach(function(x){var on=x===b;x.classList.toggle('on',on);x.setAttribute('aria-pressed',on?'true':'false');});upd();});});
upd();
`;

    return { html, css, jsBody };
  },
};
