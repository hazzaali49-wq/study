import {getStore} from '@netlify/blobs';
import {json, adminOK} from './_shared.mjs';

export default async (req)=>{
  if(req.method!=='POST') return json({error:'Method not allowed'},405);
  try{
    const body=await req.json();
    if(!adminOK(body,req)) return json({error:'Incorrect Study Atlas admin key.'},401);
    const uploadId=String(body.upload_id||'').replace(/[^a-zA-Z0-9_-]/g,'').slice(0,100);
    const index=Number(body.index), total=Number(body.total);
    const chunk=String(body.chunk||'');
    if(!uploadId || !Number.isInteger(index) || index<0 || !Number.isInteger(total) || total<1 || total>250) return json({error:'Invalid upload metadata.'},400);
    if(chunk.length<1 || chunk.length>750000) return json({error:'Upload chunk is too large.'},413);
    const store=getStore({name:'study-atlas',consistency:'strong'});
    await store.set(`uploads/${uploadId}/part-${String(index).padStart(4,'0')}.b64`,chunk,{metadata:{index,total}});
    return json({ok:true,index,total});
  }catch(e){ return json({error:e?.message||String(e)},500); }
};
export const config={path:'/api/ai/upload-part',method:'POST'};
