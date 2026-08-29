import { config } from '../config.js';
import { database, mqttClient, redis } from './dependencies.js';
import { autoTripForGrid } from './breakers.js';
import { broadcast } from './realtime.js';
import { validTelemetry } from './telemetryValidation.js';

const TELEMETRY_TOPIC = 'grid/+/+/+/sensor/+/telemetry';
const SENSOR_TTL_SECONDS = 120;

const telemetry = {
  received: 0,
  processed: 0,
  dropped: 0,
  duplicates: 0,
  redisUpdates: 0,
  databaseWrites: 0,
  databaseRows: 0,
  processingLatencyMs: { average: 0, p95: 0, p99: 0 },
  messagesPerSecond: 0,
  processedPerSecond: 0,
  lastError: null,
};

const latestBySensor = new Map();
const lastTimestampBySensor = new Map();
const gridPower = new Map();
const aggregateBuckets = new Map();
const activeAlerts = new Map();
const latencyWindow = [];
let flushInProgress = false;
let offlineTimer;
let lastRealtimeBroadcastAt = 0;

function percentile(values, percentileValue) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.ceil((percentileValue / 100) * sorted.length) - 1)];
}

function setRedisState(sensor) {
  if (!redis.isReady) return;
  const latestKey = `sensor:${sensor.sensorId}:latest`;
  redis.set(latestKey, JSON.stringify(sensor), { EX: SENSOR_TTL_SECONDS }).catch((error) => {
    telemetry.lastError = `Redis latest state: ${error.message}`;
  });
  redis.sAdd('sensors:active', sensor.sensorId).catch(() => {});
  redis.set(`sensor:${sensor.sensorId}:heartbeat`, sensor.timestamp, { EX: SENSOR_TTL_SECONDS }).catch(() => {});
  redis.set('system:telemetry:metrics', JSON.stringify(getMetrics())).catch(() => {});
  for (const [gridId, power] of gridPower) {
    redis.set(`grid:${gridId}:power`, power.toFixed(2), { EX: SENSOR_TTL_SECONDS }).catch(() => {});
  }
  telemetry.redisUpdates += 1;
}

function aggregate(sensor) {
  const bucketStart = Math.floor(Date.parse(sensor.timestamp) / config.aggregationFlushMs) * config.aggregationFlushMs;
  const key = `${sensor.sensorId}:${bucketStart}`;
  const current = aggregateBuckets.get(key) ?? {
    sensorId: sensor.sensorId,
    bucketStart: new Date(bucketStart),
    sumVoltage: 0,
    sumCurrent: 0,
    sumPower: 0,
    sumFrequency: 0,
    sumTemperature: 0,
    sampleCount: 0,
  };
  current.sumVoltage += sensor.voltage;
  current.sumCurrent += sensor.current;
  current.sumPower += sensor.power;
  current.sumFrequency += sensor.frequency;
  current.sumTemperature += sensor.temperature;
  current.sampleCount += 1;
  aggregateBuckets.set(key, current);
}

function alertKey(type, sensorId) { return `${type}:${sensorId}`; }

function createAlert(type, severity, sensor, message) {
  const key = alertKey(type, sensor.sensorId);
  if (activeAlerts.has(key)) return activeAlerts.get(key);
  const alert = {
    id: `ALERT-${Date.now()}-${activeAlerts.size}`,
    type,
    severity,
    gridId: sensor.gridId,
    sensorId: sensor.sensorId,
    message,
    status: 'ACTIVE',
    timestamp: new Date().toISOString(),
  };
  activeAlerts.set(key, alert);
  if (redis.isReady) redis.hSet('alerts:active', key, JSON.stringify(alert)).catch(() => {});
  database.query(
    'INSERT INTO alerts (severity, type, grid_id, sensor_id, message, status) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id',
    [severity, type, sensor.gridId, sensor.sensorId, message, 'ACTIVE'],
  ).then((result) => { alert.databaseId = result.rows[0]?.id; }).catch((error) => { telemetry.lastError = `Alert persistence: ${error.message}`; });
  broadcast('alert_created', alert);
  return alert;
}

function resolveAlert(type, sensorId) {
  const key = alertKey(type, sensorId);
  const alert = activeAlerts.get(key);
  if (!alert) return;
  alert.status = 'RESOLVED';
  alert.resolvedAt = new Date().toISOString();
  activeAlerts.delete(key);
  if (redis.isReady) redis.hDel('alerts:active', key).catch(() => {});
  if (alert.databaseId) database.query('UPDATE alerts SET status = $1, resolved_at = NOW() WHERE id = $2', ['RESOLVED', alert.databaseId]).catch(() => {});
  broadcast('alert_resolved', alert);
}

function evaluateSafety(sensor) {
  if (sensor.power > config.maxPower) {
    createAlert('OVERLOAD', sensor.power > config.maxPower * 1.2 ? 'CRITICAL' : 'WARNING', sensor, `Power ${sensor.power.toFixed(1)}W exceeds configured limit of ${config.maxPower}W`);
    if (sensor.power > config.maxPower * 1.2) autoTripForGrid(sensor.gridId, sensor.sensorId, sensor.power);
  } else resolveAlert('OVERLOAD', sensor.sensorId);
  if (sensor.voltage > config.maxVoltage) createAlert('HIGH_VOLTAGE', 'WARNING', sensor, `Voltage ${sensor.voltage}V exceeds ${config.maxVoltage}V`);
  else resolveAlert('HIGH_VOLTAGE', sensor.sensorId);
  if (sensor.voltage < config.minVoltage) createAlert('LOW_VOLTAGE', 'WARNING', sensor, `Voltage ${sensor.voltage}V is below ${config.minVoltage}V`);
  else resolveAlert('LOW_VOLTAGE', sensor.sensorId);
  if (sensor.frequency < 49.5 || sensor.frequency > 50.5) createAlert('FREQUENCY_INSTABILITY', 'CRITICAL', sensor, `Frequency ${sensor.frequency}Hz is outside 49.5–50.5Hz`);
  else resolveAlert('FREQUENCY_INSTABILITY', sensor.sensorId);
}

function checkOfflineSensors() {
  const now = Date.now();
  for (const sensor of latestBySensor.values()) {
    if (now - Date.parse(sensor.timestamp) > config.heartbeatTimeoutMs) {
      if (sensor.status !== 'OFFLINE') {
        sensor.status = 'OFFLINE';
        broadcast('sensor_status', sensor);
        createAlert('SENSOR_OFFLINE', 'WARNING', sensor, `No telemetry received for more than ${config.heartbeatTimeoutMs}ms`);
      }
    }
  }
}

function handleMessage(topic, payload) {
  telemetry.received += 1;
  const started = performance.now();
  let sensor;
  try {
    sensor = JSON.parse(payload.toString('utf8'));
  } catch {
    telemetry.dropped += 1;
    telemetry.lastError = 'Malformed JSON telemetry payload';
    return;
  }
  if (!validTelemetry(sensor)) {
    telemetry.dropped += 1;
    telemetry.lastError = 'Telemetry payload failed validation';
    return;
  }
  const topicParts = topic.split('/');
  const topicSensorId = topicParts[5];
  if (topicParts.length !== 7 || topicSensorId !== sensor.sensorId) {
    telemetry.dropped += 1;
    telemetry.lastError = 'Telemetry topic and sensor identity do not match';
    return;
  }
  const timestamp = Date.parse(sensor.timestamp);
  const lastTimestamp = lastTimestampBySensor.get(sensor.sensorId) ?? 0;
  if (timestamp <= lastTimestamp) {
    telemetry.duplicates += 1;
    telemetry.dropped += 1;
    return;
  }
  lastTimestampBySensor.set(sensor.sensorId, timestamp);
  const previous = latestBySensor.get(sensor.sensorId);
  latestBySensor.set(sensor.sensorId, sensor);
  gridPower.set(sensor.gridId, (gridPower.get(sensor.gridId) ?? 0) - (previous?.power ?? 0) + sensor.power);
  aggregate(sensor);
  setRedisState(sensor);
  evaluateSafety(sensor);
  telemetry.processed += 1;
  if (Date.now() - lastRealtimeBroadcastAt >= 100) {
    lastRealtimeBroadcastAt = Date.now();
    broadcast('telemetry_update', sensor);
    broadcast('grid_update', { gridId: sensor.gridId, totalPower: gridPower.get(sensor.gridId) ?? sensor.power });
  }
  const latency = Math.max(0, performance.now() - started);
  latencyWindow.push(latency);
  if (latencyWindow.length > 10_000) latencyWindow.splice(0, latencyWindow.length - 10_000);
}

async function flushAggregates() {
  if (flushInProgress || !aggregateBuckets.size) return;
  flushInProgress = true;
  const rows = [...aggregateBuckets.values()];
  try {
    const placeholders = [];
    const values = [];
    rows.forEach((row, index) => {
      const offset = index * 8;
      placeholders.push(`($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6}, $${offset + 7}, $${offset + 8})`);
      values.push(
        row.sensorId,
        row.bucketStart,
        row.sumVoltage / row.sampleCount,
        row.sumCurrent / row.sampleCount,
        row.sumPower / row.sampleCount,
        row.sumFrequency / row.sampleCount,
        row.sumTemperature / row.sampleCount,
        row.sampleCount,
      );
    });
    await database.query('BEGIN');
    await database.query(
      `INSERT INTO telemetry_aggregates
       (sensor_id, bucket_start, average_voltage, average_current, average_power, average_frequency, average_temperature, sample_count)
       VALUES ${placeholders.join(', ')}`,
      values,
    );
    await database.query('COMMIT');
    for (const row of rows) aggregateBuckets.delete(`${row.sensorId}:${row.bucketStart.getTime()}`);
    telemetry.databaseWrites += 1;
    telemetry.databaseRows += rows.length;
  } catch (error) {
    try { await database.query('ROLLBACK'); } catch { /* preserve the original failure */ }
    telemetry.lastError = `Database batch: ${error.message}`;
    console.error('Telemetry aggregate flush failed; retaining batch:', error.message);
  } finally {
    flushInProgress = false;
  }
}

function publishMetrics() {
  telemetry.messagesPerSecond = telemetry.received - (publishMetrics.previousReceived ?? 0);
  telemetry.processedPerSecond = telemetry.processed - (publishMetrics.previousProcessed ?? 0);
  publishMetrics.previousReceived = telemetry.received;
  publishMetrics.previousProcessed = telemetry.processed;
  telemetry.processingLatencyMs = {
    average: latencyWindow.length ? latencyWindow.reduce((sum, value) => sum + value, 0) / latencyWindow.length : 0,
    p95: percentile(latencyWindow, 95),
    p99: percentile(latencyWindow, 99),
  };
  if (redis.isReady) redis.set('system:telemetry:metrics', JSON.stringify(getMetrics())).catch(() => {});
  broadcast('system_metrics', getMetrics());
}

export function getMetrics() {
  return {
    ...telemetry,
    totalPower: [...gridPower.values()].reduce((sum, power) => sum + power, 0),
    activeSensors: latestBySensor.size,
    onlineSensors: [...latestBySensor.values()].filter((sensor) => Date.now() - Date.parse(sensor.timestamp) < SENSOR_TTL_SECONDS * 1000).length,
    offlineSensors: [...latestBySensor.values()].filter((sensor) => Date.now() - Date.parse(sensor.timestamp) >= SENSOR_TTL_SECONDS * 1000).length,
    pendingAggregates: aggregateBuckets.size,
    gridCount: gridPower.size,
  };
}

export function getLatestSensor(sensorId) {
  return latestBySensor.get(sensorId) ?? null;
}

export function getSensors() { return [...latestBySensor.values()]; }

export function getGridSnapshot(gridId) {
  return { gridId, totalPower: gridPower.get(gridId) ?? 0, sensors: [...latestBySensor.values()].filter((sensor) => sensor.gridId === gridId) };
}

export function getAlerts() { return [...activeAlerts.values()]; }

export function updateAlert(alertId, action) {
  const alert = [...activeAlerts.values()].find((item) => item.id === alertId);
  if (!alert) return null;
  if (action === 'acknowledge') alert.status = 'ACKNOWLEDGED';
  if (action === 'resolve') {
    resolveAlert(alert.type, alert.sensorId);
    return alert;
  }
  alert.acknowledgedAt = new Date().toISOString();
  broadcast('alert_created', alert);
  return alert;
}

export function sendSimulationCommand(command) {
  if (!mqttClient.connected) throw new Error('MQTT broker is not connected');
  mqttClient.publish('grid/system/simulation/command', JSON.stringify(command), { qos: 0 });
}

export function startTelemetryProcessor() {
  const subscribe = () => mqttClient.subscribe(TELEMETRY_TOPIC, { qos: 0 }, (error) => {
    if (error) console.error('MQTT telemetry subscription failed:', error.message);
    else console.log(`Subscribed to ${TELEMETRY_TOPIC}`);
  });
  mqttClient.on('connect', subscribe);
  mqttClient.on('message', (topic, payload) => {
    if (topic.endsWith('/telemetry')) handleMessage(topic, payload);
  });
  const metricsTimer = setInterval(publishMetrics, 1000);
  const flushTimer = setInterval(flushAggregates, config.aggregationFlushMs);
  offlineTimer = setInterval(checkOfflineSensors, Math.max(1000, Math.floor(config.heartbeatTimeoutMs / 3)));
  return () => {
    clearInterval(metricsTimer);
    clearInterval(flushTimer);
    clearInterval(offlineTimer);
    mqttClient.off('connect', subscribe);
    mqttClient.removeListener('message', handleMessage);
  };
}
