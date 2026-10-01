import {getStore} from '@netlify/blobs';import {json} from './_shared.mjs';
export default async (req)=>{const id=new URL(req.url).searchParams.get('job_id');if(!id)return json({error:'Missing job_id'},400);const store=getStore({name:'study-atlas',consistency:'strong'});const job=await store.get(`jobs/${id}/job.json`,{type:'json',consistency:'strong'});return job?json(job):json({error:'Build job not found'},404)};
export const config={path:'/api/ai/build-status',method:'GET'};
