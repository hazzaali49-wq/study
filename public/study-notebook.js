/* Shared notebook UI for the library, full-slide reader and generated chapter guides. */
(()=>{
'use strict';
const Store=window.StudyAtlasStudyStore,esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const STATIC=[
 {id:'/lectures/hypothalamus-pituitary.html',short:'hypo',noteKey:'hypothalamus-pituitary',title:'Hypothalamus & Pituitary Gland',moduleId:'mdsa20030',number:3,pdfUrl:'/resources/Hypothalamus_and_Pituitary_Original_Lecture.pdf'},
 {id:'/lectures/anterior-pituitary.html',short:'anterior',noteKey:'anterior-pituitary',title:'Anterior Pituitary',moduleId:'mdsa20030',number:4,pdfUrl:'/resources/Anterior_Pituitary_Original_Lecture.pdf'}
];
const scripts=new Map(),pdfs=new Map();let snapshotQueue=Promise.resolve();let hub,scope={},lastFocus,libraryPass=0,hubPass=0,endMount;
const loadScript=src=>{if(!scripts.has(src))scripts.set(src,new Promise((resolve,reject)=>{const s=document.createElement('script');s.src=src;s.onload=resolve;s.onerror=()=>{scripts.delete(src);reject(new Error('Could not load the slide tools.'));};document.head.appendChild(s);}));return scripts.get(src);};
function safeImage(value){return /^(data:image\/(?:png|jpeg|webp);base64,|blob:|\/[^/]|https?:\/\/)/i.test(value||'')?value:'';}
function absoluteImage(value){try{return value?new URL(value,location.href).href:'';}catch{return '';}}
function staticDescriptor(d){return {...d,href:d.id,noteKeys:['study-atlas-quicknotes-v1:'+d.noteKey],pinKeys:['studyAtlasPins:v2:'+d.short]};}
function context(){
 const r=window.StudyAtlasReader?.context?.(),known=STATIC.find(d=>d.id===location.pathname);
 let meta={};try{meta=JSON.parse(document.getElementById('atlasLectureMeta')?.textContent||'{}');}catch{}
 const id=r?.id||meta.id||location.pathname,title=r?.title||meta.title||document.querySelector('h1')?.textContent||document.title;
 const d={...(known?staticDescriptor(known):{}),...meta,...r,id,title,moduleId:r?.module_id||meta.module_id||known?.moduleId||document.body.dataset.atlasModule||'',number:r?.number||meta.number||known?.number||0,href:location.pathname+location.search,pdfUrl:r?.pdfUrl||known?.pdfUrl||document.querySelector('.originalend a')?.href||'',localId:location.pathname==='/local-lecture.html'?new URLSearchParams(location.search).get('id'):''};
 const url=new URL(d.href,location.href);url.searchParams.delete('view');url.searchParams.delete('slide');d.href=url.pathname+url.search;
 d.aliases=[location.pathname+'::'+title,...(r?.aliases||[]),...(window.StudyAtlasReader?.aliases?.()||[]),...[...document.querySelectorAll('h1')].map(h=>location.pathname+'::'+h.textContent)];
 if(known){
  d.figures=[...document.querySelectorAll('figure.slidepic')].map(f=>({slide:Number((f.querySelector('figcaption')?.textContent||f.querySelector('img')?.alt||'').match(/slide\s*(\d+)/i)?.[1])||null,image:absoluteImage(f.querySelector('img')?.getAttribute('src')),caption:f.querySelector('figcaption')?.textContent||'',chapter:f.closest('.chapter')?.id}));
  const blocks=[];document.querySelectorAll('.chapter > p,.chapter > .note,.chapter > .story,.chapter > .path,.chapter > .tablewrap,.chapter > ul,.chapter > ol,.chapter > .twocol > .note').forEach(el=>{if(!blocks.some(x=>x.contains(el))&&!el.closest('.slidepic')&&!el.closest('#atlasSlideReader'))blocks.push(el);});d.blocks=Object.fromEntries(blocks.map((el,i)=>['b'+i,el.textContent]));
 }
 return Store.descriptor(d);
}
function snapshot(slide,d=context()){const task=snapshotQueue.catch(()=>{}).then(()=>captureSnapshot(slide,d));snapshotQueue=task;return task;}
async function captureSnapshot(slide,d){
 if(window.StudyAtlasReader?.id()===d.id&&window.StudyAtlasReader.snapshot)return window.StudyAtlasReader.snapshot(slide);
 if(!window.StudyAtlasPDF)await loadScript('/pdf-source.js?v=1');
 if(!pdfs.has(d.id))pdfs.set(d.id,(async()=>{
  let source=d.pdfUrl;
  if(d.localId){if(!window.StudyAtlasLocalDB)await loadScript('/local-db.js?v=1');source=(await window.StudyAtlasLocalDB.get(d.localId))?.pdf;}
  if(!source)throw new Error('Open this lecture to restore its slide snapshot.');
  return window.StudyAtlasPDF.load(source);
 })().catch(e=>{pdfs.delete(d.id);throw e;}));
 const pdf=await pdfs.get(d.id),page=await pdf.getPage(Number(slide)),image=await pageSnapshot(page);
 while(pdfs.size>2){const [key,p]=pdfs.entries().next().value;if(key===d.id){pdfs.delete(key);pdfs.set(key,p);continue;}pdfs.delete(key);(await p).destroy();}
 return image;
}
async function pageSnapshot(page){
 const base=page.getViewport({scale:1}),scale=Math.min(1440/base.width,1440/base.height),vp=page.getViewport({scale});
 const c=document.createElement('canvas');c.width=Math.max(1,Math.ceil(vp.width));c.height=Math.max(1,Math.ceil(vp.height));
 await page.render({canvasContext:c.getContext('2d'),viewport:vp,background:'#ffffff'}).promise;
 const result=c.toDataURL('image/webp',.84);c.width=c.height=1;return result;
}
function home(moduleId=''){
 if(window.parent!==window){window.parent.postMessage({source:'study-atlas-lecture',goto:'home',moduleId},location.origin);return;}
 location.assign('/'+(moduleId?'#module-'+encodeURIComponent(moduleId):'#home'));
}
function openSource(note){
 if(window.StudyAtlasReader?.id()===note.lectureId&&note.slide){close();window.StudyAtlasReader.go(note.slide);window.dispatchEvent(new Event('atlas:close-panels'));return;}
 if(!note.href)return;
 const url=new URL(note.href,location.origin);if(url.origin!==location.origin)return;
 if(note.slide)url.searchParams.set('slide',note.slide);
 close();if(window.parent!==window)window.top.location.href=url.href;else location.assign(url.href);
}
function drawSketch(c,strokes,aspect=2){
 c.width=640;c.height=Math.round(640/Math.max(1,Math.min(4,aspect)));c.style.aspectRatio=String(c.width/c.height);
 const ctx=c.getContext('2d');ctx.lineCap=ctx.lineJoin='round';
 for(const s of strokes||[]){const pts=s.points||s.pts||[];if(!pts.length)continue;ctx.strokeStyle=ctx.fillStyle=s.color||'#ff6e9a';ctx.lineWidth=(s.size||3)*2;
  ctx.beginPath();ctx.moveTo(pts[0].x*c.width,pts[0].y*c.height);for(const p of pts.slice(1))ctx.lineTo(p.x*c.width,p.y*c.height);if(pts.length===1){ctx.arc(pts[0].x*c.width,pts[0].y*c.height,ctx.lineWidth/2,0,Math.PI*2);ctx.fill();}else ctx.stroke();
 }
}
function cardHTML(n){return `<article class="atlas-note-card" data-note-id="${esc(n.id)}"><div class="atlas-note-media"><span class="atlas-note-placeholder">${n.slide?'Loading full slide '+n.slide+'…':'Saved text'}</span><button class="atlas-note-image" aria-label="Enlarge full slide ${n.slide||''}" hidden><img loading="lazy" decoding="async" alt="Complete original slide ${n.slide||''}"></button><small>${n.slide?'Original slide '+n.slide:'Lecture note'}</small></div><div class="atlas-note-copy"><small class="atlas-note-lecture">${esc(n.lectureTitle)}</small><h3>${esc(n.title||'Slide '+n.slide)}</h3>${n.text?`<p>${esc(n.text)}</p>`:''}<div class="atlas-note-sketch"></div><div class="atlas-note-actions">${n.href?'<button data-note-open>Open source slide ↗</button>':''}<button data-note-delete>${n.kind==='pin'?'Unpin':'Delete'}</button></div><small class="atlas-note-date">${n.created?esc(new Date(n.created).toLocaleDateString()):'Saved earlier'}</small><span class="atlas-note-status" role="status"></span></div></article>`;}
async function fillMedia(card,n){
 const placeholder=card.querySelector('.atlas-note-placeholder');
 let asset;try{asset=await Store.assets(n.id);}catch{placeholder.textContent='Your saved slide could not be loaded. Please reload.';return;}
 if(!card.isConnected)return;
 const sketch=safeImage(asset.sketch),wrap=card.querySelector('.atlas-note-sketch');
 if(sketch){const img=document.createElement('img');img.src=sketch;img.alt='Your drawing note';wrap.appendChild(img);}
 else if(n.strokes?.length){const c=document.createElement('canvas');wrap.appendChild(c);drawSketch(c,n.strokes,n.sketchAspect);}
 try{
  if(!asset.snapshot&&n.slide){const image=await snapshot(n.slide,{...n,id:n.lectureId});await Store.attach(n.id,image);asset={...asset,snapshot:image};}
  if(!card.isConnected)return;
  const source=safeImage(asset.snapshot);
  if(source){const b=card.querySelector('.atlas-note-image');b.hidden=false;b.querySelector('img').src=source;placeholder.hidden=true;b.onclick=()=>{card.classList.toggle('atlas-note-expanded');b.setAttribute('aria-label',card.classList.contains('atlas-note-expanded')?'Reduce slide preview':'Enlarge full slide');};}
  else placeholder.textContent=n.slide?'Snapshot unavailable. Open the source slide.':'Saved text';
 }catch{if(card.isConnected)placeholder.textContent='Snapshot unavailable. Open the source slide to restore it.';}
}
async function renderList(container,filter={},query=''){
 const token=String(Date.now())+Math.random();container.dataset.renderToken=token;
 const rows=(await Store.list(filter)).filter(n=>(n.text+' '+n.title+' '+n.lectureTitle+' slide '+n.slide).toLowerCase().includes(query.toLowerCase()));
 if(container.dataset.renderToken!==token)return;
 container._atlasObserver?.disconnect();container.innerHTML=rows.length?rows.map(cardHTML).join(''):'<div class="atlas-notebook-empty">'+(query?'No matching notes.':'Nothing saved here yet. Use <b>＋ Note</b> or <b>Pin slide</b> in your lecture.')+'</div>';
 const byId=new Map(rows.map(n=>[n.id,n])),observer=new IntersectionObserver(entries=>{for(const e of entries)if(e.isIntersecting){observer.unobserve(e.target);fillMedia(e.target,byId.get(e.target.dataset.noteId));}},{rootMargin:'240px'});container._atlasObserver=observer;
 container.querySelectorAll('.atlas-note-card').forEach(card=>{
  const n=byId.get(card.dataset.noteId);observer.observe(card);
  card.querySelector('[data-note-open]')?.addEventListener('click',()=>openSource(n));
  card.querySelector('[data-note-delete]').onclick=async e=>{
   const b=e.currentTarget;if(n.kind!=='pin'&&b.dataset.confirm!=='yes'){b.dataset.confirm='yes';b.textContent='Confirm delete';return;}
   b.disabled=true;try{await Store.remove(n.id);await renderList(container,filter,query);}catch{b.disabled=false;card.querySelector('.atlas-note-status').textContent='Could not save the change. Please try again.';}
  };
 });
 return rows.length;
}
function createHub(){
 if(hub)return;hub=document.createElement('div');hub.id='atlasNotebook';hub.hidden=true;
 hub.innerHTML='<div class="atlas-notebook-backdrop" data-notebook-close></div><section class="atlas-notebook-panel" role="dialog" aria-modal="true" aria-labelledby="atlasNotebookTitle"><header class="atlas-notebook-head"><div><small>YOUR STUDY NOTEBOOK</small><h2 id="atlasNotebookTitle">Saved notes</h2><p>Full slides and your notes, together · saved on this device</p></div><button data-notebook-close aria-label="Close notebook">×</button></header><div class="atlas-notebook-filter"><button data-kind="note" aria-pressed="true">Notes</button><button data-kind="pin" aria-pressed="false">Pinned slides</button><label>Search <input type="search" placeholder="Slide, topic or note…"></label></div><div class="atlas-notebook-content"></div></section>';
 document.body.appendChild(hub);hub.querySelectorAll('[data-notebook-close]').forEach(b=>b.onclick=close);
 hub.querySelectorAll('[data-kind]').forEach(b=>b.onclick=()=>{scope.kind=b.dataset.kind;renderHub();});
 hub.querySelector('input').oninput=()=>renderHub();
 hub.addEventListener('keydown',e=>{
  if(e.key==='Escape'){e.stopPropagation();close();}
  if(e.key==='Tab'){const focusable=[...hub.querySelectorAll('button,input,a[href]')].filter(el=>!el.disabled&&!el.closest('[hidden]'));const first=focusable[0],last=focusable.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus();}}
 });
}
async function renderHub(){
 const pass=++hubPass;hub.querySelectorAll('[data-kind]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.kind===scope.kind)));
 const container=hub.querySelector('.atlas-notebook-content');try{await renderList(container,scope,hub.querySelector('input').value);}catch{if(pass===hubPass)container.textContent='Your notebook could not be opened. Reload this page and try again.';}
}
async function open(options={}){
 createHub();lastFocus=document.activeElement;scope={kind:'note',...options};hub.querySelector('h2').textContent=options.title||'Saved notes';hub.querySelector('input').value='';hub.hidden=false;document.body.classList.add('atlas-notebook-open');hub.querySelector('[data-notebook-close][aria-label]').focus();
 await renderHub();
}
function close(){if(!hub||hub.hidden)return;hub.hidden=true;document.body.classList.remove('atlas-notebook-open');lastFocus?.focus?.();}
async function registerCard(card,moduleId){
 const primary=card.querySelector('.lecturelinks > .primary'),known=STATIC.find(d=>d.short===primary?.dataset.lecture);
 const href=primary?.getAttribute('href')||(known?.id||''),id=card.dataset.localLecture||card.dataset.netlifyLecture||known?.id;
 if(!id)return null;
 let previous=[];try{previous=JSON.parse(card.dataset.previousTitles||'[]');}catch{}
 const title=card.querySelector('h3')?.textContent||'Lecture',number=Number(card.querySelector('.lecturevisual b')?.textContent.match(/LECTURE\s+(\d+)/i)?.[1])||0;
 const url=new URL(href,location.origin),d=Store.descriptor({...(known?staticDescriptor(known):{}),id,moduleId,number,title,href:url.pathname+url.search,localId:card.dataset.localLecture||'',pdfUrl:card.querySelector('a[href*="original" i]')?.getAttribute('href')||known?.pdfUrl||'',aliases:[url.pathname+'::'+title,...previous.map(t=>url.pathname+'::'+t)]});
 await Store.register(d);card.dataset.notebookKey=d.lectureKey;
 let button=card.querySelector('.lecturelinks > [data-lecture-notes],.lecturelinks > [data-notebook-lecture]');
 if(!button){button=document.createElement('button');button.type='button';button.className='lecture-notes-btn';primary?.after(button);}
 button.removeAttribute('data-lecture-notes');button.dataset.notebookLecture=d.lectureKey;button.dataset.notebookTitle=title;button.innerHTML='Notes <span class="note-count"></span>';
 return d;
}
async function refreshLibrary(){
 if(!document.getElementById('libraries'))return;const pass=++libraryPass;
 for(const library of document.querySelectorAll('.library')){
  const moduleId=library.id.replace('module-','');let button=library.querySelector('[data-module-notes]');
  if(!button){button=document.createElement('button');button.type='button';button.className='module-notes-btn';button.dataset.moduleNotes=moduleId;button.innerHTML='All notes <span class="note-count"></span>';library.querySelector('.libhead')?.appendChild(button);}
  for(const card of library.querySelectorAll('.lecture,.atlas-lecture-version'))await registerCard(card,moduleId);
 }
 if(pass!==libraryPass)return;await refreshCounts();if(hub&&!hub.hidden)await renderHub();
}
async function refreshCounts(){
 const notes=await Store.list({kind:'note'});
 document.querySelectorAll('[data-notebook-lecture]').forEach(b=>{const n=notes.filter(n=>n.lectureKey===b.dataset.notebookLecture).length;b.querySelector('.note-count').textContent=String(n);});
 document.querySelectorAll('[data-module-notes]').forEach(b=>{const n=notes.filter(n=>n.moduleId===b.dataset.moduleNotes).length;const badge=b.querySelector('.note-count');if(badge)badge.textContent=String(n);});
}
function mountEnd(){
 if(!document.querySelector('#atlasSlideReader main'))return Promise.resolve();
 if(!endMount)endMount=mountEndOnce().catch(e=>{endMount=null;throw e;});return endMount;
}
async function mountEndOnce(){
 const reader=document.getElementById('atlasSlideReader');if(!reader||document.getElementById('atlas-saved-notes'))return;
 const d=await Store.register(context()),section=document.createElement('section');section.id='atlas-saved-notes';section.className='atlas-reader-extra';
 section.innerHTML='<div class="atlas-section-kicker">Keep what matters</div><h2>Your lecture notes</h2><p>Your saved notes include the whole original slide.</p><div class="atlas-end-actions"><button data-end-add>＋ Note on current slide</button><button data-end-notes>Open notebook</button><button data-end-module>All module notes</button><button data-end-menu>← Module menu</button></div><div class="atlas-end-notes"></div>';
 reader.querySelector('main').appendChild(section);
 section.querySelector('[data-end-add]').onclick=()=>document.getElementById('atlasGNote')?.click();section.querySelector('[data-end-notes]').onclick=()=>open({lectureKey:d.lectureKey,title:d.title});section.querySelector('[data-end-module]').onclick=()=>open({moduleId:d.moduleId,title:'Module notes'});section.querySelector('[data-end-menu]').onclick=()=>home(d.moduleId);
 const update=()=>renderList(section.querySelector('.atlas-end-notes'),{kind:'note',lectureKey:d.lectureKey}).catch(()=>{section.querySelector('.atlas-end-notes').textContent='Could not load your notes. Open the notebook to try again.';});
 window.addEventListener('atlas:notebook-changed',update);await update();
}
document.addEventListener('click',e=>{
 const b=e.target.closest('[data-notebook-lecture],[data-module-notes]');if(!b)return;
 e.preventDefault();open(b.dataset.moduleNotes?{moduleId:b.dataset.moduleNotes,title:'Module notes'}:{lectureKey:b.dataset.notebookLecture,title:b.dataset.notebookTitle});
});
window.addEventListener('atlas:library-reconciled',()=>refreshLibrary().catch(()=>{}));
window.addEventListener('atlas:notebook-changed',()=>{refreshCounts().catch(()=>{});if(hub&&!hub.hidden)renderHub();});
window.addEventListener('pagehide',()=>{for(const p of pdfs.values())p.then(pdf=>pdf.destroy()).catch(()=>{});pdfs.clear();});
window.StudyAtlasNotebook={context,snapshot,pageSnapshot,home,open,close,openSource,renderList,mountEnd,refreshLibrary,refreshCounts};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>refreshLibrary().catch(()=>{}),{once:true});else refreshLibrary().catch(()=>{});
})();
