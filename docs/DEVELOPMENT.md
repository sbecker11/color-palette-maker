# Development Guide

This project is intended to be run with **Docker** for both local use and production. You do not need Node.js, Python, or npm installed on your machine.

---

## Prerequisites

- **Docker** and **Docker Compose**
- **AWS S3** — required for image uploads, the public palette catalog (`color_palettes.jsonl`), and the `color-palette-utils-ts` integration test. See [S3 storage](S3-STORAGE.md) and run `scripts/create-s3-palette-bucket.sh` as part of setup.

---

## Run with Docker Compose

Create the metadata file on the host (so Docker does not create it as a directory), then start the app:

```bash
mkdir -p docker-data
touch docker-data/color_palettes.jsonl
docker compose up --build
```

Open http://localhost:3000. Uploads and metadata persist in `./docker-data/`.

To run in the background:

```bash
docker compose up -d --build
```

To apply code changes, rebuild and restart:

```bash
docker compose up -d --build
```

---

## Production Deployment (Docker)

Build and push the image (optional, for a registry), then run on the host:

```bash
docker build -t your-registry/color-palette-maker-react:latest .
docker push your-registry/color-palette-maker-react:latest   # if using a registry
docker run -d -p 3000:3000 --name color-palette-maker-react your-registry/color-palette-maker-react:latest
```

For persistence, use volumes (see [VPS Hosting](VPS-HOSTING.md) for a full example):

```bash
docker run -d -p 3000:3000 \
  -v $(pwd)/docker-data/uploads:/app/uploads \
  -v $(pwd)/docker-data/color_palettes.jsonl:/app/color_palettes.jsonl \
  --name color-palette-maker-react your-registry/color-palette-maker-react:latest
```

For step-by-step VPS deployment (Ubuntu/Debian, Nginx, HTTPS), see [VPS Hosting](VPS-HOSTING.md).

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

Tests cover the client (components, API, utils), the **`color-palette-utils-ts`** package (Vitest), server modules (metadata_handler, image_processor), and image-viewer geometry. This step is optional if you rely on CI.

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
color-palette-maker-react/
├── .github/workflows/ci.yml
├── client/                 # React frontend (Vite 5)
│   ├── src/                # Components, API, utils, tests
│   ├── public/             # Static assets, about.html
│   ├── vite.config.js
│   └── package.json
├── docs/
├── scripts/
│   ├── detect_regions.py              # Python/OpenCV region detection
│   ├── create-s3-palette-bucket.sh    # Create S3 bucket, policy, CORS
│   ├── migrate-uploads-to-s3.js       # Upload uploads/ to S3, update metadata
│   ├── open-s3-jpegs-in-chrome.sh     # Open JPEGs in Chrome (Enter to advance)
│   └── import-resume-flock-monotone-palettes.js  # Import monotone palettes from resume-flock
├── color-palette-utils-ts/ # npm package `color-palette-utils-ts` (TS utils + NDJSON catalog)
├── server.js               # Express server
├── metadata_handler.js
├── image_processor.js
├── s3-storage.js             # S3 uploads (region from env or ~/.aws/config)
├── requirements.txt        # Python deps (used in Dockerfile)
├── Dockerfile
├── docker-compose.yml
├── .dockerignore
└── package.json
```

---

## npm Scripts (S3 and imports)

| Script | Description |
|--------|-------------|
| `npm run verify:s3` | Verify IAM S3 read/write and public palette-catalog URL. See [S3 storage](S3-STORAGE.md). |
| `npm run migrate:s3` | Migrate existing `uploads/` files to S3, update `color_palettes.jsonl` with `s3Key` and `imagePublicUrl`. Use `--dry-run` to preview, `--force` to re-upload all. |
| `npm run test:color-palette-utils-ts` | Vitest in `color-palette-utils-ts/` (colors, palette JSON, NDJSON catalog). |
| `npm run test:coverage:color-palette-utils-ts` | Same + V8 coverage → `color-palette-utils-ts/coverage/`. |
| `npm run test:coverage` | Client lint + client Vitest coverage (thresholds in `client/`). |
| `npm run test:coverage:all` | Client `test:coverage` **then** `color-palette-utils-ts` coverage. |
| `npm run import:resume-flock-monotone` | Import White_Monotone, Medium_Grey_Monotone, Black_Monotone from resume-flock as swatch images. See [S3 storage](S3-STORAGE.md#scripts). |

---

## Environment Variables

### Server (Docker / container)

Set in `docker-compose.yml` or when running `docker run -e ...`. See root `.env.example` for a list; the image defaults are suitable for most runs.

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
