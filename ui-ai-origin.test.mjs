import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {parse} from 'acorn';
const html=readFileSync(new URL('./src/index.html',import.meta.url),'utf8');
const functions=new Map();
for(const [,attrs,source] of html.matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/gi)) {
  if(/src=|application\/ld\+json|application\/json/.test(attrs)) continue;
  for(const node of parse(source,{ecmaVersion:'latest',sourceType:'module'}).body) if(node.type==='FunctionDeclaration') functions.set(node.id.name,source.slice(node.start,node.end));
}
const origin=[{kind:'generated',tool:'AI',action:'figures/invent'}];
function fixture(){
 const elements=new Map(), library=[];
 const element=id=>{if(!elements.has(id))elements.set(id,{value:'',textContent:'',style:{},classList:{add(){},remove(){}},querySelector(){return this;}});return elements.get(id);};
 const no=()=>{};
 const ctx=vm.createContext({structuredClone,clearTimeout,$:element,doc:{blocks:[]},window:{},_tplLibDomId:'',_tplLibFamily:null,_tplLibMode:'insert',_tplLibEditId:null,_tplLibInsertAt:null,_tplLibSeq:0,_tplLibDebounce:null,_tplLibPlacement:{},_figFamily:null,_figMode:'insert',_figEditId:null,_figInsertAt:null,_figSeq:0,_figDebounce:null,_figPlacement:{},_figHandEdited:false,_figAnimate:'none',_figBase:null,
 mkId:()=>String(Math.random()),renderBlocks:no,selectBlock:no,markDirty:no,closeTplLib:no,closeFigLib:no,toast:no,renderTplLibPlacement:no,renderTplLibPreviewFrame:no,setTplLibPreviewStatus:no,setTplLibInventMode:no,renderFigRawAnimate:no,resetFigRefine:no,showFigOnImage:no,renderFigPreviewFrame:no,tplLibPushRecent:no,helmPrompt:async()=> 'Synthetic',saveToLibrary:item=>{library.push(item);return item;},api:async()=>({block:{html:'<p>Built</p>',svg:'<svg></svg>'}}),setTimeout:no,openTplLib:no});
 for(const name of ['copyAiOrigin','imageDataUri','openTplLibInvented','runTplLibPreview','insertTplLibBlock','openInteractiveMakerFromSaved','saveCurrentInteractiveToLibrary','openFigSuggested','runFigPreview','insertFigBlock','saveCurrentFigureToLibrary'])vm.runInContext(functions.get(name),ctx);
 return {ctx,library};
}
const plain=x=>JSON.parse(JSON.stringify(x));
test('generated interactive origin survives insert, library save and reopening; manual code stays unmarked',async()=>{
 const {ctx,library}=fixture();
 ctx.openTplLibInvented({block:{html:'<p>Example</p>',aiProvenance:origin}});
 await ctx.insertTplLibBlock(); assert.deepEqual(plain(ctx.doc.blocks[0].aiProvenance),origin);
 await ctx.saveCurrentInteractiveToLibrary();assert.deepEqual(plain(library[0].data.aiProvenance),origin);
 ctx.openInteractiveMakerFromSaved(library[0]);assert.deepEqual(plain(ctx._tplLibBuilt.aiProvenance),origin);
 ctx.openTplLibInvented({block:{html:'<p>Hand written</p>'}});await ctx.insertTplLibBlock();assert.equal(ctx.doc.blocks.at(-1).aiProvenance,undefined);
});
test('generated figure origin survives insertion, library save and parameter rebuilds',async()=>{
 const {ctx,library}=fixture();
 ctx.openFigSuggested({svg:'<svg></svg>',aiProvenance:origin},'');
 await ctx.insertFigBlock();await ctx.saveCurrentFigureToLibrary();
 assert.deepEqual(plain(ctx.doc.blocks[0].aiProvenance),origin);assert.deepEqual(plain(library[0].data.aiProvenance),origin);
 ctx._figFamily={id:'diagram'};ctx._figParams={};await ctx.runFigPreview();assert.deepEqual(plain(ctx._figBuilt.aiProvenance),origin);
 ctx._tplLibFamily={id:'chart'};ctx._tplLibParams={};ctx._tplLibOrigin=origin;await ctx.runTplLibPreview();assert.deepEqual(plain(ctx._tplLibBuilt.aiProvenance),origin);
 ctx.openFigSuggested({svg:'<svg></svg>'},'Hand drawing');await ctx.insertFigBlock();assert.equal(ctx.doc.blocks.at(-1).aiProvenance,undefined);
});
test('generated image preview honours PNG/WebP bytes and existing data URLs',()=>{
 const {ctx}=fixture();
 assert.equal(ctx.imageDataUri({base64:'bytes',mimeType:'image/png'}),'data:image/png;base64,bytes');
 assert.equal(ctx.imageDataUri({base64:'bytes',mimeType:'image/webp'}),'data:image/webp;base64,bytes');
 assert.equal(ctx.imageDataUri({base64:'data:image/png;base64,bytes'}),'data:image/png;base64,bytes');
 assert.equal(ctx.imageDataUri({base64:'bytes',mimeType:'text/html'}),'data:image/jpeg;base64,bytes');
});
