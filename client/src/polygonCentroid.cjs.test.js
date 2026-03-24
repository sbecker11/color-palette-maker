import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { polygonCentroid } from '../../utils/polygonCentroid.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const polyCjs = require(join(__dirname, '../../utils/polygonCentroid.cjs'));

describe('utils/polygonCentroid.cjs parity with polygonCentroid.js', () => {
  const samples = [
    null,
    [],
    [[10, 20]],
    [
      [0, 0],
      [6, 0],
      [0, 6],
    ],
    [
      [0, 0],
      [10, 0],
      [10, 10],
      [0, 10],
    ],
  ];

  it('polygonCentroid matches for sample polygons', () => {
    for (const poly of samples) {
      const a = polyCjs.polygonCentroid(poly);
      const b = polygonCentroid(poly);
      expect(a[0]).toBeCloseTo(b[0]);
      expect(a[1]).toBeCloseTo(b[1]);
    }
  });
});
