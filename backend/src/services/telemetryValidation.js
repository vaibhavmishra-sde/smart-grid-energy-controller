function nonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

const telemetryFields = ['voltage', 'current', 'power', 'frequency', 'powerFactor', 'energyConsumed', 'temperature'];

export function validTelemetry(value) {
  return value && typeof value === 'object'
    && nonEmptyString(value.sensorId)
    && nonEmptyString(value.gridId)
    && nonEmptyString(value.substationId)
    && nonEmptyString(value.regionId)
    && telemetryFields.every((field) => Number.isFinite(value[field]))
    && typeof value.timestamp === 'string'
    && Number.isFinite(Date.parse(value.timestamp));
}

export function validSimulationCommand(value) {
  if (!value || typeof value !== 'object') return false;
  const action = String(value.action ?? '').toLowerCase();
  if (!['start', 'stop', 'preset', 'scenario'].includes(action)) return false;
  if (action === 'preset') return Number.isInteger(value.sensors) && value.sensors > 0;
  if (action === 'scenario') return nonEmptyString(value.scenario);
  return true;
}
