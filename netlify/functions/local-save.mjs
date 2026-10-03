import {getStore} from '@netlify/blobs';
import {json,adminOK,slugify,renderGenerated} from './_shared.mjs';
import {matchCalendarLecture,getModule,inferLectureNumber,inferModule} from './catalog.mjs';

export default async (req)=>{
  if(req.method!=='POST')return json({error:'Method not allowed'},405);
  try{
    const body=await req.json();
    if(!adminOK(body,req))return json({error:'Incorrect Study Atlas admin key.'},401);
    const store=getStore({name:'study-atlas',consistency:'strong'});
    let pdf=String(body.pdf_data||'');
    const uploadId=String(body.upload_id||'').replace(/[^a-zA-Z0-9_-]/g,'').slice(0,100);
    const chunkCount=Number(body.chunk_count||0);
    if(!pdf&&uploadId&&Number.isInteger(chunkCount)&&chunkCount>0&&chunkCount<=250){
      const chunks=await Promise.all(Array.from({length:chunkCount},async(_,i)=>{
        const key=`uploads/${uploadId}/part-${String(i).padStart(4,'0')}.b64`;
        const part=await store.get(key,{type:'text',consistency:'strong'});
        if(typeof part!=='string')throw new Error(`Upload part ${i+1} is missing.`);
        return part;
      }));
      pdf=chunks.join('');
    }
    if(!pdf)return json({error:'Missing PDF data.'},400);
    const bytes=Uint8Array.from(Buffer.from(pdf,'base64'));
    if(bytes.byteLength>50_000_000)return json({error:'This lecture PDF is over 50 MB.'},413);

    const data=body.data&&typeof body.data==='object'?body.data:null;
    if(!data||!Array.isArray(data.chapters)||!data.chapters.length)return json({error:'Missing locally generated lecture data.'},400);

    const filename=String(body.filename||'lecture.pdf');
    const requestedTitle=String(data.title||body.title||filename.replace(/\.pdf$/i,''));
    const calendar=body.metadata_confirmed===true?null:matchCalendarLecture([filename,requestedTitle]);
    const resolved=calendar?.confidence>=.72?getModule(calendar.module_code):(getModule(body.module_code)||getModule(body.module_id)||inferModule(requestedTitle+' '+filename));
    const moduleId=resolved?.id||String(body.module_id||''),moduleCode=resolved?.code||String(body.module_code||''),moduleName=resolved?.name||String(body.module_name||'');
    const manifest=(await store.get('manifest.json',{type:'json',consistency:'strong'}))||[];
    if(!getModule(moduleCode))return json({error:'Choose a module before saving this lecture.'},422);
    const number=calendar?.module_code===moduleCode&&calendar?.confidence>=.72?calendar.number:((body.metadata_confirmed===true?Number(body.lecture_number):(inferLectureNumber(moduleCode,requestedTitle,filename)||Number(body.lecture_number)))||null);
    const existing=manifest.find(x=>x.module_id===moduleId&&(number?Number(x.number)===number:x.filename===filename));
    const id=existing?.id||slugify(requestedTitle);
    data.title=calendar?.module_code===moduleCode?calendar.title:requestedTitle;
    const originalUrl=`/api/original?id=${encodeURIComponent(id)}`;
    const html=renderGenerated(data,originalUrl,moduleCode,id);

    await store.set(`originals/${id}.pdf`,bytes.buffer,{metadata:{filename,title:requestedTitle}});
    await store.set(`lectures/${id}.html`,html,{metadata:{title:requestedTitle,module_id:moduleId}});
    const meta={id,module_id:moduleId,module_name:moduleName,module_code:moduleCode,number:number?String(number).padStart(2,'0'):'—',filename,metadata_confirmed:body.metadata_confirmed===true,calendar_date:calendar?.calendar_date||null,title:data.title,slides:`${Number(data.slide_count)||0} original slides`,chapters:`${data.chapters.length} local AI chapters`,description:data.description||data.subtitle||'Locally generated Study Atlas lecture.',created:Date.now(),builder:'local'};
    const old=manifest.find(x=>x.id!==id&&x.module_id===moduleId&&number&&Number(x.number)===number);
    const next=manifest.filter(x=>x.id!==id&&!(x.module_id===moduleId&&number&&Number(x.number)===number));next.push(meta);
    await store.setJSON('manifest.json',next);
    if(old?.id)Promise.allSettled([store.delete(`lectures/${old.id}.html`),store.delete(`originals/${old.id}.pdf`)]).catch(()=>{});
    if(uploadId&&chunkCount)Promise.allSettled(Array.from({length:chunkCount},(_,i)=>store.delete(`uploads/${uploadId}/part-${String(i).padStart(4,'0')}.b64`))).catch(()=>{});
    return json({ok:true,lecture:meta},201);
  }catch(e){return json({error:e?.message||String(e)},500)}
};
export const config={path:'/api/local/save-lecture',method:'POST'};