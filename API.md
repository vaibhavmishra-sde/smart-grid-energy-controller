# API quick reference

Public monitoring endpoints include `GET /health`, `GET /api/system/status`,
`GET /api/metrics`, `GET /api/sensors`, `GET /api/grids`, and `GET /api/alerts`.

Protected operations require a bearer token from `POST /api/auth/login`:

- `POST /api/breakers/:id/:action` accepts `on`, `off`, `trip`, or `reset`.
- `POST /api/alerts/:id/acknowledge` acknowledges an active alert.
- `POST /api/alerts/:id/resolve` resolves an active alert.
- `POST /api/simulation/start` and `/api/simulation/stop` control the simulator.

Every response includes `X-Request-Id`; clients may provide one to correlate logs.
