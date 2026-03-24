# Development Guide

This project is intended to be run locally with Node + Python.

---

## Prerequisites

- **Node.js 20+**
- **Python 3** + pip
- **AWS S3** — required for image uploads, the public palette catalog (`color_palettes.jsonl`), and the `color-palette-utils-ts` integration test. See [S3 storage](S3-STORAGE.md) and run `scripts/create-s3-palette-bucket.sh` as part of setup.

---

## Run Locally

Create the data directory and an empty metadata file, then start the app:

```bash
npm install
cd client && npm install && cd ..
pip install -r requirements.txt
mkdir -p local-data-cache
touch local-data-cache/color_palettes.jsonl
npm run dev
```

Open http://localhost:3000. Local state (images + `color_palettes.jsonl`) lives in `./local-data-cache/`.
Public URLs for images are `/palette-images/<filename>`.

### Direct Express URL (optional)

For `npm run dev`, the normal entrypoint is the Vite URL (`http://localhost:<VITE_DEV_PORT>`).
If you want to open Express directly (without Vite), use:

- `http://localhost:<EXPRESS_PORT>` (or the auto-picked port if `EXPRESS_PORT` is busy)

---

## Running multiple instances in parallel (local npm dev)

To run several copies of this app (or other apps using the same ports) on one machine, set different ports per project.

1. **Root `.env`** (project root):
   ```bash
   EXPRESS_PORT=3001
   VITE_DEV_PORT=5174
   ```
   Example: App A uses `EXPRESS_PORT=3000`, `VITE_DEV_PORT=5173`; App B uses `EXPRESS_PORT=3001`, `VITE_DEV_PORT=5174`.

2. All env (including `VITE_DEV_PORT`, `VITE_API_PORT`) lives in the root `.env`. Vite loads it via `envDir`.

3. Run dev as usual: `npm run dev` or `npm run dev:open`. The Express server listens on `EXPRESS_PORT`, the Vite dev server on `VITE_DEV_PORT`, and the proxy targets `EXPRESS_PORT`.

---

## Testing

CI runs lint and tests on every push (see [.github/workflows/ci.yml](../.github/workflows/ci.yml)). To run the same checks locally you need Node.js; from the project root:

```bash
npm install && cd client && npm install && cd ..
npm test
```

Tests cover the client (components, API, app `utils.js`), the **`color-palette-utils-ts`** package (Vitest), server modules (metadata_handler, image_processor), and image-viewer geometry. Root **`utils/`** JS modules each have matching Vitest files under `client/src/` (e.g. `color_utils.test.js`, `swatchLabels.test.js`, `regionStrategies.test.js`, `polygonCentroid.test.js`, plus `*.cjs.test.js` parity for the Node CJS builds). This step is optional if you rely on CI.

**`color-palette-utils-ts` integration test** fetches the live palette catalog from S3 and will fail with `403 Forbidden` until S3 is configured. Run `scripts/create-s3-palette-bucket.sh` first — see [S3 storage](S3-STORAGE.md).

---

## Continuous Integration

The repository includes a [GitHub Actions workflow](../.github/workflows/ci.yml) that runs on every push and pull request to `master` or `main`:

1. Install dependencies (root + client)
2. Lint (ESLint)
3. Test (`npm test`)
4. Build (`npm run build`)

CI must pass before merging pull requests.

---

## Python / region detection

Region detection runs in a Python subprocess and needs OpenCV and NumPy. Use a virtualenv and install from the repo root:

```bash
pip install -r requirements.txt
```

**SLIC** (superpixels) requires **opencv-contrib-python** (not plain opencv-python). If you see an error when using SLIC:

```bash
pip install opencv-contrib-python
```

This replaces opencv-python. Other detection strategies work with opencv-python only.

---

## Project Structure

```
color-palette-maker/
├── .github/workflows/ci.yml
├── client/                 # React frontend (Vite 5)
│   ├── src/                # Components, API, utils, tests
│   ├── public/             # Static assets, about.html
│   ├── vite.config.js
│   └── package.json
├── docs/
├── scripts/
│   ├── create-s3-palette-bucket.sh    # Create S3 bucket, policy, CORS
│   ├── migrate-uploads-to-s3.js       # Upload local-data-cache/ images to S3, update metadata
│   ├── open-s3-jpegs-in-chrome.sh     # Open JPEGs in Chrome (Enter to advance)
│   └── import-resume-flock-monotone-palettes.js  # Import monotone palettes from resume-flock
├── color-palette-utils-ts/ # npm package `color-palette-utils-ts` (TS utils + NDJSON catalog)
├── static_content/         # Icons, CSS (palette.css), images (hero GIFs)
├── utils/                  # JS/CJS helpers + detect_regions.py (OpenCV region detection)
├── server.js               # Express server
├── metadata_handler.js
├── image_processor.js
├── s3-storage.js             # S3 uploads (region from env or ~/.aws/config)
├── requirements.txt        # Python deps for region detection
└── package.json
```

---

<a id="workspace-editor-defaults"></a>
## Workspace editor defaults (Cursor/VS Code)

This repo includes workspace settings so React/TypeScript contributors share consistent formatting and lint behavior:

- `.vscode/settings.json`
- `.vscode/extensions.json`

Current defaults:

- Format on save (Prettier)
- ESLint + organize imports on save
- ESLint validation for JS/TS/React files
- Auto-update imports on file move

To opt out locally, use **User Settings** in Cursor (global) or add your own untracked overrides in the workspace and do not commit them.

---

## npm Scripts (S3)

| Script | Description |
|--------|-------------|
| `npm run verify:s3` | Verify IAM S3 read/write and public palette-catalog URL. See [S3 storage](S3-STORAGE.md). |
| `npm run migrate:s3` | Migrate existing `local-data-cache/` image files to S3, update `local-data-cache/color_palettes.jsonl` with `s3Key` and `imagePublicUrl`. Use `--dry-run` to preview, `--force` to re-upload all. |
| `npm run test:color-palette-utils-ts` | Vitest in `color-palette-utils-ts/` (colors, palette JSON, NDJSON catalog). |
| `npm run test:coverage:color-palette-utils-ts` | Same + V8 coverage → `color-palette-utils-ts/coverage/`. |
| `npm run test:coverage` | Client lint + client Vitest coverage (thresholds in `client/`). |
| `npm run test:coverage:all` | Client `test:coverage` **then** `color-palette-utils-ts` coverage. |
| `npm run test:coverage:all:tables` | Same two packages, **no ESLint**; Vitest uses `--silent --reporter=json` (results under `node_modules/.vitest-report.json`) so stdout is mostly **coverage tables** plus a short “JSON report written” line and one line from `save-coverage-report.js` (client only). |
| `npm run test:coverage:tables` (in `client/`) | Client coverage only, tables-focused output. |

Optional utility script kept for local use (not part of standard workflow): `node scripts/import-resume-flock-monotone-palettes.js`.

---

## Environment Variables

### Server

Set in root `.env` (see `.env.example` for all options).

| Variable | Description |
|----------|-------------|
| `EXPRESS_PORT` | Express server port. Default 3000. |
| `DETECT_REGIONS_PYTHON` | Python for region detection. Set to `python3` in the image. |
| `S3_IMAGES_BUCKET` | S3 bucket for palette images (enables S3). See [S3 storage](S3-STORAGE.md). |
| `S3_PALETTES_JSONL_KEY` | Optional. Object key for `color_palettes.jsonl` (default `metadata/color_palettes.jsonl`). IAM Get/Put; bucket policy public GetObject for consumers (see `create-s3-palette-bucket.sh`). |
| `AWS_REGION` | AWS region (e.g. `us-west-1`). Optional if set in `~/.aws/config`. |
| `MIN_LUMINANCE_THRESHOLD` | Palette luminance floor (0–255). Default 25. |
| `MAX_LUMINANCE_THRESHOLD` | Palette luminance ceiling (0–255). Default 185. |

### Client (build-time)

The React app reads `VITE_*` variables at **build time** (when the image is built). To customize, set them in the root `.env` (see root `.env.example`). Vite loads the root `.env` via `envDir`.

| Variable | Description |
|----------|-------------|
| `VITE_HIGHLIGHT_REGION_ON_ROLLOVER` | Highlight region on hover. Default `true`. |
| `VITE_REGION_BOUNDARY_STROKE_WIDTH` | Default (non-highlighted) region boundary stroke width (px). Default `1`. |
| `VITE_REGION_BOUNDARY_STROKE_COLOR` | Default region boundary stroke color (CSS color). Default `rgba(50, 120, 200, 0.9)`. |
| `VITE_REGION_HIGHLIGHT_STROKE_WIDTH` | Highlighted region stroke width (px). Default `3`. |
| `VITE_REGION_HIGHLIGHT_STROKE_COLOR` | Highlighted region stroke color (CSS color). Default `rgba(80, 160, 255, 1)`. |
| `VITE_REGION_HIGHLIGHT_FILL` | Highlighted region fill (CSS color). Default `rgba(150, 220, 255, 0.45)`. |
