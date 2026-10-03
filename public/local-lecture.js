(()=>{
async function boot(){
 const app=document.getElementById('localLectureApp'),id=new URLSearchParams(location.search).get('id');
 const lecture=id&&await window.StudyAtlasLocalDB.get(id);
 if(!lecture?.pdf){app.innerHTML='<div class="atlas-local-loading"><b>This local lecture is not on this device.</b><a href="/">Return to Study Atlas</a></div>';return;}
 const url=URL.createObjectURL(lecture.pdf);document.title=lecture.title+' · Study Atlas';
 try{await window.StudyAtlasReader.open({id:lecture.id,title:lecture.title,module_id:lecture.module_id,module_code:lecture.module_code,previous_titles:lecture.previous_titles||[],pdfUrl:url,data:lecture.data||{},legacy:false});window.StudyAtlasLocalBuilder?.enhance(lecture).catch(()=>{});}
 catch(e){app.textContent=e.message;}
 addEventListener('pagehide',()=>URL.revokeObjectURL(url),{once:true});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
