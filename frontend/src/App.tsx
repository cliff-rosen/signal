import { BotBeamProvider, useBotBeam } from './context/BotBeamContext';
import TabBar from './components/TabBar';
import Home from './components/Home';
import DeviceView from './components/DeviceView';
import Landing from './components/Landing';
import DebugPanel from './components/DebugPanel';

function AppContent() {
  const { namespace, activeTab } = useBotBeam();

  if (!namespace) return <Landing />;

  return (
    <div className="app">
      <TabBar />
      {activeTab === 'home' ? <Home /> : <DeviceView key={activeTab} deviceId={activeTab} />}
      <DebugPanel />
    </div>
  );
}

export default function App() {
  return (
    <BotBeamProvider>
      <AppContent />
    </BotBeamProvider>
  );
}
