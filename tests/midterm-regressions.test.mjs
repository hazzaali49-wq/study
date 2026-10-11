import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

test('endocrine midterm page preserves the agreed assessment structure and full practice map',()=>{
 const h=fs.readFileSync('public/midterm/endocrine-midterm.html','utf8');
 assert.match(h,/30% of module/);assert.match(h,/1 hour/);assert.match(h,/3 clinical cases/);
 assert.equal((h.match(/class="lecturecard"/g)||[]).length,8);
 assert.equal((h.match(/class="rapid"/g)||[]).length,23);
 assert.equal((h.match(/class="case"/g)||[]).length,3);
 assert.match(h,/water balance\/DI/i);assert.match(h,/calcium\/parathyroid/i);assert.match(h,/thyroid synthesis/i);assert.match(h,/pituitary anatomy/i);
 assert.doesNotMatch(h,/fetch\(['"]\/api\/ai\/chat/);
});
test('calcium is wired into the module and cards tolerate lectures without a hosted original PDF',()=>{
 const m=fs.readFileSync('public/modules.js','utf8'),i=fs.readFileSync('public/index.html','utf8'),n=fs.readFileSync('public/study-notebook.js','utf8');
 assert.match(m,/calcium-homeostasis/);assert.match(i,/calcium-homeostasis/);assert.match(n,/calcium-homeostasis/);
 assert.match(i,/l\.original\?/);
 assert.match(i,/Midterm Preparation/);
});

test('exact midterm questions remain distinguished from practice prompts',async()=>{
 const vm=await import('node:vm');const context={window:{},location:{pathname:'/',href:'https://atlas.test/'},URL};
 vm.runInNewContext(fs.readFileSync('public/midterm-links.js','utf8'),context);
 const links=context.window.StudyAtlasMidtermLinks;
 const calcium=links.forSlide('calcium-homeostasis',21);
 assert.ok(calcium.some(q=>q.exact&&q.ref==='Case 2 · Q3'&&q.paper));
 assert.ok(calcium.some(q=>/normal action of parathyroid hormone/.test(q.question)));
 const water=links.forSlide('/lectures/hypothalamus-pituitary.html',19);
 assert.ok(water.some(q=>q.exact&&/kidney/.test(q.question)));
 const practice=links.forSlide('/lectures/calcium-homeostasis.html',8);
 assert.ok(practice.every(q=>!q.exact));assert.ok(practice.every(q=>/practice/i.test(q.label)));
});
