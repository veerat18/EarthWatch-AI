import React from 'react';

export function StatCard({ label, value = '--', subtext, icon: Icon, status = 'standby' }) {
  return (
    <div className="ew-stat-card" role="region" aria-label={`Metric: ${label}`}>
      <div className="ew-stat-header">
        <span className="ew-stat-label">{label}</span>
        {Icon && (
          <span className="ew-stat-icon-wrap" aria-hidden="true">
            <Icon size={16} />
          </span>
        )}
      </div>

      <div className="ew-stat-body">
        <span className="ew-stat-value" aria-label={`Current value: ${value}`}>{value}</span>
        <span className={`ew-stat-status-dot ew-status-${status}`} aria-hidden="true" />
      </div>

      {subtext && (
        <div className="ew-stat-footer">
          <span className="ew-stat-subtext">{subtext}</span>
        </div>
      )}
    </div>
  );
}
