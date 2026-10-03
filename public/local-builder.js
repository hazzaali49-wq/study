(()=>{
  const cache=new WeakMap();
  async function extract(file,onProgress){
    if(cache.has(file))return cache.get(file);
    const task=(async()=>{
      const doc=await window.StudyAtlasPDF.load(file),pages=[];
      try{for(let n=1;n<=doc.numPages;n++){
        const page=await doc.getPage(n);pages.push(await window.StudyAtlasPDF.readPage(page));page.cleanup();
        onProgress?.('Reading slide '+n+' / '+doc.numPages+'…');
        if(n%4===0)await new Promise(resolve=>setTimeout(resolve,0));
      }return pages;}finally{await doc.destroy();}
    })();
    cache.set(file,task);task.catch(()=>cache.delete(file));return task;
  }
  function detectFromText(filename,pages=[]){
    const C=window.StudyAtlasCatalog;if(!C)return {ok:false,error:'Lecture catalogue is still loading. Try again.'};
    const samples=[filename,...pages.slice(0,3).map(p=>p.lines.slice(0,5).join(' '))];
    const explicit=(filename+' '+samples.slice(1).join(' ')).match(/\b(?:NMHS|PATH|MDSA|ANAT)\d{5}\b/i)?.[0]||'';
    const match=C.matchCalendarLecture(samples,explicit),m=C.getModule(match?.module_code||explicit);
    if(match&&m)return {ok:true,module_id:m.id,module_code:m.code,module_name:m.name,title:match.title,lecture_number:match.number,calendar_date:match.calendar_date,confidence:match.confidence,method:'calendar-local',needs_review:match.confidence<.78};
    if(m)return {ok:true,module_id:m.id,module_code:m.code,module_name:m.name,title:filename.replace(/\.pdf$/i,'').replace(/[_-]+/g,' '),lecture_number:C.inferLectureNumber(m.code,'',filename),confidence:.6,method:'module-code-local',needs_review:true};
    return {ok:false,error:'No confident calendar match. Use Edit to choose the module, lecture number and title.'};
  }
  function fallback(title,pages){
    const slides=pages.map(window.StudyAtlasSlideNotes.fromPage),useful=slides.filter(s=>!['cover','admin'].includes(s.kind)),chapters=[];
    const grouped=useful.length?useful:slides;
    for(let i=0;i<grouped.length;i+=4){const group=grouped.slice(i,i+4);
      chapters.push({title:group[0].title,slide_start:group[0].n,slide_end:group.at(-1).n,summary:'Slides '+group.map(s=>s.n).join(', '),concepts:group.map(s=>({heading:s.title,explain:s.explain,key_points:s.key_points,slide_refs:[s.n]})),visuals:group.map(s=>({slide:s.n,title:s.title,explain:s.explain})),questions:[]});
    }
    return {title,subtitle:'Every original slide, with concise study notes alongside it.',description:'Original slides and study notes · free local tutor',slide_count:pages.length,slides,chapters,cheat_sheet:useful.map(s=>({heading:s.title,bullets:s.key_points.slice(0,2)})),notes_version:2};
  }
  async function enhance(lecture,onProgress){
    const AI=window.StudyAtlasLocalAI;
    if(!AI)return;
    const vision=(await AI.availability(true))==='available',textReady=(await AI.availability())==='available';
    if(!vision&&!textReady)return;
    const teaching=lecture.data.slides.filter(s=>!['cover','admin'].includes(s.kind)),token=lecture.build_token;
    let pdf;
    try{
    if(vision)pdf=await window.StudyAtlasPDF.load(lecture.pdf);
    for(let i=0;i<teaching.length;i+=vision?1:3){
      const group=teaching.slice(i,i+(vision?1:3));onProgress?.('Adding on-device explanations for slides '+group.map(s=>s.n).join(', ')+'…');
      let obj;try{
        let image;
        if(vision){const page=await pdf.getPage(group[0].n),base=page.getViewport({scale:1}),vp=page.getViewport({scale:Math.min(1.5,1000/base.width)});image=document.createElement('canvas');image.width=Math.ceil(vp.width);image.height=Math.ceil(vp.height);await page.render({canvasContext:image.getContext('2d'),viewport:vp}).promise;page.cleanup();}
        const prompt='For each supplied slide, write a clear teaching explanation, not a transcript. At most 70 words plus 4 short points per slide. Define unfamiliar terms briefly. Explain the image and its supported labels and arrows when an image is supplied. Do not invent picture locations or unseen details. If labels cannot be read, say so. Return ONLY JSON {"slides":[{"n":1,"explain":"","key_points":[],"labels":[{"text":"exact source label","explain":"short explanation"}]}]}.\n'+group.map(s=>'SLIDE '+s.n+'\n'+s.source.slice(0,3400)).join('\n\n');
        obj=JSON.parse((await AI.complete(prompt,{image,cacheKey:lecture.id+':'+group[0].n,timeoutMs:12000})).replace(/^```(?:json)?\s*|\s*```$/g,''));
      }catch{break;}
      const current=await window.StudyAtlasLocalDB.get(lecture.id);if(current?.build_token!==token)return;
      let changed=false;
      for(const note of obj.slides||[]){
        const slide=current.data.slides.find(s=>s.n===Number(note.n));
        if(!slide||!group.some(s=>s.n===slide.n)||typeof note.explain!=='string'||!note.explain.trim())continue;
        slide.explain=note.explain.slice(0,650);slide.origin='on-device';
        if(Array.isArray(note.key_points))slide.key_points=note.key_points.filter(x=>typeof x==='string').slice(0,5).map(x=>x.slice(0,200));
        slide.labels=(Array.isArray(note.labels)?note.labels:[]).filter(x=>x&&typeof x.text==='string'&&slide.source.toLowerCase().includes(x.text.toLowerCase())&&typeof x.explain==='string').slice(0,8).map(x=>({text:x.text.slice(0,100),explain:x.explain.slice(0,200)}));changed=true;
      }
      if(changed){await window.StudyAtlasLocalDB.put(current);window.dispatchEvent(new CustomEvent('atlas:lecture-enhanced',{detail:{id:lecture.id,slides:current.data.slides}}));}
      await new Promise(resolve=>setTimeout(resolve,0));
    }
    }finally{await pdf?.destroy();}
  }
  window.StudyAtlasLocalBuilder={extractText:extract,detect:async(file,pages)=>detectFromText(file.name,pages||await extract(file)),fallback,
    async build({file,module,title,lectureNumber,calendarDate,metadataConfirmed=false,onProgress}){
      if(!window.StudyAtlasLocalDB)throw new Error('Local lecture storage is not ready.');
      const pages=await extract(file,onProgress),number=Number(lectureNumber)||null;
      const finalTitle=title||file.name.replace(/\.pdf$/i,''),data=fallback(finalTitle,pages);
      const old=(await window.StudyAtlasLocalDB.all()).sort((a,b)=>(b.updated||b.created||0)-(a.updated||a.created||0)).find(l=>l.module_id===module.id&&(number?Number(l.number)===number:l.filename===file.name));
      const id=old?.id||'local-'+module.id+'-'+(number?String(number).padStart(2,'0'):window.StudyAtlasSlideNotes.clean(finalTitle).toLowerCase().replace(/[^a-z0-9]+/g,'-').slice(0,70));
      const lecture={...old,id,module_id:module.id,module_name:module.name,module_code:module.code,number:number?String(number).padStart(2,'0'):'—',calendar_date:calendarDate||null,title:finalTitle,description:data.description,slides:pages.length+' original slides',chapters:data.chapters.length+' study chapters',created:old?.created||Date.now(),updated:Date.now(),build_token:Date.now()+':'+Math.random().toString(36).slice(2),filename:file.name,metadata_confirmed:metadataConfirmed,pdf:file.slice(0,file.size,'application/pdf'),data,local:true};
      onProgress?.('Saving all '+pages.length+' original slides and study notes…');await window.StudyAtlasLocalDB.put(lecture);
      // The complete source version opens immediately; optional enrichment never blocks an upload.
      enhance(lecture).catch(()=>{});return {ok:true,lecture};
    }
  };
})();
