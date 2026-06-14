"use strict";
// ============================================================================
//  PROCEDURAL SPRITE ENGINE
//  Every character/monster & every battle background is drawn with code —
//  no image files needed. Sprites draw with feet at local origin (0,0), up = -y.
// ============================================================================

let FLASH = 0;     // 0..1 white hit-flash
let FTINT = null;  // optional color tint
let THEME = "#c06bff";

function _hex(h){ h=h.replace("#",""); if(h.length===3) h=h.split("").map(c=>c+c).join("");
  return [parseInt(h.slice(0,2),16),parseInt(h.slice(2,4),16),parseInt(h.slice(4,6),16)]; }
function _mix(a,b,t){ return [Math.round(a[0]+(b[0]-a[0])*t),Math.round(a[1]+(b[1]-a[1])*t),Math.round(a[2]+(b[2]-a[2])*t)]; }
function _col(hex){
  let c = _hex(hex);
  if(FTINT) c = _mix(c, _hex(FTINT), .45);
  if(FLASH>0) c = _mix(c, [255,255,255], FLASH);
  return "rgb("+c[0]+","+c[1]+","+c[2]+")";
}
let CX; // current ctx for primitives
function R(x,y,w,h,col){ CX.fillStyle=_col(col); CX.fillRect(x,y,w,h); }
function E(x,y,rx,ry,col){ CX.fillStyle=_col(col); CX.beginPath(); CX.ellipse(x,y,rx,ry,0,0,7); CX.fill(); }
function TRI(pts,col){ CX.fillStyle=_col(col); CX.beginPath(); CX.moveTo(pts[0],pts[1]);
  for(let i=2;i<pts.length;i+=2) CX.lineTo(pts[i],pts[i+1]); CX.closePath(); CX.fill(); }
function POLY(pts,col){ TRI(pts,col); }

function drawSprite(ctx, key, cx, cy, s, opt){
  opt = opt||{};
  ctx.save();
  ctx.translate(cx, cy);
  if(opt.flip){ ctx.scale(-1,1); }
  CX = ctx; FLASH = opt.flash||0; FTINT = opt.tint||null; THEME = opt.color||"#c06bff";
  // soft ground shadow
  ctx.globalAlpha = .35; E(0,2,12*s,3.2*s,"#000"); ctx.globalAlpha = 1;
  (SPRITES[key]||SPRITES.goblin)(s, opt);
  ctx.restore();
}

// ---------------------------------------------------------------------------
// shared humanoid builder
function humanoid(s, o){
  o = o||{};
  const robe = o.robe||THEME, skin = o.skin||"#e8c9a0", trim = o.trim||"#ffffff";
  const u = s;
  // legs
  R(-5*u,-9*u,4*u,9*u, o.legs||"#2a2238"); R(1*u,-9*u,4*u,9*u, o.legs||"#2a2238");
  // torso / robe
  if(o.robeShape==="dress"){ TRI([-9*u,0,9*u,0,5*u,-22*u,-5*u,-22*u], robe); }
  else { R(-7*u,-24*u,14*u,16*u, robe); }
  R(-7*u,-24*u,14*u,3*u, trim);                 // shoulder trim
  // arms
  R(-9*u,-23*u,3*u,12*u, robe); R(6*u,-23*u,3*u,12*u, robe);
  // head
  E(0,-29*u,5.4*u,5.6*u, skin);
  return u;
}
function eyes(u, col, glow){
  if(glow){ CX.shadowColor=_col(col); CX.shadowBlur=10; }
  R(-3*u,-30*u,2*u,2*u, col); R(1*u,-30*u,2*u,2*u, col);
  CX.shadowBlur=0;
}

// ===========================================================================
// PLAYER CLASSES
// ===========================================================================
const SPRITES = {};

SPRITES.overlord = function(s,o){
  const u = s;
  // black/gold robe
  R(-5*u,-9*u,4*u,9*u,"#1a1530"); R(1*u,-9*u,4*u,9*u,"#1a1530");
  TRI([-9*u,0,9*u,0,5*u,-23*u,-5*u,-23*u],"#120c22");      // robe
  TRI([-9*u,0,9*u,0,5*u,-23*u,-5*u,-23*u],"#120c22");
  R(-1*u,-23*u,2*u,22*u,"#caa23a");                         // gold center
  R(-9*u,-22*u,3*u,13*u,"#160f28"); R(6*u,-22*u,3*u,13*u,"#160f28"); // sleeves
  R(-10*u,-23*u,20*u,3*u,"#caa23a");                        // collar
  E(0,-29*u,5.2*u,5.6*u,"#e9e6f2");                         // skull
  E(-2.4*u,-29*u,1.6*u,1.8*u,"#0a0a12"); E(2.4*u,-29*u,1.6*u,1.8*u,"#0a0a12"); // sockets
  CX.shadowColor=_col(THEME); CX.shadowBlur=12;
  R(-3*u,-30*u,1.6*u,1.6*u,THEME); R(1.4*u,-30*u,1.6*u,1.6*u,THEME);           // glowing eyes
  CX.shadowBlur=0;
  // floating staff orb
  R(9*u,-26*u,1.6*u,22*u,"#3a2e18"); E(9.8*u,-28*u,3*u,3*u,THEME);
};
SPRITES.vampire = function(s){
  const u=s;
  R(-5*u,-9*u,3.5*u,9*u,"#e9e6f2"); R(1.5*u,-9*u,3.5*u,9*u,"#e9e6f2"); // pale legs
  TRI([-10*u,0,10*u,0,5*u,-22*u,-5*u,-22*u],"#b21f3a");     // red dress
  R(-7*u,-23*u,14*u,4*u,"#f0e6ec");                         // bodice trim
  R(-9*u,-22*u,3*u,12*u,"#8a1730"); R(6*u,-22*u,3*u,12*u,"#8a1730");
  E(0,-29*u,5*u,5.2*u,"#f3e3df");                           // face
  R(-7*u,-34*u,14*u,4*u,"#2a1018");                         // hair
  E(-2.3*u,-28.5*u,1.3*u,1.5*u,"#ff2d52"); E(2.3*u,-28.5*u,1.3*u,1.5*u,"#ff2d52");
  R(7*u,-30*u,2*u,26*u,"#caa"); TRI([6*u,-30*u,9*u,-30*u,7.5*u,-36*u],"#ddd"); // lance
};
SPRITES.frost = function(s){
  const u=s;
  R(-5.5*u,-10*u,4*u,10*u,"#2e6f86"); R(1.5*u,-10*u,4*u,10*u,"#2e6f86");
  R(-8*u,-26*u,16*u,17*u,"#3f93ad");                        // chitin torso
  R(-8*u,-26*u,16*u,4*u,"#bfeeff");
  R(-11*u,-25*u,4*u,15*u,"#357d93"); R(7*u,-25*u,4*u,15*u,"#357d93");
  // mandible head
  E(0,-30*u,5.6*u,5.2*u,"#4fa6c2");
  TRI([-5*u,-27*u,-1*u,-26*u,-3*u,-22*u],"#bfeeff"); TRI([5*u,-27*u,1*u,-26*u,3*u,-22*u],"#bfeeff");
  R(-3*u,-31*u,2*u,2*u,"#eafaff"); R(1*u,-31*u,2*u,2*u,"#eafaff");
  // ice greatsword
  R(10*u,-34*u,3*u,30*u,"#cfeeff"); TRI([10*u,-34*u,13*u,-34*u,11.5*u,-40*u],"#eafaff");
  // frost aura
  CX.globalAlpha=.5; E(0,-18*u,13*u,16*u,"#bfeeff"); CX.globalAlpha=1;
};
SPRITES.demon = function(s){
  const u=s;
  R(-5*u,-9*u,4*u,9*u,"#1c1c24"); R(1*u,-9*u,4*u,9*u,"#1c1c24");
  R(-7*u,-24*u,14*u,16*u,"#2a2a36");                        // tailored suit
  R(-1*u,-24*u,2*u,16*u,"#c0392b");                         // red tie
  R(-9*u,-23*u,3*u,12*u,"#22222c"); R(6*u,-23*u,3*u,12*u,"#22222c");
  E(0,-29*u,5.2*u,5.4*u,"#d77a4a");                         // face
  TRI([-5*u,-33*u,-2*u,-33*u,-6*u,-39*u],"#b0402a"); TRI([5*u,-33*u,2*u,-33*u,6*u,-39*u],"#b0402a"); // horns
  CX.shadowColor="#ff7a3c"; CX.shadowBlur=8;
  R(-3*u,-30*u,2*u,1.6*u,"#ffd34d"); R(1*u,-30*u,2*u,1.6*u,"#ffd34d"); CX.shadowBlur=0;
  // tail
  CX.strokeStyle=_col("#2a2a36"); CX.lineWidth=2*u; CX.beginPath();
  CX.moveTo(7*u,-6*u); CX.quadraticCurveTo(14*u,-2*u,11*u,-12*u); CX.stroke();
};
SPRITES.ranger = function(s){
  const u=s;
  R(-5*u,-9*u,4*u,9*u,"#3a5a2a"); R(1*u,-9*u,4*u,9*u,"#3a5a2a");
  R(-6*u,-23*u,12*u,15*u,"#4e7d36");                        // tunic
  R(-6*u,-23*u,12*u,3*u,"#caa23a");
  R(-8*u,-22*u,3*u,11*u,"#3f6a2c"); R(5*u,-22*u,3*u,11*u,"#3f6a2c");
  E(0,-28*u,4.8*u,5*u,"#caa07a");                           // dark-elf face
  R(-7*u,-32*u,14*u,4*u,"#e9e2c8");                         // pale hair
  TRI([-7*u,-30*u,-4*u,-33*u,-4*u,-27*u],"#caa07a");        // pointed ear
  R(-2.3*u,-28*u,1.4*u,1.4*u,"#3a7a3a"); R(1*u,-28*u,1.4*u,1.4*u,"#3a7a3a");
  // bow
  CX.strokeStyle=_col("#6a4a22"); CX.lineWidth=1.6*u; CX.beginPath();
  CX.arc(9*u,-18*u,11*u,-1.1,1.1); CX.stroke();
  CX.strokeStyle=_col("#ddd"); CX.lineWidth=1; CX.beginPath();
  CX.moveTo(9*u+11*u*Math.cos(-1.1),-18*u+11*u*Math.sin(-1.1));
  CX.lineTo(9*u+11*u*Math.cos(1.1),-18*u+11*u*Math.sin(1.1)); CX.stroke();
};
SPRITES.maid = function(s){
  const u=s;
  R(-5*u,-9*u,3.5*u,9*u,"#e9e6f2"); R(1.5*u,-9*u,3.5*u,9*u,"#e9e6f2");
  TRI([-9*u,0,9*u,0,5*u,-22*u,-5*u,-22*u],"#20202a");       // black dress
  R(-9*u,0,18*u,3*u,"#f2f2f6");                             // white hem
  R(-7*u,-23*u,14*u,5*u,"#f2f2f6");                         // apron
  R(-9*u,-22*u,3*u,12*u,"#1a1a22"); R(6*u,-22*u,3*u,12*u,"#1a1a22");
  E(0,-29*u,5*u,5.2*u,"#f0dcc6");
  R(-7*u,-34*u,14*u,5*u,"#2a2230");                         // dark hair
  R(-7*u,-34*u,3*u,2*u,"#f2f2f6"); R(4*u,-34*u,3*u,2*u,"#f2f2f6"); // headdress
  R(-2.3*u,-28.5*u,1.4*u,1.5*u,"#caa23a"); R(1*u,-28.5*u,1.4*u,1.5*u,"#caa23a");
  R(8*u,-26*u,2*u,24*u,"#cfd2dc");                          // rapier
  CX.shadowColor="#ffe14d"; CX.shadowBlur=6; R(8.4*u,-28*u,1.2*u,4*u,"#ffe14d"); CX.shadowBlur=0;
};

// ===========================================================================
// SUMMONS
// ===========================================================================
SPRITES.deathknight = function(s){
  const u=s;
  R(-5*u,-9*u,4*u,9*u,"#23232c"); R(1*u,-9*u,4*u,9*u,"#23232c");
  R(-8*u,-25*u,16*u,17*u,"#33333e"); R(-8*u,-25*u,16*u,3*u,"#5a5a6a");
  R(-10*u,-24*u,3*u,14*u,"#2a2a34"); R(7*u,-24*u,3*u,14*u,"#2a2a34");
  E(0,-30*u,5.4*u,5.4*u,"#44444f");
  CX.shadowColor="#ff3a3a"; CX.shadowBlur=8; R(-3*u,-31*u,2*u,2*u,"#ff3a3a"); R(1*u,-31*u,2*u,2*u,"#ff3a3a"); CX.shadowBlur=0;
  TRI([-6*u,-34*u,-2*u,-34*u,-4*u,-39*u],"#5a5a6a"); TRI([6*u,-34*u,2*u,-34*u,4*u,-39*u],"#5a5a6a");
  R(10*u,-32*u,3*u,28*u,"#777"); TRI([8*u,-32*u,13*u,-32*u,10.5*u,-38*u],"#999");
};
SPRITES.einherjar = function(s){
  const u=s;
  SPRITES.vampire(s); // similar valkyrie silhouette, recolor via translucency
  CX.globalAlpha=.25; E(0,-18*u,12*u,18*u,"#bfe0ff"); CX.globalAlpha=1;
};

// ===========================================================================
// ENEMIES
// ===========================================================================
SPRITES.goblin = function(s){
  const u=s;
  R(-4*u,-7*u,3*u,7*u,"#3a5a2a"); R(1*u,-7*u,3*u,7*u,"#3a5a2a");
  E(0,-12*u,6*u,6*u,"#5c8a3a");                             // pot belly
  R(-6*u,-15*u,3*u,7*u,"#4e7d36"); R(3*u,-15*u,3*u,7*u,"#4e7d36"); // arms
  E(0,-20*u,4.6*u,4.4*u,"#6a9a44");                         // head
  TRI([-5*u,-21*u,-2*u,-20*u,-7*u,-24*u],"#6a9a44"); TRI([5*u,-21*u,2*u,-20*u,7*u,-24*u],"#6a9a44"); // ears
  R(-2.4*u,-20.5*u,1.6*u,1.6*u,"#ffd34d"); R(1*u,-20.5*u,1.6*u,1.6*u,"#ffd34d");
  R(6*u,-18*u,1.6*u,14*u,"#6a4a22"); TRI([5*u,-18*u,8*u,-18*u,6.6*u,-23*u],"#bbb"); // spear
};
SPRITES.wolf = function(s){
  const u=s;
  E(0,-7*u,11*u,5.5*u,"#6a6a72");                           // body
  R(-9*u,-6*u,2.5*u,6*u,"#55555c"); R(7*u,-6*u,2.5*u,6*u,"#55555c"); R(-3*u,-6*u,2.5*u,6*u,"#55555c"); R(4*u,-6*u,2.5*u,6*u,"#55555c");
  E(9*u,-11*u,5*u,4.5*u,"#7a7a82");                         // head
  TRI([6*u,-13*u,9*u,-13*u,6*u,-18*u],"#55555c"); TRI([12*u,-13*u,9*u,-13*u,12*u,-18*u],"#55555c"); // ears
  TRI([13*u,-11*u,16*u,-10*u,13*u,-8*u],"#55555c");         // snout
  CX.shadowColor="#ffd34d"; CX.shadowBlur=6; R(9*u,-12*u,1.6*u,1.6*u,"#ffd34d"); CX.shadowBlur=0;
  TRI([-9*u,-7*u,-14*u,-10*u,-9*u,-4*u],"#55555c");         // tail
};
SPRITES.skeleton = function(s){
  const u=s;
  R(-3.5*u,-9*u,2.5*u,9*u,"#dad7c2"); R(1*u,-9*u,2.5*u,9*u,"#dad7c2");
  R(-3*u,-21*u,6*u,12*u,"#cfcbb4");                         // ribcage
  R(-2.4*u,-21*u,1*u,12*u,"#9a9784"); R(-0.4*u,-21*u,1*u,12*u,"#9a9784"); R(1.4*u,-21*u,1*u,12*u,"#9a9784");
  R(-6*u,-20*u,2.5*u,11*u,"#dad7c2"); R(3.5*u,-20*u,2.5*u,11*u,"#dad7c2");
  E(0,-25*u,4.4*u,4.4*u,"#e6e2cc");                         // skull
  R(-2.6*u,-26*u,1.8*u,2*u,"#1a1a22"); R(0.8*u,-26*u,1.8*u,2*u,"#1a1a22");
  R(-1.4*u,-22.5*u,2.8*u,2*u,"#cfcbb4");                    // jaw
  R(6*u,-26*u,1.6*u,22*u,"#9a8a6a"); TRI([4.5*u,-26*u,7.5*u,-26*u,6*u,-31*u],"#cfcbb4"); // sword
};
SPRITES.lizard = function(s){
  const u=s;
  R(-5*u,-8*u,3.5*u,8*u,"#2f6e4a"); R(1.5*u,-8*u,3.5*u,8*u,"#2f6e4a");
  E(0,-14*u,6.5*u,7*u,"#3a8a5c");                           // torso
  R(-8*u,-16*u,3*u,8*u,"#2f6e4a"); R(5*u,-16*u,3*u,8*u,"#2f6e4a");
  E(1*u,-22*u,5*u,4.4*u,"#46a06a");                         // head/snout
  TRI([5*u,-22*u,9*u,-21*u,5*u,-20*u],"#46a06a");
  R(-1*u,-22.5*u,1.6*u,1.6*u,"#ffd34d");
  TRI([-1*u,-26*u,1*u,-26*u,0,-29*u],"#caa23a"); TRI([2*u,-26*u,4*u,-26*u,3*u,-29*u],"#caa23a"); // crest
  R(7*u,-16*u,2*u,12*u,"#bbb"); TRI([6*u,-16*u,9*u,-16*u,7.5*u,-21*u],"#ddd"); // blade
  CX.strokeStyle=_col("#2f6e4a"); CX.lineWidth=2.4*u; CX.beginPath();
  CX.moveTo(-6*u,-8*u); CX.quadraticCurveTo(-14*u,-6*u,-12*u,-1*u); CX.stroke();
};
SPRITES.ogre = function(s,o){
  const u=s; const skin=(o&&o.tint)?undefined:"#a06a4a";
  R(-6*u,-12*u,5*u,12*u,"#6a4a32"); R(1*u,-12*u,5*u,12*u,"#6a4a32");
  E(0,-22*u,11*u,11*u,"#a06a4a");                           // huge torso
  R(-14*u,-24*u,5*u,14*u,"#8a5a40"); R(9*u,-24*u,5*u,14*u,"#8a5a40"); // arms
  E(0,-32*u,6*u,5.5*u,"#b07a56");                           // head
  R(-3*u,-33*u,2*u,2*u,"#3a1010"); R(1*u,-33*u,2*u,2*u,"#3a1010");
  TRI([-2*u,-28*u,-1*u,-28*u,-1.5*u,-30*u],"#fff"); TRI([1*u,-28*u,2*u,-28*u,1.5*u,-30*u],"#fff"); // tusks
  R(12*u,-40*u,4*u,34*u,"#5a3a22"); E(14*u,-42*u,6*u,6*u,"#6a4a30"); // club
};
SPRITES.frog = function(s){
  const u=s;
  E(0,-7*u,11*u,7*u,"#5a8a3a");                             // body
  R(-10*u,-3*u,4*u,3*u,"#4a7a2c"); R(6*u,-3*u,4*u,3*u,"#4a7a2c"); // hind feet
  E(-5*u,-15*u,3.4*u,3.4*u,"#7aae4a"); E(5*u,-15*u,3.4*u,3.4*u,"#7aae4a"); // eye bulbs
  R(-6.2*u,-16*u,2*u,2*u,"#1a1a10"); R(4.2*u,-16*u,2*u,2*u,"#1a1a10");
  CX.strokeStyle=_col("#3a5a22"); CX.lineWidth=2; CX.beginPath();
  CX.moveTo(-4*u,-9*u); CX.quadraticCurveTo(0,-6*u,4*u,-9*u); CX.stroke(); // mouth
  TRI([10*u,-8*u,18*u,-12*u,12*u,-5*u],"#4a7a2c");          // razor tail
};
SPRITES.wraith = function(s){
  const u=s;
  CX.globalAlpha=.85;
  TRI([-9*u,2,9*u,2,6*u,-24*u,-6*u,-24*u],"#3a2a55");       // tattered cloak
  for(let i=-3;i<=3;i++){ TRI([i*3*u,2,i*3*u+1.5*u,2,i*3*u+0.7*u,-6*u],"#0a0712"); } // ragged hem
  E(0,-28*u,5*u,5.5*u,"#241a3a");                           // hood void
  CX.shadowColor="#c06bff"; CX.shadowBlur=12;
  R(-3*u,-29*u,2*u,2.5*u,"#c06bff"); R(1*u,-29*u,2*u,2.5*u,"#c06bff"); CX.shadowBlur=0;
  CX.globalAlpha=1;
  R(-11*u,-22*u,3*u,12*u,"#2a1f44"); R(8*u,-22*u,3*u,12*u,"#2a1f44");
};
SPRITES.darkyoung = function(s){
  const u=s;
  E(0,-12*u,12*u,11*u,"#1f2a1a");                           // dark mass
  for(let a=0;a<6;a++){ const ang=-Math.PI*(0.15+a*0.13);
    const x=Math.cos(ang)*13*u, y=-14*u+Math.sin(ang)*13*u;
    CX.strokeStyle=_col("#2c3a22"); CX.lineWidth=3*u; CX.beginPath();
    CX.moveTo(0,-14*u); CX.quadraticCurveTo(x*0.6,y, x,y-4*u); CX.stroke(); } // tentacles
  for(let i=0;i<5;i++){ R((-8+i*4)*u,(-14-((i%2)*3))*u,1.6*u,1.6*u,"#ffd34d"); } // many eyes
  R(-6*u,-3*u,4*u,3*u,"#1a241a"); R(2*u,-3*u,4*u,3*u,"#1a241a");
};
SPRITES.vampire = SPRITES.vampire; // (player vampire reused if needed)

// ---- bosses ----
SPRITES.hamster = function(s){
  const u=s;
  E(0,-12*u,13*u,12*u,"#caa066");                           // giant hamster body
  E(0,-23*u,9*u,8*u,"#d8b276");                             // head
  E(-7*u,-30*u,3.6*u,3.6*u,"#caa066"); E(7*u,-30*u,3.6*u,3.6*u,"#caa066"); // ears
  R(-4*u,-25*u,2.4*u,2.4*u,"#1a1208"); R(2*u,-25*u,2.4*u,2.4*u,"#1a1208");
  R(-2.2*u,-20*u,1.6*u,3*u,"#fff"); R(0.6*u,-20*u,1.6*u,3*u,"#fff"); // teeth
  R(-2*u,-22*u,4*u,2*u,"#caa066");
  // katana on back
  R(6*u,-34*u,2*u,30*u,"#cfd2dc"); R(5*u,-6*u,5*u,3*u,"#3a2a18");
};
SPRITES.clementine = function(s){
  const u=s;
  R(-5*u,-9*u,4*u,9*u,"#caa"); R(1*u,-9*u,4*u,9*u,"#caa");
  R(-7*u,-24*u,14*u,16*u,"#e8e2ea");                        // white armor
  R(-7*u,-24*u,14*u,3*u,"#caa23a");
  R(-9*u,-23*u,3*u,12*u,"#d8d2da"); R(6*u,-23*u,3*u,12*u,"#d8d2da");
  E(0,-29*u,5*u,5.2*u,"#f0dcc6");
  R(-7*u,-33*u,14*u,4*u,"#caa23a");                         // blonde hair
  R(-2.4*u,-29*u,1.4*u,1.6*u,"#b21f3a"); R(1*u,-29*u,1.4*u,1.6*u,"#b21f3a");
  R(8*u,-24*u,2*u,20*u,"#cfd2dc"); R(-10*u,-24*u,2*u,20*u,"#cfd2dc"); // twin stilettos
};
SPRITES.khajiit = function(s){
  SPRITES.skeleton(s);                                     // lich-like
  const u=s; CX.shadowColor="#7dff6b"; CX.shadowBlur=14;
  E(0,-25*u,6*u,6*u,"#0a0712"); R(-2.6*u,-26*u,1.8*u,2*u,"#7dff6b"); R(0.8*u,-26*u,1.8*u,2*u,"#7dff6b");
  CX.shadowBlur=0;
  TRI([-9*u,2,9*u,2,5*u,-22*u,-5*u,-22*u],"#1a3a1a");       // green necromancer robe
  CX.globalAlpha=.5; E(0,-20*u,12*u,16*u,"#7dff6b"); CX.globalAlpha=1;
};
SPRITES.dragon = function(s){
  const u=s;
  E(0,-14*u,15*u,11*u,"#5aa6c2");                           // body
  E(-11*u,-20*u,7*u,6*u,"#6ab6d2");                         // head (left)
  TRI([-16*u,-22*u,-14*u,-26*u,-12*u,-22*u],"#cfeeff");     // horn
  R(-15*u,-21*u,2*u,2*u,"#ffd34d");
  // wings
  CX.globalAlpha=.9;
  TRI([2*u,-22*u,18*u,-40*u,16*u,-18*u],"#3f7d96");
  TRI([2*u,-22*u,12*u,-36*u,10*u,-16*u],"#4f93ad");
  CX.globalAlpha=1;
  R(-6*u,-4*u,3*u,4*u,"#4a8ca2"); R(3*u,-4*u,3*u,4*u,"#4a8ca2");
  CX.strokeStyle=_col("#5aa6c2"); CX.lineWidth=3*u; CX.beginPath();
  CX.moveTo(13*u,-13*u); CX.quadraticCurveTo(24*u,-10*u,20*u,-2*u); CX.stroke(); // tail
  // frost breath glow
  CX.shadowColor="#bfeeff"; CX.shadowBlur=10; E(-18*u,-19*u,2.4*u,2.4*u,"#eafaff"); CX.shadowBlur=0;
};
SPRITES.jalda = function(s){
  const u=s;
  R(-5*u,-10*u,4*u,10*u,"#1c1c24"); R(1*u,-10*u,4*u,10*u,"#1c1c24");
  R(-8*u,-26*u,16*u,16*u,"#241820");                        // imposing form
  R(-1*u,-26*u,2*u,16*u,"#ff7a3c");
  R(-11*u,-25*u,4*u,15*u,"#1c1018"); R(7*u,-25*u,4*u,15*u,"#1c1018");
  E(0,-31*u,5.6*u,5.8*u,"#a83a22");                         // demon face
  TRI([-5*u,-35*u,-2*u,-35*u,-7*u,-43*u],"#7a2818"); TRI([5*u,-35*u,2*u,-35*u,7*u,-43*u],"#7a2818"); // big horns
  CX.shadowColor="#ffd34d"; CX.shadowBlur=12;
  R(-3*u,-32*u,2.2*u,2*u,"#ffd34d"); R(1*u,-32*u,2.2*u,2*u,"#ffd34d"); CX.shadowBlur=0;
  // fiery wings
  CX.globalAlpha=.85;
  TRI([-6*u,-24*u,-22*u,-40*u,-10*u,-14*u],"#7a2818");
  TRI([6*u,-24*u,22*u,-40*u,10*u,-14*u],"#7a2818");
  CX.globalAlpha=1;
  CX.shadowColor="#ff7a3c"; CX.shadowBlur=16; E(0,-18*u,14*u,18*u,"rgba(255,90,40,.15)"); CX.shadowBlur=0;
};

// ===========================================================================
// BACKGROUNDS
// ===========================================================================
function drawBackground(ctx, key, W, H, t){
  const grd = ctx.createLinearGradient(0,0,0,H);
  const sky = {
    village:["#243a6a","#6a4a6a"], forest:["#15301f","#0c1c14"],
    swamp:["#22321f","#101a14"], crypt:["#1a1426","#0a0712"],
    capital:["#3a1414","#180808"], menu:["#1a1030","#0a0712"]
  }[key] || ["#1a1030","#0a0712"];
  grd.addColorStop(0, sky[0]); grd.addColorStop(1, sky[1]);
  ctx.fillStyle=grd; ctx.fillRect(0,0,W,H);

  // parallax stars / embers
  ctx.save();
  for(let i=0;i<40;i++){
    const x=(i*97.3 + t*0.01*(i%5))%W, y=(i*53.7)%(H*0.6);
    ctx.globalAlpha=0.3+0.3*Math.sin(t*0.002+i);
    ctx.fillStyle = key==="capital" ? "#ff8a4a" : "#cfd6ff";
    ctx.fillRect(x,y,2,2);
  }
  ctx.restore();

  CX = ctx; FLASH=0; FTINT=null;
  // ground
  const gy = H*0.74;
  const groundCol = {village:"#3a5a3a",forest:"#1c3a24",swamp:"#26321c",crypt:"#241c30",capital:"#2a1414"}[key]||"#241c30";
  ctx.fillStyle=groundCol; ctx.fillRect(0,gy,W,H-gy);
  ctx.fillStyle="rgba(0,0,0,.25)"; ctx.fillRect(0,gy,W,6);

  // scenery silhouettes
  ctx.fillStyle="rgba(0,0,0,.45)";
  if(key==="village"||key==="capital"){
    for(let i=0;i<6;i++){ const x=40+i*130, h=60+((i*53)%70);
      ctx.fillRect(x, gy-h, 70, h);
      ctx.beginPath(); ctx.moveTo(x-8,gy-h); ctx.lineTo(x+35,gy-h-34); ctx.lineTo(x+78,gy-h); ctx.fill(); }
  } else if(key==="forest"){
    for(let i=0;i<8;i++){ const x=30+i*100, h=120+((i*71)%90);
      ctx.fillRect(x+18,gy-h*0.5,8,h*0.5);
      ctx.beginPath(); ctx.ellipse(x+22,gy-h*0.5,34,h*0.4,0,0,7); ctx.fill(); }
  } else if(key==="swamp"){
    ctx.fillStyle="rgba(40,90,60,.3)"; ctx.fillRect(0,gy,W,H-gy);
    for(let i=0;i<5;i++){ const x=60+i*160; ctx.fillStyle="rgba(0,0,0,.4)";
      ctx.fillRect(x,gy-50,6,50); ctx.beginPath(); ctx.ellipse(x+3,gy-50,20,10,0,0,7); ctx.fill(); }
  } else if(key==="crypt"){
    for(let i=0;i<7;i++){ const x=20+i*115; ctx.fillRect(x,gy-150,26,150);
      ctx.beginPath(); ctx.arc(x+13,gy-150,13,Math.PI,0); ctx.fill(); }
  }
}
