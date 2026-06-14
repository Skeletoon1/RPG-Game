"use strict";
// Smoke test: mock the browser DOM/canvas/audio, load ALL front-end scripts
// (incl. game.js + audio.js), then drive every screen builder to catch
// load-time and render errors without a real browser.
const fs=require("fs"), path=require("path"), vm=require("vm");
const base=path.join(__dirname,"..","web","js");

// ---- mocks ----
function mockCtx(){ const n=()=>{};
  return {save:n,restore:n,translate:n,scale:n,rotate:n,setTransform:n,beginPath:n,closePath:n,moveTo:n,lineTo:n,
    ellipse:n,arc:n,fill:n,stroke:n,quadraticCurveTo:n,fillRect:n,strokeRect:n,fillText:n,strokeText:n,
    createLinearGradient:()=>({addColorStop:n}), measureText:()=>({width:10}),
    set fillStyle(v){}, set strokeStyle(v){}, set lineWidth(v){}, set globalAlpha(v){},
    set font(v){}, set textAlign(v){}, set shadowColor(v){}, set shadowBlur(v){}}; }
function mockEl(tag){ const e={ tag, children:[], style:{}, dataset:{}, _text:"", _html:"",
  classList:{ _s:new Set(), add(c){this._s.add(c);}, remove(c){this._s.delete(c);}, toggle(c){this._s.has(c)?this._s.delete(c):this._s.add(c);}, contains(c){return this._s.has(c);} },
  appendChild(c){ this.children.push(c); return c; }, removeChild(c){ const i=this.children.indexOf(c); if(i>=0)this.children.splice(i,1); },
  get firstChild(){ return this.children[0]||null; },
  addEventListener(){}, removeEventListener(){}, getContext(){ return mockCtx(); },
  getBoundingClientRect(){ return {left:0,top:0,width:800,height:450}; },
  animate(){ return {}; }, focus(){}, set textContent(v){this._text=v;}, get textContent(){return this._text;},
  set innerHTML(v){this._html=v;}, get innerHTML(){return this._html;}, scrollTop:0, scrollHeight:0,
  onclick:null, disabled:false, className:"", id:"", title:"" };
  return e; }
const elements={};
const ids=["scene","ui","battle-ui","log","actions","submenu","topbar","mute","tb-name","tb-level","tb-hp","tb-mp","tb-gold","tb-chapter"];
ids.forEach(id=>{ elements[id]=mockEl("div"); elements[id].id=id; });

const document={ getElementById:id=>elements[id]||mockEl("div"),
  createElement:tag=>mockEl(tag), addEventListener(){}, body:mockEl("body") };
const oscNode={type:"",frequency:{setValueAtTime(){},exponentialRampToValueAtTime(){}},connect(){},start(){},stop(){}};
const gainNode={gain:{value:0,setValueAtTime(){},exponentialRampToValueAtTime(){}},connect(){}};
function AudioContextStub(){ return {currentTime:0,state:"running",sampleRate:44100,destination:{},
  createGain:()=>gainNode, createOscillator:()=>oscNode,
  createBuffer:(c,n)=>({getChannelData:()=>new Float32Array(n)}),
  createBufferSource:()=>({connect(){},start(){},buffer:null}),
  createBiquadFilter:()=>({type:"",frequency:{value:0},connect(){}}), resume(){} }; }
const store={};
const localStorage={ getItem:k=>store[k]||null, setItem:(k,v)=>{store[k]=v;}, removeItem:k=>{delete store[k];} };
// Electron does NOT support window.prompt/confirm — they throw. Mimic that so
// any reliance on them fails the test.
function electronUnsupported(){ throw new Error("prompt()/confirm() is and will not be supported by Electron"); }
const window={ AudioContext:AudioContextStub, prompt:electronUnsupported, confirm:electronUnsupported,
  localStorage, addEventListener(){}, devicePixelRatio:2 };

const ctx={ Math,JSON,console,document,window,localStorage,
  AudioContext:AudioContextStub, prompt:window.prompt, confirm:()=>true,
  requestAnimationFrame:()=>0, setTimeout:(f)=>0, clearTimeout:()=>{},
  setInterval:()=>0, clearInterval:()=>{}, Float32Array };
vm.createContext(ctx);

let pass=0,fail=0;
function ok(n,c){ if(c){pass++;console.log("PASS  "+n);} else {fail++;console.log("FAIL  "+n);} }
function tryStep(name, fn){ try{ fn(); ok(name,true); }catch(e){ ok(name,false); console.log("   → "+e.message+"\n"+(e.stack||"").split("\n").slice(1,3).join("\n")); } }

// load every front-end script in order
const files=["utils.js","data.js","sprites.js","engine.js","audio.js","save.js","game.js"];
tryStep("all scripts load (boot showTitle)", ()=>{
  for(const f of files) vm.runInContext(fs.readFileSync(path.join(base,f),"utf8"), ctx, {filename:f});
});
vm.runInContext("this.__g={loop,showTitle,showHelp,showClassSelect,beginGame,showTown,showBuild,showEquip,showParty,showShop,showStatus,venture,CLASSES,getState:()=>({hero,party,account,progress})};", ctx);
const G=ctx.__g;

tryStep("render loop tick (menu)", ()=>G.loop(16));
tryStep("show help screen", ()=>G.showHelp());
tryStep("show class select", ()=>G.showClassSelect());
tryStep("class detail renders (name input, no window.prompt)", ()=>{
  vm.runInContext("selClass=CLASSES.overlord; renderClassDetail();", ctx); });
tryStep("begin game (no window.prompt/confirm — Electron-safe)", ()=>G.beginGame(G.CLASSES.overlord));
tryStep("town hub", ()=>G.showTown());
tryStep("build screen", ()=>G.showBuild());
tryStep("equipment screen", ()=>G.showEquip());
tryStep("party/recruit screen", ()=>G.showParty());
tryStep("shop (items)", ()=>G.showShop());
tryStep("status screen", ()=>G.showStatus());
tryStep("hero exists with open build", ()=>{ const s=G.getState(); if(!(s.hero && s.party.length===1 && s.account)) throw new Error("no hero/party/account"); });

console.log("\n"+pass+"/"+(pass+fail)+" smoke checks passed"); process.exit(fail?1:0);
