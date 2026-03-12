const BASE = process.env.SIGNAL_SERVER_URL || 'http://localhost:4888';

async function api(method, path, body) {
  const opts = {
    method,
    headers: { 'Content-Type': 'application/json' },
  };
  if (body) opts.body = JSON.stringify(body);

  const res = await fetch(`${BASE}/api${path}`, opts);
  if (res.status === 204) return { ok: true };
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data;
}

module.exports = {
  listDevices: () => api('GET', '/devices'),
  createDevice: (name) => api('POST', '/devices', { name }),
  deleteDevice: (id) => api('DELETE', `/devices/${id}`),
  pushContent: (deviceId, type, body) => api('POST', `/devices/${deviceId}/content`, { type, body }),
  clearDevice: (id) => api('DELETE', `/devices/${id}/content`),
};
