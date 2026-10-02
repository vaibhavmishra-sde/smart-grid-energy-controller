import test from 'node:test';
import assert from 'node:assert/strict';
import { validSimulationCommand, validTelemetry } from './src/services/telemetryValidation.js';


const sample = {
  sensorId: 'SENSOR-000001', gridId: 'GRID-01', substationId: 'SUB-01', regionId: 'REGION-01',
  voltage: 230, current: 10, power: 2162, frequency: 50, powerFactor: 0.94,
  energyConsumed: 12.5, temperature: 32, timestamp: new Date().toISOString(),
};


test('accepts a complete telemetry payload', () => assert.equal(validTelemetry(sample), true));
test('rejects malformed telemetry payloads', () => {
  assert.equal(validTelemetry({ ...sample, power: 'not-a-number' }), false);
  assert.equal(validTelemetry({ ...sample, timestamp: 'never' }), false);
  assert.equal(validTelemetry({ ...sample, sensorId: '   ' }), false);
  assert.equal(validTelemetry({ ...sample, temperature: Number.NaN }), false);
  assert.equal(validTelemetry({ ...sample, timestamp: 123 }), false);
  assert.equal(validTelemetry({ ...sample, powerFactor: 1.1 }), false);
  assert.equal(validTelemetry({ ...sample, voltage: -1 }), false);
  assert.equal(validTelemetry({ ...sample, sensorId: 'sensor/with/slash' }), false);
  assert.equal(validTelemetry({ ...sample, sensorId: 'x'.repeat(129) }), false);
});

test('accepts only supported simulation commands', () => {
  assert.equal(validSimulationCommand({ action: 'preset', sensors: 5000 }), true);
  assert.equal(validSimulationCommand({ action: 'SCENARIO', scenario: 'high_demand' }), true);
  assert.equal(validSimulationCommand({ action: 'delete-all' }), false);
  assert.equal(validSimulationCommand({}), false);
  assert.equal(validSimulationCommand({ action: 'preset', sensors: 0 }), false);
  assert.equal(validSimulationCommand({ action: 'scenario' }), false);
});
