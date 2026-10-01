import {getStore} from '@netlify/blobs';
import {json, MODEL, OPENAI_KEY, adminOK, slugify} from './_shared.mjs';
export default async (req) => {
  if(req.method!=='POST') return json({error:'Method not allowed'},405);
  if(!OPENAI_KEY) return json({error:'OPENAI_API_KEY is not configured in Netlify.'},503);
  try{
    const body=await req.json();
    if(!adminOK(body,req)) return json({error:'Incorrect Study Atlas admin key.'},401);
    const pdf=String(body.pdf_data||''); if(!pdf) return json({error:'Missing PDF data.'},400);
    const bytes=Uint8Array.from(Buffer.from(pdf,'base64'));
    if(bytes.byteLength>4_100_000) return json({error:'PDF is too large for Netlify direct upload. Compress it below about 3.9 MB.'},413);
    const id=slugify(body.title||body.filename||'lecture'), job=`job-${crypto.randomUUID()}`;
    const store=getStore({name:'study-atlas',consistency:'strong'});
    await store.set(`jobs/${job}/original.pdf`,bytes.buffer,{metadata:{filename:String(body.filename||'lecture.pdf')}});
    await store.setJSON(`jobs/${job}/job.json`,{status:'queued',stage:'Original PDF saved. Waiting for AI builder…',job_id:job,lecture_id:id,filename:String(body.filename||'lecture.pdf'),title:String(body.title||'Lecture'),module_id:String(body.module_id||''),module_name:String(body.module_name||''),module_code:String(body.module_code||''),lecture_number:Number(body.lecture_number)||null,created:Date.now()});
    return json({ok:true,job_id:job,lecture_id:id,model:MODEL},202);
  }catch(e){return json({error:e?.message||String(e)},500)}
};
export const config={path:'/api/ai/build-lecture',method:'POST'};
