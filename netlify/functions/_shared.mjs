export const MODEL = process.env.OPENAI_MODEL || 'gpt-5-mini';
export const OPENAI_KEY = (process.env.OPENAI_API_KEY || '').trim();\nexport const OPENAI_BASE = (process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1').replace(/\\/+$/,'');

export const json = (obj, status=200, headers={}) => new Response(JSON.stringify(obj), {
  status,
  headers: {'content-type':'application/json; charset=utf-8','cache-control':'no-store',...headers}
});

export function adminOK(body={}, req){
  const expected=(process.env.STUDY_ATLAS_ADMIN_KEY||'').trim();
  if(!expected) return true;
  const provided=String(body.admin_key || req?.headers?.get?.('x-study-atlas-admin-key') || '');
  return provided===expected;
}

export function slugify(s='lecture'){
  const base=String(s).normalize('NFKD').replace(/[^a-zA-Z0-9]+/g,'-').replace(/^-+|-+$/g,'').toLowerCase().slice(0,62) || 'lecture';
  return `${base}-${Date.now().toString(36).slice(-6)}`;
}

export function outputText(data){
  if(typeof data?.output_text==='string' && data.output_text) return data.output_text;
  let out='';
  for(const item of data?.output||[]){
    if(item?.type==='message') for(const c of item?.content||[]) if(c?.type==='output_text') out+=c.text||'';
  }
  return out;
}

export async function callOpenAI(payload, timeoutMs=120000){
  if(!OPENAI_KEY) throw new Error('OPENAI_API_KEY is not configured on Netlify.');
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),timeoutMs);
  try{
    const r=await fetch(`${OPENAI_BASE}/responses`,{
      method:'POST',
      headers:{'authorization':`Bearer ${OPENAI_KEY}`,'content-type':'application/json'},
      body:JSON.stringify(payload),
      signal:controller.signal
    });
    const data=await r.json().catch(()=>({}));
    if(!r.ok) throw new Error(data?.error?.message || `OpenAI error ${r.status}`);
    return data;
  } finally { clearTimeout(timer); }
}

export function parseModelJSON(text=''){
  text=String(text).trim().replace(/^```(?:json)?\s*/i,'').replace(/\s*```$/,'');
  try{return JSON.parse(text)}catch{}
  const a=text.indexOf('{'), b=text.lastIndexOf('}');
  if(a>=0&&b>a) return JSON.parse(text.slice(a,b+1));
  throw new Error('AI returned content that could not be parsed as lecture JSON.');
}

export const esc = (v='') => String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

export function lecturePrompt({title,moduleName,moduleCode}){
return `Read the attached original university lecture PDF carefully. Build a Study Atlas teaching version for ${moduleCode||''} ${moduleName||''}. Title: ${title}.
The AI study version comes FIRST. Do not reproduce the original slides in the normal lesson flow. Keep the untouched original PDF available only through each chapter's "Slides X–Y" button and at the very end.
Return ONLY valid JSON with this shape:
{"title":"...","subtitle":"one short inviting overview","description":"one concise dashboard sentence","slide_count":29,"chapters":[{"title":"memorable chapter title","slide_start":1,"slide_end":5,"summary":"one sentence","intro":"2-4 concise teaching sentences","concepts":[{"heading":"concept","explain":"clear concise explanation; define specialised nouns/abbreviations the first time","why_name":"meaningful why-it-is-called-that / etymology / story when useful, else empty","memory":"useful analogy or connection that genuinely aids memory","clinical":"brief clinical or real-world link when supported/relevant, else empty"}],"questions":[{"question":"short SBA-style check","options":["A","B","C","D"],"answer_index":0,"explanation":"1-2 lines"}]}],"cheat_sheet":[{"heading":"topic","bullets":["compact high-yield fact","mechanism/pathway"]}]}
Preserve slide order and source terminology. Group roughly 3-6 slides per chapter. Explain unfamiliar concepts a little more than the slide but stay concise. Make it fun and memorable, not childish. Include meaningful name stories, links, analogies and clinical relevance. Put 2-3 questions under EACH chapter. Make the cheat sheet compact but complete. No markdown and no code fences.`;
}

export function renderGenerated(data, originalUrl, moduleCode='', lectureId='generated'){
  const title=esc(data?.title||'Lecture'), subtitle=esc(data?.subtitle||data?.overview||'AI study version');
  const chapters=Array.isArray(data?.chapters)?data.chapters:[];
  const slideCount=Number(data?.slide_count||Math.max(1,...chapters.map(c=>Number(c?.slide_end||1))));
  const nav=[], sections=[];
  chapters.forEach((ch,idx)=>{
    const i=idx+1,cid=`ch${i}`,start=Number(ch?.slide_start||1),end=Number(ch?.slide_end||start),ct=ch?.title||`Chapter ${i}`;
    nav.push(`<button class="nav" data-go="${cid}"><span>${String(i).padStart(2,'0')}</span>${esc(ct)}</button>`);
    const concepts=[];
    if(ch?.intro) concepts.push(`<p class="lead">${esc(ch.intro)}</p>`);
    for(const c of ch?.concepts||[]){
      concepts.push(`<article class="concept"><h4>${esc(c?.heading||'Key idea')}</h4><p>${esc(c?.explain||'')}</p>${c?.why_name?`<div class="story"><b>✦ Why that name?</b><span>${esc(c.why_name)}</span></div>`:''}${c?.memory?`<div class="memory"><b>↯ Memory link</b><span>${esc(c.memory)}</span></div>`:''}${c?.clinical?`<div class="clinical"><b>＋ Clinical / useful link</b><span>${esc(c.clinical)}</span></div>`:''}</article>`)
    }
    const qs=(ch?.questions||[]).map((q,qi)=>{
      const opts=(q?.options||[]).map((o,oi)=>`<label><input type="radio" name="q${i}_${qi}" value="${oi}"><span>${esc(o)}</span></label>`).join('');
      return `<div class="q" data-answer="${Number(q?.answer_index||0)}"><b>${esc(q?.question||'Check yourself')}</b><div class="opts">${opts}</div><button class="checkq">Check</button><div class="feedback" data-exp="${esc(q?.explanation||'')}"></div></div>`
    }).join('');
    sections.push(`<section class="chapter" id="${cid}" data-start="${start}" data-end="${end}"><div class="chhead"><div><div class="kicker">CHAPTER ${String(i).padStart(2,'0')} · SLIDES ${start}–${end}</div><h2>${esc(ct)}</h2><p>${esc(ch?.summary||'')}</p></div><button class="slidesbtn">Slides ${start}–${end}</button></div><div class="origpane" hidden><div class="origbar"><b>Original lecture · slide ${start}</b><button class="closeorig">Close</button></div><iframe loading="lazy" src="${esc(originalUrl)}#page=${start}&toolbar=0&navpanes=0"></iframe></div>${concepts.join('')}${qs?`<section class="chaptercheck"><h4>Quick chapter check</h4>${qs}</section>`:''}</section>`)
  });
  const cheat=(data?.cheat_sheet||[]).map(c=>`<div class="cheat"><h4>${esc(c?.heading||'Remember')}</h4><ul>${(c?.bullets||[]).map(b=>`<li>${esc(b)}</li>`).join('')}</ul></div>`).join('');
  const css=`
:root{--txt:#edf4ff;--mut:#9dadc4;--blue:#5b93ff;--mint:#75e4bd;--purple:#9a7cff}*{box-sizing:border-box}html{scroll-behavior:smooth;color-scheme:dark}body{margin:0;background:radial-gradient(circle at 12% 0,rgba(83,111,255,.16),transparent 30rem),radial-gradient(circle at 96% 12%,rgba(87,225,187,.08),transparent 32rem),linear-gradient(#070b14,#0a1120);color:var(--txt);font:16px/1.62 system-ui,-apple-system,Segoe UI,sans-serif}button,input,textarea{font:inherit}button{cursor:pointer}.layout{display:grid;grid-template-columns:245px minmax(0,1fr);gap:28px;max-width:1480px;margin:auto;padding:22px 96px 80px 28px}aside{position:sticky;top:20px;align-self:start;max-height:calc(100vh - 40px);overflow:auto}.brand{font-weight:950;margin:4px 0 22px;color:#cfe0ff}.brand em{font-style:normal;color:#a88cff}.nav{width:100%;text-align:left;border:0;background:transparent;color:#95a6bf;padding:10px;border-radius:12px;display:flex;gap:9px;font-weight:800;margin:2px 0}.nav span{color:#6fa0ff}.nav:hover,.nav.active{background:#14223b;color:white}main{min-width:0}.hero{border:1px solid #2e3b57;border-radius:26px;background:linear-gradient(145deg,#101a30,#172540);padding:38px 5%;margin-bottom:22px;box-shadow:0 25px 75px rgba(0,0,0,.28)}.kicker{font-size:.68rem;color:#92b7ff;font-weight:950;letter-spacing:.14em}h1{font-size:clamp(2.2rem,5vw,4.5rem);letter-spacing:-.055em;line-height:1.03;margin:12px 0}.hero p{color:#b6c4d8;max-width:780px}.tag{display:inline-block;background:#112b27;color:#8be6c5;border:1px solid #235247;border-radius:999px;padding:6px 10px;font-size:.72rem;font-weight:900}.chapter{scroll-margin-top:18px;background:linear-gradient(180deg,rgba(17,27,47,.97),rgba(12,21,37,.97));border:1px solid #293753;border-radius:24px;padding:24px;margin:20px 0;box-shadow:0 18px 50px rgba(0,0,0,.20)}.chhead{display:flex;justify-content:space-between;gap:18px;align-items:start}.chhead h2{font-size:1.65rem;letter-spacing:-.035em;margin:7px 0 3px}.chhead p{color:#9eadc3;margin:0}.slidesbtn{border:1px solid #43537a;background:linear-gradient(135deg,#192b4b,#2a3c68);color:#dce8ff;padding:9px 12px;border-radius:12px;font-weight:900;white-space:nowrap}.lead{color:#d4def0;font-size:1.02rem}.concept{margin:15px 0;background:#0c1525;border:1px solid #263450;border-radius:17px;padding:17px 18px}.concept h4{margin:0 0 6px}.concept p{margin:0;color:#d0d9e8}.story,.memory,.clinical{display:grid;grid-template-columns:145px 1fr;gap:10px;margin-top:10px;padding:10px 12px;border-radius:11px;font-size:.84rem}.story{background:#251d13;border:1px solid #574327}.story b{color:#ffd28a}.memory{background:#18152d;border:1px solid #3c3566}.memory b{color:#c8b6ff}.clinical{background:#10231f;border:1px solid #285149}.clinical b{color:#82e4c2}.origpane{margin:15px 0;border:1px solid #3a4d72;border-radius:16px;overflow:hidden;background:#060b14}.origbar{display:flex;justify-content:space-between;padding:10px 12px;background:#121d31;color:#aabbd3;font-size:.78rem}.origbar button{border:0;background:#26334c;color:#e8efff;border-radius:8px;padding:5px 9px}.origpane iframe{width:100%;height:70vh;border:0;background:white}.chaptercheck{margin-top:20px;border-top:1px solid #29344d;padding-top:15px}.q{background:#0a1322;border:1px solid #25334e;border-radius:14px;padding:14px;margin:10px 0}.opts{display:grid;gap:7px;margin:10px 0}.opts label{display:flex;gap:8px;background:#111d31;padding:8px 10px;border-radius:10px;color:#c5d1e3}.checkq{border:0;background:#2c69e6;color:#fff;border-radius:9px;padding:7px 10px;font-weight:900}.feedback{font-size:.8rem;margin-top:8px;color:#9eb0ca}.cheatgrid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.cheat{background:#0b1424;border:1px solid #283651;border-radius:14px;padding:14px}.cheat h4{margin:0 0 8px}.cheat ul{padding-left:20px;margin:0;color:#bdc9db}.originalend{background:linear-gradient(145deg,#101c30,#14233e);border:1px solid #334364;border-radius:24px;padding:24px;margin-top:20px}.originalend a,.back{display:inline-block;background:#6e58df;color:white;padding:10px 14px;border-radius:12px;font-weight:900;text-decoration:none}.rail{position:fixed;right:18px;top:50%;transform:translateY(-50%);z-index:90;background:#0b1322;border:1px solid #30415f;border-radius:22px;padding:8px;display:grid;gap:7px;box-shadow:0 16px 50px rgba(0,0,0,.35)}.rbtn{width:58px;min-height:48px;border:0;border-radius:14px;background:#15223a;color:#dbe7fa;font-size:.72rem;font-weight:900}.progress{height:110px;width:58px;border-radius:16px;background:#0f1a2d;position:relative;overflow:hidden;border:1px solid #273954}.progress i{position:absolute;left:0;right:0;bottom:0;height:0;background:linear-gradient(0deg,#2f6fff,#65b4ff);transition:height .12s linear}.progress b{position:absolute;inset:0;display:grid;place-items:center;font-size:.72rem;z-index:2}.ai{position:fixed;right:90px;top:50%;transform:translateY(-50%);width:min(410px,calc(100vw - 120px));z-index:89;background:#111a2c;border:1px solid #344363;border-radius:20px;padding:15px;box-shadow:0 25px 80px rgba(0,0,0,.45)}.ai[hidden]{display:none}.ai textarea{width:100%;height:100px;resize:vertical;background:#091221;color:#eef5ff;border:1px solid #34415c;border-radius:12px;padding:10px;margin:10px 0}.ai button{border:0;background:#396fec;color:#fff;border-radius:10px;padding:8px 11px;font-weight:900;margin-right:6px}.out{white-space:pre-wrap;color:#cad6e8;font-size:.86rem;margin-top:10px;max-height:45vh;overflow:auto}.focus aside,.focus .hero{display:none}.focus .layout{grid-template-columns:1fr;max-width:1280px}.focus .chapter{margin-top:10px}@media(max-width:800px){.layout{grid-template-columns:1fr;padding:14px 78px 60px 14px}aside{position:static;max-height:none}.cheatgrid{grid-template-columns:1fr}.chhead{display:block}.slidesbtn{margin-top:12px}.story,.memory,.clinical{grid-template-columns:1fr}.rail{right:8px}}
`;
  const js=`
const qs=s=>document.querySelector(s), qsa=s=>[...document.querySelectorAll(s)];
qsa('[data-go]').forEach(b=>b.onclick=()=>qs('#'+b.dataset.go)?.scrollIntoView({behavior:'smooth'}));
qsa('.slidesbtn').forEach(b=>b.onclick=()=>{const p=b.closest('.chapter').querySelector('.origpane');p.hidden=!p.hidden});qsa('.closeorig').forEach(b=>b.onclick=()=>b.closest('.origpane').hidden=true);
qsa('.checkq').forEach(b=>b.onclick=()=>{const q=b.closest('.q'),picked=q.querySelector('input:checked'),f=q.querySelector('.feedback');if(!picked){f.textContent='Choose an answer first.';return}const ok=Number(picked.value)===Number(q.dataset.answer);f.textContent=(ok?'✓ Correct. ':'Not quite. ')+(f.dataset.exp||'')});
function prog(){const d=document.documentElement,max=Math.max(1,d.scrollHeight-innerHeight),p=Math.max(0,Math.min(100,Math.round(scrollY/max*100)));qs('#pf').style.height=p+'%';qs('#pt').textContent=p+'%'}addEventListener('scroll',prog,{passive:true});addEventListener('resize',prog);prog();
qs('#focus').onclick=()=>document.body.classList.toggle('focus');let z=1;qs('#zp').onclick=()=>{z=Math.min(1.5,z+.1);document.querySelector('main').style.zoom=z};qs('#zm').onclick=()=>{z=Math.max(.7,z-.1);document.querySelector('main').style.zoom=z};
const ai=qs('#ai');qs('#aiBtn').onclick=()=>ai.hidden=!ai.hidden;qs('#ac').onclick=()=>ai.hidden=true;qs('#as').onclick=async()=>{const q=qs('#aq').value.trim();if(!q)return;const out=qs('#ao'),current=qsa('.chapter').find(c=>{const r=c.getBoundingClientRect();return r.top<innerHeight*.45&&r.bottom>80})||qsa('.chapter')[0];out.textContent='Thinking…';try{const r=await fetch('/api/ai/chat',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({prompt:'Lecture: ${title.replaceAll("'","\\'")}\\nCurrent chapter: '+(current?.innerText?.slice(0,5500)||'')+'\\nQuestion: '+q})});const j=await r.json();out.textContent=j.answer||j.error||'No answer'}catch(e){out.textContent='Cloud AI unavailable. Check Netlify environment variables.'}};
`;
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title} · Study Atlas</title><style>${css}</style></head><body><div class="layout"><aside><a class="back" href="/">← Library</a><div class="brand">✦ study<em>atlas</em></div><div class="kicker">${esc(moduleCode)} · AI STUDY VERSION</div>${nav.join('')}</aside><main><section class="hero"><span class="tag">AI study version · original lecture preserved</span><div class="kicker">${esc(moduleCode)} · ${slideCount} original slides</div><h1>${title}</h1><p>${subtitle}</p></section>${sections.join('')}<section class="chapter"><div class="kicker">EXAM CHEAT SHEET</div><h2>Everything important, compressed</h2><div class="cheatgrid">${cheat}</div></section><section class="originalend"><div class="kicker">ORIGINAL LECTURE</div><h2>Want the source exactly as given?</h2><p>The teaching version above stays concise and memorable. The untouched original lecture is kept here for checking wording, diagrams and lecturer emphasis.</p><a href="${esc(originalUrl)}" target="_blank" rel="noopener">Open original lecture PDF ↗</a></section></main></div><div class="rail"><button class="rbtn" id="focus">Panels</button><div class="progress"><i id="pf"></i><b id="pt">0%</b></div><button class="rbtn" id="zm">−</button><button class="rbtn" id="zp">＋</button><button class="rbtn" id="aiBtn">AI</button></div><div class="ai" id="ai" hidden><b>Ask about this chapter</b><textarea id="aq" placeholder="What does this mean? Why is it called that?"></textarea><button id="as">Ask</button><button id="ac" style="background:#25334d">Close</button><div class="out" id="ao"></div></div><script>${js}<\/script></body></html>`;
}
