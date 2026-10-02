import test from 'node:test';
import assert from 'node:assert/strict';
import { buildAggregateInsert } from './src/services/aggregateQuery.js';

const row = {
  sensorId: 'SENSOR-01',
  bucketStart: new Date('2026-10-02T10:00:00.000Z'),
  sumVoltage: 460,
  sumCurrent: 20,
  sumPower: 4000,
  sumFrequency: 100,
  sumTemperature: 64,
  sampleCount: 2,
};

test('builds averaged aggregate values in column order', () => {
  const query = buildAggregateInsert([row]);

  assert.match(query.text, /INSERT INTO telemetry_aggregates/);
  assert.match(query.text, /\(\$1, \$2, \$3, \$4, \$5, \$6, \$7, \$8\)/);
  assert.deepEqual(query.values, [
    'SENSOR-01', row.bucketStart, 230, 10, 2000, 50, 32, 2,
  ]);
});

test('increments placeholders for each aggregate row', () => {
  const query = buildAggregateInsert([row, { ...row, sensorId: 'SENSOR-02' }]);

  assert.match(query.text, /\(\$1, \$2, \$3, \$4, \$5, \$6, \$7, \$8\), \(\$9, \$10, \$11, \$12, \$13, \$14, \$15, \$16\)/);
  assert.equal(query.values.length, 16);
  assert.equal(query.values[8], 'SENSOR-02');
});
