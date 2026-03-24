import { describe, expect, it } from 'vitest';
import {
  REGION_STRATEGIES,
  STRATEGIES_WITH_PARAMS,
  VALID_STRATEGIES,
} from '../../utils/regionStrategies.js';

describe('VALID_STRATEGIES', () => {
  it('is a non-empty list of strings', () => {
    expect(Array.isArray(VALID_STRATEGIES)).toBe(true);
    expect(VALID_STRATEGIES.length).toBeGreaterThan(0);
    expect(VALID_STRATEGIES.every((s) => typeof s === 'string')).toBe(true);
  });

  it('includes default and template_match', () => {
    expect(VALID_STRATEGIES).toContain('default');
    expect(VALID_STRATEGIES).toContain('template_match');
  });

  it('has no duplicates', () => {
    expect(new Set(VALID_STRATEGIES).size).toBe(VALID_STRATEGIES.length);
  });
});

describe('STRATEGIES_WITH_PARAMS', () => {
  it('is a subset of VALID_STRATEGIES', () => {
    const valid = new Set(VALID_STRATEGIES);
    for (const s of STRATEGIES_WITH_PARAMS) {
      expect(valid.has(s)).toBe(true);
    }
  });

  it('includes strategies that need extra UI', () => {
    expect(STRATEGIES_WITH_PARAMS).toContain('canny');
    expect(STRATEGIES_WITH_PARAMS).toContain('grabcut');
  });
});

describe('REGION_STRATEGIES', () => {
  it('each entry has value and label', () => {
    for (const row of REGION_STRATEGIES) {
      expect(row).toHaveProperty('value');
      expect(row).toHaveProperty('label');
      expect(typeof row.value).toBe('string');
      expect(typeof row.label).toBe('string');
    }
  });

  it('values match VALID_STRATEGIES exactly', () => {
    const fromUi = REGION_STRATEGIES.map((r) => r.value).sort();
    const fromValid = [...VALID_STRATEGIES].sort();
    expect(fromUi).toEqual(fromValid);
  });
});
