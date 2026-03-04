"""
Unit tests for palette_utils __main__ (CLI).
Run: PYTHONPATH=. python -m unittest palette_utils.test_main -v
"""

from __future__ import annotations

import io
import json
import runpy
import sys
import unittest
from contextlib import redirect_stdout


class TestMainCLI(unittest.TestCase):
    """Test `python -m palette_utils [hex]` CLI (run in-process for coverage)."""

    def _run_main(self, argv: list[str] | None = None) -> str:
        if argv is None:
            argv = ["palette_utils"]
        old_argv = sys.argv
        try:
            sys.argv = argv
            buf = io.StringIO()
            with redirect_stdout(buf):
                runpy.run_module("palette_utils", run_name="__main__")
            return buf.getvalue()
        finally:
            sys.argv = old_argv

    def test_default_hex_output_is_valid_json(self) -> None:
        out = self._run_main()
        data = json.loads(out)
        self.assertIn("color", data)
        self.assertIn("textColor", data)
        self.assertIn("highlightColor", data)
        self.assertIn("highlightTextColor", data)

    def test_custom_hex_argument(self) -> None:
        out = self._run_main(["palette_utils", "#ff0000"])
        data = json.loads(out)
        self.assertEqual(data["color"], "#ff0000")
