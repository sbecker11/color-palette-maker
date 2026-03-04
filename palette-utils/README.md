# palette-utils

Portable color utilities for swatch palettes: contrast text, highlight colors, and icon sets. Use in JavaScript/TypeScript (React, Node, Vite) or Python (Flask, FastAPI, scripts).

## Contents

| File / Folder   | Description                                  |
|-----------------|----------------------------------------------|
| `colors.js`     | ES module, no framework deps. Easy to port to TS. |
| `palette_utils/`| Python package (add `palette-utils` parent to `PYTHONPATH`). |
| `palette.css`   | Contrast icon styles (`palette-icon-row`, `filter: invert(1)` for white). |
| `icons/anchors/`| Black url, back, img icons (16×16). White via CSS filter. |

## JavaScript / TypeScript

```js
import {
  formatHexDisplay,
  getHighContrastMono,
  getHighlightColor,
  getContrastIconSet,
} from './palette-utils/colors.js';

// Swatch colors: use getHighlightColor + getHighContrastMono
const textColor = getHighContrastMono(hex);
const highlightColor = getHighlightColor(hex);
const highlightTextColor = getHighContrastMono(highlightColor);

// Contrast icons (light bg -> black, dark bg -> white via invert)
const icons = getContrastIconSet('#c1543c', { iconBase: '/palette-utils/icons/anchors' });
// icons: { url, back, img, variant: 'black'|'white' }
```

Options for `getHighlightColor(hex, { highlightPercent?: 135, nearlyWhiteL?: 85 })`.  
Options for `getContrastIconSet(hex, { iconBase?: '/palette-utils/icons/anchors' })`.

Import `palette.css` for icon contrast:

```js
import './palette-utils/palette.css';
```

```html
<p class="palette-icon-row" data-variant="{iconSet.variant}">
  <img src="{iconSet.url}" class="palette-icon" alt="" width="16" height="16" />
  ...
</p>
```

## Python

Add `palette-utils` (the folder containing `palette_utils`) to `PYTHONPATH`:

```bash
export PYTHONPATH="/path/to/color-palette-maker-react/palette-utils:$PYTHONPATH"
```

CLI: `python -m palette_utils [hex]` (default `#c1543c`)

```python
from palette_utils.colors import swatch_colors, get_contrast_icon_set

d = swatch_colors("#c1543c")
# d["color"], d["textColor"], d["highlightColor"], d["highlightTextColor"]

icons = get_contrast_icon_set("#c1543c", icon_base="/palette-utils/icons/anchors")
# icons["url"], icons["back"], icons["img"], icons["variant"]
```

### Python tests

Unit tests live in `palette_utils/test_colors.py` and `palette_utils/test_main.py` (stdlib `unittest`). From the `palette-utils` directory:

```bash
PYTHONPATH=. python -m unittest discover -s palette_utils -p "test_*.py" -v
```

From the repo root:

```bash
PYTHONPATH=palette-utils python -m unittest discover -s palette_utils -p "test_*.py" -v
```

Line coverage (≥80% for package source files):

```bash
cd palette-utils
pip install coverage  # if needed
PYTHONPATH=. python -m coverage run --source=palette_utils -m unittest discover -s palette_utils -p "test_*.py" -v
python -m coverage report -m --include="palette_utils/*.py"
```

## Porting to TypeScript

Rename `colors.js` to `colors.ts` and add types. All functions are pure and take simple types (`string`, `number`). No behavioral changes needed.
