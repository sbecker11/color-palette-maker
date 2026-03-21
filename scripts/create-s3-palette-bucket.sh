#!/usr/bin/env bash
# Create an S3 bucket for Color Palette Maker images (public read on prefix, app uses IAM for writes).
#
# Usage:
#   export AWS_REGION=us-east-1
#   export S3_IMAGES_BUCKET=my-unique-palette-images-bucket
#   ./scripts/create-s3-palette-bucket.sh
#
# Or one line:
#   S3_IMAGES_BUCKET=my-org-palette-images AWS_REGION=us-east-1 ./scripts/create-s3-palette-bucket.sh
#
# Prerequisites: aws-cli v2, credentials configured (`aws configure` or env vars / SSO).
# Bucket names must be globally unique and DNS-compliant (lowercase, no underscores).

set -euo pipefail

BUCKET="${S3_IMAGES_BUCKET:-}"
REGION="${AWS_REGION:-${AWS_DEFAULT_REGION:-}}"

if [[ -z "$BUCKET" || -z "$REGION" ]]; then
  echo "Set S3_IMAGES_BUCKET and AWS_REGION (or AWS_DEFAULT_REGION)."
  echo "Example: S3_IMAGES_BUCKET=my-palette-images AWS_REGION=us-east-1 $0"
  exit 1
fi

echo "==> Checking AWS identity..."
aws sts get-caller-identity

echo "==> Creating bucket: $BUCKET in $REGION"
if aws s3api head-bucket --bucket "$BUCKET" 2>/dev/null; then
  echo "    Bucket already exists, skipping create."
else
  if [[ "$REGION" == "us-east-1" ]]; then
    aws s3api create-bucket --bucket "$BUCKET" --region "$REGION"
  else
    aws s3api create-bucket --bucket "$BUCKET" --region "$REGION" \
      --create-bucket-configuration "LocationConstraint=$REGION"
  fi
  echo "    Created."
fi

PREFIX="${S3_IMAGES_PREFIX:-images}"
echo "==> Allowing public bucket policy (required for anonymous GetObject on prefix)..."
echo "    Turn OFF 'Block all public access' only as far as needed, or public policy will be rejected."
aws s3api put-public-access-block --bucket "$BUCKET" \
  --public-access-block-configuration \
  "BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=false,RestrictPublicBuckets=false"

POLICY=$(cat <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PublicReadOnlyPaletteImages",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::${BUCKET}/${PREFIX}/*"
    }
  ]
}
EOF
)

echo "==> Applying bucket policy (public read-only on ${PREFIX}/*)..."
aws s3api put-bucket-policy --bucket "$BUCKET" --policy "$POLICY"

CORS_TMP=$(mktemp)
trap 'rm -f "$CORS_TMP"' EXIT
cat > "$CORS_TMP" <<'CORSJSON'
[
  {
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["GET", "HEAD"],
    "AllowedOrigins": ["*"],
    "ExposeHeaders": [],
    "MaxAgeSeconds": 3000
  }
]
CORSJSON

echo "==> Applying CORS (GET/HEAD; origins * — tighten in console for production)..."
aws s3api put-bucket-cors --bucket "$BUCKET" --cors-configuration "file://$CORS_TMP"

echo ""
echo "Done. Add to your .env:"
echo "  S3_IMAGES_BUCKET=$BUCKET"
echo "  AWS_REGION=$REGION"
echo ""
echo "Attach an IAM policy to your user/role for read-write on the same prefix — see docs/S3-STORAGE.md"
echo "Example object URL: https://${BUCKET}.s3.${REGION}.amazonaws.com/${PREFIX}/img-example.jpeg"
