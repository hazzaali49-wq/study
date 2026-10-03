(()=>{
const PDFJS='https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/build/pdf.min.mjs',WORKER='https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/build/pdf.worker.min.mjs';
const MODULES={
 nmhs10100:{id:'nmhs10100',code:'NMHS10100',name:'Health across the Lifespan'},
 path30080:{id:'path30080',code:'PATH30080',name:'Disease Mechanisms & Pharmacology'},
 mdsa20030:{id:'mdsa20030',code:'MDSA20030',name:'Endocrine Biology'},
 mdsa20010:{id:'mdsa20010',code:'MDSA20010',name:'GIT / Liver Biology'},
 anat20060:{id:'anat20060',code:'ANAT20060',name:'Locomotor Biology'},
 anat20040:{id:'anat20040',code:'ANAT20040',name:'Neurosciences'}
};
const CAL={
 MDSA20030:[
  {n:1,t:'Module Introduction / Principles of Endocrinology',d:'2026-09-09',a:['module introduction','principles of endocrinology']},
  {n:2,t:'Clinical Anatomy of the Pituitary',d:'2026-09-11',a:['clinical anatomy of the pituitary','clinical anatomy pituitary','pituitary anatomy']},
  {n:3,t:'Hypothalamus and Pituitary',d:'2026-09-16',a:['hypothalamus and pituitary','posterior pituitary physiology','hypothalamus posterior pituitary']},
  {n:4,t:'Anterior Pituitary Physiology',d:'2026-09-18',a:['anterior pituitary physiology','anterior pituitary']},
  {n:6,t:'Growth Hormone / IGF-I Axis',d:'2026-09-23',a:['growth hormone igf i axis','growth hormone igf-1 axis','gh igf i axis','gh igf-1 axis','gh igf axis']},
  {n:5,t:'Clinical Anatomy of the Thyroid & Parathyroid Glands',d:'2026-09-25',a:['clinical anatomy thyroid parathyroid','thyroid parathyroid anatomy']},
  {n:7,t:'Thyroid Physiology',d:'2026-09-30',a:['thyroid physiology']},
  {n:8,t:'Calcium Regulation',d:'2026-10-02',a:['calcium regulation','calcium homeostasis']}
 ],
 MDSA20010:[
  [1,'Anatomy of Ingestion 1: Muscles of mastication, oral cavity'],[2,'Anatomy of Ingestion 2: Palate, salivary glands and pharynx'],[3,'Salivary glands, mastication and swallowing'],[4,'Abdominal wall and hernias'],[5,'Peritoneum & Peritoneal Cavity'],[6,'Principles of Perfusion, Drainage and Innervation in the Abdominal Viscera'],[7,'Anatomy of the oesophagus and stomach'],[8,'Anatomy of the liver and biliary tree'],[9,'Secretions of stomach; gastric motility'],[10,'Anatomy of the pancreas and spleen'],[11,'Liver physiology; biliary secretions; bile salt synthesis; bilirubin; jaundice'],[12,'Anatomy of the small intestine'],[13,'Exocrine pancreas; histology of the spleen'],[14,'Small intestinal secretions and motility'],[15,'Anatomy of the appendix, caecum and colon'],[16,'Anatomy of the rectum, anus and ischioanal fossa'],[17,'Digestion and Absorption'],[18,'Embryology of the GI Tract'],[19,'Colonic motility and defecation'],[20,'Immunological function of the GIT'],[21,'Integration of Metabolism'],[22,'Vitamins and minerals; alcohol metabolism and vitamin deficiency'],[23,'Imaging of Abdomen with GIT/Liver Focus']
 ].map(x=>({n:x[0],t:x[1],a:[]})),
 ANAT20060:[
  [1,'Introduction to Module; Fascia of the lower limb'],[2,'Osteology of the os coxa and femur'],[3,'Gluteal region including neurovascular structures and relationships'],[4,'Posterior compartment of the thigh & hip joint'],[5,'Anterior compartment of the thigh'],[6,'Medial compartment of the thigh & neurovascular structures'],[7,'Lumbar Plexus'],[8,'Sacral Plexus'],[9,'Osteology of the leg'],[10,'Knee Joint'],[11,'Anterior & lateral compartments of the leg'],[12,'Posterior compartment of the leg; tibiofibular and ankle joints'],[13,'Foot: intrinsic muscles & neurovascular structures'],[14,'Foot: joints and arches'],[15,'Bone fracture and repair'],[16,'Arterial supply and venous and lymphatic drainage of lower limb'],[17,'Limb Development'],[18,'Posture & gait'],[19,'Clinical examination of lower limb'],[20,'Translating theory to practice for the lower limb']
 ].map(x=>({n:x[0],t:x[1],a:[]})),
 ANAT20040:[
  [1,'Module introduction'],[2,'Central & peripheral nervous systems, anatomy of the cranium'],[3,'Development of the nervous system'],[4,'The synapse and neurotransmitters'],[5,'Autonomic nervous system'],[6,'Structure and function of the brainstem; introduction to cranial nerves'],[7,'Central somatosensory pathways and thalamus'],[8,'Eye I: anatomy of eye, ciliary apparatus, lens, refraction and accommodation'],[9,'Eye II: the orbit and its contents, central control of eye movement, reflexes'],[10,'Eye III: the photosensitive retina and the central visual pathways'],[11,'Cranial nerve V - the trigeminal nerve'],[12,'Cranial nerve VII - the facial nerve, muscles of facial expression'],[13,'The auditory system'],[14,'The vestibular system and the control of balance and eye movement'],[15,'Cranial nerves IX-XII'],[16,'Control of voluntary movement, upper & lower motor neurone lesions'],[17,'Proprioception and the regulation of muscle tone and posture'],[18,'Basal ganglia: structure, role in motor control and diseases'],[19,'Cerebellum I: structure, neurophysiology and afferents'],[20,'Cerebellum II: efferents, role in motor control and diseases'],[21,'Cortical localisation of function, speech and the aphasias'],[22,'EEG, sleep, reticular activating system, brain electrical rhythms'],[23,'The meninges, venous sinuses and cerebrospinal fluid'],[24,'Blood supply of the central nervous system'],[25,'The measurement and regulation of cerebral arterial blood flow'],[26,'Brain plasticity, learning and memory'],[27,'Olfactory and limbic systems. Neural basis of behaviour and emotion'],[28,'Pain and nociception']
 ].map(x=>({n:x[0],t:x[1],a:[]})),
 PATH30080:[
  [1,'Structure and Function of bacteria'],[2,'Genetic variation in bacteria'],[3,'Microbial growth and diagnosis of infection'],[4,'Pathological consequences of infection'],[5,'Source, route and spread of infection'],[6,'Introduction to viruses'],[7,'Pathology Terminology: From Organ to Cell'],[8,'Diagnostic virology'],[9,'Cellular Adaptation / Maladaptation'],[10,'Cellular Injury and Cellular Death'],[11,'Immunology and Barriers'],[12,'Introduction to immunity'],[13,'Innate Immunity'],[14,'Adaptive Immunity'],[15,'Immune Memory'],[16,'Immune Tolerance'],[17,'Hypersensitivity & Autoimmunity'],[18,'Immunodeficiency'],[19,'Acute inflammatory response'],[20,'Cellular Mediators of Inflammation'],[21,'Acute and Chronic Inflammation - Pathology'],[22,'Wound healing and tissue repair'],[23,'General principles of drug action'],[24,'Molecular Targets of Drugs'],[25,'Dose Response Relationships'],[26,'Routes of Administration and Distribution'],[27,'Drug Metabolism and Excretion'],[28,'Pharmacokinetics'],[29,'Individual Variation, Pharmacogenomics and Personalised Medicine']
 ].map(x=>({n:x[0],t:x[1],a:[]}))
};
const MOD_BY_CODE=Object.fromEntries(Object.values(MODULES).map(m=>[m.code,m]));
const cache=new WeakMap();let pdfjsP=null;
const norm=s=>String(s||'').toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g,' ').trim();
const words=s=>norm(s).split(/\s+/).filter(x=>x.length>1&&!['lecture','module','biology','clinical','anatomy','physiology','the','and','of','to','in','a','an','pdf'].includes(x));
const score=(q,t)=>{q=norm(q);t=norm(t);if(!q||!t)return 0;if(q===t)return 1;if(q.includes(t)&&t.length>7)return .99;if(t.includes(q)&&q.length>7)return .96;const A=words(q),B=words(t);let h=0;for(const x of A)if(B.includes(x))h++;if(!h)return 0;const p=h/Math.max(1,A.length),r=h/Math.max(1,B.length);return .9*(2*p*r/Math.max(.001,p+r))};
const clean=s=>String(s||'').replace(/\s+/g,' ').trim();
const skip=t=>/^(learning objectives?|learning outcomes?|references?|reading list|copyright|module (introduction|information)|thank you)$/i.test(clean(t));
const slug=s=>norm(s).replace(/\s+/g,'-').slice(0,70)||'lecture';
function parseJSON(t){t=String(t||'').replace(/^\`\`\`(?:json)?/i,'').replace(/\`\`\`$/,'').trim();const a=t.indexOf('{'),b=t.lastIndexOf('}');return JSON.parse(a>=0&&b>a?t.slice(a,b+1):t)}
async function pdfjs(){if(!pdfjsP)pdfjsP=import(PDFJS).then(m=>(m.GlobalWorkerOptions.workerSrc=WORKER,m));return pdfjsP}
async function extract(file,onProgress){
 if(cache.has(file))return cache.get(file);
 const task=(async()=>{const p=await pdfjs(),buf=await file.arrayBuffer(),doc=await p.getDocument({data:new Uint8Array(buf)}).promise,pages=[];
 for(let i=1;i<=doc.numPages;i++){const pg=await doc.getPage(i),tc=await pg.getTextContent(),lines=tc.items.map(x=>clean(x.str)).filter(Boolean);pages.push({n:i,text:clean(lines.join(' ')),lines});onProgress?.('Reading slide '+i+' / '+doc.numPages+'…')}return pages})();
 cache.set(file,task);return task;
}
function detectFromText(filename,pages=[]){
 const head=pages.slice(0,8).map(p=>p.text).join(' '),fileNorm=norm(filename.replace(/\.pdf$/i,''));
 const explicit=(filename+' '+head).match(/(?:NMHS|PATH|MDSA|ANAT)\d{5}/i)?.[0]?.toUpperCase()||'';
 let codes=explicit?[explicit]:Object.keys(CAL);
 const qFile=fileNorm.replace(norm(explicit),'').trim(),qHead=norm(head).replace(norm(explicit),'').trim();
 let best=null;
 for(const code of codes){for(const row of CAL[code]||[]){
   let sc=0,matched=row.t;
   for(const a of [row.t,...(row.a||[])]){const sf=score(qFile,a),sh=score(qHead,a)*.72,v=Math.max(sf,sh);if(v>sc){sc=v;matched=a}}
   if(explicit===code)sc=Math.min(1,sc+.04);
   if(!best||sc>best.score)best={code,row,score:sc,matched};
 }}
 if(best&&best.score>=.54){const m=MOD_BY_CODE[best.code];return {ok:true,module_id:m.id,module_code:m.code,module_name:m.name,title:best.row.t,lecture_number:best.row.n,calendar_date:best.row.d||null,confidence:Math.max(.72,Math.min(.995,best.score)),method:'calendar-local'}}
 if(explicit&&MOD_BY_CODE[explicit]){
   const m=MOD_BY_CODE[explicit],num=(filename.match(/(?:lecture|lec|l)\s*0*(\d{1,2})/i)||[])[1]||null;
   return {ok:true,module_id:m.id,module_code:m.code,module_name:m.name,title:clean(filename.replace(/\.pdf$/i,'').replace(/[_-]+/g,' ')),lecture_number:num?Number(num):null,confidence:.72,method:'module-code-local'}
 }
 return {ok:false,error:'Could not confidently match this lecture. Use Edit to choose the module/title.'};
}
async function localSession(system,onProgress){
 if(!('LanguageModel' in self))return null;
 const opts={expectedInputs:[{type:'text',languages:['en']}],expectedOutputs:[{type:'text',languages:['en']}]};
 const av=await LanguageModel.availability(opts).catch(()=> 'unavailable');if(av==='unavailable')return null;
 onProgress?.(av==='available'?'On-device AI ready.':'Preparing Chrome on-device AI…');
 return LanguageModel.create({...opts,initialPrompts:[{role:'system',content:system}],monitor(m){m.addEventListener('downloadprogress',e=>onProgress?.('One-time Chrome model download · '+Math.round((e.loaded||0)*100)+'%'))}});
}
function fallback(title,pages){
 const useful=pages.filter(p=>p.text.length>30&&!skip(p.lines[0]||'')),chapters=[];
 for(let i=0;i<useful.length;i+=4){const g=useful.slice(i,i+4),a=g[0]?.n||1,b=g.at(-1)?.n||a;
  chapters.push({title:(g[0]?.lines[0]||'Key concepts').slice(0,100),summary:'Slides '+a+'–'+b,slide_start:a,slide_end:b,intro:'',concepts:g.map(p=>({heading:(p.lines[0]||'Slide '+p.n).slice(0,110),explain:p.text.slice(0,620),key_points:p.lines.slice(1,8).map(x=>x.slice(0,170)),slide_refs:[p.n],fun_fact:'',clinical:''})),visuals:g.slice(0,3).map(p=>({slide:p.n,title:p.lines[0]||'Original slide',explain:'Use the original slide as the visual anchor for this explanation.',labels:[]})),questions:[]});
 }
 return {title,subtitle:'Local Study Atlas version · zero Netlify upload credits',description:'Built entirely on this device from the original lecture.',slide_count:pages.length,chapters,cheat_sheet:chapters.slice(0,10).map(c=>({heading:c.title,bullets:c.concepts.slice(0,3).map(x=>x.heading)}))};
}
async function buildWithLocalAI(meta,pages,onProgress){
 const sess=await localSession('You are Study Atlas local AI. Build concise but complete medical teaching notes from supplied lecture slides. Skip title, learning-outcome, admin, blank, duplicate and reference slides. Cover all useful teaching points, labels, arrows, mechanisms, tables and lecturer emphasis. Keep source slide numbers. Prefer visual anchors from the original slides. Add a memorable fact only when genuinely useful. Return strict JSON only.',onProgress);
 if(!sess)return fallback(meta.title,pages);
 const useful=pages.filter(p=>p.text.length>20&&!skip(p.lines[0]||'')),parts=[];
 for(let i=0;i<useful.length;i+=5){const g=useful.slice(i,i+5),a=g[0].n,b=g.at(-1).n;
  const prompt='Lecture: '+meta.title+'\nModule: '+meta.module_code+' '+meta.module_name+'\nOriginal slides:\n'+g.map(p=>'SLIDE '+p.n+': '+p.text.slice(0,2400)).join('\n\n')+'\nReturn ONLY JSON: {"chapters":[{"title":"","summary":"","slide_start":'+a+',"slide_end":'+b+',"intro":"","concepts":[{"heading":"","explain":"","key_points":[],"slide_refs":[],"fun_fact":"","clinical":""}],"visuals":[{"slide":'+a+',"title":"","explain":"","labels":[]}],"questions":[{"question":"","options":["","","",""],"answer_index":0,"explanation":""}]}],"cheat_sheet":[{"heading":"","bullets":[]}]}';
  onProgress?.('On-device AI teaching slides '+a+'–'+b+'…');let obj;try{obj=parseJSON(await sess.prompt(prompt))}catch{obj={chapters:fallback(meta.title,g).chapters,cheat_sheet:[]}}parts.push(obj);
 }
 try{sess.destroy?.()}catch{}
 const chapters=parts.flatMap(x=>x.chapters||[]);
 return {title:meta.title,subtitle:'Local Study Atlas version · zero Netlify upload credits',description:'Built entirely on this device from the original lecture.',slide_count:pages.length,chapters,cheat_sheet:parts.flatMap(x=>x.cheat_sheet||[]).slice(0,20)};
}
window.StudyAtlasLocalBuilder={
 async extractText(file,onProgress){return extract(file,onProgress)},
 async detect(file,pages){return detectFromText(file.name,pages||await extract(file))},
 async build({file,module,title,lectureNumber,calendarDate,onProgress}){
  if(!window.StudyAtlasLocalDB)throw new Error('Local lecture storage is not ready.');
  const pages=await extract(file,onProgress),det=detectFromText(file.name,pages);
  const resolved=det.ok&&det.module_id===module.id?det:null;
  const finalNumber=Number(resolved?.lecture_number||lectureNumber)||null,finalTitle=resolved?.title||title||file.name.replace(/\.pdf$/i,'');
  const data=await buildWithLocalAI({title:finalTitle,module_name:module.name,module_code:module.code},pages,onProgress);
  const id='local-'+module.id+'-'+(finalNumber?String(finalNumber).padStart(2,'0'):slug(finalTitle));
  const lecture={id,module_id:module.id,module_name:module.name,module_code:module.code,number:finalNumber?String(finalNumber).padStart(2,'0'):'—',calendar_date:resolved?.calendar_date||calendarDate||null,title:finalTitle,description:data.description||data.subtitle,slides:pages.length+' original slides',chapters:data.chapters.length+' local chapters',created:Date.now(),filename:file.name,pdf:file.slice(0,file.size,'application/pdf'),data,local:true};
  onProgress?.('Saving privately on this device…');await window.StudyAtlasLocalDB.put(lecture);
  return {ok:true,lecture};
 }
};
})();