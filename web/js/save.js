"use strict";
// ---- localStorage save/load (party + build system) ----
const SAVE_KEY = "overlord_rpg_save_v2";

function playerToObj(p){
  return {name:p.name, cls:p.cls.key, level:p.level, xp:p.xp, xpNext:p.xpNext,
    hp:p.hp, mp:p.mp, base:p.base, schoolRanks:p.schoolRanks,
    skillPoints:p.skillPoints, attrPoints:p.attrPoints,
    equip:p.equip, gearInv:p.gearInv, autoAI:p.autoAI};
}
function objToPlayer(d){
  const p=new Player(d.name, CLASSES[d.cls]);
  p.level=d.level; p.xp=d.xp; p.xpNext=d.xpNext;
  p.base=Object.assign({},d.base);
  p.schoolRanks=Object.assign({},d.schoolRanks);
  p.skillPoints=d.skillPoints||0; p.attrPoints=d.attrPoints||0;
  p.equip=Object.assign({weapon:null,armor:null,accessory:null}, d.equip||{});
  p.gearInv=Object.assign({}, d.gearInv||{});
  p.autoAI=!!d.autoAI;
  p.recalc(); p.hp=d.hp; p.mp=d.mp;
  return p;
}

function saveGame(party, progress, account){
  const data={ party: party.map(playerToObj), progress:progress,
    account:{gold:account.gold, inv:account.inv, gearInv:account.gearInv||{}} };
  try{ localStorage.setItem(SAVE_KEY, JSON.stringify(data)); return true; }catch(e){ return false; }
}
function hasSave(){ try{ return !!localStorage.getItem(SAVE_KEY); }catch(e){ return false; } }
function loadGame(){
  try{ const data=JSON.parse(localStorage.getItem(SAVE_KEY)); if(!data) return null;
    const party=data.party.map(objToPlayer);
    const acc=data.account||{};
    return {party, progress:data.progress,
      account:{gold:acc.gold||0, inv:acc.inv||{}, gearInv:acc.gearInv||{}}};
  }catch(e){ return null; }
}
function deleteSave(){ try{ localStorage.removeItem(SAVE_KEY); }catch(e){} }
