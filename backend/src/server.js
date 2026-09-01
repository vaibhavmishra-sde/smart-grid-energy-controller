import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import { createServer } from 'node:http';
import { config } from './config.js';
import { closeDependencies, connectDependencies, database, dependencyState } from './services/dependencies.js';
import { authenticate, authorize, login } from './services/auth.js';
import { getBreaker, getBreakers, requestBreakerCommand, startBreakerService } from './services/breakers.js';
import { getAlerts, getGridSnapshot, getLatestSensor, getMetrics, getSensors, sendSimulationCommand, startTelemetryProcessor, updateAlert } from './services/telemetryProcessor.js';
import { closeWebSocket, initWebSocket } from './services/realtime.js';

const app = express();
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '100kb' }));
app.use((request, response, next) => {
  const suppliedRequestId = request.headers['x-request-id'];
  const requestId = typeof suppliedRequestId === 'string' ? suppliedRequestId.slice(0, 128) : crypto.randomUUID();
  request.requestId = requestId;
  response.setHeader('X-Request-Id', requestId);
  next();
});

app.post('/api/auth/login', (request, response) => {
  const result = login(request.body?.username, request.body?.password);
  if (!result) return response.status(401).json({ error: 'Invalid username or password' });
  return response.json(result);
});

app.get('/api/audit', authenticate, authorize('Admin', 'Operator'), async (_request, response) => {
  try {
    const result = await database.query('SELECT actor, action, target, result, details, created_at AS timestamp FROM audit_logs ORDER BY created_at DESC LIMIT 100');
    return response.json(result.rows);
  } catch (error) {
    return response.status(503).json({ error: 'Audit log unavailable', detail: error.message });
  }
});

app.get('/health', (_request, response) => {
  response.status(200).json({ status: 'ok', service: 'smart-grid-api', timestamp: new Date().toISOString() });
});

app.get('/api/system/status', (_request, response) => {
  const dependencies = dependencyState;
  const healthy = Object.values(dependencies).every((state) => state === 'CONNECTED');
  response.status(healthy ? 200 : 503).json({
    status: healthy ? 'operational' : 'degraded',
    dependencies,
    timestamp: new Date().toISOString(),
  });
});

app.get('/api/metrics', (_request, response) => {
  response.set('Cache-Control', 'no-store');
  response.json(getMetrics());
});

app.get('/api/grids', (_request, response) => response.json(Array.from({ length: 12 }, (_, index) => {
  const gridId = `GRID-${String(index + 1).padStart(2, '0')}`;
  const snapshot = getGridSnapshot(gridId);
  return { gridId, name: `Distribution Grid ${index + 1}`, status: 'HEALTHY', totalPower: snapshot.totalPower, sensorCount: snapshot.sensors.length };
})));

app.get('/api/substations', (_request, response) => response.json([
  { substationId: 'SUB-01', regionId: 'REGION-01', name: 'Central Substation', status: 'HEALTHY' },
  { substationId: 'SUB-02', regionId: 'REGION-01', name: 'North Substation', status: 'HEALTHY' },
]));

app.get('/api/breakers', (_request, response) => response.json(getBreakers()));
app.get('/api/breakers/:id', (request, response) => {
  const breaker = getBreaker(request.params.id);
  if (!breaker) return response.status(404).json({ error: 'Breaker not found' });
  return response.json(breaker);
});

app.post('/api/breakers/:id/:action', authenticate, authorize('Admin', 'Operator'), (request, response) => {
  const action = String(request.params.action).toUpperCase();
  if (!['ON', 'OFF', 'TRIP', 'RESET'].includes(action)) return response.status(400).json({ error: 'Action must be on, off, trip, or reset' });
  try { return response.status(202).json(requestBreakerCommand(request.params.id, action, request.user.sub)); }
  catch (error) { return response.status(503).json({ error: error.message }); }
});

app.get('/api/alerts', (_request, response) => response.json(getAlerts()));
app.post('/api/alerts/:id/acknowledge', authenticate, authorize('Admin', 'Operator'), (request, response) => {
  const alert = updateAlert(request.params.id, 'acknowledge');
  if (!alert) return response.status(404).json({ error: 'Active alert not found' });
  return response.json(alert);
});
app.post('/api/alerts/:id/resolve', authenticate, authorize('Admin', 'Operator'), (request, response) => {
  const alert = updateAlert(request.params.id, 'resolve');
  if (!alert) return response.status(404).json({ error: 'Active alert not found' });
  return response.json(alert);
});

app.get('/api/sensors/:id', (request, response) => {
  const sensor = getLatestSensor(request.params.id);
  if (!sensor) return response.status(404).json({ error: 'Sensor not found or has not reported telemetry' });
  return response.json(sensor);
});

app.get('/api/sensors', (request, response) => {
  const requestedLimit = Number(request.query.limit ?? 100);
  if (!Number.isInteger(requestedLimit) || requestedLimit < 1 || requestedLimit > 1000) {
    return response.status(400).json({ error: 'limit must be an integer between 1 and 1000' });
  }
  return response.json(getSensors().slice(0, requestedLimit));
});

app.get('/api/grids/:id', (request, response) => {
  if (!/^GRID-(0[1-9]|1[0-2])$/.test(request.params.id)) return response.status(404).json({ error: 'Grid not found' });
  return response.json(getGridSnapshot(request.params.id));
});

app.post('/api/simulation/start', authenticate, authorize('Admin'), (_request, response) => {
  try { sendSimulationCommand({ action: 'start' }); return response.status(202).json({ accepted: true }); }
  catch (error) { return response.status(503).json({ error: error.message }); }
});

app.post('/api/simulation/stop', authenticate, authorize('Admin'), (_request, response) => {
  try { sendSimulationCommand({ action: 'stop' }); return response.status(202).json({ accepted: true }); }
  catch (error) { return response.status(503).json({ error: error.message }); }
});

app.post('/api/simulation/preset', authenticate, authorize('Admin'), (request, response) => {
  const sensors = Number(request.body?.sensors);
  if (!Number.isInteger(sensors) || sensors < 1 || sensors > 10_000) return response.status(400).json({ error: 'sensors must be an integer between 1 and 10000' });
  try { sendSimulationCommand({ action: 'preset', sensors }); return response.status(202).json({ accepted: true, sensors }); }
  catch (error) { return response.status(503).json({ error: error.message }); }
});

app.use((request, response) => response.status(404).json({ error: 'Route not found', requestId: request.requestId }));
app.use((error, _request, response, _next) => {
  console.error('Unhandled request error:', error);
  response.status(500).json({ error: 'Internal server error', requestId: _request.requestId });
});

const server = createServer(app);
initWebSocket(server);
server.listen(config.port, () => {
  console.log(`Smart Grid API listening on port ${config.port}`);
  startBreakerService();
  startTelemetryProcessor();
  connectDependencies();
});

async function shutdown(signal) {
  console.log(`${signal} received; shutting down.`);
  server.close(async () => {
    closeWebSocket();
    await closeDependencies();
    process.exit(0);
  });
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
