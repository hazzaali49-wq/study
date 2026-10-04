/* Notes and pins share one device-local store. Images live separately from the list metadata. */
(()=>{
'use strict';
const FALLBACK='atlasStudyNotebook.v1',SIGNAL='atlasStudyNotebook.changed',items=new Map(),lectures=new Map();
const legacyCache=new Map();
let database=null,opening=null,fallback=null;
const json=(key,other)=>{try{return JSON.parse(localStorage.getItem(key))??other;}catch{return other;}};
function legacyJSON(key,other){
 try{const raw=localStorage.getItem(key),cached=legacyCache.get(key);if(cached?.raw===raw)return cached.value;const value=JSON.parse(raw)??other;legacyCache.set(key,{raw,value});return value;}catch{return other;}
}
const hash=s=>{let h=2166136261;for(const c of String(s)){h^=c.charCodeAt(0);h=Math.imul(h,16777619);}return (h>>>0).toString(36);};
const group=d=>d.moduleId+'::'+(Number(d.number)>0?'lecture-'+Number(d.number):d.id);
function descriptor(d){
 const moduleId=String(d.moduleId||d.module_id||'').toLowerCase(),id=String(d.id||'');
 const number=Number(d.number||d.lecture_number)||0;
 return {...d,id,moduleId,number,lectureKey:group({id,moduleId,number}),title:d.title||'Lecture',href:d.href||'',aliases:[...new Set(d.aliases||[])]};
}
function transaction(stores,mode,run){return new Promise((resolve,reject)=>{
 const t=database.transaction(stores,mode);let result;
 try{result=run(t);}catch(e){t.abort();reject(e);return;}
 t.oncomplete=()=>resolve(result&&'result' in result?result.result:result);t.onerror=()=>reject(t.error||new Error('Storage is unavailable.'));t.onabort=()=>reject(t.error||new Error('The save was interrupted.'));
});}
async function ready(){
 if(opening)return opening;
 opening=(async()=>{
  try{database=await new Promise((resolve,reject)=>{
   if(!window.indexedDB){reject(new Error('IndexedDB unavailable'));return;}
   const r=window.indexedDB.open('study-atlas-notebook',1);
   r.onupgradeneeded=()=>{for(const name of ['items','assets','lectures'])if(!r.result.objectStoreNames.contains(name))r.result.createObjectStore(name,{keyPath:'id'});};
   r.onsuccess=()=>{r.result.onversionchange=()=>r.result.close();resolve(r.result);};r.onerror=()=>reject(r.error);
  });}catch{fallback=json(FALLBACK,{items:[],assets:{},lectures:[]});}
  const rows=database?await transaction(['items'],'readonly',t=>t.objectStore('items').getAll()):fallback.items||[];
  const contexts=database?await transaction(['lectures'],'readonly',t=>t.objectStore('lectures').getAll()):fallback.lectures||[];
  rows.forEach(x=>items.set(x.id,x));contexts.forEach(x=>lectures.set(x.id,x));
 })();return opening;
}
function changed(){
 window.dispatchEvent(new CustomEvent('atlas:notebook-changed'));
 try{localStorage.setItem(SIGNAL,Date.now()+':'+Math.random());}catch{}
 if(window.parent!==window)window.parent.postMessage({source:'study-atlas-lecture',notesChanged:true},location.origin);
}
async function reload(){
 await ready();const rows=database?await transaction(['items'],'readonly',t=>t.objectStore('items').getAll()):json(FALLBACK,{items:[]}).items;
 const contexts=database?await transaction(['lectures'],'readonly',t=>t.objectStore('lectures').getAll()):json(FALLBACK,{lectures:[]}).lectures;
 items.clear();(rows||[]).forEach(x=>items.set(x.id,x));
 lectures.clear();(contexts||[]).forEach(x=>lectures.set(x.id,x));
 window.dispatchEvent(new CustomEvent('atlas:notebook-changed'));
}
window.addEventListener('storage',e=>{if(e.key===SIGNAL||e.key===FALLBACK)reload().catch(()=>{});});
async function persist(record,asset){
 await ready();
 if(database)await transaction(['items','assets'],'readwrite',t=>{
  t.objectStore('items').put(record);
  if(record.deleted)t.objectStore('assets').delete(record.id);
  else if(asset)t.objectStore('assets').put({id:record.id,...asset});
 });else{
  // Write before changing memory: a quota error must never look like a successful save.
  const disk=json(FALLBACK,fallback),next={...disk,items:[...(disk.items||[]).filter(x=>x.id!==record.id),record],assets:{...disk.assets}};
  if(record.deleted)delete next.assets[record.id];else if(asset)next.assets[record.id]=asset;
  localStorage.setItem(FALLBACK,JSON.stringify(next));fallback=next;
 }
 items.set(record.id,record);return record;
}
async function register(value){
 await ready();const before=lectures.get(value.id),full=descriptor({...before,...value}),{figures,blocks,...d}=full;
 if(JSON.stringify(before)!==JSON.stringify(d)){
  if(database)await transaction(['lectures'],'readwrite',t=>t.objectStore('lectures').put(d));
  else {const disk=json(FALLBACK,fallback),next={...disk,lectures:[...(disk.lectures||[]).filter(x=>x.id!==d.id),d]};localStorage.setItem(FALLBACK,JSON.stringify(next));fallback=next;}
  lectures.set(d.id,d);
 }
 await migrate(full);return d;
}
function meta(d){return {lectureId:d.id,lectureKey:d.lectureKey,moduleId:d.moduleId,number:d.number,lectureTitle:d.title,href:d.href,pdfUrl:d.pdfUrl&&!String(d.pdfUrl).startsWith('blob:')?d.pdfUrl:'',localId:d.localId||''};}
async function importOne(d,kind,n,identity){
 const id='import:'+kind+':'+hash(d.id+'|'+identity);
 if(items.has(id))return; // Includes deletion tombstones, so old saves cannot reappear.
 const slide=Number(n.slide||n.slideNumber)||null;
 const snapshot=n.snapshot||n.image||'',sketch=n.sketch||'';
 await persist({...meta(d),id,kind,slide,title:n.title||n.context||n.caption||(slide?'Slide '+slide:'Saved '+kind),text:n.text||'',created:n.created||n.date||0,strokes:n.strokes||[],sketchAspect:n.sketchAspect||2,hasSnapshot:!!snapshot,hasSketch:!!sketch,legacy:true,legacyFigure:n.figureIndex},snapshot||sketch?{snapshot,sketch}:undefined);
}
async function migrate(d){
 const aliases=new Set(['lecture:'+d.id,...d.aliases]);
 for(const [key,kind] of [['atlasGeneratedNotes.v3','note'],['atlasGeneratedPins.v3','pin']]){
  const legacy=legacyJSON(key,{});
  for(const name of aliases)for(const n of Array.isArray(legacy[name])?legacy[name]:[]){
   await importOne(d,kind,n,n.id||JSON.stringify([n.date||0,n.slide||n.key||n.context,n.text,n.sketch]));
  }
 }
 for(const key of d.noteKeys||[]){const rows=legacyJSON(key,[]);for(const n of Array.isArray(rows)?rows:[])await importOne(d,'note',n,n.id||JSON.stringify(n));}
 // Original hand-built boards stored figure indices, not original slide numbers.
 if(d.figures?.length)for(const key of d.pinKeys||[])for(const n of Array.isArray(legacyJSON(key,[]))?legacyJSON(key,[]):[]){
  if(n.type==='figure'){
   const f=d.figures[n.index];if(f)await importOne(d,'pin',{...n,slide:f.slide,title:f.caption,image:f.image},n.key);
  }else if(n.type==='deck'){
   for(const f of d.figures.filter(f=>f.chapter===n.chapter))await importOne(d,'pin',{...n,slide:f.slide,title:f.caption,image:f.image},n.key+':'+f.slide);
  }else if(n.type==='quote'||n.type==='block'){
   const block=d.blocks?.[n.id];await importOne(d,'pin',{...n,text:n.text||block||n.source,title:n.title||'Pinned text'},n.key);
  }
 }
}
async function list(scope={}){
 await ready();return [...items.values()].filter(x=>!x.deleted&&(!scope.kind||x.kind===scope.kind)).map(x=>{
  const d=lectures.get(x.lectureId);return d?{...x,...meta(d)}:x;
 }).filter(x=>(!scope.moduleId||x.moduleId===scope.moduleId)&&(!scope.lectureKey||x.lectureKey===scope.lectureKey)&&(!scope.lectureId||x.lectureId===scope.lectureId)).sort((a,b)=>(a.number||999)-(b.number||999)||(a.slide||999)-(b.slide||999)||b.created-a.created);
}
async function save(d,value,asset={}){
 d=await register(d);const id=value.id||'saved:'+Date.now().toString(36)+':'+Math.random().toString(36).slice(2),old=items.get(id);
 const record={...old,...meta(d),...value,id,created:old?.created||value.created||Date.now(),updated:Date.now(),hasSnapshot:!!asset.snapshot||!!old?.hasSnapshot,hasSketch:!!asset.sketch||!!old?.hasSketch};
 await persist(record,{...await assets(id),...asset});changed();return record;
}
async function assets(id){await ready();return database?(await transaction(['assets'],'readonly',t=>t.objectStore('assets').get(id))||{}):(json(FALLBACK,fallback).assets?.[id]||{});}
async function attach(id,snapshot){
 await ready();const asset=await assets(id);let updated;
 if(database)await transaction(['items','assets'],'readwrite',t=>{
  const request=t.objectStore('items').get(id);
  request.onsuccess=()=>{const row=request.result;if(!row||row.deleted)return;updated={...row,hasSnapshot:true};t.objectStore('items').put(updated);t.objectStore('assets').put({...asset,id,snapshot});};
 });else{
  const disk=json(FALLBACK,fallback),row=disk.items?.find(x=>x.id===id);if(!row||row.deleted)return;
  updated={...row,hasSnapshot:true};await persist(updated,{...asset,snapshot});
 }
 if(updated)items.set(id,updated);
}
async function remove(id){await ready();const row=items.get(id);if(!row)return;await persist({...row,deleted:true,text:'',strokes:[]});changed();}
window.StudyAtlasStudyStore={ready,register,list,save,remove,assets,attach,reload,descriptor,group};
})();
