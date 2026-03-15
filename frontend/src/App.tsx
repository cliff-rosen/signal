import { BotBeamProvider, useBotBeam } from './context/BotBeamContext';
import TabBar from './components/TabBar';
import Home from './components/Home';
import DeviceView from './components/DeviceView';
import Landing from './components/Landing';
import DebugPanel from './components/DebugPanel';
import DropboxPanel from './components/DropboxPanel';

function AppContent() {
  const { namespace, activeTab } = useBotBeam();

  if (!namespace) return <Landing />;

  return (
    <div className="app">
      <TabBar />
      <div className="app-body">
        {activeTab === 'home' ? <Home /> : <DeviceView key={activeTab} deviceId={activeTab} />}
        <DropboxPanel />
      </div>
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
