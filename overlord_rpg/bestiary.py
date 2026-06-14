"""Enemy templates, scaling, and summonable creatures."""

from __future__ import annotations

from dataclasses import dataclass, field

from . import abilities as ab
from . import effects as fx
from .entities import Entity
from .stats import Element, Stats
from .utils import C


@dataclass
class Template:
    key: str
    name: str
    base_stats: Stats
    abilities: list[str]
    resistances: dict[str, float] = field(default_factory=dict)
    color: str = C.WHITE
    xp: int = 20
    gold: int = 10
    is_boss: bool = False
    growth: Stats = None  # per-level scaling; defaults applied below


# Default per-level growth for regular foes.
_DEFAULT_GROWTH = Stats(max_hp=14, max_mp=6, atk=4, mag=4, defense=3, res=3, spd=2, crit=0.003)

TEMPLATES: dict[str, Template] = {}


def _t(tmpl: Template) -> Template:
    if tmpl.growth is None:
        tmpl.growth = _DEFAULT_GROWTH
    TEMPLATES[tmpl.key] = tmpl
    return tmpl


# --- common New World foes -------------------------------------------------
_t(Template("goblin", "Goblin", Stats(max_hp=55, max_mp=10, atk=16, mag=5, defense=8, res=6, spd=18),
            ["strike"], color=C.GREEN, xp=14, gold=8))
_t(Template("wolf", "Wild Wolf", Stats(max_hp=48, max_mp=10, atk=20, mag=5, defense=7, res=6, spd=30),
            ["strike", "twin_shot"], color=C.GREY, xp=16, gold=6))
_t(Template("hobgoblin", "Hobgoblin", Stats(max_hp=80, max_mp=15, atk=24, mag=6, defense=14, res=8, spd=18),
            ["strike", "frost_cleave"], color=C.BRIGHT_GREEN, xp=24, gold=14))
_t(Template("skeleton", "Skeleton Warrior", Stats(max_hp=70, max_mp=20, atk=22, mag=8, defense=12, res=10, spd=16),
            ["strike", "magic_arrow"], resistances={Element.DARK: 0.4, Element.HOLY: 1.6, Element.POISON: 0.0},
            color=C.WHITE, xp=22, gold=10))
_t(Template("lizardman", "Lizardman Raider", Stats(max_hp=95, max_mp=15, atk=26, mag=8, defense=16, res=10, spd=22),
            ["strike", "piercing_lance"], color=C.GREEN, xp=30, gold=16))
_t(Template("ogre", "Ogre", Stats(max_hp=130, max_mp=10, atk=32, mag=4, defense=18, res=8, spd=12),
            ["strike", "thunderclap"], color=C.RED, xp=38, gold=22))
_t(Template("giant_frog", "Razor-Tail Frog", Stats(max_hp=85, max_mp=20, atk=20, mag=14, defense=10, res=14, spd=20),
            ["strike", "venom_arrow"], resistances={Element.POISON: 0.2}, color=C.BRIGHT_GREEN, xp=26, gold=12))
_t(Template("wraith", "Wraith", Stats(max_hp=78, max_mp=40, atk=14, mag=26, defense=10, res=20, spd=26),
            ["strike", "negative_burst", "hellflame"],
            resistances={Element.DARK: 0.3, Element.PHYSICAL: 0.5, Element.HOLY: 1.7},
            color=C.BRIGHT_MAGENTA, xp=34, gold=18))
_t(Template("troll", "War Troll", Stats(max_hp=170, max_mp=15, atk=34, mag=6, defense=22, res=10, spd=14),
            ["strike", "frost_cleave"], color=C.GREEN, xp=50, gold=30))
_t(Template("basilisk", "Giant Basilisk", Stats(max_hp=150, max_mp=30, atk=30, mag=18, defense=24, res=16, spd=18),
            ["strike", "venom_arrow", "icy_burst"], resistances={Element.POISON: 0.0},
            color=C.YELLOW, xp=55, gold=34))
_t(Template("dark_young", "Dark Young", Stats(max_hp=200, max_mp=40, atk=36, mag=22, defense=24, res=18, spd=16),
            ["strike", "negative_burst", "venom_arrow"],
            resistances={Element.DARK: 0.4, Element.POISON: 0.3, Element.HOLY: 1.4},
            color=C.MAGENTA, xp=65, gold=40))
_t(Template("vampire_bride", "Vampire Bride", Stats(max_hp=140, max_mp=60, atk=30, mag=24, defense=18, res=20, spd=34),
            ["strike", "piercing_lance", "crimson_nova"],
            resistances={Element.DARK: 0.4, Element.HOLY: 1.6}, color=C.RED, xp=60, gold=44))

# --- bosses ----------------------------------------------------------------
_BOSS_GROWTH = Stats(max_hp=30, max_mp=12, atk=6, mag=6, defense=5, res=5, spd=3, crit=0.004)

_t(Template("hamsuke", "Wise King of the Forest", Stats(max_hp=320, max_mp=40, atk=44, mag=10, defense=34, res=18, spd=22),
            ["strike", "frost_cleave", "fortress_stance"], color=C.YELLOW,
            xp=160, gold=120, is_boss=True, growth=_BOSS_GROWTH))
_t(Template("clementine", "Clementine the Blade", Stats(max_hp=300, max_mp=60, atk=52, mag=16, defense=28, res=22, spd=44),
            ["strike", "valkyrie_dance", "blood_frenzy", "piercing_volley"],
            color=C.BRIGHT_RED, xp=200, gold=160, is_boss=True, growth=_BOSS_GROWTH))
_t(Template("khajiit", "Khajiit the Necromancer", Stats(max_hp=320, max_mp=140, atk=18, mag=46, defense=24, res=34, spd=24),
            ["strike", "negative_burst", "grasp_heart", "despair_aura"],
            resistances={Element.DARK: 0.3, Element.HOLY: 1.6, Element.POISON: 0.0},
            color=C.BRIGHT_MAGENTA, xp=220, gold=170, is_boss=True, growth=_BOSS_GROWTH))
_t(Template("frost_dragon", "Frost Dragon Lord", Stats(max_hp=480, max_mp=120, atk=50, mag=42, defense=40, res=36, spd=26),
            ["strike", "icy_burst", "glittering_blade", "absolute_zero"],
            resistances={Element.ICE: 0.0, Element.FIRE: 1.4, Element.PHYSICAL: 0.7},
            color=C.BRIGHT_CYAN, xp=320, gold=260, is_boss=True, growth=_BOSS_GROWTH))
_t(Template("jaldabaoth", "Jaldabaoth, Demon Emperor", Stats(max_hp=620, max_mp=200, atk=46, mag=52, defense=38, res=42, spd=34),
            ["strike", "flames_of_hell", "hellfire_wall", "evil_lord_wrath", "meteor_fall"],
            resistances={Element.FIRE: 0.0, Element.DARK: 0.4, Element.ICE: 1.3, Element.HOLY: 1.4},
            color=C.BRIGHT_RED, xp=500, gold=400, is_boss=True, growth=_BOSS_GROWTH))


def scale_stats(base: Stats, growth: Stats, level: int) -> Stats:
    result = base.copy()
    for _ in range(level - 1):
        result = result.add(growth)
    return result


def make_enemy(key: str, level: int = 1) -> Entity:
    tmpl = TEMPLATES[key]
    stats = scale_stats(tmpl.base_stats, tmpl.growth, level)
    enemy = Entity(tmpl.name, stats, ability_keys=list(tmpl.abilities), side="enemy",
                   resistances=dict(tmpl.resistances), color_code=tmpl.color)
    enemy.template_key = key
    enemy.level = level
    enemy.xp_reward = int(tmpl.xp * (1 + 0.35 * (level - 1)))
    enemy.gold_reward = int(tmpl.gold * (1 + 0.3 * (level - 1)))
    enemy.is_boss = tmpl.is_boss
    return enemy


# ---------------------------------------------------------------------------
# Summonable creatures (used by player/enemy summon abilities)
# ---------------------------------------------------------------------------

def summon_death_knight(level: int = 1) -> Entity:
    stats = scale_stats(
        Stats(max_hp=120, max_mp=0, atk=30, mag=0, defense=26, res=16, spd=16),
        Stats(max_hp=14, atk=4, defense=3, res=2, spd=1), level)
    e = Entity("Death Knight", stats, ["strike", "frost_cleave"], side="party",
               resistances={Element.DARK: 0.2, Element.HOLY: 1.5, Element.POISON: 0.0},
               color_code=C.GREY)
    return e


def summon_einherjar(level: int = 1) -> Entity:
    stats = scale_stats(
        Stats(max_hp=90, max_mp=0, atk=28, mag=0, defense=18, res=16, spd=30),
        Stats(max_hp=10, atk=4, defense=2, res=2, spd=2), level)
    e = Entity("Einherjar", stats, ["strike", "piercing_lance"], side="party", color_code=C.BRIGHT_WHITE)
    return e


def summon_beast(level: int = 1) -> Entity:
    stats = scale_stats(
        Stats(max_hp=100, max_mp=0, atk=30, mag=0, defense=16, res=12, spd=34),
        Stats(max_hp=12, atk=4, defense=2, res=2, spd=2), level)
    e = Entity("Sleipnir Beast", stats, ["strike", "twin_shot"], side="party", color_code=C.BRIGHT_GREEN)
    return e


def wire_summon_abilities(player_level_getter):
    """Attach summon effects to the summon abilities, scaling to the player's level.

    `player_level_getter` is a callable returning the current level so summons
    scale alongside the hero.
    """
    ab.get("create_undead").effects = [
        fx.Summon(lambda: summon_death_knight(player_level_getter()), count=1)]
    ab.get("einherjar").effects = [
        fx.Summon(lambda: summon_einherjar(player_level_getter()), count=1)]
    ab.get("beast_call").effects = [
        fx.Summon(lambda: summon_beast(player_level_getter()), count=1)]
