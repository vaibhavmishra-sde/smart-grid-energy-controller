# Telemetry simulator

The simulator publishes synthetic sensor readings and virtual breaker events over MQTT.

Run it independently with:

```bash
npm install
npm start
```

Set `MQTT_HOST`, `MQTT_PORT`, `SIMULATED_SENSORS`, and `TELEMETRY_INTERVAL_MS` to match the local broker and desired load.
