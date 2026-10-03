import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {spawnSync} from 'node:child_process';
const scratch=fs.mkdtempSync(path.join(os.tmpdir(),'atlas-check-'));let checked=0,failed=0;
function check(file,label=file){const r=spawnSync(process.execPath,['--check',file],{encoding:'utf8'});checked++;if(r.status!==0){failed++;console.error(label+'\n'+r.stderr);}}
function walk(dir){for(const item of fs.readdirSync(dir,{withFileTypes:true})){const file=path.join(dir,item.name);if(item.isDirectory())walk(file);else if(/\.(m?js)$/.test(file))check(file);else if(file.endsWith('.html')){const html=fs.readFileSync(file,'utf8');let n=0;for(const match of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)){if(/\bsrc=|application\/json/i.test(match[1])||!match[2].trim())continue;const target=path.join(scratch,'inline-'+checked+'.js');fs.writeFileSync(target,match[2]);check(target,file+' inline script '+(++n));}}}}
try{walk('public');walk('netlify/functions');}finally{fs.rmSync(scratch,{recursive:true,force:true});}
console.log(`Syntax: ${checked} scripts checked, ${failed} failures`);if(failed)process.exit(1);
