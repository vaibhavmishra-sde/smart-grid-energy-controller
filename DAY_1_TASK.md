# Day 1 — Smart Grid Controller Foundation

**Schedule:** complete and commit/push this work tomorrow. No GitHub commit or upload today.

## Goal

Create a runnable local foundation for the software-only Smart Grid Energy Controller. By the end of the day, the complete Docker stack starts locally and the API confirms that its dependencies are reachable.

## Tasks

- [ ] Initialize the monorepo folders:
  - `frontend/` — React + Vite dashboard
  - `backend/` — Node.js + Express API
  - `simulator/` — virtual sensor and breaker service
  - `docker/` — infrastructure configuration

- [ ] Create `docker-compose.yml` with these services:
  - Mosquitto MQTT broker
  - Redis
  - PostgreSQL
  - Backend API
  - Simulator placeholder
  - Frontend placeholder

- [ ] Add Mosquitto configuration with telemetry and command topics enabled.

- [ ] Add `.env.example` with local, non-secret defaults:
  - ports and service hosts
  - simulation sensor count and interval
  - safety thresholds
  - placeholder JWT secret

- [ ] Set up the backend:
  - Express server
  - environment/config validation
  - structured error handling
  - `GET /health`
  - `GET /api/system/status`

- [ ] Connect the backend to Redis, PostgreSQL, and MQTT with graceful reconnect/error handling.

- [ ] Add the initial PostgreSQL schema:
  - regions, substations, grids, sensors, breakers
  - telemetry aggregates, alerts, audit logs

- [ ] Set up the React/Vite frontend shell with a dark industrial visual foundation.

- [ ] Verify locally:
  - `docker compose up --build`
  - frontend loads
  - `/health` responds
  - `/api/system/status` reports MQTT, Redis, and database connectivity

## Tomorrow's GitHub milestone

After verification, make these commits and push them:

1. `chore: initialize smart grid controller monorepo`
2. `feat: add local docker infrastructure and health api`

## Definition of done

The project launches with one Docker Compose command and has a frontend, backend API, MQTT broker, Redis cache, and PostgreSQL database running entirely locally. No physical hardware or cloud account is required.
