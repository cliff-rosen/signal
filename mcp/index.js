require('dotenv').config();

const { McpServer } = require('@modelcontextprotocol/sdk/server/mcp.js');
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');
const { registerTools } = require('./tools');

const namespace = process.env.SIGNAL_NAMESPACE;
if (!namespace) {
  console.error('SIGNAL_NAMESPACE env var is required');
  process.exit(1);
}

const server = new McpServer({
  name: 'signal',
  version: '0.2.0',
});

registerTools(server, namespace);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch(console.error);
