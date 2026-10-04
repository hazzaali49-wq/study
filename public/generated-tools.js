(function generatedTools(){
  const INK_KEY='atlasGeneratedInk.v3';
  const read=(k,d)=>{try{return JSON.parse(localStorage.getItem(k))??d}catch{return d}};
  const write=(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v))}catch{document.getElementById('atlasGTStatus')?.replaceChildren(document.createTextNode('Storage full — export or clear old notes.'));}};
  const legacyKey=()=>location.pathname+'::'+(document.querySelector('h1')?.textContent||document.title);
  const pageKey=()=>window.StudyAtlasReader?.id()?'lecture:'+window.StudyAtlasReader.id():legacyKey();
  const forPage=(key)=>{const all=read(key,{}),aliases=[legacyKey(),...(window.StudyAtlasReader?.aliases?.()||[]),...[...document.querySelectorAll('h1')].map(h=>location.pathname+'::'+h.textContent)];return all[pageKey()]||aliases.map(k=>all[k]).find(Boolean);};
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function currentChapter(){
    if(window.StudyAtlasReader?.current())return window.StudyAtlasReader.current().row;
    const cs=[...document.querySelectorAll('.chapter')], y=innerHeight*.42;
    return cs.find(c=>{const r=c.getBoundingClientRect();return r.top<=y&&r.bottom>=y})||cs[0];
  }
  function currentVisual(){
    if(window.StudyAtlasReader?.current())return window.StudyAtlasReader.current().row;
    const vs=[...document.querySelectorAll('.visualcard')],y=innerHeight*.45;
    return vs.find(v=>{const r=v.getBoundingClientRect();return r.top<=y&&r.bottom>=y})||vs.find(v=>v.getBoundingClientRect().top>0)||vs[0];
  }
  function chapterLabel(){
    const c=currentChapter(),v=currentVisual(),slide=(v?.querySelector('.visualtag')?.textContent||'').trim();
    const ch=(c?.querySelector('.kicker')?.textContent||c?.querySelector('h2')?.textContent||'Current chapter').trim();
    return slide?slide+' · '+ch:ch;
  }
  async function boot(){
    if(!window.StudyAtlasInk){await new Promise((resolve,reject)=>{const s=document.createElement('script');s.src='/ink-engine.js?v=1';s.onload=resolve;s.onerror=reject;document.body.appendChild(s);});}
    if(document.getElementById('atlasGenDock')) return;
    for(const [name,file] of [['StudyAtlasStudyStore','study-store'],['StudyAtlasNotebook','study-notebook']])if(!window[name])await new Promise((resolve,reject)=>{const s=document.createElement('script');s.src='/'+file+'.js?v=1';s.onload=resolve;s.onerror=reject;document.head.appendChild(s);});
    if(!document.querySelector('link[href*="study-notebook.css"]')){const css=document.createElement('link');css.rel='stylesheet';css.href='/study-notebook.css?v=1';document.head.appendChild(css);}
    const Notebook=window.StudyAtlasNotebook,Store=window.StudyAtlasStudyStore;
    const lecture=Notebook.context();
    let storageError='';try{await Store.register(lecture);}catch{storageError='Your saved work could not be opened. Reload to try again.';}
    if(!(document.querySelector('.visualcard')&&document.querySelector('.rail'))) return;
    document.body.classList.add('atlas-generated-v3');

    const dock=document.createElement('div');
    dock.id='atlasGenDock';
    dock.innerHTML=`
      <button class="atlas-gbtn" id="atlasGHome" title="Return to the module menu"><span class="atlas-gicon">←</span><span>Menu</span></button>
      <button class="atlas-gbtn" id="atlasGFocus" aria-pressed="false" title="Hide navigation and open panels"><span class="atlas-gicon">▣</span><span>Hide panels</span></button>
      <div class="atlas-gprogress"><i id="atlasGFill"></i><b id="atlasGPct">0%</b></div>
      <button class="atlas-gbtn" id="atlasGDraw"><span class="atlas-gicon">✎</span><span>Draw</span></button>
      <div class="atlas-gzoom"><button id="atlasGZm">−</button><span id="atlasGZ">100%</span><button id="atlasGZp">+</button></div>
      <button class="atlas-gbtn" id="atlasGBoard"><span class="atlas-gicon">✦</span><span>Board <b id="atlasGBCount"></b></span></button>
      <button class="atlas-gbtn" id="atlasGNote"><span class="atlas-gicon">＋</span><span>Notes <b id="atlasGNCount"></b></span></button>
      <button class="atlas-gbtn" id="atlasGAI"><span class="atlas-gicon">AI</span><span>Ask AI</span></button>
      <button class="atlas-gbtn" id="atlasGTimer"><span class="atlas-gicon">◷</span><span>Timer</span></button>
      <button class="atlas-gbtn" id="atlasGTools"><span class="atlas-gicon">⋮</span><span>Tools</span></button>`;
    document.body.appendChild(dock);

    const tools=document.createElement('div');
    tools.id='atlasGenTools'; tools.hidden=true;
    tools.innerHTML=`
      <div class="atlas-panel-head"><div class="atlas-gt-title">DRAWING TOOLS</div><button data-close-tools aria-label="Close drawing tools">×</button></div>
      <div class="atlas-gt-row">
        <button class="atlas-gt-tool active" data-tool="pen">Pen</button>
        <button class="atlas-gt-tool" data-tool="highlighter">Highlight</button>
        <button class="atlas-gt-tool" data-tool="eraser">Eraser</button>
      </div>
      <div class="atlas-gt-colors">
        ${['#ff4f70','#ffd04a','#61e0b6','#6aa8ff','#a785ff','#ffffff'].map((c,i)=>`<button class="atlas-gt-swatch ${i===0?'active':''}" data-color="${c}" style="--c:${c}"></button>`).join('')}
      </div>
      <label class="atlas-gt-size">Size <input id="atlasGTSize" type="range" min="2" max="24" value="6"></label>
      <div class="atlas-gt-actions"><button id="atlasGTUndo">Undo</button><button id="atlasGTClear">Clear area</button></div><small id="atlasGTStatus"></small>`;
    document.body.appendChild(tools);

    const notes=document.createElement('div');
    notes.id='atlasGenNotes'; notes.hidden=true;
    notes.innerHTML=`
      <div class="atlas-panel-head"><div><h3>Slide notes</h3><small id="atlasGNContext"></small></div><button data-close-note aria-label="Close notes">×</button></div>
      <div class="atlas-notebook-shortcuts"><button id="atlasGNAll">Saved notes</button><button id="atlasGNModule">Module notes</button></div>
      <figure class="atlas-note-preview"><img id="atlasGNPreview" hidden alt="Complete original slide attached to your note"><figcaption id="atlasGNPreviewLabel">Preparing full slide…</figcaption></figure>
      <button id="atlasGNCurrent" class="atlas-pin-btn-gen">Use current slide</button>
      <label class="atlas-gn-label" for="atlasGNText">Your note</label><textarea class="atlas-gn-text" id="atlasGNText" placeholder="Explain it in your own words…"></textarea>
      <label class="atlas-gn-label" for="atlasGNSketch">Sketch (optional)</label><canvas class="atlas-gn-sketch" id="atlasGNSketch" aria-label="Draw a note with your pen or finger"></canvas>
      <div class="atlas-gn-actions"><button id="atlasGNClear">Clear sketch</button><button class="save" id="atlasGNSave">Save note + slide</button></div>
      <span id="atlasGNStatus" role="status" aria-live="polite"></span>
      <h4>Saved in this lecture</h4><div class="atlas-gn-list" id="atlasGNList"></div>`;
    document.body.appendChild(notes);

    const board=document.createElement('div');
    board.id='atlasGenBoard'; board.hidden=true;
    board.innerHTML=`<div class="atlas-panel-head"><div><h3>Study board</h3><small>Full slides, always saved with their source</small></div><button data-close-board aria-label="Close study board">×</button></div><div class="atlas-notebook-shortcuts"><button id="atlasGBCurrent">Pin current slide</button><button id="atlasGBAll">Open full board</button></div><span id="atlasGBStatus" role="status" aria-live="polite"></span><div id="atlasGBList"></div>`;
    document.body.appendChild(board);

    let zoom=1, draw=false, tool='pen', color='#ff4f70', size=6, activeZone=null;
    const zones=[], strokeMap=new Map();

    function zoneId(el,i){
      if(el.id)return 'id:'+el.id;
      if(el.classList.contains('hero'))return 'hero';
      if(el.classList.contains('originalend'))return 'original';
      if(el.classList.contains('chapter'))return 'chapter:'+(el.dataset.start||el.querySelector('.kicker')?.textContent||i);
      return 'main:'+i+':'+([...el.classList].slice(0,2).join('.')||el.tagName.toLowerCase());
    }
    function canvasSize(z){
      if(!z.near)return;
      const w=Math.max(1,z.el.clientWidth),h=Math.max(1,z.el.clientHeight),d=Math.min(2,devicePixelRatio||1,Math.sqrt(3000000/(w*h)));
      const nw=Math.round(w*d),nh=Math.round(h*d);
      if(z.c.width!==nw||z.c.height!==nh){z.c.width=nw;z.c.height=nh;renderZone(z);}
    }
    function renderZone(z){z?.ink?.redraw();}
    let saveTimer;
    function scheduleSave(){clearTimeout(saveTimer);saveTimer=setTimeout(saveInk,250);}
    addEventListener('pagehide',()=>{clearTimeout(saveTimer);saveInk();});
    function saveInk(){
      const all=read(INK_KEY,{}),k=pageKey(),payload={version:4,zones:{...(forPage(INK_KEY)?.zones||{})}};
      zones.forEach(z=>payload.zones[z.id]=strokeMap.get(z.id)||[]);
      all[k]=payload;write(INK_KEY,all);
    }
    const inkObserver=new IntersectionObserver(entries=>{for(const entry of entries){const z=zones.find(z=>z.el===entry.target);if(!z)continue;z.near=entry.isIntersecting;if(z.near)canvasSize(z);else if(!z.ink?.isDrawing()){z.c.width=1;z.c.height=1;z.ink.sync();}}},{rootMargin:'800px 0px'});
    function prepareZone(el,i){
      const id=el.dataset.inkId||zoneId(el,i);el.classList.add('atlas-gdraw-zone');el.dataset.atlasGDrawZone=id;
      const c=document.createElement('canvas');c.className='atlas-gpage-canvas';c.dataset.zone=id;c.width=1;c.height=1;el.appendChild(c);
      const z={el,c,id,near:false};zones.push(z);strokeMap.set(id,[]);
      z.ink=window.StudyAtlasInk.create({canvas:c,getStrokes:()=>strokeMap.get(id)||[],isEnabled:()=>draw,getTool:()=>{activeZone=z;return {tool,color,size};},onChange:scheduleSave});
      new ResizeObserver(()=>{if(!z.ink.isDrawing())canvasSize(z);}).observe(el);inkObserver.observe(el);
    }
    const main=document.querySelector('main'),reader=document.getElementById('atlasSlideReader');
    const drawable=reader?[...reader.querySelectorAll('[data-ink-id]')]:main?[...main.children].filter(el=>!['SCRIPT','STYLE'].includes(el.tagName)&&el.offsetHeight>8):[];
    (drawable.length?drawable:[main].filter(Boolean)).forEach(prepareZone);

    // Migrate the previous visual-only ink format into the containing page zones.
    const saved=forPage(INK_KEY);
    if(saved?.version===4&&saved.zones){
      zones.forEach(z=>{if(Array.isArray(saved.zones[z.id]))strokeMap.set(z.id,saved.zones[z.id]);renderZone(z)});
    }else if(Array.isArray(saved)){
      [...document.querySelectorAll('.visualframe')].forEach((frame,i)=>{
        const old=saved[i];if(!Array.isArray(old)||!old.length)return;
        const z=zones.find(x=>x.el.contains(frame));if(!z)return;
        const zr=z.el.getBoundingClientRect(),fr=frame.getBoundingClientRect();
        const converted=old.map(s=>({...s,pts:(s.pts||[]).map(p=>({x:Math.max(0,Math.min(1,(fr.left-zr.left+p.x)/Math.max(1,zr.width))),y:Math.max(0,Math.min(1,(fr.top-zr.top+p.y)/Math.max(1,zr.height)))}))}));
        strokeMap.set(z.id,[...(strokeMap.get(z.id)||[]),...converted]);
      });
      saveInk();zones.forEach(renderZone);
    }

    document.querySelectorAll('.visualcard').forEach(v=>{
      const pin=document.createElement('button');pin.className='atlas-pin-btn-gen';pin.type='button';pin.textContent='Pin slide';(v.querySelector('[data-side=original] .atlas-pane-footer')||v.querySelector('.visualcopy'))?.appendChild(pin);pin.onclick=()=>togglePin(v,pin);
    });

    function visibleZone(){
      return (activeZone?.near?activeZone:null)||zones.find(z=>{const r=z.el.getBoundingClientRect();return r.top<innerHeight*.62&&r.bottom>innerHeight*.18})||zones[0]||null;
    }
    const panelButtons=new Map([[tools,'atlasGTools'],[notes,'atlasGNote'],[board,'atlasGBoard']]);
    function setPanel(panel=null){
      for(const [el,id] of panelButtons){el.hidden=el!==panel;const button=document.getElementById(id);button.classList.toggle('active',el===panel);button.setAttribute('aria-expanded',String(el===panel));button.setAttribute('aria-controls',el.id);}
      document.querySelector('.atlas-reader-ai,.ai')?.setAttribute('hidden','');
      if(panel&&panel!==tools&&draw){draw=false;document.body.classList.remove('atlas-gdrawing');document.getElementById('atlasGDraw').classList.remove('active');}
    }
    function closePanel(panel){setPanel();document.getElementById(panelButtons.get(panel))?.focus();}
    tools.querySelector('[data-close-tools]').onclick=()=>closePanel(tools);
    addEventListener('atlas:close-panels',()=>setPanel());
    addEventListener('keydown',e=>{if(e.key==='Escape'&&!e.target.closest('#atlasNotebook')){const open=[...panelButtons.keys()].find(p=>!p.hidden);if(open){e.stopPropagation();closePanel(open);}}});
    document.getElementById('atlasGHome').onclick=()=>Notebook.home(lecture.moduleId);
    function toggleDraw(){
      draw=!draw;document.body.classList.toggle('atlas-gdrawing',draw);
      document.getElementById('atlasGDraw').classList.toggle('active',draw);
      if(draw)setPanel(tools);else if(!tools.hidden)setPanel();
    }
    document.getElementById('atlasGDraw').onclick=toggleDraw;
    document.getElementById('atlasGTools').onclick=()=>setPanel(tools.hidden?tools:null);
    tools.querySelectorAll('[data-tool]').forEach(b=>b.onclick=()=>{
      tool=b.dataset.tool;tools.querySelectorAll('[data-tool]').forEach(x=>x.classList.toggle('active',x===b));if(!draw)toggleDraw();
    });
    tools.querySelectorAll('[data-color]').forEach(b=>b.onclick=()=>{
      color=b.dataset.color;tools.querySelectorAll('[data-color]').forEach(x=>x.classList.toggle('active',x===b));
    });
    document.getElementById('atlasGTSize').oninput=e=>size=Number(e.target.value);
    document.getElementById('atlasGTUndo').onclick=()=>{
      const z=visibleZone();if(!z)return;strokeMap.get(z.id)?.pop();renderZone(z);saveInk();
    };
    document.getElementById('atlasGTClear').onclick=()=>{
      const z=visibleZone();if(!z)return;strokeMap.set(z.id,[]);renderZone(z);saveInk();
    };

    function focusPanels(focus){
      document.body.classList.toggle('atlas-gen-focus',focus);
      const b=document.getElementById('atlasGFocus');b.classList.toggle('active',focus);b.setAttribute('aria-pressed',String(focus));
      b.lastElementChild.textContent=focus?'Show panels':'Hide panels';b.title=focus?'Restore navigation (Escape)':'Hide navigation and open panels';
      if(focus)setPanel();
      // The same control must also hide the shell when a lecture is in the library iframe.
      if(window.parent!==window)window.parent.postMessage({source:'study-atlas-focus',focus},location.origin);
      window.dispatchEvent(new Event('resize'));
    }
    document.getElementById('atlasGFocus').onclick=()=>focusPanels(!document.body.classList.contains('atlas-gen-focus'));
    addEventListener('keydown',e=>{if(e.key==='Escape'&&document.body.classList.contains('atlas-gen-focus'))focusPanels(false);});
    document.getElementById('atlasGZm').onclick=()=>{if(document.body.classList.contains('atlas-slide-mode'))return window.StudyAtlasReader.zoom(-1);zoom=Math.max(.7,+(zoom-.1).toFixed(1));document.querySelector('main').style.zoom=zoom;document.getElementById('atlasGZ').textContent=Math.round(zoom*100)+'%'};
    document.getElementById('atlasGZp').onclick=()=>{if(document.body.classList.contains('atlas-slide-mode'))return window.StudyAtlasReader.zoom(1);zoom=Math.min(1.5,+(zoom+.1).toFixed(1));document.querySelector('main').style.zoom=zoom;document.getElementById('atlasGZ').textContent=Math.round(zoom*100)+'%'};
    document.getElementById('atlasGAI').onclick=()=>{setPanel();if(draw)toggleDraw();document.body.classList.contains('atlas-slide-mode')?window.StudyAtlasReader.ai():document.getElementById('aiBtn')?.click();};
    document.getElementById('atlasGTimer').onclick=()=>{setPanel();document.getElementById('atlasTimerBtn')?.click();};

    function progress(){
      const d=document.documentElement,max=Math.max(1,d.scrollHeight-innerHeight),p=Math.max(0,Math.min(100,Math.round(scrollY/max*100)));
      document.getElementById('atlasGFill').style.height=p+'%';document.getElementById('atlasGPct').textContent=p+'%';
    }
    addEventListener('scroll',progress,{passive:true});progress();

    const sketch=document.getElementById('atlasGNSketch'),ctx=sketch.getContext('2d');
    function resetSketchSize(){
      const r=sketch.getBoundingClientRect(),d=Math.min(2,devicePixelRatio||1);if(!r.width||!r.height)return;
      const w=Math.round(r.width*d),h=Math.round(r.height*d);if(sketch.width===w&&sketch.height===h)return;
      const backup=document.createElement('canvas');backup.width=sketch.width;backup.height=sketch.height;backup.getContext('2d').drawImage(sketch,0,0);
      sketch.width=w;sketch.height=h;ctx.drawImage(backup,0,0,w,h);ctx.setTransform(d,0,0,d,0,0);ctx.lineCap='round';ctx.lineJoin='round';ctx.lineWidth=4;ctx.strokeStyle='#ff5b7c';
    }
    resetSketchSize();let sketching=false,sketchPointer=null,previous,sketchDirty=false;
    sketch.onpointerdown=e=>{e.preventDefault();sketching=true;sketchDirty=true;sketchPointer=e.pointerId;sketch.setPointerCapture?.(e.pointerId);previous={x:e.offsetX,y:e.offsetY};ctx.beginPath();ctx.arc(previous.x,previous.y,2,0,Math.PI*2);ctx.fillStyle='#ff5b7c';ctx.fill();};
    sketch.onpointermove=e=>{if(!sketching||e.pointerId!==sketchPointer)return;e.preventDefault();ctx.beginPath();ctx.moveTo(previous.x,previous.y);ctx.lineTo(e.offsetX,e.offsetY);ctx.stroke();previous={x:e.offsetX,y:e.offsetY};};
    sketch.onpointerup=sketch.onpointercancel=()=>{sketching=false;sketchPointer=null;};
    document.getElementById('atlasGNClear').onclick=()=>{ctx.save();ctx.setTransform(1,0,0,1,0,0);ctx.clearRect(0,0,sketch.width,sketch.height);ctx.restore();sketchDirty=false;};
    new ResizeObserver(()=>{if(!notes.hidden&&!sketching)resetSketchSize();}).observe(sketch);
    let draft=null,saving=false;
    const noteStatus=document.getElementById('atlasGNStatus'),boardStatus=document.getElementById('atlasGBStatus');
    function captureDraft(){
      const visual=currentVisual(),slide=window.StudyAtlasReader?.current()?.n||Number(visual?.dataset.slide||visual?.querySelector('.visualtag')?.textContent.match(/\d+/)?.[0])||null;
      draft={slide,title:chapterLabel()};const selected=draft,preview=document.getElementById('atlasGNPreview'),label=document.getElementById('atlasGNPreviewLabel');
      preview.hidden=true;document.getElementById('atlasGNContext').textContent=selected.title;label.textContent=slide?'Preparing the whole of slide '+slide+'…':'This note will be linked to the lecture.';
      selected.image=slide?Notebook.snapshot(slide,lecture).then(image=>{if(draft===selected){preview.src=image;preview.hidden=false;label.textContent='Complete slide '+slide+' · saved with your note';}return image;}).catch(e=>{if(draft===selected)label.textContent='Slide preview unavailable. Use current slide to retry.';return null;}):Promise.resolve('');
    }
    async function renderNotes(){await Notebook.renderList(document.getElementById('atlasGNList'),{kind:'note',lectureKey:lecture.lectureKey});}
    function openNotes(){
      if(!notes.hidden){closePanel(notes);return;}
      setPanel(notes);if(!draft||(!document.getElementById('atlasGNText').value.trim()&&!sketchDirty))captureDraft();
      requestAnimationFrame(()=>{resetSketchSize();document.getElementById('atlasGNText').focus({preventScroll:true});});
      renderNotes().catch(()=>noteStatus.textContent='Your notes could not be loaded. Reload to try again.');
    }
    document.getElementById('atlasGNote').onclick=openNotes;
    document.getElementById('atlasGNCurrent').onclick=()=>{if(!saving)captureDraft();};
    notes.querySelector('[data-close-note]').onclick=()=>closePanel(notes);
    document.getElementById('atlasGNAll').onclick=()=>Notebook.open({lectureKey:lecture.lectureKey,title:lecture.title});
    document.getElementById('atlasGNModule').onclick=()=>Notebook.open({moduleId:lecture.moduleId,title:'Module notes'});
    document.getElementById('atlasGNSave').onclick=async()=>{
      if(saving)return;const textInput=document.getElementById('atlasGNText'),text=textInput.value.trim();
      if(!text&&!sketchDirty){noteStatus.textContent='Write a note or add a sketch first. To save only the slide, use Pin slide.';return;}
      if(!draft)captureDraft();const selected=draft,sketchImage=sketchDirty?sketch.toDataURL('image/webp',.9):'';
      saving=true;const save=document.getElementById('atlasGNSave');save.disabled=true;save.textContent='Saving…';textInput.readOnly=true;sketch.style.pointerEvents='none';document.getElementById('atlasGNClear').disabled=true;
      noteStatus.textContent='Saving your note and the complete slide…';
      try{
        const image=await selected.image;if(selected.slide&&!image)throw new Error('The full slide could not be captured. Your draft is still here. Retry with Use current slide.');
        await Store.save(lecture,{kind:'note',slide:selected.slide,title:selected.title,text},{snapshot:image,sketch:sketchImage});
        textInput.value='';document.getElementById('atlasGNClear').disabled=false;document.getElementById('atlasGNClear').click();draft=null;
        noteStatus.textContent='Saved with the full slide. Find it here, at the end of the lecture, or in your module notes.';await renderNotes();
      }catch(e){noteStatus.textContent=e.message||'Could not save. Your draft is still here; check device storage and retry.';}
      finally{saving=false;save.disabled=false;save.textContent='Save note + slide';textInput.readOnly=false;sketch.style.pointerEvents='';document.getElementById('atlasGNClear').disabled=false;}
    };
    const pinBusy=new Set();
    function slideOf(v){return Number(v?.dataset.slide||v?.querySelector('.visualtag')?.textContent.match(/\d+/)?.[0])||null;}
    async function togglePin(v,button){
      if(!v)return;const slide=slideOf(v),key=String(slide||chapterLabel());if(pinBusy.has(key))return;
      pinBusy.add(key);if(button)button.disabled=true;boardStatus.textContent='Saving slide…';
      try{
        const arr=await Store.list({kind:'pin',lectureId:lecture.id}),old=arr.find(x=>slide?x.slide===slide:x.title===key);
        if(old){await Store.remove(old.id);boardStatus.textContent='Slide unpinned.';}
        else{const image=slide?await Notebook.snapshot(slide,lecture):'';await Store.save(lecture,{kind:'pin',slide,title:slide?'Original slide '+slide:key,text:v.querySelector('.atlas-teaching-copy p,.visualcopy p')?.textContent||''},{snapshot:image});setPanel(board);boardStatus.textContent='Pinned with the complete slide.';}
        await renderBoard();await syncPins();
      }catch(e){setPanel(board);boardStatus.textContent='Could not save this pin. '+(e.message||'Please retry.');}
      finally{pinBusy.delete(key);if(button)button.disabled=false;}
    }
    async function syncPins(){
      const arr=await Store.list({kind:'pin',lectureId:lecture.id});
      document.querySelectorAll('.visualcard').forEach(v=>{const b=v.querySelector('.atlas-pin-btn-gen');if(!b)return;const on=arr.some(x=>x.slide===slideOf(v));b.classList.toggle('pinned',on);b.setAttribute('aria-pressed',String(on));b.textContent=on?'Pinned ✓':'Pin slide';});
      document.getElementById('atlasGBCount').textContent=String(arr.length);
      document.getElementById('atlasGNCount').textContent=String((await Store.list({kind:'note',lectureKey:lecture.lectureKey})).length);
    }
    async function renderBoard(){await Notebook.renderList(document.getElementById('atlasGBList'),{kind:'pin',lectureId:lecture.id});}
    document.getElementById('atlasGBoard').onclick=()=>{if(!board.hidden){closePanel(board);return;}setPanel(board);renderBoard().catch(()=>boardStatus.textContent='The board could not be loaded. Reload to try again.');};
    board.querySelector('[data-close-board]').onclick=()=>closePanel(board);
    document.getElementById('atlasGBCurrent').onclick=()=>togglePin(currentVisual(),document.getElementById('atlasGBCurrent'));
    document.getElementById('atlasGBAll').onclick=()=>Notebook.open({kind:'pin',lectureKey:lecture.lectureKey,title:lecture.title+' · Board'});
    addEventListener('atlas:notebook-changed',()=>{syncPins().catch(()=>{});if(!notes.hidden)renderNotes().catch(()=>{});if(!board.hidden)renderBoard().catch(()=>{});});
    noteStatus.textContent=boardStatus.textContent=storageError;
    syncPins().catch(()=>{});
    Notebook.mountEnd().catch(()=>{});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
