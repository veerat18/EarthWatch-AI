import React from 'react';
import { ActivityIcon, RadarIcon } from '../common/Icons';

export function RecentAnalysesPanel() {
  return (
    <section className="ew-panel ew-recent-panel" aria-labelledby="recent-panel-title">
      <div className="ew-panel-header">
        <div className="ew-panel-title-wrap">
          <ActivityIcon size={16} className="ew-panel-icon" />
          <h2 id="recent-panel-title" className="ew-panel-title">RECENT ANALYSES</h2>
        </div>
        <span className="ew-panel-badge">0 RECORDS</span>
      </div>

      <div className="ew-panel-body">
        <div className="ew-empty-state-box" role="status">
          <div className="ew-empty-radar-icon" aria-hidden="true">
            <RadarIcon size={24} />
          </div>

          <div className="ew-empty-state-title">NO ANALYSES YET</div>
          <p className="ew-empty-state-desc">
            Run your first satellite analysis to see results here.
          </p>

          <div className="ew-empty-state-meta">
            <span>HISTORICAL AUDIT LOG: EMPTY</span>
            <span className="ew-sep">•</span>
            <span>STORAGE BUFFER: CLEAN</span>
          </div>
        </div>
      </div>
    </section>
  );
}
