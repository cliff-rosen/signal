const { WebSocketServer } = require('ws');
const fs = require('fs');
const path = require('path');

const LOG_FILE = path.join(__dirname, '..', 'botbeam.log');
function log(msg) {
  const line = `${new Date().toISOString()} ${msg}\n`;
  fs.appendFileSync(LOG_FILE, line);
  console.log(msg);
}

function createWSServer(httpServer) {
  const wss = new WebSocketServer({ server: httpServer });
  const clients = new Map(); // "namespace:deviceId" -> Set<ws>

  wss.on('connection', (ws, req) => {
    const params = new URL(req.url, 'http://localhost').searchParams;
    const namespace = params.get('namespace');
    const device = params.get('device');
    if (!namespace || !device) {
      ws.close(1008, 'Missing namespace or device parameter');
      return;
    }

    const key = `${namespace}:${device}`;
    if (!clients.has(key)) clients.set(key, new Set());
    clients.get(key).add(ws);
    log(`[WS] Connected: ${key} (${clients.get(key).size} clients)`);

    ws.on('close', () => {
      const set = clients.get(key);
      if (set) {
        set.delete(ws);
        log(`[WS] Disconnected: ${key} (${set.size} remaining)`);
        if (set.size === 0) clients.delete(key);
      }
    });
  });

  function broadcast(namespace, deviceId, message) {
    const key = `${namespace}:${deviceId}`;
    const set = clients.get(key);
    log(`[WS] Broadcast ${key}: ${message.event} → ${set ? set.size : 0} clients`);
    if (!set) return;
    const data = JSON.stringify(message);
    for (const ws of set) {
      if (ws.readyState === 1) ws.send(data);
    }
  }

  function broadcastGlobal(namespace, message) {
    broadcast(namespace, '_global', message);
  }

  return { broadcast, broadcastGlobal };
}

module.exports = { createWSServer };
