"use strict";
// ============================================================================
//  GAME DATA — classes, abilities, enemies, items, campaign
// ============================================================================

// ---- Abilities -------------------------------------------------------------
// effect types:
//  {t:"dmg", power, scale:"atk"|"mag", ratio, elem, ignoreDef?, lifesteal?, hits?}
//  {t:"heal", power, scale, ratio}
//  {t:"inflict", status, dur, pot?, prob?}
//  {t:"cleanse"}
//  {t:"summon", kind}
//  {t:"mp", amount}
// target: one_enemy | all_enemies | self | one_ally | all_allies | dead_ally
const ABILITIES = {
  strike:{name:"Strike", mp:0, target:"one_enemy", cd:0, tier:"martial", elem:"Physical",
    desc:"A basic attack. No MP.", fx:[{t:"dmg",power:8,scale:"atk",ratio:1,elem:"Physical"}]},

  // ---- OVERLORD (Ainz) ----
  magic_arrow:{name:"Magic Arrow", mp:4, target:"one_enemy", cd:0, tier:"spell", elem:"Arcane",
    desc:"Three bolts of pure magic.", fx:[{t:"dmg",power:7,scale:"mag",ratio:.7,elem:"Arcane",hits:3}]},
  negative_burst:{name:"Negative Burst", mp:14, target:"all_enemies", cd:1, tier:"spell", elem:"Dark",
    desc:"Negative energy withers all foes.", fx:[{t:"dmg",power:18,scale:"mag",ratio:.9,elem:"Dark"}]},
  grasp_heart:{name:"Grasp Heart", mp:22, target:"one_enemy", cd:2, tier:"spell", elem:"Dark",
    desc:"Crush a heart. Pierces defense; may bleed.",
    fx:[{t:"dmg",power:40,scale:"mag",ratio:1.4,elem:"Dark",ignoreDef:.5},{t:"inflict",status:"bleed",dur:2,pot:10,prob:.6}]},
  create_undead:{name:"Create Greater Undead", mp:18, target:"self", cd:3, tier:"spell", elem:"Dark",
    desc:"Summon a Death Knight ally.", fx:[{t:"summon",kind:"death_knight"}]},
  despair_aura:{name:"Despair Aura", mp:16, target:"all_enemies", cd:3, tier:"spell", elem:"Dark",
    desc:"Sap the strength and guard of all foes.",
    fx:[{t:"inflict",status:"atkDown",dur:3,pot:12,prob:.85},{t:"inflict",status:"defDown",dur:3,pot:12,prob:.85}]},
  iron_maiden:{name:"La Iron Maiden", mp:30, target:"one_enemy", cd:3, tier:"spell", elem:"Dark",
    desc:"Crushing force. Heavy damage, may stun.",
    fx:[{t:"dmg",power:55,scale:"mag",ratio:1.6,elem:"Dark",ignoreDef:.3},{t:"inflict",status:"stun",dur:1,prob:.5}]},
  goal_of_death:{name:"Goal of All Life is Death", mp:60, target:"all_enemies", cd:5, tier:"super", elem:"Dark",
    desc:"SUPER-TIER. Instant death sweeps the field, rotting survivors.",
    fx:[{t:"dmg",power:50,scale:"mag",ratio:1.2,elem:"Dark",ignoreDef:.4},{t:"inflict",status:"poison",dur:3,pot:18,prob:.9}]},

  // ---- TRUE VAMPIRE (Shalltear) ----
  piercing_lance:{name:"Piercing Lance", mp:5, target:"one_enemy", cd:0, tier:"martial", elem:"Physical",
    desc:"A lance thrust that drains vitality.", fx:[{t:"dmg",power:16,scale:"atk",ratio:1.1,elem:"Physical",lifesteal:.3}]},
  blood_frenzy:{name:"Blood Frenzy", mp:12, target:"self", cd:3, tier:"martial", elem:"Physical",
    desc:"Crimson frenzy: raise attack & speed.",
    fx:[{t:"inflict",status:"atkUp",dur:3,pot:18},{t:"inflict",status:"haste",dur:3,pot:15}]},
  crimson_nova:{name:"Crimson Nova", mp:16, target:"all_enemies", cd:2, tier:"spell", elem:"Dark",
    desc:"Sphere of blood; damages all & heals you.", fx:[{t:"dmg",power:20,scale:"mag",ratio:.8,elem:"Dark",lifesteal:.2}]},
  valkyrie_dance:{name:"Valkyrie's Dance", mp:18, target:"one_enemy", cd:2, tier:"martial", elem:"Physical",
    desc:"Four lance strikes, each steals life.", fx:[{t:"dmg",power:12,scale:"atk",ratio:.8,elem:"Physical",lifesteal:.25,hits:4}]},
  blood_pool:{name:"Pool of Blood", mp:14, target:"self", cd:3, tier:"spell", elem:"Dark",
    desc:"Heal greatly and purge afflictions.", fx:[{t:"heal",power:40,scale:"mag",ratio:.8},{t:"cleanse"}]},
  einherjar:{name:"Summon Einherjar", mp:22, target:"self", cd:4, tier:"spell", elem:"Dark",
    desc:"Call a spectral Valkyrie warrior.", fx:[{t:"summon",kind:"einherjar"}]},

  // ---- FROST INSECTOR (Cocytus) ----
  frost_cleave:{name:"Frost Cleave", mp:5, target:"one_enemy", cd:0, tier:"martial", elem:"Ice",
    desc:"Frozen blade; may slow.", fx:[{t:"dmg",power:15,scale:"atk",ratio:1.1,elem:"Ice"},{t:"inflict",status:"slow",dur:2,pot:8,prob:.5}]},
  icy_burst:{name:"Icy Burst Saint", mp:16, target:"all_enemies", cd:2, tier:"martial", elem:"Ice",
    desc:"Blizzard; foes may freeze.", fx:[{t:"dmg",power:18,scale:"atk",ratio:.9,elem:"Ice"},{t:"inflict",status:"freeze",dur:1,prob:.3}]},
  fortress_stance:{name:"Fortress Stance", mp:10, target:"self", cd:3, tier:"martial", elem:"Ice",
    desc:"Raise defense and gain a shield.", fx:[{t:"inflict",status:"defUp",dur:4,pot:25},{t:"inflict",status:"shield",dur:4,pot:60}]},
  frozen_grip:{name:"Frozen Grip", mp:14, target:"one_enemy", cd:3, tier:"martial", elem:"Ice",
    desc:"Damage and likely freeze a foe.", fx:[{t:"dmg",power:24,scale:"atk",ratio:1,elem:"Ice"},{t:"inflict",status:"freeze",dur:2,prob:.65}]},
  glittering_blade:{name:"Glittering Blade of Ice", mp:20, target:"one_enemy", cd:2, tier:"martial", elem:"Ice",
    desc:"Masterwork ice strike, partly ignores armor.", fx:[{t:"dmg",power:48,scale:"atk",ratio:1.5,elem:"Ice",ignoreDef:.25}]},
  absolute_zero:{name:"Absolute Zero Field", mp:40, target:"all_enemies", cd:4, tier:"super", elem:"Ice",
    desc:"SUPER-TIER. Freeze all foes at absolute zero.", fx:[{t:"dmg",power:42,scale:"atk",ratio:1.1,elem:"Ice"},{t:"inflict",status:"freeze",dur:2,prob:.7}]},

  // ---- ARCH DEMON (Demiurge) ----
  hellflame:{name:"Hellflame", mp:5, target:"one_enemy", cd:0, tier:"spell", elem:"Fire",
    desc:"Hellfire jet; often burns.", fx:[{t:"dmg",power:14,scale:"mag",ratio:1,elem:"Fire"},{t:"inflict",status:"burn",dur:2,pot:8,prob:.6}]},
  flames_of_hell:{name:"Flames of Hell", mp:18, target:"all_enemies", cd:2, tier:"spell", elem:"Fire",
    desc:"Engulf the field in flame.", fx:[{t:"dmg",power:22,scale:"mag",ratio:.95,elem:"Fire"},{t:"inflict",status:"burn",dur:2,pot:10,prob:.7}]},
  hellfire_wall:{name:"Hellfire Wall", mp:24, target:"one_enemy", cd:2, tier:"spell", elem:"Fire",
    desc:"Towering fire with lasting burns.", fx:[{t:"dmg",power:36,scale:"mag",ratio:1.3,elem:"Fire"},{t:"inflict",status:"burn",dur:3,pot:14,prob:.9}]},
  evil_lord_wrath:{name:"Evil Lord: Wrath", mp:20, target:"one_enemy", cd:3, tier:"spell", elem:"Dark",
    desc:"Maul and weaken a foe.", fx:[{t:"dmg",power:30,scale:"mag",ratio:1.1,elem:"Dark"},{t:"inflict",status:"atkDown",dur:3,pot:16,prob:.9}]},
  mind_snare:{name:"Insanity Snare", mp:14, target:"one_enemy", cd:3, tier:"spell", elem:"Dark",
    desc:"Illusion: likely stun & weaken.", fx:[{t:"inflict",status:"stun",dur:2,prob:.7},{t:"inflict",status:"defDown",dur:3,pot:14,prob:.8}]},
  meteor_fall:{name:"Meteor Fall", mp:38, target:"all_enemies", cd:4, tier:"super", elem:"Fire",
    desc:"SUPER-TIER. A meteor immolates all foes.", fx:[{t:"dmg",power:50,scale:"mag",ratio:1.3,elem:"Fire"},{t:"inflict",status:"burn",dur:3,pot:16,prob:.85}]},

  // ---- BEAST RANGER (Aura) ----
  twin_shot:{name:"Twin Shot", mp:4, target:"one_enemy", cd:0, tier:"martial", elem:"Physical",
    desc:"Two quick arrows.", fx:[{t:"dmg",power:9,scale:"atk",ratio:.8,elem:"Physical",hits:2}]},
  venom_arrow:{name:"Venom Arrow", mp:8, target:"one_enemy", cd:1, tier:"martial", elem:"Poison",
    desc:"Poison-tipped arrow that festers.", fx:[{t:"dmg",power:14,scale:"atk",ratio:.9,elem:"Poison"},{t:"inflict",status:"poison",dur:3,pot:12,prob:.85}]},
  hunters_mark:{name:"Hunter's Mark", mp:10, target:"one_enemy", cd:2, tier:"martial", elem:"Physical",
    desc:"Sharply lower a target's defense.", fx:[{t:"inflict",status:"defDown",dur:4,pot:20,prob:1}]},
  beast_call:{name:"Beast Call", mp:16, target:"self", cd:3, tier:"martial", elem:"Physical",
    desc:"Summon a tamed beast.", fx:[{t:"summon",kind:"beast"}]},
  arrow_storm:{name:"Arrow Storm", mp:18, target:"all_enemies", cd:2, tier:"martial", elem:"Physical",
    desc:"Rain arrows on every enemy.", fx:[{t:"dmg",power:10,scale:"atk",ratio:.6,elem:"Physical",hits:2}]},
  piercing_volley:{name:"Piercing Volley", mp:22, target:"one_enemy", cd:2, tier:"martial", elem:"Physical",
    desc:"Armor-piercing focused volley.", fx:[{t:"dmg",power:46,scale:"atk",ratio:1.4,elem:"Physical",ignoreDef:.4}]},

  // ---- BATTLE MAID (Pleiades) ----
  thunderclap:{name:"Thunderclap Strike", mp:5, target:"one_enemy", cd:0, tier:"martial", elem:"Lightning",
    desc:"Charged blow; may stun.", fx:[{t:"dmg",power:15,scale:"atk",ratio:1,elem:"Lightning"},{t:"inflict",status:"stun",dur:1,prob:.25}]},
  dragon_lightning:{name:"Dragon Lightning", mp:16, target:"all_enemies", cd:2, tier:"spell", elem:"Lightning",
    desc:"Serpent of lightning lashes all.", fx:[{t:"dmg",power:20,scale:"mag",ratio:.9,elem:"Lightning"}]},
  field_dressing:{name:"Field Dressing", mp:10, target:"one_ally", cd:1, tier:"spell", elem:"Holy",
    desc:"Heal and cleanse an ally.", fx:[{t:"heal",power:35,scale:"mag",ratio:1},{t:"cleanse"}]},
  battle_standard:{name:"Battle Standard", mp:16, target:"all_allies", cd:3, tier:"martial", elem:"Holy",
    desc:"Buff the whole party.", fx:[{t:"inflict",status:"atkUp",dur:3,pot:14},{t:"inflict",status:"defUp",dur:3,pot:10}]},
  greater_heal:{name:"Greater Heal", mp:20, target:"all_allies", cd:3, tier:"spell", elem:"Holy",
    desc:"Restoration mends every ally.", fx:[{t:"heal",power:30,scale:"mag",ratio:.7}]},
  resurrection:{name:"Resurrection", mp:30, target:"dead_ally", cd:4, tier:"spell", elem:"Holy",
    desc:"Revive a fallen ally with health.", fx:[{t:"heal",power:60,scale:"mag",ratio:1}]},
};

// ---- Playable classes ------------------------------------------------------
// stats: hp,mp,atk,mag,def,res,spd,crit
function S(hp,mp,atk,mag,def,res,spd,crit){return {hp,mp,atk,mag,def,res,spd,crit};}
const CLASSES = {
  overlord:{key:"overlord", name:"Overlord", title:"Eternal Death Sovereign",
    color:"#c06bff",
    desc:"An undead archmage who commands death itself — negative energy, undead minions, and a gesture that ends life. Inspired by Ainz Ooal Gown.",
    style:"Caster / Summoner",
    base:S(120,120,14,40,18,30,18,.05), grow:S(16,22,2,7,3,5,2,.004),
    start:["strike","magic_arrow","grasp_heart"],
    unlocks:{2:["negative_burst"],4:["create_undead"],6:["despair_aura"],9:["iron_maiden"],13:["goal_of_death"]},
    res:{Dark:.3,Poison:0,Ice:.6,Holy:1.6,Fire:1.2}},
  vampire:{key:"vampire", name:"True Vampire", title:"Crimson Valkyrie",
    color:"#ff5a6e",
    desc:"A blood-drinking noble of supernatural speed, healing through carnage. Inspired by Shalltear Bloodfallen.",
    style:"Lifesteal Bruiser",
    base:S(140,80,34,24,22,20,34,.12), grow:S(20,12,6,3,4,3,4,.006),
    start:["strike","piercing_lance","blood_frenzy"],
    unlocks:{3:["valkyrie_dance"],5:["crimson_nova"],7:["blood_pool"],10:["einherjar"]},
    res:{Dark:.5,Physical:.8,Holy:1.5,Fire:1.3}},
  frost:{key:"frost", name:"Frost Insector", title:"Glacial Warlord",
    color:"#7fe9ff",
    desc:"An honorable insectoid warrior clad in living ice — nigh-immovable, freezing and shattering foes. Inspired by Cocytus.",
    style:"Ice Tank / Bruiser",
    base:S(180,70,36,18,38,26,20,.08), grow:S(26,9,6,2,6,4,2,.004),
    start:["strike","frost_cleave","fortress_stance"],
    unlocks:{3:["frozen_grip"],5:["icy_burst"],8:["glittering_blade"],12:["absolute_zero"]},
    res:{Ice:0,Physical:.7,Fire:1.5}},
  demon:{key:"demon", name:"Arch Demon", title:"Infernal Strategist",
    color:"#ff7a3c",
    desc:"A brilliant, cruel demon who burns the world to ash with hellfire and illusion. Inspired by Demiurge.",
    style:"Fire Caster / Controller",
    base:S(125,110,20,38,22,30,26,.10), grow:S(17,18,3,7,3,5,3,.006),
    start:["strike","hellflame","mind_snare"],
    unlocks:{3:["flames_of_hell"],5:["hellfire_wall"],7:["evil_lord_wrath"],11:["meteor_fall"]},
    res:{Fire:0,Dark:.5,Ice:1.4,Holy:1.5}},
  ranger:{key:"ranger", name:"Beast Ranger", title:"Wild Warden",
    color:"#7dff6b",
    desc:"A nimble dark-elf hunter who never misses, marking prey and unleashing tamed beasts. Inspired by Aura Bella Fiora.",
    style:"Ranged DPS / Summoner",
    base:S(130,85,34,22,20,22,40,.15), grow:S(18,12,6,3,3,3,5,.008),
    start:["strike","twin_shot","venom_arrow"],
    unlocks:{3:["hunters_mark"],5:["beast_call"],7:["arrow_storm"],10:["piercing_volley"]},
    res:{Poison:.3,Physical:.9}},
  maid:{key:"maid", name:"Battle Maid", title:"Pleiades Combat Servant",
    color:"#ffd866",
    desc:"An elite combat servant: healer, buffer, and lightning-fast duelist keeping the party alive. Inspired by the Pleiades.",
    style:"Support / Hybrid",
    base:S(135,100,28,30,24,26,30,.10), grow:S(19,15,4,5,4,4,3,.005),
    start:["strike","thunderclap","field_dressing"],
    unlocks:{3:["battle_standard"],5:["dragon_lightning"],7:["greater_heal"],10:["resurrection"]},
    res:{Lightning:.4,Holy:.6}},
};

// ---- Enemies & summons -----------------------------------------------------
const DEF_GROW = S(14,6,4,4,3,3,2,.003);
const BOSS_GROW = S(30,12,6,6,5,5,3,.004);
const ENEMIES = {
  goblin:{name:"Goblin", sprite:"goblin", base:S(55,10,16,5,8,6,18,.05), ab:["strike"], xp:14, gold:8},
  wolf:{name:"Wild Wolf", sprite:"wolf", base:S(48,10,20,5,7,6,30,.05), ab:["strike","twin_shot"], xp:16, gold:6},
  hobgoblin:{name:"Hobgoblin", sprite:"goblin", base:S(80,15,24,6,14,8,18,.05), ab:["strike","frost_cleave"], xp:24, gold:14, tint:"#3a7a3a"},
  skeleton:{name:"Skeleton Warrior", sprite:"skeleton", base:S(70,20,22,8,12,10,16,.05), ab:["strike","magic_arrow"], xp:22, gold:10, res:{Dark:.4,Holy:1.6,Poison:0}},
  lizardman:{name:"Lizardman Raider", sprite:"lizard", base:S(95,15,26,8,16,10,22,.05), ab:["strike","piercing_lance"], xp:30, gold:16},
  ogre:{name:"Ogre", sprite:"ogre", base:S(130,10,32,4,18,8,12,.05), ab:["strike","thunderclap"], xp:38, gold:22},
  giant_frog:{name:"Razor-Tail Frog", sprite:"frog", base:S(85,20,20,14,10,14,20,.05), ab:["strike","venom_arrow"], xp:26, gold:12, res:{Poison:.2}},
  wraith:{name:"Wraith", sprite:"wraith", base:S(78,40,14,26,10,20,26,.05), ab:["strike","negative_burst","hellflame"], xp:34, gold:18, res:{Dark:.3,Physical:.5,Holy:1.7}},
  troll:{name:"War Troll", sprite:"ogre", base:S(170,15,34,6,22,10,14,.05), ab:["strike","frost_cleave"], xp:50, gold:30, tint:"#5a7a4a"},
  basilisk:{name:"Giant Basilisk", sprite:"lizard", base:S(150,30,30,18,24,16,18,.05), ab:["strike","venom_arrow","icy_burst"], xp:55, gold:34, res:{Poison:0}, tint:"#b0a030"},
  dark_young:{name:"Dark Young", sprite:"darkyoung", base:S(200,40,36,22,24,18,16,.05), ab:["strike","negative_burst","venom_arrow"], xp:65, gold:40, res:{Dark:.4,Poison:.3,Holy:1.4}},
  vampire_bride:{name:"Vampire Bride", sprite:"vampire", base:S(140,60,30,24,18,20,34,.08), ab:["strike","piercing_lance","crimson_nova"], xp:60, gold:44, res:{Dark:.4,Holy:1.6}},
  // bosses
  hamsuke:{name:"Wise King of the Forest", sprite:"hamster", base:S(320,40,44,10,34,18,22,.06), ab:["strike","frost_cleave","fortress_stance"], xp:160, gold:120, boss:true, grow:BOSS_GROW},
  clementine:{name:"Clementine the Blade", sprite:"clementine", base:S(300,60,52,16,28,22,44,.12), ab:["strike","valkyrie_dance","blood_frenzy","piercing_volley"], xp:200, gold:160, boss:true, grow:BOSS_GROW},
  khajiit:{name:"Khajiit the Necromancer", sprite:"khajiit", base:S(320,140,18,46,24,34,24,.06), ab:["strike","negative_burst","grasp_heart","despair_aura"], xp:220, gold:170, boss:true, grow:BOSS_GROW, res:{Dark:.3,Holy:1.6,Poison:0}},
  frost_dragon:{name:"Frost Dragon Lord", sprite:"dragon", base:S(480,120,50,42,40,36,26,.07), ab:["strike","icy_burst","glittering_blade","absolute_zero"], xp:320, gold:260, boss:true, grow:BOSS_GROW, res:{Ice:0,Fire:1.4,Physical:.7}},
  jaldabaoth:{name:"Jaldabaoth, Demon Emperor", sprite:"jalda", base:S(620,200,46,52,38,42,34,.08), ab:["strike","flames_of_hell","hellfire_wall","evil_lord_wrath","meteor_fall"], xp:500, gold:400, boss:true, grow:BOSS_GROW, res:{Fire:0,Dark:.4,Ice:1.3,Holy:1.4}},
};

const SUMMONS = {
  death_knight:{name:"Death Knight", sprite:"deathknight", base:S(120,0,30,0,26,16,16,.05), ab:["strike","frost_cleave"], grow:S(14,0,4,0,3,2,1,0), res:{Dark:.2,Holy:1.5,Poison:0}},
  einherjar:{name:"Einherjar", sprite:"einherjar", base:S(90,0,28,0,18,16,30,.05), ab:["strike","piercing_lance"], grow:S(10,0,4,0,2,2,2,0)},
  beast:{name:"Sleipnir Beast", sprite:"wolf", base:S(100,0,30,0,16,12,34,.08), ab:["strike","twin_shot"], grow:S(12,0,4,0,2,2,2,0), tint:"#3a3a5a"},
};

// ---- Items -----------------------------------------------------------------
const ITEMS = {
  potion:{name:"Healing Potion", desc:"Restore 80 HP.", price:30, kind:"heal", amt:80},
  hi_potion:{name:"Greater Potion", desc:"Restore 200 HP.", price:80, kind:"heal", amt:200},
  ether:{name:"Mana Ether", desc:"Restore 60 MP.", price:40, kind:"mp", amt:60},
  hi_ether:{name:"Greater Ether", desc:"Restore 150 MP.", price:100, kind:"mp", amt:150},
  elixir:{name:"World Elixir", desc:"Fully restore HP & MP.", price:250, kind:"full"},
  antidote:{name:"Panacea", desc:"Remove negative effects.", price:25, kind:"cleanse"},
  phoenix:{name:"Phoenix Down", desc:"Revive yourself with 120 HP.", price:150, kind:"revive", amt:120},
};

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
