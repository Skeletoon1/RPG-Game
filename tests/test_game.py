"""Smoke + logic tests that exercise the whole game without a terminal."""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from overlord_rpg import abilities as ab
from overlord_rpg import bestiary, items, utils, world
from overlord_rpg.classes import CLASSES
from overlord_rpg.combat import Battle
from overlord_rpg.effects import Burn, Poison
from overlord_rpg.entities import Player
from overlord_rpg.stats import Stats

utils.seed(1234)
utils.set_color_enabled(False)


def test_all_classes_loadable_and_abilities_resolve():
    assert len(CLASSES) == 6
    for cc in CLASSES.values():
        # Every referenced ability key must exist in the registry.
        keys = set(cc.starting_abilities)
        for ks in cc.ability_unlocks.values():
            keys.update(ks)
        for k in keys:
            assert k in ab.REGISTRY, f"{cc.key} references missing ability {k}"


def test_all_enemy_templates_reference_valid_abilities():
    for tmpl in bestiary.TEMPLATES.values():
        for k in tmpl.abilities:
            assert k in ab.REGISTRY, f"{tmpl.key} references missing ability {k}"


def test_levelup_unlocks_abilities_and_grows_stats():
    p = Player("Test", CLASSES["overlord"])
    start_hp = p.max_hp
    start_abilities = len(p.ability_keys)
    for _ in range(12):
        p.gain_xp(p.xp_to_next)
    assert p.level >= 13
    assert p.max_hp > start_hp
    assert len(p.ability_keys) > start_abilities
    # Super-tier should be unlocked by now.
    assert "goal_of_all_life_is_death" in p.ability_keys


def test_damage_and_resistance():
    p = Player("Mage", CLASSES["demon"])
    skel = bestiary.make_enemy("skeleton", 3)  # weak to holy, immune to poison
    before = skel.hp
    dmg = skel.take_damage(100, "Fire", ignore_defense=0)
    assert dmg > 0
    assert skel.hp == before - dmg
    # Poison immunity => take_pure_damage still applies (DoT bypass), but resist multiplier
    # only affects take_damage. Verify the immunity multiplier.
    full = bestiary.make_enemy("skeleton", 3)
    poison_dmg = full.take_damage(100, "Poison")
    assert poison_dmg == 1  # immune (x0.0) clamps to a floor of 1


def test_status_effects_tick():
    p = Player("V", CLASSES["vampire"])
    enemy = bestiary.make_enemy("goblin", 1)
    battle = Battle(p, [enemy])
    enemy.add_status(Poison(3, 10), battle)
    hp_before = enemy.hp
    enemy.tick_statuses_start(battle)
    assert enemy.hp < hp_before
    enemy.tick_statuses_end(battle)
    assert enemy.statuses[0].duration == 2


def test_full_autobattle_each_class_can_win_a_basic_fight():
    for key in CLASSES:
        utils.seed(99)
        bestiary.wire_summon_abilities(lambda: 5)
        p = Player("Hero", CLASSES[key])
        for _ in range(5):
            p.level_up()
        enemies = [bestiary.make_enemy("goblin", 2)]
        battle = Battle(p, enemies, can_flee=False)
        outcome = battle.run()
        assert outcome["result"] in ("win", "lose")
        # With a 5-level lead over a single goblin, the hero should win.
        assert outcome["result"] == "win", f"{key} unexpectedly lost"


def test_summons_join_party():
    utils.seed(7)
    bestiary.wire_summon_abilities(lambda: 5)
    p = Player("Ainz", CLASSES["overlord"])
    for _ in range(4):
        p.level_up()  # unlock create_undead at level 4
    assert "create_undead" in p.ability_keys
    enemy = bestiary.make_enemy("troll", 5)
    battle = Battle(p, [enemy], can_flee=False)
    summon_ab = ab.get("create_undead")
    battle._cast(p, summon_ab, p)
    assert len(battle.party) == 2
    assert battle.party[1].is_summon


def test_save_and_load(tmp_path):
    from overlord_rpg import save as save_mod
    path = str(tmp_path / "save.json")
    p = Player("Saver", CLASSES["ranger"])
    p.gain_xp(500)
    p.gold = 777
    p.add_item("potion", 5)
    progress = {"chapter_idx": 2, "wins": 1, "completed": False}
    save_mod.save_game(p, progress, path)
    loaded_p, loaded_prog = save_mod.load_game(path)
    assert loaded_p.name == "Saver"
    assert loaded_p.gold == 777
    assert loaded_p.level == p.level
    assert loaded_p.inventory.get("potion") == 5
    assert loaded_prog["chapter_idx"] == 2


def test_world_encounters_valid():
    for ch in world.CHAPTERS:
        assert ch.boss in bestiary.TEMPLATES
        for k in ch.pool:
            assert k in bestiary.TEMPLATES
        spec = world.roll_encounter(ch)
        assert 1 <= len(spec) <= ch.encounter_size[1]


if __name__ == "__main__":
    import traceback
    funcs = [v for k, v in sorted(globals().items()) if k.startswith("test_")]
    failed = 0
    for fn in funcs:
        try:
            import inspect
            if "tmp_path" in inspect.signature(fn).parameters:
                import tempfile, pathlib
                with tempfile.TemporaryDirectory() as d:
                    fn(pathlib.Path(d))
            else:
                fn()
            print(f"PASS  {fn.__name__}")
        except Exception:
            failed += 1
            print(f"FAIL  {fn.__name__}")
            traceback.print_exc()
    print(f"\n{len(funcs) - failed}/{len(funcs)} tests passed")
    sys.exit(1 if failed else 0)
