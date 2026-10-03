import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import catalog from '../public/course-catalog.js';
import notes from '../public/slide-notes.js';
import learning from '../public/study-learning.js';
const source=fs.readFileSync(new URL('../public/local-builder.js',import.meta.url),'utf8');
function setup(pages,old=[]){
 const saved=new Map(old.map(l=>[l.id,l]));let network=0;
 const doc={numPages:pages.length,getPage:async n=>({...pages[n-1],cleanup(){}}),destroy:async()=>{}};
 const window={StudyAtlasCatalog:catalog,StudyAtlasSlideNotes:notes,StudyAtlasLearning:learning,StudyAtlasPDF:{load:async()=>doc,readPage:async p=>p},StudyAtlasLocalAI:{availability:async()=> 'unavailable'},StudyAtlasLocalDB:{all:async()=>[...saved.values()],get:async id=>saved.get(id),put:async l=>saved.set(l.id,l)},dispatchEvent(){},fetch(){network++;}};
 vm.runInNewContext(source,{window,setTimeout,Blob,File,Math,Date,CustomEvent:class {}});return {window,builder:window.StudyAtlasLocalBuilder,saved,network:()=>network};
}
const pages=[{n:1,lines:['Cover','A course'],text:'Cover A course'},{n:2,lines:['Learning outcomes','Know the hormones'],text:'Learning outcomes Know the hormones'},{n:3,lines:['GH','Growth hormone acts on the liver.'],text:'GH\nGrowth hormone acts on the liver.'},{n:4,lines:[],text:''},{n:5,lines:['Feedback','IGF-I helps regulate the axis.'],text:'Feedback\nIGF-I helps regulate the axis.'}];
test('uploads retain every original slide, including image-only and administrative slides',async()=>{
 const app=setup(pages),file=new File(['%PDF-test'],'MDSA20030 GH IGF Axis.pdf',{type:'application/pdf'});
 const result=await app.builder.build({file,module:catalog.getModule('MDSA20030'),title:'Growth Hormone / IGF-I Axis',lectureNumber:6});
 assert.equal(result.lecture.data.slides.length,5);assert.deepEqual(Array.from(result.lecture.data.slides,s=>s.n),[1,2,3,4,5]);
 assert.equal(result.lecture.pdf.size,file.size);assert.equal(result.lecture.data.slides[3].kind,'visual');assert.equal(app.network(),0);
});
test('manual lecture identity is honored and rebuilding keeps the existing ID',async()=>{
 const module=catalog.getModule('MDSA20030'),app=setup(pages,[{id:'previous-stable-id',module_id:module.id,number:'06',title:'Old title',created:10}]);
 const result=await app.builder.build({file:new File(['pdf'],'MDSA20030 GH IGF Axis.pdf'),module,title:'My checked lecture title',lectureNumber:6,metadataConfirmed:true});
 assert.equal(result.lecture.id,'previous-stable-id');assert.equal(result.lecture.title,'My checked lecture title');assert.equal(app.saved.size,1);assert.equal(result.lecture.created,10);assert.equal(result.lecture.metadata_confirmed,true);
});
test('a missing lecture number remains unknown rather than becoming the first lecture',async()=>{
 const app=setup(pages),result=await app.builder.build({file:new File(['pdf'],'Unknown.pdf'),module:catalog.getModule('MDSA20030'),title:'New topic'});
 assert.equal(result.lecture.number,'—');
 assert.equal((await app.builder.detect({name:'Unknown.pdf'},[])).ok,false);
 assert.equal((await app.builder.detect({name:'MDSA20030 Unknown.pdf'},[])).needs_review,true);
});

test('on-device enhancement adds recall, takeaways and revision while a failed batch does not drop later slides',async()=>{
 const sourcePages=Array.from({length:7},(_,i)=>({n:i+2,title:'Mechanism '+i,lines:['Mechanism '+i,'A source teaching point with enough detail.'],text:'Mechanism '+i+'\nA source teaching point with enough detail.'}));
 const app=setup(sourcePages),data=app.builder.fallback('A lecture',sourcePages),lecture={id:'enhance',build_token:'token',data};app.saved.set('enhance',lecture);
 let calls=0;app.window.StudyAtlasLocalAI={availability:async image=>image?'unavailable':'available',complete:async prompt=>{calls++;if(calls===1)throw new Error('Timed out');const numbers=[...prompt.matchAll(/SLIDE (\d+)/g)].map(m=>Number(m[1]));return JSON.stringify({slides:numbers.map(n=>({n,explain:'A clear explanation of the supplied source.',takeaway:'Keep the mechanism connected.',revision:['A key contrast','The complete sequence'],key_points:['Input → response → outcome'],questions:[{question:'What connects the input to the outcome?',explanation:'The response connects them.'}],labels:[]}))});}};
 await app.builder.enhance(lecture);
 assert.equal(calls,3);assert.equal(lecture.data.slides.length,7);assert.ok(lecture.data.slides.at(-1).questions.length);assert.ok(lecture.data.slides.at(-1).revision.length);assert.equal(lecture.data.slides[0].origin,'source');
 const revision=learning.prepare(lecture.data);assert.ok(revision.final_understanding.some(c=>c.explain.includes('Keep the mechanism')));assert.ok(revision.cheat_sheet.some(c=>c.bullets.includes('The complete sequence')));assert.equal(app.network(),0);
});
