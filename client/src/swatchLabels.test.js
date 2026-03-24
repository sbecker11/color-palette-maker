import { describe, expect, it } from 'vitest';
import { computeSwatchLabels, indexToLabel } from '../../utils/swatchLabels.js';

describe('indexToLabel', () => {
  it('returns empty for non-number or negative', () => {
    expect(indexToLabel(-1)).toBe('');
    expect(indexToLabel('0')).toBe('');
    expect(indexToLabel(NaN)).toBe('');
  });

  it('maps 0–25 to A–Z', () => {
    expect(indexToLabel(0)).toBe('A');
    expect(indexToLabel(1)).toBe('B');
    expect(indexToLabel(25)).toBe('Z');
  });

  it('continues with AA after Z', () => {
    expect(indexToLabel(26)).toBe('AA');
    expect(indexToLabel(27)).toBe('AB');
    expect(indexToLabel(51)).toBe('AZ');
    expect(indexToLabel(52)).toBe('BA');
  });

  it('handles larger indices', () => {
    expect(indexToLabel(701)).toBe('ZZ');
    expect(indexToLabel(702)).toBe('AAA');
  });
});

describe('computeSwatchLabels', () => {
  it('returns empty for non-array', () => {
    expect(computeSwatchLabels(null)).toEqual([]);
    expect(computeSwatchLabels(undefined)).toEqual([]);
    expect(computeSwatchLabels({})).toEqual([]);
  });

  it('labels each swatch A, B, C, ...', () => {
    expect(computeSwatchLabels([])).toEqual([]);
    expect(computeSwatchLabels(['#f00', '#0f0'])).toEqual(['A', 'B']);
    expect(computeSwatchLabels(new Array(27).fill('#000'))[26]).toBe('AA');
  });
});
