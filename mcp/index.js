require('dotenv').config();

const { McpServer } = require('@modelcontextprotocol/sdk/server/mcp.js');
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');
const { registerTools } = require('./tools');
const httpClient = require('./client');
const { log } = require('./log');

const namespace = process.env.BOTBEAM_NAMESPACE;
const serverUrl = process.env.BOTBEAM_SERVER_URL || 'http://localhost:4888';
if (!namespace) {
  log('ERROR: BOTBEAM_NAMESPACE env var is required');
  process.exit(1);
}
log(`Starting. namespace=${namespace} server=${serverUrl}`);

const server = new McpServer({
  name: 'botbeam',
  version: '0.2.0',
});

registerTools(server, namespace, httpClient);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  log('Connected to stdio transport');
}

main().catch((err) => {
  log(`Fatal: ${err.message}`);
  console.error(err);
});
