import React, { useRef } from 'react';
import { StatCard } from '../components/cards/StatCard';
import { CapabilityCard } from '../components/cards/CapabilityCard';
import { EarthObservationViewport } from '../components/map/EarthObservationViewport';
import { AnalysisPanel } from '../components/panels/AnalysisPanel';
import { AIInsightPanel } from '../components/panels/AIInsightPanel';
import { RecentAnalysesPanel } from '../components/panels/RecentAnalysesPanel';
import {
  SatelliteIcon,
  LayersIcon,
  GlobeIcon,
  ActivityIcon,
  ShieldAlertIcon
} from '../components/common/Icons';

export function Dashboard() {
  const analysisPanelRef = useRef(null);

  const handleScrollToConfig = () => {
    if (analysisPanelRef.current) {
      analysisPanelRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
      // Focus on first input for keyboard accessibility
      const input = analysisPanelRef.current.querySelector('input');
      if (input) input.focus();
    }
  };

  return (
    <div className="ew-dashboard-container">
      {/* 1. Statistics Cards Row (4 cards with '--' placeholders) */}
      <section className="ew-stats-grid" aria-label="System Metrics & Telemetry">
        <StatCard
          label="ACTIVE ANALYSES"
          value="--"
          subtext="0 in execution queue"
          icon={ActivityIcon}
          status="standby"
        />
        <StatCard
          label="SATELLITE SOURCES"
          value="--"
          subtext="0 active STAC feeds"
          icon={SatelliteIcon}
          status="standby"
        />
        <StatCard
          label="AREAS MONITORED"
          value="--"
          subtext="0 designated AOIs"
          icon={GlobeIcon}
          status="standby"
        />
        <StatCard
          label="DETECTIONS"
          value="--"
          subtext="Neural inference idle"
          icon={LayersIcon}
          status="standby"
        />
      </section>

      {/* 2. Central Earth Observation Viewport (Hero) */}
      <EarthObservationViewport onConfigureFeed={handleScrollToConfig} />

      {/* 3. Operational Grid: Start Analysis Panel & AI Insight Panel */}
      <div className="ew-dual-panel-grid">
        <AnalysisPanel panelRef={analysisPanelRef} />
        <AIInsightPanel />
      </div>

      {/* 4. Capability Grid (Future Features, clearly marked as capabilities) */}
      <section className="ew-capabilities-section" aria-labelledby="capabilities-heading">
        <div className="ew-section-header">
          <div className="ew-section-title-wrap">
            <LayersIcon size={16} className="ew-section-icon" />
            <h2 id="capabilities-heading" className="ew-section-title">CORE AI & GEOSPATIAL CAPABILITIES</h2>
          </div>
          <span className="ew-section-meta">STAGE ARCHITECTURE</span>
        </div>

        <div className="ew-capabilities-grid">
          <CapabilityCard
            title="CHANGE DETECTION"
            description="Detect structural and environmental changes."
            icon={LayersIcon}
            pipelineStage="PHASE 4"
          />
          <CapabilityCard
            title="VEGETATION ANALYSIS"
            description="Monitor vegetation and land-cover changes."
            icon={ActivityIcon}
            pipelineStage="PHASE 4"
          />
          <CapabilityCard
            title="WATER / FLOOD ANALYSIS"
            description="Identify water extent and potential flood zones."
            icon={GlobeIcon}
            pipelineStage="PHASE 5"
          />
          <CapabilityCard
            title="URBAN EXPANSION"
            description="Analyze changes in built-up areas."
            icon={ShieldAlertIcon}
            pipelineStage="PHASE 5"
          />
        </div>
      </section>

      {/* 5. Recent Analyses (Genuine empty state, no invented data) */}
      <RecentAnalysesPanel />
    </div>
  );
}
