CREATE TABLE IF NOT EXISTS regions (
  id VARCHAR(64) PRIMARY KEY,
  name VARCHAR(128) NOT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'HEALTHY',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS substations (
  id VARCHAR(64) PRIMARY KEY,
  region_id VARCHAR(64) NOT NULL REFERENCES regions(id),
  name VARCHAR(128) NOT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'HEALTHY',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS grids (
  id VARCHAR(64) PRIMARY KEY,
  substation_id VARCHAR(64) NOT NULL REFERENCES substations(id),
  name VARCHAR(128) NOT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'HEALTHY',
  total_power NUMERIC(12, 2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sensors (
  id VARCHAR(64) PRIMARY KEY,
  grid_id VARCHAR(64) NOT NULL REFERENCES grids(id),
  status VARCHAR(32) NOT NULL DEFAULT 'ONLINE',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS breakers (
  id VARCHAR(64) PRIMARY KEY,
  grid_id VARCHAR(64) NOT NULL REFERENCES grids(id),
  status VARCHAR(32) NOT NULL DEFAULT 'ON',
  last_command VARCHAR(32),
  last_changed TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS telemetry_aggregates (
  id BIGSERIAL PRIMARY KEY,
  -- Telemetry ingestion is intentionally decoupled from device registration so
  -- high-rate writes never block on per-message foreign-key inserts.
  sensor_id VARCHAR(64) NOT NULL,
  bucket_start TIMESTAMPTZ NOT NULL,
  average_voltage NUMERIC(8, 2),
  average_current NUMERIC(8, 2),
  average_power NUMERIC(12, 2),
  average_frequency NUMERIC(6, 3),
  average_temperature NUMERIC(6, 2),
  sample_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS telemetry_aggregates_sensor_bucket_idx
  ON telemetry_aggregates(sensor_id, bucket_start DESC);

CREATE TABLE IF NOT EXISTS alerts (
  id BIGSERIAL PRIMARY KEY,
  severity VARCHAR(16) NOT NULL,
  type VARCHAR(64) NOT NULL,
  grid_id VARCHAR(64) REFERENCES grids(id),
  sensor_id VARCHAR(64) REFERENCES sensors(id),
  message TEXT NOT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'ACTIVE',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  acknowledged_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id BIGSERIAL PRIMARY KEY,
  actor VARCHAR(128) NOT NULL,
  action VARCHAR(64) NOT NULL,
  target VARCHAR(128),
  result VARCHAR(32) NOT NULL,
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
