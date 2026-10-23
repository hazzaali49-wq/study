import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import vm from 'node:vm';
import {dom,read} from './dom.mjs';

const manifest=JSON.parse(read('lecture-slides.json'));
const catalog=JSON.parse(read('index.html').match(/<script id="module-data" type="application\/json">([\s\S]*?)<\/script>/)[1]);
const dataFor=slug=>JSON.parse(read('lectures/'+slug+'.html').match(/<script id="atlasLectureData" type="application\/json">([\s\S]*?)<\/script>/)[1]);

for(const [slug,count,number,questions] of [['knee-joint',36,'07',28],['lumbar-plexus',23,'08',21]]){
 test(slug+' has an opening dashboard card, the unchanged original, and teaching for every source page',()=>{
  const card=catalog.find(m=>m.id==='anat20060').lectures.find(l=>l.id===slug),entry=manifest.lectures[slug],data=dataFor(slug);
  assert.equal(card.number,number);assert.equal('/'+card.original,entry.pdfPath);
  const bytes=fs.readFileSync('public'+entry.pdfPath);
  assert.equal(bytes.subarray(0,4).toString(),'%PDF');assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'),entry.sha256);
  assert.equal(data.slides.length,count);assert.equal(entry.pages.length,count);assert.equal(data.questions.length,questions);
  assert.deepEqual(data.slides.map(s=>s.n),Array.from({length:count},(_,i)=>i+1));
  for(const slide of data.slides){
   assert.ok(slide.explain&&slide.explain.length<900,'reader must show the full explanation for '+slide.n);
   assert.ok(slide.takeaway&&slide.definitions.length>=2);
   assert.ok(slide.compact&&slide.emphasis.length>=2);
   assert.equal(slide.source,entry.pages[slide.n-1].text);
  }
  assert.ok(data.cheat_sheet.some(c=>c.html?.includes('<table>')));
  assert.equal(data.chapters[0].slide_start,1);assert.equal(data.chapters.at(-1).slide_end,count);
  assert.ok(data.questions.every(q=>q.options.length===5&&q.explanation&&q.slide_refs.every(n=>n>=1&&n<=count)));
 });
}

test('clinical teaching distinguishes the opposite tendon failures and the two reflex limbs',()=>{
 const knee=dataFor('knee-joint'),lumbar=dataFor('lumbar-plexus');
 assert.match(knee.slides[20].takeaway,/Patellar tendon tear.*alta.*Quadriceps tendon tear.*baja/);
 assert.match(knee.slides[34].explain,/quadriceps tendon rupture/);
 assert.match(knee.slides[34].explain,/above the kneecaps/);
 assert.match(lumbar.slides[12].takeaway,/ilioinguinal IN.*genitofemoral OUT/);
 assert.match(lumbar.slides[18].explain,/sensory-only.*not weaken quadriceps/);
 assert.match(lumbar.slides[20].explain,/outside the femoral sheath/);
 assert.match(lumbar.slides[21].extra,/internus.*not an obturator-nerve target/);
});

test('new lecture questions give immediate feedback and move the correct answer on retry',()=>{
 const q=dataFor('knee-joint').questions[0];
 const app=dom(`<html><body data-instant-checks><div class="q" data-answer="${q.answer_index}"><div class="atlas-options">${q.options.map((option,i)=>`<label><input type="radio" name="q" value="${i}"><span>${option}</span></label>`).join('')}</div><div class="feedback" data-correct="${q.options[q.answer_index]}" data-exp="${q.explanation}"></div></div></body></html>`);
 vm.runInContext(read('lecture-quick-checks.js'),app.context);
 const question=app.document.querySelector('.q'),correctText=q.options[q.answer_index];
 question.querySelector(`input[value="${q.answer_index}"]`).dispatchEvent(new app.window.Event('change',{bubbles:true}));
 assert.match(question.querySelector('.feedback').textContent,/^Correct\./);
 assert.match(question.querySelector('.feedback').textContent,/Gastrocnemius/);
 question.querySelector('[data-retry-shuffle]').click();
 assert.notEqual(Number(question.dataset.answer),q.answer_index);
 assert.equal(question.querySelectorAll('label')[Number(question.dataset.answer)].textContent,correctText);
 assert.equal(question.querySelector('.feedback').textContent,'');
 const wrong=question.querySelectorAll('input')[(Number(question.dataset.answer)+1)%5];
 wrong.dispatchEvent(new app.window.Event('change',{bubbles:true}));
 assert.match(question.querySelector('.feedback').textContent,/^Not quite\. Correct answer:/);
});
