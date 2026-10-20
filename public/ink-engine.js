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
 }else{
  // Tablets can send dozens of coalesced pen samples in a single update.
  // Merge similarly pressured segments into one path instead of issuing
  // an expensive canvas stroke for every individual sample.
  let from=1;
  while(from<points.length){
   const lineWidth=width*scale*(.65+((points[from].p??.5)+(points[from-1].p??.5))*.35);
   ctx.lineWidth=lineWidth;ctx.beginPath();ctx.moveTo(points[from-1].x*canvas.width,points[from-1].y*canvas.height);
   let next=from;
   while(next<points.length){
    const nextWidth=width*scale*(.65+((points[next].p??.5)+(points[next-1].p??.5))*.35);
    if(next>from&&Math.abs(nextWidth-lineWidth)>Math.max(.18,width*scale*.05))break;
    ctx.lineTo(points[next].x*canvas.width,points[next].y*canvas.height);next++;
   }
   ctx.stroke();from=next;
  }
 }
 ctx.restore();
}
function create({canvas,getStrokes,onChange=()=>{},onBeforeStart=()=>{},isEnabled=()=>true,getInputMode=()=> 'auto',getTool=()=>({tool:'pen',size:3,color:'#ff4f70'}),usePrediction=false}){
 const ctx=canvas.getContext('2d',{desynchronized:true}),live=document.createElement('canvas');live.className='atlas-gpage-canvas atlas-gpage-live';live.style.pointerEvents='none';
 // Overlay geometry never depends on a stylesheet arriving first.
 for(const layer of [canvas,live])Object.assign(layer.style,{position:'absolute',inset:'0',width:'100%',height:'100%'});
 canvas.style.touchAction='none';canvas.style.userSelect='none';
 if(canvas.parentElement&&!canvas.parentElement.style.position)canvas.parentElement.style.position='relative';
 canvas.after(live);const preview=live.getContext('2d',{desynchronized:true});
 live.width=live.height=1;
 let active=null,rect=null,pid=null,pointerType='',painted=0,scale=1,lastSample=-Infinity,bounds=null,baseTool=null,clip=null,previewRatio=1,tip=null,tipTimer=null,paintFrame=0,lastPaintTime=-Infinity,fastSvg=null,fastPath=null,fastData='',fastSegments=0,fastShown=0,fastDot=null;
 function sync(){
  scale=canvas.width/Math.max(1,canvas.clientWidth);
  if(!active&&canvas.width===1&&canvas.height===1){live.width=live.height=1;clearPrediction();if(tip)tip.width=tip.height=1;}
 }
 function place(layer,box){
  Object.assign(layer.style,{inset:'auto',left:box.x/canvas.width*100+'%',top:box.y/canvas.height*100+'%',width:box.w/canvas.width*100+'%',height:box.h/canvas.height*100+'%'});
 }
 function transform(context,layer,box){const x=layer.width/box.w,y=layer.height/box.h;context.setTransform(x,0,0,y,-box.x*x,-box.y*y);}
 function preparePreview(){
  // Long explanations can be thousands of pixels tall. Only the visible part
  // needs a frequently updated texture; the saved vector coordinates stay full-size.
  const viewport=canvas.closest('.atlas-zoom-viewport')?.getBoundingClientRect()||rect;
  const screenWidth=root.innerWidth||rect.left+rect.width,screenHeight=root.innerHeight||rect.top+rect.height;
  const left=Math.max(rect.left,viewport.left,0),top=Math.max(rect.top,viewport.top,0);
  const right=Math.min(rect.left+rect.width,viewport.left+viewport.width,screenWidth),bottom=Math.min(rect.top+rect.height,viewport.top+viewport.height,screenHeight);
  const x=Math.max(0,Math.floor((left-rect.left)*canvas.width/Math.max(1,rect.width))),y=Math.max(0,Math.floor((top-rect.top)*canvas.height/Math.max(1,rect.height)));
  clip={x,y,w:Math.max(1,Math.min(canvas.width-x,Math.ceil((right-rect.left)*canvas.width/Math.max(1,rect.width))-x)),h:Math.max(1,Math.min(canvas.height-y,Math.ceil((bottom-rect.top)*canvas.height/Math.max(1,rect.height))-y))};
  previewRatio=Math.min(1,rect.width/Math.max(1,canvas.width)*Math.min(1.5,root.devicePixelRatio||1),Math.sqrt(350000/(clip.w*clip.h)));
  const w=Math.max(1,Math.floor(clip.w*previewRatio)),h=Math.max(1,Math.floor(clip.h*previewRatio));
  if(live.width!==w)live.width=w;if(live.height!==h)live.height=h;
  place(live,clip);transform(preview,live,clip);
 }
 // Immediate stylus feedback uses a native SVG path, not a high-resolution
 // canvas. Updating a short path is synchronous and cheap even when the browser
 // is still compositing PDF canvases underneath it. Permanent ink remains
 // vector data in the existing stroke history.
 function beginFastPen(){
  if(pointerType!=='pen'||active?.tool!=='pen'||!document.createElementNS)return false;
  const ns='http://www.w3.org/2000/svg';
  if(!fastSvg){
   fastSvg=document.createElementNS(ns,'svg');
   fastSvg.setAttribute('aria-hidden','true');
   Object.assign(fastSvg.style,{position:'absolute',inset:'0',width:'100%',height:'100%',overflow:'hidden',pointerEvents:'none',zIndex:'71'});
   live.after(fastSvg);
  }
  fastSvg.setAttribute('viewBox','0 0 '+canvas.width+' '+canvas.height);
  fastSvg.setAttribute('preserveAspectRatio','none');
  fastSvg.replaceChildren?.();
  fastPath=null;fastData='';fastShown=0;fastSegments=0;
  const p=active.pts[0],width=strokeWidth(active)*scale;
  fastDot=document.createElementNS(ns,'circle');
  fastDot.setAttribute('cx',String(p.x*canvas.width));
  fastDot.setAttribute('cy',String(p.y*canvas.height));
  fastDot.setAttribute('r',String(width/2));
  fastDot.setAttribute('fill',active.color||'#ff4f70');
  fastSvg.appendChild(fastDot);fastShown=1;return true;
 }
 function showFastPen(){
  if(!fastSvg||!active||active.tool!=='pen'||pointerType!=='pen')return false;
  const pts=active.pts,ns='http://www.w3.org/2000/svg',width=strokeWidth(active)*scale;
  if(pts.length<2)return true;
  if(fastDot){fastDot.remove?.();fastDot=null;}
  for(let i=Math.max(1,fastShown);i<pts.length;i++){
   const previous=pts[i-1],p=pts[i];
   if(!fastPath||fastSegments>=36){
    if(fastPath)fastPath.setAttribute('d',fastData);
    fastPath=document.createElementNS(ns,'path');
    fastPath.setAttribute('fill','none');
    fastPath.setAttribute('stroke',active.color||'#ff4f70');
    fastPath.setAttribute('stroke-width',String(width*(.65+((p.p??.5)+(previous.p??.5))*.35)));
    fastPath.setAttribute('stroke-linejoin','round');
    fastPath.setAttribute('stroke-linecap','round');
    fastData='M'+(previous.x*canvas.width).toFixed(2)+' '+(previous.y*canvas.height).toFixed(2);
    fastSegments=0;fastSvg.appendChild(fastPath);
   }
   fastData+=' L'+(p.x*canvas.width).toFixed(2)+' '+(p.y*canvas.height).toFixed(2);
   fastSegments++;
  }
  fastPath?.setAttribute('d',fastData);
  fastShown=pts.length;return true;
 }
 function clearFastPen(){
  fastSvg?.replaceChildren?.();fastSvg?.setAttribute('aria-hidden','true');
  fastPath=null;fastDot=null;fastData='';fastShown=0;fastSegments=0;
 }
 function point(e){const pressure=Number(e.pressure);return {x:Math.max(0,Math.min(1,(e.clientX-rect.left)/Math.max(1,rect.width))),y:Math.max(0,Math.min(1,(e.clientY-rect.top)/Math.max(1,rect.height))),p:(e.pointerType||pointerType)==='pen'&&Number.isFinite(pressure)?Math.max(0,Math.min(1,pressure)):.5};}
 function paint(){
  if(!active||painted===active.pts.length)return;const points=active.pts.slice(Math.max(0,painted-1));
  drawPart(active.tool==='eraser'?ctx:preview,canvas,active,points,scale);painted=active.pts.length;
  const padding=strokeWidth(active)*scale+2;
  for(const p of points){const x=p.x*canvas.width,y=p.y*canvas.height;if(!bounds)bounds={left:x-padding,top:y-padding,right:x+padding,bottom:y+padding};else{bounds.left=Math.min(bounds.left,x-padding);bounds.top=Math.min(bounds.top,y-padding);bounds.right=Math.max(bounds.right,x+padding);bounds.bottom=Math.max(bounds.bottom,y+padding);}}
 }
 // Make the first pen movement visible immediately, just like a mouse.
 // Raw pen input can arrive hundreds of times a second. Throttle only the
 // subsequent canvas work; never make handwriting rely on a delayed frame.
 function cancelPaint(){if(paintFrame){root.cancelAnimationFrame?.(paintFrame);paintFrame=0;}}
 function flushPaint(){cancelPaint();paint();}
 function requestPaint(e){
  if(pointerType==='pen'&&active?.tool==='pen'&&showFastPen())return;
  if(pointerType!=='pen'){paint();return;}
  const now=Number.isFinite(e?.timeStamp)?e.timeStamp:Date.now();
  if(lastPaintTime===-Infinity||now-lastPaintTime>=10||!root.requestAnimationFrame){
   flushPaint();lastPaintTime=now;return;
  }
  if(paintFrame)return;
  paintFrame=root.requestAnimationFrame(()=>{
   paintFrame=0;if(!active)return;
   paint();lastPaintTime=now;
  });
 }
 function crop(){const x=Math.max(0,Math.floor(bounds?.left||0)),y=Math.max(0,Math.floor(bounds?.top||0));return [x,y,Math.max(1,Math.min(canvas.width,Math.ceil(bounds?.right||1))-x),Math.max(1,Math.min(canvas.height,Math.ceil(bounds?.bottom||1))-y)];}
 function clearPreview(){if(bounds)preview.clearRect(...crop());bounds=null;}
 function clearPrediction(){if(tipTimer!==null)clearTimeout(tipTimer);tipTimer=null;if(tip&&!tip.hidden){tip.hidden=true;tip.style.display='none';}}
 function predict(e){
  if(!usePrediction||pointerType!=='pen'||active?.tool!=='pen'||!Number.isFinite(e.timeStamp))return;
  let predicted=[];try{predicted=e.getPredictedEvents?.()||[];}catch{}
  const last=active.pts.at(-1),points=[last];let timestamp=e.timeStamp;
  for(const event of predicted){
   if(!Number.isFinite(event.timeStamp)||event.timeStamp<=timestamp||event.timeStamp>e.timeStamp+12)break;
   if(!Number.isFinite(event.clientX)||!Number.isFinite(event.clientY))break;
   const p=point(event);
   if(Math.hypot((p.x-last.x)*rect.width,(p.y-last.y)*rect.height)>24)break;
   points.push(p);timestamp=event.timeStamp;
  }
  if(points.length<2)return;
  if(!tip){tip=document.createElement('canvas');tip.className='atlas-gpage-canvas atlas-gpage-live atlas-gpage-tip';Object.assign(tip.style,{position:'absolute',pointerEvents:'none'});live.after(tip);}
  const padding=strokeWidth(active)*scale+2,xs=points.map(p=>p.x*canvas.width),ys=points.map(p=>p.y*canvas.height);
  const x=Math.max(clip.x,Math.floor(Math.min(...xs)-padding)),y=Math.max(clip.y,Math.floor(Math.min(...ys)-padding));
  if(x>=clip.x+clip.w||y>=clip.y+clip.h||Math.max(...xs)+padding<clip.x||Math.max(...ys)+padding<clip.y)return;
  const box={x,y,w:Math.max(1,Math.min(clip.x+clip.w,Math.ceil(Math.max(...xs)+padding))-x),h:Math.max(1,Math.min(clip.y+clip.h,Math.ceil(Math.max(...ys)+padding))-y)};
  tip.width=Math.max(1,Math.ceil(box.w*previewRatio));tip.height=Math.max(1,Math.ceil(box.h*previewRatio));place(tip,box);
  const context=tip.getContext('2d',{desynchronized:true});transform(context,tip,box);drawPart(context,canvas,active,points,scale);tip.hidden=false;tip.style.display='block';
  // Predicted ink is disposable: never add it to history, notes or the saved canvas.
  tipTimer=setTimeout(clearPrediction,40);
 }
 function recordedStroke(stroke){
  const points=stroke.pts||stroke.points||[];
  if(stroke.tool!=='highlighter'){drawPart(ctx,canvas,stroke,points,scale);return;}
  if(!points.length)return;
  // A single mask prevents opacity building up at segment joins or crossings.
  // Crop that mask too, so reopening many small highlights is cheap.
  let left=canvas.width,top=canvas.height,right=0,bottom=0;
  for(const p of points){left=Math.min(left,p.x*canvas.width);top=Math.min(top,p.y*canvas.height);right=Math.max(right,p.x*canvas.width);bottom=Math.max(bottom,p.y*canvas.height);}
  const padding=strokeWidth(stroke)*scale+2,x=Math.max(0,Math.floor(left-padding)),y=Math.max(0,Math.floor(top-padding));
  const mask=document.createElement('canvas');mask.width=Math.max(1,Math.min(canvas.width,Math.ceil(right+padding))-x);mask.height=Math.max(1,Math.min(canvas.height,Math.ceil(bottom+padding))-y);
  const context=mask.getContext('2d');context.setTransform(1,0,0,1,-x,-y);
  drawPart(context,canvas,stroke,points,scale);ctx.save();ctx.globalAlpha=opacityFor(stroke);ctx.drawImage(mask,x,y);ctx.restore();mask.width=mask.height=1;
 }
 function commitSegment(){
  if(!active)return;
  clearPrediction();
  if(!fastSvg||pointerType!=='pen'||active.tool!=='pen')flushPaint();
  // Do not copy pixels from the desynchronized preview bitmap. The GPU can
  // still be compositing that surface when the pen lifts, causing letters to
  // vanish after the preview is cleared. Replay the actual vector points into
  // the durable canvas instead; this also keeps snapshots and saved notes
  // independent of preview timing and clipping.
  if(active.tool!=='eraser')recordedStroke(active);
  // Leave fast feedback visible until permanent pixels have been submitted.
  clearFastPen();clearPreview();active=null;
 }
 function redraw(){
  if(active)return;
  sync();ctx.clearRect(0,0,canvas.width,canvas.height);
  for(const s of getStrokes())recordedStroke(s);
 }
 function inContact(e){return Number.isFinite(e.buttons)?!!(e.buttons&33)||e.pressure>0:e.pressure>0||(e.type==='pointerdown'&&e.button!==2);}
 function toolFor(e){const eraser=pointerType==='pen'&&(Number.isFinite(e.buttons)?!!(e.buttons&34):e.button===5||e.button===2);return eraser?'eraser':baseTool.tool;}
 function startSegment(e){
  active={...baseTool,tool:toolFor(e),pts:[point(e)]};
  painted=0;lastPaintTime=-Infinity;lastSample=Number.isFinite(e.timeStamp)?e.timeStamp:-Infinity;bounds=null;
  live.style.opacity=String(opacityFor(active));getStrokes().push(active);
  // Opening a large scratch bitmap on every pen-down is unnecessarily slow.
  // Prepare it only for highlighter, eraser or non-SVG fallback drawing.
  if(!beginFastPen()){if(!clip)preparePreview();paint();}
 }
 function release(){const pointer=pid;pid=null;if(owner?.canvas===canvas)owner=null;try{canvas.releasePointerCapture?.(pointer);}catch{}}
 function discard(){
  if(!active)return;const erased=active.tool==='eraser',strokes=getStrokes(),index=strokes.indexOf(active);if(index>=0)strokes.splice(index,1);
  cancelPaint();clearPrediction();clearFastPen();clearPreview();active=null;release();if(erased)redraw();
 }
 function start(e){
  rememberPen(e);if(!isEnabled()||canvas.closest('.atlas-hand-mode'))return;
  const type=e.pointerType||'mouse';
  if(type==='pen'&&!inContact(e))return;
  if(type!=='pen'&&(getInputMode()==='pen'||Date.now()-lastPenAt<1000||e.isPrimary===false||e.button>0)){consume(e);return;}
  if(active||owner){consume(e);return;}
  consume(e);onBeforeStart();rect=canvas.getBoundingClientRect();sync();clip=null;pid=e.pointerId;pointerType=type;baseTool={...getTool()};
  owner={canvas,pid,type,finish,discard};startSegment(e);try{canvas.setPointerCapture?.(pid);}catch{}
 }
 function appendPoint(e,exact=false){
  if(!Number.isFinite(e.clientX)||!Number.isFinite(e.clientY))return;
  const timestamp=Number.isFinite(e.timeStamp)?e.timeStamp:null;
  if(timestamp!==null&&timestamp<lastSample)return;
  if(timestamp!==null)lastSample=timestamp;
  const p=point(e),last=active.pts.at(-1),distance=Math.hypot((p.x-last.x)*rect.width,(p.y-last.y)*rect.height);
  // Subpixel stylus jitter can create thousands of expensive segments.
  // Keep the latest location and full pressure, but omit imperceptible noise.
  if(distance>(exact?.20:.50))active.pts.push(p);
 }
 function move(e){
  rememberPen(e);
  if(!active){if(e.pointerType==='pen'&&inContact(e))start(e);return;}
  if(pid!==e.pointerId)return;consume(e);
  if(Number.isFinite(e.buttons)&&e.buttons===0&&!(e.pressure>0)){finish(e);return;}
  if(Number.isFinite(e.timeStamp)&&e.timeStamp<lastSample)return;
  clearPrediction();
  if(toolFor(e)!==active.tool){commitSegment();startSegment(e);}
  const before=active.pts.length;
  // Raw pen updates already arrive at hardware frequency. Asking each raw
  // event for coalesced history can replay the same samples repeatedly and
  // stall the main thread on stylus-only devices. Pointermove keeps the
  // coalesced fallback for browsers that do not deliver raw input.
  let batch=[];
  if(e.type!=='pointerrawupdate'){try{batch=e.getCoalescedEvents?.()||[];}catch{}}
  for(const item of batch)appendPoint(item);
  appendPoint(e,true);
  if(active.pts.length>before)requestPaint(e);
  predict(e);
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
