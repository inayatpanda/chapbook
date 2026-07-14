import { esc } from './index.js';

export default {
  id: 'morse-code',
  name: 'Morse code',
  category: 'language',
  description: 'Type a message to see it spelled out in Morse, then flash it through a blinking lamp.',
  paramsSchema: {
    type: 'object', additionalProperties: false, required: ['placeholder'],
    properties: {
      title: { type: 'string' },
      placeholder: { type: 'string', default: 'Type a message…' },
      caption: { type: 'string' },
    },
  },
  presets: [
    { name: 'Type a message', params: { title: 'Morse code', placeholder: 'Type a message…' } },
    { name: 'SOS', params: { title: 'Morse code', placeholder: 'Try SOS', caption: '··· −−− ···  — the only Morse anyone remembers.' } },
  ],
  build(params, domId) {
    const placeholder = params.placeholder ? String(params.placeholder) : 'Type a message…';
    const title = params.title ? `<div class="pg-mc-title">${esc(params.title)}</div>` : '';
    const caption = params.caption ? `<div class="pg-mc-caption">${esc(params.caption)}</div>` : '';
    const html =
      `<div class="pg-stage">` +
      title +
      `<div class="pg-controls">` +
      `<div class="pg-field"><label><b>Message</b></label>` +
      `<input type="text" data-role="input" placeholder="${esc(placeholder)}" autocomplete="off" spellcheck="false"></div>` +
      `</div>` +
      `<div class="pg-mc-out" data-role="out" aria-live="polite"></div>` +
      `<div class="pg-mc-row">` +
      `<button type="button" class="pg-mc-go" data-role="go">Flash it</button>` +
      `<span class="pg-mc-lamp" data-role="lamp" aria-hidden="true"></span>` +
      `</div>` +
      caption +
      `</div>`;
    const css = [
      `#${domId} .pg-mc-title{font-weight:700;font-size:1.05rem;margin-bottom:.6rem;color:#e9eef8}`,
      `#${domId} .pg-field input{width:100%;box-sizing:border-box;padding:.55rem .7rem;border-radius:10px;border:1px solid #23304a;background:rgba(140,160,200,.06);color:#e9eef8;font:inherit}`,
      `#${domId} .pg-field input:focus{outline:none;border-color:#22d3ee;box-shadow:0 0 0 2px rgba(34,211,238,.25)}`,
      `#${domId} .pg-mc-out{margin:.8rem 0;padding:.7rem .8rem;min-height:1.4rem;border-radius:10px;border:1px solid #23304a;background:rgba(34,211,238,.05);color:#22d3ee;font-size:1.25rem;line-height:1.5;letter-spacing:.06em;word-break:break-word;font-variant-numeric:tabular-nums}`,
      `#${domId} .pg-mc-out:empty::before{content:'…';color:#54607a}`,
      `#${domId} .pg-mc-row{display:flex;align-items:center;gap:.8rem}`,
      `#${domId} .pg-mc-go{padding:.5rem .9rem;border-radius:10px;border:1px solid #2dd4bf66;background:rgba(45,212,191,.1);color:#2dd4bf;font:inherit;font-weight:600;cursor:pointer}`,
      `#${domId} .pg-mc-go:hover{background:rgba(45,212,191,.18)}`,
      `#${domId} .pg-mc-go:disabled{opacity:.45;cursor:default}`,
      `#${domId} .pg-mc-lamp{width:28px;height:28px;border-radius:50%;background:#1a2336;border:1px solid #2a3650;box-shadow:none;transition:background .04s,box-shadow .04s}`,
      `#${domId} .pg-mc-lamp.on{background:#fbbf24;box-shadow:0 0 14px 4px rgba(251,191,36,.7)}`,
      `#${domId}.pg-mc-reduce .pg-mc-lamp{display:none}`,
      `#${domId}.pg-mc-reduce .pg-mc-go{display:none}`,
      `#${domId} .pg-mc-caption{margin:.7rem 0 0;color:#9aa6bd;font-size:.85rem}`,
    ].join('\n');
    const jsBody = `
var MORSE={
  A:'.-',B:'-...',C:'-.-.',D:'-..',E:'.',F:'..-.',G:'--.',H:'....',I:'..',J:'.---',
  K:'-.-',L:'.-..',M:'--',N:'-.',O:'---',P:'.--.',Q:'--.-',R:'.-.',S:'...',T:'-',
  U:'..-',V:'...-',W:'.--',X:'-..-',Y:'-.--',Z:'--..',
  '0':'-----','1':'.----','2':'..---','3':'...--','4':'....-',
  '5':'.....','6':'-....','7':'--...','8':'---..','9':'----.'
};
var input=$('[data-role=input]');
var out=$('[data-role=out]');
var lamp=$('[data-role=lamp]');
var go=$('[data-role=go]');
if(!input||!out)return;
if(reduced)root.classList.add('pg-mc-reduce');

// glyphs for display: dot=·  dash=−
function toGlyph(code){return code.replace(/\\./g,'\\u00b7').replace(/-/g,'\\u2212');}

function render(){
  var text=(input.value||'').toUpperCase();
  // split into words on runs of non-mappable chars (spaces, punctuation, unknowns)
  var words=[];var cur=[];
  for(var i=0;i<text.length;i++){
    var ch=text[i];
    if(MORSE[ch]){cur.push(MORSE[ch]);}
    else{ if(cur.length){words.push(cur);cur=[];} }
  }
  if(cur.length)words.push(cur);
  var display=words.map(function(w){return w.map(toGlyph).join(' ');}).join('  /  ');
  out.textContent=display;
  return words;
}

function clearTimers(){
  if(root._morseTimers){root._morseTimers.forEach(function(t){clearTimeout(t);});}
  root._morseTimers=[];
}
function lampOff(){ if(lamp)lamp.classList.remove('on'); }

clearTimers();
lampOff();

input.addEventListener('input',render);
render();

if(go&&lamp&&!reduced){
  go.addEventListener('click',function(){
    clearTimers();        // guard against overlapping flashes
    lampOff();
    var words=render();
    var DOT=200,DASH=600,GAP=200,LETTER=600,WORD=1400;
    var t=0;
    function flash(dur){
      root._morseTimers.push(setTimeout(function(){lamp.classList.add('on');},t));
      t+=dur;
      root._morseTimers.push(setTimeout(function(){lamp.classList.remove('on');},t));
      t+=GAP;
    }
    var any=false;
    words.forEach(function(w,wi){
      if(wi>0)t+=WORD-GAP;
      w.forEach(function(code,li){
        if(li>0)t+=LETTER-GAP;
        for(var k=0;k<code.length;k++){ flash(code[k]==='-'?DASH:DOT); any=true; }
      });
    });
    if(!any)return;
    go.disabled=true;
    root._morseTimers.push(setTimeout(function(){go.disabled=false;lampOff();},t+200));
  });
}
`;
    return { html, css, jsBody };
  },
};
