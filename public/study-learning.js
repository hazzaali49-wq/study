(function(root){
'use strict';
const clean=s=>String(s??'').replace(/\s+/g,' ').trim();
const unique=xs=>[...new Set(xs.map(clean).filter(Boolean))];
function refs(value){
 if(Array.isArray(value))return [...new Set(value.map(Number).filter(n=>n>0&&Number.isInteger(n)))];
 const out=[];for(const m of String(value||'').matchAll(/slides?\s+(\d+)(?:\s*[–—-]\s*(\d+))?/gi)){for(let n=+m[1];n<=Math.min(+(m[2]||m[1]),+m[1]+100);n++)out.push(n);}return [...new Set(out)];
}
function question(q,fallback){
 if(!q||typeof q!=='object')return null;
 const text=clean(q.question||q.q),rawOptions=q.options||q.o||[],options=(Array.isArray(rawOptions)?rawOptions:[]).map(clean),answer=Number(q.answer_index??q.a);
 if(!text)return null;
 const explanation=clean(q.explanation||q.why||q.answer),slide_refs=refs(q.slide_refs?.length?q.slide_refs:explanation+' '+text);
 return {question:text,options:options.length>1&&Number.isInteger(answer)&&answer>=0&&answer<options.length?options:[],answer_index:answer,explanation,slide_refs:slide_refs.length?slide_refs:refs([fallback]),kind:q.kind||'guide'};
}
function recall(note){
 if(['cover','admin'].includes(note.kind))return [];
 const points=unique([...(note.key_points||[]),...String(note.explain||'').split(/\n\n/)]).filter(s=>s.length>18);
 const chain=points.find(s=>s.includes('→'));
 const label=(note.labels||[]).find(l=>l.text&&l.explain);
 const answer=chain||label?.explain||points.slice(0,3).join('\n');
 if(!answer)return [];
 return [{question:chain?'Trace this mechanism from the first step to the final effect.':label?'What does '+label.text+' identify, and what does the slide tell you about it?':'Explain '+(note.title||'this slide')+' in your own words. What are the key details?',options:[],explanation:answer,slide_refs:[note.n],kind:note.origin==='source'?'source recall':'recall'}];
}
function prepare(data){
 const chapters=data.chapters||[],slides=data.slides||[],questions=[],seen=new Set();
 function add(raw,fallback){const q=question(raw,fallback),key=q&&q.question+'::'+q.slide_refs.join(',');if(q&&!seen.has(key)){seen.add(key);questions.push(q);}}
 (data.questions||data.quiz||[]).forEach(q=>add(q));
 chapters.forEach(ch=>(ch.questions||[]).forEach(q=>add(q,ch.slide_end)));
 slides.forEach(s=>(s.questions?.length?s.questions:recall(s)).forEach(q=>add(q,s.n)));
 const cheat_sheet=(data.cheat_sheet||[]).filter(c=>c.html||c.paragraphs?.length||c.bullets?.length).map(c=>({...c,bullets:unique(c.bullets||[]),paragraphs:unique(c.paragraphs||[])}));
 const covered=new Set(cheat_sheet.flatMap(c=>refs(c.slide_refs)));
 for(const s of slides){
  if(['cover','admin'].includes(s.kind)||covered.has(s.n))continue;
  const bullets=unique(s.revision?.length?s.revision:s.key_points||[]),paragraphs=s.explain?[s.explain]:[];
  const existing=cheat_sheet.find(c=>!c.html&&!c.slide_refs?.length&&c.heading===s.title);
  if(existing){existing.bullets=unique([...existing.bullets,...bullets]);existing.paragraphs=unique([...existing.paragraphs,...paragraphs]);existing.slide_refs=[s.n];}
  else if(bullets.length||paragraphs.length)cheat_sheet.push({heading:s.title,bullets,paragraphs,slide_refs:[s.n],origin:s.origin});
 }
 if(!cheat_sheet.length)for(const ch of chapters)cheat_sheet.push({heading:ch.title,paragraphs:unique((ch.concepts||[]).map(c=>c.explain)),bullets:unique((ch.concepts||[]).flatMap(c=>c.key_points||[])),slide_refs:refs([ch.slide_start,ch.slide_end])});
 const supplied=typeof data.final_understanding==='string'?[{heading:'Lecture overview',explain:data.final_understanding}]:Array.isArray(data.final_understanding)?data.final_understanding:[];
 const final_understanding=supplied.length?supplied.map(c=>typeof c==='string'?{heading:'Key connection',explain:c}:c):chapters.map(ch=>({heading:ch.title,explain:clean(ch.understanding||ch.summary||ch.intro||(ch.concepts||[]).map(c=>c.explain).find(Boolean)),points:unique((ch.concepts||[]).flatMap(c=>c.key_points||[])).slice(0,4),slide_refs:refs([ch.slide_start,ch.slide_end])}));
 const cards=data.flashcards?.length?data.flashcards:questions.filter(q=>q.explanation).map(q=>({question:q.question,answer:(q.options.length?q.options[q.answer_index]+'. ':'')+q.explanation,slide_refs:q.slide_refs}));
 const flashcards=cards.map(c=>({question:clean(c.question||c.front||c[0]),answer:clean(c.answer||c.back||c[1]),slide_refs:refs(c.slide_refs?.length?c.slide_refs:c.answer||c.back||c[1])})).filter(c=>c.question&&c.answer);
 return {chapters,questions,cheat_sheet,final_understanding,flashcards};
}
const api={refs,question,recall,prepare};
if(typeof module==='object'&&module.exports)module.exports=api;else root.StudyAtlasLearning=api;
})(typeof window!=='undefined'?window:globalThis);
