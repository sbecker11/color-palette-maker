import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { computeSwatchLabels, indexToLabel } from '../../utils/swatchLabels.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const swatchCjs = require(join(__dirname, '../../utils/swatchLabels.cjs'));

describe('utils/swatchLabels.cjs parity with swatchLabels.js', () => {
  it('indexToLabel matches for sample indices', () => {
    for (const i of [0, 1, 25, 26, 52, 701, 702]) {
      expect(swatchCjs.indexToLabel(i)).toBe(indexToLabel(i));
    }
  });

  it('computeSwatchLabels matches', () => {
    const palettes = [[], ['#f00'], ['#a', '#b', '#c'], new Array(28).fill('#000')];
    for (const p of palettes) {
      expect(swatchCjs.computeSwatchLabels(p)).toEqual(computeSwatchLabels(p));
    }
  });
});
