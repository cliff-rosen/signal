import { get, post, del } from './index';
import type { Device, Content } from '../../types';

function base(namespace: string) {
  return `/s/${namespace}/api`;
}

export const botbeamApi = {
  // Namespaces

  async createNamespace() {
    return post<{ id: string; url: string }>('/api/namespaces');
  },

  // Devices

  async getDevices(namespace: string) {
    return get<Device[]>(`${base(namespace)}/devices`);
  },

  async createDevice(namespace: string, name: string) {
    return post<Device>(`${base(namespace)}/devices`, { name });
  },

  async deleteDevice(namespace: string, id: string) {
    return del(`${base(namespace)}/devices/${id}`);
  },

  // Content

  async getContent(namespace: string, deviceId: string): Promise<Content | null> {
    try {
      return await get<Content>(`${base(namespace)}/devices/${deviceId}/content`);
    } catch {
      return null;
    }
  },

  // Utilities

  proxyUrl(namespace: string, url: string) {
    return `${base(namespace)}/proxy?url=${encodeURIComponent(url)}`;
  },
};
