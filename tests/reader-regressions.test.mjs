import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import learning from '../public/study-learning.js';
import visuals from '../public/slide-visuals.js';
import {dom,read} from './dom.mjs';

const flush=async()=>{for(let i=0;i<180;i++)await Promise.resolve();};

test('the original lecture keeps all 16 quiz questions, 20 flashcards and paragraph-based cheat sheets in slide view',async()=>{
 const html=read('lectures/hypothalamus-pituitary.html'),app=dom(html);
 app.context.location.pathname='/lectures/hypothalamus-pituitary.html';app.context.location.href='https://atlas.test/lectures/hypothalamus-pituitary.html';
 for(const id of ['atlasTimerModal','atlasGenDock']){const el=app.document.createElement('div');el.id=id;app.document.body.appendChild(el);}
 const main=[...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g)].find(m=>m[2].includes('const flashcards='));
 vm.runInContext(main[2],app.context);
 vm.runInContext(read('slide-reader.js'),app.context);await flush();
 const root=app.document.querySelector('#atlasSlideReader');assert.ok(root);
 assert.equal(root.querySelectorAll('.atlas-slide-row').length,28);
 assert.equal(root.querySelectorAll('.q').length,16);
 assert.equal(root.querySelectorAll('.atlas-flashcard').length,20);
 const sheet=root.querySelector('#atlas-revision');assert.match(sheet.textContent,/Herring bodies/);assert.match(sheet.textContent,/pituicytes/);assert.match(sheet.textContent,/AQP2/);
 assert.equal(sheet.querySelectorAll('.atlas-revision-card').length,8);
 assert.ok(root.querySelector('#atlas-slide-19 .q'));
 assert.match(root.querySelector('#atlas-understanding').textContent,/pituitary/i);
 const q=root.querySelector('#atlas-slide-19 .q');q.querySelector('input[value="0"]').setAttribute('checked','');q.querySelector('[data-check]').click();assert.match(q.querySelector('.feedback').textContent,/Correct.*aquaporin/i);
 assert.match(root.querySelector('nav select').innerHTML,/Final understanding/);
});

test('focus closes open panels, signals the containing library and restores with the same button',async()=>{
 const app=dom('<html><body><main><section class="chapter"><div class="visualcard"><div class="visualframe"></div><div class="visualcopy"></div></div></section></main><div class="rail"></div><section class="atlas-reader-ai"></section></body></html>');
 app.window.StudyAtlasInk={create:()=>({redraw(){},sync(){},isDrawing(){return false;}})};
 vm.runInContext(read('generated-tools.js'),app.context);await flush();
 const button=app.document.getElementById('atlasGFocus');assert.ok(button);
 app.document.getElementById('atlasGenNotes').hidden=false;app.document.getElementById('atlasGenBoard').hidden=false;
 button.click();assert.equal(button.getAttribute('aria-pressed'),'true');assert.match(button.textContent,/Show panels/);
 for(const selector of ['#atlasGenTools','#atlasGenNotes','#atlasGenBoard','.atlas-reader-ai'])assert.equal(app.document.querySelector(selector).hidden,true);
 assert.deepEqual(JSON.parse(JSON.stringify(app.events.at(-1))),{source:'study-atlas-focus',focus:true});
 button.click();assert.equal(app.document.body.classList.contains('atlas-gen-focus'),false);assert.match(button.textContent,/Hide panels/);
 assert.match(read('slide-reader.css'),/atlas-gen-focus[^}]*atlas-reader-nav\{display:none!important\}/);
});

test('caption labels become a teaching key; raster boxes require a high-confidence exact match',()=>{
 const text='SMG submandibular gland, OH omohyoid muscle, HB hyoid bone, SC sternocleidomastoid muscle, TC thyroid cartilage, CT cricothyroid muscle, VN vagus nerve, CCA common carotid artery, IJV internal jugular vein, TG thyroid gland, SH sternohyoid muscle, ST sternothyroid muscle';
 const p=visuals.plan({labels:[]},{text,boxes:[{text,x:.1,y:.8,w:.8,h:.05}]});
 assert.equal(p.labels.length,12);assert.equal(p.located.length,0);assert.equal(p.labels.find(l=>l.text==='TG').explain,'thyroid gland');
 const boxes=[{text:'TG',x:.6,y:.4,w:.04,h:.02,confidence:92},{text:'TC',x:.6,y:.3,w:.04,h:.02,confidence:25}];
 assert.equal(visuals.locate(p.labels,boxes).length,1);
 assert.ok(visuals.cropFor(visuals.locate(p.labels,boxes)).w<.3);
 assert.deepEqual(visuals.sequences({explain:'AVP → V2 receptor → cAMP → AQP2 insertion → water reabsorption.'},{text:''})[0],['AVP','V2 receptor','cAMP','AQP2 insertion','water reabsorption.']);
});

test('unknown or unlabelled images are never presented as an unedited duplicate on the study side',async()=>{
 const app=dom('<html><body><div id="atlasTimerModal"></div><div id="atlasGenDock"></div></body></html>');
 vm.runInContext(read('slide-reader.js'),app.context);
 await app.window.StudyAtlasReader.open({id:'test',pdfUrl:'/original.pdf',legacy:false,data:{title:'Anatomy',slides:[{n:1,kind:'visual',title:'Unlabelled picture',explain:'A source explanation.',key_points:[]}],chapters:[]}});
 assert.equal(app.document.querySelectorAll('[data-side="teaching"] .atlas-slide-bitmap').length,0);
 assert.equal(app.document.querySelectorAll('[data-side="original"] .atlas-slide-bitmap').length,28);
});

export {dom,read};

test('one lecture card spans static, cloud and local versions without losing source links or completion',()=>{
 const card=(attrs,title,link,slideCount)=>`<article class="lecture" ${attrs}><div class="lecturevisual"><b>LECTURE 03 · MDSA20030</b></div><div class="lecturebody"><h3>${title}</h3><div class="micro">${slideCount} original slides</div><div class="lecturelinks">${link}</div></div></article>`;
 const app=dom('<html><body><span id="lectureCount"></span><section class="library" id="module-mdsa20030"><div class="libhead"><small></small></div><div class="lecturegrid">'+
 card('','Hypothalamus & Pituitary Gland','<button class="primary" data-lecture="hypo">Study</button><button data-lecture-notes="hypo">Notes</button><a href="/original.pdf">Original</a>',28)+
 card('data-netlify-lecture="cloud-3" data-saved-at="100"','Hypothalamus and Pituitary','<a class="primary" href="/generated/cloud-3">Study</a><a href="/api/original?id=cloud-3">Original</a>',42)+
 card('data-local-lecture="local-3" data-saved-at="200"','Hypothalamus and Pituitary','<a class="primary" href="/local-lecture.html?id=local-3">Study</a><button data-local-original="local-3">Original</button>',42)+
 '</div></section></body></html>');
 let opened=0;app.document.querySelector('[data-lecture="hypo"]').onclick=()=>opened++;
 app.values.set('atlasLectureProgress.v2',JSON.stringify({'mdsa20030::Hypothalamus & Pituitary Gland':true}));
 vm.runInContext(read('library-cards.js'),app.context);
 assert.equal(app.document.querySelectorAll('.lecture').length,1);assert.equal(app.document.querySelectorAll('.atlas-lecture-version').length,2);
 assert.equal(app.document.querySelector('.lecture').dataset.localLecture,'local-3');assert.equal(app.document.querySelector('.libhead small').textContent,'1 lecture');
 assert.equal(JSON.parse(app.values.get('atlasLectureProgress.v2'))['mdsa20030::lecture-3'],true);
 app.document.querySelector('[data-lecture="hypo"]').click();assert.equal(opened,1);
 app.window.StudyAtlasLibraryCards.reconcile();assert.equal(app.document.querySelectorAll('.atlas-lecture-version').length,2);
 app.window.StudyAtlasLibraryCards.restore();app.document.querySelector('[data-local-lecture]').remove();app.window.StudyAtlasLibraryCards.reconcile();
 assert.equal(app.document.querySelector('.lecture').dataset.netlifyLecture,'cloud-3');assert.ok(app.document.querySelector('[href="/original.pdf"]'));assert.ok(app.document.querySelector('[data-lecture-notes="hypo"]'));
});

test('unrecognised lecture numbers remain separate while known lecture numbers share progress',async()=>{
 const {default:cards}=await import('../public/library-cards.js');
 assert.equal(cards.identity('endocrine','03','a'),cards.identity('endocrine',3,'b'));
 assert.notEqual(cards.identity('endocrine','—','a'),cards.identity('endocrine','—','b'));
});

test('older local lecture revision sheets gain complete points and source recall without duplicate topics',()=>{
 const data={notes_version:2,cheat_sheet:[{heading:'Water',bullets:['Point 1','Point 2']}],chapters:[{title:'Water balance',slide_start:3,slide_end:4,summary:'Water balance depends on kidney responses.'}],slides:[{n:3,title:'Water',kind:'teaching',origin:'source',key_points:['Point 1','Point 2','Point 3: an important additional mechanism.'],explain:'A simplified explanation.'}]};
 const result=learning.prepare(data);assert.equal(result.cheat_sheet.length,1);assert.equal(result.cheat_sheet[0].bullets.length,3);assert.ok(result.questions[0].explanation.includes('Point 3'));assert.ok(result.final_understanding.length);
});

test('anatomy relationship schematics and asterisk legends only use explicit source statements',()=>{
 const p=visuals.plan({explain:'The thyroid sits anterior to the trachea and is flanked laterally by structures in the carotid sheath.'},{text:'Asterisk Levator glandulae thyroideae, TG thyroid gland',boxes:[]});
 assert.equal(p.labels[0].explain,'Levator glandulae thyroideae');
 assert.deepEqual(p.relationships,[{subject:'thyroid',relation:'anterior to',object:'trachea'}]);
 assert.deepEqual(visuals.relationships({explain:'A thyroid picture without any stated location.'},{text:''}),[]);
});

test('similar recall prompts on different slides survive grouping into chapters',()=>{
 const slides=[3,4].map(n=>({n,kind:'teaching',title:'A mechanism',key_points:['Input '+n+' → response '+n+' → outcome '+n]}));
 const result=learning.prepare({slides,chapters:[{questions:slides.flatMap(learning.recall)}]});
 assert.equal(result.questions.length,2);assert.equal(result.flashcards.length,2);assert.deepEqual(result.questions.map(q=>q.slide_refs[0]),[3,4]);
});

test('anterior pituitary preserves its complete original question and flashcard sets',async()=>{
 const html=read('lectures/anterior-pituitary.html'),app=dom(html);
 app.context.location.pathname='/lectures/anterior-pituitary.html';
 app.context.location.href='https://atlas.test/lectures/anterior-pituitary.html';
 const load=app.window.StudyAtlasPDF.load;app.window.StudyAtlasPDF.load=async()=>({...await load(),numPages:29});
 for(const id of ['atlasTimerModal','atlasGenDock']){const el=app.document.createElement('div');el.id=id;app.document.body.appendChild(el);}
 const main=[...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g)].find(m=>m[2].includes('const flashcards='));
 vm.runInContext(main[2],app.context);const counts=vm.runInContext('({questions:quiz.length,flashcards:flashcards.length})',app.context);
 vm.runInContext(read('slide-reader.js'),app.context);await flush();
 assert.equal(app.document.querySelectorAll('#atlasSlideReader .q').length,counts.questions);
 assert.equal(app.document.querySelectorAll('#atlasSlideReader .atlas-flashcard').length,counts.flashcards);
 assert.equal(app.document.querySelectorAll('#atlasSlideReader .atlas-slide-row').length,29);
 assert.match(app.document.querySelector('#atlas-revision').textContent,/prolactin/i);
});
