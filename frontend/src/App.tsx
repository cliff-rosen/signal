import { BotBeamProvider, useBotBeam } from './context/BotBeamContext';
import TabBar from './components/TabBar';
import Home from './components/Home';
import DeviceView from './components/DeviceView';
import Landing from './components/Landing';

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
  const match = window.location.pathname.match(/^\/s\/([^/]+)/);
  const namespace = match?.[1];

  if (!namespace) {
    return <Landing />;
  }

  return (
    <BotBeamProvider namespace={namespace}>
      <AppContent />
    </BotBeamProvider>
  );
}
