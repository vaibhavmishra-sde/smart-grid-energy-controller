import jwt from 'jsonwebtoken';
import { config } from '../config.js';
import { writeAudit } from './audit.js';

const users = new Map([
  ['admin', { username: 'admin', role: 'Admin', password: config.adminPassword }],
  ['operator', { username: 'operator', role: 'Operator', password: config.operatorPassword }],
  ['viewer', { username: 'viewer', role: 'Viewer', password: config.viewerPassword }],
]);

export function login(username, password) {
  const user = users.get(String(username ?? '').toLowerCase());
  if (!user || user.password !== password) return null;
  writeAudit({ actor: user.username, action: 'login', target: user.username });
  return {
    token: jwt.sign({ sub: user.username, role: user.role }, config.jwtSecret, { expiresIn: '8h' }),
    user: { username: user.username, role: user.role },
  };
}

export function authenticate(request, response, next) {
  const header = request.headers.authorization ?? '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return response.status(401).json({ error: 'Bearer token required' });
  try {
    request.user = jwt.verify(token, config.jwtSecret);
    return next();
  } catch {
    return response.status(401).json({ error: 'Invalid or expired token' });
  }
}

export function authorize(...roles) {
  return (request, response, next) => {
    if (!request.user || !roles.includes(request.user.role)) return response.status(403).json({ error: 'Insufficient permissions' });
    return next();
  };
}
