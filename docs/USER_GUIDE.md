# User Guide

## Features Overview

### Image Sources

- Upload images from URL or local file
- Supported formats: JPEG, PNG, WebP, GIF, TIFF, AVIF

### Palette Swatches

K-means automatically computes palette swatches. Each is a color-filled **swatch circle** with its hex beneath and a capital-letter **swatch label** (A, B, C, …) at center. Delete via the close × at top right; add new swatches by turning on **Adding swatches** or clicking the **empty swatch circle** (bottom of list).

### Palette Regions

**Detect Regions** computes and displays regions. Each region has:

- **Region boundary**: Polygon overlay
- **Region circle**: Empty circle at geometric center with average **region hex value** beneath
- **Region label**: Numeric (00, 01, 02, …) at center

Use **Remove Region (click)** to delete one, **Clear all Regions** to remove all.

### Region Overlay

SVG overlay with region boundaries, region circles, region hex values, and region labels. Features:

- Dual-layer text for visibility on light/dark backgrounds
- 1px black shadow on circles
- Golden glow on highlighted swatches
- **Match palette swatches**: Toggle to show palette swatch circles over each region. When on, hovering a panel swatch highlights all matching overlays (and vice versa); hovering a region highlights the matching panel swatch and all regions sharing that swatch

### Image Viewer

- Uses full available space
- Entire image visible (fit-to-container, no cropping)
- Top-aligned; region overlays scale with the image

### Palette Management

- Rename palettes (edit and blur or press Enter to save)
- Delete individual swatches
- Duplicate palettes (auto-increment names)
- Export as JSON

### Theme Toggle

Light and dark mode support.

### Color Palettes List

Browse, select, delete, reorder (move to top/bottom or step up/down), and duplicate stored palettes. **The list order matches `color_palettes.jsonl`** (first line = top of the list). New uploads and duplicates are **appended** to the file, so they appear at the **bottom** until you reorder.

---

## Key Actions

| Action | Description |
|--------|-------------|
| **Reorder (⏫ ⏬ ⬆️ ⬇️)** | Left column: ⏫ move to top, ⏬ move to bottom. Inner column: ⬆️ move up one, ⬇️ move down one. Order is written to `color_palettes.jsonl` in the same top-to-bottom order. |
| **Palette name** | In the **Color Palette** column, edit **Palette name** (or choose **Edit palette name** from the action menu). This value is stored as `paletteName` in metadata and as `name` in exported JSON—the identifier consumer apps should use to select this palette. Blur the field or press **Enter** to save (max 100 characters). |
| **Regenerate (K-means)** | Replace palette with freshly computed colors from the image. Choose K=5, 7, or 9. |
| **Detect Regions** | Python/OpenCV detects large regions. Choose a **Detection method** (e.g. Default, Template match, SLIC), then click **Detect**. For **Template match**: click **Detect** → button shows **Click** → click at template top-left on the image, drag to bottom-right, release to run detection (button shows **Drag** while dragging). The template can be any rectangle, not just a square. Click **Detect** again to clear and draw a new template. When a palette already has regions and Region Detection shows a method (e.g. Template), clicking **Detect** continues with that method. **Note:** The **SLIC** method requires `opencv-contrib-python`. Run: `pip install opencv-contrib-python` (replaces opencv-python). |
| **Remove Region (click)** | Enter delete mode; click region boundaries to remove. Click outside to exit. |
| **Clear all Regions** | Remove all detected regions at once. |
| **Adding swatches** | Toggle to enter/exit manual swatch creation mode. Cursor shows +; click palette image to add color. |
| **Match palette swatches** | When regions exist, toggle to show/hide palette swatch circles on the image. Highlights sync between panel and overlays. |
| **Export** | Download palette as `{ name, colors: [...] }`. Palette changes are saved to server automatically; Export creates downloadable files. |

---

## Manual Swatch Creation (Color Sampling)

1. Turn on **Adding swatches** or click the empty swatch circle
2. Cursor changes to + (crosshair)
3. Hover over the palette image to preview the color under the cursor
4. Click to add that color to the palette
5. Turn off **Adding swatches** or click the empty swatch to exit

### Dark Reader

If you use the [Dark Reader](https://darkreader.org/) browser extension, it may override the sampled color preview in the empty swatch circle. To fix this, exclude this site from Dark Reader:

1. Click the Dark Reader icon in your browser toolbar
2. Click the gear icon (Settings)
3. Open the **Site list** tab
4. Add this site to the **Not inverted** (or **Disabled for**) list — e.g. `localhost`, `localhost:3000`, or your deployed domain
5. Apply and refresh the page

---

## Metadata

Data is persisted to `color_palettes.jsonl`. Each image record includes:

- **Image info**: `createdDateTime`, `uploadedURL`, `uploadedFilePath`, `cachedFilePath`, `width`, `height`, `format`, `fileSizeBytes`
- **Palette**: `colorPalette` (hex array), `paletteName`
- **Regions**: `regions` (polygon arrays `[[x,y], ...]`), `paletteRegion` (region display data `{ hex, regionColor, x, y }` per region)

### Consumer apps (reading the full list)

Other applications can consume the same data as NDJSON:

- **TypeScript / npm** — use **`color-palette-utils-ts`** from [`color-palette-utils-ts/README-ts.md`](../color-palette-utils-ts/README-ts.md) (`fetchColorPalettesFromS3`).
- **S3 (same as images)** — when S3 is enabled, `create-s3-palette-bucket.sh` grants **anonymous read-only** `GetObject` on the JSONL object (default `metadata/color_palettes.jsonl`). Consumers use the HTTPS URL like any public object. **`GET /api/config`** includes **`palettesJsonlPublicUrl`** when configured. See [S3-STORAGE.md](S3-STORAGE.md#downstream-consumers-jsonl).
- **`GET /api/color-palettes.jsonl`** on your deployed app — same NDJSON (handy for local-only or same-origin). See [API.md](API.md).
