import mqtt from 'mqtt';
import { createClient } from 'redis';
import pg from 'pg';
import { config } from '../config.js';

export const dependencyState = { mqtt: 'CONNECTING', redis: 'CONNECTING', database: 'CONNECTING' };

export const redis = createClient({ url: `redis://${config.redisHost}:${config.redisPort}` });
redis.on('ready', () => { dependencyState.redis = 'CONNECTED'; });
redis.on('reconnecting', () => { dependencyState.redis = 'RECONNECTING'; });
redis.on('error', (error) => { dependencyState.redis = 'ERROR'; console.error('Redis error:', error.message); });

export const database = new pg.Pool({ connectionString: config.databaseUrl, max: 10 });
database.on('error', (error) => { dependencyState.database = 'ERROR'; console.error('Database pool error:', error.message); });

export const mqttClient = mqtt.connect(`mqtt://${config.mqttHost}:${config.mqttPort}`, { reconnectPeriod: 2000 });
mqttClient.on('connect', () => { dependencyState.mqtt = 'CONNECTED'; });
mqttClient.on('reconnect', () => { dependencyState.mqtt = 'RECONNECTING'; });
mqttClient.on('error', (error) => { dependencyState.mqtt = 'ERROR'; console.error('MQTT error:', error.message); });

export async function connectDependencies() {
  redis.connect().catch((error) => console.error('Initial Redis connection failed:', error.message));
  database.query('SELECT 1').then(() => { dependencyState.database = 'CONNECTED'; }).catch((error) => {
    dependencyState.database = 'ERROR';
    console.error('Initial database connection failed:', error.message);
  });
}

export async function closeDependencies() {
  mqttClient.end(true);
  if (redis.isOpen) await redis.quit();
  await database.end();
}

