"""Status effects and the composable effect components abilities are built from.

A *StatusEffect* lives on an entity for a number of turns (DoTs, buffs, stuns...).
An *Effect* is a one-shot component that an ability applies when cast
(deal damage, heal, apply a status, summon a creature, ...).
"""

from __future__ import annotations

from .stats import Element
from .utils import C, chance, color, rng, roll_variance

# ---------------------------------------------------------------------------
# Status effects (persist across turns)
# ---------------------------------------------------------------------------


class StatusEffect:
    """Base class for lingering effects applied to an entity."""

    name = "Status"
    icon = "?"
    col = C.WHITE
    # Stat multipliers/additions applied while active.
    stat_mods: dict[str, float] = {}
    blocks_turn = False  # stun / freeze prevent the entity from acting
    stackable = False

    def __init__(self, duration: int, potency: int = 0, source=None):
        self.duration = duration
        self.potency = potency
        self.source = source

    def on_apply(self, target, battle):
        pass

    def on_turn_start(self, target, battle):
        """Called at the start of the afflicted entity's turn (DoT/HoT tick)."""
        pass

    def on_expire(self, target, battle):
        pass

    def label(self) -> str:
        return color(f"{self.icon}{self.name}({self.duration})", self.col)


class Poison(StatusEffect):
    name, icon, col = "Poison", "☠", C.BRIGHT_GREEN

    def on_turn_start(self, target, battle):
        dmg = roll_variance(self.potency)
        target.take_pure_damage(dmg)
        battle.log(f"{target.cname()} suffers {color(str(dmg), C.BRIGHT_GREEN)} poison damage.")


class Burn(StatusEffect):
    name, icon, col = "Burn", "🔥", C.BRIGHT_RED

    def on_turn_start(self, target, battle):
        dmg = roll_variance(self.potency)
        target.take_pure_damage(dmg)
        battle.log(f"{target.cname()} is scorched for {color(str(dmg), C.BRIGHT_RED)} damage.")


class Bleed(StatusEffect):
    name, icon, col = "Bleed", "🩸", C.RED

    def on_turn_start(self, target, battle):
        dmg = roll_variance(self.potency)
        target.take_pure_damage(dmg)
        battle.log(f"{target.cname()} bleeds for {color(str(dmg), C.RED)} damage.")


class Regen(StatusEffect):
    name, icon, col = "Regen", "✚", C.BRIGHT_GREEN

    def on_turn_start(self, target, battle):
        healed = target.heal(roll_variance(self.potency))
        if healed:
            battle.log(f"{target.cname()} regenerates {color(str(healed), C.BRIGHT_GREEN)} HP.")


class Stun(StatusEffect):
    name, icon, col, blocks_turn = "Stun", "✦", C.BRIGHT_YELLOW, True


class Freeze(StatusEffect):
    name, icon, col, blocks_turn = "Frozen", "❄", C.BRIGHT_CYAN, True


class _StatMod(StatusEffect):
    """Helper for flat stat changes; subclasses set stat_mods."""


class AttackUp(_StatMod):
    name, icon, col = "ATK Up", "▲", C.BRIGHT_RED
    def __init__(self, duration, potency=0, source=None):
        super().__init__(duration, potency, source)
        self.stat_mods = {"atk": potency, "mag": potency}


class AttackDown(_StatMod):
    name, icon, col = "ATK Down", "▼", C.RED
    def __init__(self, duration, potency=0, source=None):
        super().__init__(duration, potency, source)
        self.stat_mods = {"atk": -potency, "mag": -potency}


class DefenseUp(_StatMod):
    name, icon, col = "DEF Up", "▲", C.BRIGHT_BLUE
    def __init__(self, duration, potency=0, source=None):
        super().__init__(duration, potency, source)
        self.stat_mods = {"defense": potency, "res": potency}


class DefenseDown(_StatMod):
    name, icon, col = "DEF Down", "▼", C.BLUE
    def __init__(self, duration, potency=0, source=None):
        super().__init__(duration, potency, source)
        self.stat_mods = {"defense": -potency, "res": -potency}


class Haste(_StatMod):
    name, icon, col = "Haste", "»", C.BRIGHT_CYAN
    def __init__(self, duration, potency=0, source=None):
        super().__init__(duration, potency, source)
        self.stat_mods = {"spd": potency}


class Slow(_StatMod):
    name, icon, col = "Slow", "«", C.CYAN
    def __init__(self, duration, potency=0, source=None):
        super().__init__(duration, potency, source)
        self.stat_mods = {"spd": -potency}


class Shield(StatusEffect):
    """Absorbs incoming damage until its pool (potency) is depleted."""

    name, icon, col = "Shield", "◈", C.BRIGHT_WHITE

    def on_apply(self, target, battle):
        target.shield += self.potency

    def on_expire(self, target, battle):
        target.shield = max(0, target.shield - self.potency)


# ---------------------------------------------------------------------------
# Effect components (one-shot, applied when an ability is cast)
# ---------------------------------------------------------------------------


class Effect:
    def apply(self, user, target, battle):
        raise NotImplementedError


class Damage(Effect):
    """Deal damage scaling off one of the user's stats and reduced by a defense stat."""

    def __init__(self, power, scaling="mag", element=Element.PHYSICAL, scale_ratio=1.0,
                 ignore_defense=0.0, lifesteal=0.0):
        self.power = power
        self.scaling = scaling
        self.element = element
        self.scale_ratio = scale_ratio
        self.ignore_defense = ignore_defense
        self.lifesteal = lifesteal

    def apply(self, user, target, battle):
        if not target.alive:
            return
        stat = user.effective(self.scaling)
        raw = self.power + stat * self.scale_ratio
        is_crit = chance(user.effective_crit())
        if is_crit:
            raw *= 1.6
        dealt = target.take_damage(raw, self.element, ignore_defense=self.ignore_defense)
        crit_txt = color(" CRIT!", C.BOLD, C.BRIGHT_YELLOW) if is_crit else ""
        elem_txt = "" if self.element == Element.PHYSICAL else f" {self.element.lower()}"
        battle.log(f"{user.cname()} hits {target.cname()} for "
                   f"{color(str(dealt), C.BRIGHT_RED)}{elem_txt} damage.{crit_txt}")
        if self.lifesteal and dealt > 0:
            healed = user.heal(int(dealt * self.lifesteal))
            if healed:
                battle.log(f"{user.cname()} drains {color(str(healed), C.BRIGHT_GREEN)} HP.")
        if not target.alive:
            battle.log(f"{target.cname()} {color('has been slain!', C.BOLD, C.RED)}")


class Heal(Effect):
    def __init__(self, power, scaling="mag", scale_ratio=1.0):
        self.power = power
        self.scaling = scaling
        self.scale_ratio = scale_ratio

    def apply(self, user, target, battle):
        amount = self.power + user.effective(self.scaling) * self.scale_ratio
        revived = not target.alive
        healed = target.heal(roll_variance(amount))
        if revived and healed:
            battle.log(f"{target.cname()} is {color('restored to life!', C.BRIGHT_GREEN)}")
        elif healed:
            battle.log(f"{target.cname()} recovers {color(str(healed), C.BRIGHT_GREEN)} HP.")
        else:
            battle.log(f"{target.cname()} is already at full health.")


class RestoreMP(Effect):
    def __init__(self, amount):
        self.amount = amount

    def apply(self, user, target, battle):
        target.mp = min(target.max_mp, target.mp + self.amount)
        battle.log(f"{target.cname()} recovers {color(str(self.amount), C.BRIGHT_BLUE)} MP.")


class Inflict(Effect):
    """Apply a StatusEffect to the target with a given chance."""

    def __init__(self, status_cls, duration, potency=0, prob=1.0):
        self.status_cls = status_cls
        self.duration = duration
        self.potency = potency
        self.prob = prob

    def apply(self, user, target, battle):
        if not target.alive:
            return
        # Scale debuff resistance lightly off the target's resilience for damage statuses.
        if not chance(self.prob):
            battle.log(f"{target.cname()} resists {self.status_cls.name}.")
            return
        status = self.status_cls(self.duration, self.potency, source=user)
        target.add_status(status, battle)


class Cleanse(Effect):
    """Remove negative status effects from the target."""

    NEGATIVE = (Poison, Burn, Bleed, Stun, Freeze, AttackDown, DefenseDown, Slow)

    def apply(self, user, target, battle):
        removed = [s for s in target.statuses if isinstance(s, self.NEGATIVE)]
        for s in removed:
            target.remove_status(s, battle)
        if removed:
            battle.log(f"{target.cname()} is cleansed of {len(removed)} affliction(s).")


class Summon(Effect):
    """Summon an allied creature to fight alongside the user."""

    def __init__(self, factory, count=1, duration=None):
        self.factory = factory  # callable -> Entity
        self.count = count
        self.duration = duration

    def apply(self, user, target, battle):
        for _ in range(self.count):
            creature = self.factory()
            creature.summon_duration = self.duration
            creature.is_summon = True
            battle.add_summon(creature, user.side)
            battle.log(f"{user.cname()} summons {color(creature.name, C.BRIGHT_MAGENTA)}!")


class MultiHit(Effect):
    """Repeat an inner effect several times against (re-rolled) targets handled by caller."""

    def __init__(self, inner: Effect, hits: int):
        self.inner = inner
        self.hits = hits

    def apply(self, user, target, battle):
        for _ in range(self.hits):
            if not target.alive:
                break
            self.inner.apply(user, target, battle)
