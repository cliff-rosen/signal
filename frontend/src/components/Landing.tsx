import { useBotBeam } from '../context/BotBeamContext';

export default function Landing() {
  const { getStarted } = useBotBeam();

  return (
    <div className="landing-page">
      <div className="landing-hero">
        <h1>BotBeam</h1>
        <p className="tagline">Your AI can hand you things now.</p>
        <p className="description">
          Cheat sheets. Dashboards. Reference cards. Tables. Images.
          Instead of scrolling back through chat to find them,
          they appear in tabs — building up as the conversation goes.
        </p>
      </div>

      <div className="landing-example-conversation">
        <div className="example-convo">
          <div className="convo-bubble user">
            "Teach me Kubernetes. Beam me a roadmap, then walk me through each topic — beam a cheat sheet each time."
          </div>
          <div className="convo-bubble ai">
            I've beamed a <strong>Roadmap</strong> to your first tab — eight topics
            from Pods to Helm. Pick one and we'll go deep.
          </div>
          <div className="convo-bubble user">"Pods."</div>
          <div className="convo-bubble ai">
            <strong>Pods</strong> cheat sheet beamed to a new tab — lifecycle, multi-container
            patterns, key kubectl commands. Ready for the next?
          </div>
        </div>
        <div className="example-after">
          Each topic becomes a tab. By the end you have a complete, organized reference — not buried in chat.
        </div>
      </div>

      <button className="btn btn-primary btn-large" onClick={getStarted}>Get Started</button>

      <div className="landing-more-prompts">
        <div className="example-prompt-pill">
          "Compare AWS, GCP, and Azure — beam me a tab for each"
        </div>
        <div className="example-prompt-pill">
          "Walk me through our Q2 numbers — beam each section as we go"
        </div>
        <div className="example-prompt-pill">
          "Help me prep for my system design interview — beam me a cheat sheet for each topic"
        </div>
      </div>

      <div className="landing-how-it-works">
        <h2 className="how-heading">Three steps. No account.</h2>
        <div className="steps-row">
          <div className="step">
            <div className="step-number">1</div>
            <div className="step-title">Get your link</div>
            <div className="step-desc">
              Click Get Started. Bookmark the URL. That's it.
            </div>
          </div>
          <div className="step-arrow">{'\u{2192}'}</div>
          <div className="step">
            <div className="step-number">2</div>
            <div className="step-title">Connect your AI</div>
            <div className="step-desc">
              Add the MCP endpoint to ChatGPT, Claude, or Claude Code.
            </div>
          </div>
          <div className="step-arrow">{'\u{2192}'}</div>
          <div className="step">
            <div className="step-number">3</div>
            <div className="step-title">Say "beam me..."</div>
            <div className="step-desc">
              Tabs appear in real time as you talk. Your conversation builds a workspace.
            </div>
          </div>
        </div>
      </div>

      <div className="landing-cta-bottom">
        <button className="btn btn-primary btn-large" onClick={getStarted}>Get Started</button>
      </div>
    </div>
  );
}
