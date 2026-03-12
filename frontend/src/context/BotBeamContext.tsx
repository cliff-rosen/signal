import { createContext, useContext, useState, useEffect, useCallback, useRef, type ReactNode } from 'react';
import type { Device, WSEvent } from '../types';
import { fetchDevices as apiFetchDevices, deleteDevice as apiDeleteDevice } from '../lib/api';

interface BotBeamState {
  namespace: string;
  devices: Device[];
  activeTab: string;
  switchTab: (id: string) => void;
  removeDevice: (id: string) => void;
  refreshDevices: () => Promise<void>;
}

const BotBeamContext = createContext<BotBeamState | null>(null);

export function useBotBeam() {
  const ctx = useContext(BotBeamContext);
  if (!ctx) throw new Error('useBotBeam must be used within BotBeamProvider');
  return ctx;
}

interface Props {
  namespace: string;
  children: ReactNode;
}

export function BotBeamProvider({ namespace, children }: Props) {
  const [devices, setDevices] = useState<Device[]>([]);
  const [activeTab, setActiveTab] = useState('home');
  const wsRef = useRef<WebSocket | null>(null);

  const refreshDevices = useCallback(async () => {
    const list = await apiFetchDevices(namespace);
    setDevices(list);
  }, [namespace]);

  const switchTab = useCallback((id: string) => {
    setActiveTab(id);
  }, []);

  const removeDevice = useCallback(async (id: string) => {
    // Optimistic update
    setDevices(prev => prev.filter(d => d.id !== id));
    setActiveTab(prev => prev === id ? 'home' : prev);
    await apiDeleteDevice(namespace, id);
  }, [namespace]);

  // Load devices on mount
  useEffect(() => {
    refreshDevices();
  }, [refreshDevices]);

  // Global WebSocket
  useEffect(() => {
    let reconnectTimer: ReturnType<typeof setTimeout>;
    let ws: WebSocket;

    function connect() {
      const proto = location.protocol === 'https:' ? 'wss' : 'ws';
      ws = new WebSocket(`${proto}://${location.host}/ws?namespace=${namespace}&device=_global`);
      wsRef.current = ws;

      ws.onmessage = (e) => {
        const msg: WSEvent = JSON.parse(e.data);

        if (msg.event === 'device_created') {
          // Refetch devices, don't force-switch tabs
          apiFetchDevices(namespace).then(setDevices);
        } else if (msg.event === 'device_deleted') {
          setDevices(prev => prev.filter(d => d.id !== msg.deviceId));
          setActiveTab(prev => prev === msg.deviceId ? 'home' : prev);
        } else if (msg.event === 'content_updated' || msg.event === 'content_cleared') {
          // These are handled by DeviceView's per-device WS or by Home re-rendering
          // We trigger a re-render by bumping devices (shallow copy)
          setDevices(prev => [...prev]);
        }
      };

      ws.onclose = () => {
        reconnectTimer = setTimeout(connect, 2000);
      };
    }

    connect();

    return () => {
      clearTimeout(reconnectTimer);
      if (ws) ws.close();
    };
  }, [namespace]);

  return (
    <BotBeamContext.Provider value={{ namespace, devices, activeTab, switchTab, removeDevice, refreshDevices }}>
      {children}
    </BotBeamContext.Provider>
  );
}
