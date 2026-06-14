"""JSON save/load for game progress."""

from __future__ import annotations

import json
import os

from .classes import CLASSES
from .entities import Player

SAVE_PATH = os.environ.get("OVERLORD_SAVE", os.path.expanduser("~/.overlord_rpg_save.json"))


def save_game(player: Player, progress: dict, path: str = SAVE_PATH) -> None:
    data = {
        "version": 1,
        "player": player.to_dict(),
        "progress": progress,
    }
    with open(path, "w", encoding="utf-8") as fh:
        json.dump(data, fh, indent=2)


def load_game(path: str = SAVE_PATH):
    if not os.path.exists(path):
        return None
    with open(path, "r", encoding="utf-8") as fh:
        data = json.load(fh)
    player = Player.from_dict(data["player"], CLASSES)
    return player, data.get("progress", {})


def has_save(path: str = SAVE_PATH) -> bool:
    return os.path.exists(path)


def delete_save(path: str = SAVE_PATH) -> None:
    if os.path.exists(path):
        os.remove(path)
