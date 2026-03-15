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

  const mcpUrl = `${settings.publicUrl}/s/${namespace}/mcp`;
  const displayDevices = devices.filter(d => !d.pickupMode);
  const hasDevices = devices.length > 0;

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

        {/* Device grid — top when devices exist */}
        {displayDevices.length > 0 && (
          <div className="device-grid">
            {displayDevices.map(d => (
              <DeviceCard
                key={d.id}
                device={d}
                onClick={() => switchTab(d.id)}
              />
            ))}
          </div>
        )}

        {/* MCP endpoint — compact when devices exist */}
        {hasDevices ? (
          <div className="endpoint-compact">
            <span className="endpoint-compact-label">MCP</span>
            <code className="endpoint-compact-url">{mcpUrl}</code>
            <button className="btn btn-ghost endpoint-compact-copy" onClick={copyEndpoint}>
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>
        ) : (
          <div className="endpoint-banner">
            <div className="endpoint-label">Your MCP Endpoint</div>
            <div className="endpoint-row">
              <code className="endpoint-url">{mcpUrl}</code>
              <button className="btn btn-primary btn-copy" onClick={copyEndpoint}>
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
          </div>
        )}

        {/* Setup instructions — collapsed when devices exist */}
        <SetupInstructions mcpUrl={mcpUrl} defaultCollapsed={hasDevices} />
      </div>
    </div>
  );
}
