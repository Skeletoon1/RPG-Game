"""Turn-based battle system."""

from __future__ import annotations

from . import abilities as ab
from . import items as item_db
from .utils import (C, banner, color, hr, INTERACTIVE, pause, prompt_int,
                    rng, slow_print)


class Battle:
    def __init__(self, player, enemies, allies=None, can_flee=True):
        self.player = player
        self.party = [player] + list(allies or [])
        self.enemies = list(enemies)
        self.can_flee = can_flee
        self.log_buffer: list[str] = []
        self.round = 0
        self.result = None  # "win", "lose", "flee"

    # -- queries ------------------------------------------------------------
    def side_list(self, side):
        return self.party if side == "party" else self.enemies

    def living(self, side):
        return [e for e in self.side_list(side) if e.alive]

    def other(self, side):
        return "enemy" if side == "party" else "party"

    def add_summon(self, creature, side):
        creature.side = side
        self.side_list(side).append(creature)

    def log(self, msg):
        self.log_buffer.append(msg)

    def flush_log(self):
        for line in self.log_buffer:
            slow_print("  " + line, 0.05)
        self.log_buffer.clear()

    # -- rendering ----------------------------------------------------------
    def render(self):
        print()
        hr("=", 60, C.BRIGHT_RED)
        print(color(f"  BATTLE — Round {self.round}".ljust(60), C.BOLD, C.BRIGHT_RED))
        hr("=", 60, C.BRIGHT_RED)
        print(color("  ENEMIES", C.BOLD, C.RED))
        for i, e in enumerate(self.enemies):
            prefix = f"  {i + 1}. " if e.alive else "  ✝ "
            if e.alive:
                print(prefix + e.render(show_mp=False))
            else:
                print(color(prefix + e.name + " (defeated)", C.DIM))
        hr("-", 60, C.GREY)
        print(color("  YOUR PARTY", C.BOLD, C.BRIGHT_GREEN))
        for e in self.party:
            if e.alive:
                print("  " + e.render(show_mp=True).replace("\n", "\n  "))
            else:
                print(color(f"  ✝ {e.name} (downed)", C.DIM))
        hr("=", 60, C.BRIGHT_RED)

    # -- main loop ----------------------------------------------------------
    def run(self):
        banner("⚔  BATTLE START  ⚔")
        names = ", ".join(e.name for e in self.enemies)
        slow_print(color(f"  You are confronted by: {names}!", C.BRIGHT_RED), 0.2)
        pause()

        while True:
            self.round += 1
            order = self._turn_order()
            for entity in order:
                if not entity.alive:
                    continue
                if self._battle_over():
                    break
                self._take_turn(entity)
                self.flush_log()
                if self._battle_over():
                    break

            # End-of-round upkeep: expire summons, tick durations handled per-turn.
            self._cleanup_summons()
            if self._battle_over():
                break

        return self._finish()

    def _turn_order(self):
        combatants = [e for e in (self.party + self.enemies) if e.alive]
        # Sort by effective speed, descending, with a small random tiebreak.
        return sorted(combatants, key=lambda e: (e.effective("spd") + rng.uniform(0, 1)), reverse=True)

    def _battle_over(self):
        return not self.living("party") or not self.living("enemy") or self.result == "flee"

    def _take_turn(self, entity):
        # Start-of-turn: DoT/HoT ticks.
        entity.defending = False
        entity.tick_statuses_start(self)
        if not entity.alive:
            entity.tick_statuses_end(self)
            return

        if entity.is_stunned():
            blocker = next(s for s in entity.statuses if s.blocks_turn)
            self.log(f"{entity.cname()} is {blocker.name} and cannot act!")
            entity.tick_statuses_end(self)
            return

        if entity.side == "party" and entity is self.player:
            self._player_turn(entity)
        else:
            self._ai_turn(entity)

        entity.tick_statuses_end(self)

    # -- AI turn ------------------------------------------------------------
    def _ai_turn(self, entity):
        ability, target = entity.choose_action(self)
        if ability is None:
            return
        self.log(f"{entity.cname()} uses {ability.colored_name()}.")
        self._cast(entity, ability, target)

    # -- player turn --------------------------------------------------------
    def _player_turn(self, player):
        if not INTERACTIVE:
            # Headless auto-play: use the strongest affordable offensive ability.
            self._auto_player(player)
            return
        while True:
            self.render()
            print(color("\n  Your move:", C.BOLD, C.BRIGHT_WHITE))
            print("   1) Attack        2) Ability")
            print("   3) Item          4) Defend")
            if self.can_flee:
                print("   5) Flee")
            choice = prompt_int("  > ", 1, 5 if self.can_flee else 4, default=1)

            if choice == 1:
                target = self._choose_enemy()
                if target is None:
                    continue
                strike = ab.get("strike")
                self.log(f"{player.cname()} attacks!")
                self._cast(player, strike, target)
                return
            elif choice == 2:
                if self._ability_menu(player):
                    return
            elif choice == 3:
                if self._item_menu(player):
                    return
            elif choice == 4:
                player.defending = True
                self.log(f"{player.cname()} takes a defensive stance.")
                return
            elif choice == 5 and self.can_flee:
                if self._attempt_flee(player):
                    return

    def _auto_player(self, player):
        usable = [a for a in player.usable_abilities() if a.is_offensive()]
        ability = max(usable, key=lambda a: a.mp_cost, default=ab.get("strike"))
        enemies = self.living("enemy")
        if not enemies:
            return
        if ability.target == ab.Target.ALL_ENEMIES:
            target = enemies
        else:
            target = min(enemies, key=lambda e: e.hp)
        self.log(f"{player.cname()} uses {ability.colored_name()}.")
        self._cast(player, ability, target)

    def _ability_menu(self, player):
        abilities = player.abilities()
        print(color("\n  Abilities:", C.BOLD, C.BRIGHT_BLUE))
        print("   0) Back")
        for i, a in enumerate(abilities, 1):
            cd = player.on_cooldown(a.key)
            affordable = player.mp >= a.mp_cost and cd <= 0
            status = ""
            if cd > 0:
                status = color(f" [CD {cd}]", C.RED)
            elif player.mp < a.mp_cost:
                status = color(" [no MP]", C.RED)
            line = f"   {i}) {a.summary()}{status}"
            print(line if affordable else color(line, C.DIM))
        idx = prompt_int("  > ", 0, len(abilities), default=0)
        if idx == 0:
            return False
        ability = abilities[idx - 1]
        if player.mp < ability.mp_cost:
            print(color("  Not enough MP!", C.RED))
            return False
        if player.on_cooldown(ability.key) > 0:
            print(color("  That ability is on cooldown!", C.RED))
            return False
        target = self._resolve_player_target(player, ability)
        if target is None:
            return False
        self.log(f"{player.cname()} casts {ability.colored_name()}!")
        self._cast(player, ability, target)
        return True

    def _item_menu(self, player):
        usable = [(k, q) for k, q in player.inventory.items()
                  if q > 0 and item_db.get(k).battle_usable]
        if not usable:
            print(color("  You have no usable items!", C.RED))
            return False
        print(color("\n  Items:", C.BOLD, C.BRIGHT_CYAN))
        print("   0) Back")
        for i, (k, q) in enumerate(usable, 1):
            it = item_db.get(k)
            print(f"   {i}) {color(it.name, it.color)} x{q} - {color(it.description, C.DIM)}")
        idx = prompt_int("  > ", 0, len(usable), default=0)
        if idx == 0:
            return False
        key = usable[idx - 1][0]
        it = item_db.get(key)
        msg = it.apply(player, self)
        player.inventory[key] -= 1
        self.log(color(f"Used {it.name}. {msg}", it.color))
        return True

    def _resolve_player_target(self, player, ability):
        t = ability.target
        if t == ab.Target.SELF:
            return player
        if t == ab.Target.ONE_ENEMY:
            return self._choose_enemy()
        if t == ab.Target.ALL_ENEMIES:
            return self.living("enemy")
        if t == ab.Target.ALL_ALLIES:
            return self.living("party")
        if t == ab.Target.ONE_ALLY:
            return self._choose_ally(include_dead=False)
        if t == ab.Target.DEAD_ALLY:
            return self._choose_ally(include_dead=True, only_dead=True)
        return player

    def _choose_enemy(self):
        targets = self.living("enemy")
        if not targets:
            return None
        if len(targets) == 1:
            return targets[0]
        print(color("\n  Choose a target:", C.BOLD))
        for i, e in enumerate(targets, 1):
            print(f"   {i}) {e.cname()}  HP {e.hp}/{e.max_hp}")
        idx = prompt_int("  > ", 1, len(targets), default=1)
        return targets[idx - 1]

    def _choose_ally(self, include_dead=False, only_dead=False):
        if only_dead:
            targets = [e for e in self.party if not e.alive]
        elif include_dead:
            targets = list(self.party)
        else:
            targets = self.living("party")
        if not targets:
            print(color("  No valid target!", C.RED))
            return None
        if len(targets) == 1:
            return targets[0]
        print(color("\n  Choose an ally:", C.BOLD))
        for i, e in enumerate(targets, 1):
            state = "" if e.alive else color(" (downed)", C.DIM)
            print(f"   {i}) {e.cname()}  HP {e.hp}/{e.max_hp}{state}")
        idx = prompt_int("  > ", 1, len(targets), default=1)
        return targets[idx - 1]

    def _attempt_flee(self, player):
        fastest_enemy = max((e.effective("spd") for e in self.living("enemy")), default=0)
        odds = 0.5 + (player.effective("spd") - fastest_enemy) / 100.0
        if any(getattr(e, "is_boss", False) for e in self.enemies):
            odds = 0.0  # cannot flee bosses
        if rng.random() < max(0.1, min(0.9, odds)):
            self.log(color(f"{player.cname()} fled from battle!", C.BRIGHT_YELLOW))
            self.result = "flee"
            return True
        self.log(color("Couldn't escape!", C.RED))
        return True  # the attempt consumes the turn

    # -- casting ------------------------------------------------------------
    def _cast(self, user, ability, target):
        user.mp = max(0, user.mp - ability.mp_cost)
        user.start_cooldown(ability)
        if isinstance(target, list):
            targets = [t for t in target if t.alive]
            for effect in ability.effects:
                for t in list(targets):
                    effect.apply(user, t, self)
        else:
            for effect in ability.effects:
                effect.apply(user, target, self)

    # -- summon upkeep ------------------------------------------------------
    def _cleanup_summons(self):
        for e in list(self.party):
            if getattr(e, "is_summon", False) and e.summon_duration is not None:
                e.summon_duration -= 1
                if e.summon_duration <= 0 and e.alive:
                    self.log(f"{e.cname()} fades away.")
                    e.hp = 0

    # -- resolution ---------------------------------------------------------
    def _finish(self):
        self.flush_log()
        if self.result == "flee":
            return {"result": "flee"}
        if not self.living("party"):
            self.result = "lose"
            return {"result": "lose"}
        self.result = "win"
        xp = sum(getattr(e, "xp_reward", 0) for e in self.enemies)
        gold = sum(getattr(e, "gold_reward", 0) for e in self.enemies)
        return {"result": "win", "xp": xp, "gold": gold}
