import React from 'react';
import { CpuIcon } from '../common/Icons';

export function AIInsightPanel() {
  return (
    <section className="ew-panel ew-ai-panel" aria-labelledby="ai-panel-heading">
      <div className="ew-panel-header">
        <div className="ew-panel-title-wrap">
          <CpuIcon size={16} className="ew-panel-icon" />
          <div className="ew-ai-header-text">
            <span className="ew-ai-brand">EARTHWATCH AI</span>
            <h2 id="ai-panel-heading" className="ew-panel-title">INTELLIGENCE</h2>
          </div>
        </div>
        <span className="ew-panel-badge ew-badge-idle">INFERENCE IDLE</span>
      </div>

      <div className="ew-panel-body ew-ai-panel-body">
        {/* Subtle empty-state animated waveform / neural frequency bar */}
        <div className="ew-ai-waveform-container" aria-hidden="true">
          <div className="ew-waveform-bar" style={{ animationDelay: '0ms' }} />
          <div className="ew-waveform-bar" style={{ animationDelay: '150ms' }} />
          <div className="ew-waveform-bar" style={{ animationDelay: '300ms' }} />
          <div className="ew-waveform-bar" style={{ animationDelay: '450ms' }} />
          <div className="ew-waveform-bar" style={{ animationDelay: '600ms' }} />
          <div className="ew-waveform-bar" style={{ animationDelay: '750ms' }} />
          <div className="ew-waveform-bar" style={{ animationDelay: '900ms' }} />
          <div className="ew-waveform-bar" style={{ animationDelay: '1050ms' }} />
        </div>

        <div className="ew-ai-empty-message-wrap">
          <div className="ew-ai-empty-primary">
            No imagery has been analyzed yet.
          </div>
          <p className="ew-ai-empty-subtext">
            When an observation pipeline completes, automated spatial intelligence, change detection vectors, and confidence metrics will display here.
          </p>
        </div>

        <div className="ew-ai-telemetry-spec">
          <div className="ew-spec-col">
            <span className="ew-spec-label">MODEL WEIGHTS:</span>
            <span className="ew-spec-value">UNLOADED</span>
          </div>
          <div className="ew-spec-col">
            <span className="ew-spec-label">GPU COMPUTE:</span>
            <span className="ew-spec-value">STANDBY</span>
          </div>
          <div className="ew-spec-col">
            <span className="ew-spec-label">PIPELINE:</span>
            <span className="ew-spec-value">SIAMESE / TRANSFORMER</span>
          </div>
        </div>
      </div>
    </section>
  );
}
