import 'dotenv/config';

function required(name, fallback) {
  const value = process.env[name] ?? fallback;
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

export const config = Object.freeze({
  port: Number(process.env.PORT ?? 5000),
  mqttHost: required('MQTT_HOST', 'localhost'),
  mqttPort: Number(process.env.MQTT_PORT ?? 1883),
  redisHost: required('REDIS_HOST', 'localhost'),
  redisPort: Number(process.env.REDIS_PORT ?? 6379),
  databaseUrl: required('DATABASE_URL', 'postgresql://smart_grid:change_me_local_only@localhost:5432/smart_grid'),
  simulatedSensors: Number(process.env.SIMULATED_SENSORS ?? 1000),
  telemetryIntervalMs: Number(process.env.TELEMETRY_INTERVAL_MS ?? 1000),
  aggregationFlushMs: Number(process.env.AGGREGATION_FLUSH_MS ?? 5000),
  maxVoltage: Number(process.env.MAX_VOLTAGE ?? 250),
  minVoltage: Number(process.env.MIN_VOLTAGE ?? 210),
  maxPower: Number(process.env.MAX_POWER ?? 5000),
  enableAutoProtection: String(process.env.ENABLE_AUTO_PROTECTION ?? 'true').toLowerCase() === 'true',
  heartbeatTimeoutMs: Number(process.env.HEARTBEAT_TIMEOUT_MS ?? 15_000),
  jwtSecret: required('JWT_SECRET', 'change_me_before_production'),
  adminPassword: process.env.ADMIN_PASSWORD ?? 'admin_change_me',
  operatorPassword: process.env.OPERATOR_PASSWORD ?? 'operator_change_me',
  viewerPassword: process.env.VIEWER_PASSWORD ?? 'viewer_change_me',
});
