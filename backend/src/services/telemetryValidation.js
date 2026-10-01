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
  return value && typeof value === 'object'
    && ['start', 'stop', 'preset', 'scenario'].includes(String(value.action ?? '').toLowerCase());
}
