"""Ability definitions and the master ability registry.

Each Ability bundles an MP cost, a cooldown, a target mode, and a list of
effect components to apply. Spells are intentionally flavored after the
magic and martial arts of the Overlord setting.
"""

from __future__ import annotations

from . import effects as fx
from .stats import Element
from .utils import C, color


class Target:
    SELF = "self"
    ONE_ENEMY = "one_enemy"
    ALL_ENEMIES = "all_enemies"
    ONE_ALLY = "one_ally"
    ALL_ALLIES = "all_allies"
    DEAD_ALLY = "dead_ally"


class Ability:
    def __init__(self, key, name, mp_cost, target, effects, cooldown=0,
                 description="", tier="spell", element=Element.ARCANE):
        self.key = key
        self.name = name
        self.mp_cost = mp_cost
        self.target = target
        self.effects = effects
        self.cooldown = cooldown
        self.description = description
        self.tier = tier  # "martial", "spell", "super" (super-tier magic)
        self.element = element

    def is_offensive(self) -> bool:
        return self.target in (Target.ONE_ENEMY, Target.ALL_ENEMIES)

    def is_aoe(self) -> bool:
        return self.target in (Target.ALL_ENEMIES, Target.ALL_ALLIES)

    def colored_name(self) -> str:
        col = {"martial": C.BRIGHT_RED, "spell": C.BRIGHT_BLUE,
               "super": C.BOLD + C.BRIGHT_MAGENTA}.get(self.tier, C.WHITE)
        return color(self.name, col)

    def summary(self) -> str:
        tier_tag = {"martial": "Martial Art", "spell": "Spell",
                    "super": "Super-Tier"}.get(self.tier, "")
        return (f"{self.colored_name()} "
                f"{color(f'[{self.mp_cost} MP]', C.BRIGHT_BLUE)} "
                f"{color(f'({tier_tag})', C.DIM)}\n    {color(self.description, C.DIM)}")


# ---------------------------------------------------------------------------
# Registry
# ---------------------------------------------------------------------------

REGISTRY: dict[str, Ability] = {}


def reg(ability: Ability) -> Ability:
    REGISTRY[ability.key] = ability
    return ability


def get(key: str) -> Ability:
    return REGISTRY[key]


# ===========================================================================
# UNIVERSAL
# ===========================================================================

reg(Ability(
    "strike", "Strike", 0, Target.ONE_ENEMY,
    [fx.Damage(8, "atk", Element.PHYSICAL, 1.0)],
    description="A basic physical attack. Costs no MP.",
    tier="martial", element=Element.PHYSICAL,
))

# ===========================================================================
# OVERLORD  -- Eternal Death Sovereign (Ainz Ooal Gown archetype)
# Undead magic caster: death magic, undead summons, debuffs.
# ===========================================================================

reg(Ability(
    "magic_arrow", "Magic Arrow", 4, Target.ONE_ENEMY,
    [fx.MultiHit(fx.Damage(7, "mag", Element.ARCANE, 0.7), hits=3)],
    description="Fire three bolts of pure magic at a single foe.",
    tier="spell", element=Element.ARCANE,
))
reg(Ability(
    "negative_burst", "Negative Burst", 14, Target.ALL_ENEMIES,
    [fx.Damage(18, "mag", Element.DARK, 0.9)],
    cooldown=1,
    description="Unleash negative energy that withers all enemies.",
    tier="spell", element=Element.DARK,
))
reg(Ability(
    "grasp_heart", "Grasp Heart", 22, Target.ONE_ENEMY,
    [fx.Damage(40, "mag", Element.DARK, 1.4, ignore_defense=0.5),
     fx.Inflict(fx.Bleed, 2, 10, prob=0.6)],
    cooldown=2,
    description="Crush a foe's heart in your grip. Pierces defenses; may cause bleeding.",
    tier="spell", element=Element.DARK,
))
reg(Ability(
    "create_undead", "Create Greater Undead", 18, Target.SELF,
    [],  # summon factory wired in enemies/summons module to avoid import cycle
    cooldown=3,
    description="Summon a Death Knight to fight at your side.",
    tier="spell", element=Element.DARK,
))
reg(Ability(
    "despair_aura", "Despair Aura", 16, Target.ALL_ENEMIES,
    [fx.Inflict(fx.AttackDown, 3, 12, prob=0.85),
     fx.Inflict(fx.DefenseDown, 3, 12, prob=0.85)],
    cooldown=3,
    description="Radiate dread, sapping the strength and guard of all enemies.",
    tier="spell", element=Element.DARK,
))
reg(Ability(
    "iron_maiden", "La Iron Maiden", 30, Target.ONE_ENEMY,
    [fx.Damage(55, "mag", Element.DARK, 1.6, ignore_defense=0.3),
     fx.Inflict(fx.Stun, 1, prob=0.5)],
    cooldown=3,
    description="Encase a foe in a crushing maiden of force. Heavy damage, may stun.",
    tier="spell", element=Element.DARK,
))
reg(Ability(
    "goal_of_all_life_is_death", "Goal of All Life is Death", 60, Target.ALL_ENEMIES,
    [fx.Damage(50, "mag", Element.DARK, 1.2, ignore_defense=0.4),
     fx.Inflict(fx.Poison, 3, 18, prob=0.9)],
    cooldown=5,
    description="SUPER-TIER. Instant death sweeps the battlefield, rotting all who survive.",
    tier="super", element=Element.DARK,
))

# ===========================================================================
# TRUE VAMPIRE -- Crimson Valkyrie (Shalltear Bloodfallen archetype)
# Fast blood-knight: lifesteal, blood magic, valkyrie martial arts.
# ===========================================================================

reg(Ability(
    "piercing_lance", "Piercing Lance", 5, Target.ONE_ENEMY,
    [fx.Damage(16, "atk", Element.PHYSICAL, 1.1, lifesteal=0.3)],
    description="A swift lance thrust that drains the victim's vitality.",
    tier="martial", element=Element.PHYSICAL,
))
reg(Ability(
    "blood_frenzy", "Blood Frenzy", 12, Target.SELF,
    [fx.Inflict(fx.AttackUp, 3, 18), fx.Inflict(fx.Haste, 3, 15)],
    cooldown=3,
    description="Enter a crimson frenzy, sharply raising attack and speed.",
    tier="martial", element=Element.PHYSICAL,
))
reg(Ability(
    "crimson_nova", "Crimson Nova", 16, Target.ALL_ENEMIES,
    [fx.Damage(20, "mag", Element.DARK, 0.8, lifesteal=0.2)],
    cooldown=2,
    description="Erupt a sphere of blood, damaging all foes and healing you.",
    tier="spell", element=Element.DARK,
))
reg(Ability(
    "valkyrie_dance", "Valkyrie's Dance", 18, Target.ONE_ENEMY,
    [fx.MultiHit(fx.Damage(12, "atk", Element.PHYSICAL, 0.8, lifesteal=0.25), hits=4)],
    cooldown=2,
    description="A whirling four-strike lance dance, each hit stealing life.",
    tier="martial", element=Element.PHYSICAL,
))
reg(Ability(
    "blood_pool", "Pool of Blood", 14, Target.SELF,
    [fx.Heal(40, "mag", 0.8), fx.Cleanse()],
    cooldown=3,
    description="Submerge in regenerating blood, healing and purging afflictions.",
    tier="spell", element=Element.DARK,
))
reg(Ability(
    "einherjar", "Summon Einherjar", 22, Target.SELF,
    [],  # summon factory wired later
    cooldown=4,
    description="Call a spectral Valkyrie warrior to your side.",
    tier="spell", element=Element.DARK,
))

# ===========================================================================
# FROST INSECTOR -- Glacial Warlord (Cocytus archetype)
# Tanky ice melee: high defense, ice martial arts, control.
# ===========================================================================

reg(Ability(
    "frost_cleave", "Frost Cleave", 5, Target.ONE_ENEMY,
    [fx.Damage(15, "atk", Element.ICE, 1.1),
     fx.Inflict(fx.Slow, 2, 8, prob=0.5)],
    description="A frozen blade strike that may slow the target.",
    tier="martial", element=Element.ICE,
))
reg(Ability(
    "icy_burst", "Icy Burst Saint", 16, Target.ALL_ENEMIES,
    [fx.Damage(18, "atk", Element.ICE, 0.9),
     fx.Inflict(fx.Freeze, 1, prob=0.3)],
    cooldown=2,
    description="A blizzard erupts around you; foes may freeze solid.",
    tier="martial", element=Element.ICE,
))
reg(Ability(
    "fortress_stance", "Fortress Stance", 10, Target.SELF,
    [fx.Inflict(fx.DefenseUp, 4, 25), fx.Inflict(fx.Shield, 4, 60)],
    cooldown=3,
    description="Brace as an immovable fortress: raise defense and gain a shield.",
    tier="martial", element=Element.ICE,
))
reg(Ability(
    "frozen_grip", "Frozen Grip", 14, Target.ONE_ENEMY,
    [fx.Damage(24, "atk", Element.ICE, 1.0),
     fx.Inflict(fx.Freeze, 2, prob=0.65)],
    cooldown=3,
    description="Clamp a foe in ice, dealing damage and likely freezing them.",
    tier="martial", element=Element.ICE,
))
reg(Ability(
    "glittering_blade", "Glittering Blade of Ice", 20, Target.ONE_ENEMY,
    [fx.Damage(48, "atk", Element.ICE, 1.5, ignore_defense=0.25)],
    cooldown=2,
    description="A masterwork ice blade strike that partly bypasses armor.",
    tier="martial", element=Element.ICE,
))
reg(Ability(
    "absolute_zero", "Absolute Zero Field", 40, Target.ALL_ENEMIES,
    [fx.Damage(42, "atk", Element.ICE, 1.1),
     fx.Inflict(fx.Freeze, 2, prob=0.7)],
    cooldown=4,
    description="SUPER-TIER. Plunge the field to absolute zero, freezing all foes.",
    tier="super", element=Element.ICE,
))

# ===========================================================================
# ARCH DEMON -- Infernal Strategist (Demiurge archetype)
# Fire + illusion caster: burns, debuffs, raw burst.
# ===========================================================================

reg(Ability(
    "hellflame", "Hellflame", 5, Target.ONE_ENEMY,
    [fx.Damage(14, "mag", Element.FIRE, 1.0),
     fx.Inflict(fx.Burn, 2, 8, prob=0.6)],
    description="A jet of hellfire that often leaves the target burning.",
    tier="spell", element=Element.FIRE,
))
reg(Ability(
    "flames_of_hell", "Flames of Hell", 18, Target.ALL_ENEMIES,
    [fx.Damage(22, "mag", Element.FIRE, 0.95),
     fx.Inflict(fx.Burn, 2, 10, prob=0.7)],
    cooldown=2,
    description="Engulf the battlefield in infernal flame.",
    tier="spell", element=Element.FIRE,
))
reg(Ability(
    "hellfire_wall", "Hellfire Wall", 24, Target.ONE_ENEMY,
    [fx.Damage(36, "mag", Element.FIRE, 1.3),
     fx.Inflict(fx.Burn, 3, 14, prob=0.9)],
    cooldown=2,
    description="A towering wall of fire scorches a foe with lasting burns.",
    tier="spell", element=Element.FIRE,
))
reg(Ability(
    "evil_lord_wrath", "Evil Lord: Wrath", 20, Target.ONE_ENEMY,
    [fx.Damage(30, "mag", Element.DARK, 1.1),
     fx.Inflict(fx.AttackDown, 3, 16, prob=0.9)],
    cooldown=3,
    description="Summon a fragment of wrath to maul and weaken a foe.",
    tier="spell", element=Element.DARK,
))
reg(Ability(
    "mind_snare", "Insanity Snare", 14, Target.ONE_ENEMY,
    [fx.Inflict(fx.Stun, 2, prob=0.7), fx.Inflict(fx.DefenseDown, 3, 14, prob=0.8)],
    cooldown=3,
    description="Ensnare a mind in illusion, likely stunning and weakening it.",
    tier="spell", element=Element.DARK,
))
reg(Ability(
    "meteor_fall", "Meteor Fall", 38, Target.ALL_ENEMIES,
    [fx.Damage(50, "mag", Element.FIRE, 1.3),
     fx.Inflict(fx.Burn, 3, 16, prob=0.85)],
    cooldown=4,
    description="SUPER-TIER. Call down a meteor to immolate all enemies.",
    tier="super", element=Element.FIRE,
))

# ===========================================================================
# BEAST RANGER -- Wild Warden (Aura Bella Fiora archetype)
# Agile ranged DPS with beast summons and debuffs.
# ===========================================================================

reg(Ability(
    "twin_shot", "Twin Shot", 4, Target.ONE_ENEMY,
    [fx.MultiHit(fx.Damage(9, "atk", Element.PHYSICAL, 0.8), hits=2)],
    description="Loose two arrows in quick succession.",
    tier="martial", element=Element.PHYSICAL,
))
reg(Ability(
    "venom_arrow", "Venom Arrow", 8, Target.ONE_ENEMY,
    [fx.Damage(14, "atk", Element.POISON, 0.9),
     fx.Inflict(fx.Poison, 3, 12, prob=0.85)],
    cooldown=1,
    description="A poison-tipped arrow that festers over time.",
    tier="martial", element=Element.POISON,
))
reg(Ability(
    "hunters_mark", "Hunter's Mark", 10, Target.ONE_ENEMY,
    [fx.Inflict(fx.DefenseDown, 4, 20, prob=1.0)],
    cooldown=2,
    description="Mark a target, sharply lowering its defenses.",
    tier="martial", element=Element.PHYSICAL,
))
reg(Ability(
    "beast_call", "Beast Call", 16, Target.SELF,
    [],  # summon factory wired later
    cooldown=3,
    description="Summon a tamed Sleipnir beast to maul your enemies.",
    tier="martial", element=Element.PHYSICAL,
))
reg(Ability(
    "arrow_storm", "Arrow Storm", 18, Target.ALL_ENEMIES,
    [fx.MultiHit(fx.Damage(10, "atk", Element.PHYSICAL, 0.6), hits=2)],
    cooldown=2,
    description="Rain a storm of arrows on every enemy.",
    tier="martial", element=Element.PHYSICAL,
))
reg(Ability(
    "piercing_volley", "Piercing Volley", 22, Target.ONE_ENEMY,
    [fx.Damage(46, "atk", Element.PHYSICAL, 1.4, ignore_defense=0.4)],
    cooldown=2,
    description="A focused armor-piercing volley into a single target.",
    tier="martial", element=Element.PHYSICAL,
))

# ===========================================================================
# BATTLE MAID -- Pleiades Combat Servant (Narberal / battle maids archetype)
# Versatile hybrid: heals, buffs the party, and lightning martial arts.
# ===========================================================================

reg(Ability(
    "thunderclap", "Thunderclap Strike", 5, Target.ONE_ENEMY,
    [fx.Damage(15, "atk", Element.LIGHTNING, 1.0),
     fx.Inflict(fx.Stun, 1, prob=0.25)],
    description="A lightning-charged blow that may briefly stun.",
    tier="martial", element=Element.LIGHTNING,
))
reg(Ability(
    "dragon_lightning", "Dragon Lightning", 16, Target.ALL_ENEMIES,
    [fx.Damage(20, "mag", Element.LIGHTNING, 0.9)],
    cooldown=2,
    description="A serpent of lightning lashes every foe.",
    tier="spell", element=Element.LIGHTNING,
))
reg(Ability(
    "field_dressing", "Field Dressing", 10, Target.ONE_ALLY,
    [fx.Heal(35, "mag", 1.0), fx.Cleanse()],
    cooldown=1,
    description="Patch up an ally, healing and cleansing afflictions.",
    tier="spell", element=Element.HOLY,
))
reg(Ability(
    "battle_standard", "Battle Standard", 16, Target.ALL_ALLIES,
    [fx.Inflict(fx.AttackUp, 3, 14), fx.Inflict(fx.DefenseUp, 3, 10)],
    cooldown=3,
    description="Raise a rallying standard, buffing the whole party.",
    tier="martial", element=Element.HOLY,
))
reg(Ability(
    "greater_heal", "Greater Heal", 20, Target.ALL_ALLIES,
    [fx.Heal(30, "mag", 0.7)],
    cooldown=3,
    description="A wave of restoration mends every ally.",
    tier="spell", element=Element.HOLY,
))
reg(Ability(
    "resurrection", "Resurrection", 30, Target.DEAD_ALLY,
    [fx.Heal(60, "mag", 1.0)],
    cooldown=4,
    description="Call a fallen ally back to life with restored health.",
    tier="spell", element=Element.HOLY,
))
