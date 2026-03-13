import { get, post, patch, del } from './index';
import { settings } from '../../config/settings';
import type { Device } from '../../types';

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

  async updateDevice(namespace: string, id: string, updates: { name?: string; content?: { type: string; body: string } | null }) {
    return patch<Device>(`${base(namespace)}/devices/${id}`, updates);
  },

  async deleteDevice(namespace: string, id: string) {
    return del(`${base(namespace)}/devices/${id}`);
  },

  async resetDevices(namespace: string) {
    return del(`${base(namespace)}/devices`);
  },

  // Utilities

  proxyUrl(namespace: string, url: string) {
    return `${settings.apiUrl}${base(namespace)}/proxy?url=${encodeURIComponent(url)}`;
  },
};
