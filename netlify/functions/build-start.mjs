import {getStore} from '@netlify/blobs';
import {json, MODEL, OPENAI_KEY, adminOK, slugify} from './_shared.mjs';
export default async (req) => {
  if(req.method!=='POST') return json({error:'Method not allowed'},405);
  if(!OPENAI_KEY) return json({error:'OPENAI_API_KEY is not configured in Netlify.'},503);
  try{
    const body=await req.json();
    if(!adminOK(body,req)) return json({error:'Incorrect Study Atlas admin key.'},401);
    let pdf=String(body.pdf_data||'');
    const uploadId=String(body.upload_id||'').replace(/[^a-zA-Z0-9_-]/g,'').slice(0,100);
    const chunkCount=Number(body.chunk_count||0);
    const store=getStore({name:'study-atlas',consistency:'strong'});
    if(!pdf && uploadId && Number.isInteger(chunkCount) && chunkCount>0 && chunkCount<=250){
      const chunks=await Promise.all(Array.from({length:chunkCount},async(_,i)=>{
        const key=`uploads/${uploadId}/part-${String(i).padStart(4,'0')}.b64`;
        const part=await store.get(key,{type:'text',consistency:'strong'});
        if(typeof part!=='string') throw new Error(`Upload part ${i+1} is missing. Please try the upload again.`);
        return part;
      }));
      pdf=chunks.join('');
    }
    if(!pdf) return json({error:'Missing PDF data.'},400);
    const bytes=Uint8Array.from(Buffer.from(pdf,'base64'));
    if(bytes.byteLength>50_000_000) return json({error:'This lecture PDF is over 50 MB. Please compress it before building.'},413);
    const id=slugify(body.title||body.filename||'lecture'), job=`job-${crypto.randomUUID()}`;
    await store.set(`jobs/${job}/original.pdf`,bytes.buffer,{metadata:{filename:String(body.filename||'lecture.pdf')}});
    await store.setJSON(`jobs/${job}/job.json`,{status:'queued',stage:'Original PDF saved. Waiting for AI builder…',job_id:job,lecture_id:id,filename:String(body.filename||'lecture.pdf'),title:String(body.title||'Lecture'),module_id:String(body.module_id||''),module_name:String(body.module_name||''),module_code:String(body.module_code||''),lecture_number:Number(body.lecture_number)||null,created:Date.now()});
    if(uploadId && chunkCount){
      Promise.allSettled(Array.from({length:chunkCount},(_,i)=>store.delete(`uploads/${uploadId}/part-${String(i).padStart(4,'0')}.b64`))).catch(()=>{});
    }
    return json({ok:true,job_id:job,lecture_id:id,model:MODEL},202);
  }catch(e){return json({error:e?.message||String(e)},500)}
};
export const config={path:'/api/ai/build-lecture',method:'POST'};
