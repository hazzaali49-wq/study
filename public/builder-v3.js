(()=>{
 const wait=()=>{
   const modal=document.querySelector('.atlas-builder-modal'),file=document.getElementById('atlasBuilderFile'),
     sel=document.getElementById('atlasBuilderModule'),title=document.getElementById('atlasBuilderName'),
     status=document.getElementById('atlasBuilderStatus'),form=document.getElementById('atlasBuilderForm'),
     go=modal?.querySelector('.atlas-builder-go'),adminWrap=document.getElementById('atlasBuilderAdminWrap');
   if(!modal||!file||!sel||!title||!status||!form||!go||!window.StudyAtlasLocalBuilder||!window.StudyAtlasLocalDB)return setTimeout(wait,70);
   if(modal.dataset.zeroNetlifyReady)return;modal.dataset.zeroNetlifyReady='1';
   if(adminWrap)adminWrap.hidden=true;

   document.querySelectorAll('.atlas-builder-fab,.atlas-lib-add').forEach(x=>x.remove());
   const head=document.querySelector('#rootPage .head');
   if(head&&!head.querySelector('.atlas-top-add')){
     let actions=head.querySelector('.atlas-top-actions');if(!actions){actions=document.createElement('div');actions.className='atlas-top-actions';head.appendChild(actions)}
     const add=document.createElement('button');add.type='button';add.className='atlas-top-add';add.innerHTML='<span>✦</span> Add lecture';actions.appendChild(add);
     add.onclick=()=>open();
   }

   const grid=modal.querySelector('.atlas-builder-grid');
   let summary=grid.querySelector('.atlas-auto-detect');
   if(!summary){
     summary=document.createElement('div');summary.className='atlas-auto-detect full';
     summary.innerHTML='<div class="atlas-auto-icon">✦</div><div class="atlas-auto-copy"><small>LOCAL CALENDAR DETECT</small><strong id="atlasAutoMain">Drop a lecture and I’ll identify it.</strong><span id="atlasAutoSub">Calendar + PDF text · nothing is uploaded.</span></div><button type="button" id="atlasAutoEdit">Edit</button>';
     grid.prepend(summary);
   }
   const fields=[sel.closest('.atlas-builder-field'),title.closest('.atlas-builder-field')].filter(Boolean);fields.forEach(x=>x.classList.add('atlas-auto-manual'));
   const edit=summary.querySelector('#atlasAutoEdit'),main=summary.querySelector('#atlasAutoMain'),sub=summary.querySelector('#atlasAutoSub');
   let manual=false,seq=0,calendarDate=null;
   edit.onclick=()=>{manual=!manual;modal.classList.toggle('atlas-auto-editing',manual);edit.textContent=manual?'Done':'Edit'};

   function open(mid){
     if(mid)sel.value=mid;modal.hidden=false;document.body.style.overflow='hidden';
     status.className='atlas-builder-status good';
     status.textContent='Private local mode · uploading/building this lecture sends no PDF or lecture data to Netlify and uses no Netlify Functions/Blobs.';
   }
   function close(){modal.hidden=true;document.body.style.overflow=''}
   window.StudyAtlasLectureBuilder={open};
   modal.querySelector('.atlas-builder-x').onclick=close;modal.querySelector('.atlas-builder-cancel').onclick=close;
   modal.addEventListener('pointerdown',e=>{if(e.target===modal)close()});

   file.onchange=async()=>{
     const f=file.files?.[0];if(!f)return;const mine=++seq;file.dataset.lectureNumber='';calendarDate=null;
     modal.querySelector('#atlasDropTitle').textContent=f.name;modal.querySelector('#atlasDropSub').textContent=`${(f.size/1048576).toFixed(1)} MB · stays on this device`;
     main.textContent='Reading lecture locally…';sub.textContent='Checking filename + course calendar + first slides.';
     summary.classList.add('detecting');summary.classList.remove('good','bad');status.className='atlas-builder-status';status.textContent='Reading PDF locally…';
     try{
       const pages=await window.StudyAtlasLocalBuilder.extractText(f,t=>{if(mine===seq)status.textContent=t});
       if(mine!==seq)return;
       const j=await window.StudyAtlasLocalBuilder.detect(f,pages);if(!j.ok)throw new Error(j.error||'Could not identify lecture');
       if(j.module_id)sel.value=j.module_id;if(j.title)title.value=j.title;if(j.lecture_number)file.dataset.lectureNumber=String(j.lecture_number);calendarDate=j.calendar_date||null;
       main.textContent=(j.module_code||'')+(j.lecture_number?' · Lecture '+j.lecture_number:'');
       sub.textContent=(j.title||f.name.replace(/\.pdf$/i,''))+' · '+(j.method?.startsWith('calendar')?'calendar matched':'local match')+(j.calendar_date?' · '+new Date(j.calendar_date+'T12:00:00').toLocaleDateString(undefined,{day:'numeric',month:'short'}):'');
       summary.classList.remove('detecting','bad');summary.classList.add('good');
       status.className='atlas-builder-status good';status.textContent='Matched entirely on this device. Press Build lecture — no Netlify upload, Function or Blob request will be made.';
     }catch(err){
       summary.classList.remove('detecting','good');summary.classList.add('bad');main.textContent='Needs a quick check';sub.textContent='Use Edit to choose the module/title. Nothing was uploaded.';
       status.className='atlas-builder-status';status.textContent=err?.message||String(err);manual=true;modal.classList.add('atlas-auto-editing');edit.textContent='Done';
       if(!title.value)title.value=f.name.replace(/\.pdf$/i,'').replace(/[_-]+/g,' ');
     }
   };

   form.onsubmit=async e=>{
     e.preventDefault();const f=file.files?.[0],mods=window.__ATLAS_MODULES__||[],m=mods.find(x=>x.id===sel.value);if(!f||!m)return;
     if(f.size>50000000){status.className='atlas-builder-status bad';status.textContent='This lecture PDF is over 50 MB. Compress it first.';return}
     go.disabled=true;go.textContent='Building locally…';status.className='atlas-builder-status';
     try{
       const j=await window.StudyAtlasLocalBuilder.build({file:f,module:m,title:title.value.trim()||f.name.replace(/\.pdf$/i,''),lectureNumber:file.dataset.lectureNumber,calendarDate,onProgress:t=>status.textContent=t});
       status.className='atlas-builder-status good';status.textContent='Saved '+(j.lecture?.title||title.value)+' privately on this device. 0 lecture-upload Netlify credits used.';
       await window.StudyAtlasLocalLibrary?.refresh?.();
       setTimeout(close,650);
     }catch(err){status.className='atlas-builder-status bad';status.textContent=err?.message||String(err)}
     finally{go.disabled=false;go.textContent='✦ Build lecture'}
   };
 };
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',wait,{once:true});else wait();
})();