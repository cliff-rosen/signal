const express = require('express');
const store = require('./store');

function createRouter(broadcast, broadcastGlobal) {
  const router = express.Router({ mergeParams: true });

  const fs = require('fs');
  const path = require('path');
  const LOG_FILE = path.join(__dirname, '..', 'botbeam.log');

  // Log all API calls
  router.use((req, res, next) => {
    const msg = `[API] ${req.method} /s/${req.namespace}/api${req.path}`;
    fs.appendFileSync(LOG_FILE, `${new Date().toISOString()} ${msg}\n`);
    console.log(msg);
    next();
  });

  // List devices
  router.get('/devices', async (req, res) => {
    res.json(await store.loadDevices(req.namespace));
  });

  // Create device
  router.post('/devices', async (req, res) => {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: 'name is required' });
    const { exists, device } = await store.createDevice(req.namespace, name);
    if (!exists) broadcastGlobal(req.namespace, { event: 'device_created', device });
    res.status(exists ? 200 : 201).json(device);
  });

  // Delete device
  router.delete('/devices/:id', async (req, res) => {
    const ok = await store.deleteDevice(req.namespace, req.params.id);
    if (!ok) return res.status(404).json({ error: 'Device not found' });
    broadcast(req.namespace, req.params.id, { event: 'clear' });
    broadcastGlobal(req.namespace, { event: 'device_deleted', deviceId: req.params.id });
    res.status(204).end();
  });

  // Get content
  router.get('/devices/:id/content', async (req, res) => {
    const content = await store.loadContent(req.namespace, req.params.id);
    if (!content) return res.status(404).json({ error: 'No content' });
    res.json(content);
  });

  // Push content (auto-creates device if it doesn't exist)
  router.post('/devices/:id/content', async (req, res) => {
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
  });

  // Clear content
  router.delete('/devices/:id/content', async (req, res) => {
    await store.deleteContent(req.namespace, req.params.id);
    broadcast(req.namespace, req.params.id, { event: 'clear' });
    broadcastGlobal(req.namespace, { event: 'content_cleared', deviceId: req.params.id });
    res.status(204).end();
  });

  // Proxy external URLs (bypasses X-Frame-Options)
  router.get('/proxy', async (req, res) => {
    const url = req.query.url;
    if (!url) return res.status(400).json({ error: 'url parameter required' });

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

  return router;
}

module.exports = { createRouter };
