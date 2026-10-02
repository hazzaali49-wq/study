import {getStore} from '@netlify/blobs';
import {PDFDocument} from 'pdf-lib';
import {MODEL, callOpenAI, outputText, parseModelJSON, renderGenerated} from './_shared.mjs';
const BUILD_MODEL=process.env.OPENAI_BUILD_MODEL||MODEL;
import {inferLectureNumber, getModule, inferModule} from './catalog.mjs';

const escPrompt=(s='')=>String(s||'').replace(/\s+/g,' ').trim();

function chunkPrompt({title,moduleName,moduleCode,start,end,total}){
  return `Read ONLY original lecture slides ${start}–${end} from the attached PDF chunk. This is part of ${moduleCode||''} ${moduleName||''}. Lecture title: ${title}.
The chunk corresponds exactly to original slide numbers ${start}–${end} of ${total}.
Return ONLY valid JSON:
{"title":"clean lecture title","subtitle":"one short inviting overview","description":"one concise dashboard sentence","chapters":[{"title":"memorable chapter title","slide_start":${start},"slide_end":${end},"summary":"one sentence","intro":"2-4 concise teaching sentences","concepts":[{"heading":"concept","explain":"clear concise explanation; define specialised nouns/abbreviations the first time","why_name":"meaningful why-it-is-called-that / etymology / story when useful, else empty","memory":"useful analogy or connection that genuinely aids memory","clinical":"brief clinical or real-world link when supported/relevant, else empty"}],"questions":[{"question":"short SBA-style check","options":["A","B","C","D"],"answer_index":0,"explanation":"1-2 lines"}]}],"cheat_sheet":[{"heading":"topic","bullets":["compact high-yield fact","mechanism/pathway"]}]}
Rules:
- Use GLOBAL slide numbers ${start}–${end}; never renumber this chunk from 1.
- Preserve source order and terminology.
- Make 1–2 chapters for this chunk depending on topic changes.
- Explain unfamiliar concepts a little more than the slide but stay concise.
- Make it fun and memorable, not childish.
- Include meaningful name stories, analogies and clinical relevance only when useful.
- Put 2–3 questions under each chapter.
- Do not invent content not supported by these slides.
- No markdown and no code fences.`;
}

async function makeChunkPdf(source,startIndex,endIndex){
  const out=await PDFDocument.create();
  const pages=await out.copyPages(source,Array.from({length:endIndex-startIndex},(_,i)=>startIndex+i));
  pages.forEach(p=>out.addPage(p));
  return new Uint8Array(await out.save({useObjectStreams:true}));
}

async function splitIntoSafeChunks(bytes){
  const source=await PDFDocument.load(bytes,{ignoreEncryption:true});
  const total=source.getPageCount();
  const chunks=[];
  let start=0;
  while(start<total){
    let end=Math.min(total,start+7), data;
    while(true){
      data=await makeChunkPdf(source,start,end);
      const b64Len=Math.ceil(data.byteLength/3)*4;
      if(b64Len<=720000 || end-start<=1) break;
      end--;
    }
    chunks.push({start:start+1,end,bytes:data});
    start=end;
  }
  return {total,chunks};
}

async function callFast(payload){
  let last;
  for(let attempt=0;attempt<3;attempt++){
    try{return await callOpenAI(payload,420000)}
    catch(e){
      last=e;
      const msg=String(e?.message||e);
      if(!/429|rate|temporar|timeout|overload|5\d\d/i.test(msg)||attempt===2)throw e;
      await new Promise(r=>setTimeout(r,900*(attempt+1)));
    }
  }
  throw last;
}

async function runPool(items,limit,worker){
  const results=new Array(items.length); let cursor=0;
  async function lane(){
    while(true){
      const i=cursor++; if(i>=items.length)return;
      results[i]=await worker(items[i],i);
    }
  }
  await Promise.all(Array.from({length:Math.min(limit,items.length)},lane));
  return results;
}

function dedupeCheat(rows){
  const seen=new Set(),out=[];
  for(const row of rows||[]){
    const h=escPrompt(row?.heading||'Remember');
    const bullets=[];
    for(const b of row?.bullets||[]){
      const t=escPrompt(b); const k=t.toLowerCase();
      if(t&&!seen.has(k)){seen.add(k);bullets.push(t)}
    }
    if(bullets.length)out.push({heading:h,bullets});
  }
  return out.slice(0,18);
}

export default async (req) => {
  const body=await req.json().catch(()=>({})); const jobId=String(body.job_id||''); if(!jobId)return;
  const store=getStore({name:'study-atlas',consistency:'strong'});
  const key=`jobs/${jobId}/job.json`; let job=await store.get(key,{type:'json',consistency:'strong'}); if(!job)return;
  try{
    job={...job,status:'processing',stage:'Preparing the original slides for AI…',started:Date.now()};await store.setJSON(key,job);
    const arr=await store.get(`jobs/${jobId}/original.pdf`,{type:'arrayBuffer',consistency:'strong'}); if(!arr)throw new Error('Original PDF was not found.');
    const bytes=new Uint8Array(arr);
    const {total,chunks}=await splitIntoSafeChunks(bytes);
    job={...job,stage:`Fast build: reading ${total} slides in ${chunks.length} safe sections (${Math.min(4,chunks.length)} at once)…`};await store.setJSON(key,job);

    let finished=0;
    const parts=await runPool(chunks,4,async ch=>{
      const b64=Buffer.from(ch.bytes).toString('base64');
      const payload={
        model:BUILD_MODEL,
        instructions:'Build a concise, source-faithful medical study guide from this PDF section. Output only valid JSON.',
        input:[{role:'user',content:[
          {type:'input_file',filename:`${job.filename.replace(/\.pdf$/i,'')} slides ${ch.start}-${ch.end}.pdf`,file_data:`data:application/pdf;base64,${b64}`},
          {type:'input_text',text:chunkPrompt({title:job.title,moduleName:job.module_name,moduleCode:job.module_code,start:ch.start,end:ch.end,total})}
        ]}],
        max_output_tokens:4400
      };
      const data=await callFast(payload);
      const obj=parseModelJSON(outputText(data));
      finished++;
      job={...job,stage:`AI finished ${finished}/${chunks.length} slide sections…`};await store.setJSON(key,job);
      return obj;
    });

    const chapters=parts.flatMap(x=>Array.isArray(x?.chapters)?x.chapters:[])
      .map(c=>({...c,slide_start:Number(c?.slide_start||1),slide_end:Number(c?.slide_end||c?.slide_start||1)}))
      .sort((a,b)=>a.slide_start-b.slide_start);
    if(!chapters.length)throw new Error('AI did not return any lecture chapters.');

    const first=parts.find(Boolean)||{};
    const obj={
      title:first.title||job.title,
      subtitle:first.subtitle||'A concise, memorable Study Atlas walkthrough.',
      description:first.description||'AI-generated Study Atlas lecture.',
      slide_count:total,
      chapters,
      cheat_sheet:dedupeCheat(parts.flatMap(x=>Array.isArray(x?.cheat_sheet)?x.cheat_sheet:[]))
    };

    job={...job,stage:'Formatting chapters, slide links, questions and cheat sheet…'};await store.setJSON(key,job);
    const originalUrl=`/api/original?id=${encodeURIComponent(job.lecture_id)}`;
    const html=renderGenerated(obj,originalUrl,job.module_code,job.lecture_id);
    await store.set(`originals/${job.lecture_id}.pdf`,bytes.buffer,{metadata:{filename:job.filename,title:obj.title}});
    await store.set(`lectures/${job.lecture_id}.html`,html,{metadata:{title:obj.title,module_id:job.module_id}});
    const manifest=(await store.get('manifest.json',{type:'json',consistency:'strong'}))||[];
    const resolvedModule=getModule(job.module_code)||getModule(job.module_id)||inferModule((obj.title||'')+' '+job.filename);
    const moduleId=resolvedModule?.id||job.module_id,moduleCode=resolvedModule?.code||job.module_code,moduleName=resolvedModule?.name||job.module_name;
    const sameModule=manifest.filter(x=>x.module_id===moduleId).length;
    const detectedNo=Number(job.lecture_number)||inferLectureNumber(moduleCode,obj.title||job.title,job.filename)||null;
    const lectureNo=detectedNo||sameModule+1;
    const meta={id:job.lecture_id,module_id:moduleId,module_name:moduleName,module_code:moduleCode,number:String(lectureNo).padStart(2,'0'),title:obj.title,slides:`${total} original slides`,chapters:`${chapters.length} AI chapters`,description:obj.description||obj.subtitle||'AI-generated Study Atlas lecture.',created:Date.now()};
    const next=manifest.filter(x=>x.id!==meta.id);next.push(meta);await store.setJSON('manifest.json',next);
    job={...job,status:'complete',stage:'Lecture ready.',lecture:meta,completed:Date.now()};await store.setJSON(key,job);
  }catch(e){job={...job,status:'error',stage:'Build failed.',error:e?.message||String(e),completed:Date.now()};await store.setJSON(key,job)}
};
export const config={path:'/api/ai/build-run',method:'POST',background:true};
