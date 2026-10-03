(function(root){
'use strict';
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
 const ctx=canvas.getContext('2d'),live=document.createElement('canvas');live.className='atlas-gpage-canvas atlas-gpage-live';live.style.pointerEvents='none';canvas.after(live);const preview=live.getContext('2d');
 let active=null,rect=null,pid=null,frame=0,painted=0,lastPen=0,scale=1;
 const raf=root.requestAnimationFrame?.bind(root)||((f)=>setTimeout(f,16)),cancel=root.cancelAnimationFrame?.bind(root)||clearTimeout;
 function sync(){if(live.width!==canvas.width||live.height!==canvas.height){live.width=canvas.width;live.height=canvas.height;}scale=canvas.width/Math.max(1,canvas.clientWidth);}
 function point(e){return {x:Math.max(0,Math.min(1,(e.clientX-rect.left)/Math.max(1,rect.width))),y:Math.max(0,Math.min(1,(e.clientY-rect.top)/Math.max(1,rect.height))),p:e.pointerType==='pen'?(e.pressure||.5):.5};}
 function paint(){
  frame=0;if(!active)return;const start=Math.max(0,painted-1),points=active.pts.slice(start);
  drawPart(active.tool==='eraser'?ctx:preview,canvas,active,points,scale);painted=active.pts.length;
 }
 function redraw(){
  sync();ctx.clearRect(0,0,canvas.width,canvas.height);preview.clearRect(0,0,live.width,live.height);
  for(const s of getStrokes()){
   const points=s.pts||s.points||[];if(s.tool==='highlighter'){
    preview.clearRect(0,0,live.width,live.height);drawPart(preview,canvas,s,points,scale);ctx.save();ctx.globalAlpha=.3;ctx.drawImage(live,0,0);ctx.restore();
   }else drawPart(ctx,canvas,s,points,scale);
  }
  preview.clearRect(0,0,live.width,live.height);
 }
 canvas.addEventListener('pointerdown',e=>{
  if(e.pointerType==='pen')lastPen=Date.now();
  if(!isEnabled()||active||e.button>0&&e.pointerType!=='pen'||e.pointerType==='touch'&&Date.now()-lastPen<900||canvas.closest('.atlas-hand-mode'))return;
  e.preventDefault();e.stopPropagation();rect=canvas.getBoundingClientRect();sync();pid=e.pointerId;
  active={...getTool(),pts:[point(e)]};if(e.pointerType==='pen'&&(e.button===5||e.button===2||(e.buttons&32)||(e.buttons&2)))active.tool='eraser';
  live.style.opacity=active.tool==='highlighter'?'.3':'1';painted=0;getStrokes().push(active);canvas.setPointerCapture?.(pid);paint();
 });
 canvas.addEventListener('pointermove',e=>{
  if(e.pointerType==='pen')lastPen=Date.now();if(!active||pid!==e.pointerId)return;e.preventDefault();const batch=e.getCoalescedEvents?.()||[];
  for(const item of batch.length?batch:[e]){const p=point(item),last=active.pts.at(-1);if(Math.hypot((p.x-last.x)*rect.width,(p.y-last.y)*rect.height)>.35)active.pts.push(p);}
  if(!frame)frame=raf(paint);
 });
 function finish(e){
  if(!active||pid!==e.pointerId)return;if(frame){cancel(frame);frame=0;}paint();
  if(active.tool!=='eraser'){ctx.save();ctx.globalAlpha=active.tool==='highlighter'?.3:1;ctx.drawImage(live,0,0);ctx.restore();}
  preview.clearRect(0,0,live.width,live.height);active=null;const pointer=pid;pid=null;try{canvas.releasePointerCapture?.(pointer);}catch{}onChange();
 }
 canvas.addEventListener('contextmenu',e=>{if(isEnabled())e.preventDefault();});
 canvas.addEventListener('pointerup',finish);canvas.addEventListener('pointercancel',finish);canvas.addEventListener('lostpointercapture',finish);
 return {redraw,sync,finish,isDrawing:()=>!!active};
}
const api={create,drawPart};if(typeof module==='object'&&module.exports)module.exports=api;else root.StudyAtlasInk=api;
})(typeof window!=='undefined'?window:globalThis);
