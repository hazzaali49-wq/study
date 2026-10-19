(function(root){
'use strict';
// Keep marker opacity consistent during drawing, replay and note snapshots.
function opacityFor(stroke){return stroke.tool==='highlighter'?Math.max(.12,Math.min(.30,Number(stroke.opacity)||.22)):1;}
// Completed ink and the active stroke have separate layers. Pointer movement never replays history.
function drawPart(ctx,canvas,stroke,points,scale){
 if(!points.length)return;
 ctx.save();ctx.lineCap='round';ctx.lineJoin='round';ctx.strokeStyle=stroke.color||'#ff4f70';ctx.fillStyle=ctx.strokeStyle;
 ctx.globalCompositeOperation=stroke.tool==='eraser'?'destination-out':'source-over';
 const width=stroke.tool==='eraser'?Math.max(8,stroke.size*2.4):stroke.tool==='highlighter'?Math.max(12,stroke.size*2):stroke.size;
 if(points.length===1){ctx.beginPath();ctx.arc(points[0].x*canvas.width,points[0].y*canvas.height,width*scale/2,0,Math.PI*2);ctx.fill();}
 else for(let i=1;i<points.length;i++){
  ctx.lineWidth=width*scale*(stroke.tool==='pen'?.65+((points[i].p??.5)+(points[i-1].p??.5))*.35:1);
  ctx.beginPath();ctx.moveTo(points[i-1].x*canvas.width,points[i-1].y*canvas.height);ctx.lineTo(points[i].x*canvas.width,points[i].y*canvas.height);ctx.stroke();
 }
 ctx.restore();
}
function create({canvas,getStrokes,onChange=()=>{},isEnabled=()=>true,getTool=()=>({tool:'pen',size:6,color:'#ff4f70'})}){
 const ctx=canvas.getContext('2d',{desynchronized:true}),live=document.createElement('canvas');live.className='atlas-gpage-canvas atlas-gpage-live';live.style.pointerEvents='none';
 // Overlay geometry must never depend on a stylesheet arriving first. In-flow
 // canvases enlarge their measured parent and create a ResizeObserver loop.
 for(const layer of [canvas,live])Object.assign(layer.style,{position:'absolute',inset:'0',width:'100%',height:'100%'});
 if(canvas.parentElement&&!canvas.parentElement.style.position)canvas.parentElement.style.position='relative';
 canvas.after(live);const preview=live.getContext('2d',{desynchronized:true});
 let active=null,rect=null,pid=null,painted=0,lastPen=0,scale=1;
 function sync(){if(live.width!==canvas.width||live.height!==canvas.height){live.width=canvas.width;live.height=canvas.height;}scale=canvas.width/Math.max(1,canvas.clientWidth);}
 function point(e){return {x:Math.max(0,Math.min(1,(e.clientX-rect.left)/Math.max(1,rect.width))),y:Math.max(0,Math.min(1,(e.clientY-rect.top)/Math.max(1,rect.height))),p:e.pointerType==='pen'?(e.pressure||.5):.5};}
 function paint(){
  if(!active||painted===active.pts.length)return;const start=Math.max(0,painted-1),points=active.pts.slice(start);
  drawPart(active.tool==='eraser'?ctx:preview,canvas,active,points,scale);painted=active.pts.length;
 }
 function redraw(){
  sync();ctx.clearRect(0,0,canvas.width,canvas.height);preview.clearRect(0,0,live.width,live.height);
  for(const s of getStrokes()){
   const points=s.pts||s.points||[];if(s.tool==='highlighter'){
    preview.clearRect(0,0,live.width,live.height);drawPart(preview,canvas,s,points,scale);ctx.save();ctx.globalAlpha=opacityFor(s);ctx.drawImage(live,0,0);ctx.restore();
   }else drawPart(ctx,canvas,s,points,scale);
  }
  preview.clearRect(0,0,live.width,live.height);
 }
 canvas.addEventListener('pointerdown',e=>{
  if(e.pointerType==='pen')lastPen=Date.now();
  if(!isEnabled()||active||e.button>0&&e.pointerType!=='pen'||e.pointerType==='touch'&&Date.now()-lastPen<900||canvas.closest('.atlas-hand-mode'))return;
  e.preventDefault();e.stopPropagation();rect=canvas.getBoundingClientRect();sync();pid=e.pointerId;
  active={...getTool(),pts:[point(e)]};if(e.pointerType==='pen'&&(e.button===5||e.button===2||(e.buttons&32)||(e.buttons&2)))active.tool='eraser';
  live.style.opacity=String(opacityFor(active));painted=0;getStrokes().push(active);canvas.setPointerCapture?.(pid);paint();
 });
 function appendPoint(e,exact=false){
  const p=point(e),last=active.pts.at(-1),distance=Math.hypot((p.x-last.x)*rect.width,(p.y-last.y)*rect.height);
  if(distance>(exact?0:.15))active.pts.push(p);
 }
 function move(e){
  if(e.pointerType==='pen')lastPen=Date.now();if(!active||pid!==e.pointerId)return;
  e.preventDefault();e.stopPropagation();
  for(const item of e.getCoalescedEvents?.()||[])appendPoint(item);
  // Include the newest actual position even when the browser batches samples.
  appendPoint(e,true);paint();
 }
 // Raw updates avoid waiting for a display frame on supported pen devices.
 canvas.addEventListener('onpointerrawupdate' in root?'pointerrawupdate':'pointermove',move);
 function finish(e){
  if(!active||pid!==e.pointerId)return;
  if(e.type==='pointerup'&&Number.isFinite(e.clientX)&&Number.isFinite(e.clientY))appendPoint(e,true);paint();
  if(active.tool!=='eraser'){ctx.save();ctx.globalAlpha=opacityFor(active);ctx.drawImage(live,0,0);ctx.restore();}
  preview.clearRect(0,0,live.width,live.height);active=null;const pointer=pid;pid=null;try{canvas.releasePointerCapture?.(pointer);}catch{}onChange();
 }
 canvas.addEventListener('contextmenu',e=>{if(isEnabled())e.preventDefault();});
 canvas.addEventListener('pointerup',finish);canvas.addEventListener('pointercancel',finish);canvas.addEventListener('lostpointercapture',finish);
 return {redraw,sync,finish,isDrawing:()=>!!active};
}
const api={create,drawPart};if(typeof module==='object'&&module.exports)module.exports=api;else root.StudyAtlasInk=api;
})(typeof window!=='undefined'?window:globalThis);
