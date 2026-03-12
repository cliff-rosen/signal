import { useBotBeam } from '../context/BotBeamContext';

export default function Landing() {
  const { getStarted } = useBotBeam();

  return (
    <div className="landing-page">
      <div className="landing-hero">
        <h1>BotBeam</h1>
        <p className="tagline">Give your AI a screen.</p>
        <p className="description">
          Everything your AI produces is trapped in the chat window — buried in a scroll.
          BotBeam gives it browser tabs it can push to in real time, so your conversation
          builds a live workspace as you go. Works with ChatGPT, Claude, and Claude Code via MCP.
        </p>
        <button className="btn btn-primary btn-large" onClick={getStarted}>Get Started</button>
      </div>

      <div className="landing-example-conversation">
        <div className="example-convo-label">Example: learning Kubernetes</div>
        <div className="example-convo">
          <div className="convo-bubble user">
            "I want to learn Kubernetes. Start with an overview of the key topics and botbeam it to me."
          </div>
          <div className="convo-bubble ai">
            Done — I've created a <strong>topics</strong> tab with your roadmap: Pods, Services,
            Deployments, ConfigMaps, Ingress, and Helm. Pick one and we'll dive in.
          </div>
          <div className="convo-bubble user">"Let's start with Pods."</div>
          <div className="convo-bubble ai">
            I've pushed a <strong>pods</strong> cheat sheet to a new tab — covers lifecycle,
            multi-container patterns, and the key kubectl commands. Ready for the next one?
          </div>
        </div>
        <div className="example-more">
          <div className="example-more-label">
            Each topic becomes a tab. By the end you have a complete, personalized reference.
          </div>
          <div className="example-prompt-pill">
            "Walk me through our Q2 financials — botbeam each section as we go"
          </div>
          <div className="example-prompt-pill">
            "Help me prep for my system design interview — botbeam me a cheat sheet for each topic"
          </div>
          <div className="example-prompt-pill">
            "Research these 5 vendors and botbeam me a summary for each one"
          </div>
        </div>
      </div>

      <div className="landing-how-it-works">
        <h2 className="how-heading">How it works</h2>
        <div className="steps-row">
          <div className="step">
            <div className="step-number">1</div>
            <div className="step-title">Get your URL</div>
            <div className="step-desc">
              Click "Get Started" — you'll get a unique BotBeam link. Bookmark it. No account needed.
            </div>
          </div>
          <div className="step-arrow">&#x2192;</div>
          <div className="step">
            <div className="step-number">2</div>
            <div className="step-title">Connect your AI</div>
            <div className="step-desc">
              Copy the MCP endpoint from your dashboard and add it as a connector in ChatGPT or Claude.
            </div>
          </div>
          <div className="step-arrow">&#x2192;</div>
          <div className="step">
            <div className="step-number">3</div>
            <div className="step-title">Just talk</div>
            <div className="step-desc">
              As you discuss topics, your AI pushes cheat sheets, summaries, and visuals to tabs
              in real time. Your conversation becomes a live workspace.
            </div>
          </div>
        </div>
      </div>

      <button className="btn btn-primary btn-large" onClick={getStarted}>Get Started</button>
    </div>
  );
}
