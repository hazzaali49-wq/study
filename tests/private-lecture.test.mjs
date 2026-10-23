import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {createCipheriv,randomBytes,webcrypto} from 'node:crypto';
import privateLectures from '../public/private-lecture.js';
import {dom,read} from './dom.mjs';

const key=randomBytes(32),keyText=key.toString('base64url');
const fixture={version:1,id:'private-test',data:{title:'Private test',slide_count:3,slides:[1,2,3].map(n=>({n,title:'Slide '+n,explain:'A complete private explanation for this slide.',source:'Private source',takeaway:'Keep the original beside its explanation.'})),chapters:[]},pages:[1,2,3].map(n=>({n,width:720,height:540,text:'Private source',lines:['Private source'],image_base64:Buffer.from('RIFF0000WEBPtest').toString('base64')})),original:{name:'Private.pdf',base64:Buffer.from('%PDF-1.7\nprivate original').toString('base64')}};
function encrypt(bundle){const iv=randomBytes(12),cipher=createCipheriv('aes-256-gcm',key,iv);return Buffer.concat([Buffer.from('ATLASENC1\n'),iv,cipher.update(JSON.stringify(bundle)),cipher.final(),cipher.getAuthTag()]);}

test('private lecture encryption round-trips all slides and rejects a wrong key or changed ciphertext',async()=>{
 const packed=encrypt(fixture);
 assert.deepEqual(await privateLectures.decrypt(packed,keyText,{crypto:webcrypto}),fixture);
 await assert.rejects(privateLectures.decrypt(packed,randomBytes(32).toString('base64url'),{crypto:webcrypto}),/could not unlock/);
 const changed=Buffer.from(packed);changed[changed.length-20]^=1;
 await assert.rejects(privateLectures.decrypt(changed,keyText,{crypto:webcrypto}),/could not unlock/);
 await assert.rejects(privateLectures.decrypt(new Uint8Array(20),keyText,{crypto:webcrypto}),/incomplete/);
 const missing=structuredClone(fixture);missing.pages.pop();
 await assert.rejects(privateLectures.decrypt(encrypt(missing),keyText,{crypto:webcrypto}),/incomplete/);
 assert.equal(privateLectures.keyValue('https://atlas.test/#atlas-unlock=example.'+keyText,'example'),keyText);
 assert.throws(()=>privateLectures.keyValue('other.'+keyText,'example'),/different set/);
});

test('decrypted originals render through the existing two-panel reader and release browser blobs',async()=>{
 const app=dom('<html><body><div id="atlasTimerModal"></div><div id="atlasGenDock"></div></body></html>');
 const blobs=new Map();let seq=0,draws=0;
 const URLApi={createObjectURL(blob){const url='blob:https://atlas.test/'+(++seq);blobs.set(url,blob);return url;},revokeObjectURL(url){blobs.delete(url);}};
 const ImageClass=class{set src(url){assert.ok(blobs.has(url));queueMicrotask(()=>this.onload?.());}};
 const opened=privateLectures.prepared(fixture,{URL:URLApi,Blob,Image:ImageClass});
 app.window.HTMLCanvasElement.prototype.getContext=()=>({drawImage(){draws++;}});
 app.window.StudyAtlasPDF={preparedVersion:1,load:async()=>opened.pdf,readPage:async page=>page.atlasSource};
 vm.runInContext(read('slide-reader.js'),app.context);
 await app.window.StudyAtlasReader.open({id:'private-test',title:fixture.data.title,module_id:'anat20060',pdfUrl:opened.originalUrl,data:fixture.data,legacy:false});
 for(let n=1;n<=3;n++)await app.window.StudyAtlasReader.render(n,true);
 assert.equal(draws,3);assert.equal(app.document.querySelectorAll('.atlas-slide-row').length,3);
 assert.equal(app.document.querySelectorAll('.atlas-source-loading').length,0);
 assert.match(app.document.querySelector('#atlas-slide-3 .atlas-teaching-copy').textContent,/complete private explanation/);
 assert.equal(app.window.StudyAtlasReader.context().module_id,'anat20060');
 opened.dispose();assert.equal(blobs.size,0);
});

test('new GitHub lecture pages publish ciphertext and an unlock gate without the PDFs, images, teaching text or key',()=>{
 for(const [slug,count,pdfName] of [['knee-joint',36,'Knee_Joint_Original_Lecture.pdf'],['lumbar-plexus',23,'Lumbar_Plexus_Original_Lecture.pdf']]){
  const page=read('lectures/'+slug+'.html'),spec=JSON.parse(page.match(/id="atlasPrivateSpec" type="application\/json">([\s\S]*?)<\/script>/)[1]);
  assert.equal(spec.slide_count,count);assert.ok(spec.key_id&&!spec.key);
  assert.ok(!page.includes('atlasLectureData')&&!page.includes('source-case')&&!page.includes('image_base64'));
  assert.equal(fs.existsSync('public/resources/'+pdfName),false);
  assert.equal(fs.existsSync('public/resources/lecture-slides/'+slug),false);
  const packed=fs.readFileSync('public'+spec.bundle);assert.equal(packed.subarray(0,10).toString(),'ATLASENC1\n');
  assert.ok(packed.length>1000000);
 }
});
