"""Playable classes, each modeled on a Floor Guardian / ruler of Nazarick."""

from __future__ import annotations

from dataclasses import dataclass, field

from .stats import Element, Stats
from .utils import C


@dataclass
class CharClass:
    key: str
    name: str
    title: str
    description: str
    base_stats: Stats
    growth: Stats
    starting_abilities: list[str]
    ability_unlocks: dict[int, list[str]]  # level -> ability keys
    resistances: dict[str, float] = field(default_factory=dict)
    color: str = C.WHITE
    playstyle: str = ""


CLASSES: dict[str, CharClass] = {}


def _add(cc: CharClass) -> CharClass:
    CLASSES[cc.key] = cc
    return cc


_add(CharClass(
    key="overlord",
    name="Overlord",
    title="Eternal Death Sovereign",
    description=("An undead archmage who commands death itself. Wields negative "
                 "energy, raises the dead, and ends life with a gesture. Inspired "
                 "by Ainz Ooal Gown."),
    playstyle="Spellcaster / Summoner — devastating dark magic and undead minions.",
    base_stats=Stats(max_hp=120, max_mp=120, atk=14, mag=40, defense=18, res=30, spd=18, crit=0.05),
    growth=Stats(max_hp=16, max_mp=22, atk=2, mag=7, defense=3, res=5, spd=2, crit=0.004),
    starting_abilities=["strike", "magic_arrow", "grasp_heart"],
    ability_unlocks={
        2: ["negative_burst"],
        4: ["create_undead"],
        6: ["despair_aura"],
        9: ["iron_maiden"],
        13: ["goal_of_all_life_is_death"],
    },
    resistances={Element.DARK: 0.3, Element.POISON: 0.0, Element.ICE: 0.6,
                 Element.HOLY: 1.6, Element.FIRE: 1.2},
    color=C.BRIGHT_MAGENTA,
))

_add(CharClass(
    key="vampire",
    name="True Vampire",
    title="Crimson Valkyrie",
    description=("A blood-drinking noble of supernatural speed. Drains life with "
                 "every strike, dances with a valkyrie's lance, and heals through "
                 "carnage. Inspired by Shalltear Bloodfallen."),
    playstyle="Bruiser / Lifesteal — fast, self-sustaining melee and blood magic.",
    base_stats=Stats(max_hp=140, max_mp=80, atk=34, mag=24, defense=22, res=20, spd=34, crit=0.12),
    growth=Stats(max_hp=20, max_mp=12, atk=6, mag=3, defense=4, res=3, spd=4, crit=0.006),
    starting_abilities=["strike", "piercing_lance", "blood_frenzy"],
    ability_unlocks={
        3: ["valkyrie_dance"],
        5: ["crimson_nova"],
        7: ["blood_pool"],
        10: ["einherjar"],
    },
    resistances={Element.DARK: 0.5, Element.PHYSICAL: 0.8, Element.HOLY: 1.5, Element.FIRE: 1.3},
    color=C.RED,
))

_add(CharClass(
    key="frost",
    name="Frost Insector",
    title="Glacial Warlord",
    description=("An honorable insectoid warrior clad in living ice. Nigh-immovable, "
                 "freezing foes where they stand and shattering them with masterwork "
                 "ice blades. Inspired by Cocytus."),
    playstyle="Tank / Bruiser — enormous defense, ice control, single-target burst.",
    base_stats=Stats(max_hp=180, max_mp=70, atk=36, mag=18, defense=38, res=26, spd=20, crit=0.08),
    growth=Stats(max_hp=26, max_mp=9, atk=6, mag=2, defense=6, res=4, spd=2, crit=0.004),
    starting_abilities=["strike", "frost_cleave", "fortress_stance"],
    ability_unlocks={
        3: ["frozen_grip"],
        5: ["icy_burst"],
        8: ["glittering_blade"],
        12: ["absolute_zero"],
    },
    resistances={Element.ICE: 0.0, Element.PHYSICAL: 0.7, Element.FIRE: 1.5},
    color=C.BRIGHT_CYAN,
))

_add(CharClass(
    key="demon",
    name="Arch Demon",
    title="Infernal Strategist",
    description=("A brilliant and cruel demon who burns the world to ash. Master of "
                 "hellfire and illusion, breaking minds before bodies. Inspired by "
                 "Demiurge."),
    playstyle="Caster / Controller — fire damage-over-time and crippling debuffs.",
    base_stats=Stats(max_hp=125, max_mp=110, atk=20, mag=38, defense=22, res=30, spd=26, crit=0.1),
    growth=Stats(max_hp=17, max_mp=18, atk=3, mag=7, defense=3, res=5, spd=3, crit=0.006),
    starting_abilities=["strike", "hellflame", "mind_snare"],
    ability_unlocks={
        3: ["flames_of_hell"],
        5: ["hellfire_wall"],
        7: ["evil_lord_wrath"],
        11: ["meteor_fall"],
    },
    resistances={Element.FIRE: 0.0, Element.DARK: 0.5, Element.ICE: 1.4, Element.HOLY: 1.5},
    color=C.BRIGHT_RED,
))

_add(CharClass(
    key="ranger",
    name="Beast Ranger",
    title="Wild Warden",
    description=("A nimble dark-elf hunter who never misses. Strikes from range, "
                 "marks prey, poisons the wound, and unleashes tamed beasts. "
                 "Inspired by Aura Bella Fiora."),
    playstyle="Ranged DPS / Summoner — high speed, sustained damage, beast pet.",
    base_stats=Stats(max_hp=130, max_mp=85, atk=34, mag=22, defense=20, res=22, spd=40, crit=0.15),
    growth=Stats(max_hp=18, max_mp=12, atk=6, mag=3, defense=3, res=3, spd=5, crit=0.008),
    starting_abilities=["strike", "twin_shot", "venom_arrow"],
    ability_unlocks={
        3: ["hunters_mark"],
        5: ["beast_call"],
        7: ["arrow_storm"],
        10: ["piercing_volley"],
    },
    resistances={Element.POISON: 0.3, Element.PHYSICAL: 0.9},
    color=C.BRIGHT_GREEN,
))

_add(CharClass(
    key="maid",
    name="Battle Maid",
    title="Pleiades Combat Servant",
    description=("An elite combat servant of Nazarick: equal parts healer, buffer, "
                 "and lightning-fast duelist. Keeps the party alive and striking. "
                 "Inspired by the Pleiades."),
    playstyle="Support / Hybrid — heals, party buffs, resurrection, lightning strikes.",
    base_stats=Stats(max_hp=135, max_mp=100, atk=28, mag=30, defense=24, res=26, spd=30, crit=0.1),
    growth=Stats(max_hp=19, max_mp=15, atk=4, mag=5, defense=4, res=4, spd=3, crit=0.005),
    starting_abilities=["strike", "thunderclap", "field_dressing"],
    ability_unlocks={
        3: ["battle_standard"],
        5: ["dragon_lightning"],
        7: ["greater_heal"],
        10: ["resurrection"],
    },
    resistances={Element.LIGHTNING: 0.4, Element.HOLY: 0.6},
    color=C.BRIGHT_YELLOW,
))
