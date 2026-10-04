import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import notes from '../public/slide-notes.js';
const code=fs.readFileSync(new URL('../public/local-ai.js',import.meta.url),'utf8');
function create(LanguageModel){
 let network=0,requests=[];
 const window={LanguageModel,StudyAtlasSlideNotes:notes,fetch:async(...args)=>{network++;requests.push(args);return Response.json({});}};
 const ctx={window,location:{href:'https://study.example/lecture',origin:'https://study.example'},URL,Response,Request,AbortController,DOMException,setTimeout,clearTimeout};
 vm.runInNewContext(code,ctx);return {AI:window.StudyAtlasLocalAI,window,network:()=>network,requests};
}
test('unsupported browsers answer instantly from the source without network requests',async()=>{
 const app=create(),start=Date.now(),result=await app.AI.askWithMeta('What is ADH?',{context:'ADH helps the kidneys retain water.'});
 assert.equal(result.mode,'source');assert.match(result.answer,/antidiuretic hormone/i);assert.equal(app.network(),0);assert.ok(Date.now()-start<1000);
});
test('a model needing a download is not silently downloaded by an upload or question',async()=>{
 let creates=0;const app=create({availability:async()=> 'downloadable',create:async()=>{creates++;}});
 const result=await app.AI.askWithMeta('Explain GH.',{context:'GH promotes growth.'});assert.equal(result.mode,'source');assert.equal(creates,0);
});
test('answers stream, requests use isolated sessions, and repeated source questions are cached',async()=>{
 let clones=0,destroyed=0;const updates=[];
 const app=create({availability:async()=> 'available',create:async()=>({clone:async()=>{clones++;return {promptStreaming:async()=>new ReadableStream({start(c){c.enqueue('ADH helps ');c.enqueue('retain water.');c.close();}}),destroy(){destroyed++;}};}})});
 const args={context:'ADH increases water reabsorption.',onUpdate:t=>updates.push(t)};
 const first=await app.AI.askWithMeta('What does ADH do?',args),second=await app.AI.askWithMeta('What does ADH do?',args);
 assert.equal(first.answer,'ADH helps retain water.');assert.deepEqual(second,first);assert.equal(clones,1);assert.equal(destroyed,1);assert.ok(updates.length>1);assert.equal(app.network(),0);
});
test('slow inference aborts and falls back within a bounded time',async()=>{
 let aborted=false;
 const app=create({availability:async()=> 'available',create:async()=>({clone:async()=>({prompt:async(_,o)=>{o.signal.addEventListener('abort',()=>aborted=true);return new Promise(()=>{});},destroy(){}})})});
 const start=Date.now(),result=await app.AI.askWithMeta('What is a receptor?',{context:'A receptor detects a signal.',timeoutMs:30});
 assert.equal(result.mode,'source');assert.ok(aborted);assert.ok(Date.now()-start<300);assert.equal(app.network(),0);
});
test('legacy fetch chat and status are intercepted locally',async()=>{
 const app=create();const response=await app.window.fetch('/api/ai/chat',{method:'POST',body:JSON.stringify({prompt:'Slide: ADH retains water.\nQuestion: What is ADH?'})});
 assert.equal(response.status,200);assert.equal((await response.json()).local,true);
 await app.window.fetch('/api/ai/status');assert.equal(app.network(),0);
 await app.window.fetch('/unrelated');assert.equal(app.network(),1);
});
test('cancellation is honored rather than reported as an answer',async()=>{
 const app=create(),controller=new AbortController();controller.abort();
 await assert.rejects(app.AI.askWithMeta('Explain',{signal:controller.signal}),e=>e.name==='AbortError');
});

test('a stalled stream preserves the answer already visible, without caching it as complete',async()=>{
 let clones=0;
 const app=create({availability:async()=> 'available',create:async()=>({clone:async()=>{clones++;return {async *promptStreaming(){yield 'GH stimulates the liver to produce IGF-I.';await new Promise(()=>{});},destroy(){}};}})});
 const args={context:'GH promotes IGF-I production.',timeoutMs:25};
 const result=await app.AI.askWithMeta('Explain the axis',args);
 assert.equal(result.mode,'on-device-partial');assert.equal(result.reason,'timeout');assert.equal(result.answer,'GH stimulates the liver to produce IGF-I.');
 await app.AI.askWithMeta('Explain the axis',args);assert.equal(clones,2);assert.equal(app.network(),0);
});

test('ongoing token progress resets the idle deadline',async()=>{
 const app=create({availability:async()=> 'available',create:async()=>({clone:async()=>({async *promptStreaming(){for(const token of ['GH ','stimulates ','IGF-I ','production.']){await new Promise(r=>setTimeout(r,20));yield token;}},destroy(){}})})});
 const result=await app.AI.askWithMeta('Explain',{timeoutMs:55});
 assert.equal(result.mode,'on-device');assert.equal(result.answer,'GH stimulates IGF-I production.');
});

test('late tokens after Stop cannot publish over the preserved response',async()=>{
 let release;const gate=new Promise(r=>release=r),updates=[];
 const app=create({availability:async()=> 'available',create:async()=>({clone:async()=>({async *promptStreaming(){yield 'First sentence.';await gate;yield 'Late answer.';},destroy(){}})})});
 const controller=new AbortController();
 const task=app.AI.askWithMeta('Explain',{signal:controller.signal,onUpdate:t=>{updates.push(t);controller.abort();}});
 await assert.rejects(task,e=>e.name==='AbortError');release();await new Promise(r=>setTimeout(r,0));
 assert.deepEqual(updates,['First sentence.']);assert.equal(app.AI.isBusy(),false);
});

test('follow-up history reaches the model and is part of the cache identity',async()=>{
 const prompts=[];const app=create({availability:async()=> 'available',create:async()=>({clone:async()=>({prompt:async p=>{prompts.push(p);return 'A direct answer.';},destroy(){}})})});
 await app.AI.askWithMeta('Why?',{context:'Slide 6: GH stimulates IGF-I.',history:[{question:'What does GH do?',answer:'It stimulates liver IGF-I.'}]});
 await app.AI.askWithMeta('Why?',{context:'Slide 6: GH stimulates IGF-I.',history:[{question:'What does feedback do?',answer:'It reduces GH secretion.'}]});
 assert.equal(prompts.length,2);assert.match(prompts[0],/What does GH do/);assert.match(prompts[1],/reduces GH secretion/);assert.equal(app.network(),0);
});

test('empty model output falls back to readable notes rather than erasing the answer',async()=>{
 const app=create({availability:async()=> 'available',create:async()=>({clone:async()=>({prompt:async()=>'',destroy(){}})})});
 const result=await app.AI.askWithMeta('Explain',{context:'Current slide 6: GH\nStudy explanation: GH stimulates liver IGF-I production.\nOriginal slide text:\nGH IGF'});
 assert.equal(result.mode,'source');assert.match(result.answer,/GH stimulates liver/);assert.doesNotMatch(result.answer,/Current slide 6/);
});

test('streamed explanations finish beyond the former character cutoff without losing visible text',async()=>{
 const first='A useful explanation. '.repeat(70),last='Final takeaway.';
 const app=create({availability:async()=> 'available',create:async()=>({clone:async()=>({async *promptStreaming(){yield first;yield last;},destroy(){}})})});
 const result=await app.AI.askWithMeta('Explain in detail');
 assert.equal(result.answer,first+last);assert.equal(result.mode,'on-device');
});
