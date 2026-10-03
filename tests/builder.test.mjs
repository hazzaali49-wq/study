import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import catalog from '../public/course-catalog.js';
import notes from '../public/slide-notes.js';
const source=fs.readFileSync(new URL('../public/local-builder.js',import.meta.url),'utf8');
function setup(pages,old=[]){
 const saved=new Map(old.map(l=>[l.id,l]));let network=0;
 const doc={numPages:pages.length,getPage:async n=>({...pages[n-1],cleanup(){}}),destroy:async()=>{}};
 const window={StudyAtlasCatalog:catalog,StudyAtlasSlideNotes:notes,StudyAtlasPDF:{load:async()=>doc,readPage:async p=>p},StudyAtlasLocalAI:{availability:async()=> 'unavailable'},StudyAtlasLocalDB:{all:async()=>[...saved.values()],get:async id=>saved.get(id),put:async l=>saved.set(l.id,l)},dispatchEvent(){},fetch(){network++;}};
 vm.runInNewContext(source,{window,setTimeout,Blob,File,Math,Date,CustomEvent:class {}});return {builder:window.StudyAtlasLocalBuilder,saved,network:()=>network};
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
