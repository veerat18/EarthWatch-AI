import React from 'react';

export function CapabilityCard({ title, description, icon: Icon, pipelineStage = 'PLANNED' }) {
  return (
    <article className="ew-capability-card" tabIndex={0} aria-labelledby={`cap-${title.replace(/\s+/g, '-').toLowerCase()}`}>
      <div className="ew-cap-header">
        <div className="ew-cap-icon-box" aria-hidden="true">
          {Icon && <Icon size={18} />}
        </div>
        <span className="ew-cap-badge">{pipelineStage}</span>
      </div>

      <div className="ew-cap-content">
        <h3 id={`cap-${title.replace(/\s+/g, '-').toLowerCase()}`} className="ew-cap-title">{title}</h3>
        <p className="ew-cap-desc">{description}</p>
      </div>

      <div className="ew-cap-footer">
        <span className="ew-cap-tag">ARCHITECTURE MODULE</span>
      </div>
    </article>
  );
}
