import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const file=(p)=>fs.readFileSync(new URL('../public/'+p,import.meta.url),'utf8');
function lecture(){
 const window={};
 const context=vm.createContext({window});
 for(const path of ['anterior-thigh-first.js','anterior-thigh-second.js','anterior-thigh-course.js']){
  const script=new vm.Script(file(path),{filename:path});
  script.runInContext(context);
 }
 return window.StudyAtlasAnteriorData;
}
test('anterior thigh Lecture 5 teaches all 27 actual source pages',()=>{
 const data=lecture();
 assert.equal(data.slides.length,27);
 assert.deepEqual(Array.from(data.slides,slide=>slide.n),Array.from({length:27},(_,i)=>i+1));
 for(const s of data.slides){
  assert.ok(s.title&&s.explain.length>250,'explain page '+s.n);
  assert.ok(s.takeaway&&s.key_points?.length>=3,'recall page '+s.n);
  assert.ok(Array.isArray(s.definitions)&&s.definitions.length>=2,'define anatomy page '+s.n);
  assert.ok(s.definitions.every(d=>typeof d.term==='string'&&typeof d.meaning==='string'),'definitions '+s.n);
  assert.ok(s.source?.length>15,'source labels '+s.n);
 }
 assert.equal(data.chapters.length,6);
 assert.equal(data.chapters[0].slide_start,1);
 assert.equal(data.chapters.at(-1).slide_end,27);
});
test('original lecture final three questions stay exact in substance and feedback is supplied',()=>{
 const data=lecture();
 assert.equal(data.questions.length,22);
 assert.ok(data.questions.every(q=>q.options.length===5&&q.answer_index>=0&&q.answer_index<=4&&q.explanation&&q.slide_refs?.length));
 const originals=data.questions.slice(-3);
 assert.deepEqual(Array.from(originals,q=>q.slide_refs[0]),[25,26,27]);
 assert.deepEqual(Array.from(originals,q=>q.answer_index),[0,3,3]);
 assert.match(originals[0].question,/quadriceps.*EXCEPT/i);
 assert.match(originals[1].question,/femoral canal/i);
 assert.match(originals[2].question,/femoral ring/i);
});
test('Lecture 5 card exists and its reader safely attaches the original only with local consent',()=>{
 const index=file('index.html').match(/<script id="module-data" type="application\/json">([\s\S]*?)<\/script>/);
 assert.ok(index);
 const modules=JSON.parse(index[1]),loco=modules.find(m=>m.id==='anat20060');
 assert.equal(loco.lectures.find(l=>l.id==='anterior-thigh')?.number,'05');
 const html=file('lectures/anterior-thigh.html');
 assert.match(html,/Attach original PDF/);
 assert.match(html,/sourcePicker/);
 assert.match(html,/indexedDB\.open/);
 assert.match(html,/\bStudyAtlasReader\.open/);
 assert.ok(!html.includes('openai.com')&&!html.includes('api/ai-chat'),'no paid AI during attachment');
 const scripts=[...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)];
 const executable=scripts.at(-1)[1];
 assert.doesNotThrow(()=>new vm.Script(executable,{filename:'anterior-thigh.html:script'}));
});
