import {getStore} from '@netlify/blobs';
export default async (req,context)=>{
 const id=context.params?.id||'',store=getStore({name:'study-atlas',consistency:'strong'});
 let html=await store.get(`lectures/${id}.html`,{type:'text',consistency:'strong'});
 if(!html)return new Response('Lecture not found',{status:404});
 const manifest=await store.get('manifest.json',{type:'json',consistency:'strong'}).catch(()=>[]);
 const meta=(manifest||[]).find(l=>l.id===id);
 if(meta){
  html=html.replace(/<script[^>]*id=["']atlasLectureMeta["'][^>]*>[\s\S]*?<\/script>/i,'');
  const safe=JSON.stringify(meta).replace(/</g,'\\u003c');
  html=html.replace('</body>',`<script type="application/json" id="atlasLectureMeta">${safe}</script></body>`);
 }

 // Upgrade saved HTML on read so every existing cloud lecture gets the new layout.
 html=html.replace(/<script\b[^>]*src=["'][^"']*(?:local-ai|study-tools|generated-tools|slide-reader|slide-notes)\.js[^"']*["'][^>]*>\s*<\/script>/gi,'');
 html=html.replace(/<link\b[^>]*href=["'][^"']*(?:study-tools|generated-tools|slide-reader)\.css[^"']*["'][^>]*>/gi,'');
 html=html.replace('</head>','<link rel="stylesheet" href="/study-tools.css?v=7"><link rel="stylesheet" href="/generated-tools.css?v=8"><link rel="stylesheet" href="/slide-reader.css?v=1"></head>');
 // Put the intercept before legacy inline AI scripts. It never calls a paid endpoint.
 html=html.replace(/<body([^>]*)>/i,'<body$1><script src="/slide-notes.js?v=1"></script><script src="/local-ai.js?v=4"></script>');
 const legacy=new URL(req.url).searchParams.get('view')==='chapters';
 html=html.replace('</body>',`<script src="/study-tools.js?v=7"></script><script src="/slide-reader.js?v=1"></script>${legacy?'<script src="/generated-tools.js?v=8"></script>':''}</body>`);
 return new Response(html,{headers:{'content-type':'text/html; charset=utf-8','cache-control':'no-store'}});
};
export const config={path:'/generated/:id',method:'GET'};
