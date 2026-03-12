const { WebSocketServer } = require('ws');

function createWSServer(httpServer) {
  const wss = new WebSocketServer({ server: httpServer });
  const clients = new Map(); // deviceId -> Set<ws>

  wss.on('connection', (ws, req) => {
    const params = new URL(req.url, 'http://localhost').searchParams;
    const device = params.get('device');
    if (!device) {
      ws.close(1008, 'Missing device parameter');
      return;
    }

    if (!clients.has(device)) clients.set(device, new Set());
    clients.get(device).add(ws);

    ws.on('close', () => {
      const set = clients.get(device);
      if (set) {
        set.delete(ws);
        if (set.size === 0) clients.delete(device);
      }
    });
  });

  function broadcast(deviceId, message) {
    const set = clients.get(deviceId);
    if (!set) return;
    const data = JSON.stringify(message);
    for (const ws of set) {
      if (ws.readyState === 1) ws.send(data);
    }
  }

  function broadcastGlobal(message) {
    broadcast('_global', message);
  }

  return { broadcast, broadcastGlobal };
}

module.exports = { createWSServer };
