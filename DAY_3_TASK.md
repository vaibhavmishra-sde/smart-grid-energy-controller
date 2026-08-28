# Day 3 — Grid Operations, Safety, and Real-Time Control

**Schedule:** implement and verify this work today, then commit and push the completed Day 3 milestone.

**Implementation status:** the virtual breaker MQTT round trip, role-aware command APIs, alert evaluation, automatic protection, audit logging, and WebSocket broadcasting are implemented. Full runtime verification requires the Docker services to be available.

## Goal

Complete the operational control loop for software-only breakers and grid safety. Commands must travel from the API through MQTT to the virtual breaker, return as a status event, update Redis, and become visible through WebSockets.

## Virtual breaker system

- [ ] Create virtual breakers for each configured grid.
- [ ] Model breaker states: `ON`, `OFF`, `TRIPPED`, and `FAULT`.
- [ ] Subscribe the breaker simulator to:

  ```text
  grid/{regionId}/{substationId}/{gridId}/breaker/{breakerId}/command
  ```

- [ ] Publish breaker state changes to:

  ```text
  grid/{regionId}/{substationId}/{gridId}/breaker/{breakerId}/status
  ```

- [ ] Support `ON`, `OFF`, `TRIP`, and `RESET` commands.
- [ ] Reject invalid state transitions safely.
- [ ] Persist breaker state, last command, and last-changed timestamp.
- [ ] Store current breaker state in Redis.
- [ ] Log every command with actor, target, action, result, and timestamp.

## Backend APIs

- [ ] Add `GET /api/grids` and `GET /api/grids/:id`.
- [ ] Add `GET /api/substations`.
- [ ] Add `GET /api/sensors` and `GET /api/sensors/:id`.
- [ ] Add `GET /api/breakers` and `GET /api/breakers/:id`.
- [ ] Add breaker command endpoints:
  - `POST /api/breakers/:id/on`
  - `POST /api/breakers/:id/off`
  - `POST /api/breakers/:id/trip`
  - `POST /api/breakers/:id/reset`
- [ ] Add request validation and consistent error responses.
- [ ] Return `202 Accepted` for commands sent asynchronously through MQTT.

## Safety and alert rules

- [ ] Create alerts when power exceeds `MAX_POWER`.
- [ ] Create warnings when voltage exceeds `MAX_VOLTAGE`.
- [ ] Create warnings when voltage falls below `MIN_VOLTAGE`.
- [ ] Create frequency alerts outside 49.5–50.5 Hz.
- [ ] Mark sensors offline after a configurable heartbeat timeout.
- [ ] Avoid duplicate active alerts for the same condition.
- [ ] Persist important alerts and maintain active alerts in Redis.
- [ ] Add alert APIs for list, acknowledge, and resolve.
- [ ] Broadcast `alert_created` and `alert_resolved` events.

## Automatic protection

- [ ] Add configurable `ENABLE_AUTO_PROTECTION` behavior.
- [ ] Implement the progression `NORMAL → WARNING → CRITICAL → TRIPPED`.
- [ ] Trip the affected virtual breaker when critical load remains above threshold.
- [ ] Publish a system event explaining every automatic trip.
- [ ] Allow operators to reset a tripped breaker after the condition clears.

## Authentication and authorization

- [ ] Add login/token handling using the configured JWT secret.
- [ ] Define roles: `Admin`, `Operator`, and `Viewer`.
- [ ] Allow Admin to configure simulation, thresholds, and breakers.
- [ ] Allow Operator to monitor, control breakers, and manage alerts.
- [ ] Allow Viewer to monitor grids, sensors, and alerts only.
- [ ] Return `401` for unauthenticated requests and `403` for forbidden actions.

## WebSocket events

- [ ] Add a WebSocket server for live dashboard updates.
- [ ] Broadcast only affected state instead of refreshing the page.
- [ ] Implement event types:
  - `telemetry_update`
  - `grid_update`
  - `sensor_status`
  - `breaker_status`
  - `alert_created`
  - `alert_resolved`
  - `system_metrics`
- [ ] Handle client disconnects and reconnects without crashing the backend.

## Audit logging

- [ ] Log login and logout operations.
- [ ] Log breaker commands and command results.
- [ ] Log simulation start/stop and configuration changes.
- [ ] Log alert acknowledgement and resolution.
- [ ] Add an API or query path for recent audit events.

## Verification checklist

- [ ] Send `OFF` from the API and verify the complete MQTT breaker round trip.
- [ ] Verify Redis and database breaker state changes.
- [ ] Verify a `TRIP` command cannot be silently overwritten by `ON` without reset.
- [ ] Trigger overload and verify an alert is created.
- [ ] Verify automatic protection trips a breaker when enabled.
- [ ] Verify alert acknowledgement and resolution.
- [ ] Verify Viewer cannot send breaker commands.
- [ ] Verify Operator can control breakers but cannot change thresholds.
- [ ] Verify WebSocket clients receive breaker, alert, and metric events.
- [ ] Verify malformed commands return validation errors and do not crash services.
- [ ] Run backend and simulator tests for breaker behavior, alert rules, auth, and MQTT commands.

## Definition of done

The operational path works end to end:

```text
React/API → Node.js REST command → MQTT → Virtual Breaker → MQTT status
         → Redis/database → WebSocket → Live dashboard
```

Every safety event and operator action is observable, permission-checked, and auditable.
