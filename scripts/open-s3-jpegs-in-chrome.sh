#!/usr/bin/env bash
# Open each .jpg / .jpeg in Google Chrome, one at a time; press Enter to continue.
#
# Usage:
#   ./scripts/open-s3-jpegs-in-chrome.sh              # defaults to repo local-data-cache/
#   ./scripts/open-s3-jpegs-in-chrome.sh /path/to/dir
#
# macOS: uses `open -a "Google Chrome"`.
# Linux: uses `google-chrome` or `chromium` if found.

set -uo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DIR="${1:-$REPO_ROOT/local-data-cache}"

if [[ ! -d "$DIR" ]]; then
  echo "Not a directory: $DIR" >&2
  exit 1
fi

mapfile -t files < <(
  find "$DIR" -maxdepth 1 -type f \( -iname '*.jpg' -o -iname '*.jpeg' \) | LC_ALL=C sort
)

if [[ ${#files[@]} -eq 0 ]]; then
  echo "No .jpg / .jpeg files in: $DIR"
  exit 0
fi

open_in_chrome() {
  local path="$1"
  case "$(uname -s)" in
    Darwin)
      open -a "Google Chrome" "$path"
      ;;
    Linux)
      if command -v google-chrome &>/dev/null; then
        google-chrome "$path" 2>/dev/null &
      elif command -v chromium &>/dev/null; then
        chromium "$path" 2>/dev/null &
      elif command -v chromium-browser &>/dev/null; then
        chromium-browser "$path" 2>/dev/null &
      else
        echo "Install Google Chrome or set CHROME_BIN to your browser executable." >&2
        exit 1
      fi
      ;;
    *)
      echo "Unsupported OS; open files manually: $path" >&2
      exit 1
      ;;
  esac
}

echo "Found ${#files[@]} JPEG(s) in $DIR"
echo

for f in "${files[@]}"; do
  echo "Opening: $f"
  open_in_chrome "$f"
  read -r -p "Press Enter for next image (Ctrl+C to stop)..."
  echo
done

echo "Done."
