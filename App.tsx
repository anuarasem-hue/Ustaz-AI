import React, { useState } from 'react';
import Layout from './components/Layout';
import { AppView } from './types';
import EfficiencyDashboard from './modules/EfficiencyDashboard';
import KSPGenerator from './modules/KSPGenerator';
import SORSOCHManager from './modules/SORSOCHManager';
import Communicator from './modules/Communicator';

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<AppView>(AppView.DASHBOARD);

  const renderView = () => {
    switch (currentView) {
      case AppView.DASHBOARD:
        return <EfficiencyDashboard />;
      case AppView.KSP:
        return <KSPGenerator />;
      case AppView.SOR_SOCH:
        return <SORSOCHManager />;
      case AppView.COMMUNICATOR:
        return <Communicator />;
      default:
        return <EfficiencyDashboard />;
    }
  };

  return (
    <Layout activeView={currentView} onViewChange={setCurrentView}>
      {renderView()}
    </Layout>
  );
};

export default App;
