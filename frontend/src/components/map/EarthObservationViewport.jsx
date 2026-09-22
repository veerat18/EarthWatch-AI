import React from 'react';
import { RadarIcon, SatelliteIcon } from '../common/Icons';

export function EarthObservationViewport({ onConfigureFeed }) {
  return (
    <section className="ew-panel ew-viewport-panel" aria-label="Earth Observation Viewport">
      {/* Viewport Header Bar */}
      <div className="ew-panel-header">
        <div className="ew-panel-title-wrap">
          <RadarIcon size={16} className="ew-panel-icon" />
          <h2 className="ew-panel-title">EARTH OBSERVATION</h2>
          <span className="ew-panel-tag">PRIMARY SENSOR VIEWPORT</span>
        </div>
        <div className="ew-viewport-hud-coords">
          <span className="ew-hud-item">CRS: EPSG:4326</span>
          <span className="ew-hud-sep">|</span>
          <span className="ew-hud-item">SENSOR: STANDBY</span>
          <span className="ew-hud-sep">|</span>
          <span className="ew-hud-item">ORBIT: 786 KM (LEO)</span>
        </div>
      </div>

      {/* Main Viewport Screen */}
      <div className="ew-viewport-screen" tabIndex={0} role="region" aria-label="Satellite Imagery Awaiting Source Display">
        {/* Corner Telemetry Bracket Accents */}
        <div className="ew-corner-bracket ew-cb-tl" aria-hidden="true" />
        <div className="ew-corner-bracket ew-cb-tr" aria-hidden="true" />
        <div className="ew-corner-bracket ew-cb-bl" aria-hidden="true" />
        <div className="ew-corner-bracket ew-cb-br" aria-hidden="true" />

        {/* High-Tech World Grid & Lat/Lon Coordinate Map Visualization */}
        <svg 
          className="ew-world-grid-svg" 
          viewBox="0 0 1000 500" 
          preserveAspectRatio="xMidYMid slice"
          aria-hidden="true"
        >
          <defs>
            {/* Grid pattern */}
            <pattern id="geoGridPattern" width="50" height="50" patternUnits="userSpaceOnUse">
              <path d="M 50 0 L 0 0 0 50" fill="none" stroke="rgba(56, 189, 248, 0.08)" strokeWidth="0.75" />
              <circle cx="0" cy="0" r="1" fill="rgba(56, 189, 248, 0.3)" />
            </pattern>
            {/* Radial glow around center */}
            <radialGradient id="centerGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="rgba(56, 189, 248, 0.12)" />
              <stop offset="100%" stopColor="rgba(6, 9, 14, 0)" />
            </radialGradient>
          </defs>

          {/* Grid Background */}
          <rect width="1000" height="500" fill="url(#geoGridPattern)" />
          <rect width="1000" height="500" fill="url(#centerGlow)" />

          {/* Latitude Lines (Parallels) */}
          <line x1="0" y1="83" x2="1000" y2="83" stroke="rgba(56, 189, 248, 0.15)" strokeWidth="0.8" strokeDasharray="3 4" />
          <line x1="0" y1="166" x2="1000" y2="166" stroke="rgba(56, 189, 248, 0.18)" strokeWidth="0.8" strokeDasharray="6 6" />
          <line x1="0" y1="250" x2="1000" y2="250" stroke="rgba(56, 189, 248, 0.35)" strokeWidth="1.2" /> {/* Equator */}
          <line x1="0" y1="333" x2="1000" y2="333" stroke="rgba(56, 189, 248, 0.18)" strokeWidth="0.8" strokeDasharray="6 6" />
          <line x1="0" y1="416" x2="1000" y2="416" stroke="rgba(56, 189, 248, 0.15)" strokeWidth="0.8" strokeDasharray="3 4" />

          {/* Longitude Lines (Meridians) */}
          <line x1="166" y1="0" x2="166" y2="500" stroke="rgba(56, 189, 248, 0.15)" strokeWidth="0.8" strokeDasharray="3 4" />
          <line x1="333" y1="0" x2="333" y2="500" stroke="rgba(56, 189, 248, 0.18)" strokeWidth="0.8" strokeDasharray="6 6" />
          <line x1="500" y1="0" x2="500" y2="500" stroke="rgba(56, 189, 248, 0.35)" strokeWidth="1.2" /> {/* Prime Meridian */}
          <line x1="666" y1="0" x2="666" y2="500" stroke="rgba(56, 189, 248, 0.18)" strokeWidth="0.8" strokeDasharray="6 6" />
          <line x1="833" y1="0" x2="833" y2="500" stroke="rgba(56, 189, 248, 0.15)" strokeWidth="0.8" strokeDasharray="3 4" />

          {/* Coordinate Notation Text on Axis */}
          <text x="510" y="24" fill="rgba(148, 163, 184, 0.5)" fontSize="9" fontFamily="monospace">00° 00' E (PRIME MERIDIAN)</text>
          <text x="10" y="246" fill="rgba(148, 163, 184, 0.5)" fontSize="9" fontFamily="monospace">00° 00' N (EQUATOR)</text>
          <text x="10" y="80" fill="rgba(148, 163, 184, 0.35)" fontSize="8" fontFamily="monospace">+60° N</text>
          <text x="10" y="413" fill="rgba(148, 163, 184, 0.35)" fontSize="8" fontFamily="monospace">-60° S</text>
          <text x="840" y="490" fill="rgba(148, 163, 184, 0.35)" fontSize="8" fontFamily="monospace">+120° E</text>
          <text x="175" y="490" fill="rgba(148, 163, 184, 0.35)" fontSize="8" fontFamily="monospace">-120° W</text>

          {/* Subtle Abstract Continental Wireframe Contours (Technical Geometry) */}
          <path
            d="M 180 120 L 220 110 L 270 140 L 260 200 L 210 220 L 170 180 Z"
            fill="none"
            stroke="rgba(56, 189, 248, 0.16)"
            strokeWidth="1"
            strokeDasharray="2 3"
          />
          <path
            d="M 280 260 L 320 270 L 330 360 L 300 420 L 270 340 Z"
            fill="none"
            stroke="rgba(56, 189, 248, 0.16)"
            strokeWidth="1"
            strokeDasharray="2 3"
          />
          <path
            d="M 480 120 L 530 110 L 560 160 L 520 210 L 470 180 Z"
            fill="none"
            stroke="rgba(56, 189, 248, 0.16)"
            strokeWidth="1"
            strokeDasharray="2 3"
          />
          <path
            d="M 490 230 L 560 230 L 580 340 L 530 400 L 480 320 Z"
            fill="none"
            stroke="rgba(56, 189, 248, 0.16)"
            strokeWidth="1"
            strokeDasharray="2 3"
          />
          <path
            d="M 620 110 L 780 100 L 820 180 L 740 220 L 680 180 Z"
            fill="none"
            stroke="rgba(56, 189, 248, 0.16)"
            strokeWidth="1"
            strokeDasharray="2 3"
          />
          <path
            d="M 750 320 L 830 310 L 840 380 L 780 400 Z"
            fill="none"
            stroke="rgba(56, 189, 248, 0.16)"
            strokeWidth="1"
            strokeDasharray="2 3"
          />

          {/* Central Target Reticle */}
          <circle cx="500" cy="250" r="60" fill="none" stroke="rgba(56, 189, 248, 0.25)" strokeWidth="1" />
          <circle cx="500" cy="250" r="110" fill="none" stroke="rgba(56, 189, 248, 0.12)" strokeWidth="0.75" strokeDasharray="4 6" />
          <line x1="500" y1="180" x2="500" y2="320" stroke="rgba(56, 189, 248, 0.3)" strokeWidth="1" />
          <line x1="430" y1="250" x2="570" y2="250" stroke="rgba(56, 189, 248, 0.3)" strokeWidth="1" />
        </svg>

        {/* Animated Scanning Line */}
        <div className="ew-viewport-scanline" aria-hidden="true" />

        {/* Elegant "Satellite imagery connection pending" Message Box */}
        <div className="ew-viewport-pending-overlay">
          <div className="ew-pending-card">
            <div className="ew-pending-icon-wrap" aria-hidden="true">
              <SatelliteIcon size={28} className="ew-pending-icon" />
              <div className="ew-scanning-indicator" />
            </div>

            <div className="ew-pending-text-group">
              <div className="ew-pending-title-lead">SATELLITE IMAGERY</div>
              <div className="ew-pending-title-sub">AWAITING SOURCE</div>
              <p className="ew-pending-desc">
                Connect imagery source to begin analysis.
              </p>
            </div>

            <div className="ew-pending-footer">
              <span className="ew-pending-status-chip">
                <span className="ew-pending-pulse" /> ENGINE READY FOR INGESTION
              </span>
              {onConfigureFeed && (
                <button
                  type="button"
                  className="ew-viewport-action-btn"
                  onClick={onConfigureFeed}
                >
                  SELECT SOURCE IN PIPELINE
                </button>
              )}
            </div>
          </div>
        </div>

        {/* HUD Bottom Info Bar */}
        <div className="ew-viewport-hud-footer">
          <div className="ew-hud-footer-item">
            <span className="ew-hud-label">FOV:</span>
            <span className="ew-hud-value">GLOBAL SYNOPTIC</span>
          </div>
          <div className="ew-hud-footer-item">
            <span className="ew-hud-label">RASTER PIPELINE:</span>
            <span className="ew-hud-value">UNBOUND</span>
          </div>
          <div className="ew-hud-footer-item">
            <span className="ew-hud-label">GEO-REGISTER:</span>
            <span className="ew-hud-value">IDLE (0 TILES)</span>
          </div>
        </div>
      </div>
    </section>
  );
}
