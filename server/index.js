const http = require('http');
const path = require('path');
const express = require('express');
const { createWSServer } = require('./websocket');
const { createRouter } = require('./routes');

const PORT = process.env.SIGNAL_PORT || 4888;
const app = express();
const server = http.createServer(app);

// WebSocket
const { broadcast, broadcastGlobal } = createWSServer(server);

// Middleware
app.use(express.json());

// API
app.use('/api', createRouter(broadcast, broadcastGlobal));

// Display route — serves display.html for /display/:deviceName
app.get('/display/:device', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'display.html'));
});

// Static files
app.use(express.static(path.join(__dirname, '..', 'public')));

server.listen(PORT, () => {
  console.log(`\n  ╔══════════════════════════════════════╗`);
  console.log(`  ║          SIGNAL v0.1.0                ║`);
  console.log(`  ║   AI-Powered Virtual Display Platform ║`);
  console.log(`  ╚══════════════════════════════════════╝`);
  console.log(`\n  Dashboard:  http://localhost:${PORT}`);
  console.log(`  API:        http://localhost:${PORT}/api/devices\n`);
});
