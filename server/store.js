const { getPool } = require('./db');
const { nanoid } = require('nanoid');

function slugify(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

// ── Namespaces ──

async function createNamespace(ip) {
  const db = getPool();
  const id = nanoid(8);
  await db.query('INSERT INTO namespaces (id, ip_address) VALUES (?, ?)', [id, ip || null]);
  return id;
}

async function getNamespace(id) {
  const db = getPool();
  const [rows] = await db.query('SELECT * FROM namespaces WHERE id = ?', [id]);
  return rows[0] || null;
}

async function touchNamespace(id) {
  const db = getPool();
  await db.query('UPDATE namespaces SET last_active = NOW() WHERE id = ?', [id]);
}

// ── Devices ──

async function loadDevices(namespace) {
  const db = getPool();
  const [rows] = await db.query(
    'SELECT id, name, created_at as createdAt FROM devices WHERE namespace = ? ORDER BY created_at',
    [namespace]
  );
  return rows;
}

async function createDevice(namespace, name) {
  const db = getPool();
  const id = slugify(name);
  const [existing] = await db.query(
    'SELECT id, name, created_at as createdAt FROM devices WHERE namespace = ? AND id = ?',
    [namespace, id]
  );
  if (existing.length > 0) {
    return { exists: true, device: existing[0] };
  }
  await db.query(
    'INSERT INTO devices (id, namespace, name) VALUES (?, ?, ?)',
    [id, namespace, name]
  );
  const [rows] = await db.query(
    'SELECT id, name, created_at as createdAt FROM devices WHERE namespace = ? AND id = ?',
    [namespace, id]
  );
  return { exists: false, device: rows[0] };
}

async function deleteDevice(namespace, id) {
  const db = getPool();
  const [result] = await db.query(
    'DELETE FROM devices WHERE namespace = ? AND id = ?',
    [namespace, id]
  );
  return result.affectedRows > 0;
}

// ── Content ──

async function loadContent(namespace, deviceId) {
  const db = getPool();
  const [rows] = await db.query(
    'SELECT type, body, updated_at as updatedAt FROM content WHERE namespace = ? AND device_id = ?',
    [namespace, deviceId]
  );
  return rows[0] || null;
}

async function saveContent(namespace, deviceId, { type, body }) {
  const db = getPool();
  await db.query(
    `INSERT INTO content (namespace, device_id, type, body) VALUES (?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE type = VALUES(type), body = VALUES(body), updated_at = NOW()`,
    [namespace, deviceId, type, body]
  );
  const [rows] = await db.query(
    'SELECT type, body, updated_at as updatedAt FROM content WHERE namespace = ? AND device_id = ?',
    [namespace, deviceId]
  );
  return rows[0];
}

async function deleteContent(namespace, deviceId) {
  const db = getPool();
  const [result] = await db.query(
    'DELETE FROM content WHERE namespace = ? AND device_id = ?',
    [namespace, deviceId]
  );
  return result.affectedRows > 0;
}

module.exports = {
  createNamespace, getNamespace, touchNamespace,
  loadDevices, createDevice, deleteDevice,
  loadContent, saveContent, deleteContent,
  slugify,
};
