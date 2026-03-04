"""
Unit tests for palette_utils.colors.
Run from repo root: PYTHONPATH=palette-utils python -m unittest palette_utils.test_colors -v
"""

from __future__ import annotations

import os
import unittest

from palette_utils.colors import (
    format_hex,
    hex_to_rgb,
    rgb_to_hex,
    get_luminance,
    get_high_contrast_mono,
    get_highlight_color,
    get_contrast_icon_set,
    swatch_colors,
)


class TestFormatHex(unittest.TestCase):
    def test_none_or_empty_returns_empty(self) -> None:
        self.assertEqual(format_hex(None), "")
        self.assertEqual(format_hex(""), "")

    def test_valid_6digit_passthrough(self) -> None:
        self.assertEqual(format_hex("#ff0000"), "#ff0000")
        self.assertEqual(format_hex("#00ff00"), "#00ff00")

    def test_normalizes_to_lowercase(self) -> None:
        self.assertEqual(format_hex("#FF0000"), "#ff0000")
        self.assertEqual(format_hex("  #AbCdEf  "), "#abcdef")

    def test_expands_3digit_shorthand(self) -> None:
        self.assertEqual(format_hex("#f00"), "#ff0000")
        self.assertEqual(format_hex("#0f0"), "#00ff00")
        self.assertEqual(format_hex("#00f"), "#0000ff")
        self.assertEqual(format_hex("#fff"), "#ffffff")

    def test_adds_hash_prefix(self) -> None:
        self.assertEqual(format_hex("ff0000"), "#ff0000")


class TestRgbToHex(unittest.TestCase):
    def test_converts_rgb_to_hex(self) -> None:
        self.assertEqual(rgb_to_hex(255, 0, 0), "#ff0000")
        self.assertEqual(rgb_to_hex(0, 255, 0), "#00ff00")
        self.assertEqual(rgb_to_hex(0, 0, 255), "#0000ff")
        self.assertEqual(rgb_to_hex(0, 0, 0), "#000000")
        self.assertEqual(rgb_to_hex(255, 255, 255), "#ffffff")

    def test_pads_single_digits(self) -> None:
        self.assertEqual(rgb_to_hex(1, 2, 3), "#010203")


class TestHexToRgb(unittest.TestCase):
    def test_parses_valid_hex(self) -> None:
        self.assertEqual(hex_to_rgb("#ff0000"), (255, 0, 0))
        self.assertEqual(hex_to_rgb("#00ff00"), (0, 255, 0))
        self.assertEqual(hex_to_rgb("#0000ff"), (0, 0, 255))
        self.assertEqual(hex_to_rgb("#ffffff"), (255, 255, 255))

    def test_accepts_normalized_input(self) -> None:
        self.assertEqual(hex_to_rgb("#f00"), (255, 0, 0))

    def test_returns_none_for_invalid(self) -> None:
        self.assertIsNone(hex_to_rgb(""))
        self.assertIsNone(hex_to_rgb("not-a-color"))
        self.assertIsNone(hex_to_rgb("#gggggg"))
        self.assertIsNone(hex_to_rgb("#12345"))


class TestGetLuminance(unittest.TestCase):
    def test_returns_float_between_0_and_1(self) -> None:
        L = get_luminance("#808080")
        self.assertIsInstance(L, float)
        self.assertGreaterEqual(L, 0.0)
        self.assertLessEqual(L, 1.0)

    def test_white_is_brighter_than_black(self) -> None:
        self.assertGreater(get_luminance("#ffffff"), get_luminance("#000000"))

    def test_invalid_returns_mid(self) -> None:
        self.assertEqual(get_luminance(""), 0.5)


class TestGetHighContrastMono(unittest.TestCase):
    def test_returns_black_for_light_backgrounds(self) -> None:
        self.assertEqual(get_high_contrast_mono("#ffffff"), "#000000")
        self.assertEqual(get_high_contrast_mono("#ffff00"), "#000000")
        self.assertEqual(get_high_contrast_mono("#f0f0f0"), "#000000")

    def test_returns_white_for_dark_backgrounds(self) -> None:
        self.assertEqual(get_high_contrast_mono("#000000"), "#ffffff")
        self.assertEqual(get_high_contrast_mono("#0000ff"), "#ffffff")
        self.assertEqual(get_high_contrast_mono("#333333"), "#ffffff")


class TestGetContrastIconSet(unittest.TestCase):
    def test_returns_all_keys(self) -> None:
        s = get_contrast_icon_set("#ffffff")
        self.assertIn("url", s)
        self.assertIn("back", s)
        self.assertIn("img", s)
        self.assertIn("variant", s)
        self.assertIn(s["variant"], ("black", "white"))

    def test_default_icon_base(self) -> None:
        s = get_contrast_icon_set("#fff")
        self.assertIn("/palette-utils/icons/anchors", s["url"])

    def test_custom_icon_base(self) -> None:
        s = get_contrast_icon_set("#fff", icon_base="/my/icons")
        self.assertEqual(s["url"], "/my/icons/icons8-url-16-black.png")
        self.assertEqual(s["back"], "/my/icons/icons8-back-16-black.png")
        self.assertEqual(s["img"], "/my/icons/icons8-img-16-black.png")

    def test_variant_black_for_light_bg(self) -> None:
        self.assertEqual(get_contrast_icon_set("#ffffff")["variant"], "black")

    def test_variant_white_for_dark_bg(self) -> None:
        self.assertEqual(get_contrast_icon_set("#000000")["variant"], "white")


class TestGetHighlightColor(unittest.TestCase):
    def test_returns_hex_string(self) -> None:
        import re
        result = get_highlight_color("#c1543c", highlight_percent=135)
        self.assertRegex(result, r"^#[0-9a-f]{6}$")

    def test_accepts_highlight_percent(self) -> None:
        a = get_highlight_color("#4080c0", highlight_percent=110)
        b = get_highlight_color("#4080c0", highlight_percent=150)
        self.assertNotEqual(a, b)

    def test_brightens_dark_color(self) -> None:
        dark = "#222222"
        highlighted = get_highlight_color(dark, highlight_percent=135)
        r1, g1, b1 = hex_to_rgb(dark) or (0, 0, 0)
        r2, g2, b2 = hex_to_rgb(highlighted) or (0, 0, 0)
        self.assertGreater(r2 + g2 + b2, r1 + g1 + b1)

    def test_invalid_hex_returns_fallback_or_normalized(self) -> None:
        # Empty string: format_hex("") is "" -> return "#808080"
        self.assertEqual(get_highlight_color("", highlight_percent=135), "#808080")

    def test_env_highlight_percent_fallback_on_invalid_env(self) -> None:
        key = "VITE_SWATCH_HIGHLIGHT_PERCENTAGE"
        old = os.environ.pop(key, None)
        try:
            os.environ[key] = "not_a_number"
            # Should not raise; uses default when float(env) fails
            result = get_highlight_color("#f00", highlight_percent=None)
            self.assertRegex(result, r"^#[0-9a-f]{6}$")
        finally:
            if old is not None:
                os.environ[key] = old
            elif key in os.environ:
                del os.environ[key]

    def test_nearly_white_darkens(self) -> None:
        # Light color (L >= nearly_white_L) gets darker when highlighted
        light = "#f5f5f5"
        highlighted = get_highlight_color(light, highlight_percent=135, nearly_white_L=85)
        r1, g1, b1 = hex_to_rgb(light) or (0, 0, 0)
        r2, g2, b2 = hex_to_rgb(highlighted) or (0, 0, 0)
        self.assertLess(r2 + g2 + b2, r1 + g1 + b1)


class TestSwatchColors(unittest.TestCase):
    def test_returns_all_keys(self) -> None:
        d = swatch_colors("#c1543c")
        self.assertIn("color", d)
        self.assertIn("textColor", d)
        self.assertIn("highlightColor", d)
        self.assertIn("highlightTextColor", d)

    def test_color_is_normalized_hex(self) -> None:
        d = swatch_colors("#F00")
        self.assertEqual(d["color"], "#ff0000")

    def test_text_color_is_black_or_white(self) -> None:
        d = swatch_colors("#ffffff")
        self.assertEqual(d["textColor"], "#000000")
        d2 = swatch_colors("#000000")
        self.assertEqual(d2["textColor"], "#ffffff")

    def test_highlight_differs_from_base_for_mid_colors(self) -> None:
        d = swatch_colors("#4080c0", highlight_percent=135)
        self.assertNotEqual(d["highlightColor"], d["color"])

    def test_invalid_hex_uses_fallback_color(self) -> None:
        # Empty string -> format_hex returns "" -> color becomes "#808080"
        d = swatch_colors("", highlight_percent=135)
        self.assertEqual(d["color"], "#808080")


if __name__ == "__main__":
    unittest.main()
