import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {dom,read} from './dom.mjs';

test('reader keeps answers on close/reopen and gives follow-ups per-slide history',async()=>{
 const app=dom('<html><body><div id="atlasTimerModal"></div><div id="atlasGenDock"></div></body></html>');
 app.context.AbortController=AbortController;const calls=[];
 app.window.StudyAtlasLocalAI={sourceAnswer:()=> 'Instant explanation.',availability:async()=> 'unavailable',askWithMeta:async(q,o)=>{calls.push(o);o.onUpdate('GH stimulates liver IGF-I.');return {answer:'GH stimulates liver IGF-I.',mode:'on-device'};}};
 vm.runInContext(read('slide-reader.js'),app.context);
 await app.window.StudyAtlasReader.open({id:'tutor',pdfUrl:'/source.pdf',legacy:false,data:{title:'GH axis',slides:[{n:1,title:'GH relay',explain:'GH stimulates liver IGF-I.',key_points:['IGF-I supports growth.']},{n:2,title:'IGF-I feedback',explain:'IGF-I reduces GH release.'}],chapters:[]}});
 app.window.StudyAtlasReader.ai(1);
 const panel=app.document.querySelector('.atlas-reader-ai'),send=panel.querySelector('[data-ask]');
 panel.querySelector('textarea').value='What is IGF-I?';await send.onclick();
 assert.equal(panel.hidden,false);assert.match(panel.querySelector('.atlas-ai-answer').textContent,/GH stimulates/);
 panel.querySelector('[data-ai-close]').click();assert.equal(panel.hidden,true);
 app.window.StudyAtlasReader.ai(1);assert.equal(panel.hidden,false);assert.match(panel.textContent,/GH stimulates/);
 panel.querySelector('textarea').value='Why?';await send.onclick();
 assert.equal(calls[1].history.length,1);assert.equal(calls[1].history[0].question,'What is IGF-I?');
 assert.match(calls[0].context,/Related slide 2/);assert.equal(panel.querySelectorAll('.atlas-ai-history details').length,1);
 assert.match(app.values.get('atlas-tutor:tutor'),/GH stimulates/);
 app.window.StudyAtlasReader.ai(2);assert.equal(panel.querySelector('.atlas-ai-answer').textContent,'');
});

test('old request callbacks cannot replace a new slide answer or reopen a closed panel',async()=>{
 const app=dom('<html><body><div id="atlasTimerModal"></div><div id="atlasGenDock"></div></body></html>');
 app.context.AbortController=AbortController;const calls=[];
 app.window.StudyAtlasLocalAI={sourceAnswer:()=> 'Source preview.',availability:async()=> 'unavailable',askWithMeta:(q,o)=>new Promise(resolve=>calls.push({o,resolve}))};
 vm.runInContext(read('slide-reader.js'),app.context);
 await app.window.StudyAtlasReader.open({id:'race',pdfUrl:'/source.pdf',legacy:false,data:{title:'Test',slides:[],chapters:[]}});
 const panel=app.document.querySelector('.atlas-reader-ai'),send=panel.querySelector('[data-ask]');
 app.window.StudyAtlasReader.ai(1);panel.querySelector('textarea').value='Explain';const old=send.onclick();
 for(let i=0;i<100&&!calls.length;i++)await Promise.resolve();assert.equal(calls.length,1);
 calls[0].o.onUpdate('First answer.');panel.querySelector('[data-ai-close]').click();
 calls[0].o.onUpdate('Unwanted late text.');assert.equal(panel.hidden,true);assert.equal(panel.querySelector('.atlas-ai-answer').textContent,'First answer.');
 app.window.StudyAtlasReader.ai(2);const next=send.onclick();
 for(let i=0;i<100&&calls.length<2;i++)await Promise.resolve();assert.equal(calls.length,2);
 calls[1].o.onUpdate('New answer.');calls[0].resolve({answer:'Old final answer.',mode:'on-device'});await old;
 assert.equal(panel.querySelector('.atlas-ai-answer').textContent,'New answer.');assert.equal(send.disabled,true);
 calls[1].resolve({answer:'New answer.',mode:'on-device'});await next;assert.equal(send.disabled,false);
});
