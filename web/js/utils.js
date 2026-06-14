"use strict";
// ---- tiny helpers shared across the game ----

function rand(n){ return Math.floor(Math.random()*n); }            // 0..n-1
function randf(a,b){ return a + Math.random()*(b-a); }
function chance(p){ return Math.random() < p; }
function pick(arr){ return arr[rand(arr.length)]; }
function clamp(v,lo,hi){ return Math.max(lo, Math.min(hi, v)); }
function variance(v, spread){ spread = spread==null?0.1:spread;
  return Math.max(1, Math.round(v * (1 + randf(-spread, spread)))); }

function el(tag, cls, html){
  const e = document.createElement(tag);
  if(cls) e.className = cls;
  if(html != null) e.innerHTML = html;
  return e;
}
function clear(node){ while(node.firstChild) node.removeChild(node.firstChild); }
function show(node){ node.classList.remove("hidden"); }
function hide(node){ node.classList.add("hidden"); }
function wait(ms){ return new Promise(r => setTimeout(r, ms)); }

// Elements & their colors (for spell particles / damage text)
const ELEM = {
  Physical:"#dcdce6", Fire:"#ff7a3c", Ice:"#7fe9ff", Lightning:"#ffe14d",
  Dark:"#c06bff", Holy:"#fff2b0", Poison:"#7dff6b", Arcane:"#7aa6ff"
};
