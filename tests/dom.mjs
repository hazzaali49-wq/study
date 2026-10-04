import fs from 'node:fs';
import vm from 'node:vm';
import {parseHTML} from 'linkedom';
import learning from '../public/study-learning.js';
import visuals from '../public/slide-visuals.js';
import notes from '../public/slide-notes.js';
const read=file=>fs.readFileSync(new URL('../public/'+file,import.meta.url),'utf8');
function dom(html){
 const {window,document}=parseHTML(html),values=new Map(),events=[];
 const storage={getItem:k=>values.get(k)||null,setItem:(k,v)=>values.set(k,v),removeItem:k=>values.delete(k)};
 const context={window,document,localStorage:storage,sessionStorage:storage,location:{pathname:'/local-lecture.html',href:'https://atlas.test/local-lecture.html',search:'',origin:'https://atlas.test'},URL,URLSearchParams,Blob,Map,Set,Math,Date,CSS:{escape:s=>s},innerHeight:900,innerWidth:1440,devicePixelRatio:1,scrollY:0,matchMedia:()=>({matches:false}),requestAnimationFrame:()=>0,setTimeout:()=>0,clearTimeout(){},ResizeObserver:class {observe(){}},IntersectionObserver:class {constructor(cb){this.callback=cb;}observe(){}unobserve(){}disconnect(){}},addEventListener:window.addEventListener.bind(window),Event:window.Event,CustomEvent:window.CustomEvent,console};
 Object.defineProperties(window.HTMLElement.prototype,{clientWidth:{configurable:true,get(){return 600;}},offsetWidth:{configurable:true,get(){return 600;}},offsetHeight:{configurable:true,get(){return 300;}}});
 window.HTMLElement.prototype.getBoundingClientRect=()=>({top:0,bottom:800,left:0,width:600,height:300});window.HTMLElement.prototype.scrollIntoView=function(){events.push(['scroll',this.id]);};window.HTMLElement.prototype.scrollTo=function(){};
 window.HTMLCanvasElement.prototype.toDataURL=()=> 'data:image/webp;base64,U0xJREU=';
 window.HTMLCanvasElement.prototype.getContext=()=>new Proxy({},{get:()=>()=>{}});
 window.StudyAtlasSlideNotes=notes;window.StudyAtlasLearning=learning;window.StudyAtlasVisuals=visuals;window.StudyAtlasFigureLabels={read:async()=>null};window.StudyAtlasLocalAI={};
 window.StudyAtlasPDF={load:async()=>({numPages:28,getPage:async n=>({n,getViewport:()=>({width:600,height:450}),render:()=>({promise:Promise.resolve()}),cleanup(){}})}),readPage:async p=>({n:p.n,text:'Source\nA teaching point from this original slide.',lines:['Source','A teaching point from this original slide.'],boxes:[],width:600,height:450})};
 Object.assign(window,{localStorage:storage,sessionStorage:storage,location:context.location,parent:{postMessage:msg=>events.push(msg)}});
 window.indexedDB=undefined;
 const sandbox=vm.createContext(context);
 vm.runInContext(read('study-store.js'),sandbox);vm.runInContext(read('study-notebook.js'),sandbox);
 return {window,document,values,events,context:sandbox};
}

export {dom,read};
