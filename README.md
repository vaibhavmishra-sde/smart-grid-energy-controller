# Smart Grid Energy Controller

A software-only industrial IoT platform that simulates energy sensors and virtual breakers. No physical hardware or cloud account is required.

## Day 1 status

The local foundation provides Docker Compose services for Mosquitto, Redis, PostgreSQL, the Node.js API, a simulator placeholder, and a React/Vite operations-center shell.

## Run locally

```bash
docker compose up --build
```

- Dashboard: `http://localhost:5173`
- API health: `http://localhost:5000/health`
- System status: `http://localhost:5000/api/system/status`

## Day 2 telemetry pipeline

The simulator runs as one event-driven Node.js process and publishes realistic readings at:

```text
grid/{regionId}/{substationId}/{gridId}/sensor/{sensorId}/telemetry
```

The backend validates and deduplicates each payload, updates the latest reading and heartbeat in Redis, maintains in-process grid totals, and flushes one-second sensor aggregates to PostgreSQL in configurable batches (`AGGREGATION_FLUSH_MS`, default 5 seconds). Database failures retain pending aggregates and do not stop MQTT processing.

Useful endpoints:

- `GET /api/metrics` — live received/processed/dropped rates, latency percentiles, Redis updates, pending aggregates, and sensor counts
- `GET /api/sensors/:id` — latest validated reading for a sensor
- `GET /api/grids/:id` — current total power and latest readings for a grid

The simulator supports runtime commands on `grid/system/simulation/command`:

```json
{"action":"start"}
{"action":"stop"}
{"action":"preset","sensors":5000}
{"action":"scenario","scenario":"high_demand"}
```

No commit or GitHub push is made for Day 2 until requested.
