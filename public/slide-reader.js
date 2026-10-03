(()=>{
'use strict';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const clean=s=>String(s||'').replace(/\s+/g,' ').trim();
const PALETTES={nmhs10100:['#ef92c9','#79bce9'],path30080:['#ff7f82','#f4b15f'],mdsa20030:['#a784ff','#5ed6bd'],mdsa20010:['#69d39d','#55b8aa'],anat20060:['#7da6ff','#d6a86e'],anat20040:['#65cce8','#7b8cff']};
let state=null;
const script=src=>new Promise((resolve,reject)=>{const s=document.createElement('script');s.src=src;s.onload=resolve;s.onerror=reject;document.body.appendChild(s);});
async function dependencies(){
 for(const [name,src] of [['StudyAtlasSlideNotes','slide-notes.js'],['StudyAtlasPDF','pdf-source.js'],['StudyAtlasLocalAI','local-ai.js']])if(!window[name])await script('/'+src+'?v=4');
}
function fromData(data,n){
 const note=(data.slides||[]).find(s=>Number(s.n)===n);if(note)return {...note};
 const matches=(data.chapters||[]).flatMap(ch=>(ch.concepts||[]).filter(c=>(c.slide_refs||[]).map(Number).includes(n)));
 const visual=(data.chapters||[]).flatMap(ch=>ch.visuals||[]).find(v=>Number(v.slide)===n);
 return {n,title:matches[0]?.heading||visual?.title||'Slide '+n,explain:matches.map(c=>c.explain||'').filter(Boolean).join('\n\n'),key_points:matches.flatMap(c=>c.key_points||[]),labels:[],origin:matches.length?'existing':'source',visual_explain:visual?.explain||'',extra:matches.map(c=>c.clinical||c.memory||c.fun_fact||'').filter(Boolean).join('\n')};
}
function readLegacy(){
 const embedded=document.getElementById('atlasLectureData');if(embedded){try{return JSON.parse(embedded.textContent);}catch{}}
 const chapters=[];let slide_count=0;
 for(const ch of document.querySelectorAll('main .chapter,.main .chapter')){
  const range=(ch.querySelector('.chapter-title,.chhead')?.textContent||ch.querySelector('.kicker')?.textContent||'').match(/SLIDES?\s+(\d+)\s*[–—-]\s*(\d+)/i);
  const a=Number(ch.dataset.start||range?.[1]),b=Number(ch.dataset.end||range?.[2]);if(!a||!b)continue;
  slide_count=Math.max(slide_count,b);const concepts=[],visuals=[];
  for(const c of ch.querySelectorAll('.concept')){
   const refs=(c.querySelector('.refs')?.textContent.match(/\d+/g)||[]).map(Number);
   concepts.push({heading:c.querySelector('h4')?.textContent||'',explain:c.querySelector('p')?.textContent||'',key_points:[...c.querySelectorAll('.keypoints li')].map(l=>l.textContent),slide_refs:refs,clinical:c.querySelector('.clinical')?.textContent||'',memory:c.querySelector('.memory')?.textContent||''});
  }
  for(const v of ch.querySelectorAll('.visualcard')){const n=Number(v.querySelector('.visualtag')?.textContent.match(/\d+/)?.[0]);if(n)visuals.push({slide:n,title:v.querySelector('h4')?.textContent||'',explain:v.querySelector('.visualcopy p')?.textContent||''});}
  // Hand-written guides place each original figure next to its teaching paragraph.
  let pending=[],heading=ch.querySelector('h3,h2')?.textContent||'',lastSlide=null;
  for(const child of ch.children){
   if(child.matches('h4'))heading=child.textContent;
   if(child.matches('p,ul,.note,.path,.tablewrap,.story,.twocol'))pending.push(clean(child.textContent));
   if(child.matches('figure.slidepic')){
    const n=Number((child.querySelector('figcaption')?.textContent||child.querySelector('img')?.alt||'').match(/slide\s+(\d+)/i)?.[1]);
    if(n){const caption=clean(child.querySelector('figcaption')?.textContent||'');concepts.push({heading,explain:pending.join('\n\n'),slide_refs:[n],key_points:[]});visuals.push({slide:n,title:caption.replace(/^.*?Slide\s+\d+\s*[—-]?\s*/i,''),explain:caption});lastSlide=n;pending=[];}
   }
  }
  if(pending.length&&lastSlide){const c=concepts.findLast(c=>c.slide_refs?.[0]===lastSlide);if(c)c.explain+='\n\n'+pending.join('\n\n');}
  const clone=ch.cloneNode(true);clone.querySelectorAll('script,style,canvas,button,iframe,figure,.chapter-title,.chhead,.q').forEach(el=>el.remove());
  const questions=[...ch.querySelectorAll('.q')].map(q=>({question:q.querySelector('b')?.textContent||'',options:[...q.querySelectorAll('.opts label span')].map(x=>x.textContent),answer_index:Number(q.dataset.answer),explanation:q.querySelector('.feedback')?.dataset.exp||''}));
  chapters.push({title:ch.querySelector('h2,h3')?.textContent||'Chapter',slide_start:a,slide_end:b,concepts,visuals,questions,guide:clean(clone.textContent)});
 }
 const cheat_sheet=[...document.querySelectorAll('.cheat,.cheatcard')].map(c=>({heading:c.querySelector('h3,h4')?.textContent||'',bullets:[...c.querySelectorAll('li')].map(x=>clean(x.textContent))}));
 return {title:document.querySelector('h1')?.textContent||document.title,slide_count,chapters,cheat_sheet};
}
function toolbar(side){return `<div class="atlas-pane-toolbar"><b>${side==='original'?'Original slide':'Study explanation'}</b><button data-zoom="-1" aria-label="Zoom out">−</button><output>100%</output><button data-zoom="1" aria-label="Zoom in">+</button><button data-fit>Fit</button><button class="atlas-pan-toggle" aria-pressed="false" title="Drag with mouse, finger or pen to pan">✋</button></div>`;}
function noteHTML(note){
 const N=window.StudyAtlasSlideNotes,source=note.source||'',defs=note.definitions||N.definitions(source);
 const short=String(note.explain||'').trim(),points=(note.key_points||[]).filter(Boolean);
 const preview=short.length>900?short.slice(0,900).replace(/\s+\S*$/,'')+'…':short;
 return `<div class="atlas-teaching-copy"><h3>${esc(note.title||'Slide '+note.n)}</h3>${preview?`<p>${esc(preview).replace(/\n\n/g,'</p><p>')}</p>`:''}${points.length?`<ul>${points.slice(0,6).map(p=>`<li>${esc(p)}</li>`).join('')}</ul>`:''}${note.visual_explain?`<p>${esc(note.visual_explain)}</p>`:''}${defs.length?`<div class="atlas-definitions">${defs.map(d=>`<p><b>${esc(d.term)}</b> — ${esc(d.meaning)}</p>`).join('')}</div>`:''}<div class="atlas-label-legend"></div>${note.extra?`<details><summary>Memory / clinical link</summary><p>${esc(note.extra)}</p></details>`:''}${short.length>900?`<details><summary>Complete existing explanation</summary><p>${esc(short).replace(/\n/g,'<br>')}</p></details>`:''}<details><summary>Exact source text · slide ${note.n}</summary><div class="atlas-source-text">${esc(source||'No extractable text on this slide.')}</div></details></div>`;
}
function rowHTML(n){const note=state.notes.get(n);
 return `<section class="chapter visualcard atlas-slide-row" id="atlas-slide-${n}" data-slide="${n}" data-start="${n}" data-end="${n}"><div class="atlas-row-head"><h2><span class="atlas-slide-number">${String(n).padStart(2,'0')}</span><span class="atlas-row-title">${esc(note.title||'Slide '+n)}</span></h2><span class="atlas-origin-badge">${note.origin==='on-device'?'On-device explanation':note.origin==='existing'?'Existing guide':'Source notes'}</span></div><div class="atlas-pair"><div class="atlas-pane visualframe" data-side="original">${toolbar('original')}<div class="atlas-zoom-viewport"><div class="atlas-zoom-space"><div class="atlas-zoom-content"><div class="atlas-source-stage" data-ink-id="slide-${n}-original"><canvas class="atlas-slide-bitmap" aria-label="Original slide ${n}"></canvas><span class="atlas-source-loading">Original slide ${n} · loading…</span></div></div></div></div><div class="atlas-pane-footer"><a href="${esc(state.pdfUrl)}#page=${n}" target="_blank" rel="noopener">Open untouched slide ↗</a><span>Pinch to zoom · drag to pan</span></div></div><div class="atlas-pane visualcopy" data-side="teaching">${toolbar('teaching')}<div class="atlas-zoom-viewport"><div class="atlas-zoom-space"><div class="atlas-zoom-content"><div class="atlas-teaching-stage" data-ink-id="slide-${n}-teaching">${noteHTML(note)}</div></div></div></div><div class="atlas-pane-footer"><span class="visualtag">SLIDE ${n}</span><button class="atlas-explain-picture" data-explain="${n}">Explain picture</button><button data-labels="${n}">Highlight labels</button></div></div></div></section>`;
}
function current(){
 if(!state)return null;const y=innerHeight*.4;
 const row=[...state.root.querySelectorAll('.atlas-slide-row')].find(c=>{const r=c.getBoundingClientRect();return r.top<y&&r.bottom>y;})||state.root.querySelector('.atlas-slide-row');
 return row?{n:Number(row.dataset.slide),row,note:state.notes.get(Number(row.dataset.slide))}:null;
}
function go(n){n=Math.max(1,Math.min(state.count,Number(n)||1));state.root.querySelector('#atlas-slide-'+n)?.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'start'});state.focused=n;render(n);}
function setupZoom(pane){
 const viewport=pane.querySelector('.atlas-zoom-viewport'),space=pane.querySelector('.atlas-zoom-space'),content=pane.querySelector('.atlas-zoom-content');let scale=1,hand=false,pointers=new Map(),gesture=null;
 const output=pane.querySelector('output');
 function update(){content.style.width=viewport.clientWidth+'px';content.style.transform=`scale(${scale})`;space.style.width=content.offsetWidth*scale+'px';space.style.height=content.offsetHeight*scale+'px';output.value=Math.round(scale*100)+'%';pane.dataset.scale=scale;}
 function zoom(next,clientX,clientY){
  const r=viewport.getBoundingClientRect(),x=(clientX??r.left+r.width/2)-r.left,y=(clientY??r.top+r.height/2)-r.top,ratio=Math.max(.6,Math.min(4,next))/scale;
  scale=Math.max(.6,Math.min(4,next));update();viewport.scrollLeft=(viewport.scrollLeft+x)*ratio-x;viewport.scrollTop=(viewport.scrollTop+y)*ratio-y;state.activePane=pane;const dock=document.getElementById('atlasGZ');if(dock)dock.textContent=Math.round(scale*100)+'%';
 }
 pane.querySelectorAll('[data-zoom]').forEach(b=>b.onclick=()=>zoom(scale* Math.pow(1.15,Number(b.dataset.zoom))));pane.querySelector('[data-fit]').onclick=()=>{zoom(1);viewport.scrollTo(0,0);};
 const pan=pane.querySelector('.atlas-pan-toggle');pan.onclick=()=>{hand=!hand;pan.setAttribute('aria-pressed',String(hand));viewport.style.cursor=hand?'grab':'';viewport.style.touchAction=hand?'none':'pan-x pan-y';viewport.classList.toggle('atlas-hand-mode',hand);};
 viewport.addEventListener('wheel',e=>{state.activePane=pane;if(!e.ctrlKey&&!e.metaKey)return;e.preventDefault();zoom(scale*Math.exp(-e.deltaY*.008),e.clientX,e.clientY);},{passive:false});
 viewport.addEventListener('pointerdown',e=>{
  state.activePane=pane;if(e.target.closest('button,a,summary,input')||e.button>0)return;
  if(document.body.classList.contains('atlas-gdrawing')&&!hand)return;
  pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
  if(pointers.size===2){const [a,b]=[...pointers.values()];gesture={distance:Math.hypot(a.x-b.x,a.y-b.y),scale};e.preventDefault();}
  if(hand||pointers.size===2)try{viewport.setPointerCapture(e.pointerId);}catch{}
 });
 viewport.addEventListener('pointermove',e=>{
  const prev=pointers.get(e.pointerId);if(!prev)return;pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
  if(pointers.size===2&&gesture){e.preventDefault();const [a,b]=[...pointers.values()];zoom(gesture.scale*Math.hypot(a.x-b.x,a.y-b.y)/Math.max(1,gesture.distance),(a.x+b.x)/2,(a.y+b.y)/2);}
  else if(hand){e.preventDefault();viewport.scrollLeft-=e.clientX-prev.x;viewport.scrollTop-=e.clientY-prev.y;}
 },{passive:false});
 const finish=e=>{pointers.delete(e.pointerId);gesture=null;};viewport.addEventListener('pointerup',finish);viewport.addEventListener('pointercancel',finish);viewport.addEventListener('lostpointercapture',finish);
 // Touch pinch needs custom handling; single-finger scrolling remains native via scroll offsets.
 viewport.addEventListener('touchstart',e=>{if(e.touches.length===2){e.preventDefault();const [a,b]=e.touches;gesture={distance:Math.hypot(a.clientX-b.clientX,a.clientY-b.clientY),scale};}},{passive:false});
 viewport.addEventListener('touchmove',e=>{if(e.touches.length!==2||!gesture)return;e.preventDefault();const [a,b]=e.touches;zoom(gesture.scale*Math.hypot(a.clientX-b.clientX,a.clientY-b.clientY)/Math.max(1,gesture.distance),(a.clientX+b.clientX)/2,(a.clientY+b.clientY)/2);},{passive:false});viewport.addEventListener('touchend',()=>gesture=null,{passive:true});
 new ResizeObserver(()=>update()).observe(content);new ResizeObserver(()=>update()).observe(viewport);update();pane.atlasZoom=delta=>zoom(scale*Math.pow(1.15,delta));
}
function labelMatches(text,label){
 const a=clean(text).toLowerCase().replace(/[^a-z0-9]+/g,' '),b=clean(label).toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
 return b&&(' '+a+' ').includes(' '+b+' ');
}
function labelLayer(stage,boxes,labels){
 stage.querySelector('.atlas-label-layer')?.remove();if(!labels.length)return;
 const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('class','atlas-label-layer');svg.setAttribute('viewBox','0 0 1000 1000');svg.setAttribute('preserveAspectRatio','none');
 labels.forEach((label,i)=>{
  for(const b of boxes.filter(b=>labelMatches(b.text,label.text))){
   const x=Math.max(0,b.x*1000-4),y=Math.max(0,b.y*1000-4),w=Math.min(1000-x,b.w*1000+8),h=b.h*1000+8;
   svg.insertAdjacentHTML('beforeend',`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="3"/><circle cx="${Math.max(12,x-10)}" cy="${y+h/2}" r="11"/><text x="${Math.max(12,x-10)}" y="${y+h/2+4}">${label.index||i+1}</text>`);
  }
 });stage.appendChild(svg);
}
function labelsFor(note,page){
 const candidates=(note.labels||[]).map(x=>typeof x==='string'?{text:x,explain:''}:x).filter(x=>typeof x?.text==='string');
 const definitions=window.StudyAtlasSlideNotes.definitions(page.text).map(d=>({text:d.term,explain:d.meaning}));
 const seen=new Set();return [...candidates,...definitions].filter(x=>{const key=x.text.toLowerCase();if(seen.has(key)||!page.boxes.some(b=>labelMatches(b.text,key)))return false;seen.add(key);return true;}).slice(0,8).map((label,i)=>({...label,index:i+1}));
}
function setVisual(row,note,page,force=false){
 const original=row.querySelector('.atlas-source-stage'),labels=labelsFor(note,page),teaching=row.querySelector('.atlas-teaching-stage');
 const visual=force||note.kind==='visual'||labels.length>0||/anatom|diagram|micrograph|histolog|pathway|receptor|nerve|brain|bone|muscle|axis|section|figure/i.test(page.text);
 if(!visual)return;
 let stage=teaching.querySelector('.atlas-source-stage');if(!stage){stage=document.createElement('div');stage.className='atlas-source-stage atlas-study-visual';stage.innerHTML='<canvas class="atlas-slide-bitmap" aria-label="Study copy of this original slide"></canvas>';teaching.prepend(stage);}
 stage.style.aspectRatio=page.width+'/'+page.height;
 const src=original.querySelector('.atlas-slide-bitmap'),dest=stage.querySelector('canvas');dest.width=src.width;dest.height=src.height;dest.getContext('2d').drawImage(src,0,0);
 labelLayer(stage,page.boxes,labels);
 const legend=teaching.querySelector('.atlas-label-legend');legend.innerHTML=labels.length?labels.map((l,i)=>`<button data-label-index="${i}"><strong>${i+1}. ${esc(l.text)}</strong><span>${esc(l.explain||'Exact label from this source slide.')}</span></button>`).join(''):'<p>Original image preserved. Ask the local vision model to interpret details when available.</p>';
 legend.querySelectorAll('button').forEach((b,i)=>b.onclick=()=>labelLayer(stage,page.boxes,[labels[i]]));
}
async function render(n){
 const S=state;if(!S||S.rendered.has(n))return;if(S.pending.has(n))return S.tasks.get(n);
 S.pending.add(n);
 const job=async()=>{
  try{
   const page=await S.pdf.getPage(n),source=await window.StudyAtlasPDF.readPage(page),row=S.root.querySelector('#atlas-slide-'+n),old=S.notes.get(n),fallback=window.StudyAtlasSlideNotes.fromPage(source);
   const note={...fallback,...old,source:source.text,source_lines:source.lines};if(!old.explain&&!old.key_points?.length){note.key_points=fallback.key_points;note.explain=fallback.explain;}if(old.title==='Slide '+n)note.title=fallback.title;
   S.notes.set(n,note);S.sources.set(n,source);row.querySelector('.atlas-row-title').textContent=note.title;
   const teaching=row.querySelector('.atlas-teaching-copy');teaching.outerHTML=noteHTML(note);
   const stage=row.querySelector('.atlas-source-stage'),canvas=stage.querySelector('.atlas-slide-bitmap');stage.style.aspectRatio=source.width+'/'+source.height;
   const scale=Math.min(2.5,Math.max(1,stage.clientWidth*Math.min(2,devicePixelRatio||1)/source.width)),vp=page.getViewport({scale});canvas.width=Math.ceil(vp.width);canvas.height=Math.ceil(vp.height);
   await page.render({canvasContext:canvas.getContext('2d'),viewport:vp}).promise;stage.querySelector('.atlas-source-loading')?.remove();page.cleanup();setVisual(row,S.notes.get(n)||note,source);S.rendered.add(n);
   // Release far-away bitmaps; annotations are separate vector strokes and stay saved.
   if(S.rendered.size>8){for(const oldN of S.rendered){const el=S.root.querySelector('#atlas-slide-'+oldN),r=el.getBoundingClientRect();if(r.bottom< -1500||r.top>innerHeight+1500){el.querySelectorAll('.atlas-slide-bitmap').forEach(c=>{c.width=1;c.height=1;});S.rendered.delete(oldN);if(S.rendered.size<=8)break;}}}
  }catch(e){const el=S.root.querySelector('#atlas-slide-'+n+' .atlas-source-loading');if(el){el.textContent='Could not render this slide. Open the untouched source or retry.';el.style.pointerEvents='auto';el.onclick=()=>render(n);}}
  finally{S.pending.delete(n);S.tasks.delete(n);}
 };
 S.queue=S.queue.then(job,job);S.tasks.set(n,S.queue);return S.queue;
}
function aiPanel(n){const currentSlide=n?{n,row:state.root.querySelector('#atlas-slide-'+n),note:state.notes.get(n)}:current();if(!currentSlide)return;state.aiSlide=currentSlide.n;state.root.querySelector('.atlas-reader-ai').hidden=false;state.root.querySelector('.atlas-ai-status').textContent='Slide '+currentSlide.n+' · free local tutor';}
async function ask(question,{image=false}={}){
 const S=state,n=S.aiSlide||current()?.n||1,out=S.root.querySelector('.atlas-ai-answer'),status=S.root.querySelector('.atlas-ai-status');
 S.controller?.abort();S.controller=new AbortController();const controller=S.controller;
 const buttons=S.root.querySelectorAll('[data-ask]');buttons.forEach(b=>b.disabled=true);S.root.querySelector('[data-stop]').hidden=false;
 try{
  await render(n);const note=S.notes.get(n),source=S.sources.get(n);
  const context='Lecture: '+S.title+'\nSlide '+n+'\n'+(note.source||'')+'\nExisting explanation:\n'+(note.explain||'');
  out.textContent=window.StudyAtlasLocalAI.sourceAnswer(question,context);status.textContent='Slide '+n+' · source preview';
  const imageCanvas=image&&await window.StudyAtlasLocalAI.availability(true)==='available'?S.root.querySelector('#atlas-slide-'+n+' .atlas-slide-bitmap'):undefined;
  const result=await window.StudyAtlasLocalAI.askWithMeta(question,{context,image:imageCanvas,cacheKey:S.id+':'+n,signal:controller.signal,onUpdate:t=>{if(S.controller===controller)out.textContent=t;},onStatus:t=>status.textContent='Slide '+n+' · '+t});
  status.textContent='Slide '+n+' · '+(result.mode==='source'?'Source answer · on-device model unavailable or timed out':result.mode==='on-device-vision'?'On-device vision':'On-device AI')+' · no paid calls';
  if(image&&source){setVisual(S.root.querySelector('#atlas-slide-'+n),note,source,true);}
 }catch(e){if(e.name==='AbortError')status.textContent='Stopped · slide '+n;else out.textContent=e.message;}
 finally{if(S.controller===controller){buttons.forEach(b=>b.disabled=false);S.root.querySelector('[data-stop]').hidden=true;}}
}
function extras(data){
 const chapters=data.chapters||[];
 return `<section class="atlas-reader-extra"><h2>Chapter guides & quick checks</h2>${chapters.map((ch,i)=>`<details><summary>${esc(ch.title||'Chapter '+(i+1))} · slides ${ch.slide_start}–${ch.slide_end}</summary>${ch.guide?`<p>${esc(ch.guide)}</p>`:''}${(ch.concepts||[]).filter(c=>!c.slide_refs?.length).map(c=>`<h3>${esc(c.heading)}</h3><p>${esc(c.explain)}</p>`).join('')}${(ch.questions||[]).map((q,j)=>`<div class="q" data-answer="${Number(q.answer_index)}"><b>${esc(q.question)}</b>${(q.options||[]).map((o,k)=>`<label><input type="radio" name="reader-q-${i}-${j}" value="${k}">${esc(o)}</label>`).join('')}<button data-check>Check</button><div class="feedback" data-exp="${esc(q.explanation||'')}"></div></div>`).join('')}</details>`).join('')}</section><section class="atlas-reader-extra"><h2>Revision sheet</h2>${(data.cheat_sheet||[]).map(c=>`<details><summary>${esc(c.heading)}</summary><ul>${(c.bullets||[]).map(x=>`<li>${esc(x)}</li>`).join('')}</ul></details>`).join('')}</section>`;
}
async function open(config){
 if(state)return;await dependencies();const data=config.data||{},root=document.createElement('div');root.id='atlasSlideReader';
 state={...config,title:config.title||data.title||'Lecture',root,count:0,notes:new Map(),sources:new Map(),rendered:new Set(),pending:new Set(),tasks:new Map(),queue:Promise.resolve(),pdfUrl:config.pdfUrl};
 document.body.prepend(root);document.body.classList.add('atlas-slide-mode');document.body.dataset.atlasModule=config.module_id||'';
 const colors=PALETTES[config.module_id]||PALETTES.mdsa20030;document.documentElement.style.setProperty('--atlas-mod',colors[0]);document.documentElement.style.setProperty('--atlas-mod2',colors[1]);
 root.innerHTML='<div class="atlas-reader-head"><div><div class="atlas-reader-brand">✦ studyatlas</div><h1>'+esc(state.title)+'</h1><p class="atlas-reader-sub">Opening original slides…</p></div></div>';
 try{state.pdf=await window.StudyAtlasPDF.load(state.pdfUrl);}catch(e){root.querySelector('.atlas-reader-sub').textContent='The original could not be loaded. Open the source or reload this page.';const a=document.createElement('a');a.href=state.pdfUrl;a.textContent='Open original PDF';root.appendChild(a);if(config.legacy!==false){const fallback=new URL(location.href);fallback.searchParams.set('view','chapters');location.replace(fallback.href);}else{const home=document.createElement('a');home.href='/';home.textContent='Return to your library';home.style.marginLeft='16px';root.appendChild(home);}state=null;return;}
 state.count=state.pdf.numPages;for(let n=1;n<=state.count;n++)state.notes.set(n,fromData(data,n));
 const legacyUrl=config.legacyUrl||(()=>{const u=new URL(location.href);u.searchParams.set('view','chapters');return u.href;})();
 root.innerHTML=`<header class="atlas-reader-head"><div><div class="atlas-reader-brand">✦ studyatlas · ${esc(config.module_code||'')}</div><h1>${esc(state.title)}</h1><p class="atlas-reader-sub">${state.count} original slides · original on the left, explanation on the right · zoom each side independently</p></div><div class="atlas-reader-links"><a href="/">← Library</a><a href="${esc(state.pdfUrl)}" target="_blank" rel="noopener">Original PDF ↗</a>${config.legacy!==false?`<a href="${esc(legacyUrl)}">Chapter guide & saved notes</a>`:''}</div></header><nav class="atlas-reader-nav" aria-label="Slide navigation"><button data-prev aria-label="Previous slide">←</button><span class="atlas-nav-count">Slide</span><input type="number" min="1" max="${state.count}" value="1" aria-label="Go to slide"><span class="atlas-nav-count">/ ${state.count}</span><button data-next aria-label="Next slide">→</button><span class="atlas-reader-hint">← → keys · pinch each pane · hand tool to pan</span><select aria-label="Jump to chapter"><option value="1">Jump to chapter…</option>${(data.chapters||[]).map(c=>`<option value="${Number(c.slide_start)||1}">${esc(c.title)} · ${c.slide_start}–${c.slide_end}</option>`).join('')}</select></nav><main>${Array.from({length:state.count},(_,i)=>rowHTML(i+1)).join('')}${extras(data)}</main><div class="rail" hidden></div><section class="atlas-reader-ai" hidden><div class="atlas-ai-head"><span>Ask about this slide</span><button data-ai-close aria-label="Close AI">×</button></div><div class="atlas-ai-status">Free local tutor</div><textarea aria-label="Question" placeholder="What does this label mean? Why does this happen?"></textarea><div class="atlas-ai-actions"><button data-ask>Ask</button><button data-ask="picture">Explain picture</button><button data-stop hidden>Stop</button><button data-enable>Enable on-device AI</button></div><div class="atlas-ai-answer" role="status" aria-live="polite"></div></section>`;
 root.querySelectorAll('.atlas-pane').forEach(setupZoom);
 root.querySelector('[data-prev]').onclick=()=>go((current()?.n||1)-1);root.querySelector('[data-next]').onclick=()=>go((current()?.n||1)+1);
 const jump=root.querySelector('nav input');jump.onchange=()=>go(jump.value);root.querySelector('nav select').onchange=e=>go(e.target.value);
 root.querySelector('[data-ai-close]').onclick=()=>{state.controller?.abort();root.querySelector('.atlas-reader-ai').hidden=true;};
 root.querySelectorAll('[data-ask]').forEach(b=>b.onclick=()=>ask(b.dataset.ask==='picture'?'Explain this picture clearly. Describe the visible labels and arrows, and what matters on this slide.':root.querySelector('textarea').value.trim()||'Explain this slide simply.',{image:b.dataset.ask==='picture'}));
 root.querySelector('[data-stop]').onclick=()=>state.controller?.abort();
 root.querySelector('[data-enable]').onclick=async()=>{const status=root.querySelector('.atlas-ai-status');status.textContent='Preparing on-device model…';try{await window.StudyAtlasLocalAI.enable({onProgress:p=>status.textContent='One-time on-device model download · '+p+'%'});status.textContent='On-device model ready · free';}catch(e){status.textContent='On-device model is unavailable here. Source answers are ready.';}};
 root.querySelectorAll('[data-explain]').forEach(b=>b.onclick=()=>{aiPanel(Number(b.dataset.explain));ask('Explain the picture on this slide. Describe supported labels, arrows and relationships in 3 short points.',{image:true});});
 root.querySelectorAll('[data-labels]').forEach(b=>b.onclick=async()=>{const n=Number(b.dataset.labels);await render(n);const source=state.sources.get(n);if(source)setVisual(root.querySelector('#atlas-slide-'+n),state.notes.get(n),source,true);});
 root.querySelectorAll('[data-check]').forEach(b=>b.onclick=()=>{const q=b.closest('.q'),picked=q.querySelector('input:checked');q.querySelector('.feedback').textContent=picked?(Number(picked.value)===Number(q.dataset.answer)?'Correct. ':'Not quite. ')+q.querySelector('.feedback').dataset.exp:'Choose an answer first.';});
 const observer=new IntersectionObserver(entries=>{entries.filter(e=>e.isIntersecting).forEach(e=>render(Number(e.target.dataset.slide)));},{rootMargin:'800px 0px'});root.querySelectorAll('.atlas-slide-row').forEach(r=>observer.observe(r));
 let scrolling=false;addEventListener('scroll',()=>{if(scrolling)return;scrolling=true;requestAnimationFrame(()=>{scrolling=false;const n=current()?.n||1;jump.value=n;sessionStorage.setItem('atlas-reader-position:'+state.id,String(n));});},{passive:true});
 addEventListener('keydown',e=>{if(e.target.closest('input,textarea,select,summary')||e.ctrlKey||e.metaKey||e.altKey||document.body.classList.contains('atlas-gdrawing'))return;if(e.key==='ArrowRight'||e.key==='ArrowLeft'){e.preventDefault();go((current()?.n||1)+(e.key==='ArrowRight'?1:-1));}});
 if(!document.getElementById('atlasTimerModal'))await script('/study-tools.js?v=7');
 if(!document.getElementById('atlasGenDock'))await script('/generated-tools.js?v=8');
 const saved=Number(sessionStorage.getItem('atlas-reader-position:'+state.id));await render(saved||1);if(saved>1)go(saved);
 addEventListener('pagehide',()=>{state.controller?.abort();state.pdf?.destroy();},{once:true});
}
addEventListener('atlas:lecture-enhanced',e=>{
 if(!state||state.id!==e.detail?.id)return;
 for(const note of e.detail.slides||[]){
  const old=state.notes.get(note.n);if(!old||note.origin!=='on-device'||old.explain===note.explain)continue;
  const row=state.root.querySelector('#atlas-slide-'+note.n),ink=(()=>{try{return JSON.parse(localStorage.getItem('atlasGeneratedInk.v3')||'{}')['lecture:'+state.id]?.zones||{};}catch{return {};}})();
  // Avoid moving text beneath a saved drawing while a background explanation arrives.
  if(document.body.classList.contains('atlas-gdrawing')||ink['slide-'+note.n+'-teaching']?.length)continue;
  const updated={...old,...note};state.notes.set(note.n,updated);row.querySelector('.atlas-origin-badge').textContent='On-device explanation';
  row.querySelector('.atlas-teaching-copy').outerHTML=noteHTML(updated);
  const source=state.sources.get(note.n);if(source&&state.rendered.has(note.n))setVisual(row,updated,source);
 }
});
window.StudyAtlasReader={open,current,go,ai:aiPanel,zoom:delta=>(state.activePane||current()?.row.querySelector('.atlas-pane'))?.atlasZoom(delta),render,source:()=>state?.pdfUrl,id:()=>state?.id,aliases:()=>(state?.previous_titles||[]).map(t=>location.pathname+'::'+t)};
async function boot(){
 if(location.pathname.endsWith('local-lecture.html')||new URLSearchParams(location.search).get('view')==='chapters')return;
 const original=document.querySelector('a[href*="Original_Lecture.pdf"],.originalend a[href*="/api/original"]');if(!original)return;
 let metadata={};try{metadata=JSON.parse(document.getElementById('atlasLectureMeta')?.textContent||'{}');}catch{}
 const data=readLegacy();await open({id:metadata.id||location.pathname,title:metadata.title||data.title||document.querySelector('h1')?.textContent,pdfUrl:original.href,module_id:metadata.module_id||document.body.dataset.atlasModule||'mdsa20030',previous_titles:metadata.previous_titles||[],module_code:metadata.module_code||document.querySelector('.kicker')?.textContent.match(/[A-Z]{4}\d{5}/)?.[0]||'MDSA20030',data});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>boot().catch(()=>{}),{once:true});else boot().catch(()=>{});
})();
