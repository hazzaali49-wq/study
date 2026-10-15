import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs';
import {read} from './dom.mjs';

const html=read('index.html');
const source=html.match(/function openLecture\(id,opts=\{\}\)\{[\s\S]*?\n\}/)[0];
const modules=JSON.parse(html.match(/<script id="module-data" type="application\/json">([\s\S]*?)<\/script>/)[1]);
const lectures=modules.flatMap(m=>m.lectures);
function navigation(items=lectures){
 const visited=[],alerts=[];
 const context=vm.createContext({URL,Number,lectureMap:new Map(items.map(l=>[l.id,l])),location:{href:'https://study--atlas.netlify.app/#module-anat20060',assign:u=>visited.push(u)},alert:m=>alerts.push(m)});
 vm.runInContext(source,context);
 return {context,visited,alerts};
}
test('every catalogued lecture opens at top level, allowing Netlify authentication outside the iframe',()=>{
 const app=navigation();
 for(const lecture of lectures){
  vm.runInContext(`openLecture(${JSON.stringify(lecture.id)})`,app.context);
  const target=new URL(app.visited.at(-1));
  assert.equal(target.origin,'https://study--atlas.netlify.app');
  assert.equal(target.pathname,'/'+lecture.href);
  assert.ok(fs.existsSync(new URL('../public/'+lecture.href,import.meta.url)));
 }
 assert.equal(app.visited.length,lectures.length);
});
test('opening a saved note keeps its slide destination',()=>{
 const app=navigation();vm.runInContext("openLecture('os-coxae-femur',{figureIndex:12})",app.context);
 assert.equal(new URL(app.visited[0]).searchParams.get('slide'),'13');
});
test('an unavailable lecture does not navigate or leave an empty frame',()=>{
 const app=navigation();vm.runInContext("openLecture('missing')",app.context);
 assert.equal(app.visited.length,0);assert.equal(app.alerts.length,1);
});
