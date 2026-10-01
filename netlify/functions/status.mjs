import {json, MODEL, OPENAI_KEY} from './_shared.mjs';
export default async () => json({ready:!!OPENAI_KEY,model:MODEL,lecture_builder:true,admin_required:!!(process.env.STUDY_ATLAS_ADMIN_KEY||'').trim(),hosting:'netlify',deploy_context:process.env.CONTEXT||'',branch:process.env.BRANCH||'',free_branch_mode:(process.env.CONTEXT==='branch-deploy')});
export const config={path:'/api/ai/status',method:'GET'};
