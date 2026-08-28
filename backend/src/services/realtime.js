import { WebSocketServer, WebSocket } from 'ws';

let websocketServer;

export function initWebSocket(httpServer) {
  websocketServer = new WebSocketServer({ server: httpServer, path: '/ws' });
  websocketServer.on('connection', (socket) => {
    socket.send(JSON.stringify({ type: 'connection', payload: { connected: true }, timestamp: new Date().toISOString() }));
    socket.on('error', () => socket.close());
  });
  websocketServer.on('error', (error) => console.error('WebSocket server error:', error.message));
  return websocketServer;
}

export function broadcast(type, payload) {
  if (!websocketServer) return;
  const message = JSON.stringify({ type, payload, timestamp: new Date().toISOString() });
  for (const socket of websocketServer.clients) {
    if (socket.readyState === WebSocket.OPEN) socket.send(message);
  }
}

export function closeWebSocket() {
  if (websocketServer) websocketServer.close();
}

