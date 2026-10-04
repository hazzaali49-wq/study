(function(root){
  'use strict';
  const clean=s=>String(s||'').replace(/\s+/g,' ').trim();
  const words=s=>clean(s).toLowerCase().match(/[a-z0-9]+/g)||[];
  const TERMS={
    GH:'growth hormone, a pituitary hormone that promotes growth and affects metabolism',
    IGF:'insulin-like growth factor, a signal that mediates many growth hormone effects',
    ADH:'antidiuretic hormone, a hormone that helps the kidneys retain water',
    AVP:'arginine vasopressin, another name for antidiuretic hormone',
    AQP2:'aquaporin-2, a water channel in kidney collecting duct cells',
    hypothalamus:'a brain region that helps control hormones and internal conditions',
    pituitary:'a small gland below the brain that releases hormones',
    receptor:'a protein that detects a signal and triggers a response',
    nuclei:'groups of nerve cell bodies in the brain or spinal cord',
    axon:'the long part of a nerve cell that carries signals away from its cell body',
    homeostasis:'keeping the body’s internal conditions within a stable range',
    coronal:'a vertical view that separates the front from the back',
    sagittal:'a vertical view that separates left from right',
    plexus:'an interconnected network, often of nerves or blood vessels',
    hormone:'a chemical messenger that acts on cells with the right receptors',
    synapse:'a junction where one nerve cell communicates with another cell'
  };
  function definitions(text){
    return Object.entries(TERMS).filter(([term])=>new RegExp('\\b'+term+'\\b','i').test(text)).slice(0,4).map(([term,meaning])=>({term,meaning}));
  }
  function classify(page){
    const lines=page.lines||[],heading=clean(lines[0]||'');
    if(!clean(page.text))return 'visual';
    if(/\blearning (objectives?|outcomes?)\b/i.test(lines.slice(0,5).join(' ')+' '+(String(page.text||'').length<1800?page.text:'')))return 'admin';
    if(/^(learning (objectives?|outcomes?)|references?|reading list|bibliography|thank you|module information|timetable)\b/i.test(heading))return 'admin';
    if(page.n===1&&lines.length<=3&&!/[→↑↓]/.test(page.text))return 'cover';
    return 'teaching';
  }
  function fromPage(page){
    const lines=(page.lines||[]).map(clean).filter(Boolean),kind=classify(page);
    const points=lines.slice(1).filter(x=>x.length>12&&!/^\d+$/.test(x));
    return {n:page.n,title:(lines[0]||'Slide '+page.n).slice(0,140),kind,
      explain:kind==='admin'||kind==='cover'?'Source slide preserved for reference.':kind==='visual'?'This slide is mainly visual. Use the picture and its labels; text extraction cannot explain an unlabelled image.':'',
      key_points:points,source:page.text||'',source_lines:lines,
      definitions:definitions(page.text||''),labels:[],origin:'source'};
  }
  function selectSource(context,question,max=1800){
    const query=new Set(words(question).filter(w=>w.length>2)),lines=String(context||'').split(/\n|(?<=[.!?])\s+/).map(clean).filter(Boolean);
    const ranked=lines.map((line,i)=>({line,i,score:words(line).reduce((n,w)=>n+(query.has(w)?1:0),0)})).sort((a,b)=>b.score-a.score||a.i-b.i);
    const chosen=(ranked.some(x=>x.score)?ranked.filter(x=>x.score):ranked).slice(0,5).sort((a,b)=>a.i-b.i);
    return chosen.map(x=>x.line).join('\n').slice(0,max);
  }
  function sourceAnswer(question,context){
    const study=String(context||'').match(/Study explanation:\s*([\s\S]*?)(?:Original slide text:|$)/i)?.[1]?.trim();
    if(study){
      const selected=selectSource(study,question,1100),defs=definitions(question).filter(d=>!selected.toLowerCase().includes(d.meaning.toLowerCase())).slice(0,2);
      if(selected)return [defs.map(d=>d.term+' means '+d.meaning+'.').join('\n'),'From your slide explanation:',selected].filter(Boolean).join('\n\n');
    }
    const selected=selectSource(context,question,950),defs=definitions(question+' '+selected).slice(0,2);
    const intro=defs.map(d=>d.term+' means '+d.meaning+'.').join('\n');
    if(!selected)return intro||'There is no readable source text for this question. Open the original slide or enable the on-device model to interpret the picture.';
    return [intro,'Relevant lecture text:',selected].filter(Boolean).join('\n\n');
  }
  const api={clean,definitions,classify,fromPage,selectSource,sourceAnswer};
  if(typeof module==='object'&&module.exports)module.exports=api;else root.StudyAtlasSlideNotes=api;
})(typeof window!=='undefined'?window:globalThis);
