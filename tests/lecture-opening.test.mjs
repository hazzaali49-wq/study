import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {dom,read} from './dom.mjs';
const manifest=JSON.parse(read('lecture-slides.json'));
const flush=async()=>{for(let i=0;i<500;i++)await Promise.resolve();};
function install(app){
 app.context.Blob=Blob;app.context.AbortController=AbortController;app.context.setTimeout=setTimeout;app.context.clearTimeout=clearTimeout;
 let draws=0;app.window.HTMLCanvasElement.prototype.getContext=()=>({drawImage(){draws++;}});
 app.context.Image=class{set src(value){const bytes=fs.readFileSync('public'+value);assert.equal(bytes.toString('ascii',0,4),'RIFF');assert.equal(bytes.toString('ascii',8,12),'WEBP');queueMicrotask(()=>this.onload?.());}};
 app.context.fetch=async url=>{if(url.startsWith('/lecture-slides.json'))return {ok:true,json:async()=>manifest};if(url.startsWith('/resources/calcium-pdf64/'))return {ok:true,text:async()=>fs.readFileSync('public'+url,'utf8')};throw Error('Unexpected network request: '+url);};
 app.context.atob=s=>Buffer.from(s,'base64').toString('binary');app.context.Uint8Array=Uint8Array;
 vm.runInContext(read('pdf-source.js'),app.context);
 return ()=>draws;
}
for(const [slug,entry] of Object.entries(manifest.lectures))test(slug+' opens and paints every original slide without a CDN',async()=>{
 const html=read('lectures/'+slug+'.html'),app=dom(html),draws=install(app);
 app.context.location.pathname='/lectures/'+slug+'.html';app.context.location.href='https://atlas.test/lectures/'+slug+'.html';
 for(const id of ['atlasTimerModal','atlasGenDock']){const e=app.document.createElement('div');e.id=id;app.document.body.appendChild(e);}
 const main=[...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g)].find(m=>m[2].includes('const flashcards='));if(main)vm.runInContext(main[2],app.context);
 vm.runInContext(read('slide-reader.js'),app.context);await flush();
 for(let i=0;i<40&&!app.document.querySelector('.atlas-slide-row');i++)await new Promise(r=>setTimeout(r,5));
 assert.equal(app.document.querySelectorAll('.atlas-slide-row').length,entry.pages.length,app.document.querySelector('#atlasReaderError')?.textContent||'Reader did not open');
 for(let n=1;n<=entry.pages.length;n++)await app.window.StudyAtlasReader.render(n,true);
 assert.equal(draws(),entry.pages.length);
 assert.equal(app.document.querySelectorAll('.atlas-source-loading').length,0);
 assert.ok(app.document.querySelector('#atlas-revision'));
 const hasMidterm=entry.pages.some(p=>app.window.StudyAtlasMidtermLinks.forSlide(slug,p.n).length);
 if(hasMidterm)assert.ok(app.document.querySelectorAll('.atlas-midterm-important').length);
 if(entry.annotated){assert.ok(app.document.querySelectorAll('.atlas-uploaded-notes').length);assert.ok(app.document.querySelectorAll('.atlas-uploaded-clarification').length);assert.equal(app.window.StudyAtlasReader.context().module_id,'anat20060');}
});
test('PDF text extraction failure does not block the original slide image',async()=>{
 const app=dom('<html><body><div id="atlasTimerModal"></div><div id="atlasGenDock"></div></body></html>');
 app.window.StudyAtlasPDF.readPage=async()=>{throw Error('Bad text layer');};
 vm.runInContext(read('slide-reader.js'),app.context);
 await app.window.StudyAtlasReader.open({id:'test',pdfUrl:'/upload.pdf',legacy:false,data:{slides:[{n:1,explain:'Preserved explanation.'}],chapters:[]}});
 assert.equal(app.document.querySelector('#atlas-slide-1 .atlas-source-loading'),null);
 assert.match(app.document.querySelector('#atlas-slide-1').textContent,/Preserved explanation/);
});
