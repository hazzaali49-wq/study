import {json, callOpenAI, outputText, parseModelJSON, MODEL} from './_shared.mjs';
import {MODULES, compactCatalog, inferModule, inferLectureNumber, getModule} from './catalog.mjs';

const DETECT_MODEL=process.env.OPENAI_DETECT_MODEL||MODEL;
export default async (req)=>{
  if(req.method!=='POST')return json({error:'Method not allowed'},405);
  try{
    const body=await req.json(); const pdf=String(body.pdf_data||''); const filename=String(body.filename||'lecture.pdf');
    if(!pdf)return json({error:'Missing PDF data.'},400);
    const explicitCode=filename.match(/(?:NMHS|PATH|MDSA|ANAT)\d{5}/i)?.[0]?.toUpperCase();
    const g=inferModule(filename); const guessedModule=getModule(explicitCode)||g; const guessedNumber=guessedModule?inferLectureNumber(guessedModule.code,'',filename):null;
    if(guessedModule && guessedNumber){
      const t=filename.replace(/\.pdf$/i,'').replace(/[_-]+/g,' ').replace(/^(?:lecture|lec|l)\s*\d+\s*/i,'').trim();
      return json({ok:true,module_id:guessedModule.id,module_code:guessedModule.code,module_name:guessedModule.name,title:t,lecture_number:guessedNumber,confidence:.98,method:'filename'});
    }
    const prompt='Identify this university lecture quickly. Allowed modules: '+JSON.stringify(MODULES.map(({id,code,name})=>({id,code,name})))+'. Known lecture catalogue: '+JSON.stringify(compactCatalog())+'. Return ONLY JSON: {"module_code":"MDSA20030","title":"clean lecture title","lecture_number":1,"confidence":0.95}. Rules: Prefer an explicit module code and explicit Lecture/L number visible in the PDF or filename. If no number is printed, match the lecture title to the catalogue. Do not invent a module outside the allowed list. Filename: '+filename;
    const data=await callOpenAI({model:DETECT_MODEL,instructions:'Extract only lecture identity metadata. Be fast and output valid JSON only.',input:[{role:'user',content:[{type:'input_file',filename,file_data:pdf.startsWith('data:')?pdf:`data:application/pdf;base64,${pdf}`},{type:'input_text',text:prompt}]}],max_output_tokens:350},90000);
    const obj=parseModelJSON(outputText(data)); let m=getModule(obj.module_code)||inferModule((obj.title||'')+' '+filename);
    if(!m)return json({error:'I could not match this lecture to a Study Atlas module.',detected:obj},422);
    const title=String(obj.title||filename.replace(/\.pdf$/i,'').replace(/[_-]+/g,' ')).trim();
    const num=Number(obj.lecture_number)||inferLectureNumber(m.code,title,filename)||null;
    return json({ok:true,module_id:m.id,module_code:m.code,module_name:m.name,title,lecture_number:num,confidence:Number(obj.confidence)||.8,method:'ai'});
  }catch(e){return json({error:e?.message||String(e)},500)}
};
export const config={path:'/api/ai/detect-lecture',method:'POST'};
