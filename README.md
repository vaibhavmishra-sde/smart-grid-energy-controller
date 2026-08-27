# Smart Grid Energy Controller

A software-only industrial IoT platform that simulates energy sensors and virtual breakers. No physical hardware or cloud account is required.


## Run locally

```bash
docker compose up --build
```

- Dashboard: `http://localhost:5173`
- API health: `http://localhost:5000/health`
- System status: `http://localhost:5000/api/system/status`

Telemetry simulation, Redis aggregation, controls, and the live dashboard are implemented in subsequent milestones.
