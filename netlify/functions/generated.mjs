import {getStore} from '@netlify/blobs';
export default async (req,context)=>{
  const id=context.params?.id||'';
  const store=getStore({name:'study-atlas',consistency:'strong'});
  let html=await store.get(`lectures/${id}.html`,{type:'text',consistency:'strong'});
  if(!html)return new Response('Lecture not found',{status:404});
  if(!html.includes('/study-tools.css')) html=html.replace('</head>','<link rel="stylesheet" href="/study-tools.css?v=2"></head>');
  if(!html.includes('/study-tools.js')) html=html.replace('</body>','<script src="/study-tools.js?v=2"></script></body>');
  return new Response(html,{headers:{'content-type':'text/html; charset=utf-8','cache-control':'no-store'}});
};
export const config={path:'/generated/:id',method:'GET'};
