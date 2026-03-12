import { BotBeamProvider, useBotBeam } from './context/BotBeamContext';
import TabBar from './components/TabBar';
import Home from './components/Home';
import DeviceView from './components/DeviceView';

function AppContent() {
  const { activeTab } = useBotBeam();

  return (
    <div className="app">
      <TabBar />
      {activeTab === 'home' ? <Home /> : <DeviceView key={activeTab} deviceId={activeTab} />}
    </div>
  );
}

export default function App() {
  // Extract namespace from URL: /s/a7f3x9k2
  const namespace = window.location.pathname.split('/')[2];

  if (!namespace) {
    return <div>Invalid URL — no namespace found.</div>;
  }

  return (
    <BotBeamProvider namespace={namespace}>
      <AppContent />
    </BotBeamProvider>
  );
}
