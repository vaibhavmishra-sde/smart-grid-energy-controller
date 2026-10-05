# API quick reference

Public monitoring endpoints include `GET /health`, `GET /api/system/status`,
`GET /api/metrics`, `GET /api/sensors`, `GET /api/grids`, and `GET /api/alerts`.

Protected operations require a bearer token from `POST /api/auth/login`:

- `POST /api/breakers/:id/:action` accepts `on`, `off`, `trip`, or `reset`.
- `POST /api/alerts/:id/acknowledge` acknowledges an active alert.
- `POST /api/alerts/:id/resolve` resolves an active alert.
- `POST /api/simulation/start` and `/api/simulation/stop` control the simulator.

Every response includes `X-Request-Id`; clients may provide one to correlate logs.
# API reference

All JSON endpoints are served by the backend at `http://localhost:5000`.

## Operational endpoints

- `GET /health` returns a process-level health response.
- `GET /api/system/status` reports MQTT, Redis, and PostgreSQL dependency state.
- `GET /api/metrics` returns live throughput, latency, sensor, and aggregate counters.

Every response includes an `X-Request-Id` header. Supply your own ID when tracing a request; otherwise the API generates one.
