# S3 storage for palette images

When `S3_IMAGES_BUCKET` is set **and** a region can be resolved (`AWS_REGION` or `region` in `~/.aws/config` for the active profile — usually `[default]`), every uploaded or URL-downloaded image is:

1. Saved locally under `uploads/` (unchanged — used for Sharp, K-means, Python region detection).
2. Uploaded to your S3 bucket under `images/{filename}` (or `S3_IMAGES_PREFIX/{filename}`).

Metadata records gain:

- `s3Key` — object key in the bucket  
- `imagePublicUrl` — HTTPS URL used by the React app (`<img src>`) and included in palette JSON export when present  

If the bucket is unset or no region is found (env + config), behavior matches the previous local-only setup.

**Typical local setup:** put `region` under `[default]` in `~/.aws/config` and `aws_access_key_id` / `aws_secret_access_key` under `[default]` in `~/.aws/credentials` (same as `aws configure`). You only need `S3_IMAGES_BUCKET` in `.env`; omit `AWS_REGION` and key env vars if you use those files. Set `AWS_PROFILE` if you use a non-default profile.

## Create the bucket with AWS CLI (local)

From the repo root, after `aws configure` or AWS SSO works:

```bash
export AWS_REGION=us-east-1
export S3_IMAGES_BUCKET=your-globally-unique-bucket-name
./scripts/create-s3-palette-bucket.sh
```

The script creates the bucket (if missing), adjusts **Block Public Access** so a bucket policy is allowed, applies **public read-only** on `images/*` (or `S3_IMAGES_PREFIX`), and sets CORS (`AllowedOrigins: *` — narrow this in the console for production).

Then attach the **IAM read-write** policy (below) to the same identity shown by `aws sts get-caller-identity`.

## Migrate existing local `uploads/` files to S3

If images were added **before** S3 was enabled, they exist only under `uploads/` and metadata rows may lack `s3Key` / `imagePublicUrl`.

1. **Back up metadata** (required):
   ```bash
   cp image_metadata.jsonl image_metadata.jsonl.bak
   ```
2. Ensure `.env` has `S3_IMAGES_BUCKET` (and region/credentials as usual). Bucket policy + CORS should match **docs/S3-STORAGE.md** / `create-s3-palette-bucket.sh`.
3. **Dry run** (prints what would upload):
   ```bash
   npm run migrate:s3 -- --dry-run
   ```
4. **Run migration** (uploads each file referenced in `image_metadata.jsonl`, then rewrites the file with S3 fields):
   ```bash
   npm run migrate:s3
   ```
5. Restart the app. The UI prefers `imagePublicUrl` when set.

Rows that **already** have both `s3Key` and `imagePublicUrl` are skipped. To **re-upload** everything (e.g. new bucket), use `--force`.

Files in `uploads/` that are **not** listed in `image_metadata.jsonl` are not migrated by this script (no app metadata to update).

## Permission model (public read-only vs app read-write)

Use **two different principals**:

| Who | Access | How |
|-----|--------|-----|
| **Everyone (browser, other apps)** | **Read-only** — fetch image bytes via HTTPS | Bucket policy: allow `s3:GetObject` only on `arn:aws:s3:::BUCKET/prefix/*` for `"Principal": "*"`. No `PutObject`, `DeleteObject`, or `ListBucket` for anonymous users. |
| **You / the Color Palette Maker server** | **Read-write** — upload, delete, duplicate | IAM user or IAM role whose credentials the app uses (`AWS_ACCESS_KEY_ID` / role on EC2/ECS/Lambda, etc.). Attach a policy with `s3:PutObject`, `s3:GetObject`, `s3:DeleteObject`, and `s3:CopyObject` on the same bucket/prefix (and optionally `s3:ListBucket` on `arn:aws:s3:::BUCKET` with prefix condition for debugging). |

The public never receives AWS keys; they only open `imagePublicUrl` in a browser (GET). Writes always go through your Node server with IAM credentials.

**Block Public Access:** AWS may block bucket policies that grant public access. To allow anonymous **read** only, you typically allow a public bucket policy for `GetObject` on the image prefix and adjust Block Public Access so that **new** public policies are allowed (or use CloudFront with OAC and keep the bucket private — then “public” read is via CloudFront, not direct S3).

## Environment variables

| Variable | Required | Description |
|----------|----------|-------------|
| `S3_IMAGES_BUCKET` | Yes, to enable S3 | Bucket name |
| `AWS_REGION` | No* | e.g. `us-east-1`; if unset, uses `region` from `~/.aws/config` for the profile (`AWS_PROFILE` or `default`) |
| `AWS_ACCESS_KEY_ID` | No* | Or omit and use `~/.aws/credentials` / IAM role (SDK default chain) |
| `AWS_SECRET_ACCESS_KEY` | No* | Same as above |

\*You need **some** way to supply region (env or config) and credentials (env, credentials file, or role).
| `S3_IMAGES_PREFIX` | No | Default `images` |
| `S3_PUBLIC_URL_BASE` | No | CloudFront or custom origin base URL (no trailing slash). If unset, URLs use virtual-hosted style `https://{bucket}.s3.{region}.amazonaws.com/{key}` |

See `.env.example` for a template.

## Bucket policy (public **read-only**)

Anonymous users get **only** `GetObject` on your image prefix — they cannot upload, delete, or list the bucket.

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
    }
  ]
}
```

Replace `YOUR_BUCKET_NAME` and `images/*` with your bucket and `S3_IMAGES_PREFIX` if different. Do **not** add `s3:PutObject`, `s3:DeleteObject`, or `s3:ListBucket` for `"Principal": "*"`.

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

Attach this to the **IAM user or role** the Node server uses (not to anonymous users). Example (adjust bucket and prefix):

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
    }
  ]
}
```

Optional: `s3:ListBucket` with `"Condition": { "StringLike": { "s3:prefix": ["images/*"] } }` on `arn:aws:s3:::YOUR_BUCKET_NAME` if you want the owner to list objects in the console.

Keep these credentials only on the server (env vars, IAM role, Secrets Manager) — never in the browser or in exported palette JSON.

## Exports

Exported palette JSON may include `imagePublicUrl` so downstream apps can load the image without your Express `/uploads` route.
