"""Shared utilities: colored output, RNG, and small UI helpers."""

from __future__ import annotations

import os
import random
import sys
import time

# ---------------------------------------------------------------------------
# Color support
# ---------------------------------------------------------------------------

_NO_COLOR = bool(os.environ.get("NO_COLOR")) or not sys.stdout.isatty()


class C:
    """ANSI color codes (disabled automatically when not a TTY)."""

    RESET = "\033[0m"
    BOLD = "\033[1m"
    DIM = "\033[2m"
    ITALIC = "\033[3m"
    UNDER = "\033[4m"

    BLACK = "\033[30m"
    RED = "\033[31m"
    GREEN = "\033[32m"
    YELLOW = "\033[33m"
    BLUE = "\033[34m"
    MAGENTA = "\033[35m"
    CYAN = "\033[36m"
    WHITE = "\033[37m"
    GREY = "\033[90m"
    BRIGHT_RED = "\033[91m"
    BRIGHT_GREEN = "\033[92m"
    BRIGHT_YELLOW = "\033[93m"
    BRIGHT_BLUE = "\033[94m"
    BRIGHT_MAGENTA = "\033[95m"
    BRIGHT_CYAN = "\033[96m"
    BRIGHT_WHITE = "\033[97m"


def color(text: str, *codes: str) -> str:
    if _NO_COLOR or not codes:
        return text
    return "".join(codes) + text + C.RESET


def set_color_enabled(enabled: bool) -> None:
    global _NO_COLOR
    _NO_COLOR = not enabled


# ---------------------------------------------------------------------------
# RNG
# ---------------------------------------------------------------------------

rng = random.Random()


def seed(value) -> None:
    rng.seed(value)


def chance(probability: float) -> bool:
    """Return True with the given probability (0.0 - 1.0)."""
    return rng.random() < probability


def roll_variance(value: float, spread: float = 0.1) -> int:
    """Apply +/- spread random variance to a value and round to an int."""
    factor = 1.0 + rng.uniform(-spread, spread)
    return max(1, int(round(value * factor)))


# ---------------------------------------------------------------------------
# UI helpers
# ---------------------------------------------------------------------------

# When stdin is not interactive we never block on input (useful for tests/demos).
INTERACTIVE = sys.stdin.isatty()


def slow_print(text: str = "", delay: float = 0.0) -> None:
    print(text)
    if delay and INTERACTIVE:
        time.sleep(delay)


def hr(char: str = "-", width: int = 60, col: str | None = None) -> None:
    line = char * width
    print(color(line, col) if col else line)


def banner(title: str) -> None:
    hr("=", 60, C.BRIGHT_CYAN)
    print(color(title.center(60), C.BOLD, C.BRIGHT_CYAN))
    hr("=", 60, C.BRIGHT_CYAN)


def pause(msg: str = "Press Enter to continue...") -> None:
    if INTERACTIVE:
        try:
            input(color(msg, C.DIM))
        except EOFError:
            pass


def bar(current: int, maximum: int, width: int = 20, fill: str = "█", empty: str = "░") -> str:
    maximum = max(1, maximum)
    current = max(0, min(current, maximum))
    filled = int(round(width * current / maximum))
    return fill * filled + empty * (width - filled)


def hp_bar(current: int, maximum: int, width: int = 20) -> str:
    ratio = current / max(1, maximum)
    if ratio > 0.5:
        col = C.BRIGHT_GREEN
    elif ratio > 0.25:
        col = C.BRIGHT_YELLOW
    else:
        col = C.BRIGHT_RED
    return color(bar(current, maximum, width), col)


def mp_bar(current: int, maximum: int, width: int = 20) -> str:
    return color(bar(current, maximum, width), C.BRIGHT_BLUE)


def prompt_int(message: str, low: int, high: int, default: int | None = None) -> int:
    """Prompt for an integer in [low, high]. Falls back to default when non-interactive."""
    while True:
        if not INTERACTIVE:
            return default if default is not None else low
        try:
            raw = input(color(message, C.BRIGHT_WHITE)).strip()
        except EOFError:
            return default if default is not None else low
        if raw == "" and default is not None:
            return default
        if raw.isdigit():
            value = int(raw)
            if low <= value <= high:
                return value
        print(color(f"  Please enter a number between {low} and {high}.", C.RED))


def prompt_text(message: str, default: str = "") -> str:
    if not INTERACTIVE:
        return default
    try:
        raw = input(color(message, C.BRIGHT_WHITE)).strip()
    except EOFError:
        return default
    return raw or default


def confirm(message: str, default: bool = True) -> bool:
    if not INTERACTIVE:
        return default
    suffix = " [Y/n] " if default else " [y/N] "
    try:
        raw = input(color(message + suffix, C.BRIGHT_WHITE)).strip().lower()
    except EOFError:
        return default
    if raw == "":
        return default
    return raw.startswith("y")
