(()=>{
  const wait=()=>{
    const modal=document.querySelector('.atlas-builder-modal'),file=document.getElementById('atlasBuilderFile'),
      sel=document.getElementById('atlasBuilderModule'),title=document.getElementById('atlasBuilderName'),
      status=document.getElementById('atlasBuilderStatus'),form=document.getElementById('atlasBuilderForm');
    if(!modal||!file||!sel||!title||!status||!form)return setTimeout(wait,80);
    if(modal.dataset.autoDetectReady)return; modal.dataset.autoDetectReady='1';

    // Keep lecture creation only on the main dashboard.
    document.querySelectorAll('.atlas-builder-fab,.atlas-lib-add').forEach(x=>x.remove());
    const head=document.querySelector('#rootPage .head');
    if(head&&!head.querySelector('.atlas-top-add')){
      const actions=document.createElement('div');actions.className='atlas-top-actions';
      const add=document.createElement('button');add.type='button';add.className='atlas-top-add';
      add.innerHTML='<span>✦</span> Add lecture';
      add.onclick=()=>window.StudyAtlasLectureBuilder?.open?.();
      actions.appendChild(add);head.appendChild(actions);
    }


    const grid=modal.querySelector('.atlas-builder-grid');
    const summary=document.createElement('div'); summary.className='atlas-auto-detect full';
    summary.innerHTML='<div class="atlas-auto-icon">✦</div><div class="atlas-auto-copy"><small>AUTO DETECT</small><strong id="atlasAutoMain">Drop a lecture and I’ll identify it.</strong><span id="atlasAutoSub">Module, lecture number and title will be filled automatically.</span></div><button type="button" id="atlasAutoEdit">Edit</button>';
    grid.prepend(summary);
    const fields=[sel.closest('.atlas-builder-field'),title.closest('.atlas-builder-field')].filter(Boolean);
    fields.forEach(x=>x.classList.add('atlas-auto-manual'));
    const edit=summary.querySelector('#atlasAutoEdit'),main=summary.querySelector('#atlasAutoMain'),sub=summary.querySelector('#atlasAutoSub');
    let manual=false,seq=0;
    edit.onclick=()=>{manual=!manual;modal.classList.toggle('atlas-auto-editing',manual);edit.textContent=manual?'Done':'Edit'};

    function quickGuess(name){
      const n=name.toLowerCase(),mods=window.__ATLAS_MODULES__||[];
      const rules=[
        ['mdsa20030',['endocrine','pituitary','thyroid','adrenal']],
        ['mdsa20010',['ingestion','git','gastro','liver','abdominal','peritoneum','stomach','intestin']],
        ['anat20060',['locomotor','lower limb','hip','thigh','knee','foot','gait']],
        ['anat20040',['neuro','brain','cranial','cerebell','synapse']],
        ['path30080',['path','pharmacol','microbi','immun','inflammation']]
      ];
      let id='';for(const [mid,ks] of rules)if(ks.some(k=>n.includes(k))){id=mid;break}
      const m=mods.find(x=>x.id===id);const lm=name.match(/(?:^|[^a-z0-9])(?:lecture|lec|l)\s*0*(\d{1,2})(?:[^a-z0-9]|$)/i);
      return {m,num:lm?Number(lm[1]):null};
    }
    const b64cache=new WeakMap();
    async function toB64(f){if(b64cache.has(f))return b64cache.get(f);const p=new Promise((res,rej)=>{const r=new FileReader();r.onload=()=>res(String(r.result).split(',')[1]);r.onerror=rej;r.readAsDataURL(f)});b64cache.set(f,p);return p}

    file.addEventListener('change',async()=>{
      const f=file.files?.[0];if(!f)return;const mine=++seq;const ds=modal.querySelector('#atlasDropSub');if(ds)ds.textContent=(f.size/1048576).toFixed(1)+' MB · safe chunked upload';
      const q=quickGuess(f.name); if(q.m)sel.value=q.m.id;if(q.num)file.dataset.lectureNumber=String(q.num);
      main.textContent=q.m?(q.m.code+(q.num?' · Lecture '+q.num:'')):'Reading cover…';
      sub.textContent='Confirming module, lecture number and title with Study Atlas AI…';
      summary.classList.add('detecting');summary.classList.remove('good','bad');
      status.className='atlas-builder-status';status.textContent='Identifying this lecture first — no module picking needed.';
      try{
        const pdf=await toB64(f); if(mine!==seq)return;
        const r=await fetch('/api/ai/detect-lecture',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({pdf_data:pdf,filename:f.name})});
        const j=await r.json(); if(mine!==seq)return;if(!r.ok)throw new Error(j.error||'Could not identify lecture');
        if(j.module_id)sel.value=j.module_id;if(j.title)title.value=j.title;if(j.lecture_number)file.dataset.lectureNumber=String(j.lecture_number);
        const conf=Math.round((Number(j.confidence)||0)*100);
        main.textContent=(j.module_code||'')+(j.lecture_number?' · Lecture '+j.lecture_number:'');
        sub.textContent=(j.title||f.name.replace(/\.pdf$/i,''))+' · '+(conf?conf+'% confidence':'matched automatically');
        summary.classList.remove('detecting','bad');summary.classList.add('good');
        status.className='atlas-builder-status good';status.textContent='Detected. Press Build lecture — it will be filed into the correct module automatically.';
      }catch(err){
        summary.classList.remove('detecting','good');summary.classList.add('bad');
        main.textContent='Couldn’t fully identify it';sub.textContent='Use Edit to choose the module/title manually, then build as normal.';
        status.className='atlas-builder-status bad';status.textContent=err.message||String(err);manual=true;modal.classList.add('atlas-auto-editing');edit.textContent='Done';
      }
    });

    const realFetch=window.fetch.bind(window);
    window.fetch=async function(input,init){
      const url=typeof input==='string'?input:input?.url||'';
      if(url.includes('/api/ai/build-lecture')&&init?.body&&typeof init.body==='string'){
        try{
          const body=JSON.parse(init.body),f=file.files?.[0];
          if(f?.dataset?.lectureNumber)body.lecture_number=Number(f.dataset.lectureNumber)||null;
          if(body.pdf_data&&body.pdf_data.length>650000){
            const uploadId='up-'+(crypto.randomUUID?crypto.randomUUID():Date.now().toString(36)+Math.random().toString(36).slice(2));
            const chunkSize=600000,total=Math.ceil(body.pdf_data.length/chunkSize),admin=body.admin_key||'';
            status.className='atlas-builder-status';
            status.textContent='Uploading the lecture safely in '+total+' small parts…';
            const jobs=[];
            for(let i=0;i<total;i++){
              const chunk=body.pdf_data.slice(i*chunkSize,(i+1)*chunkSize);
              jobs.push((async()=>{
                const rr=await realFetch('/api/ai/upload-part',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({upload_id:uploadId,index:i,total,chunk,admin_key:admin})});
                const jj=await rr.json().catch(()=>({}));
                if(!rr.ok)throw new Error(jj.error||('Upload part '+(i+1)+' failed'));
                return i;
              })());
            }
            let done=0;
            await Promise.all(jobs.map(p=>p.then(v=>{done++;status.textContent='Uploading lecture safely… '+done+'/'+total+' parts';return v})));
            delete body.pdf_data;
            body.upload_id=uploadId;
            body.chunk_count=total;
            status.textContent='Upload complete. Creating the lecture…';
          }
          init={...init,body:JSON.stringify(body)};
        }catch(err){
          status.className='atlas-builder-status bad';
          status.textContent=err?.message||String(err);
          throw err;
        }
      }
      return realFetch(input,init);
    };
  };
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',wait,{once:true});else wait();
})();