import React, { useState, useEffect } from 'react';
import { SatelliteIcon, MapPinIcon, CalendarIcon, CrosshairIcon, FilterIcon } from '../common/Icons';
import { SatelliteSceneList } from './SatelliteSceneList';
import { API_ENDPOINTS } from '../../config/api';

export function AnalysisPanel({ panelRef, onSceneSelected }) {
  const [location, setLocation] = useState('San Francisco Bay Area');
  const [imagerySource, setImagerySource] = useState('Sentinel-2');
  const [startDate, setStartDate] = useState('2026-01-01');
  const [endDate, setEndDate] = useState('2026-01-15');
  const [maxCloudCover, setMaxCloudCover] = useState(20);

  // Status & Pipeline States
  const [sources, setSources] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [providerNotice, setProviderNotice] = useState('');
  const [searchAttempted, setSearchAttempted] = useState(false);
  const [providerConfigured, setProviderConfigured] = useState(false);
  const [scenes, setScenes] = useState([]);
  const [selectedSceneId, setSelectedSceneId] = useState(null);

  // Fetch supported sources from backend on mount
  useEffect(() => {
    fetch(API_ENDPOINTS.satelliteSources)
      .then((res) => {
        if (!res.ok) throw new Error('Failed to fetch satellite sources');
        return res.json();
      })
      .then((data) => {
        setSources(data);
      })
      .catch(() => {
        // Fallback to static list if backend temporarily starting
        setSources([
          { id: 'sentinel-2', name: 'Sentinel-2 L2A', status: 'planned/integration pending', provider_configured: false },
          { id: 'landsat-8-9', name: 'Landsat-8/9 OLI-2', status: 'planned', provider_configured: false },
          { id: 'planetscope', name: 'PlanetScope', status: 'planned', provider_configured: false },
          { id: 'custom-cog', name: 'Custom Cloud-Optimized GeoTIFF', status: 'planned', provider_configured: false },
        ]);
      });
  }, []);

  const handleSearch = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setProviderNotice('');

    // 1. Validate fields
    if (!location.trim()) {
      setErrorMessage('Location / Area of Interest is required.');
      return;
    }
    if (!imagerySource) {
      setErrorMessage('Please select an imagery source.');
      return;
    }
    if (!startDate) {
      setErrorMessage('Start date is required.');
      return;
    }
    if (!endDate) {
      setErrorMessage('End date is required.');
      return;
    }
    if (new Date(startDate) > new Date(endDate)) {
      setErrorMessage('Start date cannot be after end date.');
      return;
    }
    if (maxCloudCover < 0 || maxCloudCover > 100) {
      setErrorMessage('Max cloud cover must be between 0% and 100%.');
      return;
    }

    // 2. Show loading state
    setIsLoading(true);
    setSearchAttempted(true);

    try {
      // 3. Call backend POST /api/v1/satellite/search
      const response = await fetch(API_ENDPOINTS.satelliteSearch, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          location: location.trim(),
          start_date: startDate,
          end_date: endDate,
          max_cloud_cover: parseFloat(maxCloudCover),
          satellite_source: imagerySource,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        // Validation or server error
        const detailMsg = Array.isArray(data.detail)
          ? data.detail.map((d) => d.msg || d).join(', ')
          : data.detail || 'Failed to dispatch satellite search.';
        setErrorMessage(detailMsg);
        return;
      }

      setProviderConfigured(data.provider_configured);

      // 4. If API is not configured, show clear notification
      if (!data.provider_configured || data.status === 'provider_not_configured') {
        setProviderNotice('Satellite imagery provider is not connected.');
        setScenes([]);
      } else {
        setScenes(data.scenes || []);
      }
    } catch {
      setErrorMessage('Unable to connect to EarthWatch API service. Please verify backend is online.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectScene = (scene) => {
    setSelectedSceneId(scene.scene_id);
    if (onSceneSelected) onSceneSelected(scene);
  };

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
        <span className="ew-panel-badge">SATELLITE DISCOVERY PIPELINE</span>
      </div>

      <div className="ew-panel-body">
        {/* Error Notification Banner */}
        {errorMessage && (
          <div className="ew-alert-banner ew-alert-error" role="alert">
            <span className="ew-alert-badge">ERROR</span>
            <span className="ew-alert-text">{errorMessage}</span>
          </div>
        )}

        {/* Provider Not Connected Notice */}
        {providerNotice && (
          <div className="ew-alert-banner ew-alert-warning" role="status">
            <span className="ew-alert-badge ew-badge-warning">NOTICE</span>
            <div className="ew-alert-content">
              <strong>{providerNotice}</strong>
              <span className="ew-alert-hint">
                Configure SATELLITE_PROVIDER credentials in backend/.env to connect real Copernicus CDSE / STAC catalog.
              </span>
            </div>
          </div>
        )}

        <form className="ew-form-grid" onSubmit={handleSearch} noValidate>
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
                placeholder="Enter AOI coordinates or region (e.g. San Francisco Bay)"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                autoComplete="off"
                disabled={isLoading}
              />
            </div>
            <span className="ew-field-hint">Accepts geographical names, bounding box, or WKT geometries</span>
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
                disabled={isLoading}
              >
                {sources.length > 0 ? (
                  sources.map((src) => (
                    <option key={src.id} value={src.name.split(' ')[0]}>
                      {src.name} {src.status.includes('pending') ? '— [Integration Pending]' : ''}
                    </option>
                  ))
                ) : (
                  <>
                    <option value="Sentinel-2">Sentinel-2 L2A — [Integration Pending]</option>
                    <option value="Landsat-8/9">Landsat-8/9 OLI-2 — [Planned]</option>
                    <option value="PlanetScope">PlanetScope — [Planned]</option>
                    <option value="Custom COG">Custom COG — [Planned]</option>
                  </>
                )}
              </select>
            </div>
            <span className="ew-field-hint">Validated against architectural constellation registry</span>
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
                disabled={isLoading}
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
                disabled={isLoading}
              />
            </div>
            <span className="ew-field-hint">Comparison temporal observation capture</span>
          </div>

          {/* Max Cloud Cover Filter */}
          <div className="ew-form-group ew-form-group-full">
            <div className="ew-slider-header">
              <label htmlFor="max-cloud-cover" className="ew-form-label">
                <FilterIcon size={13} className="ew-label-icon" />
                <span>Max Cloud Cover Constraint: {maxCloudCover}%</span>
              </label>
            </div>
            <div className="ew-range-wrapper">
              <input
                id="max-cloud-cover"
                type="range"
                min="0"
                max="100"
                step="5"
                className="ew-range-input"
                value={maxCloudCover}
                onChange={(e) => setMaxCloudCover(Number(e.target.value))}
                disabled={isLoading}
              />
              <span className="ew-range-scale">
                <span>0% (Clear)</span>
                <span>50%</span>
                <span>100% (Any)</span>
              </span>
            </div>
          </div>

          {/* Action Row */}
          <div className="ew-form-actions ew-form-actions-full">
            <button
              type="submit"
              className="ew-btn ew-btn-primary"
              disabled={isLoading}
              aria-busy={isLoading}
            >
              {isLoading ? (
                <>
                  <span className="ew-btn-spinner" aria-hidden="true" />
                  <span>QUERYING SATELLITE CATALOG...</span>
                </>
              ) : (
                <span>DISCOVER SCENES</span>
              )}
            </button>

            <div className="ew-action-telemetry-meta">
              <span className="ew-telemetry-item">API CONTRACT: v1</span>
              <span className="ew-sep">•</span>
              <span className="ew-telemetry-item">
                AUTH: {providerConfigured ? 'LINKED' : 'UNCONFIGURED'}
              </span>
            </div>
          </div>
        </form>

        {/* Results Container Underneath Analysis Form */}
        <SatelliteSceneList
          scenes={scenes}
          searchAttempted={searchAttempted}
          providerConfigured={providerConfigured}
          onSelectScene={handleSelectScene}
          selectedSceneId={selectedSceneId}
        />
      </div>
    </section>
  );
}
