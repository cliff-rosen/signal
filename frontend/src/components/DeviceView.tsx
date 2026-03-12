import { useBotBeam } from '../context/BotBeamContext';
import ContentRenderer from './ContentRenderer';

interface Props {
  deviceId: string;
}

export default function DeviceView({ deviceId }: Props) {
  const { devices, contentMap } = useBotBeam();
  const device = devices.find(d => d.id === deviceId);
  const content = contentMap[deviceId] ?? null;

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
      <ContentRenderer content={content} />
    </div>
  );
}
