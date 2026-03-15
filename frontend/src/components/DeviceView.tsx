import { useBotBeam } from '../context/BotBeamContext';
import ContentRenderer from './ContentRenderer';
import { TYPE_META, contentDetail } from '../lib/contentMeta';

interface Props {
  deviceId: string;
}

export default function DeviceView({ deviceId }: Props) {
  const { devices } = useBotBeam();
  const device = devices.find(d => d.id === deviceId);
  const content = device?.content ?? null;

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

  const meta = TYPE_META[content.type];
  const detail = contentDetail(content);
  const isDropbox = !!device?.pickupMode;
  const pickups = device?.pickups ?? [];
  const isPickedUp = isDropbox && device?.pickupMode === 'single' && pickups.length > 0;

  return (
    <div className="main display-view">
      <div className="device-info-bar">
        <span className="type-badge" style={{ borderColor: meta.color, color: meta.color }}>
          {meta.label}
        </span>
        {detail && <span className="meta-detail">{detail}</span>}
        {isDropbox && (
          <span className={`dropbox-badge ${isPickedUp ? 'picked-up' : ''}`}>
            {isPickedUp ? 'picked up' : device?.pickupMode === 'single' ? 'dropbox' : 'dropbox (multi)'}
          </span>
        )}
        {isDropbox && (
          <span className="meta-detail device-id-copy" title="Click to copy device ID" onClick={() => navigator.clipboard.writeText(device!.id)}>
            ID: {device!.id}
          </span>
        )}
      </div>
      {pickups.length > 0 && (
        <div className="pickup-history">
          {pickups.map((p, i) => (
            <div key={i} className="pickup-entry">
              Picked up by <strong>{p.pickedUpBy}</strong> at {new Date(p.pickedUpAt).toLocaleString()}
            </div>
          ))}
        </div>
      )}
      <ContentRenderer content={content} />
    </div>
  );
}
