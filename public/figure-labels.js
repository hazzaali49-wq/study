(()=>{
'use strict';
let worker,loading,queue=Promise.resolve(),idle,generation=0;
function release(){generation++;worker?.terminate();worker=null;loading=null;}
const VERSION='6.0.1',CDN='https://cdn.jsdelivr.net/npm/';
async function engine(){
 if(!loading){const start=generation;loading=(async()=>{
  if(!window.Tesseract)await new Promise((resolve,reject)=>{const s=document.createElement('script');s.src=CDN+'tesseract.js@'+VERSION+'/dist/tesseract.min.js';s.onload=resolve;s.onerror=reject;document.head.appendChild(s);});
  const w=await window.Tesseract.createWorker('eng',1,{workerPath:CDN+'tesseract.js@'+VERSION+'/dist/worker.min.js',corePath:CDN+'tesseract.js-core@6.0.0',langPath:'https://tessdata.projectnaptha.com/4.0.0'});
  if(start!==generation){await w.terminate();throw new Error('Image reader was cancelled.');}
  worker=w;await w.setParameters({tessedit_pageseg_mode:'11'});return w;
 })().catch(e=>{if(start===generation)release();throw e;});}return loading;
}
async function read(canvas,key,labels,stillNeeded=()=>true){
 const cacheKey='atlasFigureLabels.v1:'+key;
 try{const cached=JSON.parse(localStorage.getItem(cacheKey)||'null');if(cached)return cached;}catch{}
 const job=async()=>{
  if(!stillNeeded())return null;clearTimeout(idle);
  let timeout;try{
   const work=(async()=>{const w=await engine();if(!stillNeeded())return null;
    const {data}=await w.recognize(canvas,{}, {text:true,tsv:true});
    const boxes=window.StudyAtlasVisuals.ocrBoxes(data.tsv,canvas.width,canvas.height);
    const result={boxes:boxes.filter(b=>b.text.length<=40).slice(0,180),text:data.text||''};
    try{localStorage.setItem(cacheKey,JSON.stringify({...result,text:result.text.slice(0,5000)}));}catch{}return result;
   })();
   return await Promise.race([work,new Promise((_,reject)=>{timeout=setTimeout(()=>{release();reject(new Error('Image labels took too long to read. Try again.'));},45000);})]);
  }finally{clearTimeout(timeout);idle=setTimeout(release,30000);}
 };const result=queue.then(job,job);queue=result.catch(()=>{});return result;
}
window.StudyAtlasFigureLabels={read};
addEventListener('pagehide',()=>{clearTimeout(idle);release();},{once:true});
})();
