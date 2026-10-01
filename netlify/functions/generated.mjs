import {getStore} from '@netlify/blobs';
export default async (req,context)=>{const id=context.params?.id||'';const store=getStore({name:'study-atlas',consistency:'strong'});const html=await store.get(`lectures/${id}.html`,{type:'text',consistency:'strong'});if(!html)return new Response('Lecture not found',{status:404});return new Response(html,{headers:{'content-type':'text/html; charset=utf-8','cache-control':'no-store'}})};
export const config={path:'/generated/:id',method:'GET'};
