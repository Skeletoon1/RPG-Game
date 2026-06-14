#!/usr/bin/env python3
"""Launcher for Overlord RPG.

Run with:  python3 play.py
"""

from overlord_rpg.game import play

if __name__ == "__main__":
    try:
        play()
    except KeyboardInterrupt:
        print("\n\nNazarick awaits your return...")
