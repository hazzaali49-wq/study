import test from 'node:test';
import assert from 'node:assert/strict';
import {matchCalendarLecture, inferLectureNumber, inferModule, LECTURE_CATALOG} from '../netlify/functions/catalog.mjs';
import browserCatalog from '../public/course-catalog.js';
test('GH/IGF abbreviations choose endocrine lecture 6, with or without a module code',()=>{
 for(const title of ['MDSA20030 GH IGF Axis.pdf','GH IGF-1 Axis.pdf','Growth Hormone IGF-I Axis','MDSA20030 Growth Hormone / IGF-I Axis.pdf']){
  const result=matchCalendarLecture(title);assert.equal(result.module_code,'MDSA20030');assert.equal(result.number,6);
 }
});
test('module codes constrain module candidates and do not supply lecture evidence',()=>{
 assert.equal(matchCalendarLecture('MDSA20030'),null);
 assert.equal(matchCalendarLecture('MDSA20030 unknown topic.pdf'),null);
 assert.equal(matchCalendarLecture('NMHS10100 Growth Hormone IGF Axis.pdf'),null);
 assert.equal(inferLectureNumber('MDSA20030','','MDSA20030.pdf'),null);
 assert.equal(inferModule('MDSA20030').code,'MDSA20030');
});
test('lecture numbers follow the catalogue rather than dates',()=>{
 assert.equal(matchCalendarLecture('MDSA20030 Thyroid and Parathyroid Anatomy.pdf').number,5);
 assert.equal(matchCalendarLecture('MDSA20030 GH IGF Axis.pdf').calendar_date,'2026-09-23');
 assert.equal(matchCalendarLecture('Calcium homeostasis').number,8);
});
test('ambiguous and conflicting evidence requires an edit',()=>{
 assert.equal(matchCalendarLecture('module introduction'),null);
 assert.equal(matchCalendarLecture('MDSA20030 PATH30080 lecture.pdf'),null);
 assert.equal(matchCalendarLecture('pituitary'),null);
});
test('the original filename repairs stale generated titles',()=>{
 const match=matchCalendarLecture(['MDSA20030 GH IGF Axis.pdf','Module Introduction / Principles of Endocrinology']);
 assert.equal(match.number,6);assert.equal(match.module_code,'MDSA20030');
});
test('browser and server use exactly the same results across course catalogues',()=>{
 for(const [code,lectures] of Object.entries(LECTURE_CATALOG))for(const [,title] of lectures){
  const query=code+' '+title+'.pdf';assert.deepEqual(browserCatalog.matchCalendarLecture(query),matchCalendarLecture(query));
 }
});
