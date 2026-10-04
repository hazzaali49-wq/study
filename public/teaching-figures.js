/* Small, original teaching drawings. Selection highlights tissue/organ shapes, never PDF words. */
(function(root){
'use strict';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const C={pink:'#ef97b7',purple:'#a98bd8',pale:'#e8d4e7',blue:'#7cbadd',mint:'#75d6b7',gold:'#edc57b',blood:'#ce6481'};
const REFS={pituitary:'https://histologyguide.com/slideview/MH-149-pituitary/13-slide-1.html',pituitaryAnatomy:'https://openstax.org/books/anatomy-and-physiology-2e/pages/17-3-the-pituitary-gland-and-hypothalamus',histology:'https://www.ouhsc.edu/histology/text%20sections/endocrine.html',thyroid:'https://openstax.org/books/anatomy-and-physiology-2e/pages/17-4-the-thyroid-gland'};
const group=(id,content)=>`<g class="atlas-figure-region" data-part="${id}">${content}</g>`;
const cell=(x,y,fill,rx=19,ry=16)=>`<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="${fill}" stroke="#785776" stroke-width="1.5"/><ellipse cx="${x-2}" cy="${y+1}" rx="5" ry="6" fill="#604c7c"/>`;
const label=(x,y,text)=>`<text x="${x}" y="${y}" class="atlas-figure-label" text-anchor="middle">${esc(text)}</text>`;
const badge=(x,y,n)=>`<g class="atlas-figure-number"><circle cx="${x}" cy="${y}" r="13" fill="#172039" stroke="#fff" stroke-width="1.5"/><text x="${x}" y="${y+5}" fill="#fff" text-anchor="middle" font-size="13" font-weight="800">${n}</text></g>`;
const part=(id,name,look,why)=>({id,name,look,why});
function anterior(){
 const groups=[[],[],[]];
 for(let row=0;row<5;row++)for(let col=0;col<8;col++){
  const x=85+col*53+(row%2)*11,y=83+row*44;if((col===3&&row<3)||(col===5&&row>2))continue;
  const type=(col+row*2)%3;groups[type].push(cell(x,y,[C.pink,C.purple,C.pale][type]));
 }
 return {id:'anterior-histology',title:'Anterior pituitary · read the tissue',kind:'Histology sketch',ref:REFS.histology,
  intro:'Follow the cell groups and the blood spaces between them.',
  svg:`<rect x="35" y="42" width="530" height="265" rx="65" fill="#e6c6d9"/>${group('vessels','<path d="M50 147 C160 91 172 193 276 157 S395 123 550 170 M242 52 C215 136 296 179 290 296" fill="none" stroke="#bc627e" stroke-width="21"/><path d="M50 147 C160 91 172 193 276 157 S395 123 550 170" fill="none" stroke="#f9dfdc" stroke-width="10"/>')}${group('acidophils',groups[0].join(''))}${group('basophils',groups[1].join(''))}${group('chromophobes',groups[2].join(''))}${badge(85,72,1)}${badge(138,72,2)}${badge(191,72,3)}${badge(298,142,4)}${label(300,336,'Cell cords around blood spaces')}`,
  parts:[part('acidophils','Pink cells · acidophils','Pink or red-staining cell bodies.','This group includes growth-hormone and prolactin cells.'),part('basophils','Purple cells · basophils','Darker blue-purple cell bodies.','This group includes ACTH, TSH and gonadotroph cells.'),part('chromophobes','Pale cells · chromophobes','Cells with much less obvious staining.','Do not infer a specific hormone from a pale appearance.'),part('vessels','Blood spaces · capillaries','Channels between groups of cells.','Hormones enter the circulation here.')],takeaway:'Staining separates broad groups; it does not identify each cell’s hormone.'};
}
function posterior(){
 const fibers=Array.from({length:11},(_,i)=>`<path d="M${58+i*44} 62 C${15+i*44} 127 ${145+i*30} 174 ${80+i*43} 281" fill="none" stroke="${i%2?C.gold:C.pink}" stroke-width="${i%3+3}"/>`).join('');
 const nuclei=[[92,133],[157,228],[267,99],[312,230],[421,127],[495,243]].map(([x,y])=>`<ellipse cx="${x}" cy="${y}" rx="7" ry="10" fill="#706386"/>`).join('');
 return {id:'posterior-histology',title:'Posterior pituitary · follow the nerve endings',kind:'Histology sketch',ref:REFS.pituitary,intro:'Find the fibres first, then their swellings and the supporting cells.',
  svg:`<rect x="35" y="42" width="530" height="265" rx="65" fill="#f0dfe5"/>${group('axons',fibers+'<path d="M165 65 C174 110 180 128 186 168 S200 242 218 281 M359 63 C376 125 358 163 375 194 S404 246 416 282" fill="none" stroke="'+C.gold+'" stroke-width="6"/>')}${group('herring','<ellipse cx="186" cy="168" rx="25" ry="17" fill="#d48b94"/><ellipse cx="375" cy="194" rx="25" ry="17" fill="#d48b94"/>')}${group('pituicytes',nuclei)}${group('blood','<path d="M67 278 Q282 240 531 279" fill="none" stroke="#b75476" stroke-width="23"/><path d="M67 278 Q282 240 531 279" fill="none" stroke="#fae7df" stroke-width="12"/>')}${badge(80,96,1)}${badge(186,163,2)}${badge(270,91,3)}${badge(465,262,4)}${label(300,336,'Fibres + support cells + hormone stores')}`,
  parts:[part('axons','Axons · nerve fibres','Long, fine strands rather than packed gland cells.','These fibres arrive from neurons in the hypothalamus.'),part('herring','Herring bodies','Bulges along the fibres.','These enlarged axon regions store hormone-containing vesicles.'),part('pituicytes','Pituicytes · support cells','Scattered nuclei between the fibres.','They support the nerve tissue; they are not the hormone-making neurons.'),part('blood','Capillaries','Small blood channels near the endings.','Released hormone enters the blood here.')],takeaway:'Look for a fibrous background with scattered nuclei and swollen axon segments.'};
}
function pituitary(){return {id:'pituitary-anatomy',title:'Two routes from the hypothalamus',kind:'Anatomy schematic',ref:REFS.pituitaryAnatomy,intro:'Trace blood to the anterior lobe and nerve fibres to the posterior lobe.',
 svg:`${label(75,42,'ANTERIOR')}${label(520,42,'POSTERIOR')}${group('hypothalamus','<path d="M142 67 Q300 10 458 67 L386 133 Q300 151 214 133Z" fill="'+C.purple+'" stroke="#d3b8f0" stroke-width="2"/>')}${group('anterior','<path d="M285 204 C180 155 113 237 164 294 C201 334 306 319 327 289 L326 233Z" fill="'+C.pink+'" stroke="#f6c4d5" stroke-width="2"/>')}${group('posterior','<path d="M303 132 L339 132 L344 209 C404 215 431 260 398 293 C377 316 335 309 327 282 L316 206Z" fill="'+C.blue+'" stroke="#b9e0f5" stroke-width="2"/>')}${group('portal','<path d="M251 115 C233 162 241 198 241 246 M224 247 L271 247 M240 238 L215 268 M241 246 L274 274" fill="none" stroke="'+C.blood+'" stroke-width="8" stroke-linecap="round"/>')}${group('axons','<path d="M323 91 C302 144 329 191 365 263 M348 93 C323 152 344 197 383 250" fill="none" stroke="'+C.gold+'" stroke-width="5" stroke-linecap="round"/>')}${label(294,90,'Hypothalamus')}${label(225,294,'Anterior lobe')}${label(393,333,'Posterior lobe')}${badge(189,107,1)}${badge(217,175,2)}${badge(169,251,3)}${badge(353,172,4)}${badge(398,277,5)}`,
 parts:[part('hypothalamus','Hypothalamus','The brain region above the gland.','It controls pituitary output.'),part('portal','Portal blood vessels','The red route leading to the anterior lobe.','Blood carries the hypothalamic releasing or inhibiting signals.'),part('anterior','Anterior pituitary','The glandular lobe.','Its endocrine cells make and release their own hormones.'),part('axons','Long axons','The gold route running down the stalk.','Hormone made in hypothalamic neurons travels along these fibres.'),part('posterior','Posterior pituitary','The neural lobe at the end of the stalk.','It releases hormone delivered by the nerve fibres.')],takeaway:'Anterior control uses a blood route; posterior delivery uses a nerve route.'};}
function follicle(){
 const cells=Array.from({length:24},(_,i)=>{const a=i*Math.PI/12,x=300+115*Math.cos(a),y=179+115*Math.sin(a);return `<g transform="rotate(${i*15} ${x} ${y})">${cell(+x.toFixed(1),+y.toFixed(1),C.purple,21,15)}</g>`;}).join('');
 return {id:'thyroid-histology',title:'Thyroid follicle · a ring around a store',kind:'Histology sketch',ref:REFS.thyroid,intro:'Read from the centre outwards: stored material, cell layer, then blood supply.',
 svg:`<rect x="37" y="35" width="526" height="291" rx="75" fill="#e8d0dc"/>${group('colloid','<circle cx="300" cy="179" r="99" fill="'+C.pink+'"/><path d="M247 159 Q300 131 354 165 M245 202 Q305 226 354 190" fill="none" stroke="#f6c6d8" stroke-width="6"/>')}${group('epithelium',cells)}${group('capillaries','<path d="M119 83 C97 173 120 269 157 281 M477 75 C505 169 483 244 451 291" fill="none" stroke="#b95b7c" stroke-width="17"/><path d="M119 83 C97 173 120 269 157 281 M477 75 C505 169 483 244 451 291" fill="none" stroke="#f5d3d7" stroke-width="8"/>')}${label(300,187,'Colloid')}${badge(300,222,1)}${badge(416,179,2)}${badge(488,162,3)}`,
 parts:[part('colloid','Colloid','The material filling the central space.','It holds thyroglobulin, the protein used to make and store thyroid hormone.'),part('epithelium','Follicular cells','A continuous layer around the central space.','These cells face the colloid on their inner surface.'),part('capillaries','Nearby capillaries','Small vessels outside the ring of cells.','Thyroid hormone reaches the circulation on this outer side.')],takeaway:'The stored material is in the middle; the working cells form its wall.'};
}
function thyroid(){return {id:'thyroid-anatomy',title:'Thyroid · orient yourself in the neck',kind:'Anatomy schematic',ref:REFS.thyroid,intro:'Front view: find the windpipe, the two lobes and the bridge between them.',
 svg:`<path d="M181 30 Q164 174 146 324 M419 30 Q436 174 454 324" fill="none" stroke="#35445d" stroke-width="3"/>${group('larynx','<path d="M248 53 Q300 38 352 53 L337 124 Q300 149 263 124Z" fill="'+C.blue+'" stroke="#b3d8ee" stroke-width="2"/>')}${group('trachea','<rect x="265" y="130" width="70" height="182" rx="22" fill="#294155" stroke="#8bbdd1" stroke-width="2"/>'+Array.from({length:7},(_,i)=>`<path d="M267 ${143+i*23} Q300 ${151+i*23} 333 ${143+i*23}" fill="none" stroke="#8bbdd1" stroke-width="5"/>`).join(''))}${group('lobes','<path d="M255 146 C201 85 177 160 193 230 C204 284 242 278 263 225Z M345 146 C399 85 423 160 407 230 C396 284 358 278 337 225Z" fill="'+C.pink+'" stroke="#f2c5d7" stroke-width="2"/>')}${group('isthmus','<path d="M250 187 Q300 207 350 187 L350 220 Q300 237 250 220Z" fill="'+C.gold+'" stroke="#f7e1b4" stroke-width="2"/>')}${label(300,345,'Anterior view · simplified')}${badge(300,77,1)}${badge(300,283,2)}${badge(213,178,3)}${badge(300,212,4)}`,
 parts:[part('larynx','Larynx · voice box','Above the thyroid in this front view.','Use it as the upper landmark.'),part('trachea','Trachea · windpipe','The central tube continuing down the neck.','The thyroid lies in front of and beside it.'),part('lobes','Thyroid lobes','The two larger regions on either side.','Think of the two wings of a butterfly.'),part('isthmus','Isthmus · connecting bridge','The narrow band joining the lobes.','It crosses in front of the trachea.')],takeaway:'Two side lobes are joined by a bridge across the front of the windpipe.'};}
function isReference(note,page){
 const heading=[note.title,...(page.lines||[]).slice(0,5)].join('\n');
 return ['cover','admin'].includes(note.kind)||/\blearning\s+(?:objectives?|outcomes?)\b/i.test(heading+' '+(String(page.text||'').length<1800?page.text:''))||/^(?:references?|bibliography|reading list|thank you|module information)\b/im.test(heading);
}
function select(note={},page={}){
 if(isReference(note,page))return null;
 // Prefer this slide's source; chapter-wide context and a glossary must not select a drawing.
 const source=String(page.text||note.source||'').trim();
 // A slide-specific title/explanation can name the structure even when the
 // PDF's extracted text is only a caption or a few abbreviated labels.
 const t=[source,note.title,note.explain,note.visual_explain].filter(Boolean).join(' ').toLowerCase();
 if(/pituicyt|herring bod/.test(t)||(/pars nervosa|posterior pituitary/.test(t)&&/histolog|micrograph/.test(t)))return posterior();
 if(/pituitary|pars distalis|adenohypophysis/.test(t)&&/acidophil|basophil|chromophob|histolog|micrograph/.test(t))return anterior();
 if(/thyroid/.test(t)&&/follicl|colloid/.test(t))return follicle();
 if(/thyroid/.test(t)&&/trachea|isthmus|larynx|anatomy of the neck/.test(t))return thyroid();
 if(/pituitary|hypophysis/.test(t)&&/hypothalam/.test(t)&&/portal|infundibul|stalk|anterior.{0,60}posterior|posterior.{0,60}anterior|magnocellular|parvocellular/.test(t))return pituitary();
 return null;
}
function html(figure,n){
 if(!figure)return '';
 const id='atlas-drawing-'+n;
 return `<figure class="atlas-teaching-figure" data-figure="${figure.id}"><figcaption><span>${esc(figure.kind)} · slide ${n}</span><h4 id="${id}">${esc(figure.title)}</h4><p>${esc(figure.intro)}</p></figcaption><svg class="atlas-structure-drawing" viewBox="0 0 600 360" role="img" aria-labelledby="${id}"><rect width="600" height="360" rx="20" fill="#0d1729"/>${figure.svg}</svg><div class="atlas-structure-buttons">${figure.parts.map((p,i)=>`<button data-structure="${p.id}" aria-pressed="false"><b>${i+1}</b> ${esc(p.name)}</button>`).join('')}<button data-structure="all" aria-pressed="true">Show all</button></div><div class="atlas-structure-explanation" aria-live="polite"><b>What to notice</b><p>${esc(figure.takeaway)}</p></div><small class="atlas-figure-footnote">Original teaching drawing · simplified, not a micrograph or exact scale. <a href="${figure.ref}" target="_blank" rel="noopener">Reference ↗</a></small></figure>`;
}
function bind(container,figure){
 const selectPart=id=>{
  container.querySelectorAll('[data-structure]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.structure===id)));
  container.querySelectorAll('[data-part]').forEach(g=>{g.classList.toggle('is-muted',id!=='all'&&g.dataset.part!==id);g.classList.toggle('is-selected',g.dataset.part===id);});
  const p=figure.parts.find(p=>p.id===id),out=container.querySelector('.atlas-structure-explanation');
  out.innerHTML=p?`<b>${esc(p.name)}</b><p>${esc(p.look)} ${esc(p.why)}</p>`:`<b>What to notice</b><p>${esc(figure.takeaway)}</p>`;
 };
 container.querySelectorAll('[data-structure]').forEach(b=>b.onclick=()=>selectPart(b.dataset.structure));
 container.querySelectorAll('[data-part]').forEach(g=>{g.style.cursor='pointer';g.onclick=()=>selectPart(g.dataset.part);});
}
const api={select,html,bind,isReference};if(typeof module==='object'&&module.exports)module.exports=api;else root.StudyAtlasTeachingFigures=api;
})(typeof window!=='undefined'?window:globalThis);
