import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {dom,read} from './dom.mjs';

function lectures(){
 const window={},context=vm.createContext({window});
 for(const name of ['anterior-thigh-first','anterior-thigh-second','anterior-thigh-course'])vm.runInContext(read(name+'.js'),context);
 const medial=JSON.parse(read('lectures/medial-thigh.html').match(/<script id="atlasLectureData" type="application\/json">([\s\S]*?)<\/script>/)[1]);
 return [window.StudyAtlasAnteriorData,medial];
}

test('both Locomotor lectures retain all 27 slides, readable full explanations and targeted highlights',()=>{
 for(const data of lectures()){
  assert.equal(data.slides.length,27);
  for(const slide of data.slides){
   assert.ok(slide.explain.length<900,'the full explanation fits the reader, slide '+slide.n);
   assert.ok(slide.compact&&slide.definitions.length>=2);
   assert.equal(typeof slide.source,'string','image-only slides may have no extractable source labels');assert.ok(slide.takeaway);
   const text=[slide.explain,slide.takeaway,...slide.key_points].join(' ').toLowerCase();
   assert.ok(slide.emphasis.length>=2&&slide.emphasis.length<=4);
   for(const term of slide.emphasis)assert.ok(text.includes(term.toLowerCase()),'highlight exists in the displayed teaching text: '+term);
  }
 }
});

test('shorter explanations retain the main nerve, canal and clinical exceptions',()=>{
 const [a,b]=lectures(),explain=(data,n)=>data.slides[n-1].explain;
 assert.match(explain(a,9),/nerve.*artery.*vein.*femoral canal/i);assert.match(explain(a,9),/outside the femoral sheath/);
 assert.match(explain(a,10),/lateral—femoral vein/);assert.match(explain(a,14),/both hip and knee/);
 assert.match(explain(a,21),/short-head biceps femoris uses common fibular/);
 assert.match(explain(b,4),/pectineus.*femoral nerve/);assert.match(explain(b,4),/hamstring part.*tibial division.*sciatic/);
 assert.match(explain(b,23),/saphenous nerve leaves separately, before the hiatus/);
 assert.match(explain(b,25),/C, gracilis/);assert.match(explain(b,27),/between obturator externus and pectineus/);
 assert.ok(b.slides[14].annotation_notes.some(s=>/cannot use plate/.test(s)),'uploaded wording is retained alongside its correction');
 assert.match(b.slides[14].annotation_explanation,/too absolute.*plates have selected uses/);
 assert.equal(a.questions.length,22);assert.deepEqual(Array.from(a.questions.slice(-3),q=>q.answer_index),[0,3,3]);
});

test('important facts render as safe highlighted text, and compact glossaries keep uploaded notes visible',async()=>{
 const app=dom('<html><body><div id="atlasTimerModal"></div><div id="atlasGenDock"></div></body></html>');
 vm.runInContext(read('slide-reader.js'),app.context);
 const phrase='outside (sheath)',unsafe='<img src=x onerror=alert(1)>';
 await app.window.StudyAtlasReader.open({id:'compact-render',allowMissingOriginal:true,legacy:false,data:{slide_count:2,slides:[
  {n:1,title:'A concise explanation',source:'Original labels',explain:'The nerve is '+phrase+'. '+unsafe,emphasis:[phrase,unsafe],compact:true,definitions:[{term:'Sheath',meaning:'A tissue sleeve.'}],takeaway:'Keep the nerve outside.',study_focus:'Important relationship',annotation_notes:['Keep this uploaded note.'],annotation_explanation:'Clarification remains available.'},
  {n:2,title:'Other lecture style',source:'Other source',explain:'Unchanged default.',definitions:[{term:'Term',meaning:'Meaning.'}]}
 ],chapters:[]}});
 const first=app.document.querySelector('#atlas-slide-1 .atlas-teaching-copy');
 assert.deepEqual(Array.from(first.querySelectorAll('mark'),n=>n.textContent),[phrase,unsafe]);assert.equal(first.querySelector('img'),null);
 assert.equal(first.querySelector('.atlas-term-glossary').hasAttribute('open'),false);
 assert.equal(first.querySelector('.atlas-uploaded-notes').hasAttribute('open'),true);
 assert.match(first.textContent,/Important relationship/);assert.match(first.textContent,/Keep this uploaded note/);assert.match(first.textContent,/Clarification remains/);
 assert.equal(app.document.querySelector('#atlas-slide-2 .atlas-term-glossary'),null,'other lecture layouts keep their existing definition display');
});
