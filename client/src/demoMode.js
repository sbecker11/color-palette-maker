/**
 * Read-only demo build (e.g. GitHub Pages): no Express server, so the palette
 * catalog and images are read straight from the public S3 bucket.
 */

export const DEMO_MODE = import.meta.env.VITE_DEMO_MODE === 'true';

export const DEMO_PALETTES_URL =
  import.meta.env.VITE_DEMO_PALETTES_URL ||
  'https://sbecker11-color-palette-images.s3.us-west-1.amazonaws.com/metadata/color_palettes.jsonl';

export const DEMO_README_URL =
  'https://raw.githubusercontent.com/sbecker11/color-palette-maker/master/README.md';

export const DEMO_REPO_URL = 'https://github.com/sbecker11/color-palette-maker';

export const DEMO_UNAVAILABLE_MESSAGE =
  'This read-only demo has no server, so uploads, palette extraction, and region detection are off. Clone the repo to run the full app.';

export function parseJsonl(body) {
  return body
    .split('\n')
    .filter((line) => line.trim())
    .map((line) => JSON.parse(line));
}
