# Day 2 — Virtual Telemetry Pipeline

**Schedule:** build and test this work today. Do not commit or push it until you explicitly request the Day 2 upload.

**Implementation status:** the simulator, MQTT processor, Redis state, aggregate batching, metrics APIs, and simulation control APIs are implemented. Runtime throughput verification remains pending because Docker is not available on the current machine.

## Goal

Connect the virtual sensor simulator to the backend through MQTT, maintain fast-changing state in Redis, and persist only batched historical aggregates in PostgreSQL. By the end of the day, the system should process real telemetry end to end without writing every message directly to the database.

## Tasks

- [ ] Replace the simulator placeholder with a single-process, event-driven sensor engine.
- [ ] Support configurable sensor counts through `SIMULATED_SENSORS`:
  - 100 sensors
  - 500 sensors
  - 1,000 sensors
  - 5,000 sensors
  - 10,000 sensors
- [ ] Support configurable rates through `TELEMETRY_INTERVAL_MS` and avoid creating one Node.js process per sensor.
- [ ] Generate hierarchical virtual device identities:
  - region
  - substation
  - grid
  - sensor
- [ ] Generate realistic telemetry with correlated values:
  - voltage fluctuates around nominal voltage
  - current varies with simulated load
  - power follows voltage × current × power factor
  - frequency fluctuates slightly around 50 Hz
  - power factor remains within realistic bounds
  - temperature changes gradually
  - energy consumption accumulates over time
- [ ] Publish telemetry to:

  ```text
  grid/{regionId}/{substationId}/{gridId}/sensor/{sensorId}/telemetry
  ```

- [ ] Define and validate a versioned telemetry payload containing:
  - `sensorId`, `gridId`, `substationId`, `regionId`
  - `voltage`, `current`, `power`, `frequency`, `powerFactor`
  - `energyConsumed`, `temperature`, `status`, `timestamp`
- [ ] Add MQTT reconnect handling and simulator connection status logging.
- [ ] Subscribe to telemetry topics in the backend using one scalable subscription pattern.
- [ ] Reject malformed, incomplete, stale, or invalid telemetry without crashing the processor.
- [ ] Deduplicate messages using a sensor/timestamp or message identifier strategy.
- [ ] Update Redis with the latest state for every active sensor.
- [ ] Maintain Redis keys for:
  - `sensor:{sensorId}:latest`
  - `grid:{gridId}:power`
  - `system:telemetry:rate`
  - recent telemetry and device heartbeats
- [ ] Track real processing metrics:
  - messages received
  - messages processed
  - messages dropped
  - messages per second
  - Redis updates
  - processing latency
  - active, online, and offline sensors
- [ ] Implement one-second aggregation by sensor/grid.
- [ ] Flush aggregates to PostgreSQL in configurable 5–10-second batches.
- [ ] Ensure database failures do not stop MQTT processing; retain/retry pending batches safely.
- [ ] Add a basic telemetry API response for current metrics and latest grid state.
- [ ] Add simulator controls for start, stop, and configurable load-test mode.
- [ ] Add structured logs for throughput, batch size, database writes, and reconnects.

## Verification checklist

- [ ] Start the stack with `docker compose up --build`.
- [ ] Confirm a simulator message is visible on the expected MQTT topic.
- [ ] Confirm the backend receives and validates the message.
- [ ] Confirm the latest sensor reading appears in Redis.
- [ ] Confirm aggregate rows are written to PostgreSQL only after a batch flush.
- [ ] Run 100 sensors and verify all pipeline stages.
- [ ] Run 1,000 sensors and record actual messages/sec and processing latency.
- [ ] Run 5,000 sensors and record:
  - target sensors
  - active sensors
  - received/sec
  - processed/sec
  - dropped messages
  - average latency
  - batch size
  - database writes/sec
- [ ] Confirm stopping the simulator marks heartbeats as stale without crashing the backend.
- [ ] Confirm malformed MQTT payloads are counted as dropped and logged safely.

## Definition of done

Telemetry genuinely travels through:

```text
Virtual Sensors → Mosquitto MQTT → Node.js Processor → Redis →
1-second Aggregation → Batched PostgreSQL History
```

The throughput panel and logs show measurements from the running system, not hard-coded or frontend-generated numbers. No commit or GitHub push is made as part of this task.
