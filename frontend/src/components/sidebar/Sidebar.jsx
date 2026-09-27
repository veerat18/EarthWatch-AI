import React from 'react';
import {
  GlobeIcon,
  SatelliteIcon,
  LayersIcon,
  ActivityIcon,
  ShieldAlertIcon,
  FileTextIcon,
  SettingsIcon
} from '../common/Icons';

const NAV_ITEMS = [
  { id: 'Overview', label: 'Overview', icon: GlobeIcon, active: true, badge: 'LIVE' },
  { id: 'Analyze Imagery', label: 'Analyze Imagery', icon: SatelliteIcon, active: true, badge: 'LIVE' },
  { id: 'Change Detection', label: 'Change Detection', icon: LayersIcon, active: true, badge: 'LIVE' },
  { id: 'Environmental', label: 'Environmental', icon: ActivityIcon, active: true, badge: 'LIVE' },
  { id: 'Disaster Monitor', label: 'Disaster Monitor', icon: ShieldAlertIcon, active: true, badge: 'LIVE' },
  { id: 'Reports', label: 'Reports', icon: FileTextIcon, active: true, badge: 'LIVE' },
  { id: 'Settings', label: 'Settings', icon: SettingsIcon, active: true, badge: 'CONFIG' }
];

export function Sidebar({ isOpen, onClose, activeModule = 'Overview', onSelectModule, stacStatus = 'STANDBY' }) {
  return (
    <>
      {/* Backdrop for mobile drawer */}
      {isOpen && (
        <div 
          className="ew-sidebar-backdrop" 
          onClick={onClose} 
          aria-hidden="true" 
        />
      )}

      <aside className={`ew-sidebar ${isOpen ? 'ew-sidebar-open' : ''}`} aria-label="Command Center Navigation">
        {/* Sidebar Header Branding */}
        <div className="ew-sidebar-brand">
          <div className="ew-brand-crest" aria-hidden="true">
            <GlobeIcon size={20} className="ew-brand-crest-icon" />
          </div>
          <div className="ew-brand-headings">
            <div className="ew-brand-primary">EARTHWATCH</div>
            <div className="ew-brand-secondary">
              <span className="ew-brand-tag">AI</span>
              <span className="ew-brand-subtext">GEOINT PLATFORM</span>
            </div>
          </div>
        </div>

        {/* Navigation items */}
        <nav className="ew-sidebar-nav" aria-label="Main Navigation">
          <div className="ew-nav-section-title">COMMAND MODULES</div>
          <ul className="ew-nav-list" role="menubar">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isSelected = activeModule === item.id;
              return (
                <li key={item.id} role="none" className="ew-nav-item">
                  <button
                    type="button"
                    role="menuitem"
                    aria-current={isSelected ? 'page' : undefined}
                    className={`ew-nav-link ${isSelected ? 'ew-nav-link-active' : ''}`}
                    onClick={() => {
                      if (onSelectModule) onSelectModule(item.id);
                      if (window.innerWidth < 1024 && onClose) onClose();
                    }}
                  >
                    <span className="ew-nav-icon" aria-hidden="true">
                      <Icon size={16} />
                    </span>
                    <span className="ew-nav-label">{item.label}</span>
                    <span className={`ew-nav-badge ${item.active ? 'ew-badge-live' : 'ew-badge-planned'}`}>
                      {item.badge}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Telemetry metadata & bottom system status */}
        <div className="ew-sidebar-footer">
          <div className="ew-sidebar-meta">
            <div className="ew-meta-row">
              <span className="ew-meta-key">GRID SPEC:</span>
              <span className="ew-meta-val">WGS-84 / UTM</span>
            </div>
            <div className="ew-meta-row">
              <span className="ew-meta-key">STAC ENGINE:</span>
              <span className="ew-meta-val" style={{ color: stacStatus === 'CONNECTED' ? '#4ade80' : 'inherit' }}>{stacStatus}</span>
            </div>
          </div>

          <div className="ew-system-status-indicator" role="status" aria-live="polite">
            <span className="ew-status-pulse-dot" aria-hidden="true"></span>
            <span className="ew-status-text">SYSTEM ONLINE</span>
          </div>
        </div>
      </aside>
    </>
  );
}
