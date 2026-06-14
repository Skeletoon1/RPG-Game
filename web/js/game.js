"use strict";
// ============================================================================
//  GAME — render loop, screens, and animated battle orchestration
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

let state="title";
let player=null, progress=null, battle=null;
let bgKey="menu";
let floats=[], particles=[], shakeT=0;
let selecting=null;          // array of selectable targets during targeting
let lastT=0;

// ---------- small sprite-to-canvas helper (menus) ----------
function spriteCard(key, color, scale){
  const cv=document.createElement("canvas"); cv.width=96; cv.height=96;
  const c=cv.getContext("2d");
  drawSprite(c, key, 48, 86, scale||2.4, {color:color});
  return cv;
}

// ============================================================================
//  RENDER LOOP
// ============================================================================
function loop(t){
  const dt=Math.min(0.05,(t-lastT)/1000)||0; lastT=t;
  ctx.save();
  if(shakeT>0){ ctx.translate((Math.random()-.5)*shakeT*14,(Math.random()-.5)*shakeT*14); shakeT-=dt*4; }
  drawBackground(ctx, bgKey, W, H, t);
  if(state==="battle" && battle){ drawCombatants(t); }
  drawParticles(dt); drawFloats(dt);
  ctx.restore();
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);

function drawCombatants(t){
  const all=battle.party.concat(battle.enemies)
    .filter(e=>e.alive || e.fade>0)
    .sort((a,b)=>a.y-b.y);
  for(const e of all){
    const alpha = e.alive?1:Math.max(0,e.fade);
    if(alpha<=0) continue;
    if(!e.alive){ e.fade-=0.02; }
    if(e.flash>0) e.flash-=0.06;
    const bob=Math.sin(t*0.004+e.bob)*3*(e.alive?1:0);
    const ox=e.ox||0;
    ctx.globalAlpha=alpha;
    // selection highlight
    if(selecting && selecting.includes(e)){
      ctx.strokeStyle="rgba(255,216,102,"+(0.5+0.4*Math.sin(t*0.01))+")";
      ctx.lineWidth=3; ctx.beginPath();
      ctx.ellipse(e.x+ox, e.y+4, 26*(e.spriteScale/3), 9*(e.spriteScale/3),0,0,7); ctx.stroke();
    }
    drawSprite(ctx, e.sprite, e.x+ox, e.y+bob, e.spriteScale,
      {color:e.color, tint:e.tint, flip:e.side==="enemy", flash:e.flash});
    drawUnitBar(e, ox);
    ctx.globalAlpha=1;
  }
}

function drawUnitBar(e, ox){
  const top = e.y - e.spriteScale*44 - 14;
  const w=64, x=e.x+ox-w/2, y=top;
  // name
  ctx.font="bold 11px 'Trebuchet MS',sans-serif"; ctx.textAlign="center";
  ctx.fillStyle = e.isBoss ? "#ff8a8a" : "#ece6ff";
  ctx.fillText(e.name, e.x+ox, y-12);
  // hp bar
  ctx.fillStyle="rgba(0,0,0,.6)"; ctx.fillRect(x-1,y-1,w+2,7);
  const r=e.hp/e.maxHp;
  ctx.fillStyle = r>.5?"#46e08a":r>.25?"#ffcf4d":"#ff5a6e";
  ctx.fillRect(x,y,w*r,5);
  // mp bar (party only)
  if(e.side==="party" && e.maxMp>0){
    ctx.fillStyle="rgba(0,0,0,.6)"; ctx.fillRect(x-1,y+6,w+2,4);
    ctx.fillStyle="#5aa6ff"; ctx.fillRect(x,y+7,w*(e.mp/e.maxMp),2);
  }
  if(e.shield>0){ ctx.fillStyle="#fff"; ctx.fillRect(x,y-3,Math.min(w,w*e.shield/e.maxHp),2); }
  // status icons
  if(e.statuses.length){
    ctx.font="10px sans-serif"; let sx=x;
    for(const s of e.statuses){ ctx.fillStyle=STATUSES[s.key].color;
      ctx.fillText(STATUSES[s.key].icon, sx+4, y+22); sx+=12; }
  }
  ctx.textAlign="left";
}

function drawParticles(dt){
  for(let i=particles.length-1;i>=0;i--){
    const p=particles[i]; p.life-=dt; if(p.life<=0){ particles.splice(i,1); continue; }
    p.x+=p.vx*dt; p.y+=p.vy*dt; p.vy+=p.g*dt;
    ctx.globalAlpha=clamp(p.life/p.max,0,1); ctx.fillStyle=p.color;
    ctx.fillRect(p.x,p.y,p.size,p.size);
  }
  ctx.globalAlpha=1;
}
function drawFloats(dt){
  ctx.textAlign="center";
  for(let i=floats.length-1;i>=0;i--){
    const f=floats[i]; f.life-=dt; if(f.life<=0){ floats.splice(i,1); continue; }
    f.y+=f.vy*dt;
    ctx.globalAlpha=clamp(f.life/f.max,0,1);
    ctx.font="bold "+f.size+"px 'Trebuchet MS',sans-serif";
    ctx.lineWidth=4; ctx.strokeStyle="rgba(0,0,0,.85)"; ctx.strokeText(f.text,f.x,f.y);
    ctx.fillStyle=f.color; ctx.fillText(f.text,f.x,f.y);
  }
  ctx.globalAlpha=1; ctx.textAlign="left";
}
function spawnFloat(x,y,text,color,size){ floats.push({x,y,text,color,size:size||20,vy:-26,life:1.1,max:1.1}); }
function burst(x,y,color,n){ for(let i=0;i<(n||14);i++){ const a=Math.random()*7,sp=randf(30,140);
  particles.push({x,y,vx:Math.cos(a)*sp,vy:Math.sin(a)*sp-30,g:160,size:randf(2,5),color,life:randf(.3,.7),max:.7}); } }

// ============================================================================
//  BATTLE
// ============================================================================
function makeBattle(enemies, canFlee){
  const b={
    party:[player], enemies:enemies, canFlee:canFlee, fled:false,
    heroLevel:player.level, logs:[],
    side(s){ return s==="party"?this.party:this.enemies; },
    living(s){ return this.side(s).filter(e=>e.alive); },
    addSummon(e){ e.fade=1; this.party.push(e); layoutBattle(); },
    log(m){ this.logs.push(m); renderLog(); },
    onHit(tgt,dmg,elem,crit,ab){ tgt.flash=1; shakeT=Math.max(shakeT,crit?0.9:0.5);
      spawnFloat(tgt.x+(tgt.ox||0), tgt.y-tgt.spriteScale*40, (crit?"":"")+dmg, ELEM[elem]||"#fff", crit?30:20);
      if(crit) spawnFloat(tgt.x,(tgt.y-tgt.spriteScale*48),"CRIT!", "#ffe14d", 16);
      burst(tgt.x+(tgt.ox||0), tgt.y-tgt.spriteScale*30, ELEM[elem]||"#fff", crit?22:12); },
    onHeal(tgt,amt){ spawnFloat(tgt.x+(tgt.ox||0), tgt.y-tgt.spriteScale*40, "+"+amt, "#46e08a",20);
      burst(tgt.x, tgt.y-tgt.spriteScale*30, "#46e08a", 10); },
    onStatus(tgt,key){ spawnFloat(tgt.x, tgt.y-tgt.spriteScale*34, STATUSES[key].icon, STATUSES[key].color,18); },
    onDeath(tgt){ if(tgt.fade==null) tgt.fade=1; tgt.dead=true; burst(tgt.x,tgt.y-tgt.spriteScale*28,"#888",18);
      this.log(tgt.name+" is slain!"); },
  };
  // init fade for living
  for(const e of b.party.concat(b.enemies)){ e.fade=1; }
  return b;
}
function layoutBattle(){
  const py=270;
  battle.party.forEach((e,i)=>{ e.x=150+i*34; e.y=py+i*52; e.spriteScale=e.isSummon?2.7:3.0; });
  battle.enemies.forEach((e,i)=>{ e.x=650-i*36; e.y=py+i*52; e.spriteScale=e.isBoss?4.4:2.9; });
}

function renderLog(){
  clear(logEl);
  for(const m of battle.logs.slice(-30)){ logEl.appendChild(el("div","l",m)); }
  logEl.scrollTop=logEl.scrollHeight;
}

// ---- promise-based UI prompts ----
let resolver=null;
function buttons(parent, list){ // list: [{label,cls,onClick,disabled,html}]
  clear(parent);
  for(const it of list){
    const b=document.createElement("button");
    b.className=it.cls||""; b.innerHTML=it.html||it.label;
    if(it.disabled) b.disabled=true;
    b.onclick=it.onClick;
    parent.appendChild(b);
  }
}
function uiPrompt(setup){ return new Promise(res=>{ resolver=res; setup(v=>{ resolver=null; res(v); }); }); }

async function startBattle(enemies, canFlee){
  battle=makeBattle(enemies, canFlee);
  layoutBattle();
  state="battle"; hide(ui); show(battleUI); show(topbar); renderLog(); updateTopbar();
  await battleLoop();
}

async function battleLoop(){
  while(!battleOver()){
    const order=battle.party.concat(battle.enemies).filter(e=>e.alive)
      .sort((a,b)=>(b.eff("spd")+Math.random())-(a.eff("spd")+Math.random()));
    for(const u of order){
      if(!u.alive) continue;
      if(battleOver()) break;
      await takeTurn(u);
      if(battleOver()) break;
    }
    // expire summons
    for(const e of battle.party.slice()){ if(e.isSummon && e.summonDur!=null){ e.summonDur--; if(e.summonDur<=0&&e.alive){ e.hp=0; battle.onDeath(e);} } }
  }
  await finishBattle();
}
function battleOver(){ return !battle.living("party").length || !battle.living("enemy").length || battle.fled; }

async function takeTurn(u){
  u.defending=false;
  tickStatusStart(u, battle); updateTopbar(); await wait(260);
  if(!u.alive){ tickStatusEnd(u,battle); return; }
  if(u.isStunned()){ const s=u.statuses.find(x=>STATUSES[x.key].blocks);
    battle.log(u.name+" is "+STATUSES[s.key].name+" and cannot act!");
    spawnFloat(u.x,u.y-u.spriteScale*40,STATUSES[s.key].icon,STATUSES[s.key].color,22);
    await wait(500); tickStatusEnd(u,battle); return; }

  if(u===player){ await playerTurn(u); }
  else { const a=aiChoose(u,battle); if(a){ battle.log(u.name+" uses "+ABILITIES[a.key].name+".");
    await animate(u, a.key, a.targets); } }
  tickStatusEnd(u, battle); updateTopbar(); await wait(180);
}

async function playerTurn(hero){
  while(true){
    const act=await uiPrompt(done=>{
      clear(submenuEl); hide(submenuEl);
      buttons(actionsEl,[
        {label:"⚔ Attack", cls:"primary", onClick:()=>done("attack")},
        {label:"✨ Ability", onClick:()=>done("ability")},
        {label:"🧪 Item", onClick:()=>done("item")},
        {label:"🛡 Defend", onClick:()=>done("defend")},
        {label:"🏃 Flee", disabled:!battle.canFlee, onClick:()=>done("flee")},
      ]);
    });
    if(act==="attack"){ const t=await chooseTarget(battle.living("enemy")); if(!t) continue;
      await execute(hero,"strike",[t]); return; }
    if(act==="ability"){ const key=await chooseAbility(hero); if(!key) continue;
      const targets=await playerTargets(hero, ABILITIES[key]); if(!targets) continue;
      await execute(hero,key,targets); return; }
    if(act==="item"){ const used=await chooseItem(hero); if(used) return; else continue; }
    if(act==="defend"){ hero.defending=true; battle.log(hero.name+" takes a defensive stance.");
      spawnFloat(hero.x,hero.y-hero.spriteScale*40,STATUSES.defUp.icon,"#8ab6ff",18); await wait(350); return; }
    if(act==="flee"){ await tryFlee(hero); return; }
  }
}

function chooseAbility(hero){
  return uiPrompt(done=>{
    show(submenuEl);
    const list=hero.abilityKeys.map(k=>{ const a=ABILITIES[k]; const cd=hero.cd[k]||0;
      const ok=hero.mp>=a.mp && cd<=0;
      const note = cd>0?(" [CD "+cd+"]"):(hero.mp<a.mp?" [no MP]":"");
      return {cls:"ab-btn tier-"+a.tier, disabled:!ok,
        html:"<span class='an'>"+a.name+note+"</span><span class='ad'>"+a.desc+"</span><span class='acost'>"+(a.mp?a.mp+" MP":"free")+"</span>",
        onClick:()=>{ hide(submenuEl); done(k); }};
    });
    list.push({label:"← Back", cls:"ghost", onClick:()=>{ hide(submenuEl); done(null); }});
    buttons(submenuEl, list);
  });
}

function chooseItem(hero){
  return uiPrompt(done=>{
    const owned=Object.keys(hero.inv).filter(k=>hero.inv[k]>0);
    if(!owned.length){ battle.log("No usable items!"); done(false); return; }
    show(submenuEl);
    const list=owned.map(k=>{ const it=ITEMS[k];
      return {cls:"ab-btn", html:"<span class='an'>"+it.name+" ×"+hero.inv[k]+"</span><span class='ad'>"+it.desc+"</span>",
        onClick:()=>{ hide(submenuEl); useItem(hero,k); done(true); }};});
    list.push({label:"← Back", cls:"ghost", onClick:()=>{ hide(submenuEl); done(false); }});
    buttons(submenuEl, list);
  });
}
function useItem(hero,k){
  const it=ITEMS[k]; hero.inv[k]--;
  if(it.kind==="heal"){ const h=hero.heal(it.amt); battle.onHeal(hero,h); }
  else if(it.kind==="mp"){ hero.mp=Math.min(hero.maxMp,hero.mp+it.amt); spawnFloat(hero.x,hero.y-hero.spriteScale*40,"+"+it.amt+" MP","#5aa6ff",18); }
  else if(it.kind==="full"){ hero.hp=hero.maxHp; hero.mp=hero.maxMp; battle.onHeal(hero,0); spawnFloat(hero.x,hero.y-hero.spriteScale*42,"FULL!","#ffd866",22); }
  else if(it.kind==="cleanse"){ const neg=["poison","burn","bleed","stun","freeze","atkDown","defDown","slow"]; neg.forEach(n=>hero.removeStatus(n)); spawnFloat(hero.x,hero.y-hero.spriteScale*40,"cleansed","#7fe9ff",16); }
  else if(it.kind==="revive"){ const h=hero.heal(it.amt); battle.onHeal(hero,h); }
  battle.log(player.name+" uses "+it.name+".");
  updateTopbar();
}

function playerTargets(hero, ab){
  switch(ab.target){
    case "self": return Promise.resolve([hero]);
    case "all_enemies": return Promise.resolve(battle.living("enemy"));
    case "all_allies": return Promise.resolve(battle.living("party"));
    case "one_enemy": return chooseTarget(battle.living("enemy")).then(t=>t?[t]:null);
    case "one_ally": return chooseTarget(battle.living("party")).then(t=>t?[t]:null);
    case "dead_ally":{ const dead=battle.party.filter(e=>!e.alive);
      if(!dead.length){ battle.log("No fallen ally to revive."); return Promise.resolve(null); }
      return chooseTarget(dead, true).then(t=>t?[t]:null); }
  }
  return Promise.resolve([hero]);
}

function chooseTarget(list, includeDead){
  if(!list.length) return Promise.resolve(null);
  if(list.length===1) return Promise.resolve(list[0]);
  return uiPrompt(done=>{
    selecting=list;
    show(submenuEl);
    const btns=list.map(e=>({cls:"ghost", label:e.name+" ("+e.hp+"/"+e.maxHp+")",
      onClick:()=>{ selecting=null; hide(submenuEl); done(e); }}));
    btns.push({label:"← Cancel", cls:"ghost", onClick:()=>{ selecting=null; hide(submenuEl); done(null); }});
    buttons(submenuEl, btns);
  });
}

async function execute(user, key, targets){
  const a=ABILITIES[key];
  battle.log(user.name+(key==="strike"?" attacks!":" uses "+a.name+"!"));
  clear(actionsEl);
  await animate(user, key, targets);
}

async function animate(user, key, targets){
  const a=ABILITIES[key];
  const dir = user.side==="party"?1:-1;
  if(a.tier==="martial"){ user.ox=dir*30; await wait(150); }
  else { // caster glow + projectiles
    user.flash=0.6; burst(user.x, user.y-user.spriteScale*30, ELEM[a.elem]||"#fff", 10);
    await wait(120);
    for(const t of targets){ if(t && t!==user) shootProjectile(user, t, a.elem); }
    await wait(180);
  }
  if(a.tier==="super"){ shakeT=1; }
  applyAbility(user, key, targets, battle);
  updateTopbar();
  await wait(a.tier==="super"?600:420);
  user.ox=0;
}
function shootProjectile(user, t, elem){
  const x0=user.x, y0=user.y-user.spriteScale*28, x1=t.x, y1=t.y-t.spriteScale*28;
  const steps=10;
  for(let i=0;i<steps;i++){ const f=i/steps;
    particles.push({x:x0+(x1-x0)*f,y:y0+(y1-y0)*f,vx:0,vy:0,g:0,size:randf(3,5),color:ELEM[elem]||"#fff",life:.4-f*0.2,max:.4}); }
}

async function tryFlee(hero){
  if(battle.enemies.some(e=>e.isBoss)){ battle.log("You cannot flee from this foe!"); await wait(500); return; }
  const fast=Math.max(0,...battle.living("enemy").map(e=>e.eff("spd")));
  let odds=clamp(0.5+(hero.eff("spd")-fast)/100,0.1,0.9);
  if(Math.random()<odds){ battle.log(hero.name+" fled from battle!"); battle.fled=true; }
  else battle.log("Couldn't escape!");
  await wait(500);
}

async function finishBattle(){
  hide(submenuEl); clear(actionsEl); selecting=null;
  await wait(300);
  let result;
  if(battle.fled){ result={r:"flee"}; }
  else if(!battle.living("party").length){ result={r:"lose"}; }
  else { result={r:"win", xp:battle.enemies.reduce((s,e)=>s+(e.xpReward||0),0),
                 gold:battle.enemies.reduce((s,e)=>s+(e.goldReward||0),0)}; }
  hide(battleUI);
  // remove summons from party (don't persist outside battle)
  battle.party=battle.party.filter(e=>!e.isSummon);
  if(result.r==="lose"){ return showDefeat(); }
  if(result.r==="flee"){ state="town"; bgKey="menu"; showTown("You retreat to regroup."); return; }
  // win
  const ch=CHAPTERS[progress.chapter];
  const wasBoss = progress.wins>=ch.battles;
  player.gold+=result.gold;
  const lvlMsgs=player.gainXp(result.xp);
  // breather restore
  player.hp=Math.min(player.maxHp,player.hp+Math.round(player.maxHp*0.2));
  player.mp=Math.min(player.maxMp,player.mp+Math.round(player.maxMp*0.2));
  player.statuses=[]; player.shield=0; player.cd={}; player.defending=false;

  let lines=["Earned "+result.xp+" XP and "+result.gold+" gold."].concat(lvlMsgs);
  if(wasBoss){
    lines.push(ch.outro);
    progress.wins=0;
    if(progress.chapter+1<CHAPTERS.length){ progress.chapter++; lines.push("A new front opens: "+CHAPTERS[progress.chapter].name); }
    else { progress.completed=true; saveGame(player,progress); return showVictory(lines); }
  } else {
    progress.wins++;
    if(progress.wins>=ch.battles) lines.push("The path to the chapter boss is open!");
  }
  saveGame(player, progress);
  state="town"; bgKey="menu";
  showResult("VICTORY", "#46e08a", lines, ()=>showTown());
}

// ============================================================================
//  SCREENS (DOM overlays)
// ============================================================================
function clearUI(){ clear(ui); ui.classList.remove("scroll"); }
function updateTopbar(){
  if(!player){ hide(topbar); return; }
  document.getElementById("tb-name").textContent=player.name;
  document.getElementById("tb-level").textContent="Lv."+player.level+" "+player.cls.name;
  document.getElementById("tb-hp").innerHTML="<span style='color:#ff8a99'>HP "+player.hp+"/"+player.maxHp+"</span>";
  document.getElementById("tb-mp").innerHTML="<span style='color:#8ab6ff'>MP "+player.mp+"/"+player.maxMp+"</span>";
  document.getElementById("tb-gold").textContent=player.gold+"g";
  document.getElementById("tb-chapter").textContent=progress?CHAPTERS[progress.chapter].name:"";
}

function showTitle(){
  state="title"; bgKey="menu"; battle=null; hide(battleUI); hide(topbar); clearUI(); show(ui);
  ui.appendChild(el("h1","title-logo","OVERLORD"));
  ui.appendChild(el("div","subtitle","NAZARICK RISING"));
  ui.appendChild(el("div","tagline","The Great Tomb of Nazarick has descended upon the New World. Choose your guardian and seize dominion over all that lives."));
  const menu=el("div","menu");
  const nb=el("button","primary","⚔  New Game"); nb.onclick=showClassSelect; menu.appendChild(nb);
  const cb=el("button",null,"▶  Continue"); cb.disabled=!hasSave();
  cb.onclick=()=>{ const l=loadGame(); if(l){ player=l.player; progress=l.progress; showTown("Welcome back, "+player.name+"."); } };
  menu.appendChild(cb);
  const hb=el("button","ghost","？  How to Play"); hb.onclick=showHelp; menu.appendChild(hb);
  ui.appendChild(menu);
}

function showHelp(){
  clearUI(); ui.classList.add("scroll");
  ui.appendChild(el("h2","panel-title","How to Play"));
  ui.appendChild(el("div","detail",
    "<b>Goal:</b> conquer all 5 chapters of the New World.<br><br>"+
    "<b>Battles</b> are turn-based; order is set by <span class='kbd'>SPD</span>. On your turn: "+
    "<b>Attack</b>, use an <b>Ability</b> (costs MP), use an <b>Item</b>, <b>Defend</b> (+DEF/RES), or <b>Flee</b>.<br><br>"+
    "Abilities deal elemental damage, heal, buff/debuff, inflict status effects (poison, burn, freeze, stun…), or summon allies.<br><br>"+
    "<b>Exploit weaknesses</b> — undead burn under Holy, demons freeze under Ice, etc.<br><br>"+
    "Win for <b>XP</b> & <b>gold</b>. Level up to grow and learn new abilities, including <b>Super-Tier</b> magic. Spend gold at the <b>Shop</b>; <b>Rest</b> to refill HP/MP."));
  const b=el("button","primary","← Back"); b.onclick=showTitle; ui.appendChild(b);
}

let selClass=null;
function showClassSelect(){
  selClass=null; clearUI(); ui.classList.add("scroll");
  ui.appendChild(el("h2","panel-title","Choose Your Guardian"));
  const cards=el("div","cards");
  for(const key in CLASSES){
    const cc=CLASSES[key];
    const card=el("div","card");
    card.appendChild(spriteCard(cc.key, cc.color, 2.0));
    card.appendChild(el("div","cname",cc.name));
    card.appendChild(el("div","ctitle",cc.title));
    card.appendChild(el("div","cstyle",cc.style));
    card.onclick=()=>{ selClass=cc; renderClassDetail();
      [...cards.children].forEach(c=>c.classList.remove("sel")); card.classList.add("sel"); };
    cards.appendChild(card);
  }
  ui.appendChild(cards);
  const detail=el("div"); detail.id="cdetail"; ui.appendChild(detail);
  const row=el("div","row");
  const back=el("button","ghost","← Back"); back.onclick=showTitle; row.appendChild(back);
  ui.appendChild(row);
}
function renderClassDetail(){
  const d=document.getElementById("cdetail"); clear(d);
  const cc=selClass; const s=cc.base;
  const box=el("div","detail");
  box.appendChild(el("div",null,"<b style='color:"+cc.color+"'>"+cc.name+"</b> — <i>"+cc.title+"</i>"));
  box.appendChild(el("div",null,cc.desc));
  box.appendChild(el("div","stats","HP "+s.hp+" · MP "+s.mp+" · ATK "+s.atk+" · MAG "+s.mag+" · DEF "+s.def+" · RES "+s.res+" · SPD "+s.spd+" · CRIT "+Math.round(s.crit*100)+"%"));
  box.appendChild(el("div","ablist","<b>Starts with:</b> "+cc.start.map(k=>ABILITIES[k].name).join(", ")));
  const unl=Object.keys(cc.unlocks).map(l=>"L"+l+": "+cc.unlocks[l].map(k=>ABILITIES[k].name).join(", ")).join(" · ");
  box.appendChild(el("div","ablist","<b>Unlocks:</b> "+unl));
  d.appendChild(box);
  const start=el("button","primary","Begin as the "+cc.name+" →");
  start.onclick=()=>beginGame(cc); d.appendChild(start);
}
function beginGame(cc){
  player=new Player(cc.title, cc); // name defaults to title; allow rename
  const nm=window.prompt ? (window.prompt("Name your "+cc.name+":", cc.title)||cc.title) : cc.title;
  player.name=nm;
  player.addItem("potion",3); player.addItem("ether",2); player.addItem("phoenix",1);
  progress={chapter:0, wins:0, completed:false};
  saveGame(player, progress);
  showResult(player.name+" the "+cc.name, cc.color,
    ["steps forth from the Great Tomb of Nazarick!"], ()=>showTown());
}

function showTown(msg){
  state="town"; bgKey="menu"; battle=null; hide(battleUI); clearUI(); show(ui); show(topbar); updateTopbar();
  const ch=CHAPTERS[progress.chapter];
  ui.appendChild(el("h2","panel-title","The Great Tomb of Nazarick"));
  if(msg) ui.appendChild(el("div","tagline",msg));
  const prog=Math.min(progress.wins,ch.battles);
  ui.appendChild(el("div","tagline","<b style='color:#7fe9ff'>"+ch.name+"</b> — progress "+prog+"/"+ch.battles+(progress.wins>=ch.battles?" · <span style='color:#ff8a8a'>BOSS READY</span>":"")));
  const menu=el("div","menu");
  const adv=el("button","primary",(progress.wins>=ch.battles?"⚔  Face the Boss":"⚔  Venture Forth"));
  adv.onclick=venture; menu.appendChild(adv);
  const shop=el("button",null,"🏪  Shop"); shop.onclick=showShop; menu.appendChild(shop);
  const st=el("button",null,"📜  Status & Abilities"); st.onclick=showStatus; menu.appendChild(st);
  const rest=el("button",null,"💤  Rest at the Tomb (full restore)");
  rest.onclick=()=>{ player.fullRestore(); updateTopbar(); showTown("You rest within Nazarick. Fully restored."); };
  menu.appendChild(rest);
  const tb=el("button","ghost","🏰  Back to Title"); tb.onclick=showTitle; menu.appendChild(tb);
  ui.appendChild(menu);
}

function venture(){
  const ch=CHAPTERS[progress.chapter];
  const isBoss=progress.wins>=ch.battles;
  bgKey=ch.bg;
  let enemies;
  if(isBoss){ enemies=[makeEnemy(ch.boss, ch.lvl+2)]; }
  else { const n=ch.size[0]+rand(ch.size[1]-ch.size[0]+1);
    enemies=[]; for(let i=0;i<n;i++) enemies.push(makeEnemy(pick(ch.pool), ch.lvl)); }
  const intro = (progress.wins===0 && !isBoss) ? ch.intro : (isBoss?("BOSS: "+enemies[0].name+" appears!"):null);
  if(intro){
    clearUI(); show(ui);
    ui.appendChild(el("h2","panel-title", isBoss?"⚠ Boss Battle":ch.name));
    ui.appendChild(el("div","tagline",intro));
    const b=el("button","primary","Engage →");
    b.onclick=()=>{ hide(ui); startBattle(enemies, !isBoss); };
    ui.appendChild(b);
  } else { hide(ui); startBattle(enemies, !isBoss); }
}

function showShop(){
  clearUI(); ui.classList.add("scroll");
  ui.appendChild(el("h2","panel-title","Black Market of E-Rantel"));
  ui.appendChild(el("div","tagline","Gold: <b style='color:#ffd866'>"+player.gold+"</b>"));
  const menu=el("div","menu");
  for(const k in ITEMS){ const it=ITEMS[k];
    const b=el("button",null,"<b>"+it.name+"</b> — "+it.price+"g <span style='color:#9a8fc0'>(have "+(player.inv[k]||0)+")</span><br><span style='font-weight:400;font-size:12px;color:#9a8fc0'>"+it.desc+"</span>");
    b.onclick=()=>{ if(player.gold>=it.price){ player.gold-=it.price; player.addItem(k,1); saveGame(player,progress); showShop(); }
      else { b.animate?b.animate([{transform:"translateX(-4px)"},{transform:"translateX(4px)"},{transform:"translateX(0)"}],150):0; } };
    menu.appendChild(b);
  }
  ui.appendChild(menu);
  const back=el("button","primary","← Leave"); back.onclick=()=>showTown(); ui.appendChild(back);
}

function showStatus(){
  clearUI(); ui.classList.add("scroll");
  const s=player.base;
  ui.appendChild(el("h2","panel-title",player.name+" — "+player.cls.name));
  const box=el("div","detail");
  box.appendChild(el("div",null,"Level "+player.level+" · XP "+player.xp+"/"+player.xpNext+" · Gold "+player.gold));
  box.appendChild(el("div","stats","HP "+player.hp+"/"+player.maxHp+" · MP "+player.mp+"/"+player.maxMp+" · ATK "+s.atk+" · MAG "+s.mag+" · DEF "+s.def+" · RES "+s.res+" · SPD "+s.spd+" · CRIT "+Math.round(s.crit*100)+"%"));
  box.appendChild(el("div",null,"<b>Abilities</b>"));
  for(const k of player.abilityKeys){ const a=ABILITIES[k];
    box.appendChild(el("div","ablist","• <b class='tier-"+a.tier+"' style='color:#cdb6ff'>"+a.name+"</b> ("+(a.mp?a.mp+" MP":"free")+") — "+a.desc)); }
  const locked=[]; for(const l in player.cls.unlocks) for(const k of player.cls.unlocks[l]) if(!player.abilityKeys.includes(k)) locked.push("L"+l+": "+ABILITIES[k].name);
  if(locked.length){ box.appendChild(el("div","ablist","<br><b>Locked:</b> "+locked.join(" · "))); }
  box.appendChild(el("div",null,"<br><b>Inventory</b>"));
  const items=Object.keys(player.inv).filter(k=>player.inv[k]>0);
  box.appendChild(el("div","ablist", items.length?items.map(k=>ITEMS[k].name+" ×"+player.inv[k]).join(", "):"(empty)"));
  ui.appendChild(box);
  const back=el("button","primary","← Back"); back.onclick=()=>showTown(); ui.appendChild(back);
}

function showResult(title, color, lines, next){
  state="result"; clearUI(); show(ui);
  ui.appendChild(el("h2","panel-title", "<span style='color:"+color+"'>"+title+"</span>"));
  const box=el("div","detail");
  for(const l of lines) box.appendChild(el("div",null,l));
  ui.appendChild(box);
  const b=el("button","primary","Continue →"); b.onclick=next; ui.appendChild(b);
}

function showDefeat(){
  state="defeat"; bgKey="menu"; hide(battleUI); clearUI(); show(ui);
  ui.appendChild(el("h2","panel-title","<span style='color:#ff5a6e'>DEFEAT</span>"));
  ui.appendChild(el("div","tagline","Your guardian has fallen… but Nazarick endures."));
  const menu=el("div","menu");
  const rev=el("button","primary","Revive at the Tomb (lose half your gold)");
  rev.onclick=()=>{ player.fullRestore(); player.gold=Math.floor(player.gold/2); progress.wins=0; saveGame(player,progress); showTown("You are restored; the chapter's advance is reset."); };
  menu.appendChild(rev);
  if(hasSave()){ const ld=el("button",null,"Reload last save");
    ld.onclick=()=>{ const l=loadGame(); if(l){ player=l.player; progress=l.progress; showTown("Save reloaded."); } };
    menu.appendChild(ld); }
  const tb=el("button","ghost","Back to Title"); tb.onclick=showTitle; menu.appendChild(tb);
  ui.appendChild(menu);
}

function showVictory(lines){
  state="victory"; bgKey="capital"; hide(battleUI); clearUI(); show(ui);
  ui.appendChild(el("h1","title-logo","VICTORY"));
  ui.appendChild(el("div","subtitle","CONQUEROR OF THE NEW WORLD"));
  const box=el("div","detail");
  for(const l of lines) box.appendChild(el("div",null,l));
  box.appendChild(el("div",null,"<br><b>"+player.name+" the "+player.cls.name+"</b> stands unrivaled. The age of the Overlord has begun — and it will never end."));
  box.appendChild(el("div","stats","Final level: "+player.level+" · Gold: "+player.gold));
  ui.appendChild(box);
  const b=el("button","primary","Return to Title"); b.onclick=showTitle; ui.appendChild(b);
}

// ---- canvas click -> targeting ----
canvas.addEventListener("click", e=>{
  if(!selecting) return;
  const r=canvas.getBoundingClientRect();
  const mx=(e.clientX-r.left)*(W/r.width), my=(e.clientY-r.top)*(H/r.height);
  let best=null, bd=1e9;
  for(const t of selecting){ const dx=mx-(t.x+(t.ox||0)), dy=my-(t.y-t.spriteScale*20);
    const d=dx*dx+dy*dy; if(d<bd){ bd=d; best=t; } }
  if(best && bd< (60*60) && resolver){ const r2=resolver; resolver=null; selecting=null; hide(submenuEl); r2(best); }
});

// boot
showTitle();
