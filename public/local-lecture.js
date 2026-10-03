(()=>{
const PALETTES={nmhs10100:['#ef92c9','#79bce9'],path30080:['#ff7f82','#f4b15f'],mdsa20030:['#a784ff','#5ed6bd'],mdsa20010:['#69d39d','#55b8aa'],anat20060:['#7da6ff','#d6a86e'],anat20040:['#65cce8','#7b8cff']};
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const uniq=a=>[...new Set((a||[]).map(Number).filter(Number.isFinite))];
let pdfUrl='';
function originalAt(n){if(!pdfUrl)return;window.open(pdfUrl+'#page='+Number(n||1),'_blank','noopener')}
function renderConcept(c,start,end){
 const refs=uniq(c?.slide_refs).filter(n=>n>=start&&n<=end),pts=(c?.key_points||[]).filter(Boolean).slice(0,10),fun=c?.fun_fact||c?.why_name||'';
 return `<article class="concept"><div class="concepttop"><h4>${esc(c?.heading||'Key idea')}</h4>${refs.length?`<span class="refs">Slides ${refs.join(', ')}</span>`:''}</div><p>${esc(c?.explain||'')}</p>${pts.length?`<ul class="keypoints">${pts.map(x=>`<li>${esc(x)}</li>`).join('')}</ul>`:''}${fun?`<div class="story"><b>✦ Worth remembering</b><span>${esc(fun)}</span></div>`:''}${c?.clinical?`<div class="clinical"><b>＋ Clinical / useful link</b><span>${esc(c.clinical)}</span></div>`:''}</article>`;
}
function renderQuestion(q,ci,qi){
 const opts=(q?.options||[]).map((o,i)=>`<label><input type="radio" name="q${ci}_${qi}" value="${i}"><span>${esc(o)}</span></label>`).join('');
 return `<div class="q" data-answer="${Number(q?.answer_index||0)}"><b>${esc(q?.question||'Check yourself')}</b><div class="opts">${opts}</div><button class="checkq">Check</button><div class="feedback" data-exp="${esc(q?.explanation||'')}"></div></div>`;
}
function renderVisual(v){
 const slide=Number(v?.slide||1);
 return `<article class="visualcard"><div class="visualframe"><iframe loading="lazy" src="${esc(pdfUrl)}#page=${slide}&toolbar=0&navpanes=0&zoom=page-width" title="Original slide ${slide}"></iframe></div><div class="visualcopy"><div class="visualtag">ORIGINAL SLIDE ${slide}</div><h4>${esc(v?.title||'Original lecture visual')}</h4><p>${esc(v?.explain||'Use this original slide as the visual anchor for the explanation.')}</p>${Array.isArray(v?.labels)&&v.labels.length?`<ul>${v.labels.slice(0,7).map(x=>`<li>${esc(x)}</li>`).join('')}</ul>`:''}<button class="openvisual" data-slide="${slide}">Open larger</button></div></article>`;
}
function renderLecture(l){
 const data=l.data||{},chapters=Array.isArray(data.chapters)?data.chapters:[],pal=PALETTES[l.module_id]||['#8f72f1','#57d6b2'];
 document.body.dataset.atlasModule=l.module_id||'';document.documentElement.style.setProperty('--atlas-mod',pal[0]);document.documentElement.style.setProperty('--atlas-mod2',pal[1]);document.title=(l.title||'Lecture')+' · Study Atlas';
 const nav=[],sections=[];
 chapters.forEach((ch,idx)=>{
  const start=Number(ch?.slide_start||1),end=Number(ch?.slide_end||start),id='ch'+(idx+1),title=ch?.title||'Chapter '+(idx+1);
  nav.push(`<button class="nav" data-go="${id}"><span>${String(idx+1).padStart(2,'0')}</span>${esc(title)}</button>`);
  let visuals=Array.isArray(ch?.visuals)?ch.visuals.filter(v=>Number(v?.slide)>=start&&Number(v?.slide)<=end):[];
  if(!visuals.length){const refs=uniq((ch?.concepts||[]).flatMap(c=>c?.slide_refs||[])).filter(n=>n>=start&&n<=end).slice(0,2);visuals=refs.map(n=>({slide:n,title:'Original slide',explain:'Keep the original visual beside the explanation.'}))}
  visuals=visuals.slice(0,3);
  const concepts=(ch?.concepts||[]).map(c=>renderConcept(c,start,end)).join('');
  const qs=(ch?.questions||[]).map((q,qi)=>renderQuestion(q,idx,qi)).join('');
  sections.push(`<section class="chapter" id="${id}" data-start="${start}" data-end="${end}"><div class="chhead"><div><div class="kicker">CHAPTER ${String(idx+1).padStart(2,'0')} · SLIDES ${start}–${end}</div><h2>${esc(title)}</h2><p>${esc(ch?.summary||'')}</p></div><button class="slidesbtn" data-slide="${start}">Original slides ${start}–${end}</button></div>${ch?.intro?`<p class="lead">${esc(ch.intro)}</p>`:''}${visuals.length?`<div class="visualgrid">${visuals.map(renderVisual).join('')}</div>`:''}${concepts}${qs?`<section class="chaptercheck"><h4>Quick chapter check</h4>${qs}</section>`:''}</section>`);
 });
 const cheat=(data.cheat_sheet||[]).map(c=>`<div class="cheat"><h4>${esc(c?.heading||'Remember')}</h4><ul>${(c?.bullets||[]).map(b=>`<li>${esc(b)}</li>`).join('')}</ul></div>`).join('');
 document.getElementById('localLectureApp').innerHTML=`<div class="layout"><aside><a class="back" href="/">← All modules</a><div class="brand">✦ study<em>atlas</em></div><div class="kicker">${esc(l.module_code||'')} · LOCAL STUDY VERSION</div>${nav.join('')}</aside><main><section class="hero"><span class="tag">On-device study version · original preserved locally</span><div class="kicker">${esc(l.module_code||'')} · ${esc(l.slides||'')}</div><h1>${esc(l.title||data.title||'Lecture')}</h1><p>${esc(data.subtitle||l.description||'')}</p></section>${sections.join('')}<section class="chapter"><div class="kicker">EXAM CHEAT SHEET</div><h2>Everything important, compressed</h2><div class="cheatgrid">${cheat||'<div class="cheat"><p>Use the chapter summaries above for revision.</p></div>'}</div></section><section class="originalend"><div class="kicker">ORIGINAL LECTURE</div><h2>Open the untouched source</h2><p>The PDF is stored only on this device with the local lecture.</p><button id="openOriginalAll">Open original lecture ↗</button></section></main></div><div class="rail"><button class="rbtn" id="aiBtn">AI</button></div><div class="ai" id="ai" hidden><b>Ask about this chapter</b><textarea id="aq" placeholder="Explain this diagram, pathway, label or concept…"></textarea><button id="as">Ask</button><button id="ac" style="background:#25334d">Close</button><div class="out" id="ao"></div></div>`;
 document.querySelectorAll('[data-go]').forEach(b=>b.onclick=()=>document.getElementById(b.dataset.go)?.scrollIntoView({behavior:'smooth'}));
 document.querySelectorAll('.slidesbtn,.openvisual').forEach(b=>b.onclick=()=>originalAt(b.dataset.slide));
 document.querySelectorAll('.checkq').forEach(b=>b.onclick=()=>{const q=b.closest('.q'),p=q.querySelector('input:checked'),f=q.querySelector('.feedback');if(!p){f.textContent='Choose an answer first.';return}f.textContent=(Number(p.value)===Number(q.dataset.answer)?'✓ Correct. ':'Not quite. ')+(f.dataset.exp||'')});
 document.getElementById('openOriginalAll').onclick=()=>originalAt(1);
 const ai=document.getElementById('ai');document.getElementById('aiBtn').onclick=()=>ai.hidden=!ai.hidden;document.getElementById('ac').onclick=()=>ai.hidden=true;
 document.getElementById('as').onclick=async()=>{const q=document.getElementById('aq').value.trim();if(!q)return;const out=document.getElementById('ao'),ch=[...document.querySelectorAll('.chapter')].find(c=>{const r=c.getBoundingClientRect();return r.top<innerHeight*.5&&r.bottom>100})||document.querySelector('.chapter');out.textContent='Thinking locally…';try{if(!window.StudyAtlasLocalAI)throw new Error('On-device AI is not available.');const ans=await window.StudyAtlasLocalAI.ask('Lecture: '+l.title+'\nCurrent chapter source/context:\n'+(ch?.innerText||'').slice(0,8000)+'\nQuestion: '+q);out.textContent=ans}catch(e){out.textContent=e?.message||String(e)}};
 setTimeout(()=>window.dispatchEvent(new Event('resize')),100);
}
async function boot(){
 const id=new URLSearchParams(location.search).get('id');if(!id||!window.StudyAtlasLocalDB){document.getElementById('localLectureApp').innerHTML='<div class="atlas-local-loading"><b>Lecture not found</b><a href="/">Return to Study Atlas</a></div>';return}
 const l=await window.StudyAtlasLocalDB.get(id);if(!l){document.getElementById('localLectureApp').innerHTML='<div class="atlas-local-loading"><b>This local lecture is not on this device.</b><a href="/">Return to Study Atlas</a></div>';return}
 pdfUrl=URL.createObjectURL(l.pdf);renderLecture(l);
 const loadScript=src=>new Promise((resolve,reject)=>{const x=document.createElement('script');x.src=src;x.onload=resolve;x.onerror=reject;document.body.appendChild(x)});
 await loadScript('/study-tools.js?v=6');await loadScript('/generated-tools.js?v=7');
 addEventListener('beforeunload',()=>URL.revokeObjectURL(pdfUrl),{once:true});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();