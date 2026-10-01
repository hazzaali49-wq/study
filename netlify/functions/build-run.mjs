import {getStore} from '@netlify/blobs';
import {MODEL, callOpenAI, outputText, parseModelJSON, lecturePrompt, renderGenerated} from './_shared.mjs';
export default async (req) => {
  const body=await req.json().catch(()=>({})); const jobId=String(body.job_id||''); if(!jobId)return;
  const store=getStore({name:'study-atlas',consistency:'strong'});
  const key=`jobs/${jobId}/job.json`; let job=await store.get(key,{type:'json',consistency:'strong'}); if(!job)return;
  try{
    job={...job,status:'processing',stage:'AI is reading the original slides and building the fun teaching version…',started:Date.now()};await store.setJSON(key,job);
    const arr=await store.get(`jobs/${jobId}/original.pdf`,{type:'arrayBuffer',consistency:'strong'}); if(!arr)throw new Error('Original PDF was not found.');
    const b64=Buffer.from(new Uint8Array(arr)).toString('base64');
    const payload={model:MODEL,instructions:'Build a concise, source-faithful medical study guide from the PDF. Output only JSON.',input:[{role:'user',content:[{type:'input_file',filename:job.filename,file_data:b64},{type:'input_text',text:lecturePrompt({title:job.title,moduleName:job.module_name,moduleCode:job.module_code})}]}],max_output_tokens:12000};
    const data=await callOpenAI(payload,780000); const obj=parseModelJSON(outputText(data)); obj.title=obj.title||job.title;
    job={...job,stage:'Formatting chapters, slide links, questions and cheat sheet…'};await store.setJSON(key,job);
    const originalUrl=`/api/original?id=${encodeURIComponent(job.lecture_id)}`;
    const html=renderGenerated(obj,originalUrl,job.module_code,job.lecture_id);
    const pdfBytes=Uint8Array.from(new Uint8Array(arr));
    await store.set(`originals/${job.lecture_id}.pdf`,pdfBytes.buffer,{metadata:{filename:job.filename,title:obj.title}});
    await store.set(`lectures/${job.lecture_id}.html`,html,{metadata:{title:obj.title,module_id:job.module_id}});
    const manifest=(await store.get('manifest.json',{type:'json',consistency:'strong'}))||[];
    const sameModule=manifest.filter(x=>x.module_id===job.module_id).length;
    const meta={id:job.lecture_id,module_id:job.module_id,module_name:job.module_name,module_code:job.module_code,number:String(sameModule+1).padStart(2,'0'),title:obj.title,slides:`${Number(obj.slide_count||0)} original slides`,chapters:`${(obj.chapters||[]).length} AI chapters`,description:obj.description||obj.subtitle||'AI-generated Study Atlas lecture.',created:Date.now()};
    const next=manifest.filter(x=>x.id!==meta.id);next.push(meta);await store.setJSON('manifest.json',next);
    job={...job,status:'complete',stage:'Lecture ready.',lecture:meta,completed:Date.now()};await store.setJSON(key,job);
  }catch(e){job={...job,status:'error',stage:'Build failed.',error:e?.message||String(e),completed:Date.now()};await store.setJSON(key,job)}
};
export const config={path:'/api/ai/build-run',method:'POST',background:true};
