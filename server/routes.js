const express = require('express');
const store = require('./store');

function createRouter(broadcast, broadcastGlobal) {
  const router = express.Router({ mergeParams: true });

  // Log all API calls
  router.use((req, res, next) => {
    console.log(`[API] ${req.method} /s/${req.namespace}/api${req.path}`);
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

  // Push content
  router.post('/devices/:id/content', async (req, res) => {
    const devices = await store.loadDevices(req.namespace);
    const device = devices.find(d => d.id === req.params.id);
    if (!device) return res.status(404).json({ error: 'Device not found' });

    const { type, body } = req.body;
    if (!type || body === undefined) {
      return res.status(400).json({ error: 'type and body are required' });
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

  return router;
}

module.exports = { createRouter };
