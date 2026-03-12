import { get, post, del } from './api';
import type { Device, Content } from '../types';

function base(namespace: string) {
  return `/s/${namespace}/api`;
}

// Namespaces

export function createNamespace() {
  return post<{ id: string; url: string }>('/api/namespaces');
}

// Devices

export function getDevices(namespace: string) {
  return get<Device[]>(`${base(namespace)}/devices`);
}

export function createDevice(namespace: string, name: string) {
  return post<Device>(`${base(namespace)}/devices`, { name });
}

export function deleteDevice(namespace: string, id: string) {
  return del(`${base(namespace)}/devices/${id}`);
}

// Content

export async function getContent(namespace: string, deviceId: string): Promise<Content | null> {
  try {
    return await get<Content>(`${base(namespace)}/devices/${deviceId}/content`);
  } catch {
    return null;
  }
}

// Utilities

export function proxyUrl(namespace: string, url: string) {
  return `${base(namespace)}/proxy?url=${encodeURIComponent(url)}`;
}
