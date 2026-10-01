import {getStore} from '@netlify/blobs';
export default async (req)=>{const id=new URL(req.url).searchParams.get('id')||'';const store=getStore({name:'study-atlas',consistency:'strong'});const pdf=await store.get(`originals/${id}.pdf`,{type:'arrayBuffer',consistency:'strong'});if(!pdf)return new Response('Original lecture not found',{status:404});return new Response(pdf,{headers:{'content-type':'application/pdf','content-disposition':`inline; filename="${id}.pdf"`,'cache-control':'private, max-age=3600'}})};
export const config={path:'/api/original',method:'GET'};
