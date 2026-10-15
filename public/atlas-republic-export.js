/* Study Atlas -> The Republic completion export (opt-in, device-local only).
 * No cross-site cookies, keys, notes, PDFs or direct uploads.
 * The JSON includes only explicitly completed syllabus lectures.
 */
(function(root){
'use strict';
function buildExport(catalog,progress={},timestamp=new Date().toISOString()){
 const modules=Array.isArray(catalog?.MODULES)?catalog.MODULES:[];
 const listed=catalog?.LECTURE_CATALOG||{},valid=new Set(),selected=new Set();
 for(const mod of modules){
  for(const row of listed[mod.code]||[]){
   const number=Number(row[0]);
   if(!Number.isInteger(number)||number<1)continue;
   const key=mod.code+':'+number;valid.add(key);
   if(progress[mod.id+'::lecture-'+number]===true)selected.add(key);
  }
 }
 return {
  format:'study-atlas-republic-progress',version:1,exported_at:timestamp,
  completed:[...selected].sort().map(key=>{
   const split=key.lastIndexOf(':');
   return {module_code:key.slice(0,split),lecture_number:Number(key.slice(split+1))};
  })
 };
}
function addVisibleChecks(payload,catalog){
 // Extra check for live cards whose completion box is checked on this device.
 // Versions of the library can differ; only verified syllabus numbers are sent.
 const known=new Set((catalog?.MODULES||[]).flatMap(m=>(catalog.LECTURE_CATALOG?.[m.code]||[]).map(x=>m.code+':'+x[0])));
 const found=new Set(payload.completed.map(x=>x.module_code+':'+x.lecture_number));
 document.querySelectorAll('.library[id^="module-"]').forEach(lib=>{
  const mid=lib.id.slice('module-'.length),mod=(catalog?.MODULES||[]).find(x=>x.id===mid);
  if(!mod)return;
  lib.querySelectorAll('.lecture').forEach(card=>{
   if(!card.querySelector('.atlas-complete-row input[type="checkbox"]:checked'))return;
   const n=Number((card.querySelector('.lecturevisual b')?.textContent||'').match(/LECTURE\s+(\d+)/i)?.[1]);
   const key=mod.code+':'+n;
   if(known.has(key)&&!found.has(key)){found.add(key);payload.completed.push({module_code:mod.code,lecture_number:n})}
  });
 });
 payload.completed.sort((a,b)=>a.module_code.localeCompare(b.module_code)||a.lecture_number-b.lecture_number);
 return payload;
}
function install(){
 if(document.getElementById('atlasRepublicExport'))return;
 const target=document.querySelector('#rootPage .quickaccess');
 if(!target)return;
 const panel=document.createElement('section');
 panel.id='atlasRepublicExport';panel.className='atlas-republic-export';
 panel.innerHTML='<div class="atlas-republic-copy"><span class="atlas-republic-kicker">CONNECT YOUR EDUCATION MINISTER</span><h2>Share completed lectures with The Republic</h2><p>Study Atlas keeps your completion ticks on this device. Export only the lessons you marked complete, then import the file in <b>The Republic → Education</b>. No PDFs, notes, drawings, passwords or study content are exported.</p><small id="atlasRepublicExportStatus" role="status" aria-live="polite">Private, manual export · no automatic account sync</small></div><button id="atlasRepublicDownload" class="atlas-republic-button" type="button">↓ Export for Republic</button>';
 target.after(panel);
 const status=panel.querySelector('#atlasRepublicExportStatus');
 panel.querySelector('#atlasRepublicDownload').addEventListener('click',()=>{
  const catalog=root.StudyAtlasCatalog;
  if(!catalog?.MODULES?.length){status.textContent='Atlas module catalogue is unavailable. Reload this page and try again.';return}
  let localProgress={};
  try{localProgress=JSON.parse(localStorage.getItem('atlasLectureProgress.v2')||'{}')||{}}
  catch{status.textContent='Could not read saved progress on this device.';return}
  const payload=addVisibleChecks(buildExport(catalog,localProgress),catalog);
  const json=JSON.stringify(payload,null,2);
  const url=URL.createObjectURL(new Blob([json],{type:'application/json'}));
  const a=document.createElement('a');a.href=url;a.download='study-atlas-progress-for-republic.json';
  document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1500);
  status.textContent=payload.completed.length+' explicitly completed syllabus lecture(s) exported. Next: The Republic → Education → Import Atlas completion.';
 });
}
const api={buildExport};
if(typeof module==='object'&&module.exports)module.exports=api;
else {root.StudyAtlasRepublicExport=api;
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();}
})(typeof window!=='undefined'?window:globalThis);
