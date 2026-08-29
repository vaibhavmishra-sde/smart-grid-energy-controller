# Smart Grid Energy Controller

A software-only industrial IoT platform that simulates energy sensors and virtual breakers. No physical hardware or cloud account is required.


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

## Day 3 operations and control

Day 3 adds software-only virtual breakers, safety alerts, automatic protection, JWT role checks, audit logging, and live WebSocket events. Breaker commands use the MQTT round trip:

```text
REST command → MQTT command → virtual breaker → MQTT status → Redis/database → WebSocket
```

Demo users are configured through `ADMIN_PASSWORD`, `OPERATOR_PASSWORD`, and `VIEWER_PASSWORD`. Obtain a token with `POST /api/auth/login`, then send it as `Authorization: Bearer <token>` for breaker, alert, simulation, and audit operations.

WebSocket clients connect to `ws://localhost:5000/ws` and receive `telemetry_update`, `grid_update`, `breaker_status`, `alert_created`, `alert_resolved`, `sensor_status`, `system_metrics`, and `audit_event` messages.

## Day 4 operations center

The React/Vite frontend now provides an industrial operations center with live overview metrics, telemetry sparklines, sensor readings, topology, alerts, authenticated breaker controls, and performance monitoring. It polls summary APIs for resilience and consumes WebSocket events for low-latency updates.

Day 4 verification output is recorded in `DAY_4_VERIFICATION_OUTPUT.txt`. The automated validation tests pass locally; Docker throughput and a browser screenshot must be captured on a machine with Docker Desktop and a browser runtime.
