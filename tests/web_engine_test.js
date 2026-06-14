"use strict";
// Headless test of the browser game's logic layer (build system, gear, party).
const fs=require("fs"), path=require("path"), vm=require("vm");
const base=path.join(__dirname,"..","web","js");
const src=["utils.js","data.js","engine.js","save.js"]
  .map(f=>fs.readFileSync(path.join(base,f),"utf8")).join("\n");
const _store={};
const localStorage={getItem:k=>_store[k]||null,setItem:(k,v)=>{_store[k]=v;},removeItem:k=>{delete _store[k];}};
const ctx={Math,JSON,console,localStorage}; vm.createContext(ctx);
vm.runInContext(src+"\nthis.__api={Player,makeEnemy,makeSummon,makeAlly,applyAbility,tickStatusStart,tickStatusEnd,aiChoose,rollDrops,ABILITIES,CLASSES,SCHOOLS,GEAR,ITEMS,ENEMIES,SUMMONS,MAX_RANK,playerToObj,objToPlayer,saveGame,loadGame,hasSave};",ctx);
const A=ctx.__api;
let pass=0,fail=0;
function ok(n,c){ if(c){pass++;console.log("PASS  "+n);} else {fail++;console.log("FAIL  "+n);} }
function mockBattle(party,enemies){ return {party,enemies,
  side(s){return s==="party"?this.party:this.enemies;},
  living(s){return this.side(s).filter(e=>e.alive);},
  addSummon(e){this.party.push(e);},
  log(){},onHit(){},onHeal(){},onDeath(){},onStatus(){}}; }

// 1. content integrity
(function(){ let bad=[];
  const slots={weapon:1,armor:1,accessory:1};
  for(const k in A.CLASSES) for(const sc in A.CLASSES[k].startRanks) if(!A.SCHOOLS[sc]) bad.push("class "+k+" school "+sc);
  for(const k in A.ABILITIES){ const a=A.ABILITIES[k]; if(a.school!=="_"&&!A.SCHOOLS[a.school]) bad.push("ability "+k+" school "+a.school); }
  for(const k in A.ENEMIES){ A.ENEMIES[k].ab.forEach(a=>{ if(!A.ABILITIES[a]) bad.push("enemy "+k+" ab "+a); });
    (A.ENEMIES[k].drops||[]).forEach(d=>{ if(!A.GEAR[d.key]) bad.push("enemy "+k+" drop "+d.key); }); }
  for(const k in A.SUMMONS) A.SUMMONS[k].ab.forEach(a=>{ if(!A.ABILITIES[a]) bad.push("summon "+k+" ab "+a); });
  for(const k in A.GEAR) if(!slots[A.GEAR[k].slot]) bad.push("gear "+k+" slot");
  for(const k in A.ITEMS) if(A.ITEMS[k].kind==="scroll"&&!A.ABILITIES[A.ITEMS[k].ability]) bad.push("scroll "+k);
  ok("content integrity ("+(bad.join(";")||"clean")+")", bad.length===0);
  ok("six origins, ten schools", Object.keys(A.CLASSES).length===6 && Object.keys(A.SCHOOLS).length===10);
})();

// 2. leveling grants points (no auto-unlock)
(function(){ const p=new A.Player("T",A.CLASSES.overlord);
  p.levelUp(); ok("level up grants 3 skill + 3 attr", p.skillPoints===3 && p.attrPoints===3);
})();

// 3. spending skill points unlocks abilities by school rank
(function(){ const p=new A.Player("T",A.CLASSES.overlord);
  ok("start knows magic_arrow (arcane1)", p.knows("magic_arrow"));
  ok("start does NOT know create_undead (necro 2 < req3)", !p.knows("create_undead"));
  p.skillPoints=1; p.spendSkill("necromancy"); // necro 2 -> 3
  ok("necromancy rank 3 unlocks create_undead", p.knows("create_undead"));
  ok("still locked: goal_of_death (rank3 < req5)", !p.knows("goal_of_death"));
})();

// 4. school passive raises a stat
(function(){ const p=new A.Player("T",A.CLASSES.overlord); const m0=p.eff("mag");
  p.skillPoints=2; p.spendSkill("necromancy"); p.spendSkill("arcane");
  ok("school ranks raise MAG", p.eff("mag")>m0);
})();

// 5. gear equip changes stats & max HP
(function(){ const p=new A.Player("T",A.CLASSES.vampire); const atk0=p.eff("atk"), hp0=p.maxHp;
  p.addGear("war_axe",1); p.equipItem("war_axe");
  ok("weapon raises ATK", p.eff("atk")===atk0+20);
  p.addGear("plate_armor",1); p.equipItem("plate_armor");
  ok("armor raises max HP", p.maxHp===hp0+80);
})();

// 6. attribute point raises base stat
(function(){ const p=new A.Player("T",A.CLASSES.frost); const a0=p.base.atk;
  p.attrPoints=1; p.spendAttr("atk"); ok("attribute point raises ATK", p.base.atk===a0+3);
})();

// 7. scrolls cast spells without the school (free, no MP)
(function(){ const p=new A.Player("V",A.CLASSES.vampire); // no necromancy
  ok("vampire cannot create undead normally", !p.knows("create_undead"));
  const b=mockBattle([p],[A.makeEnemy("goblin",1)]); const mp0=p.mp;
  A.applyAbility(p,"create_undead",[p],b,true /*free*/);
  ok("scroll summon adds ally", b.party.length===2 && b.party[1].isSummon);
  ok("free cast spends no MP", p.mp===mp0);
})();

// 8. resistances
(function(){ const s=A.makeEnemy("skeleton",3); const holy=s.takeDamage(100,"Holy",0);
  const s2=A.makeEnemy("skeleton",3); const pois=s2.takeDamage(100,"Poison",0);
  ok("holy hurts skeleton", holy.dmg>0); ok("poison immune floors to 1", pois.dmg===1);
})();

// 9. status DoT ticks & expires
(function(){ const g=A.makeEnemy("goblin",1); const b=mockBattle([],[g]); g.addStatus("poison",3,10);
  const before=g.hp; A.tickStatusStart(g,b); ok("poison damages", g.hp<before);
  A.tickStatusEnd(g,b); ok("duration decrements", g.statuses[0].dur===2);
})();

// 10. makeAlly auto-builds a functional character
(function(){ const a=A.makeAlly("overlord",6);
  ok("ally at requested level", a.level===6);
  ok("ally spent its skill points", a.skillPoints===0);
  ok("ally learned school abilities", a.getAbilityKeys().length>1);
  ok("ally is alive & full", a.alive && a.hp===a.maxHp);
})();

// 11. save round-trip preserves build & gear
(function(){ const p=new A.Player("Saver",A.CLASSES.ranger);
  p.levelUp(); p.spendSkill("archery"); p.spendAttr("atk");
  p.addGear("elven_bow",1); p.equipItem("elven_bow");
  const atk=p.eff("atk"), rank=p.schoolRanks.archery, lvl=p.level;
  const p2=A.objToPlayer(A.playerToObj(p));
  ok("save preserves level", p2.level===lvl);
  ok("save preserves school rank", p2.schoolRanks.archery===rank);
  ok("save preserves equipped gear", p2.equip.weapon==="elven_bow");
  ok("save preserves derived ATK", p2.eff("atk")===atk);
})();

// 12. every origin (auto-built to L6) wins a basic fight
(function(){ for(const key in A.CLASSES){
  const p=A.makeAlly(key,6); const enemy=A.makeEnemy("goblin",2); const b=mockBattle([p],[enemy]);
  let guard=0, won=false;
  while(guard++<300){ if(!enemy.alive){won=true;break;}
    const off=p.usable().filter(o=>o.ab.target==="one_enemy"||o.ab.target==="all_enemies");
    const c=off.length?off.reduce((a,x)=>x.ab.mp>a.ab.mp?x:a):{key:"strike"};
    A.applyAbility(p,c.key,[enemy],b); A.tickStatusEnd(p,b);
    if(!enemy.alive){won=true;break;}
    A.tickStatusStart(enemy,b); if(enemy.alive){ const a=A.aiChoose(enemy,b); if(a) A.applyAbility(enemy,a.key,a.targets,b); }
    A.tickStatusEnd(enemy,b); if(!p.alive) break; }
  ok(key+" wins basic fight", won);
} })();

// 13. full saveGame/loadGame round-trip preserves party + account.gearInv
(function(){ const h=new A.Player("Lead",A.CLASSES.overlord); h.levelUp(); h.spendSkill("necromancy");
  const ally=A.makeAlly("vampire",4);
  const party=[h,ally];
  const account={gold:777, inv:{potion:3}, gearInv:{war_axe:2, mage_robe:1}};
  const progress={chapter:2, wins:1, completed:false};
  A.saveGame(party, progress, account);
  ok("hasSave true after save", A.hasSave());
  const l=A.loadGame();
  ok("loads two party members", l.party.length===2);
  ok("preserves gold", l.account.gold===777);
  ok("preserves consumables", l.account.inv.potion===3);
  ok("preserves gear pool (the bug)", l.account.gearInv.war_axe===2 && l.account.gearInv.mage_robe===1);
  ok("preserves progress", l.progress.chapter===2 && l.progress.wins===1);
  ok("ally rebuilt with its level", l.party[1].level===4);
})();

console.log("\n"+pass+"/"+(pass+fail)+" checks passed"); process.exit(fail?1:0);
