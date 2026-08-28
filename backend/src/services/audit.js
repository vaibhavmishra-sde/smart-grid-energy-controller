import { database } from './dependencies.js';
import { broadcast } from './realtime.js';

export function writeAudit({ actor, action, target = null, result = 'SUCCESS', details = {} }) {
  const entry = { actor, action, target, result, details, timestamp: new Date().toISOString() };
  database.query(
    'INSERT INTO audit_logs (actor, action, target, result, details) VALUES ($1, $2, $3, $4, $5)',
    [actor, action, target, result, details],
  ).catch((error) => console.error('Audit log persistence failed:', error.message));
  broadcast('audit_event', entry);
  return entry;
}

