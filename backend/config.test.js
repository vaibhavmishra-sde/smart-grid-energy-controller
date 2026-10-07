import test from 'node:test';
import assert from 'node:assert/strict';
import { csvValues, positiveInteger, positiveNumber } from './src/configValidation.js';

test('accepts only positive safe integers', () => {
  assert.equal(positiveInteger('SIMULATED_SENSORS', 1000), 1000);
  assert.throws(() => positiveInteger('SIMULATED_SENSORS', 1.5));
  assert.throws(() => positiveInteger('SIMULATED_SENSORS', 0));
});

test('accepts a positive configured value', () => {
  assert.equal(positiveNumber('PORT', 5000), 5000);
  assert.equal(positiveNumber('PORT', 42), 42);
});

test('rejects non-positive timing values', () => {
  assert.throws(() => positiveNumber('TELEMETRY_INTERVAL_MS', 0));
  assert.throws(() => positiveNumber('AGGREGATION_FLUSH_MS', -1));
  assert.throws(() => positiveNumber('HEARTBEAT_TIMEOUT_MS', Number.NaN));
});

test('rejects invalid safety thresholds', () => {
  assert.throws(() => positiveNumber('MAX_VOLTAGE', 0));
  assert.throws(() => positiveNumber('MIN_VOLTAGE', Number.NaN));
  assert.throws(() => positiveNumber('MAX_POWER', -500));
});

test('parses comma-separated configuration values', () => {
  process.env.TEST_ORIGINS = ' http://localhost:5173, https://example.test ';
  assert.deepEqual(csvValues('TEST_ORIGINS'), ['http://localhost:5173', 'https://example.test']);
  delete process.env.TEST_ORIGINS;
});
