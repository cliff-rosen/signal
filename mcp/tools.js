const { z } = require('zod');

function registerTools(server, namespace, client) {
  server.tool(
    'list_devices',
    'List all virtual display tabs. Returns each device\'s id, name, and current content.',
    {},
    async () => {
      const devices = await client.listDevices(namespace);
      return { content: [{ type: 'text', text: JSON.stringify(devices, null, 2) }] };
    }
  );

  server.tool(
    'create_device',
    'Create a new virtual display tab, optionally with initial content.',
    {
      name: z.string().describe('Display name for the tab (e.g. "Overview", "Cheat Sheet")'),
      type: z.enum(['text', 'markdown', 'html', 'url', 'image', 'list', 'dashboard', 'table']).optional().describe('Content type (optional)'),
      body: z.string().optional().describe('Content body (optional). For url/image: the URL. For list: JSON array of strings or {text, checked?}. For dashboard: JSON array of {title, value, subtitle?}. For table: JSON {columns: [{id, label}], rows: [{colId: value, ...}]}.'),
    },
    async ({ name, type, body }) => {
      const content = type && body ? { type, body } : null;
      const device = await client.createDevice(namespace, name, content);
      return { content: [{ type: 'text', text: JSON.stringify(device, null, 2) }] };
    }
  );

  server.tool(
    'update_device',
    'Update a virtual display tab. Can change the name, push new content, or clear content by setting content_type to "clear". Content types: text, markdown, html, url (renders in iframe), image (renders from URL), list (JSON array of strings or {text, checked?}), dashboard (JSON array of {title, value, subtitle?}), table (JSON object: {columns: [{id, label}], rows: [{col_id: value}]})',
    {
      device: z.string().describe('Device ID (as returned by list_devices or create_device)'),
      name: z.string().optional().describe('New display name for the tab'),
      content_type: z.enum(['text', 'markdown', 'html', 'url', 'image', 'list', 'dashboard', 'table', 'clear']).optional().describe('Content type, or "clear" to remove content'),
      body: z.string().optional().describe('Content body (required unless content_type is "clear"). For url/image: the URL string. For list: JSON array of strings or {text, checked?}. For dashboard: JSON array of {title, value, subtitle?}. For table: JSON {columns: [{id, label}], rows: [{colId: value, ...}]}.'),
    },
    async ({ device, name, content_type, body }) => {
      const updates = {};
      if (name) updates.name = name;
      if (content_type === 'clear') {
        updates.content = null;
      } else if (content_type && body) {
        updates.content = { type: content_type, body };
      }
      const result = await client.updateDevice(namespace, device, updates);
      const action = content_type === 'clear' ? 'cleared' : content_type ? `updated (${content_type})` : 'renamed';
      return { content: [{ type: 'text', text: `Device "${result.name}" ${action}` }] };
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
    'reset_devices',
    'Delete all virtual display tabs and their content',
    {},
    async () => {
      await client.resetDevices(namespace);
      return { content: [{ type: 'text', text: 'All devices cleared.' }] };
    }
  );
}

module.exports = { registerTools };
