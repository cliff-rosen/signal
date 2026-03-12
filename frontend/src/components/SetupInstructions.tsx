import { useState } from 'react';

type SetupTab = 'chatgpt' | 'claude' | 'claude-code';

export default function SetupInstructions({ mcpUrl }: { mcpUrl: string }) {
  const [tab, setTab] = useState<SetupTab>('chatgpt');
  const [copied, setCopied] = useState(false);

  const claudeCodeCommand = `claude mcp add botbeam --transport http ${mcpUrl}`;

  function copy(text: string) {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div className="setup-instructions">
      <div className="setup-heading">Connect your AI</div>
      <p className="setup-intro">
        Copy the MCP endpoint above, then add it as a connector in ChatGPT or Claude.
        Once connected, just tell your AI what to show and which tab to put it in — it handles the rest.
      </p>

      <div className="setup-tabs">
        <button className={`setup-tab ${tab === 'chatgpt' ? 'active' : ''}`} onClick={() => setTab('chatgpt')}>ChatGPT</button>
        <button className={`setup-tab ${tab === 'claude' ? 'active' : ''}`} onClick={() => setTab('claude')}>Claude</button>
        <button className={`setup-tab ${tab === 'claude-code' ? 'active' : ''}`} onClick={() => setTab('claude-code')}>Claude Code</button>
      </div>

      {tab === 'chatgpt' && (
        <div className="setup-panel">
          <ol className="setup-steps">
            <li>Open <a href="https://chatgpt.com" target="_blank" rel="noreferrer">chatgpt.com</a> and go to <strong>Settings</strong></li>
            <li>Navigate to <strong>Apps</strong>, then click <strong>Advanced Settings</strong></li>
            <li>Click <strong>"Create App"</strong></li>
            <li>Set the name to <strong>BotBeam</strong></li>
            <li>For <strong>MCP Server</strong>, paste your MCP endpoint URL from above</li>
            <li>For authentication, select <strong>"No Auth"</strong></li>
            <li>Save, then start a new chat. ChatGPT can now push content to your tabs!</li>
          </ol>
          <div className="setup-note">
            No authentication is needed — your namespace URL is your access key. Each namespace is isolated and URLs are unguessable.
          </div>
        </div>
      )}

      {tab === 'claude' && (
        <div className="setup-panel">
          <ol className="setup-steps">
            <li>Open <a href="https://claude.ai" target="_blank" rel="noreferrer">claude.ai</a> and go to <strong>Settings</strong></li>
            <li>Navigate to <strong>Integrations</strong></li>
            <li>Click <strong>"Add integration"</strong> and select <strong>MCP</strong></li>
            <li>Paste your MCP endpoint URL and give it a name (e.g. "BotBeam")</li>
            <li>When asked about authentication, select <strong>"None"</strong></li>
          </ol>
          <div className="setup-note">
            No authentication is needed — your namespace URL is your access key. Each namespace is isolated and URLs are unguessable.
          </div>
        </div>
      )}

      {tab === 'claude-code' && (
        <div className="setup-panel">
          <ol className="setup-steps">
            <li>Run this command in your terminal:</li>
          </ol>

          <pre className="setup-codeblock"><code>{claudeCodeCommand}</code></pre>
          <button className="btn btn-primary btn-copy btn-copy-config" onClick={() => copy(claudeCodeCommand)}>
            {copied ? 'Copied!' : 'Copy command'}
          </button>

          <ol className="setup-steps" start={2}>
            <li>Restart Claude Code to pick up the new MCP server.</li>
          </ol>
          <div className="setup-note">
            Claude Code connects directly to your BotBeam endpoint over HTTP — no local install needed.
          </div>
        </div>
      )}

      <div className="setup-try">
        <div className="setup-try-heading">Try it out</div>
        <p>Once connected, just paste one of these into your AI chat:</p>
        <div className="setup-prompts">
          <div className="setup-prompt-example">
            "Teach me about Docker. Start by botbeaming me a roadmap of topics, then walk me through each one — send a cheat sheet each time."
          </div>
          <div className="setup-prompt-example">
            "I'm prepping for a product manager interview. Give me a list of common question categories, then quiz me on each one and botbeam me the key points after."
          </div>
          <div className="setup-prompt-example">
            "Compare AWS, GCP, and Azure for a small startup. Botbeam me a tab for each with pricing, strengths, and gotchas."
          </div>
        </div>
        <p className="setup-try-hint">
          Tabs are created automatically as your AI needs them. As you keep talking, new tabs appear — by the end you have a full reference you can keep open.
        </p>
      </div>
    </div>
  );
}
