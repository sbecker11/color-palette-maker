#!/usr/bin/env python3
"""
Swatch color utilities: text, highlight, and highlight-text colors for a given
swatch (hex). Matches the logic in client/src/utils.js so apps that consume
exported palette JSON can compute the same values in Python.

Usage:
    from swatch_colors import swatch_colors
    d = swatch_colors("#c1543c")
    # d["color"], d["textColor"], d["highlightColor"], d["highlightTextColor"]
"""

import math
import os
import re
from typing import TypedDict


class SwatchColors(TypedDict):
    color: str
    textColor: str
    highlightColor: str
    highlightTextColor: str


# D65 reference white
_LAB_XN, _LAB_YN, _LAB_ZN = 0.95047, 1.0, 1.08883

# Defaults (match client VITE_SWATCH_HIGHLIGHT_PERCENTAGE and NEARLY_WHITE_L_THRESHOLD)
_DEFAULT_HIGHLIGHT_PERCENT = 135
_NEARLY_WHITE_L_THRESHOLD = 85


def _format_hex(hex_str: str | None) -> str:
    """Normalize to #rrggbb lowercase; expand #rgb to #rrggbb."""
    if not hex_str or not isinstance(hex_str, str):
        return ""
    h = hex_str.strip().lower()
    if re.match(r"^#[0-9a-f]{6}$", h):
        return h
    m = re.match(r"^#([0-9a-f])([0-9a-f])([0-9a-f])$", h)
    if m:
        return f"#{m[1]}{m[1]}{m[2]}{m[2]}{m[3]}{m[3]}"
    return f"#{h}" if not h.startswith("#") else h


def _hex_to_rgb(hex_str: str) -> tuple[int, int, int] | None:
    """Parse hex to (r, g, b) 0-255. Returns None if invalid."""
    h = _format_hex(hex_str)
    if not h or not re.match(r"^#[0-9a-f]{6}$", h):
        return None
    return (
        int(h[1:3], 16),
        int(h[3:5], 16),
        int(h[5:7], 16),
    )


def _srgb_to_linear(c: float) -> float:
    if c <= 0.04045:
        return c / 12.92
    return ((c + 0.055) / 1.055) ** 2.4


def _linear_to_srgb(c: float) -> float:
    if c <= 0.0031308:
        return 12.92 * c
    return 1.055 * (c ** (1 / 2.4)) - 0.055


def _rgb_to_xyz(r: int, g: int, b: int) -> tuple[float, float, float]:
    R = _srgb_to_linear(r / 255.0)
    G = _srgb_to_linear(g / 255.0)
    B = _srgb_to_linear(b / 255.0)
    x = 0.4124564 * R + 0.3575761 * G + 0.1804375 * B
    y = 0.2126729 * R + 0.7151522 * G + 0.072175 * B
    z = 0.0193339 * R + 0.119192 * G + 0.9503041 * B
    return (x, y, z)


def _xyz_to_rgb(x: float, y: float, z: float) -> tuple[int, int, int]:
    R = 3.2404542 * x - 1.5371385 * y - 0.4985314 * z
    G = -0.969266 * x + 1.8760108 * y + 0.041556 * z
    B = 0.0556434 * x - 0.2040259 * y + 1.0572252 * z
    r = round(max(0, min(255, _linear_to_srgb(R) * 255)))
    g = round(max(0, min(255, _linear_to_srgb(G) * 255)))
    b = round(max(0, min(255, _linear_to_srgb(B) * 255)))
    return (r, g, b)


def _f(t: float) -> float:
    d = 6 / 29
    return (t ** (1 / 3)) if t > d * d * d else (t / (3 * d * d) + 4 / 29)


def _inv_f(t: float) -> float:
    d = 6 / 29
    return (t * t * t) if t > d else (3 * d * d * (t - 4 / 29))


def _xyz_to_lab(x: float, y: float, z: float) -> tuple[float, float, float]:
    fy = _f(y / _LAB_YN)
    L = 116 * fy - 16
    a = 500 * (_f(x / _LAB_XN) - fy)
    b = 200 * (fy - _f(z / _LAB_ZN))
    return (L, a, b)


def _lab_to_xyz(L: float, a: float, b: float) -> tuple[float, float, float]:
    y = (L + 16) / 116
    x = _LAB_XN * _inv_f(y + a / 500)
    y_val = _LAB_YN * _inv_f(y)
    z = _LAB_ZN * _inv_f(y - b / 200)
    return (x, y_val, z)


def _rgb_to_lab(r: int, g: int, b: int) -> tuple[float, float, float]:
    x, y, z = _rgb_to_xyz(r, g, b)
    return _xyz_to_lab(x, y, z)


def _lab_to_rgb(L: float, a: float, b: float) -> tuple[int, int, int]:
    x, y, z = _lab_to_xyz(L, a, b)
    return _xyz_to_rgb(x, y, z)


def _lab_to_lch(L: float, a: float, b: float) -> tuple[float, float, float]:
    C = math.sqrt(a * a + b * b)
    H = math.degrees(math.atan2(b, a)) if C >= 1e-10 else 0.0
    if H < 0:
        H += 360
    return (L, C, H)


def _lch_to_lab(L: float, C: float, H: float) -> tuple[float, float, float]:
    rad = math.radians(H)
    return (L, C * math.cos(rad), C * math.sin(rad))


def _rgb_to_hex(r: int, g: int, b: int) -> str:
    return f"#{r:02x}{g:02x}{b:02x}"


def _luminance(hex_str: str) -> float:
    """Relative luminance 0-1 (sRGB)."""
    rgb = _hex_to_rgb(hex_str)
    if rgb is None:
        return 0.5
    r, g, b = rgb
    rs = _srgb_to_linear(r / 255.0)
    gs = _srgb_to_linear(g / 255.0)
    bs = _srgb_to_linear(b / 255.0)
    return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs


def get_high_contrast_mono(hex_str: str) -> str:
    """Return black or white hex for best contrast on the given background."""
    return "#000000" if _luminance(hex_str) > 0.5 else "#ffffff"


def get_highlight_color(
    hex_str: str,
    highlight_percent: float | int | None = None,
    nearly_white_L: float = _NEARLY_WHITE_L_THRESHOLD,
) -> str:
    """
    Perceptually distinct highlight: brighter for most colors; for nearly white,
    darker (L divided by multiplier). Matches client getHighlightColor().
    """
    rgb = _hex_to_rgb(hex_str)
    if rgb is None:
        return _format_hex(hex_str) or "#808080"
    percent = highlight_percent
    if percent is None:
        try:
            percent = float(os.environ.get("VITE_SWATCH_HIGHLIGHT_PERCENTAGE", _DEFAULT_HIGHLIGHT_PERCENT))
        except (TypeError, ValueError):
            percent = _DEFAULT_HIGHLIGHT_PERCENT
    multiplier = float(percent) / 100.0
    r, g, b = rgb
    L, a, b_val = _rgb_to_lab(r, g, b)
    L_ch, C, H = _lab_to_lch(L, a, b_val)
    if L_ch >= nearly_white_L:
        L2 = L_ch / multiplier
    else:
        L2 = min(100.0, L_ch * multiplier)
    L2, a2, b2 = _lch_to_lab(L2, C, H)
    r2, g2, b2 = _lab_to_rgb(L2, a2, b2)
    return _rgb_to_hex(r2, g2, b2)


def swatch_colors(
    hex_str: str,
    highlight_percent: float | int | None = None,
) -> SwatchColors:
    """
    Compute color, textColor, highlightColor, highlightTextColor for a swatch.
    Intended for apps that consume exported palette JSON (e.g. palette-name.json).

    Returns a dict with keys: color, textColor, highlightColor, highlightTextColor
    (all hex strings #rrggbb).
    """
    color = _format_hex(hex_str) or "#808080"
    text_color = get_high_contrast_mono(color)
    highlight = get_highlight_color(hex_str, highlight_percent=highlight_percent)
    highlight_text = get_high_contrast_mono(highlight)
    return SwatchColors(
        color=color,
        textColor=text_color,
        highlightColor=highlight,
        highlightTextColor=highlight_text,
    )


if __name__ == "__main__":
    import json
    import sys
    s = sys.argv[1] if len(sys.argv) > 1 else "#c1543c"
    print(json.dumps(swatch_colors(s), indent=2))
