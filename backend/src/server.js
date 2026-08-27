import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import { config } from './config.js';
import { closeDependencies, connectDependencies, dependencyState } from './services/dependencies.js';
import { getGridSnapshot, getLatestSensor, getMetrics, sendSimulationCommand, startTelemetryProcessor } from './services/telemetryProcessor.js';

const app = express();
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '100kb' }));

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
  response.json(getMetrics());
});

app.get('/api/sensors/:id', (request, response) => {
  const sensor = getLatestSensor(request.params.id);
  if (!sensor) return response.status(404).json({ error: 'Sensor not found or has not reported telemetry' });
  return response.json(sensor);
});

app.get('/api/grids/:id', (request, response) => response.json(getGridSnapshot(request.params.id)));

app.post('/api/simulation/start', (_request, response) => {
  try { sendSimulationCommand({ action: 'start' }); return response.status(202).json({ accepted: true }); }
  catch (error) { return response.status(503).json({ error: error.message }); }
});

app.post('/api/simulation/stop', (_request, response) => {
  try { sendSimulationCommand({ action: 'stop' }); return response.status(202).json({ accepted: true }); }
  catch (error) { return response.status(503).json({ error: error.message }); }
});

app.post('/api/simulation/preset', (request, response) => {
  const sensors = Number(request.body?.sensors);
  if (!Number.isInteger(sensors) || sensors < 1 || sensors > 10_000) return response.status(400).json({ error: 'sensors must be an integer between 1 and 10000' });
  try { sendSimulationCommand({ action: 'preset', sensors }); return response.status(202).json({ accepted: true, sensors }); }
  catch (error) { return response.status(503).json({ error: error.message }); }
});

app.use((_request, response) => response.status(404).json({ error: 'Route not found' }));
app.use((error, _request, response, _next) => {
  console.error('Unhandled request error:', error);
  response.status(500).json({ error: 'Internal server error' });
});

const server = app.listen(config.port, () => {
  console.log(`Smart Grid API listening on port ${config.port}`);
  startTelemetryProcessor();
  connectDependencies();
});

async function shutdown(signal) {
  console.log(`${signal} received; shutting down.`);
  server.close(async () => {
    await closeDependencies();
    process.exit(0);
  });
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
