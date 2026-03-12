const { getPool } = require('./db');
const { nanoid } = require('nanoid');

const MAX_BODY_BYTES = 512 * 1024; // 500KB
const VALID_CONTENT_TYPES = new Set(['url', 'image', 'markdown', 'dashboard', 'list']);

function slugify(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function logError(op, err, context = {}) {
  console.error(`[store] ${op} failed`, { ...context, error: err.message });
}

// ── Namespaces ──

async function createNamespace(ip) {
  const db = getPool();
  const id = nanoid(8);
  try {
    await db.query('INSERT INTO namespaces (id, ip_address) VALUES (?, ?)', [id, ip || null]);
    return id;
  } catch (err) {
    logError('createNamespace', err, { ip });
    throw err;
  }
}

async function getNamespace(id) {
  const db = getPool();
  try {
    const [rows] = await db.query('SELECT * FROM namespaces WHERE id = ?', [id]);
    return rows[0] || null;
  } catch (err) {
    logError('getNamespace', err, { id });
    throw err;
  }
}

async function touchNamespace(id) {
  const db = getPool();
  try {
    await db.query('UPDATE namespaces SET last_active = NOW() WHERE id = ?', [id]);
  } catch (err) {
    logError('touchNamespace', err, { id });
    throw err;
  }
}

// ── Devices ──

async function loadDevices(namespace) {
  const db = getPool();
  try {
    const [rows] = await db.query(
      'SELECT id, name, created_at as createdAt FROM devices WHERE namespace = ? ORDER BY created_at',
      [namespace]
    );
    return rows;
  } catch (err) {
    logError('loadDevices', err, { namespace });
    throw err;
  }
}

async function createDevice(namespace, name) {
  if (!name || typeof name !== 'string') throw new Error('Device name is required');
  if (name.length > 255) throw new Error('Device name too long (max 255 chars)');

  const db = getPool();
  const id = slugify(name);
  if (!id) throw new Error('Device name must contain at least one alphanumeric character');

  try {
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
  } catch (err) {
    logError('createDevice', err, { namespace, name });
    throw err;
  }
}

async function deleteDevice(namespace, id) {
  const db = getPool();
  try {
    const [result] = await db.query(
      'DELETE FROM devices WHERE namespace = ? AND id = ?',
      [namespace, id]
    );
    return result.affectedRows > 0;
  } catch (err) {
    logError('deleteDevice', err, { namespace, id });
    throw err;
  }
}

// ── Content ──

function validateContent(type, body) {
  if (!type || typeof type !== 'string') throw new Error('Content type is required');
  if (!VALID_CONTENT_TYPES.has(type)) {
    throw new Error(`Invalid content type "${type}". Must be one of: ${[...VALID_CONTENT_TYPES].join(', ')}`);
  }
  if (body === undefined || body === null) throw new Error('Content body is required');
  const bodyStr = typeof body === 'string' ? body : JSON.stringify(body);
  if (Buffer.byteLength(bodyStr, 'utf8') > MAX_BODY_BYTES) {
    throw new Error(`Content body too large (max ${MAX_BODY_BYTES / 1024}KB)`);
  }
}

async function loadContent(namespace, deviceId) {
  const db = getPool();
  try {
    const [rows] = await db.query(
      'SELECT type, body, updated_at as updatedAt FROM content WHERE namespace = ? AND device_id = ?',
      [namespace, deviceId]
    );
    return rows[0] || null;
  } catch (err) {
    logError('loadContent', err, { namespace, deviceId });
    throw err;
  }
}

async function saveContent(namespace, deviceId, { type, body }) {
  validateContent(type, body);

  const db = getPool();
  try {
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
  } catch (err) {
    logError('saveContent', err, { namespace, deviceId, type });
    throw err;
  }
}

async function deleteContent(namespace, deviceId) {
  const db = getPool();
  try {
    const [result] = await db.query(
      'DELETE FROM content WHERE namespace = ? AND device_id = ?',
      [namespace, deviceId]
    );
    return result.affectedRows > 0;
  } catch (err) {
    logError('deleteContent', err, { namespace, deviceId });
    throw err;
  }
}

module.exports = {
  createNamespace, getNamespace, touchNamespace,
  loadDevices, createDevice, deleteDevice,
  loadContent, saveContent, deleteContent,
  validateContent, slugify,
  MAX_BODY_BYTES, VALID_CONTENT_TYPES,
};
