import React, { useState, useEffect } from 'react';
import { SatelliteIcon, CalendarIcon, MapPinIcon, FilterIcon, RadarIcon, LayersIcon } from '../components/common/Icons';
import { NdviAnalysisPanel } from '../components/panels/NdviAnalysisPanel';
import { NdwiAnalysisPanel } from '../components/panels/NdwiAnalysisPanel';
import { API_ENDPOINTS } from '../config/api';

const SUPPORTED_LOCATIONS = [
  'Delhi',
  'Mumbai',
  'Bhadohi',
  'San Francisco Bay Area'
];

export function AnalyzeImageryPage({ onStacUpdate }) {
  // Source & Query State
  const [sources, setSources] = useState([]);
  const [selectedSource, setSelectedSource] = useState('Sentinel-2');
  const [location, setLocation] = useState('Delhi');
  const [startDate, setStartDate] = useState('2026-01-01');
  const [endDate, setEndDate] = useState('2026-01-31');
  const [maxCloudCover, setMaxCloudCover] = useState(20);

  // Search State
  const [searchStatus, setSearchStatus] = useState('idle'); // 'idle' | 'searching' | 'success' | 'zero_results' | 'error'
  const [errorMessage, setErrorMessage] = useState('');
  const [scenes, setScenes] = useState([]);

  // Selected Scene State
  const [selectedScene, setSelectedScene] = useState(null);
  const [previewStatus, setPreviewStatus] = useState('idle'); // 'idle' | 'loading' | 'success' | 'error'
  const [previewUrl, setPreviewUrl] = useState(null);
  const [activeTab, setActiveTab] = useState('ndvi'); // 'ndvi' | 'ndwi'

  // Fetch real satellite sources on mount
  useEffect(() => {
    const fetchSources = async () => {
      try {
        const res = await fetch(API_ENDPOINTS.satelliteSources);
        if (res.ok) {
          const data = await res.json();
          setSources(data);
        }
      } catch (err) {
        console.error('Failed to load satellite sources:', err);
      }
    };
    fetchSources();
  }, []);

  // Execute STAC Search
  const handleSearch = async (e) => {
    if (e) e.preventDefault();
    setSearchStatus('searching');
    setErrorMessage('');
    setSelectedScene(null);
    setPreviewUrl(null);
    setPreviewStatus('idle');

    try {
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
          satellite_source: selectedSource,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || 'Satellite search request failed.');
      }

      if (data.status === 'provider_not_configured') {
        throw new Error(data.message || 'Satellite provider is pending configuration.');
      }

      const discoveredScenes = data.scenes || [];
      setScenes(discoveredScenes);
      onStacUpdate?.('CONNECTED');

      if (discoveredScenes.length === 0) {
        setSearchStatus('zero_results');
      } else {
        setSearchStatus('success');
        // Auto-select first scene for immediate inspection
        handleSelectScene(discoveredScenes[0]);
      }
    } catch (err) {
      console.error(err);
      setSearchStatus('error');
      setErrorMessage(err.message || 'Error communicating with STAC catalog.');
      onStacUpdate?.('OFFLINE');
    }
  };

  // Handle Scene Selection & Fetch Real Preview Asset
  const handleSelectScene = async (scene) => {
    setSelectedScene(scene);
    setPreviewStatus('loading');
    setPreviewUrl(null);

    // Initial fallback to thumbnail_url from STAC item
    if (scene.thumbnail_url) {
      setPreviewUrl(scene.thumbnail_url);
    }

    try {
      const res = await fetch(API_ENDPOINTS.scenePreview(scene.scene_id));
      if (res.ok) {
        const data = await res.json();
        if (data.status === 'success' && data.thumbnail_url) {
          setPreviewUrl(data.thumbnail_url);
          setPreviewStatus('success');
        } else {
          setPreviewStatus(scene.thumbnail_url ? 'success' : 'error');
        }
      } else {
        setPreviewStatus(scene.thumbnail_url ? 'success' : 'error');
      }
    } catch (err) {
      console.error('Failed to fetch preview asset:', err);
      setPreviewStatus(scene.thumbnail_url ? 'success' : 'error');
    }
  };

  return (
    <div className="ew-dashboard-container" style={{ gap: '20px' }}>
      {/* Workspace Header Banner */}
      <section className="ew-panel" style={{ padding: '16px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--accent-cyan)', fontSize: '11px', fontWeight: 700, letterSpacing: '0.08em', marginBottom: '2px', fontFamily: 'var(--font-mono)' }}>
              <SatelliteIcon size={14} />
              <span>SINGLE SCENE ANALYSIS WORKSPACE</span>
            </div>
            <h1 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '0.04em' }}>
              ANALYZE IMAGERY // COPERNICUS SENTINEL-2 PIPELINE
            </h1>
            <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: 'var(--text-secondary)' }}>
              Discover real Sentinel-2 Level-2A imagery across target AOIs, inspect remote STAC preview assets, and generate verified NDVI / NDWI analytical products.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span className="ew-badge-live" style={{ fontSize: '10px', padding: '3px 8px' }}>
              STAC v1 CONNECTED
            </span>
          </div>
        </div>
      </section>

      {/* Main Analysis Workspace: 2-Column Split Grid */}
      <div className="ew-dual-panel-grid" style={{ gridTemplateColumns: '1.2fr 1.8fr', gap: '20px' }}>
        {/* Left Column: Search & Source Controls + Discovered Scenes */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* 1. Source & Search Form Panel */}
          <section className="ew-panel" aria-label="Satellite Query Parameters">
            <div className="ew-panel-header">
              <div className="ew-panel-title-wrap">
                <FilterIcon size={14} className="ew-panel-icon" />
                <h2 className="ew-panel-title">SCENE DISCOVERY PARAMETERS</h2>
              </div>
              <span className="ew-panel-tag">COPERNICUS CDSE</span>
            </div>

            <div className="ew-panel-body">
              <form onSubmit={handleSearch} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {/* Satellite Source */}
                <div className="ew-form-group">
                  <label className="ew-form-label">
                    <SatelliteIcon size={12} className="ew-label-icon" />
                    <span>SATELLITE CONSTELLATION SOURCE</span>
                  </label>
                  <select
                    className="ew-select"
                    value={selectedSource}
                    onChange={(e) => setSelectedSource(e.target.value)}
                    aria-label="Satellite constellation source selector"
                  >
                    {sources.length > 0 ? (
                      sources.map((src) => (
                        <option key={src.id} value={src.id === 'sentinel-2' ? 'Sentinel-2' : src.name}>
                          {src.name} {src.provider_configured ? '[ONLINE]' : '[PLANNED]'}
                        </option>
                      ))
                    ) : (
                      <option value="Sentinel-2">Sentinel-2 MSI L2A [ONLINE]</option>
                    )}
                  </select>
                </div>

                {/* Area of Interest */}
                <div className="ew-form-group">
                  <label className="ew-form-label">
                    <MapPinIcon size={12} className="ew-label-icon" />
                    <span>AREA OF INTEREST (AOI)</span>
                  </label>
                  <select
                    className="ew-select"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    aria-label="Target Area of Interest selector"
                  >
                    {SUPPORTED_LOCATIONS.map((loc) => (
                      <option key={loc} value={loc}>{loc}</option>
                    ))}
                  </select>
                </div>

                {/* Date Range */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div className="ew-form-group">
                    <label className="ew-form-label">
                      <CalendarIcon size={12} className="ew-label-icon" />
                      <span>START DATE</span>
                    </label>
                    <input
                      type="date"
                      className="ew-input ew-date-input"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      required
                    />
                  </div>

                  <div className="ew-form-group">
                    <label className="ew-form-label">
                      <CalendarIcon size={12} className="ew-label-icon" />
                      <span>END DATE</span>
                    </label>
                    <input
                      type="date"
                      className="ew-input ew-date-input"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      required
                    />
                  </div>
                </div>

                {/* Max Cloud Cover */}
                <div className="ew-form-group">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <label className="ew-form-label">
                      <span>MAX CLOUD COVERAGE</span>
                    </label>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--accent-cyan)' }}>
                      &le; {maxCloudCover}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="5"
                    className="ew-range-input"
                    value={maxCloudCover}
                    onChange={(e) => setMaxCloudCover(e.target.value)}
                  />
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '9px', color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>
                    <span>0% (Clear)</span>
                    <span>50%</span>
                    <span>100% (Any)</span>
                  </div>
                </div>

                {/* Search Button */}
                <button
                  type="submit"
                  className="ew-btn ew-btn-primary"
                  disabled={searchStatus === 'searching'}
                  style={{ width: '100%', height: '38px', marginTop: '6px' }}
                >
                  {searchStatus === 'searching' && <span className="ew-btn-spinner" />}
                  {searchStatus === 'searching' ? 'SEARCHING COPERNICUS STAC...' : 'SEARCH SATELLITE SCENES'}
                </button>
              </form>
            </div>
          </section>

          {/* 2. Discovered Scenes List */}
          <section className="ew-panel" aria-label="Discovered Satellite Scenes">
            <div className="ew-panel-header">
              <div className="ew-panel-title-wrap">
                <SatelliteIcon size={14} className="ew-panel-icon" />
                <h3 className="ew-panel-title">DISCOVERED SCENES</h3>
              </div>
              <span className="ew-panel-tag">
                {scenes.length > 0 ? `${scenes.length} AVAILABLE` : 'STANDBY'}
              </span>
            </div>

            <div className="ew-panel-body" style={{ maxHeight: '520px', overflowY: 'auto', padding: '12px' }}>
              {searchStatus === 'idle' && (
                <div className="ew-status-block ew-status-block-empty">
                  <SatelliteIcon size={28} style={{ color: 'var(--text-dim)', marginBottom: '8px' }} />
                  <div style={{ fontWeight: 700, fontSize: '12px', color: 'var(--text-primary)', marginBottom: '4px' }}>
                    READY TO DISCOVER SCENES
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                    Click &ldquo;SEARCH SATELLITE SCENES&rdquo; to query Sentinel-2 acquisitions.
                  </div>
                </div>
              )}

              {searchStatus === 'searching' && (
                <div className="ew-status-block ew-status-block-loading" style={{ padding: '24px 12px' }}>
                  <span className="ew-btn-spinner" />
                  <span>QUERYING COPERNICUS DATA SPACE STAC...</span>
                </div>
              )}

              {searchStatus === 'error' && (
                <div className="ew-status-block ew-status-block-error">
                  <div style={{ fontWeight: 700, marginBottom: '2px' }}>QUERY FAILED</div>
                  <div style={{ fontSize: '11px' }}>{errorMessage}</div>
                  <button
                    type="button"
                    className="ew-btn ew-btn-secondary"
                    onClick={handleSearch}
                    style={{ marginTop: '8px', fontSize: '10px', padding: '4px 12px', height: '26px' }}
                  >
                    RETRY QUERY
                  </button>
                </div>
              )}

              {searchStatus === 'zero_results' && (
                <div className="ew-status-block ew-status-block-empty">
                  <div style={{ fontWeight: 700, fontSize: '12px', color: 'var(--text-primary)', marginBottom: '4px' }}>
                    NO MATCHING SCENES FOUND
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                    Try expanding the date range or increasing the cloud cover threshold.
                  </div>
                </div>
              )}

              {searchStatus === 'success' && scenes.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {scenes.map((scene) => {
                    const isSelected = selectedScene?.scene_id === scene.scene_id;
                    const dateFormatted = new Date(scene.acquisition_datetime).toISOString().replace('T', ' ').substring(0, 19);

                    return (
                      <div
                        key={scene.scene_id}
                        onClick={() => handleSelectScene(scene)}
                        className="ew-metric-card"
                        style={{
                          cursor: 'pointer',
                          borderColor: isSelected ? 'var(--accent-cyan)' : 'var(--border-subtle)',
                          backgroundColor: isSelected ? 'rgba(0, 240, 255, 0.08)' : 'rgba(15, 23, 42, 0.65)',
                          padding: '10px 12px'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                          <span style={{
                            fontFamily: 'var(--font-mono)',
                            fontSize: '9px',
                            fontWeight: 700,
                            padding: '1px 5px',
                            borderRadius: '2px',
                            backgroundColor: isSelected ? 'rgba(0, 240, 255, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                            color: isSelected ? 'var(--accent-cyan)' : 'var(--text-secondary)'
                          }}>
                            {scene.satellite || 'Sentinel-2'}
                          </span>
                          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: scene.cloud_cover <= 10 ? '#4ade80' : 'var(--status-warning)' }}>
                            ☁ {scene.cloud_cover?.toFixed(1)}%
                          </span>
                        </div>

                        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-primary)', wordBreak: 'break-all', fontWeight: 600 }}>
                          {scene.scene_id}
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px', fontSize: '10px', color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>
                          <span>{dateFormatted} UTC</span>
                          {scene.tile && <span>TILE: {scene.tile}</span>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </section>
        </div>

        {/* Right Column: Selected Scene Preview + Analytical Products */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {selectedScene ? (
            <>
              {/* 1. Real Scene Preview Viewport */}
              <section className="ew-panel ew-viewport-panel" aria-label="Selected Scene Preview">
                <div className="ew-panel-header">
                  <div className="ew-panel-title-wrap">
                    <RadarIcon size={14} className="ew-panel-icon" />
                    <h3 className="ew-panel-title">SCENE PREVIEW & TELEMETRY</h3>
                  </div>
                  <span className="ew-panel-tag" style={{ color: 'var(--accent-cyan)' }}>
                    REAL STAC ASSET
                  </span>
                </div>

                <div style={{
                  position: 'relative',
                  height: '320px',
                  backgroundColor: '#030712',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  overflow: 'hidden'
                }}>
                  {/* Decorative Corner Brackets */}
                  <div className="ew-corner-bracket ew-cb-tl" />
                  <div className="ew-corner-bracket ew-cb-tr" />
                  <div className="ew-corner-bracket ew-cb-bl" />
                  <div className="ew-corner-bracket ew-cb-br" />

                  {previewUrl ? (
                    <img
                      src={previewUrl}
                      alt={`Copernicus Sentinel-2 scene ${selectedScene.scene_id}`}
                      style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                      onLoad={() => setPreviewStatus('success')}
                      onError={() => setPreviewStatus('error')}
                    />
                  ) : previewStatus === 'loading' ? (
                    <div className="ew-status-block ew-status-block-loading">
                      <span className="ew-btn-spinner" />
                      <span>FETCHING SCENE PREVIEW ASSET...</span>
                    </div>
                  ) : (
                    <div style={{ textAlign: 'center', color: 'var(--text-dim)', fontFamily: 'var(--font-mono)', fontSize: '11px' }}>
                      PREVIEW STREAM UNAVAILABLE FOR THIS ACQUISITION
                    </div>
                  )}

                  {/* Telemetry HUD Overlay Bar */}
                  <div className="ew-viewport-hud-footer">
                    <div className="ew-hud-footer-item">
                      <span className="ew-hud-label">SCENE:</span>
                      <span className="ew-hud-value" style={{ maxWidth: '240px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {selectedScene.scene_id}
                      </span>
                    </div>
                    <div className="ew-hud-footer-item">
                      <span className="ew-hud-label">CLOUD:</span>
                      <span className="ew-hud-value">{selectedScene.cloud_cover?.toFixed(1)}%</span>
                    </div>
                    <div className="ew-hud-footer-item">
                      <span className="ew-hud-label">RES:</span>
                      <span className="ew-hud-value">10m OPTICAL</span>
                    </div>
                  </div>
                </div>
              </section>

              {/* 2. Analytical Products Selector & Panels */}
              <section className="ew-panel" aria-label="Spectral Analysis Products">
                <div className="ew-panel-header">
                  <div className="ew-panel-title-wrap">
                    <LayersIcon size={14} className="ew-panel-icon" />
                    <h3 className="ew-panel-title">ANALYSIS PRODUCTS</h3>
                  </div>

                  {/* Product Tabs */}
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button
                      type="button"
                      onClick={() => setActiveTab('ndvi')}
                      className={`ew-btn ${activeTab === 'ndvi' ? 'ew-btn-primary' : 'ew-btn-secondary'}`}
                      style={{
                        height: '28px',
                        padding: '0 12px',
                        fontSize: '11px',
                        color: activeTab === 'ndvi' ? '#4ade80' : 'var(--text-secondary)',
                        borderColor: activeTab === 'ndvi' ? '#22c55e' : 'var(--border-subtle)'
                      }}
                    >
                      NDVI VEGETATION
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab('ndwi')}
                      className={`ew-btn ${activeTab === 'ndwi' ? 'ew-btn-primary' : 'ew-btn-secondary'}`}
                      style={{
                        height: '28px',
                        padding: '0 12px',
                        fontSize: '11px',
                        color: activeTab === 'ndwi' ? 'var(--accent-blue)' : 'var(--text-secondary)',
                        borderColor: activeTab === 'ndwi' ? 'var(--accent-cyan)' : 'var(--border-subtle)'
                      }}
                    >
                      NDWI WATER SIGNAL
                    </button>
                  </div>
                </div>

                <div className="ew-panel-body" style={{ padding: '16px' }}>
                  {activeTab === 'ndvi' && (
                    <NdviAnalysisPanel selectedScene={selectedScene} />
                  )}
                  {activeTab === 'ndwi' && (
                    <NdwiAnalysisPanel selectedScene={selectedScene} />
                  )}
                </div>
              </section>
            </>
          ) : (
            /* Empty State: No Scene Selected */
            <div className="ew-panel" style={{
              minHeight: '440px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              textAlign: 'center',
              padding: '36px',
              borderStyle: 'dashed'
            }}>
              <SatelliteIcon size={44} style={{ color: 'var(--text-dim)', marginBottom: '14px' }} />
              <h3 style={{ margin: '0 0 6px 0', fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)' }}>
                NO SCENE SELECTED
              </h3>
              <p style={{ margin: 0, maxWidth: '420px', fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                Query the Copernicus Sentinel-2 catalog using the parameter panel on the left, then select a discovered scene to inspect preview telemetry and generate verified NDVI / NDWI products.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
