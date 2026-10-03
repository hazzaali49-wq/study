(()=>{
  const ROOT='https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/build/';
  let library;
  async function engine(){
    if(!library)library=import(ROOT+'pdf.min.mjs').then(p=>{p.GlobalWorkerOptions.workerSrc=ROOT+'pdf.worker.min.mjs';return p;}).catch(e=>{library=null;throw e;});
    return library;
  }
  async function load(source){
    const p=await engine();
    const input=typeof source==='string'?{url:source}:source instanceof Blob?{data:new Uint8Array(await source.arrayBuffer())}:source;
    return p.getDocument(input).promise;
  }
  async function readPage(page){
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
  window.StudyAtlasPDF={engine,load,readPage};
})();
