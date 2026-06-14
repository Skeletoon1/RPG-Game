"""World map: chapters of the campaign through the New World."""

from __future__ import annotations

from dataclasses import dataclass, field

from .utils import rng


@dataclass
class Chapter:
    key: str
    name: str
    intro: str
    level: int                       # enemy level for this chapter
    pool: list[str]                  # regular enemy template keys
    boss: str                        # boss template key
    battles_before_boss: int = 3
    encounter_size: tuple = (1, 3)
    outro: str = ""


CHAPTERS: list[Chapter] = [
    Chapter(
        "carne", "Chapter 1 — The Village of Carne",
        ("Your reign begins. Knights and goblins raid the frontier village of "
         "Carne. Cut them down and announce your arrival to the New World."),
        level=1, pool=["goblin", "wolf", "skeleton"], boss="hamsuke",
        battles_before_boss=3, encounter_size=(1, 2),
        outro="The Wise King of the Forest bows to your power. The frontier is yours.",
    ),
    Chapter(
        "forest", "Chapter 2 — The Great Forest of Tob",
        ("Beasts and monsters stir in the ancient forest. Tame it through "
         "overwhelming force."),
        level=3, pool=["wolf", "hobgoblin", "giant_frog", "ogre"], boss="frost_dragon",
        battles_before_boss=4, encounter_size=(2, 3),
        outro="Even a Dragon Lord could not stand against you. Word of a new power spreads.",
    ),
    Chapter(
        "lizard", "Chapter 3 — The Lizardman Wetlands",
        ("United lizardman tribes muster to resist the undead legions. Crush "
         "their defiance utterly."),
        level=6, pool=["lizardman", "giant_frog", "basilisk", "troll"], boss="clementine",
        battles_before_boss=4, encounter_size=(2, 3),
        outro="The wetlands are subjugated. A familiar killer falls before you.",
    ),
    Chapter(
        "eryuentiu", "Chapter 4 — The Catacombs of Khajiit",
        ("A rival necromancer raises the dead to challenge your dominion. Show "
         "him what true death magic looks like."),
        level=9, pool=["skeleton", "wraith", "vampire_bride", "dark_young"], boss="khajiit",
        battles_before_boss=4, encounter_size=(2, 4),
        outro="The pretender's undead crumble to dust. None may rival your necromancy.",
    ),
    Chapter(
        "throne", "Chapter 5 — The Demon Emperor's Capital",
        ("Jaldabaoth, the Demon Emperor, lays siege to the royal capital. End "
         "him and let the world know who truly rules."),
        level=12, pool=["dark_young", "wraith", "vampire_bride", "troll"], boss="jaldabaoth",
        battles_before_boss=5, encounter_size=(3, 4),
        outro="Jaldabaoth is no more. The New World kneels. Your name echoes through eternity.",
    ),
]


def chapter_index(key: str) -> int:
    for i, ch in enumerate(CHAPTERS):
        if ch.key == key:
            return i
    return 0


def roll_encounter(chapter: Chapter) -> list[tuple[str, int]]:
    """Return a list of (template_key, level) for a random regular encounter."""
    lo, hi = chapter.encounter_size
    count = rng.randint(lo, hi)
    return [(rng.choice(chapter.pool), chapter.level) for _ in range(count)]
