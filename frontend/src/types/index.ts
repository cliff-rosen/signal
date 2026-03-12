export interface Device {
  id: string;
  name: string;
  createdAt: string;
}

export type ContentType = 'text' | 'markdown' | 'html' | 'url' | 'image' | 'list' | 'dashboard';

export interface Content {
  type: ContentType;
  body: string;
  updatedAt: string;
}

export interface DashboardCard {
  title: string;
  value: string;
  subtitle?: string;
}

export interface ListItem {
  text: string;
  checked?: boolean;
}

export type WSEvent =
  | { event: 'device_created'; device: Device }
  | { event: 'device_deleted'; deviceId: string }
  | { event: 'content_updated'; deviceId: string; data: Content }
  | { event: 'content_cleared'; deviceId: string }
  | { event: 'content'; data: Content }
  | { event: 'clear' };
