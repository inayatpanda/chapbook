import { esc } from './index.js';

/**
 * Web-Audio key-change (modulation) demo. Play a I–V–vi–IV loop twice: once
 * entirely in C, once with the second half lifted up a whole tone — the classic
 * "key change" that makes a song surge. Eight chord pips light in time so you can
 * see where the lift lands. Audio plays even under reduced-motion (sound is not
 * motion); only the pip transitions are kept off.
 */
export default {
  id: 'key-change',
  name: 'Key change (modulation)',
  category: 'music',
  description: 'Play a four-chord loop twice — once in one key, once with the second half lifted up a tone — and hear the modulation everyone knows.',
  paramsSchema: {
    type: 'object', additionalProperties: false,
    properties: {
      title: { type: 'string' },
      caption: { type: 'string' },
    },
  },
  presets: [
    { name: 'The classic lift', params: { title: 'Hear the lift', caption: 'Play the loop, then play it again with the key change dropped in halfway.' } },
  ],
  build(params, domId) {
    const title = params.title ? `<div class="kc-title">${esc(params.title)}</div>` : '';
    const caption = params.caption ? `<div class="kc-cap">${esc(params.caption)}</div>` : '';

    const pips = [0, 1, 2, 3, 4, 5, 6, 7]
      .map((i) => `<span class="kc-pip" data-role="pip" data-i="${i}"></span>`).join('');

    const html =
      `<div class="pg-stage">` + title +
      `<div class="kc-status" data-role="status" aria-live="polite">Pick a version and press play.</div>` +
      `<div class="kc-pips" role="img" aria-label="Eight chords; the current chord lights as it plays">${pips}</div>` +
      `<div class="kc-row" role="group" aria-label="Play options">` +
      `<button type="button" class="kc-btn" data-role="play" data-mode="plain">Play the loop (same key)</button>` +
      `<button type="button" class="kc-btn kc-lift" data-role="play" data-mode="lift">Play with the key change</button>` +
      `<button type="button" class="kc-btn kc-stop" data-role="stop">Stop</button>` +
      `</div>` +
      caption +
      `</div>`;

    const css = [
      `#${domId} .pg-stage{display:grid;gap:.85rem}`,
      `#${domId} .kc-title{font-weight:600;color:var(--ink,#e9edf5)}`,
      `#${domId} .kc-status{min-height:1.4em;color:var(--ink-dim,#cdd6ea);font-size:.95rem;border-left:2px solid #f472b6;padding-left:.8rem}`,
      `#${domId} .kc-pips{display:flex;flex-wrap:wrap;gap:.5rem;align-items:center}`,
      `#${domId} .kc-pip{width:1.5rem;height:1.5rem;border-radius:999px;background:#0c1424;border:1px solid #2a3a5e;box-sizing:border-box;flex:0 0 auto;transition:background .12s,border-color .12s,box-shadow .12s,transform .12s}`,
      `#${domId} .kc-pip:nth-child(5){margin-left:.55rem;border-left-style:dashed}`,
      `#${domId} .kc-pip.on{background:#f472b6;border-color:#f472b6;box-shadow:0 0 10px #f472b6aa;transform:scale(1.12)}`,
      `#${domId} .kc-pip.lifted.on{background:#2dd4bf;border-color:#2dd4bf;box-shadow:0 0 10px #2dd4bfaa}`,
      `#${domId} .kc-row{display:flex;flex-wrap:wrap;gap:.5rem}`,
      `#${domId} .kc-btn{background:#12203b;color:#e9edf5;border:1px solid #2a3a5e;border-radius:999px;padding:.45rem 1.05rem;font:inherit;cursor:pointer;transition:border-color .12s,color .12s,background .12s}`,
      `#${domId} .kc-btn:hover{border-color:#f472b6}`,
      `#${domId} .kc-btn:focus-visible{outline:2px solid #fbbf24;outline-offset:2px}`,
      `#${domId} .kc-btn.kc-lift:hover{border-color:#2dd4bf}`,
      `#${domId} .kc-btn[aria-pressed=true]{background:#2a1830;border-color:#f472b6;color:#fff}`,
      `#${domId} .kc-btn.kc-stop{color:var(--ink-dim,#cdd6ea)}`,
      `#${domId} .kc-cap{color:var(--ink-dim,#9fb0c8);font-size:.88rem}`,
    ].join('\n');

    const jsBody = `
var prog=[[60,64,67],[67,71,74],[69,72,76],[65,69,72]];
var beat=0.62;
var ctx=null;
var timeouts=[];
var sources=[];
var master=null;
var running=false;
var statusEl=$('[data-role=status]');
var pips=$$('[data-role=pip]');
var playBtns=$$('[data-role=play]');
var stopBtn=$('[data-role=stop]');
function midiToFreq(m){return 440*Math.pow(2,(m-69)/12);}
function setStatus(t){if(statusEl)statusEl.textContent=t;}
function clearTimers(){for(var i=0;i<timeouts.length;i++){clearTimeout(timeouts[i]);}timeouts=[];}
function resetPips(){for(var i=0;i<pips.length;i++){pips[i].classList.remove('on');pips[i].classList.remove('lifted');}}
function killSources(){for(var i=0;i<sources.length;i++){try{sources[i].stop();}catch(e){}try{sources[i].disconnect();}catch(e2){}}sources=[];}
function pressBtn(active){for(var i=0;i<playBtns.length;i++){playBtns[i].setAttribute('aria-pressed',playBtns[i]===active?'true':'false');}}
function stopAll(quiet){clearTimers();if(master&&ctx){try{master.gain.cancelScheduledValues(ctx.currentTime);master.gain.setValueAtTime(master.gain.value,ctx.currentTime);master.gain.linearRampToValueAtTime(0.0001,ctx.currentTime+0.05);}catch(e){}}killSources();resetPips();running=false;pressBtn(null);if(!quiet)setStatus('Stopped.');}
function playChord(notes,t0,dur){
  for(var n=0;n<notes.length;n++){
    var osc=ctx.createOscillator();
    osc.type='triangle';
    osc.frequency.setValueAtTime(midiToFreq(notes[n]),t0);
    var g=ctx.createGain();
    g.gain.setValueAtTime(0.0001,t0);
    g.gain.exponentialRampToValueAtTime(0.09,t0+0.02);
    g.gain.exponentialRampToValueAtTime(0.0001,t0+dur);
    osc.connect(g);g.connect(master);
    osc.start(t0);
    osc.stop(t0+dur+0.05);
    sources.push(osc);
  }
}
function play(mode){
  var AC=window.AudioContext||window.webkitAudioContext;
  if(!AC){setStatus('Audio not available in this browser');return;}
  if(running)stopAll(true);
  if(!ctx){try{ctx=new AC();}catch(e){setStatus('Audio not available in this browser');return;}}
  if(ctx.state==='suspended'){try{ctx.resume();}catch(e2){}}
  master=ctx.createGain();
  master.gain.setValueAtTime(0.9,ctx.currentTime);
  master.connect(ctx.destination);
  running=true;
  for(var i=0;i<playBtns.length;i++){if(playBtns[i].getAttribute('data-mode')===mode){pressBtn(playBtns[i]);}}
  setStatus(mode==='lift'?'Playing… listen for the lift halfway':'Playing… same key throughout');
  var seq=[];
  var c;
  for(c=0;c<4;c++){seq.push({notes:prog[c],lifted:false});}
  for(c=0;c<4;c++){
    if(mode==='lift'){seq.push({notes:[prog[c][0]+2,prog[c][1]+2,prog[c][2]+2],lifted:true});}
    else{seq.push({notes:prog[c],lifted:false});}
  }
  var t0=ctx.currentTime+0.08;
  for(var i2=0;i2<seq.length;i2++){
    playChord(seq[i2].notes,t0+i2*beat,beat*0.96);
    (function(idx,lifted){
      timeouts.push(setTimeout(function(){
        resetPips();
        if(pips[idx]){if(lifted)pips[idx].classList.add('lifted');pips[idx].classList.add('on');}
      },Math.round(idx*beat*1000)));
    })(i2,seq[i2].lifted);
  }
  timeouts.push(setTimeout(function(){
    resetPips();running=false;pressBtn(null);
    setStatus('Done — play it again, or try the other one.');
  },Math.round(seq.length*beat*1000+200)));
}
for(var b=0;b<playBtns.length;b++){
  playBtns[b].addEventListener('click',function(){play(this.getAttribute('data-mode'));});
}
if(stopBtn)stopBtn.addEventListener('click',function(){stopAll(false);});
`;

    return { html, css, jsBody };
  },
};
