"use strict";
// ============================================================================
//  ENGINE — entities, build system, gear, status effects, ability resolution
// ============================================================================

const MAGIC_ELEMS = {Fire:1,Ice:1,Lightning:1,Dark:1,Holy:1,Arcane:1,Poison:1};

// per-point gains when spending attribute points
const ATTR = {hp:14, mp:10, atk:3, mag:3, def:2, res:2, spd:2, crit:.005};
const ATTR_LABEL = {hp:"Max HP", mp:"Max MP", atk:"Attack", mag:"Magic",
  def:"Defense", res:"Resist", spd:"Speed", crit:"Crit %"};
const SKILL_PER_LEVEL = 3, ATTR_PER_LEVEL = 3;

const STATUSES = {
  poison:{name:"Poison", icon:"☠", color:"#7dff6b", dot:true},
  burn:{name:"Burn", icon:"🔥", color:"#ff7a3c", dot:true},
  bleed:{name:"Bleed", icon:"🩸", color:"#ff5a6e", dot:true},
  regen:{name:"Regen", icon:"✚", color:"#46e08a", hot:true},
  stun:{name:"Stun", icon:"✦", color:"#ffe14d", blocks:true},
  freeze:{name:"Frozen", icon:"❄", color:"#7fe9ff", blocks:true},
  atkUp:{name:"ATK↑", icon:"▲", color:"#ff9a8a", mods:p=>({atk:p,mag:p})},
  atkDown:{name:"ATK↓", icon:"▼", color:"#b66", mods:p=>({atk:-p,mag:-p})},
  defUp:{name:"DEF↑", icon:"▲", color:"#8ab6ff", mods:p=>({def:p,res:p})},
  defDown:{name:"DEF↓", icon:"▼", color:"#668", mods:p=>({def:-p,res:-p})},
  haste:{name:"Haste", icon:"»", color:"#7fe9ff", mods:p=>({spd:p})},
  slow:{name:"Slow", icon:"«", color:"#69c", mods:p=>({spd:-p})},
  shield:{name:"Shield", icon:"◈", color:"#fff"},
};

function scaleStats(base, grow, level){
  const s=Object.assign({},base);
  for(let i=1;i<level;i++) for(const k in grow) s[k]+=grow[k];
  return s;
}
// add a mods object into an accumulator; "maxhp" maps to "hp"
function addMods(acc, mods){ for(const k in mods){ const key=(k==="maxhp")?"hp":k; acc[key]=(acc[key]||0)+mods[k]; } }

class Entity{
  constructor(name, stats, abilityKeys, side, opt){
    opt=opt||{};
    this.name=name; this.base=Object.assign({},stats);
    this.bonus={};
    this.abilityKeys=abilityKeys.slice(); this.side=side;
    this.statuses=[]; this.shield=0; this.cd={}; this.res=opt.res||{};
    this.sprite=opt.sprite||"goblin"; this.color=opt.color||"#c06bff";
    this.tint=opt.tint||null; this.isSummon=!!opt.isSummon;
    this.isBoss=!!opt.isBoss; this.level=opt.level||1;
    this.isPlayerChar=false; this.autoAI=false; this.defending=false;
    this.maxHp=this.base.hp; this.maxMp=this.base.mp; this.hp=this.maxHp; this.mp=this.maxMp;
    this.x=0; this.y=0; this.bob=Math.random()*6; this.flash=0; this.ox=0; this.fade=1; this.dead=false;
  }
  get alive(){ return this.hp>0; }
  getAbilityKeys(){ return this.abilityKeys; }
  eff(stat){
    let v=(this.base[stat]||0)+(this.bonus[stat]||0);
    for(const s of this.statuses){ const d=STATUSES[s.key]; if(d.mods){ const m=d.mods(s.pot); if(m[stat]) v+=m[stat]; } }
    if(this.defending && (stat==="def"||stat==="res")) v+=v*0.5;
    return Math.max(0,v);
  }
  effCrit(){ return clamp((this.base.crit||0)+(this.bonus.crit||0),0,.95); }
  takeDamage(raw, elem, ignoreDef){
    const defStat=MAGIC_ELEMS[elem]?"res":"def";
    const def=this.eff(defStat)*(1-(ignoreDef||0));
    let dmg=raw*(100/(100+def));
    dmg*=(this.res[elem]!=null?this.res[elem]:1);
    dmg=variance(Math.max(1,dmg));
    let crit=false;
    if(this._critPending){ crit=true; dmg=Math.round(dmg*1.6); this._critPending=false; }
    if(this.shield>0){ const a=Math.min(this.shield,dmg); this.shield-=a; dmg-=a; }
    this.hp=Math.max(0,this.hp-dmg);
    return {dmg,crit};
  }
  takePure(amt){ amt=Math.max(0,Math.round(amt)); this.hp=Math.max(0,this.hp-amt); return amt; }
  heal(amt){ amt=Math.max(0,Math.round(amt)); const b=this.hp; this.hp=Math.min(this.maxHp,this.hp+amt); return this.hp-b; }
  hasStatus(k){ return this.statuses.find(s=>s.key===k); }
  addStatus(key,dur,pot){ const ex=this.hasStatus(key);
    if(ex){ ex.dur=Math.max(ex.dur,dur); ex.pot=Math.max(ex.pot,pot); }
    else{ this.statuses.push({key,dur,pot:pot||0}); if(key==="shield") this.shield+=pot; } }
  removeStatus(key){ const i=this.statuses.findIndex(s=>s.key===key);
    if(i>=0){ if(key==="shield") this.shield=Math.max(0,this.shield-this.statuses[i].pot); this.statuses.splice(i,1); } }
  isStunned(){ return this.statuses.some(s=>STATUSES[s.key].blocks); }
  usable(){ return this.getAbilityKeys().map(k=>({key:k,ab:ABILITIES[k]}))
    .filter(o=>o.ab && this.mp>=o.ab.mp && (this.cd[o.key]||0)<=0); }
}

class Player extends Entity{
  constructor(name, cls){
    super(name, Object.assign({},cls.base), ["strike"], "party",
      {res:Object.assign({},cls.res), color:cls.color, sprite:cls.sprite||cls.key});
    this.cls=cls; this.isPlayerChar=true;
    this.level=1; this.xp=0; this.xpNext=Player.curve(1);
    this.gold=50; this.inv={}; this.gearInv={};
    this.equip={weapon:null, armor:null, accessory:null};
    this.schoolRanks=Object.assign({}, cls.startRanks);
    this.skillPoints=0; this.attrPoints=0;
    this.recalc();
  }
  static curve(l){ return Math.floor(40 + l*l*18); }

  schoolBonus(){ const acc={}; for(const k in this.schoolRanks){ const sc=SCHOOLS[k]; if(!sc) continue;
      const r=this.schoolRanks[k]; for(const m in sc.per_rank) addMods(acc,{[m]:sc.per_rank[m]*r}); } return acc; }
  gearList(){ return Object.values(this.equip).filter(Boolean).map(k=>GEAR[k]); }
  recalc(){
    const acc={}; addMods(acc, this.schoolBonus());
    for(const g of this.gearList()) addMods(acc, g.mods);
    this.bonus=acc;
    this.maxHp=this.base.hp+(acc.hp||0); this.maxMp=this.base.mp+(acc.mp||0);
    this.hp=Math.min(this.hp,this.maxHp); this.mp=Math.min(this.mp,this.maxMp);
    this.abilityKeys=this.knownAbilities();
  }
  knownAbilities(){
    const out=["strike"];
    for(const k in ABILITIES){ const a=ABILITIES[k]; if(a.school==="_") continue;
      if((this.schoolRanks[a.school]||0)>=a.req) out.push(k); }
    return out;
  }
  knows(key){ const a=ABILITIES[key]; if(!a) return false; if(a.school==="_") return true;
    return (this.schoolRanks[a.school]||0)>=a.req; }

  spendSkill(school){ if(this.skillPoints<=0) return false;
    if((this.schoolRanks[school]||0)>=MAX_RANK) return false;
    this.schoolRanks[school]=(this.schoolRanks[school]||0)+1; this.skillPoints--; this.recalc(); return true; }
  spendAttr(stat){ if(this.attrPoints<=0||!ATTR[stat]) return false;
    this.base[stat]+=ATTR[stat]; if(stat==="hp") this.hp+=ATTR[stat]; if(stat==="mp") this.mp+=ATTR[stat];
    this.attrPoints--; this.recalc(); return true; }

  addItem(k,n){ this.inv[k]=(this.inv[k]||0)+(n||1); }
  addGear(k,n){ this.gearInv[k]=(this.gearInv[k]||0)+(n||1); }
  equipItem(key){ const g=GEAR[key]; if(!g||!(this.gearInv[key]>0)) return false;
    const slot=g.slot; const cur=this.equip[slot]; if(cur) this.addGear(cur,1);
    this.equip[slot]=key; this.gearInv[key]--; if(this.gearInv[key]<=0) delete this.gearInv[key];
    this.recalc(); return true; }
  unequip(slot){ const cur=this.equip[slot]; if(!cur) return; this.addGear(cur,1); this.equip[slot]=null; this.recalc(); }

  gainXp(n){ const msgs=["Gained "+n+" XP."]; this.xp+=n;
    while(this.xp>=this.xpNext){ this.xp-=this.xpNext; msgs.push(...this.levelUp()); } return msgs; }
  levelUp(){ this.level++; this.xpNext=Player.curve(this.level);
    this.skillPoints+=SKILL_PER_LEVEL; this.attrPoints+=ATTR_PER_LEVEL; this.recalc();
    this.hp=this.maxHp; this.mp=this.maxMp;
    return ["★ LEVEL UP! "+this.name+" is now level "+this.level+"!",
            "You have "+this.skillPoints+" Skill Points & "+this.attrPoints+" Attribute Points to spend."]; }
  fullRestore(){ this.hp=this.maxHp; this.mp=this.maxMp; this.statuses=[]; this.shield=0; this.cd={}; this.defending=false; }
}

// auto-build an ally up to a level using its origin's build plan
function makeAlly(originKey, level){
  const p=new Player(CLASSES[originKey].name, CLASSES[originKey]);
  const plan=ALLY_BUILD[originKey]||{schools:["blade"],stat:["atk"]};
  let si=0, ai=0; const allSchools=Object.keys(SCHOOLS);
  for(let l=2;l<=level;l++) p.levelUp();
  // spend all points: prefer the build plan, overflow into any open school
  while(p.skillPoints>0){ let placed=false;
    for(let tries=0;tries<plan.schools.length && !placed;tries++){ if(p.spendSkill(plan.schools[(si++)%plan.schools.length])) placed=true; }
    if(!placed){ for(const sc of allSchools){ if(p.spendSkill(sc)){ placed=true; break; } } }
    if(!placed) break; }
  while(p.attrPoints>0){ const st=plan.stat[(ai++)%plan.stat.length]; if(!p.spendAttr(st)) break; }
  p.fullRestore();
  return p;
}

function makeEnemy(key, level){
  const d=ENEMIES[key];
  const stats=scaleStats(d.base, d.grow||DEF_GROW, level);
  const e=new Entity(d.name, stats, d.ab.filter(a=>ABILITIES[a]), "enemy",
    {res:d.res||{}, sprite:d.sprite, tint:d.tint, isBoss:d.boss, level});
  e.xpReward=Math.round(d.xp*(1+0.35*(level-1)));
  e.goldReward=Math.round(d.gold*(1+0.3*(level-1)));
  e.drops=d.drops||[]; e.tkey=key;
  return e;
}
function makeSummon(kind, level){
  const d=SUMMONS[kind];
  const stats=scaleStats(d.base, d.grow, level);
  const e=new Entity(d.name, stats, d.ab.slice(), "party",
    {res:d.res||{}, sprite:d.sprite, tint:d.tint, isSummon:true, level});
  return e;
}
function rollDrops(enemy){ const out=[];
  for(const d of (enemy.drops||[])){ if(Math.random()<d.chance) out.push(d.key); } return out; }

// ---- ability resolution ----------------------------------------------------
function applyAbility(user, key, targets, battle, free){
  const ab=ABILITIES[key]; if(!ab) return;
  if(!free){ user.mp=Math.max(0,user.mp-ab.mp); if(ab.cd) user.cd[key]=ab.cd+1; }
  for(const fx of ab.fx){
    if(fx.t==="summon"){ const s=makeSummon(fx.kind, user.level||1); battle.addSummon(s);
      battle.log(user.name+" summons "+s.name+"!"); continue; }
    for(const tgt of targets){ if(tgt) applyFx(user,tgt,fx,ab,battle); }
  }
}
function applyFx(user, tgt, fx, ab, battle){
  switch(fx.t){
    case "dmg":{ const hits=fx.hits||1;
      for(let h=0;h<hits;h++){ if(!tgt.alive) break;
        const raw=fx.power + user.eff(fx.scale)*fx.ratio;
        tgt._critPending=chance(user.effCrit()); const crit=tgt._critPending;
        const r=tgt.takeDamage(raw, fx.elem, fx.ignoreDef);
        battle.onHit(tgt, r.dmg, fx.elem, r.crit, ab);
        if(fx.lifesteal && r.dmg>0){ const h2=user.heal(Math.round(r.dmg*fx.lifesteal)); if(h2) battle.onHeal(user,h2); } }
      if(!tgt.alive) battle.onDeath(tgt); break; }
    case "heal":{ const wasDead=!tgt.alive; const amt=variance(fx.power+user.eff(fx.scale)*fx.ratio);
      const h=tgt.heal(amt); if(h){ battle.onHeal(tgt,h); if(wasDead){ tgt.dead=false; battle.log(tgt.name+" is restored to life!"); } } break; }
    case "inflict":{ if(!tgt.alive) break;
      if(!chance(fx.prob==null?1:fx.prob)){ battle.log(tgt.name+" resists "+STATUSES[fx.status].name+"."); break; }
      tgt.addStatus(fx.status, fx.dur, fx.pot||0); battle.log(tgt.name+" is afflicted with "+STATUSES[fx.status].name+".");
      battle.onStatus(tgt, fx.status); break; }
    case "cleanse":{ const neg=["poison","burn","bleed","stun","freeze","atkDown","defDown","slow"];
      let n=0; for(const k of neg){ if(tgt.hasStatus(k)){ tgt.removeStatus(k); n++; } } if(n) battle.log(tgt.name+" is cleansed ("+n+")."); break; }
    case "mp":{ tgt.mp=Math.min(tgt.maxMp,tgt.mp+fx.amount); battle.log(tgt.name+" recovers "+fx.amount+" MP."); break; }
  }
}

function tickStatusStart(e, battle){
  for(const s of e.statuses.slice()){ const d=STATUSES[s.key];
    if(d.dot){ const dmg=variance(s.pot); e.takePure(dmg);
      battle.onHit(e,dmg,(s.key==="poison"?"Poison":(s.key==="burn"?"Fire":"Physical")),false,null);
      battle.log(e.name+" takes "+dmg+" "+d.name+" damage."); if(!e.alive){ battle.onDeath(e); break; } }
    if(d.hot){ const h=e.heal(variance(s.pot)); if(h){ battle.onHeal(e,h); battle.log(e.name+" regenerates "+h+" HP."); } } }
}
function tickStatusEnd(e, battle){
  for(const s of e.statuses.slice()){ s.dur--; if(s.dur<=0){ if(s.key==="shield") e.shield=Math.max(0,e.shield-s.pot);
    e.statuses.splice(e.statuses.indexOf(s),1); battle.log(e.name+"'s "+STATUSES[s.key].name+" wears off."); } }
  for(const k in e.cd) e.cd[k]=Math.max(0,e.cd[k]-1);
}

function aiChoose(e, battle){
  const enemies=battle.living(e.side==="party"?"enemy":"party");
  const allies=battle.living(e.side);
  if(!enemies.length) return null;
  const usable=e.usable();
  const off=usable.filter(o=>o.ab.target==="one_enemy"||o.ab.target==="all_enemies");
  const self=usable.filter(o=>o.ab.target==="self");
  const heal=usable.filter(o=>o.ab.target==="one_ally"||o.ab.target==="all_allies");
  const hurt=allies.some(a=>a.hp/a.maxHp<0.4);
  let choice; const r=Math.random();
  if(heal.length && hurt && r<0.7) choice=pick(heal);
  else if(off.length && r<0.72) choice=pick(off);
  else if(self.length && r<0.85) choice=pick(self);
  else choice={key:"strike", ab:ABILITIES.strike};
  const ab=choice.ab; let targets;
  if(ab.target==="one_enemy") targets=[ Math.random()<0.5 ? enemies.reduce((a,b)=>a.hp<b.hp?a:b) : pick(enemies) ];
  else if(ab.target==="all_enemies") targets=enemies;
  else if(ab.target==="all_allies") targets=allies;
  else if(ab.target==="one_ally") targets=[allies.reduce((a,b)=>(a.hp/a.maxHp)<(b.hp/b.maxHp)?a:b)];
  else targets=[e];
  return {key:choice.key, targets};
}
