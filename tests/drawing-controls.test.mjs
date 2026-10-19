import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {dom,read} from './dom.mjs';
const flush=async()=>{for(let i=0;i<180;i++)await Promise.resolve();};
async function setup(){
 const app=dom('<html><head></head><body class="atlas-slide-mode"><main id="atlasSlideReader"><section class="visualcard"><div data-ink-id="slide-1-original"></div><div data-ink-id="slide-1-teaching"></div></section></main><div class="rail"></div></body></html>');
 const ink=[];app.window.StudyAtlasInk={create:opts=>{ink.push(opts);return {redraw(){},sync(){},isDrawing(){return false;}};}};
 vm.runInContext(read('generated-tools.js'),app.context);await flush();return {...app,ink};
}
test('Draw opens only the compact bar; settings close on contact while drawing stays enabled',async()=>{
 const {document:d,window:w,ink}=await setup();
 d.getElementById('atlasGDraw').click();
 assert.equal(d.getElementById('atlasGenTools').hidden,true);assert.equal(d.getElementById('atlasDrawBar').hidden,false);
 assert.equal(d.getElementById('atlasGDraw').getAttribute('aria-pressed'),'true');
 d.getElementById('atlasDrawStyle').click();assert.equal(d.getElementById('atlasGenTools').hidden,false);
 ink[0].canvas.dispatchEvent(new w.Event('pointerdown'));assert.equal(d.getElementById('atlasGenTools').hidden,true);assert.equal(ink[0].isEnabled(),true);
 d.getElementById('atlasDrawDone').click();assert.equal(ink[0].isEnabled(),false);assert.equal(d.getElementById('atlasDrawBar').hidden,true);
 assert.match(read('slide-reader.css'),/:not\(#atlasDrawBar\)/,'the reader must not hide the compact bar');
});
test('pen and highlighter remember distinct settings and Escape exits drawing',async()=>{
 const {document:d,window:w,ink}=await setup();d.getElementById('atlasGDraw').click();
 d.querySelector('#atlasDrawBar [data-tool="highlighter"]').click();
 assert.deepEqual(JSON.parse(JSON.stringify(ink[0].getTool())),{tool:'highlighter',color:'#ffd04a',size:7,opacity:.22});
 assert.equal(d.getElementById('atlasGenTools').hidden,true);
 d.getElementById('atlasGTOpacity').oninput({target:{value:'16'}});
 d.querySelector('#atlasDrawBar [data-tool="pen"]').click();assert.equal(ink[0].getTool().size,3);assert.equal(ink[0].getTool().opacity,1);
 d.querySelector('#atlasDrawBar [data-tool="highlighter"]').click();assert.equal(ink[0].getTool().opacity,.16);
 const event=new w.Event('keydown',{bubbles:true});event.key='Escape';d.body.dispatchEvent(event);
 assert.equal(d.getElementById('atlasDrawBar').hidden,true);assert.equal(ink[0].isEnabled(),false);
});
test('opening a board or note exits drawing and hides the compact bar',async()=>{
 const {document:d,ink}=await setup();
 for(const id of ['atlasGBoard','atlasGNote']){
  d.getElementById('atlasGDraw').click();d.getElementById(id).click();
  assert.equal(d.getElementById('atlasDrawBar').hidden,true);assert.equal(ink[0].isEnabled(),false);
 }
});
