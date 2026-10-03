import {json} from './_shared.mjs';
export default async () => json({
  ready:true,
  model:'On-device AI · no credits',
  local_only:true,
  lecture_builder:true,
  admin_required:!!(process.env.STUDY_ATLAS_ADMIN_KEY||'').trim(),
  hosting:'netlify',
  deploy_context:process.env.CONTEXT||'',
  branch:process.env.BRANCH||'',
  free_branch_mode:true
});
export const config={path:'/api/ai/status',method:'GET'};