export function buildAggregateInsert(rows) {
  const placeholders = [];
  const values = [];

  rows.forEach((row, index) => {
    const offset = index * 8;
    placeholders.push(`($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6}, $${offset + 7}, $${offset + 8})`);
    values.push(
      row.sensorId,
      row.bucketStart,
      row.sumVoltage / row.sampleCount,
      row.sumCurrent / row.sampleCount,
      row.sumPower / row.sampleCount,
      row.sumFrequency / row.sampleCount,
      row.sumTemperature / row.sampleCount,
      row.sampleCount,
    );
  });

  return {
    text: `INSERT INTO telemetry_aggregates
      (sensor_id, bucket_start, average_voltage, average_current, average_power, average_frequency, average_temperature, sample_count)
      VALUES ${placeholders.join(', ')}`,
    values,
  };
}
