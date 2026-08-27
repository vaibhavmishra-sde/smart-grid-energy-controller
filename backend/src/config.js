import 'dotenv/config';

function required(name, fallback) {
  const value = process.env[name] ?? fallback;
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

export const config = Object.freeze({
  port: Number(process.env.PORT ?? 5000),
  mqttHost: required('MQTT_HOST', 'localhost'),
  mqttPort: Number(process.env.MQTT_PORT ?? 1883),
  redisHost: required('REDIS_HOST', 'localhost'),
  redisPort: Number(process.env.REDIS_PORT ?? 6379),
  databaseUrl: required('DATABASE_URL', 'postgresql://smart_grid:change_me_local_only@localhost:5432/smart_grid'),
});

