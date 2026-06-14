"use strict";
// ---- localStorage save/load ----
const SAVE_KEY = "overlord_rpg_save_v1";

function saveGame(player, progress){
  const data={
    player:{name:player.name, cls:player.cls.key, level:player.level, xp:player.xp,
      xpNext:player.xpNext, gold:player.gold, hp:player.hp, mp:player.mp,
      base:player.base, abilityKeys:player.abilityKeys, inv:player.inv},
    progress:progress
  };
  try{ localStorage.setItem(SAVE_KEY, JSON.stringify(data)); return true; }
  catch(e){ return false; }
}
function hasSave(){ try{ return !!localStorage.getItem(SAVE_KEY); }catch(e){ return false; } }
function loadGame(){
  try{
    const data=JSON.parse(localStorage.getItem(SAVE_KEY)); if(!data) return null;
    const p=new Player(data.player.name, CLASSES[data.player.cls]);
    const d=data.player;
    p.level=d.level; p.xp=d.xp; p.xpNext=d.xpNext; p.gold=d.gold;
    p.base=Object.assign({},d.base); p.maxHp=p.base.hp; p.maxMp=p.base.mp;
    p.hp=d.hp; p.mp=d.mp; p.abilityKeys=d.abilityKeys.slice(); p.inv=Object.assign({},d.inv);
    p.unlocked=new Set(d.abilityKeys);
    return {player:p, progress:data.progress};
  }catch(e){ return null; }
}
function deleteSave(){ try{ localStorage.removeItem(SAVE_KEY); }catch(e){} }
