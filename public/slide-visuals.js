(function(root){
'use strict';
const clean=s=>String(s??'').replace(/\s+/g,' ').trim();
const norm=s=>/^(asterisk|\*)$/i.test(clean(s))?'asterisk':clean(s).normalize('NFKC').toLowerCase().replace(/[^a-z0-9]/g,'');
const colors=['#ffd86b','#72e8c3','#9db8ff','#ff9fb8','#d0a0ff','#8ee0f5'];
function captionLabels(text){
 const result=[];
 for(const m of String(text||'').matchAll(/\bAsterisk\s+([^,;\n]{3,100})/gi))result.push({text:'Asterisk',explain:clean(m[1]),origin:'caption'});
 // Use the caption's own abbreviation key; no anatomy locations are guessed.
 const pattern=/(?:^|[\s,;.(])([A-Z][A-Z0-9]{1,7}|Asterisk)\s*(?:[=:–—-]\s*)?([a-z][^,;\n]{3,100})(?=[,;\n]|$)/g;
 for(const m of String(text||'').matchAll(pattern)){
  const meaning=clean(m[2]);if(/https?:|\b(?:is|are|was|has|can|will|and)\b/i.test(meaning)||meaning.split(' ').length>9)continue;
  result.push({text:m[1],explain:meaning,origin:'caption'});
 }return result;
}
function candidates(note,page){
 const all=[...(note.labels||[]).filter(l=>l&&typeof l==='object'),...captionLabels(page.text),...(note.definitions||[]).map(d=>({text:d.term,explain:d.meaning,origin:'glossary'}))];
 const seen=new Set();return all.filter(l=>{const key=norm(l.text);if(!key||seen.has(key)||!l.explain)return false;seen.add(key);return true;}).map((l,i)=>({...l,index:i+1,color:colors[i%colors.length]}));
}
function locate(labels,boxes){
 return labels.map(l=>({...l,boxes:(boxes||[]).filter(b=>norm(b.text)===norm(l.text)&&b.w>0&&b.h>0&&b.w<.5&&b.h<.18&&b.x>=0&&b.y>=0&&b.x+b.w<=1.02&&b.y+b.h<=1.02&&(b.confidence==null||b.confidence>=65))})).filter(l=>l.boxes.length);
}
function sequences(note,page){
 const seen=new Set(),out=[];
 for(const line of [page.text,note.explain,...(note.key_points||[])].filter(Boolean).flatMap(s=>String(s).split(/[\n;]|(?<=[.!?])\s+/))){
  if(!line.includes('→'))continue;
  const steps=line.split('→').map(clean).filter(Boolean);if(steps.length<2||steps.length>9||steps.some(s=>s.length>180))continue;
  const key=norm(line);if(seen.has(key))continue;seen.add(key);out.push(steps);
 }return out.slice(0,4);
}
function relationships(note,page){
 const result=[],seen=new Set();
 for(const sentence of [note.explain,page.text].filter(Boolean).flatMap(s=>String(s).split(/[.!?;\n]/))){
  const match=clean(sentence).match(/^(?:The\s+)?([a-z][a-z -]{1,55}?)\s+(?:sits|lies|is located|is situated|is)\s+(anterior to|posterior to|superior to|inferior to|medial to|lateral to|above|below|beneath)\s+(?:the\s+)?([a-z][a-z -]{1,55}?)(?=\s+and\s|,|$)/i);
  if(!match)continue;const key=norm(match[0]);if(seen.has(key))continue;seen.add(key);
  result.push({subject:clean(match[1]),relation:match[2],object:clean(match[3])});
 }return result.slice(0,4);
}
function plan(note,page){const labels=candidates(note,page);return {labels,located:locate(labels,[...(page.boxes||[]),...(page.ocrBoxes||[])]),sequences:sequences(note,page),relationships:relationships(note,page)};}
function cropFor(labels){
 const boxes=labels.flatMap(l=>l.boxes),pad=.08;if(!boxes.length)return null;
 const x=Math.max(0,Math.min(...boxes.map(b=>b.x))-pad),y=Math.max(0,Math.min(...boxes.map(b=>b.y))-pad),right=Math.min(1,Math.max(...boxes.map(b=>b.x+b.w))+pad),bottom=Math.min(1,Math.max(...boxes.map(b=>b.y+b.h))+pad);
 return {x,y,w:right-x,h:bottom-y};
}
function ocrBoxes(tsv,width,height){
 return String(tsv||'').split('\n').slice(1).map(line=>{
  const c=line.split('\t');if(c[0]!=='5'||+c[10]<65||!clean(c[11]))return null;
  return {text:clean(c.slice(11).join(' ')),x:+c[6]/width,y:+c[7]/height,w:+c[8]/width,h:+c[9]/height,confidence:+c[10],origin:'ocr'};
 }).filter(Boolean);
}
const api={captionLabels,candidates,locate,sequences,relationships,plan,cropFor,ocrBoxes};
if(typeof module==='object'&&module.exports)module.exports=api;else root.StudyAtlasVisuals=api;
})(typeof window!=='undefined'?window:globalThis);
