"use strict";
// Headless test of the browser game's logic layer (no DOM/canvas needed).
// Loads utils.js + data.js + engine.js into one scope and exercises combat.
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const base = path.join(__dirname, "..", "web", "js");
const src = ["utils.js", "data.js", "engine.js"]
  .map(f => fs.readFileSync(path.join(base, f), "utf8")).join("\n");

const ctx = { Math, JSON, console };
vm.createContext(ctx);
vm.runInContext(src + "\nthis.__api={Player,makeEnemy,makeSummon,applyAbility,tickStatusStart,tickStatusEnd,aiChoose,ABILITIES,CLASSES,ENEMIES,SUMMONS,STATUSES};", ctx);
const API = ctx.__api;

let pass = 0, fail = 0;
function ok(name, cond){ if(cond){ pass++; console.log("PASS  "+name); } else { fail++; console.log("FAIL  "+name); } }

// mock battle providing the hooks the engine calls
function mockBattle(party, enemies){
  return {
    party, enemies, heroLevel: 5,
    side(s){ return s==="party"?this.party:this.enemies; },
    living(s){ return this.side(s).filter(e=>e.alive); },
    addSummon(e){ this.party.push(e); },
    log(){}, onHit(){}, onHeal(){}, onDeath(){}, onStatus(){},
  };
}

// 1. content integrity: every referenced ability key exists
(function(){
  let bad=[];
  for(const k in API.CLASSES){ const c=API.CLASSES[k];
    c.start.forEach(a=>{ if(!API.ABILITIES[a]) bad.push(k+":"+a); });
    Object.values(c.unlocks).forEach(arr=>arr.forEach(a=>{ if(!API.ABILITIES[a]) bad.push(k+":"+a); }));
  }
  for(const k in API.ENEMIES){ API.ENEMIES[k].ab.forEach(a=>{ if(!API.ABILITIES[a]) bad.push(k+":"+a); }); }
  for(const k in API.SUMMONS){ API.SUMMONS[k].ab.forEach(a=>{ if(!API.ABILITIES[a]) bad.push(k+":"+a); }); }
  ok("all ability references valid ("+(bad.join(",")||"none")+")", bad.length===0);
  ok("six playable classes", Object.keys(API.CLASSES).length===6);
})();

// 2. leveling unlocks + stat growth
(function(){
  const p=new API.Player("T", API.CLASSES.overlord);
  const hp0=p.maxHp, ab0=p.abilityKeys.length;
  for(let i=0;i<12;i++) p.gainXp(p.xpNext);
  ok("overlord reaches L13+", p.level>=13);
  ok("hp grew on level up", p.maxHp>hp0);
  ok("learned new abilities", p.abilityKeys.length>ab0);
  ok("super-tier unlocked", p.abilityKeys.includes("goal_of_death"));
})();

// 3. resistance math (skeleton: Holy x1.6 weak, Poison x0 immune)
(function(){
  const s=API.makeEnemy("skeleton",3);
  const holy=s.takeDamage(100,"Holy",0);
  const s2=API.makeEnemy("skeleton",3);
  const pois=s2.takeDamage(100,"Poison",0);
  ok("holy damage applies (>0)", holy.dmg>0);
  ok("poison immunity floors at 1", pois.dmg===1);
})();

// 4. status DoT ticks reduce HP and expire
(function(){
  const g=API.makeEnemy("goblin",1); const b=mockBattle([],[g]);
  g.addStatus("poison",3,10,b);
  const before=g.hp; API.tickStatusStart(g,b);
  ok("poison DoT damages", g.hp<before);
  API.tickStatusEnd(g,b);
  ok("status duration decrements", g.statuses[0].dur===2);
})();

// 5. summon joins party
(function(){
  const p=new API.Player("Ainz", API.CLASSES.overlord);
  for(let i=0;i<3;i++) p.levelUp(); // L4 -> create_undead
  const b=mockBattle([p],[API.makeEnemy("troll",4)]);
  ok("create_undead unlocked at L4", p.abilityKeys.includes("create_undead"));
  API.applyAbility(p,"create_undead",[p],b);
  ok("summon added to party", b.party.length===2 && b.party[1].isSummon);
})();

// 6. full auto-battle: each class beats a single same-ish enemy with a level lead
(function(){
  for(const key in API.CLASSES){
    const p=new API.Player("Hero", API.CLASSES[key]);
    for(let i=0;i<5;i++) p.levelUp();
    const enemy=API.makeEnemy("goblin",2);
    const b=mockBattle([p],[enemy]);
    let guard=0, won=false;
    while(guard++<200){
      if(!enemy.alive){ won=true; break; }
      // hero acts: strongest offensive usable, else strike
      const off=p.usable().filter(o=>o.ab.target==="one_enemy"||o.ab.target==="all_enemies");
      const choice = off.length? off.reduce((a,x)=>x.ab.mp>a.ab.mp?x:a) : {key:"strike"};
      const tg = API.ABILITIES[choice.key].target==="all_enemies"?[enemy]:[enemy];
      API.applyAbility(p, choice.key, tg, b);
      API.tickStatusEnd(p,b);
      if(!enemy.alive) { won=true; break; }
      // enemy acts
      API.tickStatusStart(enemy,b);
      if(enemy.alive){ const a=API.aiChoose(enemy,b); if(a) API.applyAbility(enemy,a.key,a.targets,b); }
      API.tickStatusEnd(enemy,b);
      if(!p.alive) break;
    }
    ok(key+" wins basic fight", won);
  }
})();

console.log("\n"+pass+"/"+(pass+fail)+" checks passed");
process.exit(fail?1:0);
