# S3 storage for palette images

**This project requires AWS S3 access** for image uploads and for the public palette catalog (`metadata/color_palettes.jsonl`). The `color-palette-utils-ts` package and its consumers (e.g. resume-flock) depend on this setup. Configure S3 as part of project setup.

**Region for this project:** `us-west-1` only (set `AWS_REGION=us-west-1` or the same in `~/.aws/config`).

When `S3_IMAGES_BUCKET` is set **and** a region can be resolved (`AWS_REGION` or `region` in `~/.aws/config` for the active profile — usually `[default]`), every uploaded or URL-downloaded image is:

1. **Uploaded to S3** under `images/{filename}` (or `S3_IMAGES_PREFIX/{filename}`). If this step fails, the upload request fails; metadata is not appended.
2. **Written to `local-data-cache/`** as a **local cache** for Sharp, K-means, Python region detection, and fast `GET /palette-images/<filename>` after the first hit.

The HTTP URL **`/palette-images/<filename>`** still serves from the app origin. If the file is missing on disk but exists in S3, the server **read-through** fetches the object once, writes it into `local-data-cache/`, then serves it (see `image_cache.js`).

Metadata records gain:

- `s3Key` — object key in the bucket  
- `imagePublicUrl` — HTTPS URL used by the React app (often via `/api/image-proxy` for CORS) and included in palette JSON export when present  

**The server requires S3 in normal operation:** on startup it exits if the bucket/region are not configured or if **`verifyIamAccess()`** fails (Put/Get/Delete probe under `metadata/`). There is no supported “local-only” runtime mode in this configuration.

### Palette list (`color_palettes.jsonl`) in the same bucket

The server stores the full palette metadata file in the **same bucket** as images under a dedicated object key (default **`metadata/color_palettes.jsonl`**). Override with **`S3_PALETTES_JSONL_KEY`**.

- **Write (S3-first)**: On each append or rewrite, the server **`PutObject`s the full JSONL to S3**, then writes the **`local-data-cache/color_palettes.jsonl` mirror** for local processing. If S3 write fails, the operation fails (no silent local-only drift). Anonymous users still cannot write; only IAM can `PutObject`.
- **Read**: Reads the catalog **from S3** (not from the local file as primary). A missing object is treated as an **empty catalog** (`[]`). An in-memory cache avoids refetching on every request: set **`METADATA_CACHE_TTL_MS`** (default `5000`) to tune TTL; cache is refreshed after TTL or updated on successful writes.
- **Consumers (read-only, like images)**: Use the same model as palette images — **`scripts/create-s3-palette-bucket.sh` adds a second bucket-policy statement** so `"Principal": "*"` may **`s3:GetObject` only** on that JSONL object (exact key ARN). No public `PutObject` / `DeleteObject`. CORS on the bucket applies to GET for that object as well. The app exposes the HTTPS URL as **`palettesJsonlPublicUrl`** in **`GET /api/config`** when S3 is enabled (same shape as `imagePublicUrl` for images).

**Typical local setup:** put `region` under `[default]` in `~/.aws/config` and `aws_access_key_id` / `aws_secret_access_key` under `[default]` in `~/.aws/credentials` (same as `aws configure`). You only need `S3_IMAGES_BUCKET` in `.env`; omit `AWS_REGION` and key env vars if you use those files. Set `AWS_PROFILE` if you use a non-default profile.

**Existing buckets:** Add the **PublicReadOnlyPalettesJsonl** statement from [Bucket policy](#bucket-policy-public-read-only), or re-run the create script.

## Create the bucket with AWS CLI (local)

From the repo root, after `aws configure` or AWS SSO works:

```bash
export AWS_REGION=us-west-1
export S3_IMAGES_BUCKET=sbecker11-color-palette-images
./scripts/create-s3-palette-bucket.sh
```

The script creates the bucket (if missing), adjusts **Block Public Access** so a bucket policy is allowed, applies **public read-only** on `images/*` (or `S3_IMAGES_PREFIX`) **and** on the palettes JSONL object (`metadata/color_palettes.jsonl` or `S3_PALETTES_JSONL_KEY`), and sets CORS (`AllowedOrigins: *` — narrow this in the console for production).

Then attach the **IAM read-write** policy (below) to the same identity shown by `aws sts get-caller-identity`.

**Verify from the repo root** (loads `.env`, uses the same credentials as the app):

```bash
npm run verify:s3
```

This checks **IAM** Put/Get/Delete on a temporary object under `metadata/` and **anonymous** read (HEAD) on the public palette catalog URL.

## Migrate existing local `local-data-cache/` image files to S3

If images were added **before** S3 was enabled, they exist only under `local-data-cache/` and metadata rows may lack `s3Key` / `imagePublicUrl`.

1. **Back up metadata** (required):
   ```bash
   cp local-data-cache/color_palettes.jsonl local-data-cache/color_palettes.jsonl.bak
   ```
2. Ensure `.env` has `S3_IMAGES_BUCKET` (and region/credentials as usual). Bucket policy + CORS should match **docs/S3-STORAGE.md** / `create-s3-palette-bucket.sh`.
3. **Dry run** (prints what would upload):
   ```bash
   npm run migrate:s3 -- --dry-run
   ```
4. **Run migration** (uploads each file referenced in `color_palettes.jsonl`, then rewrites the file with S3 fields):
   ```bash
   npm run migrate:s3
   ```
5. Restart the app. The UI prefers `imagePublicUrl` when set.

Rows that **already** have both `s3Key` and `imagePublicUrl` are skipped. To **re-upload** everything (e.g. new bucket), use `--force`.

Files in `local-data-cache/` that are **not** listed in `color_palettes.jsonl` are not migrated by this script (no app metadata to update).

## Permission model (public read-only vs app read-write)

Use **two different principals**:

| Who | Access | How |
|-----|--------|-----|
| **Everyone (browser, other apps)** | **Read-only** — fetch image bytes and palette NDJSON via HTTPS | Bucket policy: allow `s3:GetObject` for `"Principal": "*"` on `arn:aws:s3:::BUCKET/prefix/*` **and** on the single JSONL object ARN (e.g. `.../metadata/color_palettes.jsonl`). No `PutObject`, `DeleteObject`, or `ListBucket` for anonymous users. |
| **You / the Color Palette Maker server** | **Read-write** — upload, delete, duplicate | IAM user or IAM role whose credentials the app uses (`AWS_ACCESS_KEY_ID` / role on EC2/ECS/Lambda, etc.). Attach a policy with `s3:PutObject`, `s3:GetObject`, `s3:DeleteObject`, and `s3:CopyObject` on the same bucket/prefix (and optionally `s3:ListBucket` on `arn:aws:s3:::BUCKET` with prefix condition for debugging). |

The public never receives AWS keys; they only open `imagePublicUrl` in a browser (GET). Writes always go through your Node server with IAM credentials.

**Block Public Access:** AWS may block bucket policies that grant public access. To allow anonymous **read** only, you typically allow a public bucket policy for `GetObject` on the image prefix and adjust Block Public Access so that **new** public policies are allowed (or use CloudFront with OAC and keep the bucket private — then “public” read is via CloudFront, not direct S3).

## Environment variables

| Variable | Required | Description |
|----------|----------|-------------|
| `S3_IMAGES_BUCKET` | Yes (app startup) | Bucket name |
| `AWS_REGION` | No* | e.g. `us-west-1`; if unset, uses `region` from `~/.aws/config` for the profile (`AWS_PROFILE` or `default`) |
| `AWS_ACCESS_KEY_ID` | No* | Or omit and use `~/.aws/credentials` / IAM role (SDK default chain) |
| `AWS_SECRET_ACCESS_KEY` | No* | Same as above |
| `S3_IMAGES_PREFIX` | No | Default `images` |
| `S3_PUBLIC_URL_BASE` | No | CloudFront or custom origin base URL (no trailing slash). If unset, URLs use virtual-hosted style `https://{bucket}.s3.{region}.amazonaws.com/{key}` |
| `S3_PALETTES_JSONL_KEY` | No | Object key for palette metadata JSONL; default `metadata/color_palettes.jsonl`. Must match the ARN in your public bucket policy if consumers read from S3. |
| `METADATA_CACHE_TTL_MS` | No | In-process cache lifetime (ms) for palette metadata read from S3; default `5000`. Set `0` to disable TTL caching (always refetch). |

\*You need **some** way to supply region (env or config) and credentials (env, credentials file, or role).

See `.env.example` for a template.

## Scripts

| Script | Purpose |
|--------|---------|
| `scripts/create-s3-palette-bucket.sh` | Create bucket, apply public read policy (`images/*` + palettes JSONL object) and CORS. Run with `S3_IMAGES_BUCKET` and `AWS_REGION` in env; optional `S3_IMAGES_PREFIX`, `S3_PALETTES_JSONL_KEY`. |
| `npm run verify:s3` (`scripts/verify-s3-access.js`) | Verify IAM read/write (probe under `metadata/`) and anonymous HEAD on the palette catalog URL. Run from repo root after `.env` + AWS credentials are set. |
| `scripts/migrate-uploads-to-s3.js` | Upload existing `local-data-cache/` image files to S3 and set `s3Key` / `imagePublicUrl` on metadata. `npm run migrate:s3` (use `--dry-run` or `--force`). |
| `scripts/open-s3-jpegs-in-chrome.sh` | Open each `.jpg` / `.jpeg` in `local-data-cache/` (or a given dir) in Chrome, one at a time; press Enter to advance. |
| `scripts/import-resume-flock-monotone-palettes.js` | Optional local utility to import monotone palettes from resume-flock into this app's metadata/S3 data. Run directly with `node scripts/import-resume-flock-monotone-palettes.js`. |

## Bucket policy (public **read-only**)

Anonymous users get **only** `GetObject` on your image prefix **and** on the palette JSONL object — they cannot upload, delete, or list the bucket.

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PublicReadOnlyPaletteImages",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::YOUR_BUCKET_NAME/images/*"
    },
    {
      "Sid": "PublicReadOnlyPalettesJsonl",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::YOUR_BUCKET_NAME/metadata/color_palettes.jsonl"
    }
  ]
}
```

Replace `YOUR_BUCKET_NAME`, `images/*`, and `metadata/color_palettes.jsonl` with your bucket, `S3_IMAGES_PREFIX`, and `S3_PALETTES_JSONL_KEY` if different. Do **not** add `s3:PutObject`, `s3:DeleteObject`, or `s3:ListBucket` for `"Principal": "*"`.

**Security:** The JSONL file contains full palette metadata (names, colors, regions, URLs). Public read is intentional for consumer apps, same trade-off as public image URLs.

## CORS

The app draws the image on a canvas for color sampling. Cross-origin images need CORS. On the bucket, add a CORS configuration allowing `GET` from your app’s origin, for example:

```json
[
  {
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["GET", "HEAD"],
    "AllowedOrigins": ["http://localhost:3000", "https://your-production-domain.com"],
    "ExposeHeaders": [],
    "MaxAgeSeconds": 3000
  }
]
```

The React `ImageViewer` sets `crossOrigin="anonymous"` when `src` is an absolute `http(s)` URL.

## IAM policy (app owner — read-write)

Attach this to the **IAM user or role** the Node server uses (not to anonymous users). Example (adjust bucket, image prefix, and palettes key if you changed `S3_PALETTES_JSONL_KEY`):

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PaletteMakerImageReadWrite",
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:GetObject",
        "s3:DeleteObject",
        "s3:CopyObject"
      ],
      "Resource": "arn:aws:s3:::YOUR_BUCKET_NAME/images/*"
    },
    {
      "Sid": "PaletteMakerPalettesJsonlReadWrite",
      "Effect": "Allow",
      "Action": ["s3:PutObject", "s3:GetObject"],
      "Resource": "arn:aws:s3:::YOUR_BUCKET_NAME/metadata/color_palettes.jsonl"
    }
  ]
}
```

If you set `S3_PALETTES_JSONL_KEY` to something else, use that full key in the ARN (or use `metadata/*` if all objects under that prefix are app-owned).

Optional: `s3:ListBucket` with `"Condition": { "StringLike": { "s3:prefix": ["images/*"] } }` on `arn:aws:s3:::YOUR_BUCKET_NAME` if you want the owner to list objects in the console.

Keep these credentials only on the server (env vars, IAM role, Secrets Manager) — never in the browser or in exported palette JSON.

## Downstream consumers (JSONL)

Consumer apps can read the palette list in three ways:

| Approach | URL / access | Notes |
|----------|----------------|-------|
| **S3 HTTPS (recommended)** | Same URL pattern as images: `https://{bucket}.s3.{region}.amazonaws.com/{key}` or `{S3_PUBLIC_URL_BASE}/{key}`. **`GET /api/config`** returns **`palettesJsonlPublicUrl`** when the bucket is configured. | Requires public **`GetObject`** on that object (included in `create-s3-palette-bucket.sh`). Read-only for everyone; writes only via your server IAM. Matches how **`color-palette-utils-ts`** and external consumers load the catalog. |
| **Express** | `GET https://your-app-host/api/color-palettes.jsonl` | Same NDJSON as S3 (served from app state backed by S3); `Cache-Control: no-store`. See [API.md](API.md). |
| **JSON array** | `GET /api/images` | Same data as JSON `{ success, images }` if consumers prefer one JSON payload. |

**Parsing NDJSON**: split on newlines, ignore empty lines, `JSON.parse` each line. Order matches the UI list (first line = first palette).

**CORS**: Bucket CORS allows browsers on other origins to `GET` the JSONL object the same way as images (tighten `AllowedOrigins` in production).

## Exports

Exported palette JSON may include `imagePublicUrl` so downstream apps can load the image without your Express `/palette-images` route.
