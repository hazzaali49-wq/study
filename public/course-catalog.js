(function(root){
'use strict';
const MODULES = [
  {id:'nmhs10100',code:'NMHS10100',name:'Health across the Lifespan',keywords:['lifespan','health across the lifespan']},
  {id:'path30080',code:'PATH30080',name:'Disease Mechanisms & Pharmacology',keywords:['disease mechanisms','pharmacology','pathology','microbiology','immunology']},
  {id:'mdsa20030',code:'MDSA20030',name:'Endocrine Biology',keywords:['endocrine','pituitary','thyroid','adrenal','reproductive endocrinology']},
  {id:'mdsa20010',code:'MDSA20010',name:'GIT / Liver Biology',keywords:['git','gastrointestinal','liver','ingestion','mastication','abdominal','peritoneum','oesophagus','stomach','intestine']},
  {id:'anat20060',code:'ANAT20060',name:'Locomotor Biology',keywords:['locomotor','lower limb','hip','thigh','leg','foot','gait']},
  {id:'anat20040',code:'ANAT20040',name:'Neurosciences',keywords:['neuroscience','neuro','brain','cranial nerve','cerebellum','basal ganglia']}
];

const LECTURE_CATALOG = {
  MDSA20030:[
    [1,'Module Introduction / Principles of Endocrinology'],[2,'Clinical Anatomy of the Pituitary'],
    [3,'Hypothalamus and Pituitary'],[4,'Anterior Pituitary Physiology'],
    [5,'Clinical Anatomy of the Thyroid & Parathyroid Glands'],[6,'Growth Hormone / IGF-I Axis'],[7,'Thyroid Physiology'],
    [8,'Calcium Regulation'],[9,'Adrenal Physiology'],[10,'Endocrine Pancreas'],[11,'Diabetes Mellitus'],
    [12,'Development of the Gonads'],[13,'Anatomy of Testis and Associated Structures'],
    [14,'Anatomy of Ovary and Associated Structures'],[15,'Male Reproductive Endocrinology'],
    [16,'Female Reproductive Physiology / Endocrinology'],[17,'Sexual Differentiation, Puberty, Pregnancy and Lactation']
  ],
  MDSA20010:[
    [1,'Anatomy of Ingestion 1: Muscles of mastication, oral cavity'],[2,'Anatomy of Ingestion 2: Palate, salivary glands and pharynx'],
    [3,'Salivary glands, mastication and swallowing'],[4,'Abdominal wall and hernias'],[5,'Peritoneum & Peritoneal Cavity'],
    [6,'Principles of Perfusion, Drainage and Innervation in the Abdominal Viscera'],[7,'Anatomy of the oesophagus and stomach'],
    [8,'Anatomy of the liver and biliary tree'],[9,'Secretions of stomach; gastric motility'],[10,'Anatomy of the pancreas and spleen'],
    [11,'Liver physiology; biliary secretions; bile salt synthesis; bilirubin; jaundice'],[12,'Anatomy of the small intestine'],
    [13,'Exocrine pancreas; histology of the spleen'],[14,'Small intestinal secretions and motility'],
    [15,'Anatomy of the appendix, caecum and colon'],[16,'Anatomy of the rectum, anus and ischioanal fossa'],
    [17,'Digestion and Absorption'],[18,'Embryology of the GI Tract'],[19,'Colonic motility and defecation'],
    [20,'Immunological function of the GIT'],[21,'Integration of Metabolism'],
    [22,'Vitamins and minerals; alcohol metabolism and vitamin deficiency'],[23,'Imaging of Abdomen with GIT/Liver Focus']
  ],
  ANAT20060:[
    [1,'Introduction to Module; Fascia of the lower limb'],[2,'Osteology of the os coxa and femur'],
    [3,'Gluteal region including neurovascular structures and relationships'],[4,'Posterior compartment of the thigh & hip joint'],
    [5,'Anterior compartment of the thigh'],[6,'Medial compartment of the thigh & neurovascular structures'],
    [7,'Lumbar Plexus'],[8,'Sacral Plexus'],[9,'Osteology of the leg'],[10,'Knee Joint'],
    [11,'Anterior & lateral compartments of the leg'],[12,'Posterior compartment of the leg; tibiofibular and ankle joints'],
    [13,'Foot: intrinsic muscles & neurovascular structures'],[14,'Foot: joints and arches'],[15,'Bone fracture and repair'],
    [16,'Arterial supply and venous and lymphatic drainage of lower limb'],[17,'Limb Development'],[18,'Posture & gait'],
    [19,'Clinical examination of lower limb'],[20,'Translating theory to practice for the lower limb']
  ],
  ANAT20040:[
    [1,'Module introduction'],[2,'Central & peripheral nervous systems, anatomy of the cranium'],[3,'Development of the nervous system'],
    [4,'The synapse and neurotransmitters'],[5,'Autonomic nervous system'],[6,'Structure and function of the brainstem; introduction to cranial nerves'],
    [7,'Central somatosensory pathways and thalamus'],[8,'Eye I: anatomy of eye, ciliary apparatus, lens, refraction and accommodation'],
    [9,'Eye II: the orbit and its contents, central control of eye movement, reflexes'],[10,'Eye III: the photosensitive retina and the central visual pathways'],
    [11,'Cranial nerve V - the trigeminal nerve'],[12,'Cranial nerve VII - the facial nerve, muscles of facial expression'],
    [13,'The auditory system'],[14,'The vestibular system and the control of balance and eye movement'],[15,'Cranial nerves IX-XII'],
    [16,'Control of voluntary movement, upper & lower motor neurone lesions'],[17,'Proprioception and the regulation of muscle tone and posture'],
    [18,'Basal ganglia: structure, role in motor control and diseases'],[19,'Cerebellum I: structure, neurophysiology and afferents'],
    [20,'Cerebellum II: efferents, role in motor control and diseases'],[21,'Cortical localisation of function, speech and the aphasias'],
    [22,'EEG, sleep, reticular activating system, brain electrical rhythms'],[23,'The meninges, venous sinuses and cerebrospinal fluid'],
    [24,'Blood supply of the central nervous system'],[25,'The measurement and regulation of cerebral arterial blood flow'],
    [26,'Brain plasticity, learning and memory'],[27,'Olfactory and limbic systems. Neural basis of behaviour and emotion'],[28,'Pain and nociception']
  ],
  PATH30080:[
    [1,'Structure and Function of bacteria'],[2,'Genetic variation in bacteria'],[3,'Microbial growth and diagnosis of infection'],
    [4,'Pathological consequences of infection'],[5,'Source, route and spread of infection'],[6,'Introduction to viruses'],
    [7,'Pathology Terminology: From Organ to Cell'],[8,'Diagnostic virology'],[9,'Cellular Adaptation / Maladaptation'],
    [10,'Cellular Injury and Cellular Death'],[11,'Immunology and Barriers'],[12,'Introduction to immunity'],[13,'Innate Immunity'],
    [14,'Adaptive Immunity'],[15,'Immune Memory'],[16,'Immune Tolerance'],[17,'Hypersensitivity & Autoimmunity'],[18,'Immunodeficiency'],
    [19,'Acute inflammatory response'],[20,'Cellular Mediators of Inflammation'],[21,'Acute and Chronic Inflammation - Pathology'],
    [22,'Wound healing and tissue repair'],[23,'General principles of drug action'],[24,'Molecular Targets of Drugs'],
    [25,'Dose Response Relationships'],[26,'Routes of Administration and Distribution'],[27,'Drug Metabolism and Excretion'],
    [28,'Pharmacokinetics'],[29,'Individual Variation, Pharmacogenomics and Personalised Medicine']
  ]
};


/*
  Official course-calendar hints.
  Lecture numbers follow the LMS/library numbering; scheduled dates come from the
  module timetable where available. Aliases let the detector match the wording
  actually used on lecture PDFs, even when it differs from the library card title.
*/
const COURSE_CALENDAR = {
  MDSA20030:[
    {n:1,title:'Module Introduction / Principles of Endocrinology',date:'2026-09-09',aliases:['module introduction','principles of endocrinology']},
    {n:2,title:'Clinical Anatomy of the Pituitary',date:'2026-09-11',aliases:['hypothalamus and pituitary anatomy','clinical anatomy of the pituitary gland and hypothalamus','clinical anatomy of the pituitary']},
    {n:3,title:'Hypothalamus and Pituitary',date:'2026-09-16',aliases:['hypothalamus and posterior pituitary physiology','posterior pituitary physiology']},
    {n:4,title:'Anterior Pituitary Physiology',date:'2026-09-18',aliases:['anterior pituitary physiology','anterior pituitary']},
    {n:6,title:'Growth Hormone / IGF-I Axis',date:'2026-09-23',aliases:['growth hormone igf i axis','growth hormone igf-1 axis','gh igf i axis','gh igf-1 axis']},
    {n:5,title:'Clinical Anatomy of the Thyroid & Parathyroid Glands',date:'2026-09-25',aliases:['thyroid and parathyroid anatomy','clinical anatomy of the thyroid and parathyroid glands']},
    {n:7,title:'Thyroid Physiology',date:'2026-09-30',aliases:['thyroid physiology']},
    {n:8,title:'Calcium Regulation',date:'2026-10-02',aliases:['calcium regulation','calcium homeostasis']}
  ]
};


/* Shared by the browser and Netlify; module evidence never chooses a lecture. */
const STOP=new Set(['lecture','lec','module','biology','the','and','of','to','in','a','an','pdf']);
const norm=s=>String(s||'').toLowerCase().normalize('NFKD').replace(/\bigf[\s-]*(?:i|1)\b/g,'igf').replace(/\bgh\b/g,'growth hormone').replace(/[^a-z0-9]+/g,' ').trim();
const moduleCodes=s=>[...new Set((String(s||'').match(/\b(?:NMHS|PATH|MDSA|ANAT)\d{5}\b/gi)||[]).map(x=>x.toUpperCase()))];
const cleanTitle=s=>norm(String(s||'').replace(/\b(?:NMHS|PATH|MDSA|ANAT)\d{5}\b/gi,'').replace(/\.pdf\b/gi,'').replace(/\b(?:lecture|lec|l)\s*0*\d{1,2}\b/gi,''));
const tokens=s=>new Set(cleanTitle(s).split(/\s+/).filter(x=>x.length>1&&!STOP.has(x)));
function scoreTitle(query,title){
 const q=cleanTitle(query),t=cleanTitle(title);if(!q||!t)return 0;
 if(q===t)return 1;
 if((' '+q+' ').includes(' '+t+' ')&&t.length>=8)return .97;
 const a=tokens(q),b=tokens(t);if(!a.size||!b.size)return 0;
 let hit=0;for(const x of a)if(b.has(x))hit++;
 const precision=hit/a.size,recall=hit/b.size;
 return .9*(2*precision*recall/Math.max(.001,precision+recall));
}
function matchCalendarLecture(text='',moduleHint=''){
 // A filename, title and first-slide text can be scored separately, avoiding dilution by body text.
 const sources=Array.isArray(text)?text.map(String):[String(text)];
 const codes=moduleCodes(sources.join(' '));
 if(codes.length>1)return null;
 const hint=getModule(moduleHint)?.code||'';
 const moduleCode=codes[0]||hint;
 const candidates=[];
 for(const [code,rows] of Object.entries(LECTURE_CATALOG)){
  if(moduleCode&&code!==moduleCode)continue;
  for(const [n,title] of rows){
   const cal=(COURSE_CALENDAR[code]||[]).find(c=>c.n===n);
   let score=0,matched=title;
   for(const alias of [title,...(cal?.aliases||[])])for(const [sourceIndex,source] of sources.entries()){
    const weight=Array.isArray(text)?([1,.86,.78,.72][sourceIndex]||.7):1;
    const sc=scoreTitle(source,alias)*weight;if(sc>score){score=sc;matched=alias;}
   }
   candidates.push({module_code:code,number:n,title,calendar_date:cal?.date||null,matched,score});
  }
 }
 candidates.sort((a,b)=>b.score-a.score);
 const [best,second]=candidates,margin=(best?.score||0)-(second?.score||0);
 // Even exact but ambiguous matches must be checked by the user.
 if(!best||best.score<.62||margin<.09)return null;
 return {...best,confidence:Math.min(.995,best.score+(moduleCode ? .03 : 0)),method:'calendar'};
}
function getModule(codeOrId=''){const q=norm(codeOrId);return MODULES.find(m=>norm(m.code)===q||norm(m.id)===q)||null;}
function inferModule(text=''){
 const codes=moduleCodes(text);if(codes.length===1)return getModule(codes[0]);if(codes.length>1)return null;
 const cal=matchCalendarLecture(text);if(cal?.confidence>=.78)return getModule(cal.module_code);
 const q=norm(text),scores=MODULES.map(m=>({m,s:(m.keywords||[]).reduce((s,k)=>s+((' '+q+' ').includes(' '+norm(k)+' ')?norm(k).split(' ').length+1:0),0)})).sort((a,b)=>b.s-a.s);
 return scores[0]?.s&&scores[0].s>(scores[1]?.s||0)?scores[0].m:null;
}
function inferLectureNumber(moduleCode='',title='',filename=''){
 const cal=matchCalendarLecture([filename,title],moduleCode);if(cal?.module_code===String(moduleCode).toUpperCase())return cal.number;
 const explicit=(String(filename)+' '+String(title)).match(/(?:^|[^a-z0-9])(?:lecture|lec|l)\s*0*(\d{1,2})(?:[^a-z0-9]|$)/i);
 return explicit?Number(explicit[1]):null;
}
function compactCatalog(){return Object.fromEntries(Object.entries(LECTURE_CATALOG).map(([code,rows])=>[code,rows.map(([n,t])=>({n,t}))]));}
function compactCalendar(){return Object.fromEntries(Object.entries(LECTURE_CATALOG).map(([code,rows])=>[code,rows.map(([n,t])=>{const c=(COURSE_CALENDAR[code]||[]).find(x=>x.n===n);return {n,t,date:c?.date||null,aliases:c?.aliases||[]};})]));}
const api={MODULES,LECTURE_CATALOG,COURSE_CALENDAR,matchCalendarLecture,getModule,inferModule,inferLectureNumber,compactCatalog,compactCalendar};
if(typeof module==='object'&&module.exports)module.exports=api;else root.StudyAtlasCatalog=api;
})(typeof window!=='undefined'?window:globalThis);
