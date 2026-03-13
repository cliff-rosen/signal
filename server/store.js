const { getPool } = require('./db');
const { nanoid } = require('nanoid');
const { createLogger } = require('./logger');

const log = createLogger('store');
const MAX_BODY_BYTES = 512 * 1024; // 500KB

const VALID_CONTENT_TYPES = new Set(['text', 'html', 'url', 'image', 'markdown', 'dashboard', 'list', 'table']);

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

function rowToDevice(r) {
  return {
    id: r.id,
    name: r.name,
    createdAt: r.createdAt,
    content: r.content_type
      ? { type: r.content_type, body: r.content_body, updatedAt: r.content_updated_at }
      : null,
  };
}

const DEVICE_COLS = `id, name, created_at as createdAt, content_type, content_body, content_updated_at`;

// ── Namespaces ──

async function createNamespace(ip) {
  const db = getPool();
  const id = nanoid(8);
  try {
    await db.query('INSERT INTO namespaces (id, ip_address) VALUES (?, ?)', [id, ip || null]);
    return id;
  } catch (err) {
    log.error('createNamespace failed', { ip, error: err.message });
    throw err;
  }
}

async function getNamespace(id) {
  const db = getPool();
  try {
    const [rows] = await db.query('SELECT * FROM namespaces WHERE id = ?', [id]);
    return rows[0] || null;
  } catch (err) {
    log.error('getNamespace failed', { id, error: err.message });
    throw err;
  }
}

async function touchNamespace(id) {
  const db = getPool();
  try {
    await db.query('UPDATE namespaces SET last_active = NOW() WHERE id = ?', [id]);
  } catch (err) {
    log.error('touchNamespace failed', { id, error: err.message });
    throw err;
  }
}

// ── Devices ──

async function loadDevices(namespace) {
  const db = getPool();
  try {
    const [rows] = await db.query(
      `SELECT ${DEVICE_COLS} FROM devices WHERE namespace = ? ORDER BY created_at`,
      [namespace]
    );
    return rows.map(rowToDevice);
  } catch (err) {
    log.error('loadDevices failed', { namespace, error: err.message });
    throw err;
  }
}

async function createDevice(namespace, name, content) {
  if (!name || typeof name !== 'string') throw new Error('Device name is required');
  if (name.length > 255) throw new Error('Device name too long (max 255 chars)');
  if (content) validateContent(content.type, content.body);

  const db = getPool();
  const id = nanoid(8);

  try {
    if (content) {
      await db.query(
        `INSERT INTO devices (id, namespace, name, content_type, content_body, content_updated_at)
         VALUES (?, ?, ?, ?, ?, NOW())`,
        [id, namespace, name, content.type, content.body]
      );
    } else {
      await db.query(
        'INSERT INTO devices (id, namespace, name) VALUES (?, ?, ?)',
        [id, namespace, name]
      );
    }
    const [rows] = await db.query(
      `SELECT ${DEVICE_COLS} FROM devices WHERE namespace = ? AND id = ?`,
      [namespace, id]
    );
    return rowToDevice(rows[0]);
  } catch (err) {
    log.error('createDevice failed', { namespace, name, error: err.message });
    throw err;
  }
}

async function updateDevice(namespace, id, updates) {
  
  const db = getPool();
  const sets = [];
  const params = [];

  if (updates.name !== undefined) {
    if (!updates.name || typeof updates.name !== 'string') throw new Error('Device name is required');
    if (updates.name.length > 255) throw new Error('Device name too long (max 255 chars)');
    sets.push('name = ?');
    params.push(updates.name);
  }

  if ('content' in updates) {
    if (updates.content === null) {
      sets.push('content_type = NULL, content_body = NULL, content_updated_at = NULL');
    } else {
      validateContent(updates.content.type, updates.content.body);
      sets.push('content_type = ?, content_body = ?, content_updated_at = NOW()');
      params.push(updates.content.type, updates.content.body);
    }
  }

  if (sets.length === 0) throw new Error('Nothing to update');

  params.push(namespace, id);

  try {
    const [result] = await db.query(
      `UPDATE devices SET ${sets.join(', ')} WHERE namespace = ? AND id = ?`,
      params
    );
    if (result.affectedRows === 0) return null;
    const [rows] = await db.query(
      `SELECT ${DEVICE_COLS} FROM devices WHERE namespace = ? AND id = ?`,
      [namespace, id]
    );
    return rowToDevice(rows[0]);
  } catch (err) {
    log.error('updateDevice failed', { namespace, id, error: err.message });
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
    log.error('deleteDevice failed', { namespace, id, error: err.message });
    throw err;
  }
}

async function resetDevices(namespace) {
  const db = getPool();
  try {
    const [result] = await db.query(
      'DELETE FROM devices WHERE namespace = ?',
      [namespace]
    );
    return result.affectedRows;
  } catch (err) {
    log.error('resetDevices failed', { namespace, error: err.message });
    throw err;
  }
}

// ── Admin ──

async function getActiveNamespaces() {
  const db = getPool();
  try {
    const [rows] = await db.query(
      `SELECT namespace, COUNT(*) as count, MAX(created_at) as lastActivity
       FROM api_log GROUP BY namespace ORDER BY lastActivity DESC`
    );
    return rows;
  } catch (err) {
    log.error('getActiveNamespaces failed', { error: err.message });
    throw err;
  }
}

async function getLogsByNamespace(namespace, limit = 100) {
  const db = getPool();
  try {
    const [rows] = await db.query(
      `SELECT action, device, content_type as contentType, ip_address as ip, created_at as createdAt
       FROM api_log WHERE namespace = ? ORDER BY created_at DESC LIMIT ?`,
      [namespace, limit]
    );
    return rows;
  } catch (err) {
    log.error('getLogsByNamespace failed', { namespace, error: err.message });
    throw err;
  }
}

module.exports = {
  createNamespace, getNamespace, touchNamespace,
  loadDevices, createDevice, updateDevice, deleteDevice, resetDevices,
  validateContent,
  getActiveNamespaces, getLogsByNamespace,
  MAX_BODY_BYTES, VALID_CONTENT_TYPES,
};
