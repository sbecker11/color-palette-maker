# Color Palette Maker (React)

<a href="https://sbecker11.github.io/color-palette-maker-react/images/gold-blue-2.gif" alt="Gold-Blue" width="400">
  <img src="https://sbecker11.github.io/color-palette-maker-react/images/gold-2.gif" alt="Gold palette demo" width="400" />
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

## Quick Start (Docker)

**Prerequisites:** Docker and Docker Compose. For S3 image uploads and the palette catalog (used by `color-palette-utils-ts` and consumers), AWS S3 must be configured — see [S3 storage](docs/S3-STORAGE.md).

```bash
mkdir -p docker-data && touch docker-data/color_palettes.jsonl
docker compose up --build
```

Open http://localhost:3000. Uploads and metadata persist in `./docker-data/`.

For production deployment (including VPS), see [VPS Hosting](docs/VPS-HOSTING.md).

## Documentation

| Doc | Description |
|-----|-------------|
| [Changelog](CHANGELOG.md) | Version history and release notes |
| [User Guide](docs/USER_GUIDE.md) | Features, key actions, color sampling, region workflow |
| [API Reference](docs/API.md) | REST endpoints, request/response formats |
| [Architecture](docs/ARCHITECTURE.md) | Region & palette pipeline, data flow, storage format |
| [Development](docs/DEVELOPMENT.md) | Docker workflow, project structure, env vars |
| [VPS Hosting](docs/VPS-HOSTING.md) | Deploy on a VPS (Ubuntu/Debian, Docker, firewall, reverse proxy) |
| [S3 storage](docs/S3-STORAGE.md) | S3 bucket for palette images and public read-only `color_palettes.jsonl` (same bucket; setup script + IAM; `palettesJsonlPublicUrl` in `/api/config`) |
| [Future Work](docs/FUTURE-WORK.md) | Improvement backlog, SPA/SaaS migration outlines |
| [Single-User SPA → Docker Compose](docs/archive/Single-User-SPA-DockerCompose-migration.md) | Multi-service orchestration outline |
| [Multi-User SaaS → Kubernetes](docs/archive/Multi-User-SaaS-Kubernetes-migration.md) | Kubernetes migration outline |

### S3: List objects and open in browser

With S3 enabled, list images in your bucket:

```bash
aws s3 ls s3://YOUR_BUCKET/images/
```

Use this URL format in the browser (`REGION` is **`us-west-1` only**; replace `YOUR_BUCKET` and `filename`):

```
https://YOUR_BUCKET.s3.us-west-1.amazonaws.com/images/filename
```

Example: `https://sbecker11-color-palette-images.s3.us-west-1.amazonaws.com/images/img-1744078413434-723799869.jpeg`

## License

MIT
