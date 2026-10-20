import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {dom,read} from './dom.mjs';

async function setup(){
 const app=dom('<html><body><div id="atlasTimerModal"></div><div id="atlasGenDock"></div></body></html>');
 vm.runInContext(read('slide-reader.js'),app.context);
 await app.window.StudyAtlasReader.open({id:'study-view',pdfUrl:'/upload.pdf',legacy:false,data:{slides:[],chapters:[]}});
 return app;
}

test('study view fills the window without browser fullscreen and preserves drawing elements across navigation',async()=>{
 const app=await setup(),d=app.document,w=app.window;
 const first=d.querySelector('#atlas-slide-1'),source=first.querySelector('.atlas-source-stage');
 const savedInk=d.createElement('canvas');savedInk.className='atlas-gpage-canvas';source.appendChild(savedInk);
 let stopped=0,fullscreenRequests=0;w.StudyAtlasInk={stop:()=>stopped++,isDrawing:()=>false};d.documentElement.requestFullscreen=()=>fullscreenRequests++;
 d.body.classList.add('atlas-gdrawing');
 const button=d.querySelector('[data-study-view]');button.click();
 assert.equal(d.body.classList.contains('atlas-study-view'),true);assert.equal(d.documentElement.classList.contains('atlas-study-view'),true);
 assert.equal(button.textContent,'Exit study view');assert.equal(button.getAttribute('aria-pressed'),'true');
 assert.equal(w.StudyAtlasReader.current().n,1);assert.equal(d.querySelectorAll('.atlas-study-current').length,1);
 assert.equal(d.body.classList.contains('atlas-gdrawing'),true,'entering study view keeps the selected drawing tool');
 d.querySelector('[data-next]').click();assert.equal(w.StudyAtlasReader.current().n,2);assert.equal(d.querySelector('nav input').value,'2');
 d.querySelector('[data-prev]').click();assert.equal(w.StudyAtlasReader.current().n,1);
 assert.equal(first.querySelector('.atlas-gpage-canvas'),savedInk,'view changes retain the same annotated slide nodes');
 for(let i=0;i<50;i++)source.dispatchEvent(new w.Event('pointermove',{bubbles:true}));
 assert.equal(button.textContent,'Exit study view','pen motion never reveals or changes an exit overlay');
 button.click();assert.equal(d.body.classList.contains('atlas-study-view'),false);assert.equal(d.documentElement.classList.contains('atlas-study-view'),false);
 assert.equal(d.querySelectorAll('.atlas-study-current').length,0);assert.equal(first.querySelector('.atlas-gpage-canvas'),savedInk);
 assert.equal(fullscreenRequests,0);assert.ok(stopped>=2,'geometry changes finish the current stroke first');
});

test('study view can leave an existing DOM fullscreen session and Escape returns to the normal reader',async()=>{
 const app=await setup(),d=app.document,w=app.window;let exits=0;
 d.fullscreenElement=d.documentElement;d.exitFullscreen=async()=>{exits++;d.fullscreenElement=null;};
 d.querySelector('[data-study-view]').click();await new Promise(resolve=>setImmediate(resolve));
 assert.equal(exits,1);assert.equal(d.body.classList.contains('atlas-study-view'),true);
 const escape=()=>{const e=new w.Event('keydown',{bubbles:true,cancelable:true});e.key='Escape';d.body.dispatchEvent(e);};
 d.body.classList.add('atlas-gdrawing');escape();assert.equal(d.body.classList.contains('atlas-study-view'),true,'Escape first belongs to drawing controls');
 d.body.classList.remove('atlas-gdrawing');escape();assert.equal(d.body.classList.contains('atlas-study-view'),false);
 assert.equal(d.querySelector('[data-study-view]').getAttribute('aria-pressed'),'false');
});

test('jumping to revision leaves study view so the requested section is visible',async()=>{
 const app=await setup(),d=app.document;d.querySelector('[data-study-view]').click();
 const jump=d.querySelector('nav select');jump.onchange({target:{value:'atlas-revision'}});
 assert.equal(d.body.classList.contains('atlas-study-view'),false);assert.ok(app.events.some(e=>e[0]==='scroll'&&e[1]==='atlas-revision'));
});

test('pane geometry changes wait for pen-up instead of resizing underneath a stroke',async()=>{
 const app=dom('<html><body><div id="atlasTimerModal"></div><div id="atlasGenDock"></div></body></html>'),observers=[];
 app.context.ResizeObserver=class{constructor(cb){this.cb=cb;observers.push(this);}observe(el){this.el=el;}};
 vm.runInContext(read('slide-reader.js'),app.context);
 await app.window.StudyAtlasReader.open({id:'pen-resize',pdfUrl:'/upload.pdf',legacy:false,data:{slides:[],chapters:[]}});
 const pane=app.document.querySelector('.atlas-pane'),viewport=pane.querySelector('.atlas-zoom-viewport'),content=pane.querySelector('.atlas-zoom-content');
 const observer=observers.find(o=>o.el===viewport);assert.ok(observer);
 const original=content.style.width;Object.defineProperty(viewport,'clientWidth',{value:900});
 let drawing=true;app.window.StudyAtlasInk={isDrawing:()=>drawing};observer.cb([{contentRect:{width:900}}]);
 assert.equal(content.style.width,original);drawing=false;
 app.window.dispatchEvent(new app.window.Event('atlas:ink-idle'));assert.equal(content.style.width,'900px');
});
