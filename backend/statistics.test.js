import test from 'node:test';
import assert from 'node:assert/strict';
import { percentile } from './src/services/statistics.js';

test('calculates percentiles without mutating samples', () => {
  const samples = [3, 1, 2];
  assert.equal(percentile(samples, 50), 2);
  assert.deepEqual(samples, [3, 1, 2]);
});

test('returns zero for empty samples', () => assert.equal(percentile([], 95), 0));
