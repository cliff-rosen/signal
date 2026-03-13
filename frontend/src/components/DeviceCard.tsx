import { marked } from 'marked';
import type { Device, Content, DashboardCard, ListItem } from '../types';
import { TYPE_META, contentDetail } from '../lib/contentMeta';

interface Props {
  device: Device;
  onClick: () => void;
}

function escapeHtml(str: string) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function Preview({ content }: { content: Content }) {
  switch (content.type) {
    case 'text':
      return <div className="preview-text">{content.body}</div>;
    case 'markdown':
      return <div className="preview-markdown" dangerouslySetInnerHTML={{ __html: marked.parse(content.body) as string }} />;
    case 'html':
      return <div className="preview-text" style={{ color: 'var(--text-muted)' }}>HTML content</div>;
    case 'url':
      return (
        <div className="preview-url">
          <div className="preview-url-icon">&#x1f310;</div>
          <div className="preview-url-text">{content.body}</div>
        </div>
      );
    case 'image':
      return <img className="preview-image" src={content.body} alt="preview" />;
    case 'list': {
      const items: (string | ListItem)[] = JSON.parse(content.body);
      return (
        <>
          {items.slice(0, 5).map((item, i) => {
            const text = typeof item === 'object' ? item.text : item;
            const checked = typeof item === 'object' && item.checked;
            return (
              <div key={i} className={`preview-list-item ${checked ? 'checked' : ''}`}>
                <div className="check" /><span dangerouslySetInnerHTML={{ __html: escapeHtml(text) }} />
              </div>
            );
          })}
          {items.length > 5 && <div className="preview-more">+{items.length - 5} more</div>}
        </>
      );
    }
    case 'dashboard': {
      const cards: DashboardCard[] = JSON.parse(content.body);
      return (
        <div className="preview-dashboard">
          {cards.slice(0, 4).map((c, i) => (
            <div key={i} className="preview-dash-card">
              <div className="title">{c.title}</div>
              <div className="value">{c.value}</div>
            </div>
          ))}
        </div>
      );
    }
    default:
      return <div className="preview-text">{content.body}</div>;
  }
}

export default function DeviceCard({ device, onClick }: Props) {
  const content = device.content;
  const meta = content ? TYPE_META[content.type] : null;
  const detail = content ? contentDetail(content) : null;

  return (
    <div className="device-card" onClick={onClick}>
      <div className="card-header">
        <div className="name">{device.name}</div>
        {content && meta ? (
          <div className="card-meta">
            <span className="type-badge" style={{ borderColor: meta.color, color: meta.color }}>
              {meta.label}
            </span>
            {detail && <span className="meta-detail">{detail}</span>}
          </div>
        ) : (
          <div className="status">Empty</div>
        )}
      </div>
      <div className="card-preview">
        {content ? (
          <Preview content={content} />
        ) : (
          <div className="preview-empty">
            <span className="pulse" />Waiting for content
          </div>
        )}
      </div>
    </div>
  );
}
