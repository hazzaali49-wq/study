import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
function setup(historyCount,raw=false,getTool,getInputMode){
 let strokesPainted=0,clears=0,saves=0,frames=[];const compositeAlphas=[],layers=[],stack=[],copies=[],rootEvents={};
 const context={globalAlpha:1,save(){stack.push(this.globalAlpha);},restore(){this.globalAlpha=stack.pop();},beginPath(){},arc(){},fill(){strokesPainted++;},moveTo(){},lineTo(){},stroke(){strokesPainted++;},clearRect(){clears++;},drawImage(...args){compositeAlphas.push(this.globalAlpha);copies.push(args);}};
 function canvas(){const events={};return {width:1000,height:500,clientWidth:1000,style:{},after(layer){layers.push(layer);},getContext:()=>context,getBoundingClientRect:()=>({left:0,top:0,width:1000,height:500}),addEventListener:(n,f)=>events[n]=f,closest:()=>null,setPointerCapture(){},releasePointerCapture(){},events};}
 const c=canvas(),history=Array.from({length:historyCount},()=>({tool:'pen',size:6,color:'#f00',pts:[{x:.1,y:.1},{x:.2,y:.2}]}));
 const window={addEventListener:(name,callback)=>rootEvents[name]=callback,requestAnimationFrame:f=>(frames.push(f),frames.length),cancelAnimationFrame(){}};
 if(raw)window.onpointerrawupdate=null;
 const sandbox={window,document:{createElement:()=>canvas()},setTimeout,clearTimeout,Date};vm.runInNewContext(fs.readFileSync(new URL('../public/ink-engine.js',import.meta.url),'utf8'),sandbox);
 const ink=window.StudyAtlasInk.create({canvas:c,getStrokes:()=>history,onChange:()=>saves++,...(getTool?{getTool}:{} ),...(getInputMode?{getInputMode}:{})});
 const event=x=>({pointerId:1,pointerType:'pen',button:0,pressure:.5,clientX:x,clientY:100,preventDefault(){},stopPropagation(){}});
 return {c,ink,event,history,compositeAlphas,layers,copies,rootEvents,window,makeCanvas:canvas,paint:()=>{const work=frames;frames=[];work.forEach(f=>f());},counts:()=>({strokesPainted,clears,saves})};
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
test('ink reaches each input position immediately without waiting for an animation frame',()=>{
 const s=setup(500);s.c.events.pointerdown(s.event(100));const before=s.counts().strokesPainted;
 s.c.events.pointermove(s.event(220));
 assert.ok(s.counts().strokesPainted>before);
 assert.equal(s.history.at(-1).pts.at(-1).x,.22);
});
test('coalesced samples keep the newest event and pointer-up endpoint',()=>{
 const s=setup(0);s.c.events.pointerdown(s.event(100));
 s.c.events.pointermove({...s.event(220),getCoalescedEvents:()=>[s.event(150),s.event(190)]});
 assert.deepEqual(Array.from(s.history[0].pts,p=>p.x),[.1,.15,.19,.22]);
 s.c.events.pointerup({...s.event(240),type:'pointerup'});
 assert.equal(s.history[0].pts.at(-1).x,.24);assert.equal(s.counts().saves,1);
});

test('raw pen updates paint immediately and keep a standard move fallback',()=>{
 const s=setup(0,true);assert.equal(typeof s.c.events.pointermove,'function');
 s.c.events.pointerdown(s.event(100));s.c.events.pointerrawupdate(s.event(300));
 assert.equal(s.history[0].pts.at(-1).x,.3);assert.equal(s.counts().strokesPainted,2);
});

test('highlighter keeps the same translucent opacity while moving, after lift and on replay',()=>{
 const s=setup(0,false,()=>({tool:'highlighter',color:'#ffd04a',size:7,opacity:.22}));
 s.c.events.pointerdown(s.event(100));
 for(let x=101;x<=150;x++)s.c.events.pointermove(s.event(x));
 assert.equal(s.layers[0].style.opacity,'0.22');
 assert.deepEqual(s.compositeAlphas,[],'partial segments stay on one mask instead of accumulating opacity');
 s.c.events.pointerup({...s.event(150),type:'pointerup'});
 assert.deepEqual(s.compositeAlphas,[.22]);
 s.ink.redraw();assert.deepEqual(s.compositeAlphas,[.22,.22]);
 assert.equal(s.history[0].opacity,.22);
});
test('old highlighter strokes use a readable default and excessive saved opacity is capped',()=>{
 const s=setup(0);s.history.push({tool:'highlighter',size:6,color:'#ffd04a',pts:[{x:.1,y:.2}]},{tool:'highlighter',size:6,opacity:1,pts:[{x:.2,y:.2}]});
 s.ink.redraw();assert.deepEqual(s.compositeAlphas,[.22,.30]);
});

test('a raw-capable browser still draws when the stylus supplies only pointermove',()=>{
 const s=setup(0,true);s.c.events.pointerdown(s.event(100));s.c.events.pointermove(s.event(250));
 assert.equal(s.history[0].pts.at(-1).x,.25);assert.equal(s.counts().strokesPainted,2);
});
test('raw and regular coalesced events are not double-painted or allowed to rewind a stroke',()=>{
 const s=setup(0,true);s.c.events.pointerdown({...s.event(100),timeStamp:1});
 s.c.events.pointerrawupdate({...s.event(300),timeStamp:3,getCoalescedEvents:()=>[{...s.event(200),timeStamp:2},{...s.event(300),timeStamp:3}]});
 const before=s.counts().strokesPainted;
 s.c.events.pointermove({...s.event(300),timeStamp:3,getCoalescedEvents:()=>[{...s.event(200),timeStamp:2},{...s.event(300),timeStamp:3}]});
 s.c.events.pointerrawupdate({...s.event(200),timeStamp:2});
 assert.equal(s.counts().strokesPainted,before);assert.deepEqual(Array.from(s.history[0].pts,p=>p.x),[.1,.2,.3]);
});
test('the pen takes priority over a palm that touched first, including in the other panel',()=>{
 const s=setup(0),second=s.makeCanvas(),other=[];
 const ink=s.window.StudyAtlasInk.create({canvas:second,getStrokes:()=>other});
 second.events.pointerdown({...s.event(100),pointerId:2,pointerType:'touch'});assert.equal(other.length,1);
 s.c.events.pointerdown(s.event(200));assert.equal(other.length,0);assert.equal(ink.isDrawing(),false);assert.equal(s.ink.isDrawing(),true);
 second.events.pointerdown({...s.event(300),pointerId:3,pointerType:'touch'});assert.equal(other.length,0);
});
test('Pen only rejects fingers and mouse while Automatic supports mouse drawing',()=>{
 const pen=setup(0,false,null,()=> 'pen');
 for(const pointerType of ['touch','mouse'])pen.c.events.pointerdown({...pen.event(100),pointerType});
 assert.equal(pen.history.length,0);pen.c.events.pointerdown(pen.event(100));assert.equal(pen.history.length,1);
 const mouse=setup(0);mouse.c.events.pointerdown({...mouse.event(100),pointerType:'mouse'});mouse.c.events.pointermove({...mouse.event(200),pointerType:'mouse'});
 assert.equal(mouse.history[0].pts.at(-1).x,.2);
});
test('hovering with a barrel button makes no ink; touching and changing eraser state works',()=>{
 const s=setup(0);s.c.events.pointerdown({...s.event(100),type:'pointerdown',button:2,buttons:2,pressure:0});assert.equal(s.history.length,0);
 s.c.events.pointermove({...s.event(120),button:-1,buttons:3,pressure:.4});assert.equal(s.history[0].tool,'eraser');
 s.c.events.pointermove({...s.event(140),button:2,buttons:1,pressure:.4});assert.equal(s.history[1].tool,'pen');
 s.c.events.pointerup({...s.event(150),type:'pointerup',buttons:0,pressure:0});assert.equal(s.counts().saves,1);
});
test('hardware eraser and pressure endpoints preserve the reported pen input',()=>{
 const s=setup(0);s.c.events.pointerdown({...s.event(100),button:5,buttons:32,pressure:0});assert.equal(s.history[0].tool,'eraser');assert.equal(s.history[0].pts[0].p,0);
 s.c.events.pointermove({...s.event(200),buttons:32,pressure:1});assert.equal(s.history[0].pts.at(-1).p,1);
});
test('unsupported pointer capture and coalesced events do not break drawing or release',()=>{
 const s=setup(0);s.c.setPointerCapture=()=>{throw Error('unsupported');};s.c.events.pointerdown(s.event(100));
 s.c.events.pointermove({...s.event(220),getCoalescedEvents:()=>{throw Error('unsupported');}});
 s.rootEvents.pointerup({...s.event(240),type:'pointerup'});
 assert.equal(s.history[0].pts.at(-1).x,.24);assert.equal(s.ink.isDrawing(),false);assert.equal(s.counts().saves,1);
});
test('cancellation, blur and leaving drawing mode finish once without a phantom endpoint',()=>{
 for(const action of ['cancel','blur','stop']){
  const s=setup(0);s.c.events.pointerdown(s.event(100));s.c.events.pointermove(s.event(160));
  if(action==='cancel')s.c.events.pointercancel({...s.event(0),type:'pointercancel'});else if(action==='blur')s.rootEvents.blur();else s.ink.stop();
  s.c.events.lostpointercapture({...s.event(0),type:'lostpointercapture'});
  assert.equal(s.history[0].pts.at(-1).x,.16);assert.equal(s.counts().saves,1);assert.equal(s.ink.isDrawing(),false);
 }
});
test('finishing a short stroke copies only its occupied area, not the full slide canvas',()=>{
 const s=setup(0);s.c.events.pointerdown(s.event(100));s.c.events.pointermove(s.event(200));s.c.events.pointerup({...s.event(200),type:'pointerup'});
 const copy=s.copies[0];assert.equal(copy.length,9);assert.ok(copy[3]*copy[4]<1000*500*.02);
 assert.deepEqual(copy.slice(1,5),copy.slice(5,9),'source and destination regions remain aligned');
});
