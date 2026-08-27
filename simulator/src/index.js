import 'dotenv/config';
import mqtt from 'mqtt';

const mqttHost = process.env.MQTT_HOST ?? 'localhost';
const mqttPort = Number(process.env.MQTT_PORT ?? 1883);
const intervalMs = Math.max(100, Number(process.env.TELEMETRY_INTERVAL_MS ?? 1000));
const commandTopic = 'grid/system/simulation/command';
const eventTopic = 'grid/system/events';
const maxSensors = 10_000;

let sensorCount = Math.min(maxSensors, Math.max(1, Number(process.env.SIMULATED_SENSORS ?? 1000)));
let scenario = process.env.SIMULATOR_SCENARIO ?? 'normal';
let running = true;
let sequence = 0;
let timer;
let sensors = [];

function buildSensors(count) {
  sensors = Array.from({ length: count }, (_, index) => {
    const numericId = index + 1;
    const regionNumber = String((index % 3) + 1).padStart(2, '0');
    const substationNumber = String((index % 6) + 1).padStart(2, '0');
    const gridNumber = String((index % 12) + 1).padStart(2, '0');
    return {
      sensorId: `SENSOR-${String(numericId).padStart(6, '0')}`,
      regionId: `REGION-${regionNumber}`,
      substationId: `SUB-${substationNumber}`,
      gridId: `GRID-${gridNumber}`,
      baseCurrent: 7 + ((index * 17) % 140) / 10,
      phase: (index % 360) * (Math.PI / 180),
      energyConsumed: 0,
      temperature: 29 + ((index * 13) % 70) / 10,
      sequence: 0,
    };
  });
}

function bounded(value, minimum, maximum) {
  return Math.max(minimum, Math.min(maximum, value));
}

function nextTelemetry(sensor) {
  const now = Date.now();
  const seconds = now / 1000;
  const demandMultiplier = scenario === 'high_demand' ? 1.35 + (Math.sin(seconds / 45) + 1) * 0.15 : 1;
  const loadWave = 1 + Math.sin(seconds / 17 + sensor.phase) * 0.12 + (Math.random() - 0.5) * 0.08;
  let voltage = 230 + Math.sin(seconds / 23 + sensor.phase) * 1.8 + (Math.random() - 0.5) * 1.2;
  let frequency = 50 + Math.sin(seconds / 31 + sensor.phase) * 0.08 + (Math.random() - 0.5) * 0.04;
  if (scenario === 'voltage_instability') voltage += Math.sin(seconds / 4 + sensor.phase) * 24;
  const current = bounded(sensor.baseCurrent * demandMultiplier * loadWave, 0.2, 120);
  const powerFactor = bounded(0.91 + Math.sin(seconds / 37 + sensor.phase) * 0.025 + (Math.random() - 0.5) * 0.015, 0.82, 0.99);
  const power = Math.max(0, voltage * current * powerFactor);
  const temperatureTarget = 29 + current * 0.32;
  sensor.temperature += (temperatureTarget - sensor.temperature) * 0.04 + (Math.random() - 0.5) * 0.05;
  sensor.energyConsumed += power * (intervalMs / 3_600_000);
  sensor.sequence += 1;
  return {
    sensorId: sensor.sensorId,
    gridId: sensor.gridId,
    substationId: sensor.substationId,
    regionId: sensor.regionId,
    voltage: Number(voltage.toFixed(2)),
    current: Number(current.toFixed(2)),
    power: Number(power.toFixed(2)),
    frequency: Number(frequency.toFixed(3)),
    powerFactor: Number(powerFactor.toFixed(3)),
    energyConsumed: Number(sensor.energyConsumed.toFixed(4)),
    temperature: Number(sensor.temperature.toFixed(2)),
    status: 'ONLINE',
    timestamp: new Date(now).toISOString(),
    sequence: sensor.sequence,
  };
}

function publishEvent(client, type, details = {}) {
  client.publish(eventTopic, JSON.stringify({ type, source: 'simulator', timestamp: new Date().toISOString(), ...details }), { qos: 0 });
}

function publishBatch(client) {
  if (!running || scenario === 'communication_failure') return;
  for (const sensor of sensors) {
    if (scenario === 'sensor_failure' && Number(sensor.sensorId.slice(-2)) % 17 === 0) continue;
    const telemetry = nextTelemetry(sensor);
    const topic = `grid/${telemetry.regionId}/${telemetry.substationId}/${telemetry.gridId}/sensor/${telemetry.sensorId}/telemetry`;
    client.publish(topic, JSON.stringify(telemetry), { qos: 0 });
  }
  sequence += sensors.length;
}

function applyCommand(client, rawPayload) {
  let command;
  try { command = JSON.parse(rawPayload.toString('utf8')); } catch { return; }
  const action = String(command.action ?? '').toLowerCase();
  if (action === 'start') running = true;
  if (action === 'stop') running = false;
  if (action === 'scenario' && typeof command.scenario === 'string') scenario = command.scenario;
  if (action === 'preset' || Number.isFinite(Number(command.sensors))) {
    sensorCount = Math.min(maxSensors, Math.max(1, Number(command.sensors)));
    buildSensors(sensorCount);
  }
  publishEvent(client, 'simulation_status', { action, running, scenario, sensorCount, messagesPublished: sequence });
  console.log(`Simulation command=${action || 'unknown'} running=${running} scenario=${scenario} sensors=${sensorCount}`);
}

const client = mqtt.connect(`mqtt://${mqttHost}:${mqttPort}`, { reconnectPeriod: 2000, keepalive: 30 });
client.on('connect', () => {
  console.log(`Simulator connected to MQTT at ${mqttHost}:${mqttPort}`);
  client.subscribe(commandTopic, { qos: 0 });
  publishEvent(client, 'simulator_connected', { sensorCount, scenario });
  if (!timer) timer = setInterval(() => publishBatch(client), intervalMs);
});
client.on('message', (topic, payload) => { if (topic === commandTopic) applyCommand(client, payload); });
client.on('reconnect', () => console.log('Simulator reconnecting to MQTT...'));
client.on('error', (error) => console.error('Simulator MQTT error:', error.message));

buildSensors(sensorCount);
console.log(`Virtual sensor simulator configured for ${sensorCount} sensors at ${intervalMs}ms (${scenario}).`);

function shutdown(signal) {
  console.log(`${signal} received; stopping simulator.`);
  if (timer) clearInterval(timer);
  publishEvent(client, 'simulator_stopped', { sensorCount, messagesPublished: sequence });
  client.end(true, () => process.exit(0));
}
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

