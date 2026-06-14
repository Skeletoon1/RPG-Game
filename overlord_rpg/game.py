"""Top-level game flow: title screen, character creation, town hub, campaign."""

from __future__ import annotations

from . import abilities as ab
from . import bestiary
from . import items as item_db
from . import save as save_mod
from . import world
from .classes import CLASSES
from .combat import Battle
from .entities import Player
from .utils import (C, banner, color, confirm, hr, INTERACTIVE, pause,
                    prompt_int, prompt_text, slow_print)

TITLE = r"""
   ___                 _               _
  / _ \__   _____ _ __| | ___  _ __ __| |
 | | | \ \ / / _ \ '__| |/ _ \| '__/ _` |
 | |_| |\ V /  __/ |  | | (_) | | | (_| |
  \___/  \_/ \___|_|  |_|\___/|_|  \__,_|
        R  P  G   —   Nazarick Rising
"""


# ---------------------------------------------------------------------------
# Title / main menu
# ---------------------------------------------------------------------------

def play():
    if not INTERACTIVE:
        print("Overlord RPG requires an interactive terminal. Running a quick demo battle instead.\n")
        demo_battle()
        return
    print(color(TITLE, C.BOLD, C.BRIGHT_MAGENTA))
    slow_print(color("  The Great Tomb of Nazarick has descended upon the New World.", C.DIM))
    slow_print(color("  Choose your guardian and seize dominion over all that lives.\n", C.DIM))

    while True:
        print(color("  MAIN MENU", C.BOLD, C.BRIGHT_CYAN))
        print("   1) New Game")
        has = save_mod.has_save()
        print("   2) Continue" + ("" if has else color("  (no save found)", C.DIM)))
        print("   3) How to Play")
        print("   4) Quit")
        choice = prompt_int("  > ", 1, 4, default=4)
        if choice == 1:
            player, progress = new_game()
            if player:
                game_loop(player, progress)
        elif choice == 2:
            if not has:
                print(color("  No save file found.\n", C.RED))
                continue
            loaded = save_mod.load_game()
            if loaded:
                player, progress = loaded
                print(color(f"  Welcome back, {player.name} the {player.char_class.name}!\n",
                            C.BRIGHT_GREEN))
                game_loop(player, progress)
        elif choice == 3:
            how_to_play()
        elif choice == 4:
            slow_print(color("\n  Nazarick awaits your return...\n", C.BRIGHT_MAGENTA))
            return


def how_to_play():
    banner("HOW TO PLAY")
    print("""  • Choose a class inspired by the rulers of Nazarick. Each has a unique
    set of abilities, stats, and elemental strengths.
  • Battles are turn-based. Order is decided by SPD. On your turn you may
    Attack, use an Ability (costs MP), use an Item, Defend, or Flee.
  • Abilities deal damage, heal, buff/debuff, inflict status effects
    (poison, burn, freeze, stun...), or summon creatures to fight for you.
  • Win battles to earn XP and gold. Level up to grow stronger and learn
    new abilities — including devastating SUPER-TIER magic at high levels.
  • Spend gold at the shop on potions and revives. Rest at the Tomb to
    fully restore HP/MP between battles.
  • Clear all 5 chapters to conquer the New World.
""")
    pause()


# ---------------------------------------------------------------------------
# Character creation
# ---------------------------------------------------------------------------

def new_game():
    banner("CHOOSE YOUR GUARDIAN")
    keys = list(CLASSES.keys())
    for i, key in enumerate(keys, 1):
        cc = CLASSES[key]
        print(f"  {color(str(i) + ')', C.BOLD)} {color(cc.name, cc.color, C.BOLD)} "
              f"— {color(cc.title, C.ITALIC, cc.color)}")
        print(f"     {color(cc.playstyle, C.DIM)}")
    print(f"  {len(keys) + 1}) View detailed class info")
    print(f"  0) Back")

    chosen = None
    while chosen is None:
        idx = prompt_int("  Select a class > ", 0, len(keys) + 1, default=1)
        if idx == 0:
            return None, None
        if idx == len(keys) + 1:
            _show_class_details(keys)
            continue
        chosen = CLASSES[keys[idx - 1]]
        _print_class_card(chosen)
        if not confirm(f"  Play as the {chosen.name}?"):
            chosen = None

    name = prompt_text(f"  Name your {chosen.name} (default: {chosen.title}): ",
                       default=chosen.title)
    player = Player(name, chosen)
    # Starting kit.
    player.add_item("potion", 3)
    player.add_item("ether", 2)
    player.add_item("phoenix", 1)

    slow_print(color(f"\n  {name} the {chosen.name} steps forth from Nazarick!", C.BRIGHT_GREEN))
    pause()
    progress = {"chapter_idx": 0, "wins": 0, "completed": False}
    return player, progress


def _print_class_card(cc):
    hr("-", 60, cc.color)
    print(color(f"  {cc.name} — {cc.title}", C.BOLD, cc.color))
    print(color(f"  {cc.description}", C.DIM))
    s = cc.base_stats
    print(f"  HP {s.max_hp}  MP {s.max_mp}  ATK {s.atk}  MAG {s.mag}  "
          f"DEF {s.defense}  RES {s.res}  SPD {s.spd}  CRIT {int(s.crit*100)}%")
    print(color("  Starting abilities: ", C.BOLD)
          + ", ".join(ab.get(k).name for k in cc.starting_abilities))
    hr("-", 60, cc.color)


def _show_class_details(keys):
    for key in keys:
        cc = CLASSES[key]
        _print_class_card(cc)
        unlocks = ", ".join(f"L{lvl}:{ab.get(k).name}"
                            for lvl, ks in sorted(cc.ability_unlocks.items()) for k in ks)
        print(color(f"  Unlocks: {unlocks}", C.DIM))
        print()
    pause()


# ---------------------------------------------------------------------------
# Town hub
# ---------------------------------------------------------------------------

def game_loop(player, progress):
    bestiary.wire_summon_abilities(lambda: player.level)

    while True:
        if progress.get("completed"):
            banner("THE NEW WORLD IS YOURS")
            print(color("  You have conquered every chapter. Replay or retire?", C.BRIGHT_YELLOW))

        chapter = world.CHAPTERS[progress["chapter_idx"]]
        print()
        hr("=", 60, C.BRIGHT_MAGENTA)
        print(color(f"  THE GREAT TOMB OF NAZARICK", C.BOLD, C.BRIGHT_MAGENTA))
        print(f"  {player.cname()}  Lv.{player.level} {player.char_class.name}  "
              f"HP {player.hp}/{player.max_hp}  MP {player.mp}/{player.max_mp}  "
              f"{color(str(player.gold) + 'g', C.BRIGHT_YELLOW)}")
        print(f"  Current front: {color(chapter.name, C.BRIGHT_CYAN)}  "
              f"(progress {min(progress['wins'], chapter.battles_before_boss)}"
              f"/{chapter.battles_before_boss} before boss)")
        hr("=", 60, C.BRIGHT_MAGENTA)
        print("   1) Venture forth (battle)")
        print("   2) Shop")
        print("   3) Status & Abilities")
        print("   4) Rest at the Tomb (full restore)")
        print("   5) Save game")
        print("   6) Quit to main menu")
        choice = prompt_int("  > ", 1, 6, default=1)

        if choice == 1:
            if not venture(player, progress):
                return  # defeated and chose to quit
        elif choice == 2:
            shop(player)
        elif choice == 3:
            show_status(player)
        elif choice == 4:
            player.full_restore()
            slow_print(color("  You rest within Nazarick. HP and MP fully restored.",
                             C.BRIGHT_GREEN))
            pause()
        elif choice == 5:
            save_mod.save_game(player, progress)
            slow_print(color("  Game saved.", C.BRIGHT_GREEN))
            pause()
        elif choice == 6:
            if confirm("  Quit to main menu? (Unsaved progress is lost)", default=False):
                return


# ---------------------------------------------------------------------------
# Venturing / battles
# ---------------------------------------------------------------------------

def venture(player, progress):
    chapter = world.CHAPTERS[progress["chapter_idx"]]
    is_boss = progress["wins"] >= chapter.battles_before_boss

    if progress["wins"] == 0 and not is_boss:
        banner(chapter.name)
        slow_print(color("  " + chapter.intro, C.ITALIC))
        pause()

    if is_boss:
        boss = bestiary.make_enemy(chapter.boss, chapter.level + 2)
        slow_print(color(f"\n  ⚠ BOSS: {boss.name} stands before you!", C.BOLD, C.BRIGHT_RED))
        pause()
        enemies = [boss]
        can_flee = False
    else:
        spec = world.roll_encounter(chapter)
        enemies = [bestiary.make_enemy(k, lvl) for k, lvl in spec]
        can_flee = True

    battle = Battle(player, enemies, can_flee=can_flee)
    outcome = battle.run()

    # Remove any expired summons from the party (they don't persist).
    # (Battle keeps them only for the duration of the fight.)

    if outcome["result"] == "lose":
        return handle_defeat(player, progress)
    if outcome["result"] == "flee":
        slow_print(color("  You retreat to regroup.", C.BRIGHT_YELLOW))
        pause()
        return True

    # Victory.
    banner("VICTORY")
    slow_print(color(f"  Earned {outcome['xp']} XP and {outcome['gold']} gold.",
                     C.BRIGHT_YELLOW))
    player.gold += outcome["gold"]
    for msg in player.gain_xp(outcome["xp"]):
        slow_print("  " + msg, 0.05)

    if is_boss:
        slow_print(color("\n  " + chapter.outro, C.ITALIC, C.BRIGHT_GREEN))
        progress["wins"] = 0
        if progress["chapter_idx"] + 1 < len(world.CHAPTERS):
            progress["chapter_idx"] += 1
            slow_print(color(f"  A new front opens: {world.CHAPTERS[progress['chapter_idx']].name}",
                             C.BRIGHT_CYAN))
        else:
            progress["completed"] = True
            victory_ending(player)
    else:
        progress["wins"] += 1
        if progress["wins"] >= chapter.battles_before_boss:
            slow_print(color("  The path to the chapter's boss is open!", C.BRIGHT_RED))
    # Small breather restore after each fight.
    player.hp = min(player.max_hp, player.hp + player.max_hp // 5)
    player.mp = min(player.max_mp, player.mp + player.max_mp // 5)
    player.statuses.clear()
    player.shield = 0
    player.cooldowns.clear()
    pause()
    return True


def handle_defeat(player, progress):
    banner("DEFEAT")
    slow_print(color("  Your guardian has fallen... but Nazarick endures.", C.RED))
    print("   1) Reload last save")
    print("   2) Revive at the Tomb (lose half your gold)")
    print("   3) Quit to main menu")
    choice = prompt_int("  > ", 1, 3, default=2)
    if choice == 1 and save_mod.has_save():
        loaded = save_mod.load_game()
        if loaded:
            np, npr = loaded
            player.__dict__.update(np.__dict__)
            progress.clear()
            progress.update(npr)
            slow_print(color("  Save reloaded.", C.BRIGHT_GREEN))
            pause()
            return True
    if choice == 3:
        return False
    # Revive (default / option 2).
    player.full_restore()
    player.gold //= 2
    progress["wins"] = 0
    slow_print(color("  You are restored, but the field is reset for this chapter.",
                     C.BRIGHT_GREEN))
    pause()
    return True


def victory_ending(player):
    banner("★  CONQUEROR OF THE NEW WORLD  ★")
    slow_print(color(
        f"  {player.name} the {player.char_class.name} stands unrivaled.\n"
        f"  Kingdoms, beasts, demons, and dragons alike kneel before Nazarick.\n"
        f"  The age of the Overlord has begun — and it will never end.\n",
        C.BOLD, C.BRIGHT_MAGENTA))
    slow_print(color(f"  Final level: {player.level}   Gold: {player.gold}", C.BRIGHT_YELLOW))
    pause()


# ---------------------------------------------------------------------------
# Shop / status
# ---------------------------------------------------------------------------

def shop(player):
    while True:
        banner("THE BLACK MARKET OF E-RANTEL")
        print(color(f"  Gold: {player.gold}", C.BRIGHT_YELLOW))
        catalog = [k for k in item_db.ITEMS]
        for i, key in enumerate(catalog, 1):
            it = item_db.get(key)
            owned = player.inventory.get(key, 0)
            print(f"   {i}) {color(it.name, it.color):<28} "
                  f"{color(str(it.price) + 'g', C.BRIGHT_YELLOW):>6}  "
                  f"{color('(have ' + str(owned) + ')', C.DIM)}")
            print(f"      {color(it.description, C.DIM)}")
        print("   0) Leave")
        idx = prompt_int("  Buy which? > ", 0, len(catalog), default=0)
        if idx == 0:
            return
        key = catalog[idx - 1]
        it = item_db.get(key)
        qty = prompt_int(f"  How many {it.name}? (max {player.gold // it.price if it.price else 0}) > ",
                         0, max(0, player.gold // it.price) if it.price else 0, default=1)
        if qty <= 0:
            continue
        cost = qty * it.price
        if cost > player.gold:
            print(color("  Not enough gold!", C.RED))
            continue
        player.gold -= cost
        player.add_item(key, qty)
        slow_print(color(f"  Purchased {qty}x {it.name} for {cost}g.", C.BRIGHT_GREEN))
        pause()


def show_status(player):
    banner(f"{player.name} — {player.char_class.name}")
    s = player.base_stats
    print(f"  Level {player.level}   XP {player.xp}/{player.xp_to_next}   "
          f"Gold {color(str(player.gold), C.BRIGHT_YELLOW)}")
    print(f"  HP {player.hp}/{player.max_hp}   MP {player.mp}/{player.max_mp}")
    print(f"  ATK {s.atk}  MAG {s.mag}  DEF {s.defense}  RES {s.res}  "
          f"SPD {s.spd}  CRIT {int(s.crit*100)}%")
    # Resistances.
    if player.resistances:
        res = "  ".join(f"{el}:{'x%.1f' % m}" for el, m in player.resistances.items())
        print(color(f"  Affinities: {res}", C.DIM))
    hr("-", 60)
    print(color("  ABILITIES", C.BOLD, C.BRIGHT_BLUE))
    for a in player.abilities():
        print("   • " + a.summary())
    # Show locked abilities.
    locked = [(lvl, k) for lvl, ks in sorted(player.char_class.ability_unlocks.items())
              for k in ks if k not in player.ability_keys]
    if locked:
        hr("-", 60)
        print(color("  LOCKED (unlock by leveling up)", C.BOLD, C.DIM))
        for lvl, k in locked:
            print(color(f"   • L{lvl}: {ab.get(k).name} — {ab.get(k).description}", C.DIM))
    hr("-", 60)
    print(color("  INVENTORY", C.BOLD, C.BRIGHT_CYAN))
    if not any(player.inventory.values()):
        print(color("   (empty)", C.DIM))
    for k, q in player.inventory.items():
        if q > 0:
            it = item_db.get(k)
            print(f"   • {color(it.name, it.color)} x{q}")
    pause()


# ---------------------------------------------------------------------------
# Demo (non-interactive)
# ---------------------------------------------------------------------------

def demo_battle():
    """Run a single auto-played battle (used when stdin isn't a TTY)."""
    bestiary.wire_summon_abilities(lambda: 5)
    player = Player("Momonga", CLASSES["overlord"])
    for _ in range(4):
        player.level_up()
    player.add_item("potion", 3)
    enemies = [bestiary.make_enemy("hobgoblin", 4), bestiary.make_enemy("wolf", 4)]
    battle = Battle(player, enemies, can_flee=False)
    outcome = battle.run()
    print(f"\nDemo outcome: {outcome}")
