import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require=createRequire(import.meta.url);
const {buildExport}=require('../public/atlas-republic-export.js');
const modules=[{id:'x',code:'MDSA00001'},{id:'y',code:'ANAT00002'}];
const catalogue={MODULES:modules,LECTURE_CATALOG:{MDSA00001:[[1,'A'],[2,'B']],ANAT00002:[[1,'C']]}};
test('Republic export contains only explicitly completed syllabus lectures',()=>{
 const output=buildExport(catalogue,{
  'x::lecture-1':true,'x::lecture-2':false,'y::lecture-1':true,
  'x::lecture-99':true,'atlasNote':'secret text','x::custom-notes':true
 },'2026-10-15T15:00:00.000Z');
 assert.deepEqual(output,{
  format:'study-atlas-republic-progress',version:1,exported_at:'2026-10-15T15:00:00.000Z',
  completed:[{module_code:'ANAT00002',lecture_number:1},{module_code:'MDSA00001',lecture_number:1}]
 });
 assert.ok(!JSON.stringify(output).includes('secret text'));
});
test('empty and no progress remain empty, without inventing completion',()=>{
 assert.deepEqual(buildExport(catalogue,{}).completed,[]);
 assert.deepEqual(buildExport({MODULES:[],LECTURE_CATALOG:{}},{}).completed,[]);
});
