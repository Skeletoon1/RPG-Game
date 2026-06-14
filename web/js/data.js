"use strict";
// ============================================================================
//  GAME DATA — schools, abilities, origins, gear, items, enemies, campaign
// ============================================================================

// ---- Schools of magic & martial disciplines --------------------------------
// You invest Skill Points into schools; abilities unlock when your rank meets
// the ability's `req`. Each rank also grants a small passive bonus (per_rank).
const SCHOOLS = {
  arcane:    {name:"Arcane",     elem:"Arcane",    color:"#7aa6ff", per_rank:{mag:2,mp:6},
              desc:"Raw magical force and mana mastery."},
  necromancy:{name:"Necromancy", elem:"Dark",      color:"#c06bff", per_rank:{mag:2,maxhp:6},
              desc:"Death magic, decay, and the raising of undead servants."},
  pyromancy: {name:"Pyromancy",  elem:"Fire",      color:"#ff7a3c", per_rank:{mag:2,atk:1},
              desc:"Hellfire and burning destruction."},
  cryomancy: {name:"Cryomancy",  elem:"Ice",       color:"#7fe9ff", per_rank:{mag:2,res:1},
              desc:"Ice, frost, and freezing control."},
  storm:     {name:"Storm",      elem:"Lightning", color:"#ffe14d", per_rank:{mag:2,spd:1},
              desc:"Lightning and the fury of the sky."},
  faith:     {name:"Faith",      elem:"Holy",      color:"#fff2b0", per_rank:{mag:2,res:1},
              desc:"Healing, protection, and holy light."},
  blade:     {name:"Blade",      elem:"Physical",  color:"#ff9a8a", per_rank:{atk:2,maxhp:4},
              desc:"Martial mastery of melee weapons."},
  archery:   {name:"Archery",    elem:"Physical",  color:"#7dff6b", per_rank:{atk:2,spd:1},
              desc:"Ranged precision, poisons, and beast taming."},
  guard:     {name:"Guard",      elem:"Physical",  color:"#8ab6ff", per_rank:{def:2,res:1},
              desc:"Defense, shields, and endurance."},
  blood:     {name:"Blood",      elem:"Dark",      color:"#ff5a6e", per_rank:{atk:2,crit:.005},
              desc:"Lifesteal, frenzy, and vampiric power."},
};
const MAX_RANK = 5;

// ---- Abilities -------------------------------------------------------------
// each: school, req(rank), mp, target, cd, tier, elem, desc, fx[]
// fx types: dmg{power,scale,ratio,elem,ignoreDef?,lifesteal?,hits?} | heal{power,scale,ratio}
//           inflict{status,dur,pot?,prob?} | cleanse | summon{kind} | mp{amount}
const ABILITIES = {
  strike:{name:"Strike", school:"_", req:0, mp:0, target:"one_enemy", cd:0, tier:"martial", elem:"Physical",
    desc:"A basic attack. No MP, always available.", fx:[{t:"dmg",power:8,scale:"atk",ratio:1,elem:"Physical"}]},

  // ===== ARCANE =====
  magic_arrow:{name:"Magic Arrow", school:"arcane", req:1, mp:4, target:"one_enemy", cd:0, tier:"spell", elem:"Arcane",
    desc:"Three bolts of pure magic.", fx:[{t:"dmg",power:7,scale:"mag",ratio:.7,elem:"Arcane",hits:3}]},
  mana_essence:{name:"Mana Essence", school:"arcane", req:2, mp:0, target:"self", cd:3, tier:"spell", elem:"Arcane",
    desc:"Channel ambient mana, restoring 40 MP.", fx:[{t:"mp",amount:40}]},
  arcane_lance:{name:"Arcane Lance", school:"arcane", req:3, mp:18, target:"one_enemy", cd:1, tier:"spell", elem:"Arcane",
    desc:"A piercing lance of force that partly ignores resistance.", fx:[{t:"dmg",power:38,scale:"mag",ratio:1.3,elem:"Arcane",ignoreDef:.4}]},
  reality_slash:{name:"Reality Slash", school:"arcane", req:5, mp:40, target:"all_enemies", cd:4, tier:"super", elem:"Arcane",
    desc:"SUPER-TIER. Tear space itself across all foes.", fx:[{t:"dmg",power:46,scale:"mag",ratio:1.2,elem:"Arcane",ignoreDef:.3}]},

  // ===== NECROMANCY =====
  negative_burst:{name:"Negative Burst", school:"necromancy", req:1, mp:14, target:"all_enemies", cd:1, tier:"spell", elem:"Dark",
    desc:"Negative energy withers all foes.", fx:[{t:"dmg",power:18,scale:"mag",ratio:.9,elem:"Dark"}]},
  grasp_heart:{name:"Grasp Heart", school:"necromancy", req:2, mp:22, target:"one_enemy", cd:2, tier:"spell", elem:"Dark",
    desc:"Crush a heart. Pierces defense; may bleed.",
    fx:[{t:"dmg",power:40,scale:"mag",ratio:1.4,elem:"Dark",ignoreDef:.5},{t:"inflict",status:"bleed",dur:2,pot:10,prob:.6}]},
  create_undead:{name:"Create Greater Undead", school:"necromancy", req:3, mp:18, target:"self", cd:3, tier:"spell", elem:"Dark",
    desc:"Raise a Death Knight to fight for you.", fx:[{t:"summon",kind:"death_knight"}]},
  despair_aura:{name:"Despair Aura", school:"necromancy", req:3, mp:16, target:"all_enemies", cd:3, tier:"spell", elem:"Dark",
    desc:"Sap the strength and guard of all foes.",
    fx:[{t:"inflict",status:"atkDown",dur:3,pot:12,prob:.85},{t:"inflict",status:"defDown",dur:3,pot:12,prob:.85}]},
  iron_maiden:{name:"La Iron Maiden", school:"necromancy", req:4, mp:30, target:"one_enemy", cd:3, tier:"spell", elem:"Dark",
    desc:"Crushing force. Heavy damage, may stun.",
    fx:[{t:"dmg",power:55,scale:"mag",ratio:1.6,elem:"Dark",ignoreDef:.3},{t:"inflict",status:"stun",dur:1,prob:.5}]},
  goal_of_death:{name:"Goal of All Life is Death", school:"necromancy", req:5, mp:60, target:"all_enemies", cd:5, tier:"super", elem:"Dark",
    desc:"SUPER-TIER. Instant death sweeps the field, rotting survivors.",
    fx:[{t:"dmg",power:50,scale:"mag",ratio:1.2,elem:"Dark",ignoreDef:.4},{t:"inflict",status:"poison",dur:3,pot:18,prob:.9}]},

  // ===== PYROMANCY =====
  hellflame:{name:"Hellflame", school:"pyromancy", req:1, mp:5, target:"one_enemy", cd:0, tier:"spell", elem:"Fire",
    desc:"Hellfire jet; often burns.", fx:[{t:"dmg",power:14,scale:"mag",ratio:1,elem:"Fire"},{t:"inflict",status:"burn",dur:2,pot:8,prob:.6}]},
  flames_of_hell:{name:"Flames of Hell", school:"pyromancy", req:2, mp:18, target:"all_enemies", cd:2, tier:"spell", elem:"Fire",
    desc:"Engulf the field in flame.", fx:[{t:"dmg",power:22,scale:"mag",ratio:.95,elem:"Fire"},{t:"inflict",status:"burn",dur:2,pot:10,prob:.7}]},
  hellfire_wall:{name:"Hellfire Wall", school:"pyromancy", req:3, mp:24, target:"one_enemy", cd:2, tier:"spell", elem:"Fire",
    desc:"Towering fire with lasting burns.", fx:[{t:"dmg",power:36,scale:"mag",ratio:1.3,elem:"Fire"},{t:"inflict",status:"burn",dur:3,pot:14,prob:.9}]},
  meteor_fall:{name:"Meteor Fall", school:"pyromancy", req:5, mp:38, target:"all_enemies", cd:4, tier:"super", elem:"Fire",
    desc:"SUPER-TIER. A meteor immolates all foes.", fx:[{t:"dmg",power:50,scale:"mag",ratio:1.3,elem:"Fire"},{t:"inflict",status:"burn",dur:3,pot:16,prob:.85}]},

  // ===== CRYOMANCY =====
  frost_cleave:{name:"Frost Spike", school:"cryomancy", req:1, mp:5, target:"one_enemy", cd:0, tier:"spell", elem:"Ice",
    desc:"An ice spike; may slow.", fx:[{t:"dmg",power:15,scale:"mag",ratio:1,elem:"Ice"},{t:"inflict",status:"slow",dur:2,pot:8,prob:.5}]},
  icy_burst:{name:"Icy Burst", school:"cryomancy", req:2, mp:16, target:"all_enemies", cd:2, tier:"spell", elem:"Ice",
    desc:"Blizzard; foes may freeze.", fx:[{t:"dmg",power:18,scale:"mag",ratio:.9,elem:"Ice"},{t:"inflict",status:"freeze",dur:1,prob:.3}]},
  frozen_grip:{name:"Frozen Grip", school:"cryomancy", req:3, mp:14, target:"one_enemy", cd:3, tier:"spell", elem:"Ice",
    desc:"Damage and likely freeze a foe.", fx:[{t:"dmg",power:24,scale:"mag",ratio:1,elem:"Ice"},{t:"inflict",status:"freeze",dur:2,prob:.65}]},
  glittering_blade:{name:"Glittering Blade of Ice", school:"cryomancy", req:4, mp:20, target:"one_enemy", cd:2, tier:"spell", elem:"Ice",
    desc:"A conjured ice blade; partly ignores armor.", fx:[{t:"dmg",power:48,scale:"mag",ratio:1.4,elem:"Ice",ignoreDef:.25}]},
  absolute_zero:{name:"Absolute Zero Field", school:"cryomancy", req:5, mp:40, target:"all_enemies", cd:4, tier:"super", elem:"Ice",
    desc:"SUPER-TIER. Freeze all foes at absolute zero.", fx:[{t:"dmg",power:42,scale:"mag",ratio:1.1,elem:"Ice"},{t:"inflict",status:"freeze",dur:2,prob:.7}]},

  // ===== STORM =====
  thunderclap:{name:"Thunderclap", school:"storm", req:1, mp:5, target:"one_enemy", cd:0, tier:"spell", elem:"Lightning",
    desc:"A charged jolt; may stun.", fx:[{t:"dmg",power:15,scale:"mag",ratio:1,elem:"Lightning"},{t:"inflict",status:"stun",dur:1,prob:.25}]},
  dragon_lightning:{name:"Dragon Lightning", school:"storm", req:2, mp:16, target:"all_enemies", cd:2, tier:"spell", elem:"Lightning",
    desc:"A serpent of lightning lashes all.", fx:[{t:"dmg",power:20,scale:"mag",ratio:.9,elem:"Lightning"}]},
  thunderbolt:{name:"Thunderbolt", school:"storm", req:3, mp:22, target:"one_enemy", cd:1, tier:"spell", elem:"Lightning",
    desc:"A devastating bolt on one foe; may stun.", fx:[{t:"dmg",power:42,scale:"mag",ratio:1.35,elem:"Lightning"},{t:"inflict",status:"stun",dur:1,prob:.4}]},
  tempest:{name:"Tempest", school:"storm", req:5, mp:40, target:"all_enemies", cd:4, tier:"super", elem:"Lightning",
    desc:"SUPER-TIER. A storm of lightning ravages the field.", fx:[{t:"dmg",power:44,scale:"mag",ratio:1.2,elem:"Lightning"},{t:"inflict",status:"stun",dur:1,prob:.45}]},

  // ===== FAITH =====
  field_dressing:{name:"Field Dressing", school:"faith", req:1, mp:10, target:"one_ally", cd:1, tier:"spell", elem:"Holy",
    desc:"Heal and cleanse an ally.", fx:[{t:"heal",power:35,scale:"mag",ratio:1},{t:"cleanse"}]},
  divine_smite:{name:"Divine Smite", school:"faith", req:2, mp:12, target:"one_enemy", cd:0, tier:"spell", elem:"Holy",
    desc:"Holy light sears a foe (undead beware).", fx:[{t:"dmg",power:20,scale:"mag",ratio:1.1,elem:"Holy"}]},
  battle_standard:{name:"Battle Standard", school:"faith", req:2, mp:16, target:"all_allies", cd:3, tier:"spell", elem:"Holy",
    desc:"Buff attack & defense of the whole party.", fx:[{t:"inflict",status:"atkUp",dur:3,pot:14},{t:"inflict",status:"defUp",dur:3,pot:10}]},
  greater_heal:{name:"Greater Heal", school:"faith", req:3, mp:20, target:"all_allies", cd:3, tier:"spell", elem:"Holy",
    desc:"Restoration mends every ally.", fx:[{t:"heal",power:30,scale:"mag",ratio:.7}]},
  resurrection:{name:"Resurrection", school:"faith", req:4, mp:30, target:"dead_ally", cd:4, tier:"spell", elem:"Holy",
    desc:"Revive a fallen ally with health.", fx:[{t:"heal",power:60,scale:"mag",ratio:1}]},

  // ===== BLADE =====
  power_strike:{name:"Power Strike", school:"blade", req:1, mp:5, target:"one_enemy", cd:0, tier:"martial", elem:"Physical",
    desc:"A heavy, focused blow.", fx:[{t:"dmg",power:18,scale:"atk",ratio:1.25,elem:"Physical"}]},
  whirlwind:{name:"Whirlwind", school:"blade", req:2, mp:14, target:"all_enemies", cd:2, tier:"martial", elem:"Physical",
    desc:"Spin to strike every enemy.", fx:[{t:"dmg",power:16,scale:"atk",ratio:.85,elem:"Physical"}]},
  blade_dance:{name:"Blade Dance", school:"blade", req:3, mp:18, target:"one_enemy", cd:2, tier:"martial", elem:"Physical",
    desc:"Four rapid slashes at one foe.", fx:[{t:"dmg",power:12,scale:"atk",ratio:.75,elem:"Physical",hits:4}]},
  crushing_blow:{name:"Crushing Blow", school:"blade", req:4, mp:22, target:"one_enemy", cd:2, tier:"martial", elem:"Physical",
    desc:"A mighty blow that may stun.", fx:[{t:"dmg",power:50,scale:"atk",ratio:1.5,elem:"Physical",ignoreDef:.2},{t:"inflict",status:"stun",dur:1,prob:.4}]},

  // ===== ARCHERY =====
  twin_shot:{name:"Twin Shot", school:"archery", req:1, mp:4, target:"one_enemy", cd:0, tier:"martial", elem:"Physical",
    desc:"Two quick arrows.", fx:[{t:"dmg",power:9,scale:"atk",ratio:.8,elem:"Physical",hits:2}]},
  venom_arrow:{name:"Venom Arrow", school:"archery", req:1, mp:8, target:"one_enemy", cd:1, tier:"martial", elem:"Poison",
    desc:"Poison-tipped arrow that festers.", fx:[{t:"dmg",power:14,scale:"atk",ratio:.9,elem:"Poison"},{t:"inflict",status:"poison",dur:3,pot:12,prob:.85}]},
  hunters_mark:{name:"Hunter's Mark", school:"archery", req:2, mp:10, target:"one_enemy", cd:2, tier:"martial", elem:"Physical",
    desc:"Sharply lower a target's defense.", fx:[{t:"inflict",status:"defDown",dur:4,pot:20,prob:1}]},
  arrow_storm:{name:"Arrow Storm", school:"archery", req:3, mp:18, target:"all_enemies", cd:2, tier:"martial", elem:"Physical",
    desc:"Rain arrows on every enemy.", fx:[{t:"dmg",power:10,scale:"atk",ratio:.6,elem:"Physical",hits:2}]},
  beast_call:{name:"Beast Call", school:"archery", req:3, mp:16, target:"self", cd:3, tier:"martial", elem:"Physical",
    desc:"Summon a tamed beast.", fx:[{t:"summon",kind:"beast"}]},
  piercing_volley:{name:"Piercing Volley", school:"archery", req:4, mp:22, target:"one_enemy", cd:2, tier:"martial", elem:"Physical",
    desc:"Armor-piercing focused volley.", fx:[{t:"dmg",power:46,scale:"atk",ratio:1.4,elem:"Physical",ignoreDef:.4}]},

  // ===== GUARD =====
  fortress_stance:{name:"Fortress Stance", school:"guard", req:1, mp:10, target:"self", cd:3, tier:"martial", elem:"Physical",
    desc:"Raise defense and gain a shield.", fx:[{t:"inflict",status:"defUp",dur:4,pot:25},{t:"inflict",status:"shield",dur:4,pot:60}]},
  iron_will:{name:"Iron Will", school:"guard", req:2, mp:12, target:"self", cd:3, tier:"martial", elem:"Physical",
    desc:"Cleanse yourself and brace your guard.", fx:[{t:"cleanse"},{t:"inflict",status:"defUp",dur:3,pot:18}]},
  bulwark:{name:"Bulwark", school:"guard", req:3, mp:20, target:"all_allies", cd:3, tier:"martial", elem:"Physical",
    desc:"Shield the entire party.", fx:[{t:"inflict",status:"shield",dur:3,pot:50},{t:"inflict",status:"defUp",dur:3,pot:12}]},
  last_stand:{name:"Last Stand", school:"guard", req:4, mp:24, target:"self", cd:4, tier:"martial", elem:"Physical",
    desc:"Heal greatly and raise all defenses.", fx:[{t:"heal",power:50,scale:"def",ratio:1.5},{t:"inflict",status:"defUp",dur:3,pot:25}]},

  // ===== BLOOD =====
  piercing_lance:{name:"Piercing Lance", school:"blood", req:1, mp:5, target:"one_enemy", cd:0, tier:"martial", elem:"Physical",
    desc:"A lance thrust that drains vitality.", fx:[{t:"dmg",power:16,scale:"atk",ratio:1.1,elem:"Physical",lifesteal:.3}]},
  blood_frenzy:{name:"Blood Frenzy", school:"blood", req:2, mp:12, target:"self", cd:3, tier:"martial", elem:"Physical",
    desc:"Crimson frenzy: raise attack & speed.",
    fx:[{t:"inflict",status:"atkUp",dur:3,pot:18},{t:"inflict",status:"haste",dur:3,pot:15}]},
  crimson_nova:{name:"Crimson Nova", school:"blood", req:3, mp:16, target:"all_enemies", cd:2, tier:"spell", elem:"Dark",
    desc:"Sphere of blood; damages all & heals you.", fx:[{t:"dmg",power:20,scale:"mag",ratio:.8,elem:"Dark",lifesteal:.2}]},
  valkyrie_dance:{name:"Valkyrie's Dance", school:"blood", req:3, mp:18, target:"one_enemy", cd:2, tier:"martial", elem:"Physical",
    desc:"Four lance strikes, each steals life.", fx:[{t:"dmg",power:12,scale:"atk",ratio:.8,elem:"Physical",lifesteal:.25,hits:4}]},
  blood_pool:{name:"Pool of Blood", school:"blood", req:4, mp:14, target:"self", cd:3, tier:"spell", elem:"Dark",
    desc:"Heal greatly and purge afflictions.", fx:[{t:"heal",power:40,scale:"mag",ratio:.8},{t:"cleanse"}]},
  einherjar:{name:"Summon Einherjar", school:"blood", req:5, mp:22, target:"self", cd:4, tier:"spell", elem:"Dark",
    desc:"Call a spectral Valkyrie warrior.", fx:[{t:"summon",kind:"einherjar"}]},
};

// ---- Origins (starting paths — fully open afterwards) -----------------------
// stats: hp,mp,atk,mag,def,res,spd,crit ; startRanks seed a school path.
function S(hp,mp,atk,mag,def,res,spd,crit){return {hp,mp,atk,mag,def,res,spd,crit};}
const CLASSES = {
  overlord:{key:"overlord", name:"Death Sovereign", title:"Death Sovereign",
    color:"#c06bff", style:"Necromancer path", sprite:"overlord",
    desc:"Begins steeped in death magic. (Necromancy + Arcane). Inspired by Ainz Ooal Gown.",
    base:S(120,120,14,38,18,28,18,.05), startRanks:{necromancy:2, arcane:1},
    res:{Dark:.3,Poison:0,Ice:.6,Holy:1.6,Fire:1.2}},
  vampire:{key:"vampire", name:"Crimson Lord", title:"Crimson Lord",
    color:"#ff5a6e", style:"Blood path", sprite:"vampire",
    desc:"A blood-drinker who heals through carnage. (Blood + Blade). Inspired by Shalltear.",
    base:S(140,80,32,22,22,20,32,.12), startRanks:{blood:2, blade:1},
    res:{Dark:.5,Physical:.8,Holy:1.5,Fire:1.3}},
  frost:{key:"frost", name:"Glacial Warden", title:"Glacial Warden",
    color:"#7fe9ff", style:"Cryomancy + Guard", sprite:"frost",
    desc:"A frozen sentinel of ice and iron. (Cryomancy + Guard). Inspired by Cocytus.",
    base:S(170,80,28,28,34,26,20,.07), startRanks:{cryomancy:2, guard:1},
    res:{Ice:0,Physical:.7,Fire:1.5}},
  demon:{key:"demon", name:"Infernal", title:"Infernal",
    color:"#ff7a3c", style:"Pyromancy path", sprite:"demon",
    desc:"Burns the world to ash with hellfire. (Pyromancy + Arcane). Inspired by Demiurge.",
    base:S(125,110,20,36,22,28,26,.10), startRanks:{pyromancy:2, arcane:1},
    res:{Fire:0,Dark:.5,Ice:1.4,Holy:1.5}},
  ranger:{key:"ranger", name:"Wild Warden", title:"Wild Warden",
    color:"#7dff6b", style:"Archery path", sprite:"ranger",
    desc:"A nimble hunter who never misses. (Archery + Blade). Inspired by Aura.",
    base:S(130,85,32,22,20,22,40,.15), startRanks:{archery:2, blade:1},
    res:{Poison:.3,Physical:.9}},
  maid:{key:"maid", name:"Battle Servant", title:"Battle Servant",
    color:"#ffd866", style:"Faith + Storm", sprite:"maid",
    desc:"Healer, buffer, and lightning duelist. (Faith + Storm). Inspired by the Pleiades.",
    base:S(135,100,26,30,24,26,30,.10), startRanks:{faith:2, storm:1},
    res:{Lightning:.4,Holy:.6}},
};

// build priority for auto-leveled allies: ordered schools + stat focus
const ALLY_BUILD = {
  overlord:{schools:["necromancy","arcane","necromancy","necromancy","arcane"], stat:["mag","mp","maxhp"]},
  vampire:{schools:["blood","blade","blood","blood","blade"], stat:["atk","maxhp","spd"]},
  frost:{schools:["cryomancy","guard","cryomancy","guard","cryomancy"], stat:["mag","def","maxhp"]},
  demon:{schools:["pyromancy","arcane","pyromancy","pyromancy","arcane"], stat:["mag","mp","spd"]},
  ranger:{schools:["archery","blade","archery","archery","blade"], stat:["atk","spd","crit"]},
  maid:{schools:["faith","storm","faith","faith","storm"], stat:["mag","mp","maxhp"]},
};

// ---- Equipment -------------------------------------------------------------
// slot: weapon|armor|accessory ; mods add to stats (crit is a fraction)
const GEAR = {
  // weapons
  rusty_blade:{name:"Rusty Blade", slot:"weapon", rarity:1, price:40, mods:{atk:5}},
  iron_blade:{name:"Iron Blade", slot:"weapon", rarity:2, price:120, mods:{atk:11}},
  war_axe:{name:"War Axe", slot:"weapon", rarity:3, price:300, mods:{atk:20,crit:.04}},
  katana:{name:"Nodachi", slot:"weapon", rarity:3, price:320, mods:{atk:18,spd:5,crit:.05}},
  oak_staff:{name:"Oak Staff", slot:"weapon", rarity:1, price:50, mods:{mag:8,mp:12}},
  arcane_staff:{name:"Arcane Staff", slot:"weapon", rarity:3, price:320, mods:{mag:22,mp:24}},
  elven_bow:{name:"Elven Bow", slot:"weapon", rarity:2, price:160, mods:{atk:13,spd:6}},
  world_breaker:{name:"World-Breaker Blade", slot:"weapon", rarity:4, price:900, mods:{atk:32,mag:18,crit:.08}},
  // armor
  leather_armor:{name:"Leather Armor", slot:"armor", rarity:1, price:50, mods:{def:6,maxhp:24}},
  chain_mail:{name:"Chain Mail", slot:"armor", rarity:2, price:150, mods:{def:13,maxhp:44}},
  plate_armor:{name:"Plate Armor", slot:"armor", rarity:3, price:340, mods:{def:24,maxhp:80,spd:-3}},
  mage_robe:{name:"Mage Robe", slot:"armor", rarity:2, price:150, mods:{res:15,mp:30,mag:4}},
  dragon_scale:{name:"Dragon Scale Mail", slot:"armor", rarity:4, price:900, mods:{def:24,res:24,maxhp:120}},
  // accessories
  ring_of_power:{name:"Ring of Power", slot:"accessory", rarity:2, price:180, mods:{atk:7,mag:7}},
  ward_amulet:{name:"Ward Amulet", slot:"accessory", rarity:2, price:170, mods:{res:12,def:6}},
  boots_of_haste:{name:"Boots of Haste", slot:"accessory", rarity:2, price:170, mods:{spd:12}},
  pendant_of_life:{name:"Pendant of Life", slot:"accessory", rarity:3, price:300, mods:{maxhp:70,mp:24}},
  crit_charm:{name:"Assassin's Charm", slot:"accessory", rarity:3, price:300, mods:{crit:.10,spd:5}},
  ring_of_nazarick:{name:"Ring of Nazarick", slot:"accessory", rarity:4, price:1000, mods:{atk:10,mag:10,def:8,res:8,spd:6}},
};
const RARITY_COLOR = {1:"#cfd2dc",2:"#6be36b",3:"#6ba6ff",4:"#e7a3ff"};

// ---- Consumable items (incl. scrolls) --------------------------------------
const ITEMS = {
  potion:{name:"Healing Potion", desc:"Restore 80 HP.", price:30, kind:"heal", amt:80},
  hi_potion:{name:"Greater Potion", desc:"Restore 200 HP.", price:80, kind:"heal", amt:200},
  ether:{name:"Mana Ether", desc:"Restore 60 MP.", price:40, kind:"mp", amt:60},
  hi_ether:{name:"Greater Ether", desc:"Restore 150 MP.", price:100, kind:"mp", amt:150},
  elixir:{name:"World Elixir", desc:"Fully restore HP & MP.", price:250, kind:"full"},
  antidote:{name:"Panacea", desc:"Remove negative effects.", price:25, kind:"cleanse"},
  phoenix:{name:"Phoenix Down", desc:"Revive an ally with 120 HP.", price:150, kind:"revive", amt:120, target:"dead_ally"},
  // scrolls — cast a spell WITHOUT having learned its school
  scroll_undead:{name:"Scroll: Create Undead", desc:"Summon a Death Knight (no school needed).", price:120, kind:"scroll", ability:"create_undead"},
  scroll_meteor:{name:"Scroll: Meteor Fall", desc:"Cast Meteor Fall on all foes.", price:200, kind:"scroll", ability:"meteor_fall"},
  scroll_heal:{name:"Scroll: Greater Heal", desc:"Heal the whole party.", price:90, kind:"scroll", ability:"greater_heal"},
  scroll_res:{name:"Scroll: Resurrection", desc:"Revive a fallen ally.", price:180, kind:"scroll", ability:"resurrection"},
  scroll_grasp:{name:"Scroll: Grasp Heart", desc:"Crush one foe's heart.", price:140, kind:"scroll", ability:"grasp_heart"},
};

// ---- Enemies & summons -----------------------------------------------------
const DEF_GROW = S(14,6,4,4,3,3,2,.003);
const BOSS_GROW = S(30,12,6,6,5,5,3,.004);
const ENEMIES = {
  goblin:{name:"Goblin", sprite:"goblin", base:S(55,10,16,5,8,6,18,.05), ab:["strike"], xp:14, gold:8,
    drops:[{key:"rusty_blade",chance:.08},{key:"leather_armor",chance:.06}]},
  wolf:{name:"Wild Wolf", sprite:"wolf", base:S(48,10,20,5,7,6,30,.05), ab:["strike","twin_shot"], xp:16, gold:6,
    drops:[{key:"boots_of_haste",chance:.04}]},
  hobgoblin:{name:"Hobgoblin", sprite:"goblin", base:S(80,15,24,6,14,8,18,.05), ab:["strike","power_strike"], xp:24, gold:14, tint:"#3a7a3a",
    drops:[{key:"iron_blade",chance:.07},{key:"chain_mail",chance:.06}]},
  skeleton:{name:"Skeleton Warrior", sprite:"skeleton", base:S(70,20,22,8,12,10,16,.05), ab:["strike","magic_arrow"], xp:22, gold:10, res:{Dark:.4,Holy:1.6,Poison:0},
    drops:[{key:"oak_staff",chance:.06},{key:"rusty_blade",chance:.06}]},
  lizardman:{name:"Lizardman Raider", sprite:"lizard", base:S(95,15,26,8,16,10,22,.05), ab:["strike","piercing_lance"], xp:30, gold:16,
    drops:[{key:"iron_blade",chance:.06},{key:"ward_amulet",chance:.05}]},
  ogre:{name:"Ogre", sprite:"ogre", base:S(130,10,32,4,18,8,12,.05), ab:["strike","crushing_blow"], xp:38, gold:22,
    drops:[{key:"war_axe",chance:.05},{key:"plate_armor",chance:.05}]},
  giant_frog:{name:"Razor-Tail Frog", sprite:"frog", base:S(85,20,20,14,10,14,20,.05), ab:["strike","venom_arrow"], xp:26, gold:12, res:{Poison:.2},
    drops:[{key:"leather_armor",chance:.06}]},
  wraith:{name:"Wraith", sprite:"wraith", base:S(78,40,14,26,10,20,26,.05), ab:["strike","negative_burst","hellflame"], xp:34, gold:18, res:{Dark:.3,Physical:.5,Holy:1.7},
    drops:[{key:"mage_robe",chance:.06},{key:"ring_of_power",chance:.04}]},
  troll:{name:"War Troll", sprite:"ogre", base:S(170,15,34,6,22,10,14,.05), ab:["strike","power_strike"], xp:50, gold:30, tint:"#5a7a4a",
    drops:[{key:"war_axe",chance:.06},{key:"plate_armor",chance:.06}]},
  basilisk:{name:"Giant Basilisk", sprite:"lizard", base:S(150,30,30,18,24,16,18,.05), ab:["strike","venom_arrow","icy_burst"], xp:55, gold:34, res:{Poison:0}, tint:"#b0a030",
    drops:[{key:"katana",chance:.06},{key:"ward_amulet",chance:.06}]},
  dark_young:{name:"Dark Young", sprite:"darkyoung", base:S(200,40,36,22,24,18,16,.05), ab:["strike","negative_burst","venom_arrow"], xp:65, gold:40, res:{Dark:.4,Poison:.3,Holy:1.4},
    drops:[{key:"dragon_scale",chance:.04},{key:"pendant_of_life",chance:.06}]},
  vampire_bride:{name:"Vampire Bride", sprite:"vampire", base:S(140,60,30,24,18,20,34,.08), ab:["strike","piercing_lance","crimson_nova"], xp:60, gold:44, res:{Dark:.4,Holy:1.6},
    drops:[{key:"crit_charm",chance:.06},{key:"arcane_staff",chance:.05}]},
  // bosses (guaranteed strong drop)
  hamsuke:{name:"Wise King of the Forest", sprite:"hamster", base:S(320,40,44,10,34,18,22,.06), ab:["strike","power_strike","fortress_stance"], xp:160, gold:120, boss:true, grow:BOSS_GROW,
    drops:[{key:"chain_mail",chance:1},{key:"war_axe",chance:.5}]},
  clementine:{name:"Clementine the Blade", sprite:"clementine", base:S(300,60,52,16,28,22,44,.12), ab:["strike","valkyrie_dance","blood_frenzy","piercing_volley"], xp:200, gold:160, boss:true, grow:BOSS_GROW,
    drops:[{key:"katana",chance:1},{key:"crit_charm",chance:.6}]},
  khajiit:{name:"Khajiit the Necromancer", sprite:"khajiit", base:S(320,140,18,46,24,34,24,.06), ab:["strike","negative_burst","grasp_heart","despair_aura"], xp:220, gold:170, boss:true, grow:BOSS_GROW, res:{Dark:.3,Holy:1.6,Poison:0},
    drops:[{key:"arcane_staff",chance:1},{key:"pendant_of_life",chance:.6}]},
  frost_dragon:{name:"Frost Dragon Lord", sprite:"dragon", base:S(480,120,50,42,40,36,26,.07), ab:["strike","icy_burst","glittering_blade","absolute_zero"], xp:320, gold:260, boss:true, grow:BOSS_GROW, res:{Ice:0,Fire:1.4,Physical:.7},
    drops:[{key:"dragon_scale",chance:1},{key:"world_breaker",chance:.4}]},
  jaldabaoth:{name:"Jaldabaoth, Demon Emperor", sprite:"jalda", base:S(620,200,46,52,38,42,34,.08), ab:["strike","flames_of_hell","hellfire_wall","grasp_heart","meteor_fall"], xp:500, gold:400, boss:true, grow:BOSS_GROW, res:{Fire:0,Dark:.4,Ice:1.3,Holy:1.4},
    drops:[{key:"ring_of_nazarick",chance:1},{key:"world_breaker",chance:.7}]},
};

const SUMMONS = {
  death_knight:{name:"Death Knight", sprite:"deathknight", base:S(120,0,30,0,26,16,16,.05), ab:["strike","power_strike"], grow:S(14,0,4,0,3,2,1,0), res:{Dark:.2,Holy:1.5,Poison:0}},
  einherjar:{name:"Einherjar", sprite:"einherjar", base:S(90,0,28,0,18,16,30,.05), ab:["strike","piercing_lance"], grow:S(10,0,4,0,2,2,2,0)},
  beast:{name:"Sleipnir Beast", sprite:"wolf", base:S(100,0,30,0,16,12,34,.08), ab:["strike","twin_shot"], grow:S(12,0,4,0,2,2,2,0), tint:"#3a3a5a"},
};

// ---- Recruitable allies (for the multi-character party) --------------------
const RECRUITS = {
  overlord:{cost:300}, vampire:{cost:300}, frost:{cost:300},
  demon:{cost:300}, ranger:{cost:300}, maid:{cost:300},
};
const PARTY_MAX = 4;

// ---- Campaign --------------------------------------------------------------
const CHAPTERS = [
  {key:"carne", name:"Chapter 1 — Village of Carne", bg:"village", lvl:1,
    intro:"Knights and goblins raid the frontier village of Carne. Announce your arrival to the New World.",
    pool:["goblin","wolf","skeleton"], boss:"hamsuke", battles:3, size:[1,2],
    outro:"The Wise King of the Forest bows to your power. The frontier is yours."},
  {key:"forest", name:"Chapter 2 — Great Forest of Tob", bg:"forest", lvl:3,
    intro:"Beasts and monsters stir in the ancient forest. Tame it through overwhelming force.",
    pool:["wolf","hobgoblin","giant_frog","ogre"], boss:"frost_dragon", battles:4, size:[2,3],
    outro:"Even a Dragon Lord could not stand against you."},
  {key:"lizard", name:"Chapter 3 — Lizardman Wetlands", bg:"swamp", lvl:6,
    intro:"United lizardman tribes muster to resist the undead legions. Crush their defiance.",
    pool:["lizardman","giant_frog","basilisk","troll"], boss:"clementine", battles:4, size:[2,3],
    outro:"The wetlands are subjugated. A familiar killer falls before you."},
  {key:"catacombs", name:"Chapter 4 — Catacombs of Khajiit", bg:"crypt", lvl:9,
    intro:"A rival necromancer raises the dead to challenge your dominion. Show him true death magic.",
    pool:["skeleton","wraith","vampire_bride","dark_young"], boss:"khajiit", battles:4, size:[2,4],
    outro:"The pretender's undead crumble to dust."},
  {key:"capital", name:"Chapter 5 — The Demon Emperor's Capital", bg:"capital", lvl:12,
    intro:"Jaldabaoth, the Demon Emperor, lays siege to the royal capital. End him.",
    pool:["dark_young","wraith","vampire_bride","troll"], boss:"jaldabaoth", battles:5, size:[3,4],
    outro:"Jaldabaoth is no more. The New World kneels. The age of the Overlord has begun."},
];
