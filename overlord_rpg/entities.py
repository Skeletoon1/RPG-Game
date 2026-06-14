"""Entities: the base combatant plus Player and Enemy/summon specializations."""

from __future__ import annotations

from . import abilities as ab
from .stats import Element, Stats
from .utils import C, color, hp_bar, mp_bar, rng, roll_variance


class Entity:
    def __init__(self, name, stats: Stats, ability_keys=None, side="enemy",
                 resistances=None, color_code=C.WHITE):
        self.name = name
        self.base_stats = stats
        self.max_hp = stats.max_hp
        self.max_mp = stats.max_mp
        self.hp = stats.max_hp
        self.mp = stats.max_mp
        self.ability_keys = list(ability_keys or ["strike"])
        self.side = side  # "party" or "enemy"
        self.statuses: list = []
        self.shield = 0
        self.resistances = resistances or {}
        self.cooldowns: dict[str, int] = {}
        self.color_code = color_code
        self.is_summon = False
        self.summon_duration = None
        self.defending = False

    # -- naming -------------------------------------------------------------
    def cname(self) -> str:
        return color(self.name, self.color_code, C.BOLD)

    # -- state --------------------------------------------------------------
    @property
    def alive(self) -> bool:
        return self.hp > 0

    def effective(self, stat: str) -> float:
        base = getattr(self.base_stats, stat)
        for s in self.statuses:
            base += s.stat_mods.get(stat, 0)
        if self.defending and stat in ("defense", "res"):
            base += base * 0.5
        return max(0, base)

    def effective_crit(self) -> float:
        crit = self.base_stats.crit
        return max(0.0, min(0.95, crit))

    # -- abilities ----------------------------------------------------------
    def abilities(self) -> list:
        return [ab.get(k) for k in self.ability_keys]

    def usable_abilities(self) -> list:
        out = []
        for key in self.ability_keys:
            ability = ab.get(key)
            if self.mp >= ability.mp_cost and self.cooldowns.get(key, 0) <= 0:
                out.append(ability)
        return out

    def on_cooldown(self, key) -> int:
        return self.cooldowns.get(key, 0)

    def start_cooldown(self, ability: ab.Ability):
        if ability.cooldown:
            self.cooldowns[ability.key] = ability.cooldown + 1  # decremented same round end

    # -- damage / healing ---------------------------------------------------
    def take_damage(self, raw: float, element=Element.PHYSICAL, ignore_defense=0.0) -> int:
        defense_stat = "res" if element in (
            Element.FIRE, Element.ICE, Element.LIGHTNING, Element.DARK,
            Element.HOLY, Element.ARCANE, Element.POISON) else "defense"
        defense = self.effective(defense_stat) * (1.0 - ignore_defense)
        mitigated = raw * (100.0 / (100.0 + defense))
        mitigated *= self.resistances.get(element, 1.0)
        dealt = roll_variance(max(1.0, mitigated))
        # Shield soaks damage first.
        if self.shield > 0:
            absorbed = min(self.shield, dealt)
            self.shield -= absorbed
            dealt -= absorbed
        self.hp = max(0, self.hp - dealt)
        return dealt

    def take_pure_damage(self, amount: int) -> int:
        """Unmitigated damage (DoTs); bypasses defense and shields."""
        amount = max(0, int(amount))
        self.hp = max(0, self.hp - amount)
        return amount

    def heal(self, amount: int) -> int:
        amount = max(0, int(amount))
        before = self.hp
        self.hp = min(self.max_hp, self.hp + amount)
        return self.hp - before

    # -- statuses -----------------------------------------------------------
    def add_status(self, status, battle):
        existing = next((s for s in self.statuses if type(s) is type(status)), None)
        if existing is not None and not status.stackable:
            # Refresh duration / keep stronger potency.
            existing.duration = max(existing.duration, status.duration)
            existing.potency = max(existing.potency, status.potency)
            battle.log(f"{self.cname()}'s {status.name} is refreshed.")
            return
        self.statuses.append(status)
        status.on_apply(self, battle)
        battle.log(f"{self.cname()} is afflicted with {status.label()}.")

    def remove_status(self, status, battle):
        if status in self.statuses:
            status.on_expire(self, battle)
            self.statuses.remove(status)

    def tick_statuses_start(self, battle):
        for status in list(self.statuses):
            status.on_turn_start(self, battle)
            if not self.alive:
                break

    def tick_statuses_end(self, battle):
        for status in list(self.statuses):
            status.duration -= 1
            if status.duration <= 0:
                status.on_expire(self, battle)
                self.statuses.remove(status)
                battle.log(f"{self.cname()}'s {status.name} wears off.")
        for key in list(self.cooldowns):
            self.cooldowns[key] = max(0, self.cooldowns[key] - 1)

    def is_stunned(self) -> bool:
        return any(s.blocks_turn for s in self.statuses)

    # -- AI -----------------------------------------------------------------
    def choose_action(self, battle):
        """Pick (ability, target(s)) for a non-player entity."""
        allies = [e for e in battle.living(self.side)]
        enemies = [e for e in battle.living(battle.other(self.side))]
        if not enemies:
            return None, None

        usable = self.usable_abilities()
        offensive = [a for a in usable if a.is_offensive()]
        support = [a for a in usable if a.target == ab.Target.SELF]
        heals = [a for a in usable if a.target in (ab.Target.ONE_ALLY, ab.Target.ALL_ALLIES)]

        # Heal when an ally (including self) is badly hurt.
        hurt = [e for e in allies if e.hp / max(1, e.max_hp) < 0.4]
        roll = rng.random()
        if heals and hurt and roll < 0.7:
            ability = rng.choice(heals)
        elif offensive and roll < 0.7:
            ability = rng.choice(offensive)
        elif support and roll < 0.85:
            ability = rng.choice(support)
        else:
            ability = ab.get("strike")

        target = self._pick_target(ability, allies, enemies)
        return ability, target

    def _pick_target(self, ability, allies, enemies):
        if ability.target == ab.Target.ONE_ENEMY:
            # Focus the lowest-HP enemy 50% of the time, else random.
            if rng.random() < 0.5:
                return min(enemies, key=lambda e: e.hp)
            return rng.choice(enemies)
        if ability.target == ab.Target.ALL_ENEMIES:
            return enemies
        if ability.target == ab.Target.ALL_ALLIES:
            return allies
        if ability.target == ab.Target.ONE_ALLY:
            return min(allies, key=lambda e: e.hp / max(1, e.max_hp))
        return self  # SELF

    # -- display ------------------------------------------------------------
    def status_line(self) -> str:
        tags = " ".join(s.label() for s in self.statuses)
        shield = color(f" ◈{self.shield}", C.BRIGHT_WHITE) if self.shield else ""
        return tags + shield

    def render(self, show_mp=True) -> str:
        hp_txt = f"HP {hp_bar(self.hp, self.max_hp, 16)} {self.hp:>4}/{self.max_hp}"
        lines = [f"{self.cname():<28} {hp_txt}"]
        if show_mp and self.max_mp > 0:
            mp_txt = f"MP {mp_bar(self.mp, self.max_mp, 16)} {self.mp:>4}/{self.max_mp}"
            lines.append(f"{'':<20} {mp_txt}")
        st = self.status_line()
        if st:
            lines.append(f"{'':<20} {st}")
        return "\n".join(lines)


class Player(Entity):
    def __init__(self, name, char_class):
        super().__init__(name, char_class.base_stats.copy(),
                         ability_keys=list(char_class.starting_abilities),
                         side="party", resistances=dict(char_class.resistances),
                         color_code=char_class.color)
        self.char_class = char_class
        self.level = 1
        self.xp = 0
        self.xp_to_next = self._xp_curve(1)
        self.gold = 50
        self.inventory: dict[str, int] = {}
        self.unlocked = set(char_class.starting_abilities)

    # -- progression --------------------------------------------------------
    @staticmethod
    def _xp_curve(level: int) -> int:
        return int(40 + level * level * 18)

    def add_item(self, item_key, qty=1):
        self.inventory[item_key] = self.inventory.get(item_key, 0) + qty

    def gain_xp(self, amount: int) -> list[str]:
        messages = []
        self.xp += amount
        messages.append(f"Gained {color(str(amount), C.BRIGHT_YELLOW)} XP.")
        while self.xp >= self.xp_to_next:
            self.xp -= self.xp_to_next
            messages.extend(self.level_up())
        return messages

    def level_up(self) -> list[str]:
        self.level += 1
        self.xp_to_next = self._xp_curve(self.level)
        growth = self.char_class.growth
        self.base_stats = self.base_stats.add(growth)
        self.max_hp = self.base_stats.max_hp
        self.max_mp = self.base_stats.max_mp
        self.hp = self.max_hp
        self.mp = self.max_mp
        msgs = [color(f"★ LEVEL UP! {self.name} is now level {self.level}!", C.BOLD, C.BRIGHT_YELLOW)]
        # Unlock new abilities for this level.
        for lvl, keys in sorted(self.char_class.ability_unlocks.items()):
            if lvl == self.level:
                for key in keys:
                    if key not in self.ability_keys:
                        self.ability_keys.append(key)
                        self.unlocked.add(key)
                        ability = ab.get(key)
                        msgs.append(color(f"  ✦ Learned {ability.name}!", C.BRIGHT_MAGENTA))
        return msgs

    def full_restore(self):
        self.hp = self.max_hp
        self.mp = self.max_mp
        self.statuses.clear()
        self.shield = 0
        self.cooldowns.clear()
        self.defending = False

    # -- save/load ----------------------------------------------------------
    def to_dict(self) -> dict:
        return {
            "name": self.name,
            "class_key": self.char_class.key,
            "level": self.level,
            "xp": self.xp,
            "xp_to_next": self.xp_to_next,
            "gold": self.gold,
            "hp": self.hp,
            "mp": self.mp,
            "base_stats": self.base_stats.to_dict(),
            "ability_keys": self.ability_keys,
            "inventory": self.inventory,
        }

    @classmethod
    def from_dict(cls, data: dict, classes: dict) -> "Player":
        char_class = classes[data["class_key"]]
        player = cls(data["name"], char_class)
        player.level = data["level"]
        player.xp = data["xp"]
        player.xp_to_next = data["xp_to_next"]
        player.gold = data["gold"]
        player.base_stats = Stats.from_dict(data["base_stats"])
        player.max_hp = player.base_stats.max_hp
        player.max_mp = player.base_stats.max_mp
        player.hp = data["hp"]
        player.mp = data["mp"]
        player.ability_keys = data["ability_keys"]
        player.inventory = {k: int(v) for k, v in data["inventory"].items()}
        return player
