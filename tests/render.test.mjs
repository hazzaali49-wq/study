import test from 'node:test';
import assert from 'node:assert/strict';
import {renderGenerated,callOpenAI,PAID_AI_ALLOWED} from '../netlify/functions/_shared.mjs';
test('new saved lectures embed full structured data and the shared reader without script injection',()=>{
 const source={title:'Growth Hormone </script><script>evil()</script>',slide_count:11,slides:[{n:11,explain:'Final slide'}],chapters:[]};
 const html=renderGenerated(source,'/api/original?id=gh','MDSA20030','gh');
 assert.ok(html.includes('/slide-reader.js?v=3'));assert.ok(html.includes('id="atlasLectureData"'));
 const payload=html.match(/id="atlasLectureData">([\s\S]*?)<\/script>/)[1];assert.deepEqual(JSON.parse(payload),source);assert.ok(!payload.includes('</script>'));
});
test('paid cloud AI remains disabled by default even when an API key is present',async()=>{
 assert.equal(PAID_AI_ALLOWED,false);await assert.rejects(callOpenAI({}),/Paid cloud AI is disabled/);
});
