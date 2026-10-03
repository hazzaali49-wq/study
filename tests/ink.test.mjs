import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
function setup(historyCount){
 let strokesPainted=0,clears=0,saves=0,frames=[];
 const context={save(){},restore(){},beginPath(){},arc(){},fill(){strokesPainted++;},moveTo(){},lineTo(){},stroke(){strokesPainted++;},clearRect(){clears++;},drawImage(){}};
 function canvas(){const events={};return {width:1000,height:500,clientWidth:1000,style:{},after(){},getContext:()=>context,getBoundingClientRect:()=>({left:0,top:0,width:1000,height:500}),addEventListener:(n,f)=>events[n]=f,closest:()=>null,setPointerCapture(){},releasePointerCapture(){},events};}
 const c=canvas(),history=Array.from({length:historyCount},()=>({tool:'pen',size:6,color:'#f00',pts:[{x:.1,y:.1},{x:.2,y:.2}]}));
 const window={requestAnimationFrame:f=>(frames.push(f),frames.length),cancelAnimationFrame(){}};
 const sandbox={window,document:{createElement:()=>canvas()},setTimeout,clearTimeout,Date};vm.runInNewContext(fs.readFileSync(new URL('../public/ink-engine.js',import.meta.url),'utf8'),sandbox);
 const ink=window.StudyAtlasInk.create({canvas:c,getStrokes:()=>history,onChange:()=>saves++});
 const event=x=>({pointerId:1,pointerType:'pen',button:0,pressure:.5,clientX:x,clientY:100,preventDefault(){},stopPropagation(){}});
 return {c,ink,event,history,paint:()=>{const work=frames;frames=[];work.forEach(f=>f());},counts:()=>({strokesPainted,clears,saves})};
}
test('moving the pointer paints the new segments, independent of saved stroke count',()=>{
 const empty=setup(0),full=setup(500);
 for(const s of [empty,full]){
  s.c.events.pointerdown(s.event(100));for(let x=101;x<=150;x++)s.c.events.pointermove(s.event(x));s.paint();s.c.events.pointerup(s.event(150));
 }
 assert.equal(empty.counts().strokesPainted,full.counts().strokesPainted);assert.equal(full.history.length,501);assert.equal(full.counts().saves,1);
 assert.ok(full.counts().clears<=2);assert.ok(full.counts().strokesPainted<60);
});
test('another finger cannot become part of the active pen stroke',()=>{
 const s=setup(0);s.c.events.pointerdown(s.event(100));s.c.events.pointermove({...s.event(200),pointerId:2,pointerType:'touch'});s.c.events.pointerup(s.event(100));assert.equal(s.history[0].pts.length,1);
});
