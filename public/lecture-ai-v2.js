(()=>{
  // Make the hosted Netlify AI the default. On-device remains available as an optional fallback.
  function boot(){
    const cloud=document.getElementById('atlasAICloud');
    const local=document.getElementById('atlasAILocal');
    const badge=document.getElementById('atlasAIBadge');
    const status=document.getElementById('atlasAIStatus');
    const setup=document.getElementById('atlasAISetup');
    if(!cloud) return;
    cloud.textContent='✦ Study Atlas AI';
    if(local) local.textContent='⚡ Device';
    const chooseCloud=()=>{ try{cloud.click()}catch(_){} };
    fetch('/api/ai/status',{cache:'no-store'})
      .then(r=>r.json().then(j=>({ok:r.ok,j})))
      .then(({ok,j})=>{
        if(ok&&j?.ready){
          chooseCloud();
          if(badge){badge.textContent=j.model||'Cloud AI';badge.className='atlas-ai-badge'}
          if(status) status.textContent='Connected · current slide context is added automatically.';
          if(setup) setup.hidden=true;
        }else{
          if(badge){badge.textContent='AI unavailable';badge.className='atlas-ai-badge bad'}
          if(status) status.textContent='AI Gateway is not available on this deploy yet.';
        }
      })
      .catch(()=>{
        if(badge){badge.textContent='AI offline';badge.className='atlas-ai-badge bad'}
        if(status) status.textContent='Could not reach the Study Atlas AI function.';
      });
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',()=>setTimeout(boot,120),{once:true});
  else setTimeout(boot,120);
})();