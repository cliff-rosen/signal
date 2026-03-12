import type { Device, Content } from '../types';

export function apiBase(namespace: string) {
  return `/s/${namespace}/api`;
}

export async function fetchDevices(namespace: string): Promise<Device[]> {
  const res = await fetch(`${apiBase(namespace)}/devices`);
  return res.json();
}

export async function createDevice(namespace: string, name: string): Promise<Device> {
  const res = await fetch(`${apiBase(namespace)}/devices`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  });
  return res.json();
}

export async function deleteDevice(namespace: string, id: string): Promise<void> {
  await fetch(`${apiBase(namespace)}/devices/${id}`, { method: 'DELETE' });
}

export async function fetchContent(namespace: string, deviceId: string): Promise<Content | null> {
  const res = await fetch(`${apiBase(namespace)}/devices/${deviceId}/content`);
  if (!res.ok) return null;
  return res.json();
}

export function proxyUrl(namespace: string, url: string): string {
  return `${apiBase(namespace)}/proxy?url=${encodeURIComponent(url)}`;
}
