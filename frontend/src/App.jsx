import React, { useState } from 'react';
import { AppLayout } from './components/layout/AppLayout';
import { Dashboard } from './pages/Dashboard';
import { ReportsPage } from './pages/ReportsPage';
import { AnalyzeImageryPage } from './pages/AnalyzeImageryPage';
import { ChangeDetectionPage } from './pages/ChangeDetectionPage';
import { EnvironmentalPage } from './pages/EnvironmentalPage';
import { DisasterMonitorPage } from './pages/DisasterMonitorPage';
import { SettingsPage } from './pages/SettingsPage';
import './App.css';

function App() {
  const [activeModule, setActiveModule] = useState('Overview');
  const [stacStatus, setStacStatus] = useState('STANDBY'); // 'STANDBY', 'CONNECTED', 'OFFLINE'

  const [environmentalData, setEnvironmentalData] = useState({
    beforeScene: null,
    afterScene: null,
    ndviData: null,
    ndwiData: null
  });

  const handleEnvironmentalUpdate = (before, after, type, data) => {
    setEnvironmentalData(prev => {
      // Clear data if scenes changed
      const isNewPair = prev.beforeScene?.scene_id !== before?.scene_id || prev.afterScene?.scene_id !== after?.scene_id;
      if (isNewPair) {
        return {
          beforeScene: before,
          afterScene: after,
          ndviData: type === 'ndvi' ? data : null,
          ndwiData: type === 'ndwi' ? data : null,
        };
      }
      return {
        ...prev,
        [type === 'ndvi' ? 'ndviData' : 'ndwiData']: data
      };
    });
  };

  return (
    <AppLayout activeModule={activeModule} onSelectModule={setActiveModule} stacStatus={stacStatus}>
      {activeModule === 'Overview' ? (
        <Dashboard />
      ) : activeModule === 'Analyze Imagery' ? (
        <AnalyzeImageryPage onStacUpdate={setStacStatus} />
      ) : activeModule === 'Change Detection' ? (
        <ChangeDetectionPage onStacUpdate={setStacStatus} onAnalysisSuccess={handleEnvironmentalUpdate} />
      ) : activeModule === 'Environmental' ? (
        <EnvironmentalPage data={environmentalData} onNavigate={setActiveModule} />
      ) : activeModule === 'Disaster Monitor' ? (
        <DisasterMonitorPage data={environmentalData} onNavigate={setActiveModule} />
      ) : activeModule === 'Reports' ? (
        <ReportsPage data={environmentalData} onNavigate={setActiveModule} />
      ) : activeModule === 'Settings' ? (
        <SettingsPage stacStatus={stacStatus} />
      ) : null}
    </AppLayout>
  );
}

export default App;
