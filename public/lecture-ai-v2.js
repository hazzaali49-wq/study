(()=>{
  function boot(){
    const cloud=document.getElementById('atlasAICloud');
    const local=document.getElementById('atlasAILocal');
    const badge=document.getElementById('atlasAIBadge');
    const status=document.getElementById('atlasAIStatus');
    const setup=document.getElementById('atlasAISetup');
    const toggle=document.getElementById('atlasAIToggle');
    if(!cloud) return;

    cloud.textContent='✦ Study Atlas AI';
    cloud.style.display='inline-flex';
    if(local) local.style.display='none';

    async function selectHosted(){
      try{
        const r=await fetch('/api/ai/status',{cache:'no-store'});
        const j=await r.json().catch(()=>({}));
        if(!r.ok || !j?.ready) throw new Error(j?.error||'AI gateway unavailable');
        cloud.click();
        if(badge){badge.textContent=j.model||'Study Atlas AI';badge.className='atlas-ai-badge'}
        if(status) status.textContent='Connected · this slide and nearby lecture context are included automatically.';
        if(setup) setup.hidden=true;
        return true;
      }catch(e){
        if(badge){badge.textContent='AI unavailable';badge.className='atlas-ai-badge bad'}
        if(status) status.textContent='Study Atlas AI is not available on this Netlify deploy yet.';
        return false;
      }
    }

    // Hosted AI is the default every time the panel opens.
    selectHosted();
    toggle?.addEventListener('click',()=>setTimeout(selectHosted,80),true);
    cloud.addEventListener('click',()=>{ if(setup) setup.hidden=true; },true);
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',()=>setTimeout(boot,180),{once:true});
  else setTimeout(boot,180);
})();