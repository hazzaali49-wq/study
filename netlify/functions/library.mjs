import {getStore} from '@netlify/blobs';
import {json} from './_shared.mjs';
import {matchCalendarLecture,getModule,inferLectureNumber} from './catalog.mjs';

export default async ()=>{
  try{
    const store=getStore({name:'study-atlas',consistency:'strong'});
    const lectures=(await store.get('manifest.json',{type:'json',consistency:'strong'}))||[];
    let changed=false;
    for(const lecture of lectures){
      const text=(lecture.title||'')+' '+(lecture.filename||'');
      const match=matchCalendarLecture(text);
      if(match?.confidence>=.78){
        const m=getModule(match.module_code);
        if(m && (lecture.module_id!==m.id||lecture.module_code!==m.code||lecture.module_name!==m.name)){
          lecture.module_id=m.id;lecture.module_code=m.code;lecture.module_name=m.name;changed=true;
        }
        if(String(lecture.number||'').replace(/^0+/,'')!==String(match.number)){
          lecture.number=String(match.number).padStart(2,'0');changed=true;
        }
        if(match.calendar_date && lecture.calendar_date!==match.calendar_date){lecture.calendar_date=match.calendar_date;changed=true}
      }else{
        const inferred=inferLectureNumber(lecture.module_code||'',lecture.title||'',lecture.filename||'');
        if(inferred && String(lecture.number||'').replace(/^0+/,'')!==String(inferred)){
          lecture.number=String(inferred).padStart(2,'0');changed=true;
        }
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
