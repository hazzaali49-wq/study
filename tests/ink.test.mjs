import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
function setup(historyCount,raw=false,getTool,getInputMode,usePrediction=false){
 let strokesPainted=0,clears=0,saves=0,frames=[];const compositeAlphas=[],layers=[],copies=[],rootEvents={};
 function canvas(){
  const events={},stack=[],operations=[];let matrix=[1,0,0,1,0,0];
  const xy=(x,y)=>[x*matrix[0]+matrix[4],y*matrix[3]+matrix[5]];
  const context={globalAlpha:1,setTransform(...m){matrix=m;},save(){stack.push({alpha:this.globalAlpha,matrix});},restore(){const saved=stack.pop();this.globalAlpha=saved.alpha;matrix=saved.matrix;},beginPath(){},arc(x,y){operations.push(['arc',...xy(x,y)]);},fill(){strokesPainted++;},moveTo(x,y){operations.push(['move',...xy(x,y)]);},lineTo(x,y){operations.push(['line',...xy(x,y)]);},stroke(){strokesPainted++;},clearRect(...args){clears++;operations.push(['clear',...args]);},drawImage(...args){compositeAlphas.push(this.globalAlpha);copies.push(args);}};
  return {width:1000,height:500,clientWidth:1000,style:{},after(layer){layers.push(layer);},getContext:()=>context,getBoundingClientRect:()=>({left:0,top:0,width:1000,height:500}),addEventListener:(n,f)=>events[n]=f,closest:()=>null,setPointerCapture(){},releasePointerCapture(){},events,operations};
 }
 const c=canvas(),history=Array.from({length:historyCount},()=>({tool:'pen',size:6,color:'#f00',pts:[{x:.1,y:.1},{x:.2,y:.2}]}));
 const window={addEventListener:(name,callback)=>rootEvents[name]=callback,requestAnimationFrame:f=>(frames.push(f),frames.length),cancelAnimationFrame(){}};
 if(raw)window.onpointerrawupdate=null;
 const sandbox={window,document:{createElement:()=>canvas()},setTimeout,clearTimeout,Date};vm.runInNewContext(fs.readFileSync(new URL('../public/ink-engine.js',import.meta.url),'utf8'),sandbox);
 const ink=window.StudyAtlasInk.create({canvas:c,getStrokes:()=>history,onChange:()=>saves++,...(getTool?{getTool}:{} ),...(getInputMode?{getInputMode}:{}),usePrediction});
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
test('the first stylus movement is rendered immediately without relying on animation frames',()=>{
 const s=setup(500);s.c.events.pointerdown(s.event(100));const before=s.counts().strokesPainted;
 s.c.events.pointermove(s.event(220));
 assert.equal(s.history.at(-1).pts.at(-1).x,.22);
 assert.ok(s.counts().strokesPainted>before,'handwriting must appear immediately on first pen movement');
});
test('coalesced samples keep the newest event and pointer-up endpoint',()=>{
 const s=setup(0);s.c.events.pointerdown(s.event(100));
 s.c.events.pointermove({...s.event(220),getCoalescedEvents:()=>[s.event(150),s.event(190)]});
 assert.deepEqual(Array.from(s.history[0].pts,p=>p.x),[.1,.15,.19,.22]);
 s.c.events.pointerup({...s.event(240),type:'pointerup'});
 assert.equal(s.history[0].pts.at(-1).x,.24);assert.equal(s.counts().saves,1);
});

test('raw pen updates render the first movement immediately and keep standard move fallback',()=>{
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
 assert.equal(s.history[0].pts.at(-1).x,.25);s.paint();assert.equal(s.counts().strokesPainted,2);
});
test('raw and regular coalesced events are not double-painted or allowed to rewind a stroke',()=>{
 const s=setup(0,true);s.c.events.pointerdown({...s.event(100),timeStamp:1});
 s.c.events.pointerrawupdate({...s.event(300),timeStamp:3,getCoalescedEvents:()=>[{...s.event(200),timeStamp:2},{...s.event(300),timeStamp:3}]});
 s.paint();const before=s.counts().strokesPainted;
 s.c.events.pointermove({...s.event(300),timeStamp:3,getCoalescedEvents:()=>[{...s.event(200),timeStamp:2},{...s.event(300),timeStamp:3}]});
 s.c.events.pointerrawupdate({...s.event(200),timeStamp:2});s.paint();
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
test('finishing a pen stroke commits actual points rather than copying an unfinished preview bitmap',()=>{
 const s=setup(0);s.c.events.pointerdown(s.event(100));s.c.events.pointermove(s.event(200));s.c.events.pointerup({...s.event(200),type:'pointerup'});
 assert.equal(s.copies.length,0,'pen saving must not rely on a GPU preview copy');
 assert.deepEqual(s.c.operations.filter(x=>x[0]==='line').at(-1),['line',200,100]);
 assert.equal(s.counts().saves,1);
});

test('a long explanation uses a bounded visible ink surface without layout reads during movement',()=>{
 const s=setup(500,true);let measurements=0;
 Object.assign(s.c,{width:1000,height:3000,clientWidth:600});
 s.c.getBoundingClientRect=()=>{measurements++;return {left:20,top:-500,width:600,height:1800};};
 s.c.closest=selector=>selector==='.atlas-zoom-viewport'?{getBoundingClientRect:()=>({left:20,top:100,width:600,height:600})}:null;
 Object.assign(s.window,{innerWidth:1200,innerHeight:900,devicePixelRatio:2});
 assert.equal(s.layers[0].width*s.layers[0].height,1,'unused panels do not reserve a full second canvas');
 s.c.events.pointerdown({...s.event(100),clientY:200});
 const live=s.layers[0];assert.ok(live.width*live.height<=750000);assert.ok(live.width*live.height<=s.c.width*s.c.height/4);
 const dimensions=[live.width,live.height];
 for(let x=101;x<400;x++)s.c.events.pointerrawupdate({...s.event(x),clientY:200});
 assert.equal(measurements,1,'no layout queries on the hot path');assert.deepEqual([live.width,live.height],dimensions,'no resizing while the pen moves');
 s.c.events.pointerup({...s.event(400),clientY:200,type:'pointerup'});
 assert.equal(s.history.at(-1).pts.at(-1).y,700/1800,'full-slide coordinates survive viewport cropping');
 assert.equal(s.copies.length,0,'permanent writing uses vector points, never the transient preview');
 const last=s.history.at(-1).pts.at(-1);assert.deepEqual(s.c.operations.filter(op=>op[0]==='line').at(-1),['line',last.x*s.c.width,last.y*s.c.height]);
 s.c.width=s.c.height=1;s.ink.sync();assert.equal(live.width*live.height,1,'leaving the viewport releases the live bitmap');
});

test('visible ink and committed coordinates stay aligned inside a scrolled, 2x zoomed pane',()=>{
 const s=setup(0),rect={left:-300,top:-1800,width:1200,height:6000};
 Object.assign(s.c,{width:720,height:3600,clientWidth:600});s.c.getBoundingClientRect=()=>rect;
 s.c.closest=selector=>selector==='.atlas-zoom-viewport'?{getBoundingClientRect:()=>({left:100,top:100,width:500,height:600})}:null;
 Object.assign(s.window,{innerWidth:1000,innerHeight:900,devicePixelRatio:2});
 s.c.events.pointerdown({...s.event(150),clientY:200});s.c.events.pointermove({...s.event(200),clientY:300});s.paint();
 const live=s.layers[0],end=live.operations.filter(op=>op[0]==='line').at(-1);
 const screenX=rect.left+parseFloat(live.style.left)/100*rect.width+end[1]/live.width*parseFloat(live.style.width)/100*rect.width;
 const screenY=rect.top+parseFloat(live.style.top)/100*rect.height+end[2]/live.height*parseFloat(live.style.height)/100*rect.height;
 assert.ok(Math.abs(screenX-200)<.001);assert.ok(Math.abs(screenY-300)<.001);
 s.c.events.pointerup({...s.event(200),clientY:300,type:'pointerup'});
 const last=s.history[0].pts.at(-1),endSaved=s.c.operations.filter(op=>op[0]==='line').at(-1);
 assert.deepEqual(endSaved,['line',last.x*s.c.width,last.y*s.c.height]);
 assert.equal(s.copies.length,0,'stored ink must not depend on browser canvas compositing');
});

test('captured input outside the visible crop is still committed and retained for snapshots',()=>{
 const s=setup(0);s.c.closest=selector=>selector==='.atlas-zoom-viewport'?{getBoundingClientRect:()=>({left:0,top:0,width:500,height:500})}:null;
 s.c.events.pointerdown(s.event(400));s.c.events.pointermove(s.event(700));s.c.events.pointerup({...s.event(750),type:'pointerup'});
 assert.equal(s.history[0].pts.at(-1).x,.75);
 assert.deepEqual(s.c.operations.filter(op=>op[0]==='line').at(-1),['line',750,100],'overflow replays the full actual stroke, not a clipped bitmap');
});

test('native predicted points draw only a small temporary tip and never enter saved strokes',()=>{
 const s=setup(0,true,null,null,true);s.c.events.pointerdown({...s.event(100),timeStamp:1});
 const predicted={...s.event(210),timeStamp:18};
 s.c.events.pointermove({...s.event(200),timeStamp:10,getPredictedEvents:()=>[predicted]});
 assert.equal(s.layers.length,2);const tip=s.layers[1];assert.equal(tip.hidden,false);assert.ok(tip.width*tip.height<4000);
 assert.deepEqual(Array.from(s.history[0].pts,p=>p.x),[.1,.2]);
 s.c.events.pointerrawupdate({...s.event(204),timeStamp:15});assert.equal(tip.hidden,true,'actual raw input removes the old prediction');
 s.c.events.pointermove({...s.event(204),timeStamp:15,getPredictedEvents:()=>[{...s.event(214),timeStamp:23}]});assert.equal(tip.hidden,false);
 s.c.events.pointerup({...s.event(207),timeStamp:17,type:'pointerup'});
 assert.equal(tip.hidden,true);assert.equal(s.history[0].pts.at(-1).x,.207);assert.ok(s.copies.every(copy=>copy[0]!==tip));
 const stored=JSON.stringify(s.history);s.ink.redraw();assert.equal(JSON.stringify(s.history),stored);
});

test('prediction is optional, bounded and never applied to highlighter or eraser ink',()=>{
 for(const getPredictedEvents of [()=>{throw Error('unsupported');},()=>[{clientX:1000,clientY:100,timeStamp:12}],()=>[{clientX:205,clientY:100,timeStamp:100}]]){
  const s=setup(0,false,null,null,true);s.c.events.pointerdown({...s.event(100),timeStamp:1});s.c.events.pointermove({...s.event(200),timeStamp:10,getPredictedEvents});assert.equal(s.layers.length,1);assert.equal(s.history[0].pts.at(-1).x,.2);
 }
 for(const tool of ['highlighter','eraser']){
  const s=setup(0,false,()=>({tool,size:7,color:'#ff0'}),null,true);s.c.events.pointerdown({...s.event(100),timeStamp:1});
  s.c.events.pointermove({...s.event(200),timeStamp:10,getPredictedEvents:()=>[{...s.event(210),timeStamp:18}]});assert.equal(s.layers.length,1);
 }
});

test('a stationary pen loses its speculative tip automatically',async()=>{
 const s=setup(0,false,null,null,true);s.c.events.pointerdown({...s.event(100),timeStamp:1});
 s.c.events.pointermove({...s.event(200),timeStamp:10,getPredictedEvents:()=>[{...s.event(210),timeStamp:18}]});
 assert.equal(s.layers[1].hidden,false);await new Promise(resolve=>setTimeout(resolve,60));assert.equal(s.layers[1].hidden,true);s.ink.stop();
});

test('coalesced stylus samples paint in pressure-sized batches, retaining all input',()=>{
 const s=setup(0,true);s.c.events.pointerdown({...s.event(100),timeStamp:1});
 const batch=Array.from({length:100},(_,i)=>({...s.event(101+i*2),pressure:i<50?.2:.8,timeStamp:i+2}));
 s.c.events.pointerrawupdate({...s.event(305),pressure:.8,timeStamp:103,getCoalescedEvents:()=>batch});
 assert.equal(s.history[0].pts.length,102,'no intermediate pen points are lost');
 assert.equal(s.history[0].pts.at(-1).x,.305,'the latest raw sample is recorded');
 s.paint();assert.ok(s.counts().strokesPainted<=6,'drawing 101 samples must not require 101 canvas strokes');
 s.c.events.pointerup({...s.event(310),type:'pointerup',timeStamp:104});
 assert.equal(s.history[0].pts.at(-1).x,.31);
 assert.equal(s.counts().saves,1);
});

test('high-frequency stylus events do not force repeated canvas painting before the next display frame',()=>{
 const s=setup(0,true);
 s.c.events.pointerdown({...s.event(100),timeStamp:1});
 for(let i=0;i<500;i++){
  const e={...s.event(100+i),timeStamp:i+2};
  s.c.events.pointerrawupdate(e);
 }
 assert.equal(s.history[0].pts.at(-1).x,.599,'input position follows the pen immediately');
 assert.ok(s.counts().strokesPainted>1,'the pen should update visibly during a long stroke');
 assert.ok(s.counts().strokesPainted<65,'500 raw events must not create 500 draw calls');
 assert.equal(s.layers.length,1,'normal drawing never allocates a prediction-tip canvas');
 s.paint();
 assert.ok(s.counts().strokesPainted<65,'rasterization is bounded even for rapid hardware events');
 s.c.events.pointerup({...s.event(610),timeStamp:503,type:'pointerup'});
 assert.equal(s.history[0].pts.at(-1).x,.61);
 assert.equal(s.counts().saves,1);
});

test('finishing before the next frame flushes every pen endpoint into saved ink',()=>{
 const s=setup(0,true);s.c.events.pointerdown({...s.event(100),timeStamp:1});
 s.c.events.pointerrawupdate({...s.event(150),timeStamp:2});
 s.c.events.pointerup({...s.event(250),type:'pointerup',timeStamp:3});
 assert.equal(s.history[0].pts.at(-1).x,.25);
 assert.equal(s.counts().saves,1);
 assert.equal(s.copies.length,0,'saving must not read from the temporary preview layer');
 assert.deepEqual(s.c.operations.filter(op=>op[0]==='line').at(-1),['line',250,100],'the final endpoint is committed to the durable canvas');
 assert.equal(s.ink.isDrawing(),false);
});

test('prediction remains opt-in because resizing a tip canvas for each pen event can cause stylus lag',()=>{
 const s=setup(0,true);
 s.c.events.pointerdown({...s.event(100),timeStamp:1});
 for(let i=0;i<8;i++)s.c.events.pointerrawupdate({...s.event(130+i),timeStamp:i+2,getPredictedEvents:()=>[{...s.event(145+i),timeStamp:i+5}]});
 assert.equal(s.layers.length,1,'the default stylus path avoids speculative canvas reallocations');
 s.c.events.pointerup({...s.event(150),timeStamp:12,type:'pointerup'});
});

test('pen ink survives a hypothetical delayed GPU preview, including a quick tap',()=>{
 const s=setup(0,true);
 s.c.getContext('2d').drawImage=()=>{throw Error('preview GPU pixels unavailable')};
 s.c.events.pointerdown({...s.event(100),timeStamp:1});
 s.c.events.pointerrawupdate({...s.event(150),timeStamp:2});
 s.c.events.pointerup({...s.event(190),timeStamp:3,type:'pointerup'});
 assert.deepEqual(s.c.operations.filter(op=>op[0]==='line').at(-1),['line',190,100]);
 assert.equal(s.counts().saves,1);
 s.ink.redraw();
 assert.deepEqual(s.c.operations.filter(op=>op[0]==='line').at(-1),['line',190,100]);
});
test('the pen can render immediately when browser animation callbacks are suspended',()=>{
 const s=setup(0,true);
 s.c.events.pointerdown({...s.event(100),timeStamp:1});
 s.c.events.pointerrawupdate({...s.event(140),timeStamp:2});
 const before=s.counts().strokesPainted;
 s.c.events.pointerrawupdate({...s.event(210),timeStamp:24});
 assert.ok(s.counts().strokesPainted>before,'new real pen samples must show without a scheduled frame');
 assert.equal(s.history[0].pts.at(-1).x,.21);
 s.c.events.pointerup({...s.event(250),timeStamp:25,type:'pointerup'});
 assert.equal(s.history[0].pts.at(-1).x,.25);
});

test('hardware raw stylus events never replay expensive coalesced history',()=>{
 const s=setup(0,true);
 let expensiveCalls=0;
 s.c.events.pointerdown({...s.event(100),type:'pointerdown',timeStamp:1});
 for(let i=0;i<90;i++){
  s.c.events.pointerrawupdate({...s.event(110+i),type:'pointerrawupdate',timeStamp:2+i,
   getCoalescedEvents:()=>{expensiveCalls++;return Array.from({length:100},()=>s.event(110+i));}});
 }
 assert.equal(expensiveCalls,0,'the raw stream already supplies the hardware samples');
 assert.equal(s.history[0].pts.at(-1).x,.199);
 s.c.events.pointerup({...s.event(205),type:'pointerup',timeStamp:95});
 assert.equal(s.history[0].pts.at(-1).x,.205);
});
test('rapid consecutive words remain in ink history after the temporary layer clears',()=>{
 const s=setup(0,true);
 for(let i=0;i<30;i++){
  const x=100+i*5,time=i*4+1;
  s.c.events.pointerdown({...s.event(x),type:'pointerdown',timeStamp:time});
  s.c.events.pointerrawupdate({...s.event(x+3),type:'pointerrawupdate',timeStamp:time+1});
  s.c.events.pointerup({...s.event(x+4),type:'pointerup',timeStamp:time+2});
 }
 assert.equal(s.history.length,30);
 assert.equal(s.counts().saves,30);
 assert.equal(s.copies.length,0,'no GPU canvas readback is allowed to lose earlier words');
 const before=s.c.operations.filter(op=>op[0]==='line').length;
 s.ink.redraw();
 assert.equal(s.c.operations.filter(op=>op[0]==='line').length,before*2,'redraw repeats every recorded vector segment across all thirty strokes');
});
