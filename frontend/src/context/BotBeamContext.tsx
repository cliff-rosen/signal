import { createContext, useContext, useState, useEffect, useCallback, useRef, type ReactNode } from 'react';
import type { Device, Content, WSEvent } from '../types';
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
  contentMap: Record<string, Content | null>;
  wsLog: LogEntry[];
  showDebug: boolean;

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
  const [contentMap, setContentMap] = useState<Record<string, Content | null>>({});
  const [wsLog, setWsLog] = useState<LogEntry[]>([]);
  const [showDebug, setShowDebug] = useState(false);
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

  // --- Load devices + content when namespace is set ---

  useEffect(() => {
    if (!namespace) return;
    const ns = namespace;
    let cancelled = false;
    botbeamApi.getDevices(ns).then(async list => {
      if (cancelled) return;
      setDevices(list);
      const entries = await Promise.all(
        list.map(async d => [d.id, await botbeamApi.getContent(ns, d.id)] as const)
      );
      if (!cancelled) {
        setContentMap(Object.fromEntries(entries));
      }
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
        const time = new Date().toLocaleTimeString();

        if (msg.event === 'device_created') {
          setDevices(prev => [...prev, msg.device]);
          setActiveTab(msg.device.id);
          setWsLog(prev => [...prev, { time, event: msg.event, detail: msg.device.name }]);
        } else if (msg.event === 'device_deleted') {
          setDevices(prev => prev.filter(d => d.id !== msg.deviceId));
          setContentMap(prev => { const next = { ...prev }; delete next[msg.deviceId]; return next; });
          setActiveTab(prev => prev === msg.deviceId ? 'home' : prev);
          setWsLog(prev => [...prev, { time, event: msg.event, detail: msg.deviceId }]);
        } else if (msg.event === 'content_updated') {
          setContentMap(prev => ({ ...prev, [msg.deviceId]: msg.data }));
          setWsLog(prev => [...prev, { time, event: msg.event, detail: `${msg.deviceId} (${msg.data.type})` }]);
        } else if (msg.event === 'content_cleared') {
          setContentMap(prev => ({ ...prev, [msg.deviceId]: null }));
          setWsLog(prev => [...prev, { time, event: msg.event, detail: msg.deviceId }]);
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
    contentMap,
    wsLog,
    showDebug,
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
