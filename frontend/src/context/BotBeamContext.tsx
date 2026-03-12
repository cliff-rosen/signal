import { createContext, useContext, useState, useEffect, useCallback, useRef, type ReactNode } from 'react';
import type { Device, Content, WSEvent } from '../types';
import * as botbeam from '../lib/botbeam';

interface BotBeamState {
  namespace: string | null;
  devices: Device[];
  activeTab: string;
  getStarted: () => Promise<void>;
  switchTab: (id: string) => void;
  addDevice: (name: string) => Promise<Device>;
  removeDevice: (id: string) => void;
  refreshDevices: () => Promise<void>;
  getContent: (deviceId: string) => Promise<Content | null>;
  proxyUrl: (url: string) => string;
}

const BotBeamContext = createContext<BotBeamState | null>(null);

export function useBotBeam() {
  const ctx = useContext(BotBeamContext);
  if (!ctx) throw new Error('useBotBeam must be used within BotBeamProvider');
  return ctx;
}

export function BotBeamProvider({ children }: { children: ReactNode }) {
  const match = window.location.pathname.match(/^\/s\/([^/]+)/);
  const [namespace] = useState<string | null>(match?.[1] ?? null);
  const [devices, setDevices] = useState<Device[]>([]);
  const [activeTab, setActiveTab] = useState('home');
  const wsRef = useRef<WebSocket | null>(null);

  const getStarted = useCallback(async () => {
    const { url } = await botbeam.createNamespace();
    window.location.href = url;
  }, []);

  const refreshDevices = useCallback(async () => {
    if (!namespace) return;
    const list = await botbeam.getDevices(namespace);
    setDevices(list);
  }, [namespace]);

  const switchTab = useCallback((id: string) => {
    setActiveTab(id);
  }, []);

  const addDevice = useCallback(async (name: string) => {
    if (!namespace) throw new Error('No namespace');
    const device = await botbeam.createDevice(namespace, name);
    return device;
  }, [namespace]);

  const getContent = useCallback(async (deviceId: string) => {
    if (!namespace) return null;
    return botbeam.getContent(namespace, deviceId);
  }, [namespace]);

  const proxyUrl = useCallback((url: string) => {
    if (!namespace) return url;
    return botbeam.proxyUrl(namespace, url);
  }, [namespace]);

  const removeDevice = useCallback(async (id: string) => {
    if (!namespace) return;
    setDevices(prev => prev.filter(d => d.id !== id));
    setActiveTab(prev => prev === id ? 'home' : prev);
    await botbeam.deleteDevice(namespace, id);
  }, [namespace]);

  // Load devices on mount
  useEffect(() => {
    if (namespace) refreshDevices();
  }, [namespace, refreshDevices]);

  // Global WebSocket
  useEffect(() => {
    if (!namespace) return;

    let reconnectTimer: ReturnType<typeof setTimeout>;
    let ws: WebSocket;

    function connect() {
      const proto = location.protocol === 'https:' ? 'wss' : 'ws';
      ws = new WebSocket(`${proto}://${location.host}/ws?namespace=${namespace}&device=_global`);
      wsRef.current = ws;

      ws.onmessage = (e) => {
        const msg: WSEvent = JSON.parse(e.data);

        if (msg.event === 'device_created') {
          botbeam.getDevices(namespace).then(setDevices);
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

  return (
    <BotBeamContext.Provider value={{ namespace, devices, activeTab, getStarted, switchTab, addDevice, removeDevice, refreshDevices, getContent, proxyUrl }}>
      {children}
    </BotBeamContext.Provider>
  );
}
