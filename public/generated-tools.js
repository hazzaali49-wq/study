(function generatedTools(){
  const NOTE_KEY='atlasGeneratedNotes.v3', PIN_KEY='atlasGeneratedPins.v3', INK_KEY='atlasGeneratedInk.v3';
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
    if(!(document.querySelector('.visualcard')&&document.querySelector('.rail'))) return;
    document.body.classList.add('atlas-generated-v3');

    const dock=document.createElement('div');
    dock.id='atlasGenDock';
    dock.innerHTML=`
      <button class="atlas-gbtn" id="atlasGFocus"><span class="atlas-gicon">▣</span><span>Panels</span></button>
      <div class="atlas-gprogress"><i id="atlasGFill"></i><b id="atlasGPct">0%</b></div>
      <button class="atlas-gbtn" id="atlasGDraw"><span class="atlas-gicon">✎</span><span>Draw</span></button>
      <div class="atlas-gzoom"><button id="atlasGZm">−</button><span id="atlasGZ">100%</span><button id="atlasGZp">+</button></div>
      <button class="atlas-gbtn" id="atlasGBoard"><span class="atlas-gicon">✦</span><span>Board</span></button>
      <button class="atlas-gbtn" id="atlasGNote"><span class="atlas-gicon">＋</span><span>Note</span></button>
      <button class="atlas-gbtn" id="atlasGAI"><span class="atlas-gicon">AI</span><span>Ask AI</span></button>
      <button class="atlas-gbtn" id="atlasGTimer"><span class="atlas-gicon">◷</span><span>Timer</span></button>
      <button class="atlas-gbtn" id="atlasGTools"><span class="atlas-gicon">⋮</span><span>Tools</span></button>`;
    document.body.appendChild(dock);

    const tools=document.createElement('div');
    tools.id='atlasGenTools'; tools.hidden=true;
    tools.innerHTML=`
      <div class="atlas-gt-title">DRAWING TOOLS</div>
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
      <div class="atlas-panel-head"><div><h3>Quick note</h3><small id="atlasGNContext"></small></div><button data-close-note>×</button></div>
      <div class="atlas-gn-context">Write or sketch while keeping this lecture open.</div>
      <textarea class="atlas-gn-text" id="atlasGNText" placeholder="Type your note…"></textarea>
      <canvas class="atlas-gn-sketch" id="atlasGNSketch"></canvas>
      <div class="atlas-gn-actions"><button id="atlasGNClear">Clear sketch</button><button class="save" id="atlasGNSave">Save note</button></div>
      <div class="atlas-gn-list" id="atlasGNList"></div>`;
    document.body.appendChild(notes);

    const board=document.createElement('div');
    board.id='atlasGenBoard'; board.hidden=true;
    board.innerHTML=`<div class="atlas-panel-head"><div><h3>Study board</h3><small>Keep important visuals beside you</small></div><button data-close-board>×</button></div><div id="atlasGBList"></div>`;
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
      const pin=document.createElement('button');pin.className='atlas-pin-btn-gen';pin.textContent='Pin to board';v.querySelector('.visualcopy')?.appendChild(pin);pin.onclick=()=>togglePin(v,pin);
    });

    function visibleZone(){
      return (activeZone?.near?activeZone:null)||zones.find(z=>{const r=z.el.getBoundingClientRect();return r.top<innerHeight*.62&&r.bottom>innerHeight*.18})||zones[0]||null;
    }
    function toggleDraw(){
      draw=!draw;document.body.classList.toggle('atlas-gdrawing',draw);
      document.getElementById('atlasGDraw').classList.toggle('active',draw);
      if(draw)tools.hidden=false;
    }
    document.getElementById('atlasGDraw').onclick=toggleDraw;
    document.getElementById('atlasGTools').onclick=()=>tools.hidden=!tools.hidden;
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

    document.getElementById('atlasGFocus').onclick=()=>{
      document.body.classList.toggle('atlas-gen-focus');
      document.getElementById('atlasGFocus').classList.toggle('active');
    };
    document.getElementById('atlasGZm').onclick=()=>{if(document.body.classList.contains('atlas-slide-mode'))return window.StudyAtlasReader.zoom(-1);zoom=Math.max(.7,+(zoom-.1).toFixed(1));document.querySelector('main').style.zoom=zoom;document.getElementById('atlasGZ').textContent=Math.round(zoom*100)+'%'};
    document.getElementById('atlasGZp').onclick=()=>{if(document.body.classList.contains('atlas-slide-mode'))return window.StudyAtlasReader.zoom(1);zoom=Math.min(1.5,+(zoom+.1).toFixed(1));document.querySelector('main').style.zoom=zoom;document.getElementById('atlasGZ').textContent=Math.round(zoom*100)+'%'};
    document.getElementById('atlasGAI').onclick=()=>document.body.classList.contains('atlas-slide-mode')?window.StudyAtlasReader.ai():document.getElementById('aiBtn')?.click();
    document.getElementById('atlasGTimer').onclick=()=>document.getElementById('atlasTimerBtn')?.click();

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
    resetSketchSize();let sketching=false,sketchPointer=null,previous;
    sketch.onpointerdown=e=>{e.preventDefault();sketching=true;sketchPointer=e.pointerId;sketch.setPointerCapture?.(e.pointerId);previous={x:e.offsetX,y:e.offsetY};};
    sketch.onpointermove=e=>{if(!sketching||e.pointerId!==sketchPointer)return;e.preventDefault();ctx.beginPath();ctx.moveTo(previous.x,previous.y);ctx.lineTo(e.offsetX,e.offsetY);ctx.stroke();previous={x:e.offsetX,y:e.offsetY};};
    sketch.onpointerup=sketch.onpointercancel=()=>{sketching=false;sketchPointer=null;};
    document.getElementById('atlasGNClear').onclick=()=>ctx.clearRect(0,0,sketch.width,sketch.height);

    function renderNotes(){
      const arr=forPage(NOTE_KEY)||[];
      document.getElementById('atlasGNList').innerHTML=arr.length?arr.map((n,i)=>`<div class="atlas-gn-card"><b>${esc(n.context)}</b>${n.text?`<p>${esc(n.text)}</p>`:''}${n.sketch?`<img src="${n.sketch}" alt="note sketch">`:''}${n.slide?`<button data-note-go="${n.slide}">Go to slide ${n.slide}</button>`:''}<button data-del="${i}">Delete</button></div>`).join(''):'<div class="atlas-gn-context">No notes yet.</div>';
      document.querySelectorAll('#atlasGNList [data-note-go]').forEach(b=>b.onclick=()=>window.StudyAtlasReader?.go(Number(b.dataset.noteGo)));
      document.querySelectorAll('#atlasGNList [data-del]').forEach(b=>b.onclick=()=>{const all=read(NOTE_KEY,{}),k=pageKey();all[k]=all[k]||forPage(NOTE_KEY)||[];all[k].splice(Number(b.dataset.del),1);write(NOTE_KEY,all);renderNotes()});
    }
    document.getElementById('atlasGNote').onclick=()=>{notes.hidden=false;document.getElementById('atlasGNContext').textContent=chapterLabel();requestAnimationFrame(resetSketchSize);renderNotes()};
    notes.querySelector('[data-close-note]').onclick=()=>notes.hidden=true;
    document.getElementById('atlasGNSave').onclick=()=>{
      const all=read(NOTE_KEY,{}),k=pageKey();all[k]=all[k]||forPage(NOTE_KEY)||[];const text=document.getElementById('atlasGNText').value.trim();
      all[k].unshift({context:chapterLabel(),slide:window.StudyAtlasReader?.current()?.n||null,text,sketch:sketch.toDataURL(),date:Date.now()});write(NOTE_KEY,all);document.getElementById('atlasGNText').value='';document.getElementById('atlasGNClear').click();renderNotes();
    };

    function pinKey(v){if(v.dataset.slide)return 'ORIGINAL SLIDE '+v.dataset.slide;return v.querySelector('.visualtag')?.textContent||v.querySelector('h4')?.textContent||'visual'}
    async function togglePin(v){
      if(document.body.classList.contains('atlas-slide-mode')&&v.dataset.slide)await window.StudyAtlasReader.render(Number(v.dataset.slide));
      const all=read(PIN_KEY,{}),k=pageKey(),arr=all[k]||forPage(PIN_KEY)||[],pk=pinKey(v),idx=arr.findIndex(x=>x.key===pk);
      if(idx>=0)arr.splice(idx,1);else{const f=v.querySelector('iframe'),image=v.querySelector('.atlas-slide-bitmap'),readerUrl=window.StudyAtlasReader?.source();arr.push({image:image&&image.width>1?image.toDataURL('image/webp',.8):'',slide:Number(v.dataset.slide)||null,key:pk,title:v.querySelector('h4')?.textContent||pk,src:f?.src||(readerUrl?readerUrl+'#page='+v.dataset.slide:''),text:v.querySelector('.visualcopy p')?.textContent||''})}
      all[k]=arr;write(PIN_KEY,all);renderBoard();syncPins();
    }
    function syncPins(){
      const arr=forPage(PIN_KEY)||[];
      document.querySelectorAll('.visualcard').forEach(v=>{const b=v.querySelector('.atlas-pin-btn-gen');if(!b)return;const on=arr.some(x=>x.key===pinKey(v));b.classList.toggle('pinned',on);b.textContent=on?'Pinned ✓':'Pin to board'});
    }
    function renderBoard(){
      const arr=forPage(PIN_KEY)||[];
      document.getElementById('atlasGBList').innerHTML=arr.length?arr.map((x,i)=>`<article class="atlas-gb-card">${x.image?`<img src="${esc(x.image)}" alt="${esc(x.title)}" style="width:100%">`:x.src?`<iframe src="${esc(x.src)}"></iframe>`:''}<div class="atlas-gb-copy"><b>${esc(x.title)}</b><p>${esc(x.text)}</p>${x.slide?`<button data-board-go="${x.slide}">Go to slide</button>`:''}<button data-unpin="${i}">Remove</button></div></article>`).join(''):'<div class="atlas-gn-context">Pin important visuals from the lecture and they will stay here.</div>';
      document.querySelectorAll('[data-board-go]').forEach(b=>b.onclick=()=>window.StudyAtlasReader?.go(Number(b.dataset.boardGo)));
      document.querySelectorAll('[data-unpin]').forEach(b=>b.onclick=()=>{const all=read(PIN_KEY,{}),k=pageKey();all[k]=all[k]||forPage(PIN_KEY)||[];all[k].splice(Number(b.dataset.unpin),1);write(PIN_KEY,all);renderBoard();syncPins()});
    }
    document.getElementById('atlasGBoard').onclick=()=>{board.hidden=false;renderBoard()};
    board.querySelector('[data-close-board]').onclick=()=>board.hidden=true;
    syncPins();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();