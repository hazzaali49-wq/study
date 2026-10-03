import {json} from './_shared.mjs';
import {matchCalendarLecture,inferModule,inferLectureNumber,getModule} from './catalog.mjs';

export default async (req)=>{
  if(req.method!=='POST')return json({error:'Method not allowed'},405);
  try{
    const body=await req.json();
    const filename=String(body.filename||'lecture.pdf');
    const sample=String(body.text||'').slice(0,18000);
    const explicitCode=(filename+' '+sample).match(/(?:NMHS|PATH|MDSA|ANAT)\d{5}/i)?.[0]?.toUpperCase()||'';
    const match=matchCalendarLecture(filename+' '+sample,explicitCode);
    if(match?.confidence>=.72){
      const m=getModule(match.module_code);
      return json({ok:true,module_id:m.id,module_code:m.code,module_name:m.name,title:match.title,lecture_number:match.number,calendar_date:match.calendar_date,confidence:match.confidence,method:'calendar-local'});
    }
    const m=getModule(explicitCode)||inferModule(filename+' '+sample);
    if(!m)return json({error:'Could not match this lecture automatically. Use Edit to choose the module and title.'},422);
    const num=inferLectureNumber(m.code,sample,filename)||null;
    const title=filename.replace(/\.pdf$/i,'').replace(/[_-]+/g,' ').replace(/\s*\(\d+\)\s*$/,'').trim();
    return json({ok:true,module_id:m.id,module_code:m.code,module_name:m.name,title,lecture_number:num,confidence:num?.88:.7,method:'local-match'});
  }catch(e){return json({error:e?.message||String(e)},500)}
};
export const config={path:'/api/ai/detect-lecture',method:'POST'};