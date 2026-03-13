import { createContext, useContext, useState, useEffect, useCallback, useRef, type ReactNode } from 'react';
import type { Device, WSEvent } from '../types';
import { botbeamApi } from '../lib/api/botbeamApi';
import { settings } from '../config/settings';

interface LogEntry {
  time: string;
  event: string;
  detail: string;
}

interface BotBeamContextType {
  namespace: string | null;
  devices: Device[];
  activeTab: string;
  wsLog: LogEntry[];
  showDebug: boolean;
  connected: boolean;

  getStarted: () => Promise<void>;
  switchTab: (id: string) => void;
  addDevice: (name: string) => Promise<void>;
  removeDevice: (id: string) => Promise<void>;
  toggleDebug: () => void;
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
  const [wsLog, setWsLog] = useState<LogEntry[]>([]);
  const [showDebug, setShowDebug] = useState(false);
  const [connected, setConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);

  // --- Actions ---

  const getStarted = useCallback(async () => {
    const { id, url } = await botbeamApi.createNamespace();
    window.history.pushState(null, '', url);
    setNamespace(id);
  }, []);

  const switchTab = useCallback((id: string) => {
    setActiveTab(id);
  }, []);

  const addDevice = useCallback(async (name: string) => {
    if (!namespace) return;
    await botbeamApi.createDevice(namespace, name);
  }, [namespace]);

  const removeDevice = useCallback(async (id: string) => {
    if (!namespace) return;
    await botbeamApi.deleteDevice(namespace, id);
  }, [namespace]);

  const toggleDebug = useCallback(() => {
    setShowDebug(prev => !prev);
  }, []);

  const proxyUrl = useCallback((url: string) => {
    if (!namespace) return url;
    return botbeamApi.proxyUrl(namespace, url);
  }, [namespace]);

  // --- Fetch full state from API (used on init and after reconnect) ---

  const refreshState = useCallback(async (ns: string) => {
    setDevices(await botbeamApi.getDevices(ns));
  }, []);

  // --- Load devices + content when namespace is set ---

  useEffect(() => {
    if (!namespace) return;
    let cancelled = false;
    refreshState(namespace).catch(() => { if (!cancelled) console.error('Initial state load failed'); });
    return () => { cancelled = true; };
  }, [namespace, refreshState]);

  // --- Global WebSocket ---

  useEffect(() => {
    if (!namespace) return;
    const ns = namespace;

    let reconnectTimer: ReturnType<typeof setTimeout>;
    let cancelled = false;
    let ws: WebSocket;
    let isReconnect = false;

    function connect() {
      if (cancelled) return;
      ws = new WebSocket(`${settings.wsUrl}/ws?namespace=${ns}&device=_global`);
      wsRef.current = ws;

      ws.onopen = () => {
        setConnected(true);
        if (isReconnect) {
          refreshState(ns).catch(() => {});
        }
        isReconnect = true;
      };

      ws.onmessage = (e) => {
        const msg: WSEvent = JSON.parse(e.data);

        switch (msg.event) {
          case 'device_created':
            setDevices(prev => prev.some(d => d.id === msg.device.id)
              ? prev
              : [...prev, msg.device]
            );
            setActiveTab(msg.device.id);
            break;
          case 'device_updated':
            setDevices(prev => prev.map(d =>
              d.id === msg.device.id ? msg.device : d
            ));
            setActiveTab(msg.device.id);
            break;
          case 'device_deleted':
            setDevices(prev => prev.filter(d => d.id !== msg.deviceId));
            setActiveTab(prev => prev === msg.deviceId ? 'home' : prev);
            break;
          case 'devices_reset':
            setDevices([]);
            setActiveTab('home');
            break;
        }

        setWsLog(prev => [...prev, {
          time: new Date().toLocaleTimeString(),
          event: msg.event,
          detail: 'device' in msg ? msg.device.name : 'deviceId' in msg ? msg.deviceId : '',
        }]);
      };

      ws.onclose = () => {
        setConnected(false);
        if (!cancelled) reconnectTimer = setTimeout(connect, 2000);
      };
    }

    connect();

    return () => {
      cancelled = true;
      clearTimeout(reconnectTimer);
      ws.close();
    };
  }, [namespace, refreshState]);

  // --- Provider ---

  const value: BotBeamContextType = {
    namespace,
    devices,
    activeTab,
    wsLog,
    showDebug,
    connected,
    getStarted,
    switchTab,
    addDevice,
    removeDevice,
    toggleDebug,
    proxyUrl,
  };

  return (
    <BotBeamContext.Provider value={value}>
      {children}
    </BotBeamContext.Provider>
  );
}
