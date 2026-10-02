function nonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function validIdentifier(value) {
  return nonEmptyString(value) && value.length <= 128 && !value.includes('/');
}

const telemetryFields = ['voltage', 'current', 'power', 'frequency', 'powerFactor', 'energyConsumed', 'temperature'];

export function validTelemetry(value) {
  return value && typeof value === 'object'
    && validIdentifier(value.sensorId)
    && validIdentifier(value.gridId)
    && validIdentifier(value.substationId)
    && validIdentifier(value.regionId)
    && telemetryFields.every((field) => Number.isFinite(value[field]))
    && value.voltage >= 0 && value.voltage <= 1000
    && value.current >= 0 && value.current <= 100000
    && value.power >= 0 && value.power <= 100000000
    && value.frequency >= 40 && value.frequency <= 70
    && value.powerFactor >= 0 && value.powerFactor <= 1
    && value.energyConsumed >= 0
    && value.temperature >= -100 && value.temperature <= 250
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
