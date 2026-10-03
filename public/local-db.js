(()=>{
const DB_NAME='study-atlas-local',STORE='lectures',VERSION=1;
let dbp=null;
function open(){
 if(dbp)return dbp;
 dbp=new Promise((resolve,reject)=>{
  const r=indexedDB.open(DB_NAME,VERSION);
  r.onupgradeneeded=()=>{const db=r.result;if(!db.objectStoreNames.contains(STORE)){const s=db.createObjectStore(STORE,{keyPath:'id'});s.createIndex('module_id','module_id',{unique:false});s.createIndex('number','number',{unique:false})}};
  r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);
 });
 return dbp;
}
async function tx(mode,fn){
 const db=await open();return new Promise((resolve,reject)=>{const t=db.transaction(STORE,mode),s=t.objectStore(STORE);let out;try{out=fn(s)}catch(e){reject(e);return}t.oncomplete=()=>resolve(out?.result??out);t.onerror=()=>reject(t.error);t.onabort=()=>reject(t.error||new Error('Local database transaction aborted'))});
}
async function put(v){await tx('readwrite',s=>s.put(v));return v}
async function get(id){return tx('readonly',s=>s.get(id))}
async function all(){return tx('readonly',s=>s.getAll())}
async function remove(id){return tx('readwrite',s=>s.delete(id))}
async function clear(){return tx('readwrite',s=>s.clear())}
window.StudyAtlasLocalDB={open,put,get,all,remove,clear};
})();