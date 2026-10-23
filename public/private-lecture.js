(function(root){
 'use strict';
 const MAGIC='ATLASENC1\n',KEY_PREFIX='atlas-private-lecture-key:';
 const from64=value=>{
  const text=String(value).replace(/-/g,'+').replace(/_/g,'/');
  const raw=atob(text);return Uint8Array.from(raw,c=>c.charCodeAt(0));
 };
 function keyValue(value,expectedId){
  let text=String(value||'').trim();
  if(text.includes('#'))text=new URLSearchParams(text.slice(text.indexOf('#')+1)).get('atlas-unlock')||'';
  if(text.startsWith('atlas-unlock='))text=new URLSearchParams(text).get('atlas-unlock')||'';
  if(text.includes('.')){const i=text.indexOf('.');if(text.slice(0,i)!==expectedId)throw Error('This access link belongs to a different set of lectures.');text=text.slice(i+1);}
  if(!/^[A-Za-z0-9_-]{43}$/.test(text)||from64(text).length!==32)throw Error('Open the private access link supplied with these lectures.');
  return text;
 }
 async function decrypt(input,keyText,options={}){
  const bytes=input instanceof Uint8Array?input:new Uint8Array(input),crypto=options.crypto||root.crypto;
  if(!crypto?.subtle)throw Error('Private lectures require a browser with secure encryption support. Open your usual HTTPS Study Atlas address.');
  if(bytes.length<39||new TextDecoder().decode(bytes.subarray(0,10))!==MAGIC)throw Error('This private lecture file is incomplete. Please reload.');
  const key=await crypto.subtle.importKey('raw',from64(keyText),{name:'AES-GCM'},false,['decrypt']);
  let clear;
  try{clear=await crypto.subtle.decrypt({name:'AES-GCM',iv:bytes.subarray(10,22)},key,bytes.subarray(22));}
  catch{throw Error('This key could not unlock the lecture. Open its private access link and try again.');}
  const bundle=JSON.parse(new TextDecoder().decode(clear));
  if(bundle.version!==1||!bundle.data||!Array.isArray(bundle.pages)||bundle.pages.length!==bundle.data.slide_count||bundle.data.slides?.length!==bundle.pages.length||!bundle.original?.base64)throw Error('The private lecture contents are incomplete.');
  if(bundle.pages.some((p,i)=>p.n!==i+1||!p.image_base64||!p.width||!p.height)||bundle.data.slides.some((s,i)=>s.n!==i+1))throw Error('The private lecture slide order is invalid.');
  return bundle;
 }
 function prepared(bundle,options={}){
  const URLApi=options.URL||root.URL,BlobClass=options.Blob||root.Blob,ImageClass=options.Image||root.Image,urls=[];
  const object=(bytes,type)=>{const url=URLApi.createObjectURL(new BlobClass([bytes],{type}));urls.push(url);return url;};
  const pdfBytes=from64(bundle.original.base64);
  if(new TextDecoder().decode(pdfBytes.subarray(0,4))!=='%PDF')throw Error('The original lecture PDF is incomplete.');
  const originalUrl=object(pdfBytes,'application/pdf');
  const pages=bundle.pages.map(({image_base64,...page})=>({...page,image:object(from64(image_base64),'image/webp')}));
  let disposed=false;
  const dispose=()=>{if(disposed)return;disposed=true;urls.forEach(url=>URLApi.revokeObjectURL(url));};
  const pdf={numPages:pages.length,atlasPrepared:true,destroy:dispose,async getPage(n){
   const source=pages[n-1];if(!source)throw Error('Slide number out of range.');
   return {pageNumber:n,atlasSource:source,cleanup(){},getViewport({scale=1}={}){return {width:source.width*scale,height:source.height*scale,scale};},render({canvasContext,viewport}){
    let image,timer,rejectTask,settled=false;
    const promise=new Promise((resolve,reject)=>{
     rejectTask=reject;image=new ImageClass();
     timer=setTimeout(()=>{if(!settled){settled=true;reject(Error('The original slide took too long to render.'));}},15000);
     image.onload=()=>{if(settled)return;settled=true;clearTimeout(timer);try{canvasContext.drawImage(image,0,0,viewport.width,viewport.height);resolve();}catch(e){reject(e);}};
     image.onerror=()=>{if(settled)return;settled=true;clearTimeout(timer);reject(Error('The original slide could not be rendered.'));};
     image.src=source.image;
    }).finally(()=>{clearTimeout(timer);if(image){image.onload=null;image.onerror=null;}});
    return {promise,cancel(){if(settled)return;settled=true;clearTimeout(timer);image.src='';rejectTask(Error('Slide rendering cancelled.'));}};
   }};
  }};
  return {pdf,originalUrl,dispose};
 }
 async function boot(){
  const specNode=document.getElementById('atlasPrivateSpec');if(!specNode)return;
  const spec=JSON.parse(specNode.textContent),status=document.getElementById('privateLectureProgress'),form=document.getElementById('privateLectureUnlock'),input=document.getElementById('privateLectureKey');
  const storageKey=KEY_PREFIX+spec.key_id;
  let downloaded=null,busy=false;
  const show=message=>{status.textContent=message;form.hidden=false;form.querySelector('button').disabled=false;};
  const unlock=async value=>{
   if(busy)return;busy=true;form.querySelector('button').disabled=true;
   let ready;
   try{
    const key=keyValue(value,spec.key_id);status.textContent='Opening your private lecture…';
    if(!downloaded){
     const r=await fetch(spec.bundle,{credentials:'same-origin'});
     if(!r.ok)throw Error('The private lecture could not be downloaded. Please reload after the website update finishes.');
     downloaded=await r.arrayBuffer();
    }
    const bundle=await decrypt(downloaded,key);
    if(bundle.id!==spec.id)throw Error('This file belongs to a different lecture.');
    ready=prepared(bundle);
    try{localStorage.setItem(storageKey,key);}catch{/* A private access link can be reused if browser storage is unavailable. */}
    input.value='';form.hidden=true;
    if(new URLSearchParams(location.search).get('original')==='1'){
     location.replace(ready.originalUrl);return;
    }
    const pdfAPI=root.StudyAtlasPDF,normalLoad=pdfAPI.load;
    pdfAPI.load=(source,options)=>source===ready.originalUrl?Promise.resolve(ready.pdf):normalLoad(source,options);
    status.textContent='Loading '+bundle.pages.length+' original slides and explanations…';
    await root.StudyAtlasReader.open({...bundle.metadata,pdfUrl:ready.originalUrl,data:bundle.data,legacy:false});
    if(!root.StudyAtlasReader.context())throw Error('The lecture reader could not start. Please reload.');
    document.getElementById('privateLectureGate').hidden=true;
   }catch(e){ready?.dispose();show(e.message||'The lecture could not be unlocked.');}
   finally{busy=false;form.querySelector('button').disabled=false;}
  };
  form.addEventListener('submit',event=>{event.preventDefault();unlock(input.value);});
  const fragment=new URLSearchParams(location.hash.slice(1)).get('atlas-unlock');
  if(fragment){
   // URL fragments are not sent to Netlify. Remove the key from the visible address after reading it.
   history.replaceState(null,'',location.pathname+location.search);
   await unlock(fragment);
  }else{
   let saved='';try{saved=localStorage.getItem(storageKey)||'';}catch{}
   if(saved)await unlock(saved);else show('This lecture is private. Open your private access link to continue.');
  }
 }
 const api={keyValue,decrypt,prepared,boot};
 if(typeof module==='object'&&module.exports)module.exports=api;
 else{
  root.StudyAtlasPrivateLectures=api;
  const start=()=>boot().catch(()=>{const status=document.getElementById('privateLectureProgress');if(status)status.textContent='The private lecture could not start. Please reload.';});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
 }
})(typeof window!=='undefined'?window:globalThis);
