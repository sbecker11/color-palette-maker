import { describe, expect, it } from 'vitest';
import { polygonCentroid } from '../../utils/polygonCentroid.js';

describe('polygonCentroid', () => {
  it('returns [0,0] for null, undefined, or empty', () => {
    expect(polygonCentroid(null)).toEqual([0, 0]);
    expect(polygonCentroid(undefined)).toEqual([0, 0]);
    expect(polygonCentroid([])).toEqual([0, 0]);
  });

  it('returns the point for a single vertex', () => {
    expect(polygonCentroid([[10, 20]])).toEqual([10, 20]);
  });

  it('averages vertices (triangle)', () => {
    const c = polygonCentroid([
      [0, 0],
      [6, 0],
      [0, 6],
    ]);
    expect(c[0]).toBeCloseTo(2);
    expect(c[1]).toBeCloseTo(2);
  });

  it('handles rectangle center', () => {
    const c = polygonCentroid([
      [0, 0],
      [10, 0],
      [10, 10],
      [0, 10],
    ]);
    expect(c[0]).toBeCloseTo(5);
    expect(c[1]).toBeCloseTo(5);
  });
});
