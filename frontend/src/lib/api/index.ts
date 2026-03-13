import { settings } from '../../config/settings';

export async function get<T>(url: string): Promise<T> {
  const res = await fetch(`${settings.apiUrl}${url}`);
  if (!res.ok) throw new Error(`GET ${url} failed: ${res.status}`);
  return res.json();
}

export async function post<T>(url: string, body?: unknown): Promise<T> {
  const res = await fetch(`${settings.apiUrl}${url}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(`POST ${url} failed: ${res.status}`);
  return res.json();
}

export async function patch<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(`${settings.apiUrl}${url}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`PATCH ${url} failed: ${res.status}`);
  return res.json();
}

export async function del(url: string): Promise<void> {
  const res = await fetch(`${settings.apiUrl}${url}`, { method: 'DELETE' });
  if (!res.ok && res.status !== 404) throw new Error(`DELETE ${url} failed: ${res.status}`);
}
