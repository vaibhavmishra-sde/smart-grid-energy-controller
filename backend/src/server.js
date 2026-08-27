import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import { config } from './config.js';
import { closeDependencies, connectDependencies, dependencyState } from './services/dependencies.js';

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

app.use((_request, response) => response.status(404).json({ error: 'Route not found' }));
app.use((error, _request, response, _next) => {
  console.error('Unhandled request error:', error);
  response.status(500).json({ error: 'Internal server error' });
});

const server = app.listen(config.port, () => {
  console.log(`Smart Grid API listening on port ${config.port}`);
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

