import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {webcrypto,createHash} from 'node:crypto';
import {IDBFactory} from 'fake-indexeddb';
import {dom,read} from './dom.mjs';
import {createSyncHandler} from '../netlify/functions/study-sync.mjs';
const source={id:'loco-5',moduleId:'anat20040',number:5,title:'Locomotor 5',href:'https://atlas.test/lectures/loco5.html',pdfUrl:'/assets/loco5.pdf'};
const image='data:image/webp;base64,U0xJREU=',sketch='data:image/png;base64,UEVO';
function cloud(){
 const values=new Map(),requests=[];let fail=false;
 const store={
  async set(k,v){if(!values.has(k))values.set(k,String(v));return {modified:true};},
  async setJSON(k,v){return this.set(k,JSON.stringify(v));},
  async get(k,{type}={}){const x=values.get(k);return x===undefined?null:type==='json'?JSON.parse(x):x;},
  async getMetadata(k){return values.has(k)?{etag:k}:null;},
  async list({prefix}){return {blobs:[...values.keys()].filter(k=>k.startsWith(prefix)).map(key=>({key})),directories:[]};}
 };
 const handler=createSyncHandler(()=>store);
 return {values,handler,requests,set fail(x){fail=x;},async fetch(url,options){assert.equal(options?.credentials,'same-origin','preserve the hosting sign-in cookie for private sites');requests.push(options?.body?JSON.parse(options.body):url);if(fail)throw Error('Network unavailable');return handler(new Request(new URL(url,'https://atlas.test'),options));}};
}
async function device(server,factory=new IDBFactory()){
 const a=dom('<html><head></head><body><div id="rootPage"><header class="head"><h1>Study Atlas</h1></header></div></body></html>');
 const original=a.window;
 a.window={document:a.document,indexedDB:factory,localStorage:a.context.localStorage,location:a.context.location,crypto:webcrypto,addEventListener:original.addEventListener.bind(original),dispatchEvent:original.dispatchEvent.bind(original)};a.window.parent=a.window;a.context.window=a.window;
 vm.runInContext(read('study-store.js'),a.context);
 Object.assign(a.context,{navigator:{onLine:true,clipboard:{writeText:async()=>{}}},fetch:server.fetch.bind(server),AbortController,TextEncoder,btoa:s=>Buffer.from(s,'binary').toString('base64'),history:{replaceState(){}},MutationObserver:class{observe(){}}});
 vm.runInContext(read('study-sync.js'),a.context);await a.window.StudyAtlasStudyStore.ready();
 return {...a,store:a.window.StudyAtlasStudyStore,sync:a.window.StudyAtlasCloudSync,token:()=>JSON.parse(a.values.get('atlas.device-sync.v1')).token};
}
const plain=x=>JSON.parse(JSON.stringify(x));
test('two independent devices sync existing notes, board pins, full images, drawings and source context',async()=>{
 const c=cloud(),a=await device(c),b=await device(c);
 const note=await a.store.save(source,{kind:'note',slide:7,text:'Highlighted explanation',strokes:[{points:[{x:.2,y:.4}]}]},{snapshot:image,sketch});
 const pin=await a.store.save(source,{kind:'pin',slide:9,title:'Important muscle'},{snapshot:image});
 await a.sync.enable();await b.sync.connect('https://atlas.test/#atlas-sync='+a.token());
 const rows=await b.store.list();assert.equal(rows.length,2);assert.equal(rows.find(x=>x.id===note.id).text,'Highlighted explanation');assert.equal(rows.find(x=>x.id===note.id).strokes.length,1);
 assert.equal(rows.find(x=>x.id===pin.id).slide,9);assert.equal((await b.store.assets(note.id)).snapshot,image);assert.equal((await b.store.assets(note.id)).sketch,sketch);
 assert.equal(rows[0].href,'/lectures/loco5.html');assert.ok(a.document.querySelector('[data-atlas-sync-entry]'));
 const reloaded=await device(c,b.window.indexedDB);assert.equal((await reloaded.store.list()).length,2);assert.equal((await reloaded.store.assets(note.id)).snapshot,image);
});
test('offline saves and concurrent independent notes merge; deleted pins cannot return from an old device',async()=>{
 const c=cloud(),a=await device(c),b=await device(c);const pin=await a.store.save(source,{kind:'pin',slide:2},{snapshot:image});await a.sync.enable();await b.sync.connect(a.token());
 b.context.navigator.onLine=false;const phoneNote=await b.store.save(source,{kind:'note',text:'Offline phone note'});await b.sync.sync();assert.equal((await b.store.list()).length,2);
 const desktopNote=await a.store.save(source,{kind:'note',text:'Desktop note'});await a.store.remove(pin.id);await a.sync.sync();b.context.navigator.onLine=true;
 await Promise.all([a.sync.sync(),b.sync.sync()]);await a.sync.sync();await b.sync.sync();
 for(const d of [a,b]){const rows=await d.store.list();assert.equal(rows.length,2);assert.ok(rows.some(x=>x.id===phoneNote.id));assert.ok(rows.some(x=>x.id===desktopNote.id));assert.deepEqual(plain(await d.store.assets(pin.id)),{});assert.equal((await d.store.syncSnapshot()).items.find(x=>x.id===pin.id).deleted,true);}
});
test('large slide images are chunked and reassembled exactly; refreshed attachments sync',async()=>{
 const c=cloud(),a=await device(c),b=await device(c),large='data:image/webp;base64,'+'A'.repeat(1200000);
 const note=await a.store.save(source,{kind:'note',text:'Full explanation'},{snapshot:large});await a.sync.enable();await b.sync.connect(a.token());assert.equal((await b.store.assets(note.id)).snapshot,large);
 assert.equal(c.requests.filter(x=>x.action==='putAsset').length,2);assert.ok(c.requests.filter(x=>x.action==='push').every(x=>JSON.stringify(x).length<10000));
 await a.store.attach(note.id,image);await a.sync.sync();await b.sync.sync();assert.equal((await b.store.assets(note.id)).snapshot,image);
});
test('failed network operations retain local data and recover without duplicating notes',async()=>{
 const c=cloud(),a=await device(c),b=await device(c);await a.sync.enable();await b.sync.connect(a.token());const note=await a.store.save(source,{kind:'note',text:'Keep my work'},{snapshot:image});
 c.fail=true;await a.sync.sync();assert.equal((await a.store.list())[0].text,'Keep my work');assert.equal((await a.store.assets(note.id)).snapshot,image);
 c.fail=false;await a.sync.sync();await b.sync.sync();await a.sync.sync();assert.equal((await b.store.list()).length,1);assert.equal((await b.store.assets(note.id)).snapshot,image);
 a.sync.disconnect();assert.equal(a.sync.isConnected(),false);assert.equal((await a.store.list()).length,1);
});
test('remote versions are observed before asset download, so a new edit wins over an older incoming edit',async()=>{
 const c=cloud(),a=await device(c),b=await device(c);const note=await a.store.save(source,{kind:'note',text:'First'});await a.sync.enable();await b.sync.connect(a.token());
 const old=(await b.store.syncSnapshot()).items[0];await a.store.save(source,{id:note.id,kind:'note',text:'Second'},{snapshot:image});await a.sync.sync();
 const original=c.fetch.bind(c);let edited=false;c.fetch=async(url,options)=>{if(String(url).includes('?asset=')&&!edited){edited=true;await b.store.save(source,{id:note.id,kind:'note',text:'Newest local edit'});}return original(url,options);};
 b.context.fetch=c.fetch.bind(c);await b.sync.sync();assert.equal((await b.store.list())[0].text,'Newest local edit');await b.sync.sync();await a.sync.sync();assert.equal((await a.store.list())[0].text,'Newest local edit');
 await b.store.mergeRemote({items:[{record:old,asset:{snapshot:sketch}}]});assert.equal((await b.store.list())[0].text,'Newest local edit');
});
test('sync API rejects missing credentials, foreign origins and unknown codes and isolates notebooks',async()=>{
 const c=cloud(),token='A'.repeat(43),other='B'.repeat(43),post=(body,key=token,origin)=>c.handler(new Request('https://atlas.test/api/study-sync',{method:'POST',headers:{authorization:'Bearer '+key,'content-type':'application/json',...(origin?{origin}:{})},body:JSON.stringify(body)}));
 assert.equal((await c.handler(new Request('https://atlas.test/api/study-sync'))).status,200);
 assert.equal((await post({action:'check'},'')).status,401);assert.equal((await post({action:'start'},token,'https://evil.test')).status,403);assert.equal((await post({action:'check'})).status,404);
 assert.equal((await post({action:'start'})).status,200);const hash=createHash('sha256').update(image).digest('hex');assert.equal((await post({action:'putAsset',hash,value:image})).status,200);
 assert.equal((await c.handler(new Request('https://atlas.test/api/study-sync?asset='+hash,{headers:{authorization:'Bearer '+other}}))).status,404);
 assert.equal((await post({action:'putAsset',hash,value:'wrong'})).status,400);
});

 test('a sync tab with stale memory cannot overwrite a newer note saved in another tab',async()=>{
 const c=cloud(),factory=new IDBFactory(),a=await device(c,factory);const note=await a.store.save(source,{kind:'note',text:'Original'},{snapshot:image});const stale=await device(c,factory);
 const remote={...note,text:'Older remote',syncVersion:'0000000000000040-aaaaaaaaaaaaaaaa'};a.store.observeVersions([remote]);await a.store.save(source,{id:note.id,kind:'note',text:'Latest in another tab'},{snapshot:sketch});await stale.store.mergeRemote({items:[{record:remote,asset:{snapshot:image}}]});await a.store.reload();assert.equal((await a.store.list())[0].text,'Latest in another tab');assert.equal((await a.store.assets(note.id)).snapshot,sketch);
 });

test('notes from device-only uploaded lectures sync their captured slides without temporary PDF URLs',async()=>{
 const c=cloud(),a=await device(c),b=await device(c);const local={...source,id:'local-lecture-5',localId:'local-lecture-5',href:'/local-lecture.html?id=local-lecture-5',pdfUrl:'blob:device-only-original'};
 const note=await a.store.save(local,{kind:'note',slide:4,text:'Local original and explanation'},{snapshot:image});await a.sync.enable();await b.sync.connect(a.token());assert.equal((await b.store.list())[0].text,'Local original and explanation');assert.equal((await b.store.assets(note.id)).snapshot,image);assert.equal((await b.store.syncSnapshot()).lectures[0].pdfUrl,'');
});
