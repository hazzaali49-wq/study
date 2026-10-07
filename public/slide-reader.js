(()=>{
'use strict';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const clean=s=>String(s||'').replace(/\s+/g,' ').trim();
const PALETTES={nmhs10100:['#ef92c9','#79bce9'],path30080:['#ff7f82','#f4b15f'],mdsa20030:['#a784ff','#5ed6bd'],mdsa20010:['#69d39d','#55b8aa'],anat20060:['#7da6ff','#d6a86e'],anat20040:['#65cce8','#7b8cff']};
let state=null;
const script=src=>new Promise((resolve,reject)=>{const s=document.createElement('script');s.src=src;s.onload=resolve;s.onerror=reject;document.body.appendChild(s);});
async function dependencies(){
 for(const [name,src] of [['StudyAtlasSlideNotes','slide-notes.js'],['StudyAtlasLearning','study-learning.js'],['StudyAtlasVisuals','slide-visuals.js'],['StudyAtlasTeachingFigures','teaching-figures.js'],['StudyAtlasPDF','pdf-source.js'],['StudyAtlasStudyStore','study-store.js'],['StudyAtlasNotebook','study-notebook.js'],['StudyAtlasLocalAI','local-ai.js'],['StudyAtlasMidtermLinks','midterm-links.js']])if(!window[name])await script('/'+src+'?v=12');
}
function fromData(data,n){
 const note=(data.slides||[]).find(s=>Number(s.n)===n);if(note)return {...note};
 const matches=(data.chapters||[]).flatMap(ch=>(ch.concepts||[]).filter(c=>(c.slide_refs||[]).map(Number).includes(n)));
 const visual=(data.chapters||[]).flatMap(ch=>ch.visuals||[]).find(v=>Number(v.slide)===n);
 return {n,title:matches[0]?.heading||visual?.title||'Slide '+n,explain:matches.map(c=>c.explain||'').filter(Boolean).join('\n\n'),key_points:matches.flatMap(c=>c.key_points||[]),labels:[],origin:matches.length?'existing':'source',visual_explain:visual?.explain||'',extra:matches.map(c=>c.clinical||c.memory||c.fun_fact||'').filter(Boolean).join('\n')};
}
function safeRich(html){
 const t=document.createElement('template');t.innerHTML=html||'';
 t.content.querySelectorAll('script,style,iframe,object,embed,form,button,input,canvas,svg,img').forEach(n=>n.remove());
 for(const el of [...t.content.querySelectorAll('*')].reverse()){
  if(!/^(P|BR|STRONG|B|EM|I|UL|OL|LI|TABLE|THEAD|TBODY|TR|TH|TD|H3|H4|H5|BLOCKQUOTE|SUB|SUP|DETAILS|SUMMARY)$/.test(el.tagName)){el.replaceWith(...el.childNodes);continue;}
  for(const a of [...el.attributes])el.removeAttribute(a.name);
 }return t.innerHTML;
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
  const clone=ch.cloneNode(true);clone.querySelectorAll('script,style,canvas,button,iframe,figure,.chapter-title,.chhead,.q,.checkrow,.visualgrid').forEach(el=>el.remove());
  const questions=[...ch.querySelectorAll('.q')].map(q=>({question:q.querySelector('b')?.textContent||'',options:[...q.querySelectorAll('.opts label span')].map(x=>x.textContent),answer_index:Number(q.dataset.answer),explanation:q.querySelector('.feedback')?.dataset.exp||''}));
  chapters.push({title:ch.querySelector('h2,h3')?.textContent||'Chapter',slide_start:a,slide_end:b,summary:clean(ch.querySelector('.chhead p')?.textContent||''),concepts,visuals,questions,guide:clean(clone.textContent),guide_html:safeRich(clone.innerHTML)});
 }
 const cheat_sheet=[...document.querySelectorAll('.cheat,.cheatcard')].map(c=>{const clone=c.cloneNode(true);clone.querySelector('h3,h4')?.remove();return {heading:c.querySelector('h3,h4')?.textContent||'',html:safeRich(clone.innerHTML),paragraphs:[...clone.querySelectorAll('p')].map(x=>clean(x.textContent)),bullets:[...clone.querySelectorAll('li')].map(x=>clean(x.textContent))};});
 // The original hand-built pages keep their answer keys in these shared lexical bindings.
 const questions=typeof quiz!=='undefined'&&Array.isArray(quiz)?quiz:[];
 const cards=typeof flashcards!=='undefined'&&Array.isArray(flashcards)?flashcards:[];
 return {title:document.querySelector('h1')?.textContent||document.title,slide_count,chapters,cheat_sheet,questions,flashcards:cards};
}
function midtermHTML(note){
 const links=window.StudyAtlasMidtermLinks?.forSlide(state?.id||location.pathname,note.n)||[];
 if(!links.length)return '';
 return `<aside class="atlas-midterm-link"><div class="atlas-midterm-link-head"><span>★ IMPORTANT FOR MIDTERM</span><a href="/midterm/endocrine-midterm.html" target="_top">Open review ↗</a></div>${links.map(x=>`<div class="atlas-midterm-question"><b>${esc(x.label||'Related midterm question')}</b><p>${esc(x.question)}</p><small>${esc(x.topic||'')} · ${esc(x.note||'')}</small></div>`).join('')}</aside>`;
}
function pinnedMidtermHTML(links){
 if(!links?.length)return '';
 return `<aside class="atlas-midterm-pinned"><div class="atlas-midterm-pinned-label">★ MIDTERM QUESTION</div>${links.map(x=>`<p>${esc(x.question)}</p>`).join('')}<small>${esc(links[0]?.note||'')}</small></aside>`;
}
function toolbar(side){return `<div class="atlas-pane-toolbar"><b>${side==='original'?'Original slide':'Study explanation'}</b><button data-zoom="-1" aria-label="Zoom out">−</button><output>100%</output><button data-zoom="1" aria-label="Zoom in">+</button><button data-fit>Fit</button><button class="atlas-pan-toggle" aria-pressed="false" title="Drag with mouse, finger or pen to pan">✋</button></div>`;}
function noteHTML(note){
 const N=window.StudyAtlasSlideNotes,source=note.source||'',defs=note.definitions||N.definitions(source);
 const short=String(note.explain||'').trim(),points=(note.key_points||[]).filter(Boolean);
 const preview=short.length>900?short.slice(0,900).replace(/\s+\S*$/,'')+'…':short;
 return `<div class="atlas-teaching-copy"><h3>${esc(note.title||'Slide '+note.n)}</h3>${preview?`<p>${esc(preview).replace(/\n\n/g,'</p><p>')}</p>`:''}${points.length?`<ul>${points.map(p=>`<li>${esc(p)}</li>`).join('')}</ul>`:''}${note.takeaway?`<div class="atlas-definitions"><b>Takeaway</b><p>${esc(note.takeaway)}</p></div>`:''}${note.visual_explain?`<p>${esc(note.visual_explain)}</p>`:''}${defs.length?`<div class="atlas-definitions">${defs.map(d=>`<p><b>${esc(d.term)}</b> — ${esc(d.meaning)}</p>`).join('')}</div>`:''}${note.extra?`<details><summary>Memory / clinical link</summary><p>${esc(note.extra)}</p></details>`:''}${short.length>900?`<details><summary>Complete existing explanation</summary><p>${esc(short).replace(/\n/g,'<br>')}</p></details>`:''}<details><summary>Exact source text · slide ${note.n}</summary><div class="atlas-source-text">${esc(source||'No extractable text on this slide.')}</div></details></div>`;
}
function rowHTML(n){const note=state.notes.get(n),midterm=window.StudyAtlasMidtermLinks?.forSlide(state?.id||location.pathname,n)||[];
 return `<section class="chapter visualcard atlas-slide-row${midterm.length?' atlas-midterm-important':''}" id="atlas-slide-${n}" data-slide="${n}" data-start="${n}" data-end="${n}"><div class="atlas-row-head"><h2><span class="atlas-slide-number">${String(n).padStart(2,'0')}</span><span class="atlas-row-title">${esc(note.title||'Slide '+n)}</span></h2>${midterm.length?'<span class="atlas-midterm-row-badge">★ IMPORTANT FOR MIDTERM</span>':''}<span class="atlas-origin-badge">${note.origin==='on-device'?'On-device explanation':note.origin==='existing'?'Existing guide':'Source notes'}</span></div>${midterm.length?'<div class="atlas-midterm-full-banner">★ IMPORTANT MIDTERM SLIDE <span>MIDTERM QUESTION pinned beside the original slide</span></div>':''}<div class="atlas-pair"><div class="atlas-pane visualframe" data-side="original">${toolbar('original')}<div class="atlas-zoom-viewport"><div class="atlas-zoom-space"><div class="atlas-zoom-content"><div class="atlas-source-stage" data-ink-id="slide-${n}-original">${midterm.length?'<div class="atlas-midterm-slide-flag">★ IMPORTANT FOR MIDTERM</div>':''}<canvas class="atlas-slide-bitmap" aria-label="Original slide ${n}"></canvas><span class="atlas-source-loading">Original slide ${n} · loading…</span></div></div></div></div><div class="atlas-pane-footer"><a href="${esc(state.pdfUrl)}#page=${n}" target="_blank" rel="noopener">Open untouched slide ↗</a><span>Pinch to zoom · drag to pan</span></div></div><div class="atlas-pane visualcopy" data-side="teaching">${toolbar('teaching')}${pinnedMidtermHTML(midterm)}<div class="atlas-zoom-viewport"><div class="atlas-zoom-space"><div class="atlas-zoom-content"><div class="atlas-teaching-stage" data-ink-id="slide-${n}-teaching">${noteHTML(note)}</div></div></div></div><div class="atlas-pane-footer"><span class="visualtag">SLIDE ${n}</span><button class="atlas-explain-picture" data-explain="${n}">Explain slide</button><button data-study-picture="${n}" hidden>Open teaching drawing</button><span class="atlas-visual-status" role="status"></span></div></div></div><div class="atlas-slide-checks">${checksFor(n)}</div></section>`;
}
function current(){
 if(!state)return null;const y=innerHeight*.4;
 const rows=[...state.root.querySelectorAll('.atlas-slide-row')];
 const row=rows.find(c=>{const r=c.getBoundingClientRect();return r.top<y&&r.bottom>y;})||rows.find(c=>c.getBoundingClientRect().top>=y)||rows.at(-1);
 return row?{n:Number(row.dataset.slide),row,note:state.notes.get(Number(row.dataset.slide))}:null;
}
function go(n){if(!state)return;n=Math.max(1,Math.min(state.count,Math.round(Number(n)||1)));state.root.querySelector('#atlas-slide-'+n)?.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'start'});state.focused=n;try{sessionStorage.setItem('atlas-reader-position:'+state.id,String(n));}catch{}render(n);}
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
function teachingVisualHTML(plan){
 const flow=plan.sequences.map(steps=>`<figure class="atlas-mechanism"><figcaption>Trace the mechanism</figcaption><ol>${steps.map(step=>`<li>${esc(step)}</li>`).join('')}</ol></figure>`).join('');
 const relations=plan.relationships.map(r=>`<figure class="atlas-relation"><figcaption>Spatial relationship from this slide</figcaption><div><b>${esc(r.subject)}</b><span>${esc(r.relation)}</span><b>${esc(r.object)}</b></div></figure>`).join('');
 return relations+flow;
}
function setVisual(row,note,page){
 const teaching=row.querySelector('.atlas-teaching-stage'),Figures=window.StudyAtlasTeachingFigures,plan=window.StudyAtlasVisuals.plan(note,page),drawing=Figures.select(note,page),button=row.querySelector('[data-study-picture]');
 teaching.querySelector('.atlas-study-visuals')?.remove();button.hidden=!drawing;
 const status=row.querySelector('.atlas-visual-status');status.textContent='';
 if(Figures.isReference(note,page))return;
 const markup=Figures.html(drawing,note.n)+teachingVisualHTML(plan);
 if(!markup)return;
 const block=document.createElement('div');block.className='atlas-study-visuals';block.innerHTML=markup;teaching.prepend(block);
 if(drawing){Figures.bind(block.querySelector('.atlas-teaching-figure'),drawing);status.textContent='Select a structure in the drawing';}
}
async function render(n,urgent=false){
 const S=state;if(!S||S.rendered.has(n))return;if(urgent)S.priority=n;if(S.pending.has(n))return S.tasks.get(n);
 S.pending.add(n);
 const job=async()=>{
  try{
   const page=await S.pdf.getPage(n),source=S.sources.get(n)||await window.StudyAtlasPDF.readPage(page),row=S.root.querySelector('#atlas-slide-'+n),old=S.notes.get(n),fallback=window.StudyAtlasSlideNotes.fromPage(source);
   const note={...fallback,...old,source:source.text,source_lines:source.lines};if(!old.explain&&!old.key_points?.length){note.key_points=fallback.key_points;note.explain=fallback.explain;}if(old.title==='Slide '+n)note.title=fallback.title;if(['admin','cover'].includes(fallback.kind))note.kind=fallback.kind;
   S.notes.set(n,note);S.sources.set(n,source);refreshChecks(row,note);row.querySelector('.atlas-row-title').textContent=note.title;
   const teaching=row.querySelector('.atlas-teaching-copy');teaching.outerHTML=noteHTML(note);
   const stage=row.querySelector('.atlas-source-stage'),canvas=stage.querySelector('.atlas-slide-bitmap');stage.style.aspectRatio=source.width+'/'+source.height;
   const scale=Math.min(2.5,Math.sqrt(2200000/(source.width*source.height)),Math.max(1,stage.clientWidth*Math.min(1.6,devicePixelRatio||1)/source.width)),vp=page.getViewport({scale});canvas.width=Math.ceil(vp.width);canvas.height=Math.ceil(vp.height);
   await page.render({canvasContext:canvas.getContext('2d'),viewport:vp}).promise;stage.querySelector('.atlas-source-loading')?.remove();page.cleanup();setVisual(row,S.notes.get(n)||note,source);S.rendered.add(n);
   // Release far-away bitmaps; annotations are separate vector strokes and stay saved.
   if(S.rendered.size>8){for(const oldN of S.rendered){const el=S.root.querySelector('#atlas-slide-'+oldN),r=el.getBoundingClientRect();if(r.bottom< -1500||r.top>innerHeight+1500){el.querySelectorAll('.atlas-slide-bitmap').forEach(c=>{c.width=1;c.height=1;});S.rendered.delete(oldN);if(S.rendered.size<=8)break;}}}
  }catch(e){const el=S.root.querySelector('#atlas-slide-'+n+' .atlas-source-loading');if(el){el.textContent='Could not render this slide. Open the untouched source or retry.';el.style.pointerEvents='auto';el.onclick=()=>render(n);}}
  finally{S.pending.delete(n);S.tasks.delete(n);}
 };
 const done=new Promise(resolve=>S.renderQueue.push({n,job,resolve}));S.tasks.set(n,done);
 Promise.resolve().then(()=>pumpRenders(S));return done;
}
async function pumpRenders(S){
 if(S.rendering)return;S.rendering=true;
 try{while(S.renderQueue.length){
  const preferred=S.priority||S.focused,index=S.renderQueue.findIndex(task=>task.n===preferred),task=S.renderQueue.splice(Math.max(0,index),1)[0];
  await task.job();if(S.priority===task.n)S.priority=null;task.resolve();
 }}finally{S.rendering=false;}
}
function tutorThread(n){return (state.tutorThreads||={})[n]||=[];}
function rememberTutor(){try{sessionStorage.setItem('atlas-tutor:'+state.id,JSON.stringify(Object.fromEntries(Object.entries(state.tutorThreads||{}).slice(-12))));}catch{}}
function showTutorHistory(n){
 const panel=state.root.querySelector('.atlas-reader-ai');let history=panel.querySelector('.atlas-ai-history');
 if(!history){history=document.createElement('div');history.className='atlas-ai-history';panel.appendChild(history);}
 history.innerHTML=tutorThread(n).slice(0,-1).map(t=>`<details><summary>${esc(t.question)}</summary><p>${esc(t.answer)}</p></details>`).join('');
}
function aiPanel(n){
 const panel=state.root.querySelector('.atlas-reader-ai');
 // Reopening an active answer must not silently retarget it to the slide under the scroll position.
 const target=n||state.aiSlide||current()?.n||1;
 if(state.aiSlide&&state.aiSlide!==target){state.controller?.abort();state.controller=null;state.tutorBusy=false;}
 window.dispatchEvent(new Event('atlas:close-panels'));state.aiSlide=target;panel.hidden=false;
 panel.querySelector('[data-stop]').hidden=!state.tutorBusy;panel.querySelectorAll('[data-ask]').forEach(b=>b.disabled=!!state.tutorBusy);
 if(!state.tutorBusy){const last=tutorThread(target).at(-1);panel.querySelector('.atlas-ai-answer').textContent=last?.answer||'';panel.querySelector('.atlas-ai-status').textContent='Slide '+target+' · free local tutor';}
 showTutorHistory(target);
}
function tutorContext(n,question){
 const S=state,note=S.notes.get(n)||{},parts=['Lecture: '+S.title,'Current slide '+n+': '+note.title,'Study explanation: '+(note.explain||''),...(note.key_points||[]),note.visual_explain||'',note.takeaway||'','Original slide text:\n'+(note.source||'').slice(0,2400)];
 const terms=new Set((question.toLowerCase().match(/[a-z0-9]{3,}/g)||[]).filter(w=>!['the','what','why','how','this','that','explain','does','slide','about'].includes(w)));
 const related=[...S.notes.values()].filter(s=>s.n!==n&&!['cover','admin'].includes(s.kind)).map(s=>({s,score:[s.title,s.explain,...(s.key_points||[])].join(' ').toLowerCase().split(/\W+/).reduce((sum,w)=>sum+(terms.has(w)?1:0),0)})).filter(x=>x.score>0).sort((a,b)=>b.score-a.score).slice(0,2);
 for(const {s} of related)parts.push('Related slide '+s.n+': '+s.title+'\n'+[s.explain,...(s.key_points||[])].filter(Boolean).join('\n').slice(0,900));
 return parts.filter(Boolean).join('\n').slice(0,6500);
}
async function ask(question,{image=false}={}){
 const S=state,n=S.aiSlide||current()?.n||1,out=S.root.querySelector('.atlas-ai-answer'),status=S.root.querySelector('.atlas-ai-status');
 S.controller?.abort();S.controller=new AbortController();const controller=S.controller;
 const buttons=S.root.querySelectorAll('[data-ask]');buttons.forEach(b=>b.disabled=true);S.root.querySelector('[data-stop]').hidden=false;S.tutorBusy=true;
 const history=tutorThread(n).slice(-3),turn={question,answer:''};tutorThread(n).push(turn);if(tutorThread(n).length>6)tutorThread(n).shift();showTutorHistory(n);
 const live=()=>S.controller===controller&&!controller.signal.aborted;
 let lastSave=0;
 const update=t=>{if(!live()||!t)return;turn.answer=t;out.textContent=t;if(Date.now()-lastSave>750){rememberTutor();lastSave=Date.now();}};
 try{
  update(window.StudyAtlasLocalAI.sourceAnswer(question,tutorContext(n,question)));status.textContent='Slide '+n+' · source preview';
  // Text questions should not wait behind PDF bitmap rendering.
  if(image)await render(n,true);const note=S.notes.get(n)||{};
  if(!live())return;
  const context=tutorContext(n,question);
  const imageNeeded=image&&(note.kind==='visual'||/histolog|anatom|micrograph/i.test(note.title+' '+note.source));
  const imageCanvas=imageNeeded&&await window.StudyAtlasLocalAI.availability(true)==='available'?S.root.querySelector('#atlas-slide-'+n+' .atlas-slide-bitmap'):undefined;
  if(!live())return;
  const result=await window.StudyAtlasLocalAI.askWithMeta(question,{context,history,image:imageCanvas,cacheKey:S.id+':'+n,signal:controller.signal,onUpdate:update,onStatus:t=>{if(live())status.textContent='Slide '+n+' · '+t;}});
  if(!live())return;update(result.answer);
  status.textContent='Slide '+n+' · '+(result.mode==='source'?'Source notes · on-device AI unavailable':result.mode==='on-device-partial'?'Partial answer kept · ask a follow-up to continue':result.mode==='on-device-vision'?'On-device vision':'On-device AI')+' · no paid calls';

 }catch(e){if(S.controller===controller)status.textContent=(controller.signal.aborted?'Stopped · answer kept':'Could not finish · answer kept')+' · slide '+n;}
 finally{rememberTutor();if(S.controller===controller){S.tutorBusy=false;buttons.forEach(b=>b.disabled=false);S.root.querySelector('[data-stop]').hidden=true;}}
}
function refLinks(refs){return (refs||[]).map(n=>`<button class="atlas-ref-link" data-go="${n}">Slide ${n} ↗</button>`).join('');}
function questionHTML(q,id){
 if(!q.options?.length)return `<details class="atlas-recall"><summary>${esc(q.question)}</summary><p>${esc(q.explanation).replace(/\n/g,'<br>')}</p><small>${esc(q.kind||'Recall')} · ${refLinks(q.slide_refs)}</small></details>`;
 return `<div class="q" data-answer="${q.answer_index}"><b>${esc(q.question)}</b><div class="atlas-options">${q.options.map((o,k)=>`<label><input type="radio" name="${id}" value="${k}"><span>${esc(o)}</span></label>`).join('')}</div><button data-check>Check answer</button><div class="feedback" role="status" data-exp="${esc(q.explanation)}" data-correct="${esc(q.options[q.answer_index])}"></div>${refLinks(q.slide_refs)}</div>`;
}
function checksFor(n){const qs=state.learning.questions.filter(q=>q.slide_refs[0]===n);return qs.length?'<h3>Check your understanding</h3>'+qs.map((q,i)=>questionHTML(q,'slide-'+n+'-q-'+i)).join(''):'';}
function refreshChecks(row,note){
 if(!state.learning.questions.some(q=>q.slide_refs[0]===note.n)){state.learning.questions.push(...window.StudyAtlasLearning.recall(note));row.querySelector('.atlas-slide-checks').innerHTML=checksFor(note.n);}
}
function extras(data){
 const L=state.learning;
 return `<div id="atlas-learning-sections"><section class="atlas-reader-extra" id="atlas-understanding"><div class="atlas-section-kicker">Connect the lecture</div><h2>Final understanding</h2><p>Explain the main ideas without looking, then check the details and return to the relevant slides.</p><div class="atlas-revision-grid">${L.final_understanding.map(c=>`<article><h3>${esc(c.heading||c.title)}</h3><p>${esc(c.explain||c.summary||'')}</p><ul>${(c.points||c.bullets||[]).map(x=>`<li>${esc(x)}</li>`).join('')}</ul>${refLinks(c.slide_refs)}</article>`).join('')}</div></section>
 <section class="atlas-reader-extra" id="atlas-revision"><div class="atlas-section-kicker">Revise with the detail intact</div><h2>Detailed, simplified cheat sheet</h2><label class="atlas-revision-search">Find a topic <input type="search" data-revision-search placeholder="Hormone, structure, mechanism…"></label><div class="atlas-revision-grid">${L.cheat_sheet.map(c=>`<article class="atlas-revision-card"><h3>${esc(c.heading)}</h3>${c.html?safeRich(c.html):(c.paragraphs||[]).map(p=>`<p>${esc(p)}</p>`).join('')+`<ul>${(c.bullets||[]).map(x=>`<li>${esc(x)}</li>`).join('')}</ul>`}${refLinks(c.slide_refs)}</article>`).join('')}</div></section>
 <section class="atlas-reader-extra" id="atlas-recall"><div class="atlas-section-kicker">Active recall</div><h2>Flashcards & practice</h2>${L.flashcards.map((c,i)=>`<details class="atlas-flashcard"><summary><span>${String(i+1).padStart(2,'0')}</span> ${esc(c.question)}</summary><p>${esc(c.answer)}</p>${refLinks(c.slide_refs)}</details>`).join('')}${L.questions.filter(q=>!q.slide_refs.length).map((q,i)=>questionHTML(q,'final-q-'+i)).join('')}<p>Slide questions stay beside their teaching content.</p><div class="atlas-question-index">${L.questions.filter(q=>q.slide_refs.length).map(q=>`<button data-go="${q.slide_refs[0]}">${esc(q.question)} · slide ${q.slide_refs[0]} ↗</button>`).join('')}</div></section>
 <section class="atlas-reader-extra" id="atlas-guides"><h2>Complete chapter guides</h2>${L.chapters.map((ch,i)=>`<details><summary>${esc(ch.title||'Chapter '+(i+1))} · slides ${ch.slide_start}–${ch.slide_end}</summary>${ch.guide_html?safeRich(ch.guide_html):ch.guide?`<p>${esc(ch.guide)}</p>`:(ch.concepts||[]).map(c=>`<h3>${esc(c.heading)}</h3><p>${esc(c.explain)}</p><ul>${(c.key_points||[]).map(x=>`<li>${esc(x)}</li>`).join('')}</ul>`).join('')}${refLinks([ch.slide_start,ch.slide_end])}</details>`).join('')}</section></div>`;
}
async function open(config){
 if(state)return;await dependencies();const data=config.data||{},root=document.createElement('div');root.id='atlasSlideReader';
 state={...config,title:config.title||data.title||'Lecture',root,count:0,learning:window.StudyAtlasLearning.prepare(data),notes:new Map(),sources:new Map(),rendered:new Set(),pending:new Set(),tasks:new Map(),renderQueue:[],rendering:false,pdfUrl:config.pdfUrl};
 try{const saved=JSON.parse(sessionStorage.getItem('atlas-tutor:'+state.id)||'{}');state.tutorThreads=Object.fromEntries(Object.entries(saved).filter(([n,turns])=>/^\d+$/.test(n)&&Array.isArray(turns)).slice(-12).map(([n,turns])=>[n,turns.filter(t=>t&&typeof t.question==='string'&&typeof t.answer==='string').slice(-6)]));}catch{}
 document.body.prepend(root);document.body.classList.add('atlas-slide-mode');document.body.dataset.atlasModule=config.module_id||'';
 const colors=PALETTES[config.module_id]||PALETTES.mdsa20030;document.documentElement.style.setProperty('--atlas-mod',colors[0]);document.documentElement.style.setProperty('--atlas-mod2',colors[1]);
 root.innerHTML='<div class="atlas-reader-head"><div><div class="atlas-reader-brand">✦ studyatlas</div><h1>'+esc(state.title)+'</h1><p class="atlas-reader-sub">Opening original slides…</p></div></div>';
 try{state.pdf=await window.StudyAtlasPDF.load(state.pdfUrl);}catch(e){root.querySelector('.atlas-reader-sub').textContent='The original could not be loaded. Open the source or reload this page.';const a=document.createElement('a');a.href=state.pdfUrl;a.textContent='Open original PDF';root.appendChild(a);if(config.legacy!==false){const fallback=new URL(location.href);fallback.searchParams.set('view','chapters');location.replace(fallback.href);}else{const home=document.createElement('a');home.href='/';home.textContent='Return to your library';home.style.marginLeft='16px';root.appendChild(home);}state=null;return;}
 state.count=state.pdf.numPages;for(let n=1;n<=state.count;n++)state.notes.set(n,fromData(data,n));
 const legacyUrl=config.legacyUrl||(()=>{const u=new URL(location.href);u.searchParams.set('view','chapters');return u.href;})();
 root.innerHTML=`<header class="atlas-reader-head"><div><div class="atlas-reader-brand">✦ studyatlas · ${esc(config.module_code||'')}</div><h1>${esc(state.title)}</h1><p class="atlas-reader-sub">${state.count} original slides · original on the left, explanation on the right · zoom each side independently</p></div><div class="atlas-reader-links"><a href="/#home" target="_top" data-reader-menu>← All modules</a><button data-reader-notes>Saved notes</button><a href="${esc(state.pdfUrl)}" target="_blank" rel="noopener">Original PDF ↗</a>${config.legacy!==false?`<a href="${esc(legacyUrl)}">Chapter guide</a>`:''}</div></header><nav class="atlas-reader-nav" aria-label="Slide navigation"><button data-reader-menu class="atlas-menu-button">← Menu</button><button data-reader-module class="atlas-module-button">Module</button><button data-prev aria-label="Previous slide">←</button><span class="atlas-nav-count">Slide</span><input type="number" min="1" max="${state.count}" value="1" aria-label="Go to slide"><span class="atlas-nav-count">/ ${state.count}</span><button data-next aria-label="Next slide">→</button><span class="atlas-reader-hint">← → keys · pinch each pane · hand tool to pan</span><select aria-label="Jump to chapter or revision"><option value="1">Chapters & revision…</option>${(data.chapters||[]).map(c=>`<option value="${Number(c.slide_start)||1}">${esc(c.title)} · ${c.slide_start}–${c.slide_end}</option>`).join('')}<option value="atlas-understanding">Final understanding</option><option value="atlas-revision">Detailed cheat sheet</option><option value="atlas-recall">Flashcards & practice</option><option value="atlas-guides">Complete chapter guides</option><option value="atlas-saved-notes">My saved notes</option></select></nav><main>${Array.from({length:state.count},(_,i)=>rowHTML(i+1)).join('')}${extras(data)}</main><div class="rail" hidden></div><section class="atlas-reader-ai" hidden><div class="atlas-ai-head"><span>Ask about this slide</span><button data-ai-close aria-label="Close AI">×</button></div><div class="atlas-ai-status">Free local tutor</div><textarea aria-label="Question" placeholder="What does this label mean? Why does this happen?"></textarea><div class="atlas-ai-actions"><button data-ask>Ask</button><button data-ask="picture">Explain picture</button><button data-stop hidden>Stop</button><button data-enable>Enable on-device AI</button></div><div class="atlas-ai-answer" role="status" aria-live="polite"></div></section>`;
 root.querySelectorAll('.atlas-pane').forEach(setupZoom);
 root.querySelectorAll('[data-reader-menu]').forEach(b=>b.onclick=e=>{e.preventDefault();window.StudyAtlasNotebook.home();});
 root.querySelector('[data-reader-module]').onclick=()=>window.StudyAtlasNotebook.home(config.module_id);
 root.querySelector('[data-reader-notes]').onclick=()=>{const d=window.StudyAtlasNotebook.context();window.StudyAtlasNotebook.open({lectureKey:d.lectureKey,title:d.title});};
 root.querySelector('[data-prev]').onclick=()=>go((current()?.n||1)-1);root.querySelector('[data-next]').onclick=()=>go((current()?.n||1)+1);
 const jump=root.querySelector('nav input');jump.onchange=()=>go(jump.value);root.querySelector('nav select').onchange=e=>{const target=e.target.value;if(target.startsWith('atlas-'))root.querySelector('#'+target)?.scrollIntoView({behavior:'smooth'});else go(target);};
 root.querySelector('[data-ai-close]').onclick=()=>{state.controller?.abort();root.querySelector('.atlas-reader-ai').hidden=true;};
 root.querySelectorAll('[data-ask]').forEach(b=>b.onclick=()=>ask(b.dataset.ask==='picture'?'Explain the visual in this slide clearly. Describe the important structures, arrows or relationships and why they matter; do not just repeat labels.':root.querySelector('textarea').value.trim()||'Explain this slide simply.',{image:b.dataset.ask==='picture'}));
 root.querySelector('[data-stop]').onclick=()=>state.controller?.abort();
 root.querySelector('[data-enable]').onclick=async()=>{const status=root.querySelector('.atlas-ai-status');status.textContent='Preparing on-device model…';try{await window.StudyAtlasLocalAI.enable({onProgress:p=>status.textContent='One-time on-device model download · '+p+'%'});status.textContent='On-device model ready · free';}catch(e){status.textContent='On-device model is unavailable here. Source answers are ready.';}};
 root.querySelectorAll('[data-explain]').forEach(b=>b.onclick=()=>{aiPanel(Number(b.dataset.explain));ask('Explain this slide in 3 short points. For anatomy or histology, explain the structures, how to recognise them and why they matter. Do not repeat isolated labels.',{image:true});});
 root.querySelectorAll('[data-study-picture]').forEach(b=>b.onclick=()=>{const row=b.closest('.atlas-slide-row'),pane=row.querySelector('[data-side="teaching"]');pane.querySelector('[data-fit]').click();pane.querySelector('.atlas-zoom-viewport').scrollTo({top:0,left:0,behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});row.querySelector('[data-structure]')?.focus({preventScroll:true});});
 root.addEventListener('click',e=>{
  const b=e.target.closest('[data-check],[data-go]');if(!b)return;
  if(b.dataset.go){go(Number(b.dataset.go));return;}
  const q=b.closest('.q'),picked=q.querySelector('input:checked'),feedback=q.querySelector('.feedback');
  feedback.textContent=picked?(Number(picked.value)===Number(q.dataset.answer)?'Correct. ':'Not quite. Correct answer: '+feedback.dataset.correct+'. ')+feedback.dataset.exp:'Choose an answer first.';
 });
 root.addEventListener('input',e=>{if(!e.target.matches('[data-revision-search]'))return;const term=e.target.value.toLowerCase();root.querySelectorAll('.atlas-revision-card').forEach(c=>c.hidden=!c.textContent.toLowerCase().includes(term));});
 const observer=new IntersectionObserver(entries=>{entries.filter(e=>e.isIntersecting).forEach(e=>render(Number(e.target.dataset.slide)));},{rootMargin:'450px 0px'});root.querySelectorAll('.atlas-slide-row').forEach(r=>observer.observe(r));
 let scrolling=false;addEventListener('scroll',()=>{if(scrolling)return;scrolling=true;requestAnimationFrame(()=>{scrolling=false;const n=current()?.n||1;jump.value=n;sessionStorage.setItem('atlas-reader-position:'+state.id,String(n));});},{passive:true});
 addEventListener('keydown',e=>{if(document.body.classList.contains('atlas-notebook-open')||e.target.closest('input,textarea,select,summary')||e.ctrlKey||e.metaKey||e.altKey||document.body.classList.contains('atlas-gdrawing'))return;if(e.key==='ArrowRight'||e.key==='ArrowLeft'){e.preventDefault();go((current()?.n||1)+(e.key==='ArrowRight'?1:-1));}});
 if(!document.getElementById('atlasTimerModal'))await script('/study-tools.js?v=9');
 if(!document.getElementById('atlasGenDock'))await script('/generated-tools.js?v=10');
 await window.StudyAtlasNotebook.mountEnd().catch(()=>{});
 const requested=Number(new URLSearchParams(location.search).get('slide'));let saved=0;try{saved=Number(sessionStorage.getItem('atlas-reader-position:'+state.id));}catch{}
 const start=Math.max(1,Math.min(state.count,Math.round(requested||saved||1)));await render(start,true);if(start>1)go(start);
 addEventListener('pagehide',()=>{state.controller?.abort();state.pdf?.destroy();},{once:true});
}
addEventListener('atlas:lecture-enhanced',e=>{
 if(!state||state.id!==e.detail?.id)return;
 if(e.detail.data){state.learning=window.StudyAtlasLearning.prepare(e.detail.data);state.root.querySelector('#atlas-learning-sections').outerHTML=extras(e.detail.data);}
 for(const note of e.detail.slides||[]){
  const old=state.notes.get(note.n);if(!old||note.origin!=='on-device'||old.explain===note.explain)continue;
  const row=state.root.querySelector('#atlas-slide-'+note.n),ink=(()=>{try{return JSON.parse(localStorage.getItem('atlasGeneratedInk.v3')||'{}')['lecture:'+state.id]?.zones||{};}catch{return {};}})();
  // Avoid moving text beneath a saved drawing while a background explanation arrives.
  if(document.body.classList.contains('atlas-gdrawing')||ink['slide-'+note.n+'-teaching']?.length)continue;
  row.querySelector('.atlas-slide-checks').innerHTML=checksFor(note.n);
  const updated={...old,...note};state.notes.set(note.n,updated);row.querySelector('.atlas-origin-badge').textContent='On-device explanation';
  row.querySelector('.atlas-teaching-copy').outerHTML=noteHTML(updated);
  const source=state.sources.get(note.n);if(source&&state.rendered.has(note.n))setVisual(row,updated,source);
 }
});
window.StudyAtlasReader={open,current,go,context:()=>state?{id:state.id,title:state.title,module_id:state.module_id,number:state.number,pdfUrl:state.pdfUrl}:null,snapshot:async n=>{if(!state?.pdf)throw new Error('The original slide is still opening.');const page=await state.pdf.getPage(Number(n));return window.StudyAtlasNotebook.pageSnapshot(page);},ai:aiPanel,zoom:delta=>(state.activePane||current()?.row.querySelector('.atlas-pane'))?.atlasZoom(delta),render,source:()=>state?.pdfUrl,id:()=>state?.id,aliases:()=>(state?.previous_titles||[]).map(t=>location.pathname+'::'+t)};
async function boot(){
 if(location.pathname.endsWith('local-lecture.html')||new URLSearchParams(location.search).get('view')==='chapters')return;
 const original=document.querySelector('a[href*="Original_Lecture.pdf"],.originalend a[href*="/api/original"]');if(!original)return;
 let metadata={};try{metadata=JSON.parse(document.getElementById('atlasLectureMeta')?.textContent||'{}');}catch{}
 const data=readLegacy();await open({id:metadata.id||location.pathname,number:metadata.number||metadata.lecture_number,title:metadata.title||data.title||document.querySelector('h1')?.textContent,pdfUrl:original.href,module_id:metadata.module_id||document.body.dataset.atlasModule||'mdsa20030',previous_titles:metadata.previous_titles||[],module_code:metadata.module_code||document.querySelector('.kicker')?.textContent.match(/[A-Z]{4}\d{5}/)?.[0]||'MDSA20030',data});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>boot().catch(()=>{}),{once:true});else boot().catch(()=>{});
})();
