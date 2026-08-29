export function validTelemetry(value) {
  return value && typeof value === 'object'
    && typeof value.sensorId === 'string'
    && typeof value.gridId === 'string'
    && typeof value.substationId === 'string'
    && typeof value.regionId === 'string'
    && Number.isFinite(value.voltage)
    && Number.isFinite(value.current)
    && Number.isFinite(value.power)
    && Number.isFinite(value.frequency)
    && Number.isFinite(value.powerFactor)
    && Number.isFinite(value.energyConsumed)
    && Number.isFinite(value.temperature)
    && typeof value.timestamp === 'string'
    && Number.isFinite(Date.parse(value.timestamp));
}

export function validSimulationCommand(value) {
  return value && typeof value === 'object'
    && ['start', 'stop', 'preset', 'scenario'].includes(String(value.action ?? '').toLowerCase());
}

