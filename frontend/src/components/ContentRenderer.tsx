import { useState, useCallback } from 'react';
import { marked } from 'marked';
import type { Content, DashboardCard, ListItem } from '../types';
import { useBotBeam } from '../context/BotBeamContext';

interface Props {
  content: Content;
}

function UrlEmbed({ url }: { url: string }) {
  const { proxyUrl } = useBotBeam();
  const [failed, setFailed] = useState(false);

  const onLoad = useCallback((e: React.SyntheticEvent<HTMLIFrameElement>) => {
    try {
      // If the proxy returned an error JSON body, the iframe will load but show garbage.
      // We can detect this by checking if the iframe document is accessible and tiny.
      const doc = e.currentTarget.contentDocument;
      if (doc) {
        const text = doc.body?.innerText ?? '';
        if (text.startsWith('{"error"')) {
          setFailed(true);
        }
      }
    } catch {
      // Cross-origin — means the page actually loaded (good)
    }
  }, []);

  if (failed) {
    return (
      <div className="content-url-failed">
        <p>This site couldn't be loaded in the viewer. Some sites block embedding or aren't available through our proxy.</p>
        <a href={url} target="_blank" rel="noopener noreferrer">{url}</a>
      </div>
    );
  }

  return (
    <>
      <div className="content-url-bar">
        <a href={url} target="_blank" rel="noopener noreferrer" title={url}>{url}</a>
      </div>
      <iframe
        className="content-url"
        src={proxyUrl(url)}
        allowFullScreen
        onError={() => setFailed(true)}
        onLoad={onLoad}
      />
    </>
  );
}

function ImageEmbed({ url }: { url: string }) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <div className="content-url-failed">
        <p>This image couldn't be loaded. The source may be unavailable or blocking external access.</p>
        <a href={url} target="_blank" rel="noopener noreferrer">{url}</a>
      </div>
    );
  }

  return <img className="content-image" src={url} alt="Display" onError={() => setFailed(true)} />;
}

export default function ContentRenderer({ content }: Props) {
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
          <UrlEmbed url={content.body} />
        </div>
      );

    case 'image':
      return (
        <div className="content content-image-wrap">
          <ImageEmbed url={content.body} />
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
