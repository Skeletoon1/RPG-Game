# Overlord RPG — Nazarick Rising

A complete, terminal-based turn-based RPG inspired by the **Overlord** light novel / anime.
The Great Tomb of Nazarick has descended upon the New World — choose one of its
rulers, master your class abilities, and conquer all five chapters of the campaign.

There are **two versions**:

### 🎮 Graphical browser game (easiest — no install at all)
A fully graphical version with animated sprites, spell effects, and damage numbers,
all drawn procedurally (no image files). To play:

1. Open the **`web`** folder.
2. **Double-click `index.html`** — it opens in your web browser (Chrome/Edge/Firefox).

That's it. No Python, no terminal, nothing to install. Your progress saves
automatically in the browser. *(For developers: it's plain HTML/CSS/JS and runs
straight off the filesystem — no build step or server needed.)*

**The browser version features:**
- **Open, point-based builds.** Your Origin is just a starting path. Each level
  grants **Skill Points** (invest across 10 schools — Necromancy, Pyromancy,
  Cryomancy, Storm, Arcane, Faith, Blade, Archery, Guard, Blood) and **Attribute
  Points** (HP/MP/ATK/MAG/DEF/RES/SPD/Crit). Mix any schools you like.
- **Schools gate abilities.** A spell unlocks only when your rank in its school
  meets the requirement — no Necromancy, no raising the dead… **unless you read a
  Scroll** of that spell (a consumable bypass).
- **Equipment & loot.** Enemies drop weapons/armor/accessories (bosses drop the
  best); equip them per-character to boost stats.
- **Multi-character party.** Recruit up to 4 guardians, control them all in
  battle, or toggle **Auto** to let allies fight themselves.
- **Procedural sound & music** via the Web Audio API (no audio files) — element-
  based spell SFX, hits, level-ups, and per-area background music. Mute with 🔊.
- Animated canvas combat: pixel/vector sprites, particle spell effects, floating
  damage/heal numbers, screen shake, and click-to-target.

### 🖥️ Desktop app (Windows / macOS / Linux)

The game is also packaged as a native desktop app via **Electron** (its own
window, app icon, no browser needed).

**Easiest — download a prebuilt installer (no tools required):**
1. On GitHub, open the **Actions** tab → the latest **"Build desktop apps"** run.
2. Download the artifact for your OS under **Artifacts**:
   - Windows → `OverlordRPG-windows-latest` (contains `OverlordRPG-Setup-x.y.z.exe`)
   - macOS → `OverlordRPG-macos-latest` (`.dmg`)
   - Linux → `OverlordRPG-ubuntu-latest` (`.AppImage`)
3. Unzip and run it. *(Windows may show a SmartScreen warning because the app
   isn't code-signed — click **More info → Run anyway**.)*

If no run exists yet, go to **Actions → Build desktop apps → Run workflow**.

**Automatic updates:** the desktop app checks GitHub Releases on launch and
updates itself — install it once and you'll never re-download manually. New
releases are published automatically when a version tag (e.g. `v1.0.2`) is
pushed. Only the repository owner can push tags / publish releases, so the
official game can't be altered by anyone else.

**Build it yourself (needs Node.js):**
```bash
npm install
npm start            # run the app in a dev window
npm run dist         # build an installer for your current OS (output in dist/)
```

### ⌨️ Terminal version (Python)

Pure Python 3, **no dependencies**. Just run it.

**Windows** (Command Prompt or PowerShell — note: use `py`, **not** `python3`,
which on Windows is often a do-nothing Microsoft Store stub):
```
cd path\to\RPG-Game
py play.py
```
…or simply **double-click `play.bat`**.

**macOS / Linux:**
```bash
python3 play.py
#   or
python3 -m overlord_rpg
```

First check Python is installed: `py --version` (Windows) or `python3 --version`
(macOS/Linux). If it's missing, install from <https://www.python.org/downloads/>
and on Windows tick **"Add Python to PATH"**.

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
