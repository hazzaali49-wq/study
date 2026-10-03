import {getStore} from '@netlify/blobs';
import {json} from './_shared.mjs';
import {matchCalendarLecture,getModule} from './catalog.mjs';

export default async ()=>{
  try{
    const store=getStore({name:'study-atlas',consistency:'strong'});
    const lectures=(await store.get('manifest.json',{type:'json',consistency:'strong'}))||[];
    let changed=false;
    for(const lecture of lectures){
      if(lecture.metadata_confirmed)continue;
      if(!lecture.filename){
        const original=await store.getMetadata(`originals/${lecture.id}.pdf`,{consistency:'strong'}).catch(()=>null);
        if(original?.metadata?.filename){lecture.filename=original.metadata.filename;changed=true;}
      }
      const match=matchCalendarLecture([lecture.filename||lecture.title,lecture.title||'']);
      if(match?.confidence>=.78){
        const m=getModule(match.module_code);
        if(m && (lecture.module_id!==m.id||lecture.module_code!==m.code||lecture.module_name!==m.name)){
          lecture.module_id=m.id;lecture.module_code=m.code;lecture.module_name=m.name;changed=true;
        }
        if(String(lecture.number||'').replace(/^0+/,'')!==String(match.number)){
          lecture.number=String(match.number).padStart(2,'0');changed=true;
        }
        if(match.calendar_date && lecture.calendar_date!==match.calendar_date){lecture.calendar_date=match.calendar_date;changed=true}
        if(lecture.title!==match.title){lecture.previous_titles=[...new Set([...(lecture.previous_titles||[]),lecture.title])];lecture.title=match.title;changed=true;}
      }
    }
    lectures.sort((a,b)=>String(a.module_code||'').localeCompare(String(b.module_code||''))||(Number(a.number)||999)-(Number(b.number)||999)||(a.created||0)-(b.created||0));
    if(changed) await store.setJSON('manifest.json',lectures);
    return json({lectures});
  }catch(e){
    return json({lectures:[],error:e?.message||String(e)},200);
  }
};
export const config={path:'/api/library',method:'GET'};
