import {json, MODEL, OPENAI_KEY, PAID_AI_ALLOWED, callOpenAI, outputText} from './_shared.mjs';
export default async (req) => {
  if(req.method!=='POST') return json({error:'Method not allowed'},405);
  if(!PAID_AI_ALLOWED) return json({error:'Paid cloud AI is disabled. Study Atlas is using the local/source tutor.'},503);
  if(!OPENAI_KEY) return json({error:'OPENAI_API_KEY is not configured in Netlify.'},503);
  try{
    const body=await req.json();
    const prompt=String(body.prompt||body.question||'').slice(0,30000);
    const content=[{type:'input_text',text:prompt}];
    if(typeof body.image==='string' && body.image.startsWith('data:image/') && body.image.length<4_000_000) content.push({type:'input_image',image_url:body.image,detail:'auto'});
    const history=(Array.isArray(body.history)?body.history:[]).slice(-8).map(h=>`${h.role==='assistant'?'AI':'Student'}: ${String(h.text||'').slice(0,1800)}`).join('\n');
    if(history) content[0].text += `\n\nRecent conversation:\n${history}`;
    const data=await callOpenAI({model:MODEL,instructions:'You are Study Atlas AI, a concise medical-school tutor. Treat supplied lecture context as primary. Preserve terminology. Define non-general medical terms. Explain names/etymology and memorable links when useful. If you add information beyond the supplied lecture, clearly label it Extra context. Be accurate, compact and helpful.',input:[{role:'user',content}],max_output_tokens:1800},90000);
    return json({answer:outputText(data),model:MODEL});
  }catch(e){return json({error:e?.message||String(e)},500)}
};
export const config={path:'/api/ai/chat',method:'POST'};
