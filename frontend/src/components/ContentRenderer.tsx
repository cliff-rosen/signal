import { marked } from 'marked';
import type { Content, DashboardCard, ListItem } from '../types';
import { useBotBeam } from '../context/BotBeamContext';

interface Props {
  content: Content;
}

export default function ContentRenderer({ content }: Props) {
  const { proxyUrl } = useBotBeam();
  switch (content.type) {
    case 'text':
      return <div className="content content-text">{content.body}</div>;

    case 'markdown':
      return (
        <div
          className="content content-markdown"
          dangerouslySetInnerHTML={{ __html: marked.parse(content.body) as string }}
        />
      );

    case 'html':
      return (
        <div className="content">
          <iframe
            className="content-html"
            sandbox="allow-scripts"
            srcDoc={content.body}
          />
        </div>
      );

    case 'url':
      return (
        <div className="content">
          <iframe
            className="content-url"
            src={proxyUrl(content.body)}
            allowFullScreen
          />
        </div>
      );

    case 'image':
      return (
        <div className="content content-image-wrap">
          <img className="content-image" src={content.body} alt="Display" />
        </div>
      );

    case 'list': {
      const items: (string | ListItem)[] = JSON.parse(content.body);
      return (
        <div className="content">
          <ul className="content-list">
            {items.map((item, i) => {
              const isObj = typeof item === 'object';
              const text = isObj ? item.text : item;
              const checked = isObj && item.checked;
              return (
                <li key={i} className={checked ? 'checked' : ''}>
                  <div className="check" />
                  <span>{text}</span>
                </li>
              );
            })}
          </ul>
        </div>
      );
    }

    case 'dashboard': {
      const cards: DashboardCard[] = JSON.parse(content.body);
      return (
        <div className="content">
          <div className="content-dashboard">
            {cards.map((card, i) => (
              <div key={i} className="dash-card">
                <div className="title">{card.title}</div>
                <div className="value">{card.value}</div>
                {card.subtitle && <div className="subtitle">{card.subtitle}</div>}
              </div>
            ))}
          </div>
        </div>
      );
    }

    default:
      return <div className="content content-text">{content.body}</div>;
  }
}
