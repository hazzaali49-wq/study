import {getStore} from '@netlify/blobs';import {json} from './_shared.mjs';
export default async ()=>{try{const store=getStore({name:'study-atlas',consistency:'strong'});const lectures=(await store.get('manifest.json',{type:'json',consistency:'strong'}))||[];lectures.sort((a,b)=>(a.created||0)-(b.created||0));return json({lectures})}catch(e){return json({lectures:[],error:e?.message||String(e)},200)}};
export const config={path:'/api/library',method:'GET'};
