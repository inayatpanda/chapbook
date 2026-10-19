import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { parseExpressionAt } from 'acorn';
const source=readFileSync(new URL('../src/index.html',import.meta.url),'utf8');
const names=['socialOrigin','socialExportText','showSocialOrigin','shareText','makePackCard','normDraft','addToQueue','makeQueueItem','repurpose','esc'];
const code=names.map(name=>{const i=source.indexOf('function '+name+'(');const start=source.slice(i-6,i)==='async '?i-6:i;return source.slice(start,parseExpressionAt(source,start,{ecmaVersion:'latest'}).end);}).join('\n');
const origin=[{kind:'generated',tool:'AI',action:'social/repurpose'}];
const plain=v=>JSON.parse(JSON.stringify(v));
class Element{
  constructor(tag){this.tag=tag;this.children=[];this.events={};this.style={};this.classList={add(){},toggle(){}};this.value='';}
  appendChild(x){this.children.push(x);return x;}
  addEventListener(name,fn){this.events[name]=fn;}
  setAttribute(){}
  querySelectorAll(selector){return this.children.flatMap(c=>[(selector==='.'+c.className)?c:null,...c.querySelectorAll(selector)]).filter(Boolean);}
}
function setup(){
 const writes=[],copies=[],shares=[],nodes={reviewMsg:{className:''},repurposeCards:new Element('div'),packCards:new Element('div'),draftText:{value:'Seed'}};
 const context={document:{createElement:tag=>new Element(tag),querySelectorAll:()=>[]},navigator:{clipboard:{async writeText(t){copies.push(t)}},async share(data){shares.push(data)}},PLAT_LABEL:{x:'X',linkedin:'LinkedIn'},PLAT_LIMIT:{x:280},toast(){},msg(){},_shareLink:()=>'',window:{},state:{post:'Seed'},$:(id)=>nodes[id],api:async(path,options)=>{if(path==='/social/repurpose')return {parts:['One','Two'],aiProvenance:origin};writes.push({path,body:JSON.parse(options.body)});return {...JSON.parse(options.body),id:'test'};},renderQueue(){},loadQueue(){},requestAnimationFrame(){},setTimeout:fn=>{fn();return 1},clearTimeout(){}};
 vm.createContext(context);vm.runInContext(code,context);return {context,writes,copies,shares,nodes};
}
const button=(root,label)=>root.children.flatMap(x=>[x,...x.children]).find(x=>x.tag==='button'&&x.textContent===label);
test('social disclosure is idempotent, preserves human/assisted text and never exports private provenance fields',()=>{
 const {context:c}=setup();
 assert.equal(c.socialExportText('Human',[]),'Human');
 assert.equal(c.socialExportText('Edited',[{kind:'assisted'}]),'Edited');
 assert.equal(c.socialExportText('',origin),'');
 const text=c.socialExportText('Generated',origin);assert.equal(text,'Generated\n\nCreated with AI.');assert.equal(c.socialExportText(text,origin),text);
 assert.deepEqual(plain(c.socialOrigin([{...origin[0],prompt:'private',key:'secret'},...origin,{kind:'bogus'}])),origin);
});
test('AI card copy/share and queue/reopen carry origin; character count includes notice',async()=>{
 const {context:c,writes,copies,shares}=setup();
 const card=c.makePackCard('x','Original',null,origin);const input=card.children.find(x=>x.tag==='textarea');input.value='Edited';
 await button(card,'Copy').events.click();await button(card,'Share →').events.click();await button(card,'Save to Planner').events.click();
 assert.equal(copies[0],'Edited\n\nCreated with AI.');assert.equal(shares[0].text,copies[0]);assert.equal(writes[0].body.text,'Edited');assert.deepEqual(writes[0].body.aiProvenance,origin);
 const norm=c.normDraft({...writes[0].body,id:'test'});assert.deepEqual(plain(norm.aiProvenance),origin);
 assert.deepEqual(plain(c.normDraft({id:'old',idea:'Human legacy'}).aiProvenance),[]);
 const count=card.children.find(x=>x.className==='pack-count');input.events.input();assert.match(count.textContent,/24 \/ 280/);
});
test('planner edit, mark shared and requeue preserve origin; human items stay unlabelled',async()=>{
 const {context:c,writes,copies,shares}=setup();
 const d={id:'test',text:'Generated',status:'queued',aiProvenance:origin};const item=c.makeQueueItem(d,'2026-10-19');
 const ta=item.children.find(x=>x.tag==='textarea');ta.value='Updated';ta.events.input();
 await button(item,'Mark shared').events.click();await button(item,'Copy').events.click();await button(item,'Share →').events.click();
 assert.ok(writes.every(x=>JSON.stringify(x.body.aiProvenance)===JSON.stringify(origin)));
 assert.equal(copies[0],'Updated\n\nCreated with AI.');assert.equal(shares[0].text,copies[0]);
 const shared=c.makeQueueItem({...d,status:'shared'},'2026-10-19');await button(shared,'Re-queue').events.click();assert.deepEqual(writes.at(-1).body.aiProvenance,origin);
 const human=c.makeQueueItem({id:'human',text:'Manual text',status:'idea'},'2026-10-19');await button(human,'Copy').events.click();assert.equal(copies.at(-1),'Manual text');
});
test('Copy all uses edited thread parts and carries disclosure on every part',async()=>{
 const {context:c,copies,nodes}=setup();await c.repurpose('x-thread');
 nodes.repurposeCards.querySelectorAll('.pack-edit')[0].value='Revised first part';
 await button(nodes.repurposeCards,'Copy all').events.click();
 assert.equal(copies[0],'Revised first part\n\nCreated with AI.\n\nTwo\n\nCreated with AI.');
});
