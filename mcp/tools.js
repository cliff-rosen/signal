const { z } = require('zod');
const client = require('./client');

function registerTools(server, namespace) {
  server.tool(
    'list_devices',
    'List all registered virtual display devices',
    {},
    async () => {
      const devices = await client.listDevices(namespace);
      return { content: [{ type: 'text', text: JSON.stringify(devices, null, 2) }] };
    }
  );

  server.tool(
    'create_device',
    'Register a new virtual display device',
    { name: z.string().describe('Display name, e.g. "kitchen", "dashboard", "office"') },
    async ({ name }) => {
      const device = await client.createDevice(namespace, name);
      return { content: [{ type: 'text', text: `Device created: ${device.name} (${device.id})` }] };
    }
  );

  server.tool(
    'delete_device',
    'Remove a virtual display device',
    { name: z.string().describe('Device ID or name (slugified)') },
    async ({ name }) => {
      const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      await client.deleteDevice(namespace, slug);
      return { content: [{ type: 'text', text: `Device "${name}" deleted.` }] };
    }
  );

  server.tool(
    'push_content',
    'Push content to a virtual display. Types: text, markdown, html, url (renders a URL in an iframe), image (renders an image from a URL), list (JSON array), dashboard (JSON array of {title, value, subtitle?})',
    {
      device: z.string().describe('Device ID or name'),
      type: z.enum(['text', 'markdown', 'html', 'url', 'image', 'list', 'dashboard']).describe('Content type'),
      body: z.string().describe('Content body. For url/image types, provide the URL. For list/dashboard types, provide a JSON string.'),
    },
    async ({ device, type, body }) => {
      const slug = device.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      const result = await client.pushContent(namespace, slug, type, body);
      return { content: [{ type: 'text', text: `Content pushed to "${device}" (${type}) at ${result.updatedAt}` }] };
    }
  );

  server.tool(
    'clear_device',
    'Clear the content of a virtual display',
    { name: z.string().describe('Device ID or name') },
    async ({ name }) => {
      const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      await client.clearDevice(namespace, slug);
      return { content: [{ type: 'text', text: `Display "${name}" cleared.` }] };
    }
  );
}

module.exports = { registerTools };
