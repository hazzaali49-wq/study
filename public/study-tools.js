(()=>{
const MODS={
 nmhs10100:{code:'NMHS10100',name:'Health across the Lifespan',a:'#ef92c9',b:'#79bce9'},
 path30080:{code:'PATH30080',name:'Disease Mechanisms & Pharmacology',a:'#ff7f82',b:'#f4b15f'},
 mdsa20030:{code:'MDSA20030',name:'Endocrine Biology',a:'#a784ff',b:'#5ed6bd'},
 mdsa20010:{code:'MDSA20010',name:'GIT / Liver Biology',a:'#69d39d',b:'#55b8aa'},
 anat20060:{code:'ANAT20060',name:'Locomotor Biology',a:'#7da6ff',b:'#d6a86e'},
 anat20040:{code:'ANAT20040',name:'Neurosciences',a:'#65cce8',b:'#7b8cff'}
};
const PROG='atlasLectureProgress.v2', TIME='atlasStudyTime.v2', SESSION='atlasTimerSession.v2';
const read=(k,d)=>{try{return JSON.parse(localStorage.getItem(k))??d}catch{return d}};
const write=(k,v)=>localStorage.setItem(k,JSON.stringify(v));
const fmt=s=>{s=Math.max(0,Math.floor(s||0));const h=Math.floor(s/3600),m=Math.floor(s%3600/60),x=s%60;return (h?String(h).padStart(2,'0')+':':'')+String(m).padStart(2,'0')+':'+String(x).padStart(2,'0')};
function moduleFromText(t=''){t=t.toLowerCase();for(const [id,m] of Object.entries(MODS))if(t.includes(m.code.toLowerCase())||t.includes(m.name.toLowerCase()))return id;if(t.includes('pituitary')||t.includes('endocrine'))return'mdsa20030';return''}
function currentModule(){
 const b=document.body.dataset.atlasModule;if(b&&MODS[b])return b;
 const path=location.pathname.toLowerCase(),text=(document.title+' '+(document.querySelector('.code,.kicker,.eyebrow,.crumb')?.textContent||''));
 if(path.includes('hypothalamus')||path.includes('anterior-pituitary'))return'mdsa20030';
 return moduleFromText(text)||'';
}
function applyModule(id){if(!id||!MODS[id])return;document.body.dataset.atlasModule=id;document.documentElement.style.setProperty('--atlas-mod',MODS[id].a);document.documentElement.style.setProperty('--atlas-mod2',MODS[id].b)}
function keyFor(card,id){const a=card.querySelector('a.primary,[href*="/generated/"],[href*="/lectures/"]');const href=a?.getAttribute('href')||'';const title=card.querySelector('h3')?.textContent?.trim()||href||'lecture';return id+'::'+(href||title)}
function decorateDashboard(){
 const modules=[...document.querySelectorAll('#modules .module')];
 modules.forEach(card=>{const id=moduleFromText(card.textContent);if(!id)return;card.dataset.atlasModule=id;card.style.setProperty('--mod',MODS[id].a);card.style.setProperty('--mod2',MODS[id].b)});
 document.querySelectorAll('.library').forEach(lib=>{const id=lib.id.replace('module-','');if(MODS[id]){lib.dataset.atlasModule=id;lib.style.setProperty('--mod',MODS[id].a);lib.style.setProperty('--mod2',MODS[id].b)}});
 refreshLectures();
}
function refreshLectures(){
 const p=read(PROG,{});
 document.querySelectorAll('.library').forEach(lib=>{
   const id=lib.id.replace('module-','');if(!MODS[id])return;
   const cards=[...lib.querySelectorAll('.lecture')];
   cards.forEach(card=>{
     card.style.setProperty('--mod',MODS[id].a);card.style.setProperty('--mod2',MODS[id].b);
     const k=keyFor(card,id);
     let row=card.querySelector('.atlas-complete-row');
     if(!row){row=document.createElement('div');row.className='atlas-complete-row';row.innerHTML='<label><input type="checkbox"> <span>Completed</span></label><small>progress</small>';const body=card.querySelector('.lecturebody');body?.insertBefore(row,body.querySelector('.lecturelinks'));row.querySelector('input').onchange=e=>{p[k]=!!e.target.checked;write(PROG,p);refreshLectures()}}
     const chk=row.querySelector('input');chk.checked=!!p[k];row.classList.toggle('done',chk.checked);
   });
   const done=cards.filter(c=>p[keyFor(c,id)]).length,total=cards.length,pct=total?Math.round(done/total*100):0;
   let bar=lib.querySelector('.atlas-module-progress');
   if(!bar){bar=document.createElement('div');bar.className='atlas-module-progress';const desc=lib.querySelector('.libdesc');desc?.after(bar)}
   bar.innerHTML='<div class="atlas-module-progress-head"><span>Module progress</span><b>'+done+'/'+total+' · '+pct+'%</b></div><div class="atlas-module-progress-track"><div class="atlas-module-progress-fill" style="width:'+pct+'%"></div></div><div class="atlas-module-time">Study time: <strong>'+fmt((read(TIME,{})[id]||0))+'</strong></div>';
   const mod=[...document.querySelectorAll('#modules .module')].find(x=>x.dataset.atlasModule===id);
   if(mod){
     let mb=mod.querySelector('.atlas-module-progress');if(!mb){mb=document.createElement('div');mb.className='atlas-module-progress';mod.querySelector('.module p')?.after(mb)}
     mb.innerHTML='<div class="atlas-module-progress-head"><span>Progress</span><b>'+pct+'%</b></div><div class="atlas-module-progress-track"><div class="atlas-module-progress-fill" style="width:'+pct+'%"></div></div><div class="atlas-module-time"><strong>'+fmt((read(TIME,{})[id]||0))+'</strong> studied</div>';
   }
 });
}
function timerUI(){
 if(document.getElementById('atlasTimerModal'))return;
 const id=currentModule()||'mdsa20030';applyModule(id);
 const modal=document.createElement('div');modal.id='atlasTimerModal';modal.hidden=true;modal.innerHTML='<div class="atlas-timer-back" data-tclose></div><section class="atlas-timer-panel"><div class="atlas-timer-head"><div><div class="atlas-timer-kicker" id="atlasTimerKicker"></div><h2>Study timer</h2></div><button class="atlas-timer-close" data-tclose>×</button></div><div class="atlas-timer-body"><div class="atlas-timer-modes"><button class="atlas-timer-mode active" data-mode="stopwatch">Stopwatch</button><button class="atlas-timer-mode" data-mode="countdown">Countdown</button></div><div class="atlas-timer-display"><div class="digits" id="atlasTimerDigits">00:00</div><small id="atlasTimerStatus">Ready when you are</small></div><div class="atlas-timer-presets" id="atlasTimerPresets" hidden><button data-min="25">25 min</button><button data-min="45">45 min</button><button data-min="60">60 min</button><button data-min="90">90 min</button></div><div class="atlas-timer-custom" id="atlasTimerCustom" hidden><input id="atlasTimerMinutes" type="number" min="1" max="600" value="45"><span>minutes</span></div><div class="atlas-timer-actions"><button class="atlas-timer-reset" id="atlasTimerReset">Reset</button><button class="atlas-timer-start" id="atlasTimerStart">Start</button></div><div class="atlas-timer-total-stack"><div class="atlas-timer-total"><span>This module</span><b id="atlasTimerTotal">00:00</b></div><div class="atlas-timer-total"><span>All modules</span><b id="atlasTimerGrandTotal">00:00</b></div></div><div class="atlas-timer-session" id="atlasTimerSession"></div></div></section>';document.body.appendChild(modal);
 const makeBtn=()=>{const b=document.createElement('button');b.id='atlasTimerBtn';b.innerHTML='<span class="live"></span><span>Timer</span>';b.onclick=()=>{modal.hidden=false;renderTimer()};return b};
 const head=document.querySelector('#rootPage .head')||document.querySelector('.top-right')||document.querySelector('header .top');
 if(head){const b=makeBtn();if(head.querySelector('.atlas-top-actions'))head.querySelector('.atlas-top-actions').prepend(b);else head.appendChild(b)}
 else{const wrap=document.createElement('div');wrap.id='atlasTimerFloat';wrap.appendChild(makeBtn());document.body.appendChild(wrap)}
 modal.querySelectorAll('[data-tclose]').forEach(x=>x.onclick=()=>modal.hidden=true);
 modal.querySelectorAll('.atlas-timer-mode').forEach(b=>b.onclick=()=>{let ses=read(SESSION,null);if(ses?.running)return;modal.querySelectorAll('.atlas-timer-mode').forEach(x=>x.classList.toggle('active',x===b));modal.dataset.mode=b.dataset.mode;renderTimer()});
 modal.querySelectorAll('[data-min]').forEach(b=>b.onclick=()=>{document.getElementById('atlasTimerMinutes').value=b.dataset.min;renderTimer()});
 document.getElementById('atlasTimerStart').onclick=toggleTimer;
 document.getElementById('atlasTimerReset').onclick=resetTimer;
}
function sessionMode(){const modal=document.getElementById('atlasTimerModal');return modal?.dataset.mode||'stopwatch'}
function syncTime(){
 let ses=read(SESSION,null);if(!ses?.running)return;
 const now=Date.now(),last=Number(ses.lastTick||now),delta=Math.max(0,Math.min(5,Math.floor((now-last)/1000)));
 if(delta>0){const totals=read(TIME,{});totals[ses.module]=(totals[ses.module]||0)+delta;write(TIME,totals);ses.elapsed=(ses.elapsed||0)+delta;ses.lastTick=last+delta*1000;
   if(ses.mode==='countdown'&&ses.elapsed>=ses.duration){ses.elapsed=ses.duration;ses.running=false;try{new Audio('data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=').play()}catch{}}
   write(SESSION,ses);
 }
}
function toggleTimer(){
 let ses=read(SESSION,null),id=currentModule()||'mdsa20030',mode=sessionMode();
 if(ses?.running){syncTime();ses=read(SESSION,null);ses.running=false;write(SESSION,ses);renderTimer();return}
 if(!ses||ses.module!==id||ses.mode!==mode){const mins=Math.max(1,Number(document.getElementById('atlasTimerMinutes')?.value||45));ses={module:id,mode,elapsed:0,duration:mode==='countdown'?mins*60:0,running:false,lastTick:Date.now()}}
 ses.running=true;ses.lastTick=Date.now();write(SESSION,ses);renderTimer()
}
function resetTimer(){let ses=read(SESSION,null);const id=currentModule()||'mdsa20030',mode=sessionMode(),mins=Math.max(1,Number(document.getElementById('atlasTimerMinutes')?.value||45));write(SESSION,{module:id,mode,elapsed:0,duration:mode==='countdown'?mins*60:0,running:false,lastTick:Date.now()});renderTimer()}
function renderTimer(){
 syncTime();const modal=document.getElementById('atlasTimerModal');if(!modal)return;const id=currentModule()||'mdsa20030',m=MODS[id]||MODS.mdsa20030;applyModule(id);const ses=read(SESSION,null),mode=ses?.module===id?ses.mode:sessionMode();modal.dataset.mode=mode;modal.querySelectorAll('.atlas-timer-mode').forEach(b=>b.classList.toggle('active',b.dataset.mode===mode));document.getElementById('atlasTimerPresets').hidden=mode!=='countdown';document.getElementById('atlasTimerCustom').hidden=mode!=='countdown';
 const active=ses&&ses.module===id&&ses.mode===mode?ses:null,shown=mode==='countdown'?(active?Math.max(0,(active.duration||0)-(active.elapsed||0)):Math.max(1,Number(document.getElementById('atlasTimerMinutes')?.value||45))*60):(active?.elapsed||0);
 document.getElementById('atlasTimerDigits').textContent=fmt(shown);document.getElementById('atlasTimerKicker').textContent=m.code+' · '+m.name;document.getElementById('atlasTimerStatus').textContent=active?.running?(mode==='countdown'?'Focus session running':'Stopwatch running'):active?.elapsed?'Paused':'Ready when you are';document.getElementById('atlasTimerStart').textContent=active?.running?'Pause':active?.elapsed?'Resume':'Start';const totals=read(TIME,{});document.getElementById('atlasTimerTotal').textContent=fmt(totals[id]||0);document.getElementById('atlasTimerGrandTotal').textContent=fmt(Object.values(totals).reduce((a,b)=>a+(Number(b)||0),0));document.getElementById('atlasTimerSession').textContent=active?.elapsed?'This session · '+fmt(active.elapsed):'';
 document.querySelectorAll('#atlasTimerBtn').forEach(b=>b.classList.toggle('running',!!active?.running));refreshLectures()
}
function init(){
 const id=currentModule();if(id)applyModule(id);decorateDashboard();timerUI();renderTimer();
 new MutationObserver(ms=>{if(ms.some(m=>[...m.addedNodes].some(n=>n?.nodeType===1&&(n.matches?.('.lecture')||n.querySelector?.('.lecture')))))setTimeout(decorateDashboard,30)}).observe(document.body,{childList:true,subtree:true});
 setInterval(()=>{syncTime();renderTimer()},1000);addEventListener('storage',()=>renderTimer());
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();