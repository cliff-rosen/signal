const http = require('http');
const crypto = require('crypto');
const { McpServer } = require('@modelcontextprotocol/sdk/server/mcp.js');
const { StreamableHTTPServerTransport } = require('@modelcontextprotocol/sdk/server/streamableHttp.js');
const { registerTools } = require('./tools');

const PORT = process.env.MCP_PORT || 4889;

// Track transports by session ID
const sessions = new Map();

const httpServer = http.createServer(async (req, res) => {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Accept, Mcp-Session-Id');
  res.setHeader('Access-Control-Expose-Headers', 'Mcp-Session-Id');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  if (req.url !== '/mcp' && !req.url.startsWith('/mcp?')) {
    res.writeHead(404);
    res.end('Not found. MCP endpoint is at /mcp');
    return;
  }

  const sessionId = req.headers['mcp-session-id'];

  if (req.method === 'POST') {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    const body = JSON.parse(Buffer.concat(chunks).toString());

    // Check if this is an initialize request (new session)
    const isInit = Array.isArray(body)
      ? body.some(m => m.method === 'initialize')
      : body.method === 'initialize';

    if (isInit) {
      // Create new server + transport for this session
      const transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: () => crypto.randomUUID(),
        onsessioninitialized: (id) => {
          sessions.set(id, { transport, server: mcpServer });
        },
      });

      const mcpServer = new McpServer({ name: 'signal', version: '0.1.0' });
      registerTools(mcpServer);
      await mcpServer.connect(transport);
      await transport.handleRequest(req, res, body);
    } else if (sessionId && sessions.has(sessionId)) {
      await sessions.get(sessionId).transport.handleRequest(req, res, body);
    } else {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ jsonrpc: '2.0', error: { code: -32600, message: 'Invalid session' }, id: null }));
    }
  } else if (req.method === 'GET') {
    if (sessionId && sessions.has(sessionId)) {
      await sessions.get(sessionId).transport.handleRequest(req, res);
    } else {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ jsonrpc: '2.0', error: { code: -32600, message: 'Invalid session' }, id: null }));
    }
  } else if (req.method === 'DELETE') {
    if (sessionId && sessions.has(sessionId)) {
      const session = sessions.get(sessionId);
      await session.transport.handleRequest(req, res);
      sessions.delete(sessionId);
    } else {
      res.writeHead(204);
      res.end();
    }
  }
});

httpServer.listen(PORT, () => {
  console.log(`\n  Signal MCP Remote Server`);
  console.log(`  Listening on http://localhost:${PORT}/mcp`);
  console.log(`\n  Add this URL as a custom MCP connector in Claude.ai\n`);
});
