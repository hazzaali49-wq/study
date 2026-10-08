import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {PDFDocument} from 'pdf-lib';

test('Lecture 8 reconstructs the exact 34-page original calcium PDF',async()=>{
  const parts=Array.from({length:13},(_,i)=>fs.readFileSync('public/resources/calcium-pdf64/part-'+String(i+1).padStart(2,'0')+'.txt','utf8').replace(/\s+/g,''));
  const bytes=Buffer.from(parts.join(''),'base64');
  assert.equal(bytes.subarray(0,4).toString(),'%PDF');
  assert.ok(bytes.length>3_500_000);
  const pdf=await PDFDocument.load(bytes);
  assert.equal(pdf.getPageCount(),34);
});

test('Lecture 8 uses the standard side-by-side slide reader, not the text fallback',()=>{
  const html=fs.readFileSync('public/lectures/calcium-homeostasis.html','utf8');
  const meta=JSON.parse(html.match(/<script id="atlasLectureMeta" type="application\/json">([\s\S]*?)<\/script>/)[1]);
  const data=JSON.parse(html.match(/<script id="atlasLectureData" type="application\/json">([\s\S]*?)<\/script>/)[1]);
  assert.equal(data.slide_count,34);
  assert.equal(data.slides.length,34);
  assert.equal(meta.pdfBase64Parts.count,13);
  assert.match(html,/slide-reader\.js\?v=13/);
  assert.doesNotMatch(html,/ORIGINAL SLIDE SOURCE/);
});

test('Lecture 8 keeps exact past-midterm question mapping',()=>{
  const links=fs.readFileSync('public/midterm-links.js','utf8');
  assert.match(links,/PAST MIDTERM QUESTION/);
  assert.match(links,/What is the normal action of parathyroid hormone \(PTH\) on the kidney\?/);
  assert.match(links,/Case 2 · Q3/);
  assert.match(links,/How can one distinguish between true and pseudohypoparathyroidism\?/);
  assert.match(links,/Case 2 · Q4/);
});
