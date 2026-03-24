# Color Palette Maker

<a href="static_content/images/gold-blue-2.gif">
  <img src="static_content/images/gold-2.gif" alt="Gold palette demo" width="400" />
</a>

A React + Node.js app for extracting and managing color palettes from images.
Upload via URL or file, extract dominant colors with K-means clustering,
detect image regions with OpenCV, and export palettes as JSON.

## Tech Stack

- **Frontend**: React 19, Vite 5
- **Backend**: Node.js, Express
- **Image Processing**: Sharp, node-kmeans, get-pixels, color-diff (CIEDE2000)
- **Region Detection**: Python 3, OpenCV, NumPy
- **Testing**: Vitest, React Testing Library, happy-dom

## Quick Start (Local)

**Prerequisites:** Node.js 20+, Python 3, pip.

```bash
npm install
cd client && npm install && cd ..
pip install -r requirements.txt

mkdir -p local-data-cache
npm run dev
```

Open the Vite URL shown in the terminal (usually `http://localhost:5173`).

Local state is stored in `./local-data-cache/`:
- image files
- `color_palettes.jsonl` metadata

When S3 is configured, **S3 is the source of truth** for images and the palette catalog; `./local-data-cache/` is a **local cache** (performance and processing) kept in sync on writes.

Images are served at `/palette-images/<filename>` in the browser.

Need S3? See [S3 storage](docs/S3-STORAGE.md).

### Port behavior

- **Express** starts at `EXPRESS_PORT` and auto-picks the next free port when needed.
- **Vite** starts at `VITE_DEV_PORT` and auto-picks if that port is busy.
- Dev helper scripts detect these auto-picked ports so proxying and browser open still work.

## Documentation

| Doc | Description |
|-----|-------------|
| [Changelog](CHANGELOG.md) | Version history and release notes |
| [User Guide](docs/USER_GUIDE.md) | Features, key actions, color sampling, region workflow |
| [API Reference](docs/API.md) | REST endpoints, request/response formats |
| [Architecture](docs/ARCHITECTURE.md) | Region & palette pipeline, data flow, storage format |
| [Development](docs/DEVELOPMENT.md) | Local workflow, project structure, env vars |
| [S3 storage](docs/S3-STORAGE.md) | S3 bucket for palette images and public read-only `color_palettes.jsonl` (same bucket; setup script + IAM; `palettesJsonlPublicUrl` in `/api/config`) |
| [Future Work](docs/FUTURE-WORK.md) | Improvement backlog, SPA/SaaS migration outlines |
| [Multi-User SaaS → Kubernetes](docs/archive/Multi-User-SaaS-Kubernetes-migration.md) | Kubernetes migration outline |

Workspace editor defaults for Cursor/VS Code (React/TypeScript formatting + lint behavior) are documented in [Development](docs/DEVELOPMENT.md#workspace-editor-defaults).

### S3 quick check

List uploaded images:

```bash
aws s3 ls s3://sbecker11-color-palette-images/images/
```

Open an image in the browser:

```text
https://sbecker11-color-palette-images.s3.us-west-1.amazonaws.com/images/FILENAME
```

Example:
`https://sbecker11-color-palette-images.s3.us-west-1.amazonaws.com/images/img-1744078413434-723799869.jpeg`

## License

MIT
