require('dotenv').config();

const http = require('http');
const crypto = require('crypto');
const path = require('path');
const express = require('express');
const { McpServer } = require('@modelcontextprotocol/sdk/server/mcp.js');
const { StreamableHTTPServerTransport } = require('@modelcontextprotocol/sdk/server/streamableHttp.js');
const { initDB } = require('./db');
const { createWSServer } = require('./websocket');
const { createRouter } = require('./routes');
const { namespaceMiddleware } = require('./namespace');
const { registerTools } = require('../mcp/tools');
const store = require('./store');

const PORT = process.env.PORT || 4888;
const app = express();
const server = http.createServer(app);

// WebSocket
const { broadcast, broadcastGlobal } = createWSServer(server);

// Middleware
app.use(express.json());

// ── Static assets at /assets/ ──
app.use('/assets', express.static(path.join(__dirname, '..', 'public')));

// ── Landing page ──
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'landing.html'));
});

// ── Create namespace ──
app.post('/api/namespaces', async (req, res) => {
  const id = await store.createNamespace();
  res.status(201).json({ id, url: `/s/${id}` });
});

// ── MCP endpoint (per namespace) ──
const mcpSessions = new Map();

async function handleMCP(req, res) {
  const namespace = req.params.namespace;
  const ns = await store.getNamespace(namespace);
  if (!ns) { res.writeHead(404); res.end('Namespace not found'); return; }

  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Accept, Mcp-Session-Id');
  res.setHeader('Access-Control-Expose-Headers', 'Mcp-Session-Id');

  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }

  const sessionId = req.headers['mcp-session-id'];

  if (req.method === 'POST') {
    const body = req.body;

    const isInit = Array.isArray(body)
      ? body.some(m => m.method === 'initialize')
      : body.method === 'initialize';

    if (isInit) {
      const transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: () => crypto.randomUUID(),
        onsessioninitialized: (id) => {
          mcpSessions.set(id, { transport, server: mcpServer, namespace });
        },
      });

      const mcpServer = new McpServer({ name: 'botbeam', version: '0.2.0' });
      registerTools(mcpServer, namespace);
      await mcpServer.connect(transport);
      await transport.handleRequest(req, res, body);
    } else if (sessionId && mcpSessions.has(sessionId)) {
      await mcpSessions.get(sessionId).transport.handleRequest(req, res, body);
    } else {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ jsonrpc: '2.0', error: { code: -32600, message: 'Invalid session' }, id: null }));
    }
  } else if (req.method === 'GET') {
    if (sessionId && mcpSessions.has(sessionId)) {
      await mcpSessions.get(sessionId).transport.handleRequest(req, res);
    } else {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ jsonrpc: '2.0', error: { code: -32600, message: 'Invalid session' }, id: null }));
    }
  } else if (req.method === 'DELETE') {
    if (sessionId && mcpSessions.has(sessionId)) {
      const session = mcpSessions.get(sessionId);
      await session.transport.handleRequest(req, res);
      mcpSessions.delete(sessionId);
    } else {
      res.writeHead(204); res.end();
    }
  }
}

app.all('/s/:namespace/mcp', handleMCP);

// ── Namespace routes ──
app.use('/s/:namespace/api', namespaceMiddleware, createRouter(broadcast, broadcastGlobal));

app.get('/s/:namespace/display/:device', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'display.html'));
});

app.get('/s/:namespace', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

// ── Health check ──
app.get('/health', (req, res) => res.json({ status: 'ok' }));

// ── Start ──
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
