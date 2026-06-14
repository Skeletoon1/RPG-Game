"use strict";
// ============================================================================
//  GAME — render loop, screens, animated multi-party battle, build/gear/party
// ============================================================================
const W=800, H=450;
const canvas=document.getElementById("scene");
const ctx=canvas.getContext("2d");
const ui=document.getElementById("ui");
const battleUI=document.getElementById("battle-ui");
const logEl=document.getElementById("log");
const actionsEl=document.getElementById("actions");
const submenuEl=document.getElementById("submenu");
const topbar=document.getElementById("topbar");
const muteBtn=document.getElementById("mute");

let state="title";
let party=[], hero=null, account=null, progress=null, battle=null;
let bgKey="menu";
let floats=[], particles=[], shakeT=0, selecting=null, lastT=0;
let SX=1, SY=1, _cw=0, _ch=0;   // canvas pixel scale (logical 800x450 -> device px)

// Size the canvas backing store to its on-screen size * devicePixelRatio so the
// vector art renders crisply at any window size. Logical coords stay 800x450.
function resizeCanvas(){
  const r=canvas.getBoundingClientRect();
  if(r.width===_cw && r.height===_ch) return;
  _cw=r.width; _ch=r.height;
  const dpr=window.devicePixelRatio||1;
  canvas.width=Math.max(1, Math.round(r.width*dpr));
  canvas.height=Math.max(1, Math.round(r.height*dpr));
  SX=canvas.width/W; SY=canvas.height/H;
}
window.addEventListener("resize", resizeCanvas);

// ---------- helpers ----------
function spriteCard(key, color, scale){
  const cv=document.createElement("canvas"); cv.width=96; cv.height=96;
  drawSprite(cv.getContext("2d"), key, 48, 86, scale||2.4, {color:color}); return cv;
}
function pointsPending(){ return party.some(p=>p.skillPoints>0||p.attrPoints>0); }
// window.confirm/prompt throw in Electron; wrap so the game still works there.
function safeConfirm(msg){ try{ return window.confirm ? window.confirm(msg) : true; }catch(e){ return true; } }

// ---------- audio mute ----------
muteBtn.onclick=()=>{ Audio2.setEnabled(!Audio2.enabled); muteBtn.textContent=Audio2.enabled?"🔊":"🔇"; };
document.addEventListener("pointerdown", ()=>Audio2.ensure(), {once:false});

// ============================================================================
//  RENDER LOOP
// ============================================================================
function loop(t){
  const dt=Math.min(0.05,(t-lastT)/1000)||0; lastT=t;
  resizeCanvas();
  ctx.setTransform(SX,0,0,SY,0,0);   // map logical 800x450 onto the device-pixel canvas
  ctx.save();
  if(shakeT>0){ ctx.translate((Math.random()-.5)*shakeT*14,(Math.random()-.5)*shakeT*14); shakeT-=dt*4; }
  drawBackground(ctx, bgKey, W, H, t);
  if(state==="battle" && battle) drawCombatants(t);
  drawParticles(dt); drawFloats(dt);
  ctx.restore();
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);

function drawCombatants(t){
  const all=battle.party.concat(battle.enemies).filter(e=>e.alive||e.fade>0).sort((a,b)=>a.y-b.y);
  for(const e of all){
    const alpha=e.alive?1:Math.max(0,e.fade);
    if(alpha<=0) continue;
    if(!e.alive) e.fade-=0.02;
    if(e.flash>0) e.flash-=0.06;
    const bob=Math.sin(t*0.004+e.bob)*3*(e.alive?1:0); const ox=e.ox||0;
    ctx.globalAlpha=alpha;
    if(selecting && selecting.includes(e)){
      ctx.strokeStyle="rgba(255,216,102,"+(0.5+0.4*Math.sin(t*0.01))+")"; ctx.lineWidth=3; ctx.beginPath();
      ctx.ellipse(e.x+ox, e.y+4, 26*(e.spriteScale/3), 9*(e.spriteScale/3),0,0,7); ctx.stroke();
    }
    if(e===battle.activeUnit && e.alive){
      ctx.fillStyle="#ffd866"; ctx.beginPath();
      ctx.moveTo(e.x+ox,e.y-e.spriteScale*52); ctx.lineTo(e.x+ox-6,e.y-e.spriteScale*52-9); ctx.lineTo(e.x+ox+6,e.y-e.spriteScale*52-9); ctx.fill();
    }
    drawSprite(ctx, e.sprite, e.x+ox, e.y+bob, e.spriteScale,
      {color:e.color, tint:e.tint, flip:e.side==="enemy", flash:e.flash});
    drawUnitBar(e, ox); ctx.globalAlpha=1;
  }
}
function drawUnitBar(e, ox){
  const y=e.y - e.spriteScale*44 - 14, w=64, x=e.x+ox-w/2;
  ctx.font="bold 11px 'Trebuchet MS',sans-serif"; ctx.textAlign="center";
  ctx.fillStyle=e.isBoss?"#ff8a8a":(e.isSummon?"#bdb0ff":"#ece6ff"); ctx.fillText(e.name, e.x+ox, y-12);
  ctx.fillStyle="rgba(0,0,0,.6)"; ctx.fillRect(x-1,y-1,w+2,7);
  const r=e.hp/e.maxHp; ctx.fillStyle=r>.5?"#46e08a":r>.25?"#ffcf4d":"#ff5a6e"; ctx.fillRect(x,y,w*r,5);
  if(e.side==="party" && e.maxMp>0){ ctx.fillStyle="rgba(0,0,0,.6)"; ctx.fillRect(x-1,y+6,w+2,4);
    ctx.fillStyle="#5aa6ff"; ctx.fillRect(x,y+7,w*(e.mp/e.maxMp),2); }
  if(e.shield>0){ ctx.fillStyle="#fff"; ctx.fillRect(x,y-3,Math.min(w,w*e.shield/e.maxHp),2); }
  if(e.statuses.length){ ctx.font="10px sans-serif"; let sx=x;
    for(const s of e.statuses){ ctx.fillStyle=STATUSES[s.key].color; ctx.fillText(STATUSES[s.key].icon, sx+4, y+22); sx+=12; } }
  ctx.textAlign="left";
}
function drawParticles(dt){ for(let i=particles.length-1;i>=0;i--){ const p=particles[i]; p.life-=dt;
  if(p.life<=0){ particles.splice(i,1); continue; } p.x+=p.vx*dt; p.y+=p.vy*dt; p.vy+=p.g*dt;
  ctx.globalAlpha=clamp(p.life/p.max,0,1); ctx.fillStyle=p.color; ctx.fillRect(p.x,p.y,p.size,p.size); } ctx.globalAlpha=1; }
function drawFloats(dt){ ctx.textAlign="center"; for(let i=floats.length-1;i>=0;i--){ const f=floats[i]; f.life-=dt;
  if(f.life<=0){ floats.splice(i,1); continue; } f.y+=f.vy*dt; ctx.globalAlpha=clamp(f.life/f.max,0,1);
  ctx.font="bold "+f.size+"px 'Trebuchet MS',sans-serif"; ctx.lineWidth=4; ctx.strokeStyle="rgba(0,0,0,.85)";
  ctx.strokeText(f.text,f.x,f.y); ctx.fillStyle=f.color; ctx.fillText(f.text,f.x,f.y); } ctx.globalAlpha=1; ctx.textAlign="left"; }
function spawnFloat(x,y,text,color,size){ floats.push({x,y,text,color,size:size||20,vy:-26,life:1.1,max:1.1}); }
function burst(x,y,color,n){ for(let i=0;i<(n||14);i++){ const a=Math.random()*7,sp=randf(30,140);
  particles.push({x,y,vx:Math.cos(a)*sp,vy:Math.sin(a)*sp-30,g:160,size:randf(2,5),color,life:randf(.3,.7),max:.7}); } }

// ============================================================================
//  BATTLE
// ============================================================================
function makeBattle(enemies, canFlee){
  const b={
    party:party.slice(), enemies, canFlee, fled:false, activeUnit:null, logs:[],
    side(s){ return s==="party"?this.party:this.enemies; },
    living(s){ return this.side(s).filter(e=>e.alive); },
    addSummon(e){ e.fade=1; this.party.push(e); layoutBattle(); },
    log(m){ this.logs.push(m); renderLog(); },
    onHit(tgt,dmg,elem,crit,ab){ tgt.flash=1; shakeT=Math.max(shakeT,crit?0.9:0.5);
      spawnFloat(tgt.x+(tgt.ox||0), tgt.y-tgt.spriteScale*40, ""+dmg, ELEM[elem]||"#fff", crit?30:20);
      if(crit){ spawnFloat(tgt.x,(tgt.y-tgt.spriteScale*48),"CRIT!", "#ffe14d", 16); Audio2.crit(); } else Audio2.hit();
      burst(tgt.x+(tgt.ox||0), tgt.y-tgt.spriteScale*30, ELEM[elem]||"#fff", crit?22:12); },
    onHeal(tgt,amt){ if(amt) spawnFloat(tgt.x+(tgt.ox||0), tgt.y-tgt.spriteScale*40, "+"+amt, "#46e08a",20);
      burst(tgt.x, tgt.y-tgt.spriteScale*30, "#46e08a", 8); Audio2.heal(); },
    onStatus(tgt,key){ spawnFloat(tgt.x, tgt.y-tgt.spriteScale*34, STATUSES[key].icon, STATUSES[key].color,18); },
    onDeath(tgt){ if(tgt.fade==null) tgt.fade=1; tgt.dead=true; burst(tgt.x,tgt.y-tgt.spriteScale*28,"#888",18);
      this.log(tgt.name+" is slain!"); },
  };
  for(const e of b.party.concat(b.enemies)){ e.fade=1; e.ox=0; }
  return b;
}
function layoutBattle(){
  const py=170;
  battle.party.forEach((e,i)=>{ e.x=120+i*30; e.y= py+i*44; e.spriteScale=e.isSummon?2.4:2.7; });
  battle.enemies.forEach((e,i)=>{ e.x=680-i*32; e.y= py+i*44; e.spriteScale=e.isBoss?4.2:2.7; });
}
function renderLog(){ clear(logEl); for(const m of battle.logs.slice(-30)) logEl.appendChild(el("div","l",m));
  logEl.scrollTop=logEl.scrollHeight; }

// promise-based UI prompt
let resolver=null;
function buttons(parent, list){ clear(parent);
  for(const it of list){ const b=document.createElement("button"); b.className=it.cls||""; b.innerHTML=it.html||it.label;
    if(it.disabled) b.disabled=true; b.onclick=()=>{ Audio2.select(); it.onClick(); }; parent.appendChild(b); } }
function uiPrompt(setup){ return new Promise(res=>{ resolver=res; setup(v=>{ resolver=null; res(v); }); }); }

async function startBattle(enemies, canFlee, isBoss){
  battle=makeBattle(enemies, canFlee); layoutBattle();
  state="battle"; hide(ui); show(battleUI); show(topbar); renderLog(); updateTopbar();
  Audio2.startMusic(isBoss?"boss":"battle");
  await battleLoop();
}
async function battleLoop(){
  while(!battleOver()){
    const order=battle.party.concat(battle.enemies).filter(e=>e.alive)
      .sort((a,b)=>(b.eff("spd")+Math.random())-(a.eff("spd")+Math.random()));
    for(const u of order){ if(!u.alive) continue; if(battleOver()) break; await takeTurn(u); if(battleOver()) break; }
    for(const e of battle.party.slice()){ if(e.isSummon && e.summonDur!=null){ e.summonDur--; if(e.summonDur<=0&&e.alive){ e.hp=0; battle.onDeath(e); } } }
  }
  battle.activeUnit=null;
  await finishBattle();
}
function battleOver(){ return !battle.living("party").length || !battle.living("enemy").length || battle.fled; }

async function takeTurn(u){
  battle.activeUnit=u; u.defending=false;
  tickStatusStart(u, battle); updateTopbar(); await wait(240);
  if(!u.alive){ tickStatusEnd(u,battle); return; }
  if(u.isStunned()){ const s=u.statuses.find(x=>STATUSES[x.key].blocks);
    battle.log(u.name+" is "+STATUSES[s.key].name+" and cannot act!");
    spawnFloat(u.x,u.y-u.spriteScale*40,STATUSES[s.key].icon,STATUSES[s.key].color,22); await wait(480); tickStatusEnd(u,battle); return; }
  if(u.isPlayerChar && !u.autoAI){ await playerTurn(u); }
  else { const a=aiChoose(u,battle); if(a){ battle.log(u.name+" uses "+ABILITIES[a.key].name+".");
    await animate(u, a.key, a.targets); } }
  tickStatusEnd(u, battle); updateTopbar(); await wait(160);
}

async function playerTurn(unit){
  while(true){
    const act=await uiPrompt(done=>{ clear(submenuEl); hide(submenuEl);
      buttons(actionsEl,[
        {label:"⚔ Attack", cls:"primary", onClick:()=>done("attack")},
        {label:"✨ Ability", onClick:()=>done("ability")},
        {label:"🧪 Item", onClick:()=>done("item")},
        {label:"🛡 Defend", onClick:()=>done("defend")},
        {label:"🤖 Auto", onClick:()=>done("auto")},
        {label:"🏃 Flee", disabled:!battle.canFlee, onClick:()=>done("flee")},
      ]); });
    if(act==="attack"){ const t=await chooseTarget(battle.living("enemy")); if(!t) continue; await execute(unit,"strike",[t]); return; }
    if(act==="ability"){ const key=await chooseAbility(unit); if(!key) continue;
      const targets=await playerTargets(unit, ABILITIES[key]); if(!targets) continue; await execute(unit,key,targets); return; }
    if(act==="item"){ const used=await chooseItem(unit); if(used) return; else continue; }
    if(act==="defend"){ unit.defending=true; battle.log(unit.name+" takes a defensive stance.");
      spawnFloat(unit.x,unit.y-unit.spriteScale*40,STATUSES.defUp.icon,"#8ab6ff",18); Audio2.buff(); await wait(320); return; }
    if(act==="auto"){ unit.autoAI=true; battle.log(unit.name+" will now fight automatically.");
      const a=aiChoose(unit,battle); if(a){ battle.log(unit.name+" uses "+ABILITIES[a.key].name+"."); await animate(unit,a.key,a.targets); } return; }
    if(act==="flee"){ await tryFlee(unit); return; }
  }
}
function chooseAbility(unit){
  return uiPrompt(done=>{ show(submenuEl);
    const list=unit.getAbilityKeys().map(k=>{ const a=ABILITIES[k]; const cd=unit.cd[k]||0; const ok=unit.mp>=a.mp&&cd<=0;
      const note=cd>0?(" [CD "+cd+"]"):(unit.mp<a.mp?" [no MP]":"");
      return {cls:"ab-btn tier-"+a.tier, disabled:!ok,
        html:"<span class='an'>"+a.name+note+"</span><span class='ad'>"+a.desc+"</span><span class='acost'>"+(a.mp?a.mp+" MP":"free")+"</span>",
        onClick:()=>{ hide(submenuEl); done(k); }}; });
    list.push({label:"← Back", cls:"ghost", onClick:()=>{ hide(submenuEl); done(null); }});
    buttons(submenuEl, list); });
}
function chooseItem(unit){
  return uiPrompt(done=>{ const owned=Object.keys(account.inv).filter(k=>account.inv[k]>0);
    if(!owned.length){ battle.log("No usable items!"); done(false); return; }
    show(submenuEl);
    const list=owned.map(k=>{ const it=ITEMS[k];
      return {cls:"ab-btn", html:"<span class='an'>"+it.name+" ×"+account.inv[k]+"</span><span class='ad'>"+it.desc+"</span>",
        onClick:async()=>{ hide(submenuEl); const ok=await useItem(unit,k); done(ok); }}; });
    list.push({label:"← Back", cls:"ghost", onClick:()=>{ hide(submenuEl); done(false); }});
    buttons(submenuEl, list); });
}
async function useItem(unit, k){
  const it=ITEMS[k];
  if(it.kind==="scroll"){ const ab=ABILITIES[it.ability]; const targets=await playerTargets(unit, ab);
    if(!targets) return false; account.inv[k]--; battle.log(unit.name+" reads "+it.name+"!");
    await animate(unit, it.ability, targets, true); return true; }
  if(it.target==="dead_ally"){ const dead=battle.party.filter(e=>!e.alive);
    if(!dead.length){ battle.log("No fallen ally to revive."); return false; }
    const t=await chooseTarget(dead, true); if(!t) return false; account.inv[k]--; t.heal(it.amt); battle.onHeal(t,it.amt); t.dead=false;
    battle.log(unit.name+" uses "+it.name+" on "+t.name+"."); updateTopbar(); return true; }
  // self-target consumables
  account.inv[k]--;
  if(it.kind==="heal"){ const h=unit.heal(it.amt); battle.onHeal(unit,h); }
  else if(it.kind==="mp"){ unit.mp=Math.min(unit.maxMp,unit.mp+it.amt); spawnFloat(unit.x,unit.y-unit.spriteScale*40,"+"+it.amt+" MP","#5aa6ff",18); }
  else if(it.kind==="full"){ unit.hp=unit.maxHp; unit.mp=unit.maxMp; battle.onHeal(unit,0); spawnFloat(unit.x,unit.y-unit.spriteScale*42,"FULL!","#ffd866",22); }
  else if(it.kind==="cleanse"){ ["poison","burn","bleed","stun","freeze","atkDown","defDown","slow"].forEach(n=>unit.removeStatus(n)); spawnFloat(unit.x,unit.y-unit.spriteScale*40,"cleansed","#7fe9ff",16); }
  else if(it.kind==="revive"){ const h=unit.heal(it.amt); battle.onHeal(unit,h); }
  battle.log(unit.name+" uses "+it.name+"."); updateTopbar(); return true;
}
function playerTargets(unit, ab){
  switch(ab.target){
    case "self": return Promise.resolve([unit]);
    case "all_enemies": return Promise.resolve(battle.living("enemy"));
    case "all_allies": return Promise.resolve(battle.living("party"));
    case "one_enemy": return chooseTarget(battle.living("enemy")).then(t=>t?[t]:null);
    case "one_ally": return chooseTarget(battle.living("party")).then(t=>t?[t]:null);
    case "dead_ally":{ const dead=battle.party.filter(e=>!e.alive); if(!dead.length){ battle.log("No fallen ally."); return Promise.resolve(null); }
      return chooseTarget(dead, true).then(t=>t?[t]:null); }
  }
  return Promise.resolve([unit]);
}
function chooseTarget(list, includeDead){
  if(!list.length) return Promise.resolve(null);
  if(list.length===1) return Promise.resolve(list[0]);
  return uiPrompt(done=>{ selecting=list; show(submenuEl);
    const btns=list.map(e=>({cls:"ghost", label:e.name+" ("+e.hp+"/"+e.maxHp+")",
      onClick:()=>{ selecting=null; hide(submenuEl); done(e); }}));
    btns.push({label:"← Cancel", cls:"ghost", onClick:()=>{ selecting=null; hide(submenuEl); done(null); }});
    buttons(submenuEl, btns); });
}
async function execute(user, key, targets){ battle.log(user.name+(key==="strike"?" attacks!":" uses "+ABILITIES[key].name+"!"));
  clear(actionsEl); await animate(user, key, targets); }
async function animate(user, key, targets, free){
  const a=ABILITIES[key]; const dir=user.side==="party"?1:-1;
  if(a.tier==="martial"){ user.ox=dir*30; await wait(150); }
  else { user.flash=0.6; Audio2.spell(a.elem); burst(user.x, user.y-user.spriteScale*30, ELEM[a.elem]||"#fff", 10);
    await wait(120); for(const t of targets){ if(t&&t!==user) shootProjectile(user,t,a.elem); } await wait(180); }
  if(a.tier==="spell" && user.side==="party") {} // sfx already
  if(a.tier==="super"){ shakeT=1; Audio2.spell(a.elem); }
  applyAbility(user, key, targets, battle, free); updateTopbar();
  await wait(a.tier==="super"?600:420); user.ox=0;
}
function shootProjectile(user,t,elem){ const x0=user.x,y0=user.y-user.spriteScale*28,x1=t.x,y1=t.y-t.spriteScale*28,steps=10;
  for(let i=0;i<steps;i++){ const f=i/steps; particles.push({x:x0+(x1-x0)*f,y:y0+(y1-y0)*f,vx:0,vy:0,g:0,size:randf(3,5),color:ELEM[elem]||"#fff",life:.4-f*0.2,max:.4}); } }
async function tryFlee(unit){
  if(battle.enemies.some(e=>e.isBoss)){ battle.log("You cannot flee from this foe!"); await wait(500); return; }
  const fast=Math.max(0,...battle.living("enemy").map(e=>e.eff("spd")));
  let odds=clamp(0.5+(unit.eff("spd")-fast)/100,0.1,0.9);
  if(Math.random()<odds){ battle.log(unit.name+" fled from battle!"); battle.fled=true; } else battle.log("Couldn't escape!");
  await wait(500);
}

async function finishBattle(){
  hide(submenuEl); clear(actionsEl); selecting=null; await wait(300);
  const fled=battle.fled, partyDead=!battle.living("party").length;
  // strip summons
  battle.party=battle.party.filter(e=>!e.isSummon);
  hide(battleUI);
  if(partyDead){ Audio2.defeat(); return showDefeat(); }
  if(fled){ state="town"; bgKey="menu"; Audio2.startMusic("menu"); showTown("You retreat to regroup."); return; }
  // win
  const ch=CHAPTERS[progress.chapter]; const wasBoss=progress.wins>=ch.battles;
  const xp=battle.enemies.reduce((s,e)=>s+(e.xpReward||0),0);
  const gold=battle.enemies.reduce((s,e)=>s+(e.goldReward||0),0);
  account.gold+=gold;
  let loot=[]; battle.enemies.forEach(e=>rollDrops(e).forEach(k=>{ account.gearInv[k]=(account.gearInv[k]||0)+1; loot.push(GEAR[k].name); }));
  // XP to all living party members
  let lvlMsgs=[]; const leveled=[];
  for(const p of party){ if(p.alive){ const before=p.level; lvlMsgs=lvlMsgs.concat(p.gainXp(p===hero?xp:Math.round(xp*0.8))); if(p.level>before) leveled.push(p); } }
  if(leveled.length) Audio2.levelup();
  // breather restore + revive downed allies to 30%
  for(const p of party){ if(!p.alive){ p.hp=Math.round(p.maxHp*0.3); } else { p.hp=Math.min(p.maxHp,p.hp+Math.round(p.maxHp*0.2)); p.mp=Math.min(p.maxMp,p.mp+Math.round(p.maxMp*0.2)); }
    p.statuses=[]; p.shield=0; p.cd={}; p.defending=false; }
  let lines=["Earned "+xp+" XP and "+gold+" gold."];
  if(loot.length) lines.push("Loot: "+loot.join(", "));
  lines=lines.concat(lvlMsgs);
  if(pointsPending()) lines.push("✦ Unspent points! Visit the Build screen.");
  if(wasBoss){ lines.push(ch.outro); progress.wins=0;
    if(progress.chapter+1<CHAPTERS.length){ progress.chapter++; lines.push("A new front opens: "+CHAPTERS[progress.chapter].name); }
    else { progress.completed=true; saveGame(party,progress,account); Audio2.victory(); return showVictory(lines); } }
  else { progress.wins++; if(progress.wins>=ch.battles) lines.push("The path to the chapter boss is open!"); }
  saveGame(party, progress, account); state="town"; bgKey="menu"; Audio2.startMusic("menu");
  Audio2.victory(); showResult("VICTORY", "#46e08a", lines, ()=>showTown());
}

// ============================================================================
//  SCREENS
// ============================================================================
function clearUI(){ clear(ui); ui.classList.remove("scroll"); }
function updateTopbar(){ if(!hero){ hide(topbar); return; }
  document.getElementById("tb-name").textContent=hero.name;
  document.getElementById("tb-level").textContent="Lv."+hero.level+" "+hero.cls.name+(party.length>1?(" +"+(party.length-1)):"");
  document.getElementById("tb-hp").innerHTML="<span style='color:#ff8a99'>HP "+hero.hp+"/"+hero.maxHp+"</span>";
  document.getElementById("tb-mp").innerHTML="<span style='color:#8ab6ff'>MP "+hero.mp+"/"+hero.maxMp+"</span>";
  document.getElementById("tb-gold").textContent=account.gold+"g";
  document.getElementById("tb-chapter").textContent=progress?CHAPTERS[progress.chapter].name:"";
}

function showTitle(){
  state="title"; bgKey="menu"; battle=null; hide(battleUI); hide(topbar); clearUI(); show(ui);
  Audio2.startMusic("menu");
  ui.appendChild(el("h1","title-logo","OVERLORD"));
  ui.appendChild(el("div","subtitle","NAZARICK RISING"));
  ui.appendChild(el("div","tagline","Choose your guardian, forge your own path through ten schools of power, and seize dominion over the New World."));
  const menu=el("div","menu");
  const nb=el("button","primary","⚔  New Game"); nb.onclick=showClassSelect; menu.appendChild(nb);
  const cb=el("button",null,"▶  Continue"); cb.disabled=!hasSave();
  cb.onclick=()=>{ const l=loadGame(); if(l){ party=l.party; hero=party[0]; progress=l.progress; account=l.account; showTown("Welcome back, "+hero.name+"."); } };
  menu.appendChild(cb);
  const hb=el("button","ghost","？  How to Play"); hb.onclick=showHelp; menu.appendChild(hb);
  ui.appendChild(menu);
}
function showHelp(){
  clearUI(); ui.classList.add("scroll");
  ui.appendChild(el("h2","panel-title","How to Play"));
  ui.appendChild(el("div","detail",
    "<b>Open builds:</b> your Origin only sets your start. Each level grants <span class='kbd'>Skill Points</span> "+
    "(invest in 10 schools — Necromancy, Pyromancy, Cryomancy, Storm, Arcane, Faith, Blade, Archery, Guard, Blood) "+
    "and <span class='kbd'>Attribute Points</span> (raise HP/MP/ATK/MAG/DEF/RES/SPD/Crit).<br><br>"+
    "Abilities unlock automatically when your rank in their school meets the requirement. Haven't learned Necromancy? "+
    "You can't raise the dead — <b>unless you use a Scroll</b> of that spell.<br><br>"+
    "<b>Battles</b> are turn-based by SPD. Control your whole party (or hit <b>Auto</b> to let an ally fight itself). "+
    "Attack, cast Abilities (MP), use Items/Scrolls, Defend, or Flee.<br><br>"+
    "Win for XP, gold, and <b>loot</b>. Buy & equip <b>gear</b>, <b>recruit</b> more guardians, and conquer all 5 chapters."));
  const b=el("button","primary","← Back"); b.onclick=showTitle; ui.appendChild(b);
}

let selClass=null;
function showClassSelect(){
  selClass=null; clearUI(); ui.classList.add("scroll");
  ui.appendChild(el("h2","panel-title","Choose Your Origin"));
  ui.appendChild(el("div","tagline","A starting path only — every school opens up as you grow."));
  const cards=el("div","cards");
  for(const key in CLASSES){ const cc=CLASSES[key]; const card=el("div","card");
    card.appendChild(spriteCard(cc.sprite, cc.color, 2.0));
    card.appendChild(el("div","cname",cc.name)); card.appendChild(el("div","cstyle",cc.style));
    card.onclick=()=>{ selClass=cc; renderClassDetail(); [...cards.children].forEach(c=>c.classList.remove("sel")); card.classList.add("sel"); Audio2.select(); };
    cards.appendChild(card); }
  ui.appendChild(cards);
  ui.appendChild(el("div",null)).id="cdetail";
  const back=el("button","ghost","← Back"); back.onclick=showTitle; ui.appendChild(back);
}
function renderClassDetail(){
  const d=document.getElementById("cdetail"); clear(d); const cc=selClass, s=cc.base;
  const box=el("div","detail");
  box.appendChild(el("div",null,"<b style='color:"+cc.color+"'>"+cc.name+"</b>"));
  box.appendChild(el("div",null,cc.desc));
  box.appendChild(el("div","stats","HP "+s.hp+" · MP "+s.mp+" · ATK "+s.atk+" · MAG "+s.mag+" · DEF "+s.def+" · RES "+s.res+" · SPD "+s.spd+" · CRIT "+Math.round(s.crit*100)+"%"));
  box.appendChild(el("div","ablist","<b>Starting schools:</b> "+Object.keys(cc.startRanks).map(k=>SCHOOLS[k].name+" "+cc.startRanks[k]).join(", ")));
  const nameRow=el("div","namerow");
  nameRow.appendChild(el("label",null,"Name: "));
  const input=document.createElement("input");
  input.id="charname"; input.type="text"; input.value=cc.title; input.maxLength=24; input.className="nameinput";
  input.addEventListener("keydown", e=>{ if(e.key==="Enter") beginGame(cc); });
  nameRow.appendChild(input);
  box.appendChild(nameRow);
  d.appendChild(box);
  const start=el("button","primary","Begin as "+cc.name+" →"); start.onclick=()=>beginGame(cc); d.appendChild(start);
}
function beginGame(cc){
  const field=document.getElementById("charname");
  const nm=(field && field.value && field.value.trim()) || cc.title;
  hero=new Player(nm, cc); party=[hero];
  account={gold:50, inv:{potion:3, ether:2, phoenix:1}, gearInv:{}};
  progress={chapter:0, wins:0, completed:false};
  saveGame(party, progress, account);
  showResult(nm+" the "+cc.name, cc.color, ["steps forth from the Great Tomb of Nazarick!","Spend your Skill & Attribute Points in the Build screen as you level."], ()=>showTown());
}

function showTown(msg){
  state="town"; bgKey="menu"; battle=null; hide(battleUI); clearUI(); show(ui); show(topbar); updateTopbar(); Audio2.startMusic("menu");
  const ch=CHAPTERS[progress.chapter];
  ui.appendChild(el("h2","panel-title","The Great Tomb of Nazarick"));
  if(msg) ui.appendChild(el("div","tagline",msg));
  const prog=Math.min(progress.wins,ch.battles);
  ui.appendChild(el("div","tagline","<b style='color:#7fe9ff'>"+ch.name+"</b> — progress "+prog+"/"+ch.battles+(progress.wins>=ch.battles?" · <span style='color:#ff8a8a'>BOSS READY</span>":"")));
  const menu=el("div","menu");
  const adv=el("button","primary",(progress.wins>=ch.battles?"⚔  Face the Boss":"⚔  Venture Forth")); adv.onclick=venture; menu.appendChild(adv);
  const build=el("button",null,"📈  Build / Level Up"+(pointsPending()?" <span class='pill' style='color:#ffd866'>● points</span>":"")); build.onclick=()=>showBuild(); menu.appendChild(build);
  const eq=el("button",null,"🛡  Equipment"); eq.onclick=()=>showEquip(); menu.appendChild(eq);
  const pt=el("button",null,"👥  Party / Recruit"); pt.onclick=()=>showParty(); menu.appendChild(pt);
  const shop=el("button",null,"🏪  Shop"); shop.onclick=()=>showShop(); menu.appendChild(shop);
  const st=el("button",null,"📜  Status"); st.onclick=()=>showStatus(); menu.appendChild(st);
  const rest=el("button",null,"💤  Rest (full party restore)"); rest.onclick=()=>{ party.forEach(p=>p.fullRestore()); updateTopbar(); showTown("The party rests within Nazarick. Fully restored."); }; menu.appendChild(rest);
  const tb=el("button","ghost","🏰  Title"); tb.onclick=showTitle; menu.appendChild(tb);
  ui.appendChild(menu);
}

function venture(){
  const ch=CHAPTERS[progress.chapter]; const isBoss=progress.wins>=ch.battles; bgKey=ch.bg;
  let enemies;
  if(isBoss) enemies=[makeEnemy(ch.boss, ch.lvl+2)];
  else { const n=ch.size[0]+rand(ch.size[1]-ch.size[0]+1); enemies=[]; for(let i=0;i<n;i++) enemies.push(makeEnemy(pick(ch.pool), ch.lvl)); }
  const intro=(progress.wins===0&&!isBoss)?ch.intro:(isBoss?("BOSS: "+enemies[0].name+" appears!"):null);
  if(intro){ clearUI(); show(ui);
    ui.appendChild(el("h2","panel-title", isBoss?"⚠ Boss Battle":ch.name));
    ui.appendChild(el("div","tagline",intro));
    const b=el("button","primary","Engage →"); b.onclick=()=>{ hide(ui); startBattle(enemies, !isBoss, isBoss); }; ui.appendChild(b);
  } else { hide(ui); startBattle(enemies, !isBoss, isBoss); }
}

// ---- character tabs helper ----
let curChar=null;
function charTabs(parent, onSel){ const bar=el("div","tabs");
  party.forEach(p=>{ const b=el("button",(p===curChar?"active":""), p.name+" L"+p.level);
    b.onclick=()=>{ curChar=p; Audio2.select(); onSel(); }; bar.appendChild(b); });
  parent.appendChild(bar); }

function showBuild(){
  if(!curChar||!party.includes(curChar)) curChar=hero;
  clearUI(); ui.classList.add("scroll");
  ui.appendChild(el("h2","panel-title","Build — "+curChar.name));
  charTabs(ui, showBuild);
  ui.appendChild(el("div","points-banner","Skill Points: "+curChar.skillPoints+"  ·  Attribute Points: "+curChar.attrPoints));
  // schools
  ui.appendChild(el("div","tagline","<b>Schools</b> (rank unlocks abilities)"));
  const sg=el("div","grid2");
  for(const k in SCHOOLS){ const sc=SCHOOLS[k]; const r=curChar.schoolRanks[k]||0;
    const row=el("div","srow");
    row.appendChild(el("span","sn","<b style='color:"+sc.color+"'>"+sc.name+"</b> <span style='color:#9a8fc0'>"+sc.desc+"</span>"));
    row.appendChild(el("span","pts",r+"/"+MAX_RANK));
    const plus=el("button","primary","+"); plus.disabled=!(curChar.skillPoints>0&&r<MAX_RANK);
    plus.onclick=()=>{ if(curChar.spendSkill(k)){ Audio2.buff(); saveGame(party,progress,account); showBuild(); } };
    row.appendChild(plus); sg.appendChild(row); }
  ui.appendChild(sg);
  // attributes
  ui.appendChild(el("div","tagline","<b>Attributes</b>"));
  const ag=el("div","grid2");
  for(const st in ATTR){ const row=el("div","srow");
    const cur = st==="crit"?(Math.round((curChar.base.crit)*100)+"%"):curChar.base[st];
    row.appendChild(el("span","sn",ATTR_LABEL[st]+" <span style='color:#9a8fc0'>(now "+cur+", +"+(st==="crit"?"0.5%":ATTR[st])+")</span>"));
    const plus=el("button","primary","+"); plus.disabled=!(curChar.attrPoints>0);
    plus.onclick=()=>{ if(curChar.spendAttr(st)){ Audio2.buff(); saveGame(party,progress,account); showBuild(); } };
    row.appendChild(plus); ag.appendChild(row); }
  ui.appendChild(ag);
  const back=el("button","ghost","← Back"); back.onclick=()=>showTown(); ui.appendChild(back);
}

function showEquip(){
  if(!curChar||!party.includes(curChar)) curChar=hero;
  clearUI(); ui.classList.add("scroll");
  ui.appendChild(el("h2","panel-title","Equipment — "+curChar.name));
  charTabs(ui, showEquip);
  const slots=["weapon","armor","accessory"];
  const sg=el("div","grid2");
  for(const slot of slots){ const cur=curChar.equip[slot]; const row=el("div","srow");
    const txt=cur?("<b class='gear-r"+GEAR[cur].rarity+"'>"+GEAR[cur].name+"</b> "+modStr(GEAR[cur].mods)):"<span style='color:#9a8fc0'>(empty)</span>";
    row.appendChild(el("span","sn","<span class='pill'>"+slot+"</span> "+txt));
    if(cur){ const u=el("button","ghost","Unequip"); u.onclick=()=>{ unequipGear(curChar,slot); saveGame(party,progress,account); showEquip(); }; row.appendChild(u); }
    sg.appendChild(row); }
  ui.appendChild(sg);
  ui.appendChild(el("div","tagline","<b>Inventory</b> (click to equip on "+curChar.name+")"));
  const inv=Object.keys(account.gearInv).filter(k=>account.gearInv[k]>0);
  if(!inv.length) ui.appendChild(el("div","tagline","<span style='color:#9a8fc0'>No spare gear. Win battles or visit the shop.</span>"));
  const ig=el("div","grid2");
  for(const k of inv){ const g=GEAR[k]; const row=el("div","srow");
    row.appendChild(el("span","sn","<b class='gear-r"+g.rarity+"'>"+g.name+"</b> ×"+account.gearInv[k]+" <span class='pill'>"+g.slot+"</span> "+modStr(g.mods)));
    const e2=el("button","primary","Equip"); e2.onclick=()=>{ equipGear(curChar,k); Audio2.buff(); saveGame(party,progress,account); showEquip(); }; row.appendChild(e2);
    ig.appendChild(row); }
  ui.appendChild(ig);
  const back=el("button","ghost","← Back"); back.onclick=()=>showTown(); ui.appendChild(back);
}
function modStr(mods){ return "<span style='color:#8ab6ff;font-size:11px'>"+Object.keys(mods).map(k=>{
  const lbl=(k==="maxhp")?"HP":(k==="crit")?"Crit":k.toUpperCase(); const v=k==="crit"?("+"+Math.round(mods[k]*100)+"%"):((mods[k]>0?"+":"")+mods[k]); return v+" "+lbl; }).join(", ")+"</span>"; }
function equipGear(char, key){ const g=GEAR[key]; if(!(account.gearInv[key]>0)) return;
  const cur=char.equip[g.slot]; if(cur) account.gearInv[cur]=(account.gearInv[cur]||0)+1;
  char.equip[g.slot]=key; account.gearInv[key]--; if(account.gearInv[key]<=0) delete account.gearInv[key]; char.recalc(); }
function unequipGear(char, slot){ const cur=char.equip[slot]; if(!cur) return; account.gearInv[cur]=(account.gearInv[cur]||0)+1; char.equip[slot]=null; char.recalc(); }

function showParty(){
  clearUI(); ui.classList.add("scroll");
  ui.appendChild(el("h2","panel-title","Party ("+party.length+"/"+PARTY_MAX+")"));
  const list=el("div","menu");
  party.forEach(p=>{ const row=el("div","srow"); const chip=el("span","charchip");
    chip.appendChild(spriteCard(p.cls.sprite,p.cls.color,1.2));
    chip.appendChild(el("span","sn","<b>"+p.name+"</b> — L"+p.level+" "+p.cls.name+(p===hero?" <span class='pill'>leader</span>":"")));
    row.appendChild(chip);
    if(p!==hero){ const dm=el("button","danger","Dismiss"); dm.onclick=()=>{ if(safeConfirm("Dismiss "+p.name+"?")){ party=party.filter(x=>x!==p); saveGame(party,progress,account); showParty(); } }; row.appendChild(dm); }
    list.appendChild(row); });
  ui.appendChild(list);
  if(party.length<PARTY_MAX){
    ui.appendChild(el("div","tagline","<b>Recruit a guardian</b> (joins at your level)"));
    const rg=el("div","cards");
    for(const key in RECRUITS){ const cc=CLASSES[key]; const cost=RECRUITS[key].cost; const card=el("div","card");
      card.appendChild(spriteCard(cc.sprite,cc.color,1.6));
      card.appendChild(el("div","cname",cc.name)); card.appendChild(el("div","cstyle",cost+"g"));
      card.onclick=()=>{ if(account.gold>=cost){ account.gold-=cost; const a=makeAlly(key, hero.level); party.push(a); Audio2.coin(); saveGame(party,progress,account); showParty(); } else { Audio2.defeat(); } };
      rg.appendChild(card); }
    ui.appendChild(rg);
  }
  const back=el("button","ghost","← Back"); back.onclick=()=>showTown(); ui.appendChild(back);
}

let shopTab="items";
function showShop(){
  clearUI(); ui.classList.add("scroll");
  ui.appendChild(el("h2","panel-title","Black Market of E-Rantel"));
  ui.appendChild(el("div","points-banner","Gold: "+account.gold));
  const tabs=el("div","tabs");
  [["items","Items"],["gear","Gear"],["scrolls","Scrolls"]].forEach(([k,n])=>{ const b=el("button",(shopTab===k?"active":""),n); b.onclick=()=>{ shopTab=k; showShop(); }; tabs.appendChild(b); });
  ui.appendChild(tabs);
  const menu=el("div","menu");
  if(shopTab==="gear"){ for(const k in GEAR){ const g=GEAR[k];
    const b=el("button",null,"<b class='gear-r"+g.rarity+"'>"+g.name+"</b> <span class='pill'>"+g.slot+"</span> — "+g.price+"g<br>"+modStr(g.mods));
    b.onclick=()=>buy(k,"gear",g.price); menu.appendChild(b); } }
  else { const keys=Object.keys(ITEMS).filter(k=>shopTab==="scrolls"?ITEMS[k].kind==="scroll":ITEMS[k].kind!=="scroll");
    for(const k of keys){ const it=ITEMS[k];
      const b=el("button",null,"<b>"+it.name+"</b> — "+it.price+"g <span style='color:#9a8fc0'>(have "+(account.inv[k]||0)+")</span><br><span style='font-weight:400;font-size:12px;color:#9a8fc0'>"+it.desc+"</span>");
      b.onclick=()=>buy(k,"item",it.price); menu.appendChild(b); } }
  ui.appendChild(menu);
  const back=el("button","primary","← Leave"); back.onclick=()=>showTown(); ui.appendChild(back);
}
function buy(k, type, price){ if(account.gold<price){ Audio2.defeat(); return; } account.gold-=price;
  if(type==="gear") account.gearInv[k]=(account.gearInv[k]||0)+1; else account.inv[k]=(account.inv[k]||0)+1;
  Audio2.coin(); saveGame(party,progress,account); showShop(); }

function showStatus(){
  if(!curChar||!party.includes(curChar)) curChar=hero;
  clearUI(); ui.classList.add("scroll");
  ui.appendChild(el("h2","panel-title","Status — "+curChar.name));
  charTabs(ui, showStatus);
  const p=curChar; const box=el("div","detail");
  box.appendChild(el("div",null,"Level "+p.level+" "+p.cls.name+" · XP "+p.xp+"/"+p.xpNext));
  box.appendChild(el("div","stats","HP "+p.hp+"/"+p.maxHp+" · MP "+p.mp+"/"+p.maxMp+" · ATK "+Math.round(p.eff("atk"))+" · MAG "+Math.round(p.eff("mag"))+" · DEF "+Math.round(p.eff("def"))+" · RES "+Math.round(p.eff("res"))+" · SPD "+Math.round(p.eff("spd"))+" · CRIT "+Math.round(p.effCrit()*100)+"%"));
  box.appendChild(el("div","ablist","<b>Schools:</b> "+Object.keys(p.schoolRanks).filter(k=>p.schoolRanks[k]>0).map(k=>SCHOOLS[k].name+" "+p.schoolRanks[k]).join(", ")||"none"));
  box.appendChild(el("div","ablist","<b>Equipped:</b> "+["weapon","armor","accessory"].map(s=>p.equip[s]?GEAR[p.equip[s]].name:"—").join(" · ")));
  box.appendChild(el("div",null,"<br><b>Known Abilities</b>"));
  for(const k of p.getAbilityKeys()){ const a=ABILITIES[k];
    box.appendChild(el("div","ablist","• <b class='tier-"+a.tier+"' style='color:#cdb6ff'>"+a.name+"</b> ("+(a.mp?a.mp+" MP":"free")+") — "+a.desc)); }
  ui.appendChild(box);
  ui.appendChild(el("div","points-banner","Account — Gold: "+account.gold));
  const back=el("button","primary","← Back"); back.onclick=()=>showTown(); ui.appendChild(back);
}

function showResult(title, color, lines, next){
  state="result"; clearUI(); show(ui);
  ui.appendChild(el("h2","panel-title","<span style='color:"+color+"'>"+title+"</span>"));
  const box=el("div","detail"); for(const l of lines) box.appendChild(el("div",null,l)); ui.appendChild(box);
  const b=el("button","primary","Continue →"); b.onclick=next; ui.appendChild(b);
}
function showDefeat(){
  state="defeat"; bgKey="menu"; hide(battleUI); clearUI(); show(ui); Audio2.startMusic("menu");
  ui.appendChild(el("h2","panel-title","<span style='color:#ff5a6e'>DEFEAT</span>"));
  ui.appendChild(el("div","tagline","Your guardians have fallen… but Nazarick endures."));
  const menu=el("div","menu");
  const rev=el("button","primary","Revive at the Tomb (lose half your gold)");
  rev.onclick=()=>{ party.forEach(p=>p.fullRestore()); account.gold=Math.floor(account.gold/2); progress.wins=0; saveGame(party,progress,account); showTown("Restored; the chapter's advance is reset."); };
  menu.appendChild(rev);
  if(hasSave()){ const ld=el("button",null,"Reload last save"); ld.onclick=()=>{ const l=loadGame(); if(l){ party=l.party; hero=party[0]; progress=l.progress; account=l.account; showTown("Save reloaded."); } }; menu.appendChild(ld); }
  const tb=el("button","ghost","Title"); tb.onclick=showTitle; menu.appendChild(tb);
  ui.appendChild(menu);
}
function showVictory(lines){
  state="victory"; bgKey="capital"; hide(battleUI); clearUI(); show(ui); Audio2.startMusic("menu");
  ui.appendChild(el("h1","title-logo","VICTORY"));
  ui.appendChild(el("div","subtitle","CONQUEROR OF THE NEW WORLD"));
  const box=el("div","detail"); for(const l of lines) box.appendChild(el("div",null,l));
  box.appendChild(el("div",null,"<br><b>"+hero.name+"</b> and the guardians of Nazarick stand unrivaled. The age of the Overlord has begun — and it will never end."));
  ui.appendChild(box);
  const b=el("button","primary","Return to Title"); b.onclick=showTitle; ui.appendChild(b);
}

// ---- canvas click targeting ----
canvas.addEventListener("click", e=>{
  if(!selecting) return;
  const r=canvas.getBoundingClientRect(); const mx=(e.clientX-r.left)*(W/r.width), my=(e.clientY-r.top)*(H/r.height);
  let best=null, bd=1e9;
  for(const t of selecting){ const dx=mx-(t.x+(t.ox||0)), dy=my-(t.y-t.spriteScale*20); const d=dx*dx+dy*dy; if(d<bd){ bd=d; best=t; } }
  if(best && bd<(60*60) && resolver){ const r2=resolver; resolver=null; selecting=null; hide(submenuEl); Audio2.select(); r2(best); }
});

// boot
showTitle();
