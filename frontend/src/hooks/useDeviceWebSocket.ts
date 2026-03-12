import { useEffect, useRef, useState } from 'react';
import type { Content, WSEvent } from '../types';
import { useBotBeam } from '../context/BotBeamContext';
import { settings } from '../config/settings';

/**
 * Manages a per-device WebSocket connection.
 * Returns the current content (from REST fetch + live WS updates).
 * Automatically connects on mount and disconnects on unmount.
 */
export function useDeviceWebSocket(deviceId: string) {
  const { namespace, getContent } = useBotBeam();
  const [content, setContent] = useState<Content | null>(null);
  const [loading, setLoading] = useState(true);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (!namespace) return;

    let cancelled = false;
    let reconnectTimer: ReturnType<typeof setTimeout>;
    let reconnectDelay = 1000;

    // Fetch current content via context
    getContent(deviceId).then(data => {
      if (!cancelled) {
        setContent(data);
        setLoading(false);
      }
    });

    // Open WebSocket for live updates
    function connect() {
      const ws = new WebSocket(`${settings.wsUrl}/ws?namespace=${namespace}&device=${deviceId}`);
      wsRef.current = ws;

      ws.onopen = () => { reconnectDelay = 1000; };

      ws.onmessage = (e) => {
        const msg: WSEvent = JSON.parse(e.data);
        if (msg.event === 'content') {
          setContent(msg.data);
          setLoading(false);
        } else if (msg.event === 'clear') {
          setContent(null);
        }
      };

      ws.onclose = () => {
        if (!cancelled) {
          reconnectTimer = setTimeout(() => {
            reconnectDelay = Math.min(reconnectDelay * 2, 10000);
            if (!cancelled) connect();
          }, reconnectDelay);
        }
      };
    }

    connect();

    return () => {
      cancelled = true;
      clearTimeout(reconnectTimer);
      if (wsRef.current) wsRef.current.close();
    };
  }, [namespace, deviceId, getContent]);

  return { content, loading };
}
