import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {dom,read} from './dom.mjs';

const flush=async()=>{for(let i=0;i<180;i++)await Promise.resolve();};

test('drawing overlays stay outside slide layout before stylesheets load',async()=>{
 const app=dom('<html><head></head><body><main id="atlasSlideReader"><section class="visualcard" data-ink-id="original-1"></section></main><div class="rail"></div></body></html>');
 const zone=app.document.querySelector('[data-ink-id]'),observers=[];
 // Model browser flow without any stylesheet: ordinary canvases add height.
 Object.defineProperty(zone,'clientHeight',{get(){return 450+[...zone.querySelectorAll('canvas')].filter(c=>c.style.position!=='absolute').reduce((h,c)=>h+Number(c.height||150),0);}});
 app.context.ResizeObserver=class{constructor(cb){this.cb=cb;observers.push(this);}observe(el){this.el=el;}};
 app.context.IntersectionObserver=class{constructor(cb){this.cb=cb;}observe(el){this.cb([{target:el,isIntersecting:true}]);}};
 vm.runInContext(read('ink-engine.js'),app.context);
 vm.runInContext(read('generated-tools.js'),app.context);await flush();
 assert.ok(app.document.getElementById('atlasGenDock'));
 assert.equal(app.document.querySelectorAll('link[href*="generated-tools.css"]').length,1);
 assert.equal(app.document.querySelectorAll('link[href*="study-tools.css"]').length,1);
 assert.equal(zone.querySelectorAll('canvas').length,2);
 for(let i=0;i<20;i++)for(const observer of observers)observer.cb([{target:observer.el}]);
 assert.equal(zone.clientHeight,450,'repeated resizes must not enlarge the source slide');
 for(const canvas of zone.querySelectorAll('canvas')){
  assert.equal(canvas.height,canvas.classList.contains('atlas-gpage-live')?1:450);assert.equal(canvas.style.position,'absolute');
  assert.equal(canvas.style.width,'100%');assert.equal(canvas.style.height,'100%');
 }
 vm.runInContext(read('generated-tools.js'),app.context);await flush();
 assert.equal(app.document.querySelectorAll('link[href*="generated-tools.css"]').length,1);
 assert.equal(zone.querySelectorAll('canvas').length,2,'reboot does not add another overlay');
});
