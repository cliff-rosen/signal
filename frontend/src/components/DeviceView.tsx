import { useBotBeam } from '../context/BotBeamContext';
import { useDeviceWebSocket } from '../hooks/useDeviceWebSocket';
import ContentRenderer from './ContentRenderer';

interface Props {
  deviceId: string;
}

export default function DeviceView({ deviceId }: Props) {
  const { namespace, devices } = useBotBeam();
  const { content, loading } = useDeviceWebSocket(namespace, deviceId);
  const device = devices.find(d => d.id === deviceId);

  if (loading && !content) {
    return (
      <div className="main display-view">
        <div className="waiting">
          <div className="device-name">{device?.name ?? deviceId}</div>
          <p><span className="pulse" />Waiting for content...</p>
        </div>
      </div>
    );
  }

  if (!content) {
    return (
      <div className="main display-view">
        <div className="waiting">
          <div className="device-name">{device?.name ?? deviceId}</div>
          <p><span className="pulse" />Waiting for content...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="main display-view">
      <ContentRenderer content={content} namespace={namespace} />
    </div>
  );
}
