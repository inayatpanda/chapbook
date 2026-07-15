import { esc } from './index.js';
export default {
  id: 'nato-phonetic',
  name: 'NATO alphabet',
  category: 'language',
  description: 'Spell anything out in the NATO phonetic alphabet — type and watch each letter become its codeword.',
  paramsSchema: {
    type: 'object', additionalProperties: false, required: ['placeholder'],
    properties: {
      title: { type: 'string' },
      placeholder: { type: 'string', default: 'Type your name…' },
      caption: { type: 'string' },
    },
  },
  presets: [
    { name: 'Spell your name', params: { title: 'Spell your name', placeholder: 'Type your name…', caption: 'How a radio operator would read it back to you.' } },
    { name: 'Read out a postcode', params: { title: 'Read out a postcode', placeholder: 'e.g. SW1A 1AA', caption: 'The clear way to dictate a postcode over a crackly line.' } },
  ],
  build(params, domId) {
    const title = params.title ? `<div class="pg-nato-title">${esc(params.title)}</div>` : '';
    const caption = params.caption ? `<div class="pg-nato-caption">${esc(params.caption)}</div>` : '';
    const placeholder = esc(params.placeholder || 'Type your name…');
    const html = `<div class="pg-stage">${title}` +
      `<div class="pg-field"><label><b>Your text</b></label>` +
      `<input type="text" data-role="in" placeholder="${placeholder}" autocomplete="off" spellcheck="false"></div>` +
      `<div class="pg-readout pg-nato-out" data-role="out" aria-live="polite"></div>` +
      caption + `</div>`;
    const css = [
      `#${domId} .pg-nato-title{font-weight:700;font-size:1.05rem;margin-bottom:.6rem;color:#e9eef8}`,
      `#${domId} .pg-field input{width:100%;box-sizing:border-box;padding:.6rem .75rem;border-radius:10px;border:1px solid #23304a;background:rgba(140,160,200,.06);color:#e9eef8;font:inherit}`,
      `#${domId} .pg-field input:focus{outline:none;border-color:#22d3ee}`,
      `#${domId} .pg-nato-out{display:flex;flex-wrap:wrap;gap:.4rem;margin-top:.8rem;min-height:1.5rem;align-items:flex-start}`,
      `#${domId} .pg-nato-chip{display:inline-flex;flex-direction:column;align-items:center;gap:.1rem;padding:.35rem .6rem;border-radius:9px;border:1px solid #2dd4bf55;background:rgba(45,212,191,.08);line-height:1.15}`,
      `#${domId} .pg-nato-chip .pg-nato-src{font-size:.7rem;color:#22d3ee;font-weight:700;text-transform:uppercase;letter-spacing:.05em}`,
      `#${domId} .pg-nato-chip .pg-nato-word{font-size:.95rem;color:#e9eef8;font-weight:600}`,
      `#${domId} .pg-nato-gap{flex-basis:100%;height:0}`,
      `#${domId} .pg-nato-empty{color:#94a3b8;font-style:italic}`,
      `#${domId} .pg-nato-caption{margin-top:.8rem;font-size:.85rem;color:#94a3b8}`,
    ].join('\n');
    const jsBody = `
var MAP={A:'Alpha',B:'Bravo',C:'Charlie',D:'Delta',E:'Echo',F:'Foxtrot',G:'Golf',H:'Hotel',I:'India',J:'Juliett',K:'Kilo',L:'Lima',M:'Mike',N:'November',O:'Oscar',P:'Papa',Q:'Quebec',R:'Romeo',S:'Sierra',T:'Tango',U:'Uniform',V:'Victor',W:'Whiskey',X:'X-ray',Y:'Yankee',Z:'Zulu','0':'Zero','1':'One','2':'Two','3':'Three','4':'Four','5':'Five','6':'Six','7':'Seven','8':'Eight','9':'Nine'};
var input=$('[data-role=in]'), out=$('[data-role=out]');
if(!input||!out)return;
function render(){
  out.textContent='';
  var s=input.value||'';
  var any=false;
  for(var i=0;i<s.length;i++){
    var ch=s[i];
    if(ch===' '||ch==='\\t'){
      if(out.lastChild && out.lastChild.className!=='pg-nato-gap'){
        var gap=document.createElement('span');
        gap.className='pg-nato-gap';
        out.appendChild(gap);
      }
      continue;
    }
    var key=ch.toUpperCase();
    var word=MAP[key];
    if(!word)continue;
    any=true;
    var chip=document.createElement('span');
    chip.className='pg-nato-chip';
    var src=document.createElement('span');
    src.className='pg-nato-src';
    src.textContent=ch;
    var w=document.createElement('span');
    w.className='pg-nato-word';
    w.textContent=word;
    chip.appendChild(src);
    chip.appendChild(w);
    out.appendChild(chip);
  }
  if(!any){
    var e=document.createElement('span');
    e.className='pg-nato-empty';
    e.textContent='…';
    out.appendChild(e);
  }
}
input.addEventListener('input',render);
render();
`;
    return { html, css, jsBody };
  },
};
