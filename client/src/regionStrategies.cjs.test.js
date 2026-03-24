import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { STRATEGIES_WITH_PARAMS, VALID_STRATEGIES } from '../../utils/regionStrategies.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const regionCjs = require(join(__dirname, '../../utils/regionStrategies.cjs'));

describe('utils/regionStrategies.cjs parity with regionStrategies.js', () => {
  it('VALID_STRATEGIES matches ESM export', () => {
    expect(regionCjs.VALID_STRATEGIES).toEqual(VALID_STRATEGIES);
  });

  it('STRATEGIES_WITH_PARAMS matches ESM export', () => {
    expect(regionCjs.STRATEGIES_WITH_PARAMS).toEqual(STRATEGIES_WITH_PARAMS);
  });
});
