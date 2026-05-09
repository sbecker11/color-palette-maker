#!/usr/bin/env bash
#
# Production deploy helper for a VPS (e.g. Hostinger) after you SSH in.
#
# Prerequisites (one-time on the server):
#   - Git clone of this repo, Node LTS, PM2 (or set SKIP_PM2=1 and use systemd).
#   - .env at repo root with production values (never committed). This app expects
#     S3-related vars when server startup requires S3—see server.js and .env.example.
#   - LiteSpeed (or similar) in front: configure a reverse proxy to Node on localhost,
#     not only static files—Express serves /api, /upload, /palette-images, client/dist, etc.
#
# LiteSpeed / Hostinger VPS notes:
#   - Terminate HTTPS in LiteSpeed and proxy to http://127.0.0.1:${EXPRESS_PORT:-3000}/ .
#     Same-origin /api calls from the SPA require the proxy to forward those paths too.
#   - Raise max upload body size if needed (Multer allows up to 10MB in server.js).
#   - Exact LiteSpeed UI steps depend on Hostinger’s panel; look for External App /
#     proxy / rewrite-to-backend patterns pointing at your Node port.
#   - Prefer binding Node to 127.0.0.1 on the VPS firewall so only LiteSpeed is public.
#
# Usage:
#   chmod +x scripts/deploy-vps.sh   # once
#   ./scripts/deploy-vps.sh
#
# Optional environment overrides:
#   DEPLOY_BRANCH=master         Git branch to checkout before pull (omit to pull current checked-out branch only).
#   SKIP_GIT_PULL=1              Skip git fetch/checkout/pull (only install + build + restart).
#   SKIP_PM2=1                   Skip PM2 restart (e.g. you use systemd).
#   PM2_APP_NAME=color-palette   PM2 process name used with pm2 restart.

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

DEPLOY_BRANCH="${DEPLOY_BRANCH:-}"
SKIP_GIT_PULL="${SKIP_GIT_PULL:-0}"
SKIP_PM2="${SKIP_PM2:-0}"
PM2_APP_NAME="${PM2_APP_NAME:-color-palette}"

echo "[deploy-vps] Working directory: $ROOT"

if [[ "$SKIP_GIT_PULL" != "1" ]]; then
  if [[ -n "$DEPLOY_BRANCH" ]]; then
    echo "[deploy-vps] Checking out branch: $DEPLOY_BRANCH"
    git fetch --prune origin
    git checkout "$DEPLOY_BRANCH"
    git pull origin "$DEPLOY_BRANCH"
  else
    echo "[deploy-vps] Pulling current branch"
    git pull --ff-only
  fi
else
  echo "[deploy-vps] SKIP_GIT_PULL=1 — skipping git"
fi

if [[ ! -f "$ROOT/.env" ]]; then
  echo "[deploy-vps] Warning: .env not found at $ROOT/.env — server may fail to start." >&2
fi

echo "[deploy-vps] npm ci (root)"
npm ci

echo "[deploy-vps] npm ci (client)"
(cd "$ROOT/client" && npm ci)

echo "[deploy-vps] npm run build (client via root script + URL hint)"
npm run build

if [[ "$SKIP_PM2" == "1" ]]; then
  echo "[deploy-vps] SKIP_PM2=1 — restart Node yourself (e.g. systemctl restart …)."
else
  if ! command -v pm2 >/dev/null 2>&1; then
    echo "[deploy-vps] Error: pm2 not found. Install with: npm install -g pm2" >&2
    echo "[deploy-vps] Or set SKIP_PM2=1 and manage the process another way." >&2
    exit 1
  fi
  echo "[deploy-vps] pm2 restart $PM2_APP_NAME"
  pm2 restart "$PM2_APP_NAME"
fi

echo "[deploy-vps] Done."
