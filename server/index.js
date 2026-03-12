require('dotenv').config();

const http = require('http');
const path = require('path');
const express = require('express');
const { initDB } = require('./db');
const { createWSServer } = require('./websocket');
const { createRouter: createAPIRouter } = require('./routes');
const { createRouter: createMCPRouter } = require('./mcp');
const { namespaceMiddleware } = require('./namespace');
const { logAPI, normalizeIP, getIP } = require('./log');
const store = require('./store');

const PORT = process.env.PORT || 4888;
const app = express();
const server = http.createServer(app);

const { broadcast, broadcastGlobal } = createWSServer(server);

// Middleware
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  }
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});
app.use(express.json());

// Static assets (legacy: landing page, display page, CSS, favicon)
app.use('/assets', express.static(path.join(__dirname, '..', 'public')));

// React app build (Vite output)
app.use('/app', express.static(path.join(__dirname, '..', 'frontend', 'dist')));

// Landing page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'landing.html'));
});

// Create namespace
app.post('/api/namespaces', async (req, res) => {
  const ip = getIP(req);
  const id = await store.createNamespace(normalizeIP(ip));
  logAPI(id, 'create_namespace', { ip });
  res.status(201).json({ id, url: `/s/${id}` });
});

// Two paths to the same core logic (store.js):
app.use('/s/:namespace/mcp', namespaceMiddleware, createMCPRouter(broadcast, broadcastGlobal));
app.use('/s/:namespace/api', namespaceMiddleware, createAPIRouter(broadcast, broadcastGlobal));

// HTML pages
app.get('/s/:namespace/display/:device', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'display.html'));
});

app.get('/s/:namespace', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'frontend', 'dist', 'index.html'));
});

// Health check
app.get('/health', (req, res) => res.json({ status: 'ok' }));

// Start
async function start() {
  await initDB();
  server.listen(PORT, () => {
    console.log(`\n  ╔══════════════════════════════════════╗`);
    console.log(`  ║         BOTBEAM v0.2.0                ║`);
    console.log(`  ║   AI-Powered Virtual Display Platform ║`);
    console.log(`  ╚══════════════════════════════════════╝`);
    console.log(`\n  Landing:  http://localhost:${PORT}`);
    console.log(`  Health:   http://localhost:${PORT}/health\n`);
  });
}

start().catch(console.error);
