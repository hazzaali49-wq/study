(()=>{
const PDFJS='https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/build/pdf.min.mjs',WORKER='https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/build/pdf.worker.min.mjs';
let pdfjsP=null;async function pdfjs(){if(!pdfjsP)pdfjsP=import(PDFJS).then(m=>(m.GlobalWorkerOptions.workerSrc=WORKER,m));return pdfjsP}
const clean=s=>String(s||'').replace(/\s+/g,' ').trim();
const skip=t=>/^(learning objectives?|learning outcomes?|references?|reading list|copyright|module (introduction|information)|thank you)$/i.test(clean(t));
function parseJSON(t){t=String(t||'').replace(/^\`\`\`(?:json)?/i,'').replace(/\`\`\`$/,'').trim();const a=t.indexOf('{'),b=t.lastIndexOf('}');return JSON.parse(a>=0&&b>a?t.slice(a,b+1):t)}
async function extract(file,onProgress){
 const p=await pdfjs(),buf=await file.arrayBuffer(),doc=await p.getDocument({data:new Uint8Array(buf)}).promise,pages=[];
 for(let i=1;i<=doc.numPages;i++){const pg=await doc.getPage(i),tc=await pg.getTextContent();let lines=tc.items.map(x=>clean(x.str)).filter(Boolean);pages.push({n:i,text:clean(lines.join(' ')),lines});onProgress?.('Reading slide '+i+' / '+doc.numPages+'…')}
 return pages;
}
async function localSession(system,onProgress){
 if(!('LanguageModel' in self))return null;
 let opts={expectedInputs:[{type:'text',languages:['en']}],expectedOutputs:[{type:'text',languages:['en']}]};
 let av=await LanguageModel.availability(opts).catch(()=> 'unavailable');if(av==='unavailable')return null;
 onProgress?.(av==='available'?'Local AI ready.':'Preparing Chrome local AI model…');
 return await LanguageModel.create({...opts,initialPrompts:[{role:'system',content:system}],monitor(m){m.addEventListener('downloadprogress',e=>onProgress?.('One-time local model download · '+Math.round((e.loaded||0)*100)+'%'))}});
}
function fallback(title,moduleName,pages){
 const useful=pages.filter(p=>p.text.length>30&&!skip(p.lines[0]||''));const chapters=[];for(let i=0;i<useful.length;i+=4){const g=useful.slice(i,i+4),a=g[0]?.n||1,b=g.at(-1)?.n||a;
  const concepts=g.map(p=>({heading:(p.lines[0]||'Slide '+p.n).slice(0,100),explain:p.text.slice(0,520),key_points:p.lines.slice(1,7).map(x=>x.slice(0,150)),slide_refs:[p.n]}));
  chapters.push({title:(g[0]?.lines[0]||'Key concepts').slice(0,90),summary:'Slides '+a+'–'+b,slide_start:a,slide_end:b,intro:'',concepts,visuals:g.slice(0,2).map(p=>({slide:p.n,title:p.lines[0]||'Original slide',explain:'Use the original slide beside the explanation.',labels:[]})),questions:[]});
 }
 return {title,subtitle:'Local Study Atlas version · no API credits',description:'Built locally from the original lecture.',slide_count:pages.length,chapters,cheat_sheet:chapters.slice(0,8).map(c=>({heading:c.title,bullets:c.concepts.slice(0,2).map(x=>x.heading)}))};
}
async function buildWithLocalAI(meta,pages,onProgress){
 const system='You are Study Atlas local AI. Convert lecture slide text into concise, complete medical teaching notes. Skip title/learning outcome/admin/reference slides. Preserve source terminology and slide numbers. Add only genuinely useful memorable facts. Output strict JSON only.';
 const sess=await localSession(system,onProgress);if(!sess)return fallback(meta.title,meta.module_name,pages);
 const useful=pages.filter(p=>p.text.length>20&&!skip(p.lines[0]||'')),parts=[];
 for(let i=0;i<useful.length;i+=5){const g=useful.slice(i,i+5),prompt='Lecture: '+meta.title+'\nModule: '+meta.module_code+' '+meta.module_name+'\nSlides:\n'+g.map(p=>'SLIDE '+p.n+': '+p.text.slice(0,2200)).join('\n\n')+'\nReturn JSON: {"chapters":[{"title":"","summary":"","slide_start":1,"slide_end":5,"intro":"","concepts":[{"heading":"","explain":"","key_points":[],"slide_refs":[],"fun_fact":"","memory":"","clinical":""}],"visuals":[{"slide":1,"title":"","explain":"","labels":[]}],"questions":[{"question":"","options":["","","",""],"answer_index":0,"explanation":""}]}],"cheat_sheet":[{"heading":"","bullets":[]}]}';
  onProgress?.('Local AI teaching slides '+g[0].n+'–'+g.at(-1).n+'…');let obj;try{obj=parseJSON(await sess.prompt(prompt))}catch{obj={chapters:fallback(meta.title,meta.module_name,g).chapters,cheat_sheet:[]}}parts.push(obj);
 }
 try{sess.destroy?.()}catch{}
 const chapters=parts.flatMap(x=>x.chapters||[]);return {title:meta.title,subtitle:'Local Study Atlas version · no API credits',description:'Locally generated from the original lecture.',slide_count:pages.length,chapters,cheat_sheet:parts.flatMap(x=>x.cheat_sheet||[]).slice(0,18)};
}
async function upload(file,admin,onProgress){
 const b64=await new Promise((res,rej)=>{const r=new FileReader();r.onload=()=>res(String(r.result).split(',')[1]);r.onerror=rej;r.readAsDataURL(file)}),id='up-'+(crypto.randomUUID?.()||Date.now()),size=600000,total=Math.ceil(b64.length/size);
 for(let i=0;i<total;i++){onProgress?.('Saving original PDF · '+(i+1)+'/'+total);const rr=await fetch('/api/ai/upload-part',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({upload_id:id,index:i,total,chunk:b64.slice(i*size,(i+1)*size),admin_key:admin||''})});if(!rr.ok)throw new Error((await rr.json().catch(()=>({}))).error||'Upload failed')}
 return {upload_id:id,chunk_count:total};
}
window.StudyAtlasLocalBuilder={
 async extractText(file,onProgress){return extract(file,onProgress)},
 async build({file,module,title,lectureNumber,admin,onProgress}){
  const pages=await extract(file,onProgress),data=await buildWithLocalAI({title,module_name:module.name,module_code:module.code},pages,onProgress),up=await upload(file,admin,onProgress);
  onProgress?.('Saving lecture to your Study Atlas library…');
  const r=await fetch('/api/local/save-lecture',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({...up,filename:file.name,title,module_id:module.id,module_name:module.name,module_code:module.code,lecture_number:Number(lectureNumber)||null,admin_key:admin||'',data})});
  const j=await r.json();if(!r.ok)throw new Error(j.error||'Could not save lecture');return j;
 }
};
})();