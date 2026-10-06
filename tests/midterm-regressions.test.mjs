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

test('midterm slide links are shared between review and lecture slide reader',()=>{
 const links=fs.readFileSync('public/midterm-links.js','utf8');
 const reader=fs.readFileSync('public/slide-reader.js','utf8');
 const css=fs.readFileSync('public/slide-reader.css','utf8');
 const mid=fs.readFileSync('public/midterm/endocrine-midterm.html','utf8');
 const calcium=fs.readFileSync('public/lectures/calcium-homeostasis.html','utf8');
 assert.match(links,/Related midterm question/);
 assert.match(links,/water-deprivation test/i);
 assert.match(links,/thyroid-hormone synthesis/i);
 assert.match(links,/PTH raise plasma calcium/i);
 assert.match(reader,/StudyAtlasMidtermLinks/);
 assert.match(reader,/MIDTERM IMPORTANT SLIDE/);
 assert.match(css,/atlas-midterm-link/);
 assert.match(mid,/addRelatedMidtermQuestions/);
 assert.match(calcium,/StudyAtlasMidtermLinks/);
});
