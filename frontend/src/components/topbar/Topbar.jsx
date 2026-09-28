import React, { useState, useEffect } from 'react';
import { MenuIcon, XIcon, UserIcon } from '../common/Icons';
import { API_ENDPOINTS } from '../../config/api';

export function Topbar({ sidebarOpen, onToggleSidebar, activeModule = 'Overview' }) {
  const [utcTime, setUtcTime] = useState('');
  const [backendHealth, setBackendHealth] = useState({ status: 'checking', project: '' });

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setUtcTime(now.toISOString().replace('T', ' ').substring(0, 19) + ' UTC');
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const checkHealth = async () => {
      try {
        const res = await fetch(API_ENDPOINTS.health);
        if (res.ok) {
          const data = await res.json();
          setBackendHealth({ status: 'online', project: data.project });
        } else {
          setBackendHealth({ status: 'offline', project: '' });
        }
      } catch {
        setBackendHealth({ status: 'offline', project: '' });
      }
    };
    checkHealth();
    const interval = setInterval(checkHealth, 15000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="ew-topbar" role="banner">
      <div className="ew-topbar-left">
        <button
          type="button"
          className="ew-sidebar-toggle-btn"
          onClick={onToggleSidebar}
          aria-label={sidebarOpen ? "Close navigation menu" : "Open navigation menu"}
          aria-expanded={sidebarOpen}
        >
          {sidebarOpen ? <XIcon size={18} /> : <MenuIcon size={18} />}
        </button>

        <div className="ew-topbar-brand-display">
          <span className="ew-brand-text">EARTHWATCH AI</span>
          <span className="ew-topbar-separator" aria-hidden="true">//</span>
          <span className="ew-module-indicator">
            <span className="ew-module-label">MODULE:</span> {activeModule}
          </span>
        </div>
      </div>

      <div className="ew-topbar-right">
        {/* UTC Live Aerospace Telemetry Clock */}
        <div className="ew-telemetry-clock" title="Mission Elapsed / Universal Coordinated Time">
          <span className="ew-clock-prefix">UTC</span>
          <time dateTime={utcTime} className="ew-clock-time">{utcTime || 'SYNCING...'}</time>
        </div>

        {/* Real Backend System Status Indicator */}
        <div 
          className={`ew-system-badge ew-status-${backendHealth.status}`}
          title={backendHealth.status === 'online' ? `Backend API: ${backendHealth.project}` : 'Backend API connection offline'}
        >
          <span className="ew-status-dot" aria-hidden="true" />
          <span className="ew-status-label">
            {backendHealth.status === 'online' ? 'API ONLINE' : 'API STANDBY'}
          </span>
        </div>

        {/* User / Profile Control */}
        <div className="ew-user-profile-control" tabIndex={0} role="button" aria-label="User profile options: Geospatial Operator">
          <div className="ew-avatar-box" aria-hidden="true">
            <UserIcon size={14} />
          </div>
          <div className="ew-user-details">
            <span className="ew-user-name">OPERATOR</span>
            <span className="ew-user-role">GEOINT-ALPHA</span>
          </div>
        </div>
      </div>
    </header>
  );
}
