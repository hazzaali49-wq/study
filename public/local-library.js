(()=>{
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function nOf(card){return Number((card.querySelector('.lecturevisual b')?.textContent||'').match(/LECTURE\s+(\d+)/i)?.[1]||999)}
async function openOriginal(id){
 const l=await window.StudyAtlasLocalDB?.get(id);if(!l?.pdf)return;
 const url=URL.createObjectURL(l.pdf),w=window.open(url,'_blank','noopener');
 setTimeout(()=>URL.revokeObjectURL(url),120000);
 if(!w)location.href=url;
}
async function refresh(){
 if(!window.StudyAtlasLocalDB)return;
 const items=await window.StudyAtlasLocalDB.all();
 for(const lecture of items){
  if(lecture.metadata_confirmed)continue;
  const match=window.StudyAtlasCatalog?.matchCalendarLecture([lecture.filename||lecture.title,lecture.title||'']);
  if(match?.confidence<.78||!match)continue;
  const m=window.StudyAtlasCatalog.getModule(match.module_code);
  if(lecture.module_id!==m.id||Number(lecture.number)!==match.number||lecture.title!==match.title){
   lecture.previous_titles=[...new Set([...(lecture.previous_titles||[]),lecture.title])];
   Object.assign(lecture,{module_id:m.id,module_code:m.code,module_name:m.name,number:String(match.number).padStart(2,'0'),title:match.title,calendar_date:match.calendar_date});
   if(lecture.data)lecture.data.title=match.title;await window.StudyAtlasLocalDB.put(lecture);
  }
 }

 window.StudyAtlasLibraryCards?.restore();
 document.querySelectorAll('[data-local-lecture]').forEach(x=>x.remove());
 const by=new Map();for(const x of items){if(!by.has(x.module_id))by.set(x.module_id,[]);by.get(x.module_id).push(x)}
 for(const [mid,ls] of by){
   const lib=document.getElementById('module-'+mid);if(!lib)continue;
   let grid=lib.querySelector('.lecturegrid');if(!grid){lib.querySelector('.nolectures')?.remove();grid=document.createElement('div');grid.className='lecturegrid';lib.appendChild(grid)}
   ls.sort((a,b)=>(Number(a.number)||999)-(Number(b.number)||999)||(a.created||0)-(b.created||0));
   for(const l of ls){
     const card=document.createElement('article');card.className='lecture';card.dataset.localLecture=l.id;card.dataset.savedAt=l.updated||l.created||0;
     card.innerHTML=`<div class="lecturevisual"><b>LECTURE ${esc(l.number||'—')} · ${esc(l.module_code||'')}</b><span aria-hidden="true">✦</span></div><div class="lecturebody"><h3>${esc(l.title)}</h3><p>${esc(l.description||'Local Study Atlas lecture.')}</p><div class="micro">${esc(l.slides||'Original lecture preserved')} · ${esc(l.chapters||'local chapters')} · on this device</div><div class="lecturelinks"><a class="primary" href="/local-lecture.html?id=${encodeURIComponent(l.id)}">Study lecture ↗</a><button class="secondary" type="button" data-local-original="${esc(l.id)}">Original slides ↗</button><button class="secondary atlas-local-delete" type="button" data-local-delete="${esc(l.id)}">Remove</button></div></div>`;
     grid.appendChild(card);
   }
   [...grid.children].sort((a,b)=>nOf(a)-nOf(b)).forEach(x=>grid.appendChild(x));
   const total=grid.querySelectorAll('.lecture').length,small=lib.querySelector('.libhead small');if(small)small.textContent=`${total} lecture${total===1?'':'s'}`;
   const topBtn=document.querySelector(`[data-module="${CSS.escape(mid)}"]`),badge=topBtn?.closest('.module')?.querySelector('.badge');if(badge&&total){badge.classList.remove('empty');badge.textContent=`${total} lecture${total===1?'':'s'} ready`}
 }
 document.querySelectorAll('[data-local-original]').forEach(b=>b.onclick=()=>openOriginal(b.dataset.localOriginal));
 document.querySelectorAll('[data-local-delete]').forEach(b=>b.onclick=async()=>{if(!confirm('Remove this locally saved lecture from this device?'))return;await window.StudyAtlasLocalDB.remove(b.dataset.localDelete);refresh()});
 window.StudyAtlasLibraryCards?.reconcile();
 window.dispatchEvent(new CustomEvent('atlas:local-library-updated',{detail:{count:items.length}}));
}
window.StudyAtlasLocalLibrary={refresh,openOriginal};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(refresh,80),{once:true});else setTimeout(refresh,80);
setTimeout(refresh,900);
})();
