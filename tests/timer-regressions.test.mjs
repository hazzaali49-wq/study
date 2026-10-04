import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const src=fs.readFileSync('public/study-tools.js','utf8');

test('timer keeps real elapsed time when a tab is backgrounded',()=>{
  assert.doesNotMatch(src,/Math\.min\(5,\s*Math\.floor\(\(now-last\)\/1000\)\)/);
  assert.match(src,/const now=Date\.now\(\),last=Number\(ses\.lastTick\|\|now\),delta=Math\.max\(0,Math\.floor\(\(now-last\)\/1000\)\)/);
});

test('countdown never adds overshoot time and has a primed completion alarm',()=>{
  assert.match(src,/add=Math\.min\(delta,Math\.max\(0,Number\(ses\.duration\|\|0\)-Number\(ses\.elapsed\|\|0\)\)\)/);
  assert.match(src,/if\(mode==='countdown'\)primeAlarm\(\)/);
  assert.match(src,/ses\.completed=true/);
});

test('paused timer can switch modes and timer render avoids rebuilding every lecture each second',()=>{
  assert.match(src,/mode:b\.dataset\.mode,elapsed:0/);
  assert.match(src,/function updateStudyTimeUI\(\)/);
  const render=src.slice(src.indexOf('function renderTimer()'),src.indexOf('function init()'));
  assert.doesNotMatch(render,/refreshLectures\(\)/);
});
