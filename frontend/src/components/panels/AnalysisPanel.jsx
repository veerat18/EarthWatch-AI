import React, { useState } from 'react';
import { SatelliteIcon, MapPinIcon, CalendarIcon, CrosshairIcon } from '../common/Icons';

export function AnalysisPanel({ panelRef }) {
  const [location, setLocation] = useState('');
  const [imagerySource, setImagerySource] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');


  return (
    <section 
      ref={panelRef} 
      className="ew-panel ew-analysis-panel" 
      aria-labelledby="analysis-panel-title"
    >
      <div className="ew-panel-header">
        <div className="ew-panel-title-wrap">
          <CrosshairIcon size={16} className="ew-panel-icon" />
          <h2 id="analysis-panel-title" className="ew-panel-title">START NEW ANALYSIS</h2>
        </div>
        <span className="ew-panel-badge">JOB CONFIGURATION</span>
      </div>

      <div className="ew-panel-body">
        <form className="ew-form-grid" onSubmit={(e) => e.preventDefault()} noValidate>
          {/* Location / AOI Field */}
          <div className="ew-form-group">
            <label htmlFor="aoi-location" className="ew-form-label">
              <MapPinIcon size={13} className="ew-label-icon" />
              <span>Location / AOI</span>
            </label>
            <div className="ew-input-wrapper">
              <input
                id="aoi-location"
                type="text"
                className="ew-input"
                placeholder="Enter bounding box or region (e.g., 37.77,-122.41)"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                autoComplete="off"
              />
            </div>
            <span className="ew-field-hint">Supports WKT, Bounding Box, or GeoJSON coordinates</span>
          </div>

          {/* Imagery Source Field */}
          <div className="ew-form-group">
            <label htmlFor="imagery-source" className="ew-form-label">
              <SatelliteIcon size={13} className="ew-label-icon" />
              <span>Imagery Source</span>
            </label>
            <div className="ew-input-wrapper">
              <select
                id="imagery-source"
                className="ew-select"
                value={imagerySource}
                onChange={(e) => setImagerySource(e.target.value)}
              >
                <option value="">Select Satellite Constellation...</option>
                <option value="sentinel2">Sentinel-2 L2A (10m Optical)</option>
                <option value="landsat">Landsat 8/9 OLI-2 (30m Optical/Thermal)</option>
                <option value="planet">PlanetScope (3m High-Res Commercial)</option>
                <option value="custom-cog">Custom Cloud-Optimized GeoTIFF (COG)</option>
              </select>
            </div>
            <span className="ew-field-hint">STAC metadata catalog connector will query chosen constellation</span>
          </div>

          {/* Temporal Window: Start Date */}
          <div className="ew-form-group">
            <label htmlFor="start-date" className="ew-form-label">
              <CalendarIcon size={13} className="ew-label-icon" />
              <span>Start Date (T1 Baseline)</span>
            </label>
            <div className="ew-input-wrapper">
              <input
                id="start-date"
                type="date"
                className="ew-input ew-date-input"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <span className="ew-field-hint">Initial temporal observation capture</span>
          </div>

          {/* Temporal Window: End Date */}
          <div className="ew-form-group">
            <label htmlFor="end-date" className="ew-form-label">
              <CalendarIcon size={13} className="ew-label-icon" />
              <span>End Date (T2 Target)</span>
            </label>
            <div className="ew-input-wrapper">
              <input
                id="end-date"
                type="date"
                className="ew-input ew-date-input"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
            <span className="ew-field-hint">Comparison temporal observation capture</span>
          </div>
        </form>

        {/* Action Button & Requirement Notice */}
        <div className="ew-form-actions">
          <button
            type="button"
            className="ew-btn ew-btn-primary"
            disabled={true}
            aria-disabled="true"
            title="Analysis execution will activate once satellite data pipeline is connected in Phase 3"
          >
            ANALYZE AREA
          </button>
          <span className="ew-action-notice" role="status">
            <span className="ew-notice-badge">NOTICE</span>
            Imagery source required • Satellite ingestion pipeline unlinked
          </span>
        </div>
      </div>
    </section>
  );
}
