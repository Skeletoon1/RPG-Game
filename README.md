# Overlord RPG — Nazarick Rising

A complete, terminal-based turn-based RPG inspired by the **Overlord** light novel / anime.
The Great Tomb of Nazarick has descended upon the New World — choose one of its
rulers, master your class abilities, and conquer all five chapters of the campaign.

Pure Python 3, **no dependencies**. Just run it.

```bash
python3 play.py
#   or
python3 -m overlord_rpg
```

> Best experienced in a real terminal (for colors, animation, and input).
> Running with piped/non-interactive input plays an automated demo battle.

---

## Features

- **6 playable classes**, each modeled on a ruler of Nazarick, with unique stats,
  elemental affinities, ability trees, and playstyles.
- **Turn-based combat** with speed-based turn order, single/AoE targeting,
  critical hits, defending, and fleeing.
- **Deep ability system** — 40+ abilities across Martial Arts, Spells, and
  game-ending **Super-Tier** magic. Abilities deal elemental damage, heal,
  buff/debuff, drain life, and summon creatures.
- **Status effects**: poison, burn, bleed, regen, stun, freeze, attack/defense
  up & down, haste, slow, and damage-absorbing shields.
- **Elemental system** (Physical, Fire, Ice, Lightning, Dark, Holy, Poison,
  Arcane) with per-enemy resistances and weaknesses.
- **Summons** — raise Death Knights, call Valkyries, or unleash tamed beasts to
  fight alongside you.
- **Progression** — XP, leveling, automatic stat growth, and ability unlocks
  (including Super-Tier magic at high level).
- **Items & shop** — potions, ethers, panaceas, elixirs, and Phoenix Downs,
  buyable with gold earned in battle.
- **5-chapter campaign** through the New World, each ending in a boss fight.
- **Save / load** to JSON, plus a "rest at the Tomb" full restore.

---

## The Classes

| Class | Title | Inspired by | Playstyle |
|-------|-------|-------------|-----------|
| **Overlord** | Eternal Death Sovereign | Ainz Ooal Gown | Dark-magic caster & undead summoner. `Grasp Heart`, `Goal of All Life is Death`. |
| **True Vampire** | Crimson Valkyrie | Shalltear Bloodfallen | Fast lifesteal bruiser. `Valkyrie's Dance`, `Pool of Blood`. |
| **Frost Insector** | Glacial Warlord | Cocytus | Ice tank/bruiser, freezes & shields. `Glittering Blade of Ice`, `Absolute Zero Field`. |
| **Arch Demon** | Infernal Strategist | Demiurge | Fire & illusion controller. `Hellfire Wall`, `Meteor Fall`. |
| **Beast Ranger** | Wild Warden | Aura Bella Fiora | Agile ranged DPS with a beast pet. `Venom Arrow`, `Piercing Volley`. |
| **Battle Maid** | Pleiades Combat Servant | The Pleiades | Healer / buffer hybrid with lightning. `Greater Heal`, `Resurrection`. |

---

## How to Play

On your turn you may **Attack**, use an **Ability** (costs MP), use an **Item**,
**Defend** (raises DEF/RES that round), or **Flee** (not against bosses).

- Turn order is decided by **SPD**.
- Magic damage is reduced by **RES**; physical by **DEF**. Some abilities ignore
  part of the target's defense.
- Exploit **elemental weaknesses** — undead burn under Holy, demons freeze under
  Ice, and so on.
- Win battles for **XP** and **gold**. Level up to grow stronger and learn new
  abilities. Spend gold at the **shop**, and **rest at the Tomb** to refill HP/MP.
- Clear all 5 chapters to become **Conqueror of the New World**.

---

## Project Layout

```
play.py                 # launcher
overlord_rpg/
  game.py               # title screen, menus, town hub, campaign flow
  combat.py             # turn-based battle engine
  entities.py           # Entity / Player + AI and progression
  classes.py            # the 6 playable classes
  abilities.py          # ability definitions + registry
  effects.py            # status effects & ability effect components
  bestiary.py           # enemy templates, scaling, and summons
  items.py              # consumable items
  world.py              # campaign chapters & encounters
  stats.py              # stat block & elements
  save.py               # JSON save/load
  utils.py              # colors, RNG, UI helpers
tests/test_game.py      # full headless test suite
```

## Running the tests

```bash
python3 tests/test_game.py     # or: pytest tests/
```

---

*A fan project. Overlord and its characters are the property of Kugane Maruyama.
This code is an original game engine inspired by the setting.*
