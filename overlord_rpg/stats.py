"""Core stat block and elemental definitions."""

from __future__ import annotations

from dataclasses import asdict, dataclass


class Element:
    PHYSICAL = "Physical"
    FIRE = "Fire"
    ICE = "Ice"
    LIGHTNING = "Lightning"
    DARK = "Dark"
    HOLY = "Holy"
    POISON = "Poison"
    ARCANE = "Arcane"


ELEMENT_COLORS = {
    Element.PHYSICAL: "\033[37m",
    Element.FIRE: "\033[91m",
    Element.ICE: "\033[96m",
    Element.LIGHTNING: "\033[93m",
    Element.DARK: "\033[95m",
    Element.HOLY: "\033[97m",
    Element.POISON: "\033[92m",
    Element.ARCANE: "\033[94m",
}


@dataclass
class Stats:
    """Combat statistics shared by every entity.

    - max_hp / max_mp : resource pools
    - atk             : physical power (scales weapon-style abilities)
    - mag             : magical power (scales spells)
    - defense         : reduces incoming physical damage
    - res             : reduces incoming magical damage
    - spd             : determines turn order
    - crit            : critical-hit chance (0.0 - 1.0)
    """

    max_hp: int = 100
    max_mp: int = 50
    atk: int = 20
    mag: int = 20
    defense: int = 15
    res: int = 15
    spd: int = 20
    crit: float = 0.05

    def copy(self) -> "Stats":
        return Stats(**asdict(self))

    def add(self, other: "Stats") -> "Stats":
        return Stats(
            max_hp=self.max_hp + other.max_hp,
            max_mp=self.max_mp + other.max_mp,
            atk=self.atk + other.atk,
            mag=self.mag + other.mag,
            defense=self.defense + other.defense,
            res=self.res + other.res,
            spd=self.spd + other.spd,
            crit=round(self.crit + other.crit, 4),
        )

    def to_dict(self) -> dict:
        return asdict(self)

    @classmethod
    def from_dict(cls, data: dict) -> "Stats":
        return cls(**data)
