(()=>{
 if(window.__atlasLocalAIInstalled)return;window.__atlasLocalAIInstalled=1;
 const native=window.fetch.bind(window);let session=null,creating=null;
 async function ensure(){
   if(session)return session;if(creating)return creating;
   creating=(async()=>{
     if(!('LanguageModel' in self))throw new Error('On-device AI is not available in this browser. No cloud AI or paid credits were used.');
     const opts={expectedInputs:[{type:'text',languages:['en']}],expectedOutputs:[{type:'text',languages:['en']}]};
     const a=await LanguageModel.availability(opts).catch(()=> 'unavailable');
     if(a==='unavailable')throw new Error('Chrome on-device AI is unavailable on this device. No paid AI was called.');
     session=await LanguageModel.create({...opts,initialPrompts:[{role:'system',content:'You are Study Atlas AI, a concise medical-school tutor. Use the lecture context supplied by the page as the primary source. Explain clearly and compactly. If something goes beyond the supplied source, label it Extra context.'}]});
     return session;
   })();
   try{return await creating}finally{creating=null}
 }
 async function localAnswer(init){
   const body=typeof init?.body==='string'?JSON.parse(init.body):{};
   const prompt=body.prompt||body.question||'Explain the current lecture context.';
   const s=await ensure();return await s.prompt(prompt);
 }
 window.fetch=async function(input,init){
   const url=typeof input==='string'?input:input?.url||'';
   if(url.includes('/api/ai/status'))return new Response(JSON.stringify({ready:true,free_branch_mode:true,local_only:true,admin_required:false,model:'On-device AI · no credits'}),{status:200,headers:{'content-type':'application/json'}});
   if(url.includes('/api/ai/chat')){
     try{const answer=await localAnswer(init);return new Response(JSON.stringify({answer,local:true}),{status:200,headers:{'content-type':'application/json'}})}
     catch(e){return new Response(JSON.stringify({error:e?.message||String(e),local:true}),{status:503,headers:{'content-type':'application/json'}})}
   }
   return native(input,init);
 };
 window.StudyAtlasLocalAI={ensure,ask:async prompt=>(await ensure()).prompt(prompt)};
})();