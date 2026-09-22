import React, { useState } from 'react';
import { AppLayout } from './components/layout/AppLayout';
import { Dashboard } from './pages/Dashboard';
import './App.css';

function App() {
  const [activeModule, setActiveModule] = useState('Overview');

  return (
    <AppLayout activeModule={activeModule} onSelectModule={setActiveModule}>
      {activeModule === 'Overview' ? (
        <Dashboard />
      ) : (
        <div className="ew-placeholder-module" role="region" aria-label={`${activeModule} Module State`}>
          <div className="ew-placeholder-card">
            <span className="ew-placeholder-badge">MODULE IN DESIGN</span>
            <h2>{activeModule}</h2>
            <p>
              This command capability is scheduled for upcoming phases following Earth Observation imagery ingestion.
            </p>
            <button
              type="button"
              className="ew-btn ew-btn-secondary"
              onClick={() => setActiveModule('Overview')}
            >
              RETURN TO OVERVIEW
            </button>
          </div>
        </div>
      )}
    </AppLayout>
  );
}

export default App;
