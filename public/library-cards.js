(function(root){
'use strict';
function identity(moduleId,number,fallback){const n=Number(number);return moduleId+'::'+(Number.isInteger(n)&&n>0?'lecture-'+n:fallback);}
function numberOf(card){return Number(card.querySelector('.lecturevisual b')?.textContent.match(/LECTURE\s+(\d+)/i)?.[1])||0;}
function legacyKey(card,moduleId){const a=card.querySelector('a.primary,[href*="/generated/"],[href*="/lectures/"]');return moduleId+'::'+(a?.getAttribute('href')||card.querySelector('h3')?.textContent.trim()||'lecture');}
function restore(){
 document.querySelectorAll('.lecturegrid').forEach(grid=>{
  for(const card of [...grid.querySelectorAll('.atlas-lecture-version')]){card.classList.remove('atlas-lecture-version');card.classList.add('lecture');grid.appendChild(card);}
  grid.querySelectorAll('.atlas-saved-versions').forEach(el=>el.remove());
 });
}
const preparedIds=new Set(['hypo','anterior','growth-hormone-igf-axis','thyroid-physiology','calcium-homeostasis','introduction-fascia','os-coxae-femur','gluteal-region','posterior-thigh','medial-thigh']);
function preparedCard(card){return preparedIds.has(card.querySelector('[data-lecture]')?.dataset.lecture);}
function reconcile(){
 restore();let total=0;
 let progress={};try{progress=JSON.parse(localStorage.getItem('atlasLectureProgress.v2')||'{}');}catch{}
 for(const grid of document.querySelectorAll('.lecturegrid')){
  const lib=grid.closest('.library'),moduleId=lib.id.replace('module-',''),groups=new Map();
  for(const card of [...grid.children].filter(c=>c.classList.contains('lecture'))){
   const old=legacyKey(card,moduleId),key=identity(moduleId,numberOf(card),old);card.dataset.progressKey=key;
   if(!(key in progress)&&progress[old])progress[key]=true;
   if(!groups.has(key))groups.set(key,[]);groups.get(key).push(card);
  }
  for(const group of groups.values()){
   // Prefer verified site-hosted slides; retain every uploaded version and its notes below.
   group.sort((a,b)=>Number(preparedCard(b))-Number(preparedCard(a))||(Number(b.dataset.savedAt)||0)-(Number(a.dataset.savedAt)||0)||Number(!!(b.dataset.localLecture||b.dataset.netlifyLecture))-Number(!!(a.dataset.localLecture||a.dataset.netlifyLecture)));
   const main=group[0];grid.appendChild(main);
   if(group.length>1){
    const versions=document.createElement('details');versions.className='atlas-saved-versions';
    const summary=document.createElement('summary');summary.textContent='Other saved versions ('+(group.length-1)+') · guides, originals & notes';versions.appendChild(summary);
    for(const card of group.slice(1)){card.classList.remove('lecture');card.classList.add('atlas-lecture-version');card.querySelector('.atlas-complete-row')?.remove();versions.appendChild(card);}
    main.querySelector('.lecturebody').appendChild(versions);
   }
  }
  const cards=[...grid.children].filter(c=>c.classList.contains('lecture')).sort((a,b)=>(numberOf(a)||999)-(numberOf(b)||999));cards.forEach(c=>grid.appendChild(c));
  const count=cards.length;total+=count;const small=lib.querySelector('.libhead small');if(small)small.textContent=count+' lecture'+(count===1?'':'s');
  const badge=document.querySelector('[data-module="'+moduleId+'"]')?.closest('.module')?.querySelector('.badge');if(badge){badge.textContent=count?count+' lecture'+(count===1?'':'s')+' ready':'Lectures coming soon';badge.classList.toggle('empty',!count);}
 }
 try{localStorage.setItem('atlasLectureProgress.v2',JSON.stringify(progress));}catch{}
 const count=document.getElementById('lectureCount');if(count)count.textContent=total+' lectures ready';
 root.dispatchEvent(new CustomEvent('atlas:library-reconciled'));
}
const api={identity,numberOf,legacyKey,restore,reconcile};
if(typeof module==='object'&&module.exports)module.exports=api;else {root.StudyAtlasLibraryCards=api;if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',reconcile,{once:true});else reconcile();}
})(typeof window!=='undefined'?window:globalThis);
