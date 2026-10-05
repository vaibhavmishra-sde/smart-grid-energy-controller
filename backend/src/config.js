import 'dotenv/config';
import { positiveInteger, positiveNumber } from './configValidation.js';

function required(name, fallback) {
  const value = process.env[name] ?? fallback;
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

export const config = Object.freeze({
  port: positiveNumber('PORT', 5000),
  mqttHost: required('MQTT_HOST', 'localhost'),
  mqttPort: positiveNumber('MQTT_PORT', 1883),
  redisHost: required('REDIS_HOST', 'localhost'),
  redisPort: positiveNumber('REDIS_PORT', 6379),
  databaseUrl: required('DATABASE_URL', 'postgresql://smart_grid:change_me_local_only@localhost:5432/smart_grid'),
  simulatedSensors: positiveInteger('SIMULATED_SENSORS', 1000),
  apiMaxSensorLimit: positiveInteger('API_MAX_SENSOR_LIMIT', 1000),
  telemetryIntervalMs: positiveNumber('TELEMETRY_INTERVAL_MS', 1000),
  aggregationFlushMs: positiveNumber('AGGREGATION_FLUSH_MS', 5000),
  maxVoltage: positiveNumber('MAX_VOLTAGE', 250),
  minVoltage: positiveNumber('MIN_VOLTAGE', 210),
  maxPower: positiveNumber('MAX_POWER', 5000),
  enableAutoProtection: String(process.env.ENABLE_AUTO_PROTECTION ?? 'true').toLowerCase() === 'true',
  heartbeatTimeoutMs: positiveNumber('HEARTBEAT_TIMEOUT_MS', 15_000),
  jwtSecret: required('JWT_SECRET', 'change_me_before_production'),
  adminPassword: process.env.ADMIN_PASSWORD ?? 'admin_change_me',
  operatorPassword: process.env.OPERATOR_PASSWORD ?? 'operator_change_me',
  viewerPassword: process.env.VIEWER_PASSWORD ?? 'viewer_change_me',
});
