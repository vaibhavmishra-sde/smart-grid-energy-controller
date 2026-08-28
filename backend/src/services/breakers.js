import { config } from '../config.js';
import { database, mqttClient, redis } from './dependencies.js';
import { broadcast } from './realtime.js';
import { writeAudit } from './audit.js';

const BREAKER_COMMAND_TOPIC = 'grid/+/+/+/breaker/+/command';
const BREAKER_STATUS_TOPIC = 'grid/+/+/+/breaker/+/status';
const breakerById = new Map();
const breakerByGrid = new Map();

function defaultLocation(breakerId) {
  const gridMatch = String(breakerId).match(/GRID[-_](\d+)/i);
  const gridId = gridMatch ? `GRID-${String(gridMatch[1]).padStart(2, '0')}` : 'GRID-01';
  return { regionId: 'REGION-01', substationId: 'SUB-01', gridId };
}

function stateFor(breakerId, location = defaultLocation(breakerId)) {
  const existing = breakerById.get(breakerId);
  if (existing) return existing;
  const breaker = { breakerId, ...location, status: 'ON', lastCommand: null, lastChanged: new Date().toISOString() };
  breakerById.set(breakerId, breaker);
  breakerByGrid.set(location.gridId, breakerId);
  return breaker;
}

async function persistBreaker(breaker) {
  if (!database) return;
  try {
    await database.query(
      `INSERT INTO breakers (id, grid_id, status, last_command, last_changed)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status, last_command = EXCLUDED.last_command, last_changed = EXCLUDED.last_changed`,
      [breaker.breakerId, breaker.gridId, breaker.status, breaker.lastCommand, breaker.lastChanged],
    );
  } catch (error) { console.error('Breaker persistence failed:', error.message); }
}

function publishState(breaker, result = 'SUCCESS', message = null) {
  const payload = { ...breaker, result, message };
  if (redis.isReady) redis.set(`breaker:${breaker.breakerId}:status`, JSON.stringify(payload), { EX: 86_400 }).catch(() => {});
  broadcast('breaker_status', payload);
  return payload;
}

function transition(breaker, action) {
  const normalized = String(action).toUpperCase();
  const valid = normalized === 'ON' && breaker.status === 'OFF'
    || normalized === 'OFF' && breaker.status === 'ON'
    || normalized === 'TRIP' && ['ON', 'OFF'].includes(breaker.status)
    || normalized === 'RESET' && ['TRIPPED', 'FAULT'].includes(breaker.status);
  if (!valid) return { ok: false, error: `Cannot ${normalized} breaker from ${breaker.status}` };
  breaker.status = normalized === 'TRIP' ? 'TRIPPED' : normalized === 'RESET' ? 'ON' : normalized;
  breaker.lastCommand = normalized;
  breaker.lastChanged = new Date().toISOString();
  return { ok: true };
}

async function handleStatus(topic, payload) {
  let status;
  try { status = JSON.parse(payload.toString('utf8')); } catch { return; }
  const parts = topic.split('/');
  if (parts.length !== 7 || parts[4] !== 'breaker') return;
  const breakerId = parts[5];
  const location = { regionId: parts[1], substationId: parts[2], gridId: parts[3] };
  const breaker = stateFor(breakerId, location);
  Object.assign(breaker, status, location, { breakerId });
  publishState(breaker, status.result ?? 'SUCCESS', status.message ?? null);
  await persistBreaker(breaker);
}

export function requestBreakerCommand(breakerId, action, actor = 'system') {
  if (!mqttClient.connected) throw new Error('MQTT broker is not connected');
  const breaker = stateFor(breakerId);
  const result = transition({ ...breaker }, action);
  const location = breaker;
  const topic = `grid/${location.regionId}/${location.substationId}/${location.gridId}/breaker/${breakerId}/command`;
  mqttClient.publish(topic, JSON.stringify({ action: String(action).toUpperCase(), actor, requestedAt: new Date().toISOString() }), { qos: 0 });
  writeAudit({ actor, action: `breaker_${String(action).toLowerCase()}`, target: breakerId, details: { gridId: location.gridId } });
  return { accepted: true, breakerId, action: String(action).toUpperCase(), currentStatus: breaker.status, transition: result };
}

export function getBreakers() {
  for (let index = 1; index <= 12; index += 1) stateFor(`BREAKER-GRID-${String(index).padStart(2, '0')}`, { regionId: 'REGION-01', substationId: 'SUB-01', gridId: `GRID-${String(index).padStart(2, '0')}` });
  return [...breakerById.values()];
}
export function getBreaker(breakerId) { return breakerById.get(breakerId) ?? null; }

export function autoTripForGrid(gridId, sensorId, power) {
  if (!config.enableAutoProtection) return;
  const breakerId = breakerByGrid.get(gridId) ?? `BREAKER-${gridId}`;
  const breaker = stateFor(breakerId, { regionId: 'REGION-01', substationId: 'SUB-01', gridId });
  if (breaker.status !== 'ON') return;
  try { requestBreakerCommand(breakerId, 'TRIP', 'auto-protection'); }
  catch (error) { console.error('Automatic protection command failed:', error.message); return; }
  broadcast('grid_update', { gridId, protection: 'TRIPPED', sensorId, power });
}

export function startBreakerService() {
  mqttClient.on('connect', () => {
    mqttClient.subscribe(BREAKER_COMMAND_TOPIC, { qos: 0 });
    mqttClient.subscribe(BREAKER_STATUS_TOPIC, { qos: 0 });
  });
  mqttClient.on('message', (topic, payload) => {
    if (topic.endsWith('/status')) handleStatus(topic, payload).catch((error) => console.error('Breaker status error:', error.message));
    if (!topic.endsWith('/command')) return;
    let command;
    try { command = JSON.parse(payload.toString('utf8')); } catch { return; }
    const parts = topic.split('/');
    if (parts.length !== 7 || parts[4] !== 'breaker') return;
    const breaker = stateFor(parts[5], { regionId: parts[1], substationId: parts[2], gridId: parts[3] });
    const result = transition(breaker, command.action);
    if (!result.ok) { publishState(breaker, 'ERROR', result.error); return; }
    publishState(breaker);
  });
}
