/* Private, local-first notebook sync. No AI calls; no work is read on pointermove. */
(()=>{
'use strict';
try{if(window.parent!==window&&window.parent.StudyAtlasCloudSync){window.StudyAtlasCloudSync=window.parent.StudyAtlasCloudSync;return;}}catch{}
if(window.StudyAtlasCloudSync)return;
const Store=window.StudyAtlasStudyStore,KEY='atlas.device-sync.v1',SIGNAL='atlasStudyNotebook.changed',TOKEN=/^[A-Za-z0-9_-]{43}$/;
let cfg=readConfig(),timer=0,poll=0,busy=null,again=false,dialog=null,lastFocus=null,message='',lastError=false,session=0;
const uploaded=new Map(),uploadedLectures=new Map(),chunks=new Set();
function readConfig(){try{const x=JSON.parse(localStorage.getItem(KEY)||'null');return TOKEN.test(x?.token||'')?x:null;}catch{return null;}}
function storeConfig(value){if(value)localStorage.setItem(KEY,JSON.stringify(value));else localStorage.removeItem(KEY);cfg=value;}
function status(text,error=false){message=text;lastError=error;renderStatus();}
function renderStatus(){
 document.querySelectorAll('[data-atlas-sync-status]').forEach(x=>{x.textContent=message||(cfg?'Sync is on':'Not connected');x.dataset.error=String(lastError);});
 document.querySelectorAll('[data-atlas-sync-entry]').forEach(b=>{b.title=cfg?(message||'Notes and boards sync between your connected devices'):'Connect your phone to your saved notes and board pins';b.dataset.connected=String(!!cfg);});
 const info=document.querySelector('#atlasNotebook .atlas-notebook-head p');if(info)info.textContent=cfg?'Full slides and your notes · device sync is on':'Full slides and your notes · saved on this device';
}
async function api(body,token=cfg?.token){
 const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),25000);
 try{
  const response=await fetch('/api/study-sync',{method:'POST',credentials:'same-origin',cache:'no-store',headers:{'content-type':'application/json',authorization:'Bearer '+token},body:JSON.stringify(body),signal:controller.signal});
  const data=await response.json().catch(()=>({}));
  if(!response.ok)throw new Error(data.error||'Device sync could not connect. Your work is saved on this device.');
  return data;
 }catch(e){if(e.name==='AbortError')throw new Error('Sync timed out. Your saved work is safe here; retry when connected.');throw e;}
 finally{clearTimeout(timeout);}
}
async function digest(value){
 if(!window.crypto?.subtle)throw new Error('Open the HTTPS Study Atlas address to sync this device.');
 const bytes=await window.crypto.subtle.digest('SHA-256',new TextEncoder().encode(value));
 return [...new Uint8Array(bytes)].map(x=>x.toString(16).padStart(2,'0')).join('');
}
async function uploadAsset(asset,token,epoch){
 const reference={};
 for(const name of ['snapshot','sketch']){
  let value=asset?.[name];if(typeof value!=='string'||!value)continue;
  // Same-site legacy image URLs remain portable between the site's deploy URLs.
  if(/^https?:/i.test(value)){try{const u=new URL(value);if(u.origin===location.origin)value=u.pathname+u.search;}catch{}}
  if(value.startsWith('blob:'))throw new Error('Open this saved slide and update its snapshot before syncing it.');
  if(value.length>32000000)throw new Error('A saved image is too large to sync. Keep its local copy and update the slide snapshot.');
  reference[name]=[];
  for(let start=0;start<value.length;start+=1000000){
   if(epoch!==session)throw new Error('Sync connection changed.');
   const part=value.slice(start,start+1000000),id=await digest(part);reference[name].push(id);
   if(!chunks.has(id)){await api({action:'putAsset',hash:id,value:part},token);chunks.add(id);}
  }
 }return reference;
}
async function downloadAsset(reference,token){
 const asset={};
 for(const name of ['snapshot','sketch'])if(reference?.[name]?.length){
  let value='';
  for(const id of reference[name]){
   const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),25000);
   try{const r=await fetch('/api/study-sync?asset='+encodeURIComponent(id),{credentials:'same-origin',cache:'no-store',headers:{authorization:'Bearer '+token},signal:controller.signal});if(!r.ok)throw new Error('A saved image could not be downloaded yet. Sync will retry.');value+=await r.text();}finally{clearTimeout(timeout);}
  }
  if(!/^(data:image\/(png|jpeg|webp);base64,|\/[^/]|https?:\/\/)/i.test(value))throw new Error('A synced image has an unsupported format.');
  asset[name]=value;
 }return asset;
}
function portableRecord(row){
 const copy={...row};for(const key of ['href','pdfUrl'])if(copy[key]){if(String(copy[key]).startsWith('blob:')){copy[key]='';continue;}try{const u=new URL(copy[key],location.origin);if(u.origin===location.origin)copy[key]=u.pathname+u.search+u.hash;}catch{}}return copy;
}
async function syncRound(){
 if(!cfg)return;
 const token=cfg.token,epoch=session;
 await Store.ready();await Store.reload();
 let local=await Store.syncSnapshot();
 for(const row of local.items){
  if(epoch!==session)return;
  if(uploaded.get(row.id)===row.syncVersion)continue;
  const assetRef=row.deleted?{}:await uploadAsset(await Store.assets(row.id),token,epoch);
  await api({action:'push',items:[{record:portableRecord(row),assetRef}],lectures:[]},token);uploaded.set(row.id,row.syncVersion);
 }
 const contexts=local.lectures.filter(x=>uploadedLectures.get(x.id)!==x.syncVersion);
 for(let n=0;n<contexts.length;n+=30){
  const batch=contexts.slice(n,n+30);await api({action:'push',items:[],lectures:batch.map(portableRecord)},token);
  batch.forEach(x=>uploadedLectures.set(x.id,x.syncVersion));
 }
 for(let page=0;page<400;page++){
  if(epoch!==session)return;
  local=await Store.syncSnapshot();
  const index=rows=>rows.map(({id,syncVersion})=>({id,syncVersion}));
  const incoming=await api({action:'pull',items:index(local.items),lectures:index(local.lectures)},token);
  Store.observeVersions([...(incoming.items||[]).map(x=>x.record),...(incoming.lectures||[])]);
  const items=[];
  // Bounded downloads keep full slide+explanation images usable on phones.
  for(let start=0;start<(incoming.items||[]).length;start+=2){
   const batch=await Promise.all(incoming.items.slice(start,start+2).map(async x=>({record:x.record,asset:x.record.deleted?undefined:await downloadAsset(x.assetRef,token)})));items.push(...batch);
  }
  if(epoch!==session)return;
  await Store.mergeRemote({items,lectures:incoming.lectures||[]});
  items.forEach(x=>uploaded.set(x.record.id,x.record.syncVersion));
  (incoming.lectures||[]).forEach(x=>uploadedLectures.set(x.id,x.syncVersion));
  if(!incoming.more)break;
 }
 if(epoch===session&&cfg?.token===token){storeConfig({...cfg,lastSync:Date.now()});status('Up to date · '+new Date(cfg.lastSync).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'}));}
}
function sync(){
 if(!cfg)return Promise.resolve();
 if(busy){again=true;return busy;}
 if(navigator.onLine===false){status('Offline · changes will sync when you reconnect');return Promise.resolve();}
 status('Syncing notes and boards…');
 busy=syncRound().catch(e=>{status(e.message||'Sync will retry. Your saved work remains on this device.',true);}).finally(()=>{
  busy=null;if(again){again=false;schedule(1800);}startPoll();
 });return busy;
}
function schedule(delay=1800){if(!cfg)return;clearTimeout(timer);timer=setTimeout(()=>{timer=0;sync();},delay);}
function startPoll(){clearTimeout(poll);if(cfg)poll=setTimeout(()=>{if(!document.hidden)sync();else startPoll();},60000);}
function makeToken(){
 if(!window.crypto?.getRandomValues)throw new Error('Use a current browser with a secure HTTPS connection.');
 const bytes=window.crypto.getRandomValues(new Uint8Array(32));
 return btoa(String.fromCharCode(...bytes)).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
}
function parseCode(value){
 value=String(value||'').trim();
 if(TOKEN.test(value))return value;
 try{const u=new URL(value);const key=new URLSearchParams(u.hash.slice(1)).get('atlas-sync');if(TOKEN.test(key||''))return key;}catch{}
 throw new Error('Paste the complete sync code or phone link from your computer.');
}
async function connect(value,create=false){
 const token=parseCode(value);status(create?'Preparing your notebook…':'Connecting this device…');
 await api({action:create?'start':'check'},token);
 session++;uploaded.clear();uploadedLectures.clear();chunks.clear();
 storeConfig({token,connected:Date.now()});refreshDialog();await sync();
}
async function enable(){return connect(makeToken(),true);}
function disconnect(){session++;cfg=null;storeConfig(null);clearTimeout(timer);clearTimeout(poll);uploaded.clear();uploadedLectures.clear();chunks.clear();status('Device disconnected · your saved notes are still here');refreshDialog();}
function phoneLink(){return location.origin+'/#atlas-sync='+cfg.token;}
async function copy(value,input){
 try{await navigator.clipboard.writeText(value);status('Copied. Open the private phone link on your other device.');}
 catch{input.value=value;input.type='text';input.hidden=false;input.focus();input.select();status('Select and copy the link shown below.');}
}
function createDialog(){
 if(dialog)return;
 const css=document.createElement('link');css.rel='stylesheet';css.href='/study-sync.css?v=1';document.head.appendChild(css);
 dialog=document.createElement('div');dialog.id='atlasDeviceSync';dialog.hidden=true;
 dialog.innerHTML='<div class="atlas-sync-shade" data-sync-close></div><section class="atlas-sync-panel" role="dialog" aria-modal="true" aria-labelledby="atlasSyncTitle"><header><div><small>YOUR STUDY ATLAS</small><h2 id="atlasSyncTitle">Sync devices</h2></div><button type="button" data-sync-close aria-label="Close device sync">×</button></header><p>See your notes, saved slide images, drawings and board pins on your phone and computer.</p><p class="atlas-sync-status" data-atlas-sync-status role="status" aria-live="polite"></p><div data-sync-setup><h3>Start on the computer with your notes</h3><p>Enable sync, then open its private phone link on your phone. Existing saved notes and pins upload automatically.</p><button class="atlas-sync-primary" data-sync-enable>Enable sync on this device</button><hr><h3>Connect another device</h3><label>Paste the private sync code or phone link<input data-sync-code type="password" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="Paste code or phone link"></label><button data-sync-connect>Connect this device</button></div><div data-sync-connected hidden><h3>Your devices share this notebook</h3><p>Open the phone link on your phone to connect it once. Further changes sync automatically when you are online.</p><div class="atlas-sync-actions"><button class="atlas-sync-primary" data-sync-copy>Copy phone link</button><button data-sync-now>Sync now</button></div><label class="atlas-sync-secret">Private phone link<input data-sync-link type="password" readonly autocomplete="off" spellcheck="false"></label><div class="atlas-sync-actions"><button data-sync-reveal>Show link</button><button data-sync-disconnect>Disconnect this device</button></div><p class="atlas-sync-help">Keep this link private: it gives access to this notebook. Save it so you can reconnect later.</p></div><p class="atlas-sync-help">Notes are saved on the device first. Sync runs in the background and retries after connection problems.</p></section>';
 document.body.appendChild(dialog);dialog.querySelectorAll('[data-sync-close]').forEach(b=>b.onclick=close);
 const action=(selector,fn)=>dialog.querySelector(selector).onclick=async e=>{const b=e.currentTarget;b.disabled=true;try{await fn();}catch(error){status(error.message,true);}finally{b.disabled=false;}};
 action('[data-sync-enable]',enable);action('[data-sync-connect]',()=>connect(dialog.querySelector('[data-sync-code]').value));
 action('[data-sync-copy]',()=>copy(phoneLink(),dialog.querySelector('[data-sync-link]')));
 action('[data-sync-now]',sync);action('[data-sync-disconnect]',disconnect);
 dialog.querySelector('[data-sync-reveal]').onclick=e=>{const input=dialog.querySelector('[data-sync-link]');input.type=input.type==='password'?'text':'password';e.currentTarget.textContent=input.type==='password'?'Show link':'Hide link';};
 dialog.querySelector('[data-sync-code]').addEventListener('keydown',e=>{if(e.key==='Enter')dialog.querySelector('[data-sync-connect]').click();});
 dialog.addEventListener('keydown',e=>{
  if(e.key==='Escape'){e.stopPropagation();close();}
  if(e.key==='Tab'){const nodes=[...dialog.querySelectorAll('button,input')].filter(x=>!x.disabled&&!x.closest('[hidden]')),first=nodes[0],last=nodes.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus();}}
 });
}
function refreshDialog(){
 if(!dialog)return;
 dialog.querySelector('[data-sync-setup]').hidden=!!cfg;dialog.querySelector('[data-sync-connected]').hidden=!cfg;
 if(cfg)dialog.querySelector('[data-sync-link]').value=phoneLink();renderStatus();
}
function open(){createDialog();lastFocus=document.activeElement;refreshDialog();dialog.hidden=false;dialog.querySelector('[aria-label="Close device sync"]').focus();}
function close(){if(dialog)dialog.hidden=true;lastFocus?.focus?.();}
function addEntry(target){
 if(!target||target.querySelector('[data-atlas-sync-entry]'))return;
 const b=document.createElement('button');b.type='button';b.className='atlas-sync-entry';b.dataset.atlasSyncEntry='true';b.textContent='Sync devices';b.onclick=open;target.appendChild(b);
}
function mount(){
 const header=document.querySelector('#rootPage .head,.head');addEntry(header);
 addEntry(document.querySelector('#atlasNotebook .atlas-notebook-head > div'));
 addEntry(document.querySelector('#atlasGenBoard .atlas-panel-head'));
 if(!document.querySelector('link[href*="study-sync.css"]')){const l=document.createElement('link');l.rel='stylesheet';l.href='/study-sync.css?v=1';document.head.appendChild(l);}
 renderStatus();
}
window.StudyAtlasCloudSync={open,close,enable,connect,sync,disconnect,isConnected:()=>!!cfg};
window.addEventListener('atlas:notebook-sync-needed',()=>schedule());
window.addEventListener('online',()=>schedule(50));
window.addEventListener('storage',e=>{
 if(e.key===KEY){const fresh=readConfig();if(fresh?.token!==cfg?.token){session++;cfg=fresh;uploaded.clear();uploadedLectures.clear();chunks.clear();refreshDialog();schedule(50);}}
 if(e.key===SIGNAL)schedule(1500);
});
document.addEventListener('visibilitychange',()=>{if(!document.hidden)schedule(50);});
function boot(){
 mount();let mountTimer=0;
 new MutationObserver(ms=>{if(ms.some(m=>[...m.addedNodes].some(n=>n.nodeType===1&&(n.matches?.('#atlasNotebook,#atlasGenBoard')||n.querySelector?.('#atlasNotebook,#atlasGenBoard'))))){clearTimeout(mountTimer);mountTimer=setTimeout(mount,100);}}).observe(document.body,{childList:true,subtree:true});
 let incoming;try{incoming=new URLSearchParams((location.hash||'').slice(1)).get('atlas-sync');if(TOKEN.test(incoming||'')){history.replaceState(null,'',location.pathname+location.search);open();if(cfg?.token!==incoming){dialog.querySelector('[data-sync-setup]').hidden=false;dialog.querySelector('[data-sync-connected]').hidden=true;dialog.querySelector('[data-sync-code]').value=incoming;status('Phone link ready. Tap “Connect this device” to load your notebook.');}else sync();}}catch{}
 if(cfg)schedule(1000);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
