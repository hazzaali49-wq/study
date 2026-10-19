(function(root){
'use strict';
// One input owner across both slide panels: a palm cannot start another stroke.
let owner=null,lastPenAt=-Infinity;
function rememberPen(e){if(e.pointerType!=='pen')return;lastPenAt=Date.now();if(owner?.type==='touch')owner.discard();}
function consume(e){if(e.cancelable!==false)e.preventDefault?.();e.stopPropagation?.();}
function opacityFor(stroke){return stroke.tool==='highlighter'?Math.max(.12,Math.min(.30,Number(stroke.opacity)||.22)):1;}
function strokeWidth(stroke){const size=Number(stroke.size)||3;return stroke.tool==='eraser'?Math.max(8,size*2.4):stroke.tool==='highlighter'?Math.max(12,size*2):size;}
// Completed ink and the active stroke have separate layers. Movement never replays history.
function drawPart(ctx,canvas,stroke,points,scale){
 if(!points.length)return;
 ctx.save();ctx.lineCap='round';ctx.lineJoin='round';ctx.strokeStyle=stroke.color||'#ff4f70';ctx.fillStyle=ctx.strokeStyle;
 ctx.globalCompositeOperation=stroke.tool==='eraser'?'destination-out':'source-over';
 const width=strokeWidth(stroke);
 if(points.length===1){ctx.beginPath();ctx.arc(points[0].x*canvas.width,points[0].y*canvas.height,width*scale/2,0,Math.PI*2);ctx.fill();}
 else if(stroke.tool!=='pen'){
  ctx.lineWidth=width*scale;ctx.beginPath();ctx.moveTo(points[0].x*canvas.width,points[0].y*canvas.height);
  for(let i=1;i<points.length;i++)ctx.lineTo(points[i].x*canvas.width,points[i].y*canvas.height);
  ctx.stroke();
 }else for(let i=1;i<points.length;i++){
  ctx.lineWidth=width*scale*(.65+((points[i].p??.5)+(points[i-1].p??.5))*.35);
  ctx.beginPath();ctx.moveTo(points[i-1].x*canvas.width,points[i-1].y*canvas.height);ctx.lineTo(points[i].x*canvas.width,points[i].y*canvas.height);ctx.stroke();
 }
 ctx.restore();
}
function create({canvas,getStrokes,onChange=()=>{},onBeforeStart=()=>{},isEnabled=()=>true,getInputMode=()=> 'auto',getTool=()=>({tool:'pen',size:3,color:'#ff4f70'})}){
 const ctx=canvas.getContext('2d',{desynchronized:true}),live=document.createElement('canvas');live.className='atlas-gpage-canvas atlas-gpage-live';live.style.pointerEvents='none';
 // Overlay geometry never depends on a stylesheet arriving first.
 for(const layer of [canvas,live])Object.assign(layer.style,{position:'absolute',inset:'0',width:'100%',height:'100%'});
 canvas.style.touchAction='none';canvas.style.userSelect='none';
 if(canvas.parentElement&&!canvas.parentElement.style.position)canvas.parentElement.style.position='relative';
 canvas.after(live);const preview=live.getContext('2d',{desynchronized:true});
 let active=null,rect=null,pid=null,pointerType='',painted=0,scale=1,lastSample=-Infinity,bounds=null,baseTool=null;
 function sync(){if(live.width!==canvas.width||live.height!==canvas.height){live.width=canvas.width;live.height=canvas.height;}scale=canvas.width/Math.max(1,canvas.clientWidth);}
 function point(e){const pressure=Number(e.pressure);return {x:Math.max(0,Math.min(1,(e.clientX-rect.left)/Math.max(1,rect.width))),y:Math.max(0,Math.min(1,(e.clientY-rect.top)/Math.max(1,rect.height))),p:(e.pointerType||pointerType)==='pen'&&Number.isFinite(pressure)?Math.max(0,Math.min(1,pressure)):.5};}
 function paint(){
  if(!active||painted===active.pts.length)return;const points=active.pts.slice(Math.max(0,painted-1));
  drawPart(active.tool==='eraser'?ctx:preview,canvas,active,points,scale);painted=active.pts.length;
  const padding=strokeWidth(active)*scale+2;
  for(const p of points){const x=p.x*canvas.width,y=p.y*canvas.height;if(!bounds)bounds={left:x-padding,top:y-padding,right:x+padding,bottom:y+padding};else{bounds.left=Math.min(bounds.left,x-padding);bounds.top=Math.min(bounds.top,y-padding);bounds.right=Math.max(bounds.right,x+padding);bounds.bottom=Math.max(bounds.bottom,y+padding);}}
 }
 function crop(){const x=Math.max(0,Math.floor(bounds?.left||0)),y=Math.max(0,Math.floor(bounds?.top||0));return [x,y,Math.max(1,Math.min(canvas.width,Math.ceil(bounds?.right||1))-x),Math.max(1,Math.min(canvas.height,Math.ceil(bounds?.bottom||1))-y)];}
 function clearPreview(){if(bounds)preview.clearRect(...crop());bounds=null;}
 function commitSegment(){
  if(!active)return;paint();
  if(active.tool!=='eraser'&&bounds){const box=crop();ctx.save();ctx.globalAlpha=opacityFor(active);ctx.drawImage(live,...box,...box);ctx.restore();}
  clearPreview();active=null;
 }
 function redraw(){
  if(active)return;
  sync();ctx.clearRect(0,0,canvas.width,canvas.height);preview.clearRect(0,0,live.width,live.height);
  for(const s of getStrokes()){
   const points=s.pts||s.points||[];if(s.tool==='highlighter'){
    preview.clearRect(0,0,live.width,live.height);drawPart(preview,canvas,s,points,scale);ctx.save();ctx.globalAlpha=opacityFor(s);ctx.drawImage(live,0,0);ctx.restore();
   }else drawPart(ctx,canvas,s,points,scale);
  }
  preview.clearRect(0,0,live.width,live.height);
 }
 function inContact(e){return Number.isFinite(e.buttons)?!!(e.buttons&33)||e.pressure>0:e.pressure>0||(e.type==='pointerdown'&&e.button!==2);}
 function toolFor(e){const eraser=pointerType==='pen'&&(Number.isFinite(e.buttons)?!!(e.buttons&34):e.button===5||e.button===2);return eraser?'eraser':baseTool.tool;}
 function startSegment(e){active={...baseTool,tool:toolFor(e),pts:[point(e)]};painted=0;lastSample=Number.isFinite(e.timeStamp)?e.timeStamp:-Infinity;bounds=null;live.style.opacity=String(opacityFor(active));getStrokes().push(active);paint();}
 function release(){const pointer=pid;pid=null;if(owner?.canvas===canvas)owner=null;try{canvas.releasePointerCapture?.(pointer);}catch{}}
 function discard(){
  if(!active)return;const erased=active.tool==='eraser',strokes=getStrokes(),index=strokes.indexOf(active);if(index>=0)strokes.splice(index,1);
  clearPreview();active=null;release();if(erased)redraw();
 }
 function start(e){
  rememberPen(e);if(!isEnabled()||canvas.closest('.atlas-hand-mode'))return;
  const type=e.pointerType||'mouse';
  if(type==='pen'&&!inContact(e))return;
  if(type!=='pen'&&(getInputMode()==='pen'||Date.now()-lastPenAt<1000||e.isPrimary===false||e.button>0)){consume(e);return;}
  if(active||owner){consume(e);return;}
  consume(e);onBeforeStart();rect=canvas.getBoundingClientRect();sync();pid=e.pointerId;pointerType=type;baseTool={...getTool()};
  owner={canvas,pid,type,finish,discard};startSegment(e);try{canvas.setPointerCapture?.(pid);}catch{}
 }
 function appendPoint(e,exact=false){
  if(!Number.isFinite(e.clientX)||!Number.isFinite(e.clientY))return;
  const timestamp=Number.isFinite(e.timeStamp)?e.timeStamp:null;
  if(timestamp!==null&&timestamp<lastSample)return;
  if(timestamp!==null)lastSample=timestamp;
  const p=point(e),last=active.pts.at(-1),distance=Math.hypot((p.x-last.x)*rect.width,(p.y-last.y)*rect.height);
  if(distance>(exact?0:.15))active.pts.push(p);
 }
 function move(e){
  rememberPen(e);
  if(!active){if(e.pointerType==='pen'&&inContact(e))start(e);return;}
  if(pid!==e.pointerId)return;consume(e);
  if(Number.isFinite(e.buttons)&&e.buttons===0&&!(e.pressure>0)){finish(e);return;}
  if(Number.isFinite(e.timeStamp)&&e.timeStamp<lastSample)return;
  if(toolFor(e)!==active.tool){commitSegment();startSegment(e);}
  let batch=[];try{batch=e.getCoalescedEvents?.()||[];}catch{}
  for(const item of batch)appendPoint(item);
  appendPoint(e,true);paint();
 }
 function finish(e){
  if(!active||pid!==e.pointerId)return;
  if(e.type==='pointerup')appendPoint(e,true);
  commitSegment();release();baseTool=null;onChange();
 }
 canvas.addEventListener('pointerdown',start);
 canvas.addEventListener('pointerenter',rememberPen);
 // Keep the standard path even when a browser exposes raw updates but a device
 // does not deliver them. Timestamps and positions discard duplicated samples.
 canvas.addEventListener('pointermove',move);
 if('onpointerrawupdate' in root)canvas.addEventListener('pointerrawupdate',move);
 canvas.addEventListener('contextmenu',e=>{if(isEnabled())e.preventDefault();});
 canvas.addEventListener('pointerup',finish);canvas.addEventListener('pointercancel',finish);canvas.addEventListener('lostpointercapture',finish);
 return {redraw,sync,finish,stop:()=>{if(active)finish({pointerId:pid});},isDrawing:()=>!!active};
}
document.addEventListener?.('pointerover',rememberPen,{capture:true,passive:true});
root.addEventListener?.('pointerup',e=>owner?.finish(e),true);
root.addEventListener?.('pointercancel',e=>owner?.finish(e),true);
root.addEventListener?.('blur',()=>{if(owner)owner.finish({pointerId:owner.pid});});
const api={create,drawPart,isDrawing:()=>!!owner};if(typeof module==='object'&&module.exports)module.exports=api;else root.StudyAtlasInk=api;
})(typeof window!=='undefined'?window:globalThis);
