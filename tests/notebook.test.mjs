import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {IDBFactory} from 'fake-indexeddb';
import {dom,read} from './dom.mjs';

const flush=async()=>{for(let i=0;i<220;i++)await Promise.resolve();};
const source={id:'local-mdsa20030-03',moduleId:'mdsa20030',number:3,title:'Hypothalamus and pituitary',href:'/local-lecture.html?id=local-mdsa20030-03',localId:'local-mdsa20030-03',pdfUrl:'blob:temporary'};
const image='data:image/webp;base64,RlVMTFNMSURF';
function freshDB(factory){const app=dom('<html><body></body></html>');app.window.indexedDB=factory;vm.runInContext(read('study-store.js'),app.context);return app;}

test('notes and full-slide attachments persist in IndexedDB across page loads and keep source identity',async()=>{
 const factory=new IDBFactory(),a=freshDB(factory),A=a.window.StudyAtlasStudyStore;
 const note=await A.save(source,{kind:'note',slide:17,title:'Slide 17',text:'My explanation'},{snapshot:image,sketch:'data:image/webp;base64,U0tFVENI'});
 assert.equal(note.hasSnapshot,true);assert.equal(note.pdfUrl,'');
 const b=freshDB(factory),B=b.window.StudyAtlasStudyStore,rows=await B.list({kind:'note',moduleId:'mdsa20030'});
 assert.equal(rows.length,1);assert.equal(rows[0].slide,17);assert.equal(rows[0].localId,source.id);assert.equal((await B.assets(note.id)).snapshot,image);
 assert.equal(rows[0].snapshot,undefined,'list metadata does not decode or load all images');
 await B.save({...source,id:'cloud-other',localId:'',href:'/generated/cloud-other',pdfUrl:'/api/original?id=cloud-other'},{kind:'note',slide:4,text:'Other original PDF'},{snapshot:image});
 assert.equal((await B.list({kind:'note',lectureKey:'mdsa20030::lecture-3'})).length,2);
 assert.equal((await B.list({lectureId:source.id})).length,1);
 await B.remove(note.id);await A.attach(note.id,image);await A.reload();assert.equal((await A.list({lectureId:source.id})).length,0,'a late snapshot in another tab cannot resurrect a deleted note');
 assert.deepEqual(JSON.parse(JSON.stringify(await A.assets(note.id))),{});
});

test('legacy generated notes, renamed lectures, original notes and figure pins migrate without losing sketches or reviving deletions',async()=>{
 const app=dom('<html><body></body></html>'),S=app.window.StudyAtlasStudyStore;
 const old={date:123,context:'Slide 12',slide:12,text:'An older note',sketch:'data:image/png;base64,RFJBVw=='};
 app.values.set('atlasGeneratedNotes.v3',JSON.stringify({'/local-lecture.html::Old title':[old],['lecture:'+source.id]:[old]}));
 const d={...source,aliases:['/local-lecture.html::Old title'],noteKeys:['study-atlas-quicknotes-v1:hypothalamus-pituitary'],pinKeys:['studyAtlasPins:v2:hypo'],figures:[{slide:19,image:'/assets/hypo-slide-19.webp',caption:'Original slide 19'}]};
 app.values.set(d.noteKeys[0],JSON.stringify([{id:'old-note',slideNumber:'19',figureIndex:0,text:'Legacy sketch',strokes:[{points:[{x:.1,y:.2}]}]}]));
 app.values.set(d.pinKeys[0],JSON.stringify([{type:'figure',key:'figure:0',index:0}]));
 await S.register(d);await S.register(d);
 const notes=await S.list({kind:'note',moduleId:'mdsa20030'}),pins=await S.list({kind:'pin'});
 assert.equal(notes.length,2);assert.equal(notes.find(n=>n.slide===19).strokes.length,1);assert.equal(pins[0].slide,19);assert.equal((await S.assets(pins[0].id)).snapshot,'/assets/hypo-slide-19.webp');
 const migrated=notes.find(n=>n.slide===12);assert.equal((await S.assets(migrated.id)).sketch,old.sketch);
 await S.remove(migrated.id);await S.register(d);assert.equal((await S.list({kind:'note'})).length,1);
 assert.equal(JSON.parse(app.values.get('atlasGeneratedNotes.v3'))['/local-lecture.html::Old title'].length,1,'migration preserves the original saved data');
 await S.register({...d,moduleId:'anat20040',number:6});assert.equal((await S.list({kind:'note',moduleId:'anat20040'})).length,1);
});

test('a quota failure never reports a note as saved or clears existing data',async()=>{
 const app=dom('<html><body></body></html>'),S=app.window.StudyAtlasStudyStore;
 await S.register(source);app.window.localStorage.setItem=()=>{throw new Error('Storage quota exceeded');};
 await assert.rejects(S.save(source,{kind:'note',slide:3,text:'Keep my draft'},{snapshot:image}),/quota/);
 assert.equal((await S.list()).length,0);
});

async function toolsApp(){
 const app=dom('<html><head></head><body><main><section class="chapter visualcard" data-slide="2"><h2>Slide two</h2><div data-side="original"><div class="atlas-pane-footer"></div></div><div class="visualcopy"><p>Explanation</p></div></section></main><div class="rail"></div><div class="atlas-reader-ai" hidden></div></body></html>');
 let slide=2;const row=app.document.querySelector('.visualcard');
 app.window.StudyAtlasReader={id:()=>source.id,context:()=>({...source,module_id:source.moduleId}),current:()=>({n:slide,row}),aliases:()=>[],snapshot:async n=>image+'-'+n,go:n=>app.events.push(['go',n])};
 app.context.location.search='?id='+source.id;
 app.window.StudyAtlasInk={create:()=>({redraw(){},sync(){},isDrawing(){return false;}})};
 vm.runInContext(read('generated-tools.js'),app.context);await flush();
 return {...app,setSlide:n=>slide=n};
}

test('saving a note captures the complete selected slide even if the reader moves before Save',async()=>{
 const app=await toolsApp(),d=app.document,S=app.window.StudyAtlasStudyStore;
 d.getElementById('atlasGNote').click();await flush();d.getElementById('atlasGNText').value='My useful note';app.setSlide(8);
 await d.getElementById('atlasGNSave').onclick();
 const rows=await S.list({kind:'note'});assert.equal(rows.length,1);assert.equal(rows[0].slide,2);assert.equal((await S.assets(rows[0].id)).snapshot,image+'-2');
 assert.equal(d.getElementById('atlasGNText').value,'');assert.match(d.getElementById('atlasGNList').textContent,/My useful note/);assert.equal(rows[0].hasSketch,false,'a blank drawing canvas is not saved');
 d.getElementById('atlasGNAll').click();await flush();assert.equal(d.getElementById('atlasNotebook').hidden,false);assert.match(d.querySelector('.atlas-notebook-content').textContent,/My useful note/);
});

test('failed full-slide capture retains the draft and a retry succeeds',async()=>{
 const app=await toolsApp(),d=app.document;app.window.StudyAtlasReader.snapshot=async()=>{throw new Error('PDF unavailable');};
 d.getElementById('atlasGNote').click();await flush();d.getElementById('atlasGNText').value='Do not lose this';await d.getElementById('atlasGNSave').onclick();
 assert.equal(d.getElementById('atlasGNText').value,'Do not lose this');assert.match(d.getElementById('atlasGNStatus').textContent,/draft is still here/);assert.equal((await app.window.StudyAtlasStudyStore.list()).length,0);
 app.window.StudyAtlasReader.snapshot=async()=>image;d.getElementById('atlasGNCurrent').click();await d.getElementById('atlasGNSave').onclick();assert.equal((await app.window.StudyAtlasStudyStore.list()).length,1);
});

test('pin buttons save reusable images, open the board, toggle and keep only one panel open',async()=>{
 const app=await toolsApp(),d=app.document,S=app.window.StudyAtlasStudyStore;
 d.getElementById('atlasGNote').click();const button=d.querySelector('[data-side=original] .atlas-pin-btn-gen');assert.ok(button);
 await button.onclick();assert.equal(d.getElementById('atlasGenBoard').hidden,false);assert.equal(d.getElementById('atlasGenNotes').hidden,true);assert.equal(button.textContent,'Pinned ✓');
 const [pin]=await S.list({kind:'pin'});assert.ok(pin);assert.equal((await S.assets(pin.id)).snapshot,image+'-2');assert.equal(pin.pdfUrl,'');assert.match(d.getElementById('atlasGBList').textContent,/Original slide 2/);
 d.getElementById('atlasGBoard').click();assert.equal(d.getElementById('atlasGenBoard').hidden,true);d.getElementById('atlasGBoard').click();await flush();assert.equal(d.getElementById('atlasGenBoard').hidden,false);
 await button.onclick();assert.equal((await S.list({kind:'pin'})).length,0);assert.equal(button.textContent,'Pin slide');
 d.getElementById('atlasGFocus').click();d.getElementById('atlasGHome').click();assert.deepEqual(JSON.parse(JSON.stringify(app.events.at(-1))),{source:'study-atlas-lecture',goto:'home',moduleId:'mdsa20030'});
});

test('static, cloud and local lecture cards and empty modules expose the same notebook',async()=>{
 const card=(props,link)=>`<article class="lecture" ${props}><div class="lecturevisual"><b>LECTURE 03 · MDSA20030</b></div><div class="lecturebody"><h3>Hypothalamus and pituitary</h3><div class="lecturelinks">${link}</div></div></article>`;
 const app=dom('<html><body><div id="libraries"><section class="library" id="module-mdsa20030"><div class="libhead"></div><div class="lecturegrid">'+card('','<button class="primary" data-lecture="hypo">Study</button><button data-lecture-notes="hypo">Notes</button>')+card('data-local-lecture="local-mdsa20030-03"','<a class="primary" href="/local-lecture.html?id=local-mdsa20030-03">Study</a>')+card('data-netlify-lecture="cloud-3"','<a class="primary" href="/generated/cloud-3">Study</a><a href="/api/original?id=cloud-3">Original</a>')+'</div></section><section class="library" id="module-anat20040"><div class="libhead"></div></section></div></body></html>');
 await app.window.StudyAtlasNotebook.refreshLibrary();const d=app.document,S=app.window.StudyAtlasStudyStore;
 await S.save(source,{kind:'note',slide:5,text:'An accessible note'},{snapshot:image});await app.window.StudyAtlasNotebook.refreshCounts();
 assert.equal(d.querySelectorAll('[data-notebook-lecture]').length,3);assert.equal(d.querySelectorAll('[data-module-notes]').length,2);
 for(const b of d.querySelectorAll('[data-notebook-lecture]'))assert.equal(b.querySelector('.note-count').textContent,'1');
 d.querySelector('[data-module-notes="mdsa20030"]').click();await flush();assert.match(d.querySelector('.atlas-notebook-content').textContent,/An accessible note/);
 d.querySelector('[data-module-notes="anat20040"]').click();await flush();assert.match(d.querySelector('.atlas-notebook-content').textContent,/Nothing saved/);
});

test('reader has a persistent menu, end notes and deep links back to an exact original slide',async()=>{
 const app=dom('<html><body><div id="atlasTimerModal"></div><div id="atlasGenDock"></div></body></html>');app.context.location.search='?id='+source.id+'&slide=17';
 vm.runInContext(read('slide-reader.js'),app.context);
 await app.window.StudyAtlasReader.open({id:source.id,title:source.title,module_id:source.moduleId,number:3,pdfUrl:'blob:temporary',legacy:false,data:{chapters:[]}});
 assert.ok(app.document.querySelector('nav [data-reader-menu]'));assert.ok(app.document.getElementById('atlas-saved-notes'));assert.ok(app.events.some(e=>Array.isArray(e)&&e[1]==='atlas-slide-17'));
 await app.window.StudyAtlasStudyStore.save(source,{kind:'note',slide:17,text:'A note at the end'},{snapshot:image});await flush();assert.match(app.document.querySelector('.atlas-end-notes').textContent,/A note at the end/);
 app.document.querySelector('nav [data-reader-menu]').click();assert.deepEqual(JSON.parse(JSON.stringify(app.events.at(-1))),{source:'study-atlas-lecture',goto:'home',moduleId:''});
 app.window.StudyAtlasNotebook.openSource({lectureId:source.id,slide:17});assert.ok(app.events.some(e=>Array.isArray(e)&&e[1]==='atlas-slide-17'));
});

test('source snapshots use a bounded full-page canvas regardless of reader zoom',async()=>{
 const app=dom('<html><body></body></html>');let used;
 const page={getViewport:({scale})=>({width:1600*scale,height:900*scale}),render:options=>{used=options;return {promise:Promise.resolve()};}};
 assert.match(await app.window.StudyAtlasNotebook.pageSnapshot(page),/^data:image/);assert.equal(used.viewport.width,1440);assert.equal(used.viewport.height,810);
});

test('legacy notes lazily acquire a full slide from the currently open source, while keeping drawing notes visible',async()=>{
 const app=await toolsApp(),S=app.window.StudyAtlasStudyStore,N=app.window.StudyAtlasNotebook;
 const n=await S.save(source,{kind:'note',slide:2,text:'Older note',strokes:[{points:[{x:.1,y:.2},{x:.5,y:.6}]}]});
 const box=app.document.getElementById('atlasGNList');await N.renderList(box,{kind:'note'});
 const card=box.querySelector('.atlas-note-card');box._atlasObserver.callback([{isIntersecting:true,target:card}]);await flush();
 assert.equal(card.querySelector('.atlas-note-image').hidden,false);assert.equal(card.querySelector('.atlas-note-image img').getAttribute('src'),image+'-2');
 assert.ok(card.querySelector('.atlas-note-sketch canvas'));assert.equal((await S.assets(n.id)).snapshot,image+'-2');
});
