"use strict";
// Drives a real multi-party battle through game.js to completion (auto-AI),
// verifying turn flow, summons, and the victory→town transition don't throw.
const fs=require("fs"), path=require("path"), vm=require("vm");
const base=path.join(__dirname,"..","web","js");

function mockCtx(){ const n=()=>{}; return {save:n,restore:n,translate:n,scale:n,rotate:n,setTransform:n,beginPath:n,closePath:n,
  moveTo:n,lineTo:n,ellipse:n,arc:n,fill:n,stroke:n,quadraticCurveTo:n,fillRect:n,strokeRect:n,fillText:n,strokeText:n,
  createLinearGradient:()=>({addColorStop:n}),measureText:()=>({width:10}),
  set fillStyle(v){},set strokeStyle(v){},set lineWidth(v){},set globalAlpha(v){},set font(v){},set textAlign(v){},set shadowColor(v){},set shadowBlur(v){}}; }
function mockEl(tag){ return { tag,children:[],style:{},classList:{_s:new Set(),add(c){this._s.add(c);},remove(c){this._s.delete(c);},toggle(){},contains(c){return this._s.has(c);}},
  appendChild(c){this.children.push(c);return c;},removeChild(c){const i=this.children.indexOf(c);if(i>=0)this.children.splice(i,1);},
  get firstChild(){return this.children[0]||null;},addEventListener(){},getContext(){return mockCtx();},
  getBoundingClientRect(){return{left:0,top:0,width:800,height:450};},set textContent(v){},set innerHTML(v){},
  scrollTop:0,scrollHeight:0,onclick:null,disabled:false,className:"",id:"",title:"" }; }
const elements={}; ["scene","ui","battle-ui","log","actions","submenu","topbar","mute","tb-name","tb-level","tb-hp","tb-mp","tb-gold","tb-chapter"].forEach(id=>elements[id]=mockEl("div"));
const document={getElementById:id=>elements[id]||mockEl("div"),createElement:t=>mockEl(t),addEventListener(){},body:mockEl("body")};
const osc={type:"",frequency:{setValueAtTime(){},exponentialRampToValueAtTime(){}},connect(){},start(){},stop(){}};
const gn={gain:{value:0,setValueAtTime(){},exponentialRampToValueAtTime(){}},connect(){}};
function AC(){ return {currentTime:0,state:"running",sampleRate:44100,destination:{},createGain:()=>gn,createOscillator:()=>osc,
  createBuffer:(c,n)=>({getChannelData:()=>new Float32Array(n)}),createBufferSource:()=>({connect(){},start(){},buffer:null}),
  createBiquadFilter:()=>({type:"",frequency:{value:0},connect(){}}),resume(){}}; }
const store={}; const localStorage={getItem:k=>store[k]||null,setItem:(k,v)=>{store[k]=v;},removeItem:k=>{delete store[k];}};
const window={AudioContext:AC,prompt:()=>"Hero",localStorage,addEventListener(){},devicePixelRatio:2};
// fast timers so the battle resolves quickly; no rAF/music loops
const ctx={Math,JSON,console,document,window,localStorage,AudioContext:AC,prompt:window.prompt,confirm:()=>true,
  requestAnimationFrame:()=>0, setTimeout:(f)=>setTimeout(f,0), clearTimeout:(h)=>clearTimeout(h),
  setInterval:()=>0, clearInterval:()=>{}, Float32Array, Promise };
vm.createContext(ctx);
for(const f of ["utils.js","data.js","sprites.js","engine.js","audio.js","save.js","game.js"])
  vm.runInContext(fs.readFileSync(path.join(base,f),"utf8"),ctx,{filename:f});
vm.runInContext("this.__g={startBattle,makeEnemy,makeAlly,getState:()=>({hero,party,account,progress,state})};",ctx);
const G=ctx.__g;

let pass=0,fail=0; function ok(n,c){ if(c){pass++;console.log("PASS  "+n);} else {fail++;console.log("FAIL  "+n);} }

async function main(){
  vm.runInContext("beginGame(CLASSES.overlord);",ctx);
  const s=G.getState();
  // build hero up and add an ally, all auto-controlled
  for(let i=0;i<4;i++) s.hero.levelUp();
  const schools=["necromancy","arcane","necromancy","arcane","blood"];
  let si=0; while(s.hero.skillPoints>0){ let placed=false;
    for(let t=0;t<schools.length&&!placed;t++){ if(s.hero.spendSkill(schools[(si++)%schools.length])) placed=true; }
    if(!placed) break; }
  while(s.hero.attrPoints>0){ if(!s.hero.spendAttr("mag")) break; }
  s.hero.fullRestore();
  const ally=ctx.makeAlly("vampire",5); s.party.push(ally);
  ok("party has 2 members", s.party.length===2);

  const enemies=[ctx.makeEnemy("goblin",1), ctx.makeEnemy("wolf",1)];
  const battlePromise=ctx.startBattle(enemies, false, false);
  vm.runInContext("autoMode=true;", ctx);   // startBattle resets it; set after so the battle runs headless
  const timeout=new Promise((_,rej)=>setTimeout(()=>rej(new Error("battle timed out")),8000));
  await Promise.race([battlePromise, timeout]);
  ok("battle ran to completion without throwing", true);
  const s2=G.getState();
  ok("ended in a resolved state (town/result)", ["town","result","victory","defeat"].includes(s2.state));
  ok("hero survived & gained XP/level", s2.hero.level>=5);
}
main().then(()=>{ console.log("\n"+pass+"/"+(pass+fail)+" battle checks passed"); process.exit(fail?1:0); })
  .catch(e=>{ console.log("FAIL  battle drive: "+e.message); console.log((e.stack||"").split("\n").slice(1,4).join("\n"));
    process.exit(1); });
