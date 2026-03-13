const { z } = require('zod');

function registerTools(server, namespace, client) {
  server.tool(
    'list_devices',
    'List all virtual display tabs. Returns each device\'s id and name.',
    {},
    async () => {
      const devices = await client.listDevices(namespace);
      return { content: [{ type: 'text', text: JSON.stringify(devices, null, 2) }] };
    }
  );

  server.tool(
    'create_device',
    'Create a new virtual display tab. If a tab with this exact name already exists, returns the existing tab instead.',
    { name: z.string().describe('Display name for the tab (e.g. "Overview", "Cheat Sheet")') },
    async ({ name }) => {
      const device = await client.createDevice(namespace, name);
      return { content: [{ type: 'text', text: JSON.stringify(device, null, 2) }] };
    }
  );

  server.tool(
    'push_content',
    'Push content to an existing virtual display tab. Types: text, markdown, html, url (renders a URL in an iframe), image (renders an image from a URL), list (JSON array), dashboard (JSON array of {title, value, subtitle?})',
    {
      device: z.string().describe('Device ID (as returned by list_devices or create_device)'),
      type: z.enum(['text', 'markdown', 'html', 'url', 'image', 'list', 'dashboard']).describe('Content type'),
      body: z.string().describe('Content body. For url/image types, provide the URL. For list/dashboard types, provide a JSON string.'),
    },
    async ({ device, type, body }) => {
      const result = await client.pushContent(namespace, device, type, body);
      return { content: [{ type: 'text', text: `Content pushed to "${device}" (${type}) at ${result.updatedAt}` }] };
    }
  );

  server.tool(
    'delete_device',
    'Remove a virtual display tab and its content',
    { device: z.string().describe('Device ID (as returned by list_devices or create_device)') },
    async ({ device }) => {
      await client.deleteDevice(namespace, device);
      return { content: [{ type: 'text', text: `Tab "${device}" deleted.` }] };
    }
  );

  server.tool(
    'clear_device',
    'Clear the content of a virtual display tab without deleting it',
    { device: z.string().describe('Device ID (as returned by list_devices or create_device)') },
    async ({ device }) => {
      await client.clearDevice(namespace, device);
      return { content: [{ type: 'text', text: `Display "${device}" cleared.` }] };
    }
  );
}

module.exports = { registerTools };
