(()=>{
const DUE=[
 {module:'mdsa20030',date:'2026-10-09T15:00:00',title:'In-course assessment',meta:'30% · 110 min · B004/B005 HEA',kind:'assessment'},
 {module:'anat20040',date:'2026-10-09T23:59:00',title:'NeuroHacks initial plan',meta:'Feedback submission window closes at the end of Week 5',kind:'project',approx:true},
 {module:'anat20060',date:'2026-10-28T12:15:00',title:'SAQ assessment',meta:'10 min · C004 HEA',kind:'assessment'},
 {module:'path30080',date:'2026-10-30T23:59:00',title:'Continuous assessment',meta:'2 selected topics · 20% · end of Week 8',kind:'assignment'},
 {module:'mdsa20010',date:'2026-11-26T14:00:00',title:'Anatomy spotter',meta:'50 min · C005 HEA · 10%',kind:'assessment'},
 {module:'anat20040',date:'2026-11-27T23:59:00',title:'NeuroHacks final video',meta:'30% · due by Week 12; exact clock time not stated',kind:'project',approx:true},
 {module:'path30080',date:'2026-11-29T23:59:00',title:'BMJ certificates',meta:'3 certificates · 5%',kind:'assignment'},
 {module:'mdsa20030',label:'December · TBA',title:'End-of-term examination',meta:'70% · 2 hours',kind:'exam'},
 {module:'path30080',label:'December · TBA',title:'Exit examination',meta:'75% · 2 hours',kind:'exam'},
 {module:'mdsa20010',label:'End of term · TBA',title:'Exit examination',meta:'80% · 45-mark paper',kind:'exam'},
 {module:'anat20040',label:'End of term · TBA',title:'Exit examination',meta:'70% · 2 hours',kind:'exam'}
];
const NO_DATES=['nmhs10100'];
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const modules=window.__ATLAS_MODULES__||[];
const byId=id=>modules.find(m=>m.id===id)||{id,code:id.toUpperCase(),name:id};
const now=()=>new Date();
function daysUntil(iso){const a=now(),b=new Date(iso);a.setHours(0,0,0,0);b.setHours(0,0,0,0);return Math.round((b-a)/86400000)}
function badge(x){
 if(!x.date)return '<span class="atlas-due-when tba">TBA</span>';
 const n=daysUntil(x.date); if(n<0)return '<span class="atlas-due-when past">Passed</span>';
 if(n===0)return '<span class="atlas-due-when urgent">Today</span>';
 if(n===1)return '<span class="atlas-due-when urgent">Tomorrow</span>';
 if(n<=7)return '<span class="atlas-due-when urgent">'+n+' days</span>';
 return '<span class="atlas-due-when">'+n+' days</span>';
}
function dateText(x){
 if(!x.date)return esc(x.label||'TBA');
 const d=new Date(x.date);
 return d.toLocaleString(undefined,{weekday:'short',day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'});
}
function render(){
 const quick=document.querySelector('#rootPage .quickaccess'),main=document.querySelector('#rootPage main');
 if(!main||document.getElementById('atlasDueBoard'))return;
 const dated=DUE.filter(x=>x.date&&new Date(x.date)>=new Date(now().getTime()-86400000)).sort((a,b)=>new Date(a.date)-new Date(b.date));
 const tba=DUE.filter(x=>!x.date);
 const section=document.createElement('section');section.id='atlasDueBoard';section.className='atlas-due-board';
 const next=dated[0],nextMod=next?byId(next.module):null;
 section.innerHTML=
 '<div class="atlas-due-top"><div><span class="atlas-due-kicker">YOUR DEADLINES</span><h2>What’s due next</h2><p>All modules together, ordered by the nearest deadline.</p></div>'+
 (next?'<div class="atlas-next-chip"><small>NEXT</small><b>'+esc(nextMod.code)+'</b><span>'+esc(next.title)+'</span></div>':'')+'</div>'+
 '<div class="atlas-due-list">'+dated.map((x,i)=>{const m=byId(x.module);return '<article class="atlas-due-row '+(i===0?'first':'')+'"><div class="atlas-due-rank">'+String(i+1).padStart(2,'0')+'</div><div class="atlas-due-main"><div class="atlas-due-module">'+esc(m.code)+' · '+esc(m.name)+'</div><h3>'+esc(x.title)+'</h3><p>'+esc(x.meta)+(x.approx?' · <em>week-based date</em>':'')+'</p></div><div class="atlas-due-date"><b>'+dateText(x)+'</b>'+badge(x)+'</div></article>'}).join('')+'</div>'+
 (tba.length?'<details class="atlas-due-tba"><summary>Later / date still TBA <span>'+tba.length+'</span></summary><div>'+tba.map(x=>{const m=byId(x.module);return '<div class="atlas-due-mini"><b>'+esc(m.code)+'</b><span>'+esc(x.title)+' · '+esc(x.meta)+'</span><small>'+esc(x.label||'TBA')+'</small></div>'}).join('')+'</div></details>':'')+
 '<div class="atlas-due-missing">'+NO_DATES.map(id=>{const m=byId(id);return '<span><b>'+esc(m.code)+'</b> no assessment deadline imported yet</span>'}).join('')+'</div>';
 if(quick?.nextSibling)main.insertBefore(section,quick.nextSibling);else main.prepend(section);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',render,{once:true});else render();
})();