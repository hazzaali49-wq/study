import {getStore} from '@netlify/blobs';
import {json} from './_shared.mjs';
import {inferLectureNumber} from './catalog.mjs';

export default async ()=>{
  try{
    const store=getStore({name:'study-atlas',consistency:'strong'});
    const lectures=(await store.get('manifest.json',{type:'json',consistency:'strong'}))||[];
    let changed=false;
    for(const lecture of lectures){
      const inferred=inferLectureNumber(lecture.module_code||'',lecture.title||'',lecture.filename||'');
      if(inferred && String(lecture.number||'').replace(/^0+/,'')!==String(inferred)){
        lecture.number=String(inferred).padStart(2,'0');
        changed=true;
      }
    }
    lectures.sort((a,b)=>(Number(a.number)||999)-(Number(b.number)||999)||(a.created||0)-(b.created||0));
    if(changed) await store.setJSON('manifest.json',lectures);
    return json({lectures});
  }catch(e){
    return json({lectures:[],error:e?.message||String(e)},200);
  }
};
export const config={path:'/api/library',method:'GET'};
