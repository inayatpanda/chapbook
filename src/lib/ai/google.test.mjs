import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildVision, buildText, parseText, generateImage } from './google.js';

test('short Gemini requests reserve output tokens in addition to thinking', () => {
  for (const request of [buildVision({prompt:'Describe',imageBase64:'x',maxTokens:120}),buildText({prompt:'Hello',maxTokens:120})]) {
    const config=JSON.parse(request.body).generationConfig;
    assert.ok(config.maxOutputTokens-config.thinkingConfig.thinkingBudget>=120);
  }
});
test('empty or thinking-only Gemini output is an actionable failure, never a blank success', () => {
  assert.throws(()=>parseText({candidates:[{finishReason:'MAX_TOKENS',content:{parts:[]}}]}),{code:'AI_PARSE'});
  assert.throws(()=>parseText({candidates:[{finishReason:'STOP',content:{parts:[{thought:true,text:'private reasoning'}]}}]}),{code:'AI_PARSE'});
  assert.equal(parseText({candidates:[{finishReason:'STOP',content:{parts:[{thought:true,text:'reasoning'},{text:'Answer'}]}}]}),'Answer');
});
test('Gemini image generation uses native image model and returns actual image MIME type', async () => {
  let request;
  const result=await generateImage({prompt:'A notebook',size:'1536x1024',model:'gemini-flash-latest',key:'test'},async(url,opts)=>{
    request={url,...opts};
    return new Response(JSON.stringify({candidates:[{content:{parts:[{text:'Here is your image'},{inlineData:{data:'image-bytes',mimeType:'image/webp'}}]}}]}));
  });
  assert.match(request.url,/gemini-3\.1-flash-image:generateContent$/);
  assert.ok(!request.url.includes('key='));
  assert.equal(request.headers['x-goog-api-key'],'test');
  assert.deepEqual(JSON.parse(request.body).generationConfig.imageConfig,{aspectRatio:'3:2'});
  assert.deepEqual(result,{base64:'image-bytes',mimeType:'image/webp'});
});
test('Gemini image refusal never reports success with empty image bytes', async () => {
  await assert.rejects(()=>generateImage({prompt:'x'},async()=>new Response(JSON.stringify({candidates:[{finishReason:'SAFETY'}]}))),{code:'AI_PARSE'});
});
