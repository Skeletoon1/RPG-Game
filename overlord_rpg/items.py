"""Consumable items used in and out of combat."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Callable

from .utils import C, color


@dataclass
class Item:
    key: str
    name: str
    description: str
    price: int
    battle_usable: bool
    apply: Callable  # apply(user, battle_or_none) -> message string
    color: str = C.WHITE


ITEMS: dict[str, Item] = {}


def _add(item: Item) -> Item:
    ITEMS[item.key] = item
    return item


def _heal(amount):
    def fn(user, battle=None):
        healed = user.heal(amount)
        return f"{user.name} recovers {healed} HP."
    return fn


def _mana(amount):
    def fn(user, battle=None):
        before = user.mp
        user.mp = min(user.max_mp, user.mp + amount)
        return f"{user.name} recovers {user.mp - before} MP."
    return fn


def _full(user, battle=None):
    user.hp = user.max_hp
    user.mp = user.max_mp
    return f"{user.name} is fully restored!"


def _cleanse(user, battle=None):
    from .effects import Cleanse
    if battle is not None:
        Cleanse().apply(user, user, battle)
        return f"{user.name} is cleansed of afflictions."
    user.statuses = [s for s in user.statuses if not getattr(s, "blocks_turn", False)]
    return f"{user.name} is cleansed of afflictions."


def _revive(amount):
    def fn(user, battle=None):
        user.heal(amount)
        return f"{user.name} returns from the brink with {amount} HP."
    return fn


_add(Item("potion", "Healing Potion", "Restore 80 HP.", 30, True, _heal(80), C.BRIGHT_GREEN))
_add(Item("hi_potion", "Greater Potion", "Restore 200 HP.", 80, True, _heal(200), C.BRIGHT_GREEN))
_add(Item("ether", "Mana Ether", "Restore 60 MP.", 40, True, _mana(60), C.BRIGHT_BLUE))
_add(Item("hi_ether", "Greater Ether", "Restore 150 MP.", 100, True, _mana(150), C.BRIGHT_BLUE))
_add(Item("elixir", "World Elixir", "Fully restore HP and MP.", 250, True, _full, C.BRIGHT_YELLOW))
_add(Item("antidote", "Panacea", "Remove negative status effects.", 25, True, _cleanse, C.BRIGHT_CYAN))
_add(Item("phoenix", "Phoenix Down", "Revive with 120 HP (use on yourself if downed).", 150, True,
          _revive(120), C.BRIGHT_RED))


def get(key: str) -> Item:
    return ITEMS[key]


def describe(key: str) -> str:
    item = ITEMS[key]
    return f"{color(item.name, item.color)} - {color(item.description, C.DIM)}"
