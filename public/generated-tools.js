(function generatedTools(){
  const NOTE_KEY='atlasGeneratedNotes.v3', PIN_KEY='atlasGeneratedPins.v3', INK_KEY='atlasGeneratedInk.v3';
  const read=(k,d)=>{try{return JSON.parse(localStorage.getItem(k))??d}catch{return d}};
  const write=(k,v)=>localStorage.setItem(k,JSON.stringify(v));
  const pageKey=()=>location.pathname+'::'+(document.querySelector('h1')?.textContent||document.title);
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function currentChapter(){
    const cs=[...document.querySelectorAll('.chapter')], y=innerHeight*.42;
    return cs.find(c=>{const r=c.getBoundingClientRect();return r.top<=y&&r.bottom>=y})||cs[0];
  }
  function chapterLabel(){
    const c=currentChapter();
    return (c?.querySelector('.kicker')?.textContent||c?.querySelector('h2')?.textContent||'Current chapter').trim();
  }
  function boot(){
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
      <div class="atlas-gt-actions"><button id="atlasGTUndo">Undo</button><button id="atlasGTClear">Clear slide</button></div>`;
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

    let zoom=1, draw=false, tool='pen', color='#ff4f70', size=6, activeFrame=null;
    const canvases=new Map(), strokes=new Map();

    function setCanvasSize(frame,canvas){
      const r=frame.getBoundingClientRect(), d=window.devicePixelRatio||1;
      canvas.width=Math.max(1,Math.round(r.width*d));
      canvas.height=Math.max(1,Math.round(r.height*d));
      canvas.style.width=r.width+'px'; canvas.style.height=r.height+'px';
      canvas.dataset.dpr=String(d);
    }
    function renderFrame(frame){
      const c=canvases.get(frame); if(!c)return;
      const ctx=c.getContext('2d'), d=Number(c.dataset.dpr||1), r=frame.getBoundingClientRect();
      ctx.setTransform(d,0,0,d,0,0); ctx.clearRect(0,0,r.width,r.height);
      for(const s of strokes.get(frame)||[]){
        if(!s.pts?.length) continue;
        ctx.save(); ctx.lineCap='round'; ctx.lineJoin='round';
        if(s.tool==='eraser'){ctx.globalCompositeOperation='destination-out';ctx.lineWidth=s.size*2.4;ctx.strokeStyle='#000'}
        else{ctx.globalCompositeOperation='source-over';ctx.lineWidth=s.tool==='highlighter'?s.size*2:s.size;ctx.strokeStyle=s.color;ctx.globalAlpha=s.tool==='highlighter'?.3:1}
        ctx.beginPath();s.pts.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.stroke();ctx.restore();
      }
    }
    function saveInk(){
      const all=read(INK_KEY,{}), k=pageKey();
      all[k]=[...document.querySelectorAll('.visualframe')].map(f=>strokes.get(f)||[]);
      write(INK_KEY,all);
    }
    function prepareVisual(v){
      const frame=v.querySelector('.visualframe'); if(!frame)return;
      frame.classList.add('atlas-gdraw-wrap');
      const c=document.createElement('canvas'); c.className='atlas-gcanvas'; frame.appendChild(c);
      setCanvasSize(frame,c); canvases.set(frame,c); strokes.set(frame,[]);
      let drawing=false,current=null;
      c.addEventListener('pointerdown',e=>{
        if(!draw)return; e.preventDefault(); activeFrame=frame; drawing=true; c.setPointerCapture?.(e.pointerId);
        current={tool,color,size,pts:[{x:e.offsetX,y:e.offsetY}]}; strokes.get(frame).push(current); renderFrame(frame);
      });
      c.addEventListener('pointermove',e=>{if(!drawing||!draw)return;e.preventDefault();current.pts.push({x:e.offsetX,y:e.offsetY});renderFrame(frame)});
      const end=e=>{if(!drawing)return;drawing=false;try{c.releasePointerCapture?.(e.pointerId)}catch{}saveInk()};
      c.addEventListener('pointerup',end);c.addEventListener('pointercancel',end);
      const pin=document.createElement('button');pin.className='atlas-pin-btn-gen';pin.textContent='Pin to board';v.querySelector('.visualcopy')?.appendChild(pin);pin.onclick=()=>togglePin(v,pin);
    }
    document.querySelectorAll('.visualcard').forEach(prepareVisual);
    const saved=read(INK_KEY,{})[pageKey()]||[];
    [...document.querySelectorAll('.visualframe')].forEach((f,i)=>{if(saved[i])strokes.set(f,saved[i]);renderFrame(f)});
    addEventListener('resize',()=>document.querySelectorAll('.visualframe').forEach(f=>{const c=canvases.get(f);if(c){setCanvasSize(f,c);renderFrame(f)}}));

    function toggleDraw(){
      draw=!draw; document.body.classList.toggle('atlas-gdrawing',draw);
      document.getElementById('atlasGDraw').classList.toggle('active',draw);
      if(draw) tools.hidden=false;
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
      const f=activeFrame||[...document.querySelectorAll('.visualframe')].find(x=>{const r=x.getBoundingClientRect();return r.top<innerHeight*.65&&r.bottom>100});
      if(f){strokes.get(f)?.pop();renderFrame(f);saveInk()}
    };
    document.getElementById('atlasGTClear').onclick=()=>{
      const f=activeFrame||[...document.querySelectorAll('.visualframe')].find(x=>{const r=x.getBoundingClientRect();return r.top<innerHeight*.65&&r.bottom>100});
      if(f){strokes.set(f,[]);renderFrame(f);saveInk()}
    };

    document.getElementById('atlasGFocus').onclick=()=>{
      document.body.classList.toggle('atlas-gen-focus');
      document.getElementById('atlasGFocus').classList.toggle('active');
    };
    document.getElementById('atlasGZm').onclick=()=>{zoom=Math.max(.7,+(zoom-.1).toFixed(1));document.querySelector('main').style.zoom=zoom;document.getElementById('atlasGZ').textContent=Math.round(zoom*100)+'%'};
    document.getElementById('atlasGZp').onclick=()=>{zoom=Math.min(1.5,+(zoom+.1).toFixed(1));document.querySelector('main').style.zoom=zoom;document.getElementById('atlasGZ').textContent=Math.round(zoom*100)+'%'};
    document.getElementById('atlasGAI').onclick=()=>document.getElementById('aiBtn')?.click();
    document.getElementById('atlasGTimer').onclick=()=>document.getElementById('atlasTimerBtn')?.click();

    function progress(){
      const d=document.documentElement,max=Math.max(1,d.scrollHeight-innerHeight),p=Math.max(0,Math.min(100,Math.round(scrollY/max*100)));
      document.getElementById('atlasGFill').style.height=p+'%';document.getElementById('atlasGPct').textContent=p+'%';
    }
    addEventListener('scroll',progress,{passive:true});progress();

    const sketch=document.getElementById('atlasGNSketch'),ctx=sketch.getContext('2d');
    function resetSketchSize(){
      const r=sketch.getBoundingClientRect(),d=devicePixelRatio||1;sketch.width=r.width*d;sketch.height=r.height*d;ctx.setTransform(d,0,0,d,0,0);ctx.lineCap='round';ctx.lineJoin='round';ctx.lineWidth=4;ctx.strokeStyle='#ff5b7c';
    }
    resetSketchSize(); let sketching=false;
    sketch.onpointerdown=e=>{sketching=true;sketch.setPointerCapture?.(e.pointerId);ctx.beginPath();ctx.moveTo(e.offsetX,e.offsetY)};
    sketch.onpointermove=e=>{if(sketching){ctx.lineTo(e.offsetX,e.offsetY);ctx.stroke()}};
    sketch.onpointerup=sketch.onpointercancel=()=>sketching=false;
    document.getElementById('atlasGNClear').onclick=()=>ctx.clearRect(0,0,sketch.width,sketch.height);

    function renderNotes(){
      const arr=read(NOTE_KEY,{})[pageKey()]||[];
      document.getElementById('atlasGNList').innerHTML=arr.length?arr.map((n,i)=>`<div class="atlas-gn-card"><b>${esc(n.context)}</b>${n.text?`<p>${esc(n.text)}</p>`:''}${n.sketch?`<img src="${n.sketch}" alt="note sketch">`:''}<button data-del="${i}">Delete</button></div>`).join(''):'<div class="atlas-gn-context">No notes yet.</div>';
      document.querySelectorAll('#atlasGNList [data-del]').forEach(b=>b.onclick=()=>{const all=read(NOTE_KEY,{}),k=pageKey();all[k].splice(Number(b.dataset.del),1);write(NOTE_KEY,all);renderNotes()});
    }
    document.getElementById('atlasGNote').onclick=()=>{notes.hidden=false;document.getElementById('atlasGNContext').textContent=chapterLabel();renderNotes()};
    notes.querySelector('[data-close-note]').onclick=()=>notes.hidden=true;
    document.getElementById('atlasGNSave').onclick=()=>{
      const all=read(NOTE_KEY,{}),k=pageKey();all[k]=all[k]||[];const text=document.getElementById('atlasGNText').value.trim();
      all[k].unshift({context:chapterLabel(),text,sketch:sketch.toDataURL(),date:Date.now()});write(NOTE_KEY,all);document.getElementById('atlasGNText').value='';document.getElementById('atlasGNClear').click();renderNotes();
    };

    function pinKey(v){return v.querySelector('.visualtag')?.textContent||v.querySelector('h4')?.textContent||'visual'}
    function togglePin(v){
      const all=read(PIN_KEY,{}),k=pageKey(),arr=all[k]||[],pk=pinKey(v),idx=arr.findIndex(x=>x.key===pk);
      if(idx>=0)arr.splice(idx,1);else{const f=v.querySelector('iframe');arr.push({key:pk,title:v.querySelector('h4')?.textContent||pk,src:f?.src||'',text:v.querySelector('.visualcopy p')?.textContent||''})}
      all[k]=arr;write(PIN_KEY,all);renderBoard();syncPins();
    }
    function syncPins(){
      const arr=read(PIN_KEY,{})[pageKey()]||[];
      document.querySelectorAll('.visualcard').forEach(v=>{const b=v.querySelector('.atlas-pin-btn-gen');if(!b)return;const on=arr.some(x=>x.key===pinKey(v));b.classList.toggle('pinned',on);b.textContent=on?'Pinned ✓':'Pin to board'});
    }
    function renderBoard(){
      const arr=read(PIN_KEY,{})[pageKey()]||[];
      document.getElementById('atlasGBList').innerHTML=arr.length?arr.map((x,i)=>`<article class="atlas-gb-card">${x.src?`<iframe src="${esc(x.src)}"></iframe>`:''}<div class="atlas-gb-copy"><b>${esc(x.title)}</b><p>${esc(x.text)}</p><button data-unpin="${i}">Remove</button></div></article>`).join(''):'<div class="atlas-gn-context">Pin important visuals from the lecture and they will stay here.</div>';
      document.querySelectorAll('[data-unpin]').forEach(b=>b.onclick=()=>{const all=read(PIN_KEY,{}),k=pageKey();all[k].splice(Number(b.dataset.unpin),1);write(PIN_KEY,all);renderBoard();syncPins()});
    }
    document.getElementById('atlasGBoard').onclick=()=>{board.hidden=false;renderBoard()};
    board.querySelector('[data-close-board]').onclick=()=>board.hidden=true;
    syncPins();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();