(()=>{
  const ROOTS=['https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/build/','https://unpkg.com/pdfjs-dist@4.10.38/build/'];
  let library,manifest;
  function timed(promise,ms,message){let timer;return Promise.race([promise,new Promise((_,reject)=>timer=setTimeout(()=>reject(new Error(message)),ms))]).finally(()=>clearTimeout(timer));}
  async function engine(){
    if(!library)library=(async()=>{let last;for(const root of ROOTS){try{const p=await timed(import(root+'pdf.min.mjs'),7000,'PDF engine download timed out');p.GlobalWorkerOptions.workerSrc=root+'pdf.worker.min.mjs';return p;}catch(e){last=e;}}throw last;})().catch(e=>{library=null;throw e;});
    return library;
  }
  async function catalogue(){
    if(!manifest)manifest=(async()=>{const controller=new AbortController();let timer=setTimeout(()=>controller.abort(),5000);try{const r=await fetch('/lecture-slides.json?v=1',{signal:controller.signal});if(!r.ok)throw Error('Slide catalogue unavailable');return await r.json();}finally{clearTimeout(timer);}})().catch(e=>{manifest=null;throw e;});
    return manifest;
  }
  async function prepared(source,options){
    let path='';try{if(typeof source==='string')path=new URL(source,location.href).pathname;}catch{}
    const special=options.lectureId==='calcium-homeostasis'&&options.preparedCalcium;
    if(!special&&!/^\/resources\/[^/]+Original_Lecture\.pdf$/.test(path))return null;
    const data=await catalogue(),entry=special?data.lectures['calcium-homeostasis']:Object.values(data.lectures).find(x=>x.pdfPath===path);
    if(!entry)return null;
    return {numPages:entry.pages.length,atlasPrepared:true,destroy(){},async getPage(n){
      const source=entry.pages[n-1];if(!source)throw Error('Slide number out of range');
      return {pageNumber:n,atlasSource:source,cleanup(){},getViewport({scale=1}={}){return {width:source.width*scale,height:source.height*scale,scale};},render({canvasContext,viewport}){
        let image;const promise=timed(new Promise((resolve,reject)=>{image=new Image();image.onload=()=>{try{canvasContext.drawImage(image,0,0,viewport.width,viewport.height);resolve();}catch(e){reject(e);}};image.onerror=()=>reject(Error('Slide image could not be loaded'));image.src=source.image;}),12000,'Slide image took too long to load').finally(()=>{if(image){image.onload=null;image.onerror=null;}});
        return {promise,cancel(){if(image){image.onload=null;image.onerror=null;image.src='';}}};
      }};
    }};
  }
  async function load(source,options={}){
    try{const ready=await prepared(source,options);if(ready)return ready;}catch{/* Uploaded PDFs and a failed static catalogue can still use the normal engine. */}
    const p=await engine();
    const input=typeof source==='string'?{url:source}:source instanceof Blob?{data:new Uint8Array(await source.arrayBuffer())}:source;
    const task=p.getDocument(input);try{return await timed(task.promise,20000,'Original PDF took too long to open');}catch(e){task.destroy?.();throw e;}
  }
  async function readPage(page){
    if(page.atlasSource)return {...page.atlasSource,boxes:[]};
    const content=await page.getTextContent(),vp=page.getViewport({scale:1}),p=await engine();
    const lines=[],boxes=[];let line='',lastY=null;
    for(const item of content.items){
      if(!item.str)continue;
      const tr=p.Util.transform(vp.transform,item.transform),height=Math.max(1,Math.hypot(tr[2],tr[3]));
      if(lastY!==null&&Math.abs(tr[5]-lastY)>height*.65&&line){lines.push(line.trim());line='';}
      line+=(line?' ':'')+item.str;lastY=tr[5];
      boxes.push({text:item.str,x:tr[4]/vp.width,y:(tr[5]-height)/vp.height,w:item.width/vp.width,h:height/vp.height});
      if(item.hasEOL){lines.push(line.trim());line='';lastY=null;}
    }
    if(line.trim())lines.push(line.trim());
    return {n:page.pageNumber,text:lines.join('\n'),lines,boxes,width:vp.width,height:vp.height};
  }
  window.StudyAtlasPDF={engine,load,readPage,preparedVersion:1};
})();
