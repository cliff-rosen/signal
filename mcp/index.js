const { McpServer } = require('@modelcontextprotocol/sdk/server/mcp.js');
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');
const { z } = require('zod');
const client = require('./client');

const server = new McpServer({
  name: 'signal',
  version: '0.1.0',
});

server.tool(
  'list_devices',
  'List all registered virtual display devices',
  {},
  async () => {
    const devices = await client.listDevices();
    return { content: [{ type: 'text', text: JSON.stringify(devices, null, 2) }] };
  }
);

server.tool(
  'create_device',
  'Register a new virtual display device',
  { name: z.string().describe('Display name, e.g. "kitchen", "dashboard", "office"') },
  async ({ name }) => {
    const device = await client.createDevice(name);
    return { content: [{ type: 'text', text: `Device created: ${device.name} (${device.id})\nView at: http://localhost:${process.env.SIGNAL_PORT || 4888}/display/${device.id}` }] };
  }
);

server.tool(
  'delete_device',
  'Remove a virtual display device',
  { name: z.string().describe('Device ID or name (slugified)') },
  async ({ name }) => {
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    await client.deleteDevice(slug);
    return { content: [{ type: 'text', text: `Device "${name}" deleted.` }] };
  }
);

server.tool(
  'push_content',
  'Push content to a virtual display. Types: text, markdown, html, list (JSON array), dashboard (JSON array of {title, value, subtitle?})',
  {
    device: z.string().describe('Device ID or name'),
    type: z.enum(['text', 'markdown', 'html', 'list', 'dashboard']).describe('Content type'),
    body: z.string().describe('Content body. For list/dashboard types, provide a JSON string.'),
  },
  async ({ device, type, body }) => {
    const slug = device.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const result = await client.pushContent(slug, type, body);
    return { content: [{ type: 'text', text: `Content pushed to "${device}" (${type}) at ${result.updatedAt}` }] };
  }
);

server.tool(
  'clear_device',
  'Clear the content of a virtual display',
  { name: z.string().describe('Device ID or name') },
  async ({ name }) => {
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    await client.clearDevice(slug);
    return { content: [{ type: 'text', text: `Display "${name}" cleared.` }] };
  }
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch(console.error);
