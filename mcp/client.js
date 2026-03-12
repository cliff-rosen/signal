const { log } = require('./log');

const BASE = process.env.BOTBEAM_SERVER_URL || 'http://localhost:4888';

async function api(method, namespace, path, body) {
  const url = `${BASE}/s/${namespace}/api${path}`;
  log(`${method} ${url}${body ? ' ' + JSON.stringify(body) : ''}`);

  const opts = {
    method,
    headers: { 'Content-Type': 'application/json' },
  };
  if (body) opts.body = JSON.stringify(body);

  const res = await fetch(url, opts);
  log(`${method} ${url} -> ${res.status}`);
  if (res.status === 204) return { ok: true };
  const data = await res.json();
  if (!res.ok) {
    log(`ERROR ${method} ${url}: ${data.error || res.status}`);
    throw new Error(data.error || `HTTP ${res.status}`);
  }
  return data;
}

module.exports = {
  listDevices: (ns) => api('GET', ns, '/devices'),
  deleteDevice: (ns, id) => api('DELETE', ns, `/devices/${id}`),
  pushContent: (ns, deviceId, type, body) => api('POST', ns, `/devices/${deviceId}/content`, { type, body }),
  clearDevice: (ns, id) => api('DELETE', ns, `/devices/${id}/content`),
};
