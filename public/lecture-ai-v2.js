(()=>{
  const boot=()=>{
    const badge=document.getElementById('atlasAIBadge'),status=document.getElementById('atlasAIStatus'),cloud=document.getElementById('atlasAICloud');
    if(cloud)cloud.textContent='✦ Free local tutor';
    if(badge)badge.textContent='On-device / source notes';
    if(status)status.textContent='Short answers from this slide. Paid AI is disabled.';
  };
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
