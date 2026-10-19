import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {dom,read} from './dom.mjs';
test('palm touch events and wheel zoom cannot move the slide while writing; normal zoom still works',async()=>{
 const app=dom('<html><body><div id="atlasTimerModal"></div><div id="atlasGenDock"></div></body></html>');
 vm.runInContext(read('slide-reader.js'),app.context);
 await app.window.StudyAtlasReader.open({id:'pen-gestures',pdfUrl:'/upload.pdf',legacy:false,data:{slides:[],chapters:[]}});
 const pane=app.document.querySelector('.atlas-pane'),viewport=pane.querySelector('.atlas-zoom-viewport');
 const touch=(type,distance)=>{const event=new app.window.Event(type,{bubbles:true,cancelable:true});event.touches=[{clientX:100,clientY:100},{clientX:100+distance,clientY:100}];viewport.dispatchEvent(event);};
 app.document.body.classList.add('atlas-gdrawing');touch('touchstart',100);touch('touchmove',200);assert.equal(Number(pane.dataset.scale),1);
 app.window.StudyAtlasInk={isDrawing:()=>true};const wheel=new app.window.Event('wheel',{cancelable:true});Object.assign(wheel,{ctrlKey:true,deltaY:-50,clientX:100,clientY:100});viewport.dispatchEvent(wheel);assert.equal(Number(pane.dataset.scale),1);
 app.document.body.classList.remove('atlas-gdrawing');app.window.StudyAtlasInk.isDrawing=()=>false;
 touch('touchstart',100);touch('touchmove',200);assert.equal(Number(pane.dataset.scale),2);
});
