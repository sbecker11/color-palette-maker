"""CLI: python -m palette_utils [hex]"""
import json
import sys
from palette_utils.colors import swatch_colors

if __name__ == "__main__":
    hex_arg = sys.argv[1] if len(sys.argv) > 1 else "#c1543c"
    print(json.dumps(swatch_colors(hex_arg), indent=2))
