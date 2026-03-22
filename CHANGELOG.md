# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Removed
- **`resume-flock-color-palettes-kit/`** — obsolete README-only redirect; palette catalog APIs live in **`color-palette-utils-ts/`** (npm package **`color-palette-utils-ts`**).

### Added
- **`color-palette-utils-ts` — palette catalog**: Fetch public **NDJSON** from S3; `fetchColorPalettesFromS3`, type `ColorPaletteRecord`. Vitest tests in `color-palette-utils-ts/src/palettesCatalog.test.ts`; `npm run test:coverage` in that package. Former **`resume-flock-color-palettes-kit`** capability is merged here.
- **GET /api/color-palettes.jsonl**: Serves the palette list as NDJSON for downstream consumers (same records as `color_palettes.jsonl`). Client `api.getColorPalettesJsonl()`. Documented in API, USER_GUIDE, S3-STORAGE (including optional public S3 read for that object).
- **S3 palette JSONL**: When S3 is enabled, full JSONL is **written to S3 first**, then mirrored locally. Reads prefer S3. **`create-s3-palette-bucket.sh`** adds **public read-only `GetObject`** on the JSONL object (same consumer model as `images/*`). **`GET /api/config`** includes **`palettesJsonlPublicUrl`** when S3 is on. Override key with `S3_PALETTES_JSONL_KEY` — see [docs/S3-STORAGE.md](docs/S3-STORAGE.md).
- **S3 storage**: Optional S3 bucket for palette images. Region from `AWS_REGION` or `~/.aws/config` default profile; credentials from env or `~/.aws/credentials`. See [docs/S3-STORAGE.md](docs/S3-STORAGE.md).
- **S3 scripts**: `create-s3-palette-bucket.sh` (bucket + policy + CORS), `migrate-uploads-to-s3.js` (`npm run migrate:s3`), `open-s3-jpegs-in-chrome.sh`, `import-resume-flock-monotone-palettes.js` (`npm run import:resume-flock-monotone`).
- **Import resume-flock monotone palettes**: White_Monotone, Medium_Grey_Monotone, Black_Monotone from resume-flock as swatch images (no source images). Generates 360×80 JPEG, appends metadata, uploads to S3.
- **Background swatch index**: `backgroundSwatchIndex` in metadata and exports for contrast text.
- **Template match (draw box)**: For region detection method "Template match", click **Detect** → draw a box on the image (click center, drag to size, release); detection runs on release. Button label cycles **Click** → **Drag** → **Detect**. Click **Detect** again to clear regions and repeat with a new box. Correlation uses gradient magnitude (brightness-invariant).
- When a palette already has regions and Region Detection shows a method (e.g. Template), app syncs that method so clicking **Detect** immediately continues with it (no need to re-select the method).
- Auto-select moved palette after reordering (top/bottom/up/down buttons)
- Unit tests for ErrorBoundary component
- Additional unit tests for App, ImageViewer, and api modules to improve coverage

### Changed
- **`palette-utils-ts/` → `color-palette-utils-ts/`** (folder matches npm name `color-palette-utils-ts`). Root: `npm test` uses `--prefix color-palette-utils-ts`; scripts `test:color-palette-utils-ts`, `test:coverage:color-palette-utils-ts`, `test:coverage:all`.
- **Palette list order**: `GET /api/images` returns palettes in `color_palettes.jsonl` line order (no reverse). Reorder API persists that same order. New uploads/duplicates append to the file (appear at bottom until reordered).
- Server port config: use `EXPRESS_PORT` instead of `PORT` in .env and scripts (clearer architecture)
- Match Region Swatches: renamed from "Match Palette Swatches"
- Match Region Swatches: re-pairing only occurs when feature is enabled
- Deleting regions mode: one region per session, exits after clicking a region
- Adding swatches mode: cursor shows crosshair (+) over palette image
- Deleting regions mode: cursor shows small X icon over regions
- Checkbox labels: "Adding swatches (click)" and "Deleting regions (click)"
- Mutual exclusivity: entering one mode (Adding/Deleting) exits the other
- Click outside palette image exits active mode and clears checkbox
- MetadataDisplay: added "# Swatches" and "# Regions" fields

### Documentation
- API: JSONL metadata fields `s3Key`, `imagePublicUrl`, `backgroundSwatchIndex`
- S3-STORAGE: Scripts table (create bucket, migrate, open in Chrome, import resume-flock)
- DEVELOPMENT: Project structure (s3-storage.js, scripts), npm scripts (migrate:s3, import:resume-flock-monotone), S3 env vars
- README: S3 `aws s3 ls` and browser URL format

### Fixed
- Checkbox toggle now properly exits mode (fixed race condition with click-outside handler)
- Deleting regions checkbox: off and disabled when zero regions
- Match Region Swatches checkbox: disabled when no swatches or no regions

## [1.0.0] - 2026-02-17

### Added

- Extract color palettes from images using K-means clustering with luminance filtering and CIEDE2000 perceptual distance
- Detect image regions with OpenCV (Python subprocess)
- Manual color sampling: click on image to add swatch
- Export palettes as JSON
- Light/dark theme support with CSS custom properties
- Error boundary for graceful handling of React rendering errors
- GitHub Actions CI workflow (lint, test, build)
- Scripts: `mov-to-gif.sh` (convert MOV to GIF with optional scale reduction), `gif-first-frame.sh` (extract first frame from animated GIF)
- New uploads appear at top of palette listing (sorted by `createdDateTime`)

### Changed

- README restructured; split into docs (USER_GUIDE, API, ARCHITECTURE, DEVELOPMENT, FUTURE-WORK)
- ImageLibrary Dup/Del buttons use CSS class instead of inline styles
- Metadata display: removed max-height constraint (no scrolling)
- API client: `handleResponse()` checks `response.ok` for graceful error handling
- Port configurable via `process.env.PORT`

### Fixed

- Lint: removed unused `applyRegionsToImages` import
- Lint: replaced `process.env.NODE_ENV` with `import.meta.env.DEV` in ErrorBoundary (Vite-compatible)
- `getFilenameFromMeta` supports Windows backslash paths
- `metadata_handler` uses `'\n'` instead of `os.EOL` for cross-platform JSONL

### Documentation

- Added polygonCentroid duplication comments (server + client implementations)
- USER_GUIDE: documented that new uploads appear at top of palette listing

[1.0.0]: https://github.com/sbecker11/color-palette-maker-react/releases/tag/v1.0.0
