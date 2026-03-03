"""
Palette color utilities - portable Python, no framework deps.
Use in Flask, FastAPI, scripts, etc. Mirrors palette-utils/colors.js.

Usage:
    from palette_utils.colors import swatch_colors, get_contrast_icon_set

    d = swatch_colors("#c1543c")
    # d["color"], d["textColor"], d["highlightColor"], d["highlightTextColor"]

    icons = get_contrast_icon_set("#c1543c")
    # icons["url"], icons["back"], icons["img"], icons["variant"]
"""

from __future__ import annotations

import math
import os
import re
from typing import Literal, TypedDict

# D65 reference white
_LAB_XN, _LAB_YN, _LAB_ZN = 0.95047, 1.0, 1.08883

_DEFAULT_HIGHLIGHT_PERCENT = 135
_NEARLY_WHITE_L_THRESHOLD = 85


class SwatchColors(TypedDict):
    color: str
    textColor: str
    highlightColor: str
    highlightTextColor: str


class ContrastIconSet(TypedDict):
    url: str
    back: str
    img: str
    variant: Literal["black", "white"]


def format_hex(hex_str: str | None) -> str:
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


def hex_to_rgb(hex_str: str) -> tuple[int, int, int] | None:
    """Parse hex to (r, g, b) 0-255. Returns None if invalid."""
    h = format_hex(hex_str)
    if not h or not re.match(r"^#[0-9a-f]{6}$", h):
        return None
    return (
        int(h[1:3], 16),
        int(h[3:5], 16),
        int(h[5:7], 16),
    )


def rgb_to_hex(r: int, g: int, b: int) -> str:
    return f"#{r:02x}{g:02x}{b:02x}"


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
    b_val = 200 * (fy - _f(z / _LAB_ZN))
    return (L, a, b_val)


def _lab_to_xyz(L: float, a: float, b_val: float) -> tuple[float, float, float]:
    y = (L + 16) / 116
    x = _LAB_XN * _inv_f(y + a / 500)
    y_val = _LAB_YN * _inv_f(y)
    z = _LAB_ZN * _inv_f(y - b_val / 200)
    return (x, y_val, z)


def _lab_to_lch(L: float, a: float, b_val: float) -> tuple[float, float, float]:
    C = math.sqrt(a * a + b_val * b_val)
    H = math.degrees(math.atan2(b_val, a)) if C >= 1e-10 else 0.0
    if H < 0:
        H += 360
    return (L, C, H)


def _lch_to_lab(L: float, C: float, H: float) -> tuple[float, float, float]:
    rad = math.radians(H)
    return (L, C * math.cos(rad), C * math.sin(rad))


def get_luminance(hex_str: str) -> float:
    """Relative luminance 0-1 (sRGB)."""
    rgb = hex_to_rgb(hex_str)
    if rgb is None:
        return 0.5
    r, g, b = rgb
    rs = _srgb_to_linear(r / 255.0)
    gs = _srgb_to_linear(g / 255.0)
    bs = _srgb_to_linear(b / 255.0)
    return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs


def get_high_contrast_mono(hex_str: str) -> str:
    """Return black or white hex for best contrast on the given background."""
    return "#000000" if get_luminance(hex_str) > 0.5 else "#ffffff"


def get_highlight_color(
    hex_str: str,
    highlight_percent: float | int | None = None,
    nearly_white_L: float = _NEARLY_WHITE_L_THRESHOLD,
) -> str:
    """
    Perceptually distinct highlight: brighter for most colors; for nearly white,
    darker (L divided by multiplier). Matches JS getHighlightColor().
    """
    rgb = hex_to_rgb(hex_str)
    if rgb is None:
        return format_hex(hex_str) or "#808080"
    percent = highlight_percent
    if percent is None:
        try:
            percent = float(os.environ.get("VITE_SWATCH_HIGHLIGHT_PERCENTAGE", _DEFAULT_HIGHLIGHT_PERCENT))
        except (TypeError, ValueError):
            percent = _DEFAULT_HIGHLIGHT_PERCENT
    multiplier = float(percent) / 100.0
    r, g, b = rgb
    L, a, b_val = _xyz_to_lab(*_rgb_to_xyz(r, g, b))
    L_ch, C, H = _lab_to_lch(L, a, b_val)
    if L_ch >= nearly_white_L:
        L2 = L_ch / multiplier
    else:
        L2 = min(100.0, L_ch * multiplier)
    L2, a2, b2 = _lch_to_lab(L2, C, H)
    r2, g2, b2 = _xyz_to_rgb(*_lab_to_xyz(L2, a2, b2))
    return rgb_to_hex(r2, g2, b2)


def get_contrast_icon_set(
    hex_str: str,
    icon_base: str | None = None,
) -> ContrastIconSet:
    """
    Returns paths for url, back, img icons. Uses black PNGs; when variant is
    'white', apply CSS filter: invert(1). Light bg -> black icons; dark bg -> white.
    """
    base = icon_base or "/palette-utils/icons/anchors"
    variant: Literal["black", "white"] = "black" if get_high_contrast_mono(hex_str) == "#000000" else "white"
    return ContrastIconSet(
        url=f"{base}/icons8-url-16-black.png",
        back=f"{base}/icons8-back-16-black.png",
        img=f"{base}/icons8-img-16-black.png",
        variant=variant,
    )


def swatch_colors(
    hex_str: str,
    highlight_percent: float | int | None = None,
) -> SwatchColors:
    """
    Compute color, textColor, highlightColor, highlightTextColor for a swatch.
    Returns dict with keys: color, textColor, highlightColor, highlightTextColor (all hex).
    """
    color = format_hex(hex_str) or "#808080"
    text_color = get_high_contrast_mono(color)
    highlight = get_highlight_color(hex_str, highlight_percent=highlight_percent)
    highlight_text = get_high_contrast_mono(highlight)
    return SwatchColors(
        color=color,
        textColor=text_color,
        highlightColor=highlight,
        highlightTextColor=highlight_text,
    )
