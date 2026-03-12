import { createContext, useContext, useState, useEffect, useCallback, useRef, type ReactNode } from 'react';
import type { Device, Content, WSEvent } from '../types';
import { botbeamApi } from '../lib/api/botbeamApi';
import { settings } from '../config/settings';

interface BotBeamContextType {
  namespace: string | null;
  devices: Device[];
  activeTab: string;

  getStarted: () => Promise<void>;
  switchTab: (id: string) => void;
  addDevice: (name: string) => Promise<void>;
  removeDevice: (id: string) => Promise<void>;
  refreshDevices: () => Promise<void>;
  getContent: (deviceId: string) => Promise<Content | null>;
  proxyUrl: (url: string) => string;
}

const BotBeamContext = createContext<BotBeamContextType | undefined>(undefined);

// eslint-disable-next-line react-refresh/only-export-components
export function useBotBeam() {
  const context = useContext(BotBeamContext);
  if (!context) throw new Error('useBotBeam must be used within a BotBeamProvider');
  return context;
}

export function BotBeamProvider({ children }: { children: ReactNode }) {
  const match = window.location.pathname.match(/^\/s\/([^/]+)/);
  const [namespace, setNamespace] = useState<string | null>(match?.[1] ?? null);
  const [devices, setDevices] = useState<Device[]>([]);
  const [activeTab, setActiveTab] = useState('home');
  const wsRef = useRef<WebSocket | null>(null);

  // --- Actions ---

  const getStarted = useCallback(async () => {
    const { id, url } = await botbeamApi.createNamespace();
    window.history.pushState(null, '', url);
    setNamespace(id);
  }, []);

  const refreshDevices = useCallback(async () => {
    if (!namespace) return;
    setDevices(await botbeamApi.getDevices(namespace));
  }, [namespace]);

  const switchTab = useCallback((id: string) => {
    setActiveTab(id);
  }, []);

  const addDevice = useCallback(async (name: string) => {
    if (!namespace) return;
    const device = await botbeamApi.createDevice(namespace, name);
    setDevices(await botbeamApi.getDevices(namespace));
    setActiveTab(device.id);
  }, [namespace]);

  const removeDevice = useCallback(async (id: string) => {
    if (!namespace) return;
    setDevices(prev => prev.filter(d => d.id !== id));
    setActiveTab(prev => prev === id ? 'home' : prev);
    await botbeamApi.deleteDevice(namespace, id);
  }, [namespace]);

  const getContent = useCallback(async (deviceId: string) => {
    if (!namespace) return null;
    return botbeamApi.getContent(namespace, deviceId);
  }, [namespace]);

  const proxyUrl = useCallback((url: string) => {
    if (!namespace) return url;
    return botbeamApi.proxyUrl(namespace, url);
  }, [namespace]);

  // --- Load devices when namespace is set ---

  useEffect(() => {
    if (!namespace) return;
    let cancelled = false;
    botbeamApi.getDevices(namespace).then(list => {
      if (!cancelled) setDevices(list);
    });
    return () => { cancelled = true; };
  }, [namespace]);

  // --- Global WebSocket ---

  useEffect(() => {
    if (!namespace) return;
    const ns = namespace;

    let reconnectTimer: ReturnType<typeof setTimeout>;
    let ws: WebSocket;

    function connect() {
      ws = new WebSocket(`${settings.wsUrl}/ws?namespace=${ns}&device=_global`);
      wsRef.current = ws;

      ws.onmessage = (e) => {
        const msg: WSEvent = JSON.parse(e.data);

        if (msg.event === 'device_created') {
          botbeamApi.getDevices(ns).then(setDevices);
        } else if (msg.event === 'device_deleted') {
          setDevices(prev => prev.filter(d => d.id !== msg.deviceId));
          setActiveTab(prev => prev === msg.deviceId ? 'home' : prev);
        } else if (msg.event === 'content_updated' || msg.event === 'content_cleared') {
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

  // --- Provider ---

  const value: BotBeamContextType = {
    namespace,
    devices,
    activeTab,
    getStarted,
    switchTab,
    addDevice,
    removeDevice,
    refreshDevices,
    getContent,
    proxyUrl,
  };

  return (
    <BotBeamContext.Provider value={value}>
      {children}
    </BotBeamContext.Provider>
  );
}
