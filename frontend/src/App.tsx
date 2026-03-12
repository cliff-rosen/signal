import { BotBeamProvider, useBotBeam } from './context/BotBeamContext';
import TabBar from './components/TabBar';
import Home from './components/Home';
import DeviceView from './components/DeviceView';
import Landing from './components/Landing';

function AppContent() {
  const { namespace, activeTab } = useBotBeam();

  console.log('Current namespace:', namespace);

  if (!namespace) return <Landing />;

  return (
    <div className="app">
      <TabBar />
      {activeTab === 'home' ? <Home /> : <DeviceView key={activeTab} deviceId={activeTab} />}
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
