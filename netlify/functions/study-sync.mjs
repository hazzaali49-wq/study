import {getStore} from '@netlify/blobs';
import {createHash} from 'node:crypto';

const VERSION=/^\d{16}-[a-z0-9]{16}$/;
const hash=value=>createHash('sha256').update(value).digest('hex');
const reply=(value,status=200)=>new Response(JSON.stringify(value),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store','referrer-policy':'no-referrer'}});
const fail=(message,status=400)=>{throw Object.assign(new Error(message),{status});};
function record(value,lecture=false){
 if(!value||typeof value!=='object'||Array.isArray(value)||typeof value.id!=='string'||!value.id||value.id.length>800||!VERSION.test(value.syncVersion||''))fail('Invalid saved record.');
 if(!lecture&&!['note','pin'].includes(value.kind))fail('Invalid note or pin.');
 if(JSON.stringify(value).length>500000)fail('This saved record is too large.',413);
 for(const field of ['href','pdfUrl'])if(value[field]&&(!String(value[field]).startsWith('/')||String(value[field]).startsWith('//')))fail('Source links must belong to this website.');
 return value;
}
function assetReference(value){
 const result={};
 for(const field of ['snapshot','sketch']){
  const parts=value?.[field];if(parts===undefined)continue;
  if(!Array.isArray(parts)||parts.length>32||parts.some(x=>typeof x!=='string'||! /^[a-f0-9]{64}$/.test(x)))fail('Invalid saved image reference.');
  result[field]=parts;
 }return result;
}
async function latest(store,prefix,known){
 const {blobs}=await store.list({prefix});const found=new Map();
 for(const blob of blobs){
  const match=blob.key.slice(prefix.length).match(/^([a-f0-9]{64})\/(\d{16}-[a-z0-9]{16})\.json$/);
  if(!match)continue;const [,id,version]=match;
  if(!found.has(id)||found.get(id).version<version)found.set(id,{version,key:blob.key});
 }
 return [...found.entries()].filter(([id,x])=>x.version>(known.get(id)||'')).map(([,x])=>x.key);
}
async function pool(rows,fn){const out=[];for(let i=0;i<rows.length;i+=8)out.push(...await Promise.all(rows.slice(i,i+8).map(fn)));return out;}

// Each version is an immutable object. Devices never overwrite a shared manifest,
// so simultaneous/offline saves cannot erase unrelated notes or board pins.
export function createSyncHandler(makeStore=getStore){return async req=>{
 try{
  const url=new URL(req.url);
  if(req.method==='GET'&&!url.searchParams.has('asset'))return reply({available:true,protocol:1});
  const origin=req.headers.get('origin');if(origin&&origin!==url.origin)fail('Open sync on this Study Atlas website.',403);
  const token=(req.headers.get('authorization')||'').match(/^Bearer ([A-Za-z0-9_-]{43})$/)?.[1];
  if(!token)fail('Connect this device using your private sync link or code.',401);
  const store=makeStore({name:'study-atlas-device-sync-v1',consistency:'strong'}),base=hash(token)+'/';
  if(req.method==='GET'&&url.searchParams.has('asset')){
   const id=url.searchParams.get('asset');if(!/^[a-f0-9]{64}$/.test(id))fail('Invalid image reference.');
   const data=await store.get(base+'assets/'+id,{type:'text',consistency:'strong'});
   if(data===null)return reply({error:'Saved image is not available yet.'},404);
   return new Response(data,{headers:{'content-type':'text/plain; charset=utf-8','cache-control':'no-store'}});
  }
  if(req.method!=='POST')return reply({error:'Method not allowed.'},405);
  if(Number(req.headers.get('content-length')||0)>4400000)fail('Sync request is too large.',413);
  const raw=await req.text();if(Buffer.byteLength(raw)>4400000)fail('Sync request is too large.',413);
  let body;try{body=JSON.parse(raw);}catch{fail('Invalid sync request.');}
  if(body.action==='start'){
   await store.setJSON(base+'notebook.json',{created:Date.now(),protocol:1},{onlyIfNew:true});return reply({ok:true});
  }
  if(!await store.getMetadata(base+'notebook.json',{consistency:'strong'}))fail('Sync code not found. Enable sync on your computer first.',404);
  if(body.action==='check')return reply({ok:true});
  if(body.action==='putAsset'){
   if(typeof body.value!=='string'||!body.value.length||body.value.length>1000000||body.hash!==hash(body.value))fail('Invalid saved image chunk.');
   await store.set(base+'assets/'+body.hash,body.value,{onlyIfNew:true});return reply({ok:true});
  }
  if(body.action==='push'){
   if(!Array.isArray(body.items)||!Array.isArray(body.lectures)||body.items.length+body.lectures.length>40)fail('Sync batch is too large.');
   const entries=body.items.map(x=>({record:record(x.record),assetRef:assetReference(x.assetRef)}));
   const contexts=body.lectures.map(x=>record(x,true));
   await pool(entries,x=>store.setJSON(base+'records/'+hash(x.record.id)+'/'+x.record.syncVersion+'.json',x,{onlyIfNew:true}));
   await pool(contexts,x=>store.setJSON(base+'lectures/'+hash(x.id)+'/'+x.syncVersion+'.json',x,{onlyIfNew:true}));
   return reply({ok:true});
  }
  if(body.action==='pull'){
   function known(rows){
    if(!Array.isArray(rows)||rows.length>20000)fail('Invalid sync index.');
    return new Map(rows.map(x=>{if(typeof x.id!=='string'||x.id.length>800||!VERSION.test(x.syncVersion||''))fail('Invalid saved version.');return [hash(x.id),x.syncVersion];}));
   }
   const [notes,lectures]=await Promise.all([latest(store,base+'records/',known(body.items)),latest(store,base+'lectures/',known(body.lectures))]);
   const records=await pool(notes.slice(0,60),key=>store.get(key,{type:'json',consistency:'strong'}));
   const contexts=await pool(lectures.slice(0,60),key=>store.get(key,{type:'json',consistency:'strong'}));
   return reply({items:records.filter(Boolean),lectures:contexts.filter(Boolean),more:notes.length>60||lectures.length>60});
  }
  fail('Unknown sync action.');
 }catch(e){return reply({error:e.status?e.message:'Cloud sync is temporarily unavailable. Your saved work is still on this device.'},e.status||503);}
};}
export default createSyncHandler();
export const config={path:'/api/study-sync'};
