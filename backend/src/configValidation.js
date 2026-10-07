export function positiveNumber(name, fallback) {
  const value = Number(process.env[name] ?? fallback);
  if (!Number.isFinite(value) || value <= 0) throw new Error(`${name} must be a positive number`);
  return value;
}

export function positiveInteger(name, fallback) {
  const value = Number(process.env[name] ?? fallback);
  if (!Number.isSafeInteger(value) || value <= 0) throw new Error(`${name} must be a positive integer`);
  return value;
}

export function csvValues(name, fallback = '') {
  const value = String(process.env[name] ?? fallback).trim();
  return value ? value.split(',').map((item) => item.trim()).filter(Boolean) : [];
}
