const crypto = require('crypto');
const express = require('express');
const { McpServer } = require('@modelcontextprotocol/sdk/server/mcp.js');
const { StreamableHTTPServerTransport } = require('@modelcontextprotocol/sdk/server/streamableHttp.js');
const { registerTools } = require('../mcp/tools');
const store = require('./store');
const { logAPI, getIP } = require('./log');

const sessions = new Map();
const SESSION_TTL = 30 * 60 * 1000; // 30 minutes

// Evict stale sessions every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [id, session] of sessions) {
    if (now - session.lastActivity > SESSION_TTL) {
      sessions.delete(id);
    }
  }
}, 5 * 60 * 1000);

function createDirectClient(broadcast, broadcastGlobal, ip) {
  return {
    listDevices: (ns) => {
      logAPI(ns, 'list_devices', { ip });
      return store.loadDevices(ns);
    },
    deleteDevice: async (ns, id) => {
      logAPI(ns, 'delete_device', { device: id, ip });
      const ok = await store.deleteDevice(ns, id);
      if (ok) {
        broadcast(ns, id, { event: 'clear' });
        broadcastGlobal(ns, { event: 'device_deleted', deviceId: id });
      }
      return { ok };
    },
    pushContent: async (ns, deviceId, type, body) => {
      logAPI(ns, 'push_content', { device: deviceId, contentType: type, body, ip });
      const devices = await store.loadDevices(ns);
      if (!devices.find(d => d.id === deviceId)) {
        const { device } = await store.createDevice(ns, deviceId);
        broadcastGlobal(ns, { event: 'device_created', device });
      }
      const content = await store.saveContent(ns, deviceId, { type, body });
      broadcast(ns, deviceId, { event: 'content', data: content });
      broadcastGlobal(ns, { event: 'content_updated', deviceId, data: content });
      return content;
    },
    clearDevice: async (ns, id) => {
      logAPI(ns, 'clear_device', { device: id, ip });
      await store.deleteContent(ns, id);
      broadcast(ns, id, { event: 'clear' });
      broadcastGlobal(ns, { event: 'content_cleared', deviceId: id });
      return { ok: true };
    },
  };
}

function createRouter(broadcast, broadcastGlobal) {
  const router = express.Router({ mergeParams: true });

  router.all('/', async (req, res) => {
    const namespace = req.namespace;

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

      if (sessionId && sessions.has(sessionId)) {
        const session = sessions.get(sessionId);
        session.lastActivity = Date.now();
        await session.transport.handleRequest(req, res, body);
      } else if (isInit) {
        const ip = getIP(req);
        const client = createDirectClient(broadcast, broadcastGlobal, ip);

        const transport = new StreamableHTTPServerTransport({
          sessionIdGenerator: () => crypto.randomUUID(),
          onsessioninitialized: (id) => {
            sessions.set(id, { transport, server: mcpServer, namespace, lastActivity: Date.now() });
          },
        });

        const mcpServer = new McpServer({ name: 'botbeam', version: '0.2.0' });
        registerTools(mcpServer, namespace, client);
        await mcpServer.connect(transport);
        await transport.handleRequest(req, res, body);
      } else {
        // Expired or unknown session — tell client to re-initialize
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ jsonrpc: '2.0', error: { code: -32600, message: 'Session expired, please re-initialize' }, id: null }));
      }
    } else if (req.method === 'GET') {
      if (sessionId && sessions.has(sessionId)) {
        const session = sessions.get(sessionId);
        session.lastActivity = Date.now();
        await session.transport.handleRequest(req, res);
      } else {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ jsonrpc: '2.0', error: { code: -32600, message: 'Session not found' }, id: null }));
      }
    } else if (req.method === 'DELETE') {
      if (sessionId && sessions.has(sessionId)) {
        const session = sessions.get(sessionId);
        await session.transport.handleRequest(req, res);
        sessions.delete(sessionId);
      } else {
        res.writeHead(204); res.end();
      }
    }
  });

  return router;
}

module.exports = { createRouter };
