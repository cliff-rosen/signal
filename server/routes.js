const express = require('express');
const store = require('./store');

function createRouter(broadcast, broadcastGlobal) {
  const router = express.Router();

  // List devices
  router.get('/devices', (req, res) => {
    res.json(store.loadDevices());
  });

  // Create device
  router.post('/devices', (req, res) => {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: 'name is required' });
    const { exists, device } = store.createDevice(name);
    if (!exists) broadcastGlobal({ event: 'device_created', device });
    res.status(exists ? 200 : 201).json(device);
  });

  // Delete device
  router.delete('/devices/:id', (req, res) => {
    const ok = store.deleteDevice(req.params.id);
    if (!ok) return res.status(404).json({ error: 'Device not found' });
    broadcast(req.params.id, { event: 'clear' });
    broadcastGlobal({ event: 'device_deleted', deviceId: req.params.id });
    res.status(204).end();
  });

  // Get content
  router.get('/devices/:id/content', (req, res) => {
    const content = store.loadContent(req.params.id);
    if (!content) return res.status(404).json({ error: 'No content' });
    res.json(content);
  });

  // Push content
  router.post('/devices/:id/content', (req, res) => {
    const devices = store.loadDevices();
    const device = devices.find(d => d.id === req.params.id);
    if (!device) return res.status(404).json({ error: 'Device not found' });

    const { type, body } = req.body;
    if (!type || body === undefined) {
      return res.status(400).json({ error: 'type and body are required' });
    }

    const content = store.saveContent(req.params.id, { type, body });
    broadcast(req.params.id, { event: 'content', data: content });
    broadcastGlobal({ event: 'content_updated', deviceId: req.params.id, data: content });
    res.json(content);
  });

  // Clear content
  router.delete('/devices/:id/content', (req, res) => {
    store.deleteContent(req.params.id);
    broadcast(req.params.id, { event: 'clear' });
    broadcastGlobal({ event: 'content_cleared', deviceId: req.params.id });
    res.status(204).end();
  });

  return router;
}

module.exports = { createRouter };
