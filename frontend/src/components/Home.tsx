import { useState } from 'react';
import { useBotBeam } from '../context/BotBeamContext';
import { settings } from '../config/settings';
import SetupInstructions from './SetupInstructions';
import DeviceCard from './DeviceCard';

export default function Home() {
  const { namespace, devices, switchTab } = useBotBeam();
  const [bookmarkDismissed, setBookmarkDismissed] = useState(
    () => !!localStorage.getItem(`botbeam-bookmark-${namespace}`)
  );
  const [copied, setCopied] = useState(false);

  const mcpUrl = `${settings.apiUrl}/s/${namespace}/mcp`;

  function dismissBookmark() {
    localStorage.setItem(`botbeam-bookmark-${namespace}`, '1');
    setBookmarkDismissed(true);
  }

  function copyEndpoint() {
    navigator.clipboard.writeText(mcpUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div className="main home-view">
      <div className="home-content">
        {/* Bookmark banner */}
        {!bookmarkDismissed && (
          <div className="bookmark-banner">
            <div className="bookmark-icon">&#x1f516;</div>
            <div className="bookmark-text">
              <strong>Bookmark this page!</strong> This URL is your BotBeam — it's how you get back to your displays. There's no login, so if you lose this link, you lose access.
            </div>
            <button className="btn btn-ghost bookmark-dismiss" onClick={dismissBookmark}>Got it</button>
          </div>
        )}

        {/* MCP endpoint */}
        <div className="endpoint-banner">
          <div className="endpoint-label">Your MCP Endpoint</div>
          <div className="endpoint-row">
            <code className="endpoint-url">{mcpUrl}</code>
            <button className="btn btn-primary btn-copy" onClick={copyEndpoint}>
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>
        </div>

        {/* Setup instructions */}
        <SetupInstructions mcpUrl={mcpUrl} />

        {/* Device grid */}
        {devices.length > 0 && (
          <div className="device-grid">
            {devices.map(d => (
              <DeviceCard
                key={d.id}
                device={d}
                onClick={() => switchTab(d.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
