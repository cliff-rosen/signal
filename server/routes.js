const express = require('express');
const store = require('./store');
const { logAPI, getIP } = require('./log');

// Wrap async route handlers so thrown errors become 500 responses
const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

function createRouter(broadcast, broadcastGlobal) {
  const router = express.Router({ mergeParams: true });

  // Log write API calls (skip GETs — those are just browser fetches)
  router.use((req, res, next) => {
    if (req.method === 'POST' || req.method === 'DELETE') {
      const action = `${req.method} ${req.path}`;
      logAPI(req.namespace, action, {
        device: req.params.id,
        contentType: req.body?.type,
        body: req.body && Object.keys(req.body).length > 0 ? req.body : null,
        ip: getIP(req),
      });
    }
    next();
  });

  // List devices
  router.get('/devices', asyncHandler(async (req, res) => {
    res.json(await store.loadDevices(req.namespace));
  }));

  // Create device
  router.post('/devices', asyncHandler(async (req, res) => {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: 'name is required' });
    const { exists, device } = await store.createDevice(req.namespace, name);
    if (!exists) broadcastGlobal(req.namespace, { event: 'device_created', device });
    res.status(exists ? 200 : 201).json(device);
  }));

  // Delete device
  router.delete('/devices/:id', asyncHandler(async (req, res) => {
    const ok = await store.deleteDevice(req.namespace, req.params.id);
    if (!ok) return res.status(404).json({ error: 'Device not found' });
    broadcast(req.namespace, req.params.id, { event: 'clear' });
    broadcastGlobal(req.namespace, { event: 'device_deleted', deviceId: req.params.id });
    res.status(204).end();
  }));

  // Get content
  router.get('/devices/:id/content', asyncHandler(async (req, res) => {
    const content = await store.loadContent(req.namespace, req.params.id);
    if (!content) return res.status(404).json({ error: 'No content' });
    res.json(content);
  }));

  // Push content (auto-creates device if it doesn't exist)
  router.post('/devices/:id/content', asyncHandler(async (req, res) => {
    const { type, body } = req.body;
    if (!type || body === undefined) {
      return res.status(400).json({ error: 'type and body are required' });
    }

    const devices = await store.loadDevices(req.namespace);
    const device = devices.find(d => d.id === req.params.id);
    if (!device) {
      const { device: created } = await store.createDevice(req.namespace, req.params.id);
      broadcastGlobal(req.namespace, { event: 'device_created', device: created });
    }

    const content = await store.saveContent(req.namespace, req.params.id, { type, body });
    broadcast(req.namespace, req.params.id, { event: 'content', data: content });
    broadcastGlobal(req.namespace, { event: 'content_updated', deviceId: req.params.id, data: content });
    res.json(content);
  }));

  // Clear content
  router.delete('/devices/:id/content', asyncHandler(async (req, res) => {
    await store.deleteContent(req.namespace, req.params.id);
    broadcast(req.namespace, req.params.id, { event: 'clear' });
    broadcastGlobal(req.namespace, { event: 'content_cleared', deviceId: req.params.id });
    res.status(204).end();
  }));

  // Proxy external URLs (bypasses X-Frame-Options)
  router.get('/proxy', async (req, res) => {
    const url = req.query.url;
    if (!url) return res.status(400).json({ error: 'url parameter required' });

    // SSRF protection: block internal/private URLs
    try {
      const parsed = new URL(url);
      const hostname = parsed.hostname;
      if (
        parsed.protocol !== 'http:' && parsed.protocol !== 'https:' ||
        hostname === 'localhost' ||
        hostname === '127.0.0.1' ||
        hostname === '0.0.0.0' ||
        hostname === '::1' ||
        hostname === '[::1]' ||
        hostname.endsWith('.local') ||
        hostname.endsWith('.internal') ||
        hostname.startsWith('10.') ||
        hostname.startsWith('192.168.') ||
        /^172\.(1[6-9]|2\d|3[01])\./.test(hostname) ||
        hostname === '169.254.169.254' ||
        hostname.startsWith('169.254.')
      ) {
        return res.status(403).json({ error: 'Blocked: cannot proxy internal or private URLs' });
      }
    } catch {
      return res.status(400).json({ error: 'Invalid URL' });
    }

    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        },
        redirect: 'follow',
      });

      const contentType = response.headers.get('content-type') || 'text/html';
      const html = await response.text();

      // Strip scripts to prevent frame-busting, auth redirects, and browser hangs
      let cleaned = html.replace(/<script[\s\S]*?<\/script>/gi, '');

      // Inject a <base> tag so relative URLs resolve against the original site's origin
      const origin = new URL(url).origin;
      const baseTag = `<base href="${origin}/">`;
      const patched = cleaned.replace(/<head([^>]*)>/i, `<head$1>${baseTag}`);

      res.setHeader('Content-Type', contentType);
      res.send(patched);
    } catch (err) {
      res.status(502).json({ error: `Failed to fetch: ${err.message}` });
    }
  });

  // Error handler for async route failures
  router.use((err, req, res, next) => {
    console.error(`[API] Error: ${err.message}`);
    res.status(500).json({ error: 'Internal server error' });
  });

  return router;
}

module.exports = { createRouter };
