import {getStore} from '@netlify/blobs';
export default async (req,context)=>{
  const id=context.params?.id||'';
  const store=getStore({name:'study-atlas',consistency:'strong'});
  let html=await store.get(`lectures/${id}.html`,{type:'text',consistency:'strong'});
  if(!html)return new Response('Lecture not found',{status:404});
  if(!html.includes('/study-tools.css')) html=html.replace('</head>','<link rel="stylesheet" href="/study-tools.css?v=4"><link rel="stylesheet" href="/generated-tools.css?v=5"></head>'); else if(!html.includes('/generated-tools.css')) html=html.replace('</head>','<link rel="stylesheet" href="/generated-tools.css?v=5"></head>');
  if(!html.includes('/local-ai.js')) html=html.replace('</body>','<script src="/local-ai.js?v=2"></script></body>');
  if(!html.includes('/study-tools.js')) html=html.replace('</body>','<script src="/study-tools.js?v=4"></script><script src="/generated-tools.js?v=5"></script></body>'); else if(!html.includes('/generated-tools.js')) html=html.replace('</body>','<script src="/generated-tools.js?v=5"></script></body>');
  return new Response(html,{headers:{'content-type':'text/html; charset=utf-8','cache-control':'no-store'}});
};
export const config={path:'/generated/:id',method:'GET'};
