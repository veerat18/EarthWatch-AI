import React, { useState } from 'react';
import {
  LayersIcon,
  SatelliteIcon,
  CalendarIcon,
  FilterIcon,
  MapPinIcon,
  CheckIcon,
  ShieldAlertIcon,
  ActivityIcon,
} from '../components/common/Icons';
import { ChangeDetectionPairPanel } from '../components/panels/ChangeDetectionPairPanel';
import { NdwiChangeDetectionPanel } from '../components/panels/NdwiChangeDetectionPanel';
import { API_ENDPOINTS } from '../config/api';

const SUPPORTED_LOCATIONS = [
  'Delhi',
  'Mumbai',
  'Bhadohi',
  'San Francisco Bay Area'
];

// Verified development Sentinel-2 L2A scene pair over Bangalore (T43RGN)
const VERIFIED_DEV_PAIR = {
  before: {
    scene_id: 'S2A_MSIL2A_20260105T053251_N0511_R105_T43RGN_20260105T084010',
    acquisition_datetime: '2026-01-05T05:32:51.000Z',
    tile: 'T43RGN',
    satellite: 'Sentinel-2A',
    processing_level: 'L2A'
  },
  after: {
    scene_id: 'S2B_MSIL2A_20260118T053049_N0511_R105_T43RGN_20260118T073251',
    acquisition_datetime: '2026-01-18T05:30:49.000Z',
    tile: 'T43RGN',
    satellite: 'Sentinel-2B',
    processing_level: 'L2A'
  }
};

export function ChangeDetectionPage({ onStacUpdate, onAnalysisSuccess }) {
  // Pair state
  const [beforeScene, setBeforeScene] = useState(null);
  const [afterScene, setAfterScene] = useState(null);
  const [activeProductTab, setActiveProductTab] = useState('ndvi'); // 'ndvi' | 'ndwi'

  // STAC Discovery State
  const [showCatalog, setShowCatalog] = useState(false);
  const [location, setLocation] = useState('Delhi');
  const [startDate, setStartDate] = useState('2026-01-01');
  const [endDate, setEndDate] = useState('2026-01-31');
  const [maxCloudCover, setMaxCloudCover] = useState(20);
  const [searchStatus, setSearchStatus] = useState('idle'); // 'idle' | 'searching' | 'success' | 'zero_results' | 'error'
  const [errorMessage, setErrorMessage] = useState('');
  const [discoveredScenes, setDiscoveredScenes] = useState([]);

  // Load verified test pair
  const handleLoadVerifiedPair = async () => {
    // Set base pair first
    setBeforeScene(VERIFIED_DEV_PAIR.before);
    setAfterScene(VERIFIED_DEV_PAIR.after);

    // Fetch live metadata to resolve real cloud cover
    try {
      const fetchMetadata = async (sceneId) => {
        const res = await fetch(`https://stac.dataspace.copernicus.eu/v1/collections/sentinel-2-l2a/items/${sceneId}`);
        if (!res.ok) return null;
        const data = await res.json();
        return data.properties?.['eo:cloud_cover'];
      };

      const [beforeCc, afterCc] = await Promise.all([
        fetchMetadata(VERIFIED_DEV_PAIR.before.scene_id),
        fetchMetadata(VERIFIED_DEV_PAIR.after.scene_id)
      ]);

      if (beforeCc !== null && beforeCc !== undefined) {
        setBeforeScene(prev => ({ ...prev, cloud_cover: beforeCc }));
      }
      if (afterCc !== null && afterCc !== undefined) {
        setAfterScene(prev => ({ ...prev, cloud_cover: afterCc }));
      }
      onStacUpdate?.('CONNECTED');
    } catch (err) {
      console.error('Failed to fetch STAC metadata', err);
      onStacUpdate?.('OFFLINE');
    }
  };

  const formatCloudCover = (scene) => {
    if (!scene) return '--';
    const cc = scene.cloud_cover ?? scene['eo:cloud_cover'] ?? scene.properties?.['eo:cloud_cover'];
    if (cc === null || cc === undefined || cc === '' || isNaN(cc)) return '--';
    return `${Number(cc).toFixed(1)}%`;
  };

  const handleClearPair = () => {
    setBeforeScene(null);
    setAfterScene(null);
  };

  const handleSwapPair = () => {
    setBeforeScene(afterScene);
    setAfterScene(beforeScene);
  };

  const handleSetBefore = (scene) => {
    setBeforeScene(scene);
  };

  const handleSetAfter = (scene) => {
    setAfterScene(scene);
  };

  // STAC Query
  const handleSearch = async (e) => {
    if (e) e.preventDefault();
    setSearchStatus('searching');
    setErrorMessage('');

    try {
      const response = await fetch(API_ENDPOINTS.satelliteSearch, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          location: location.trim(),
          start_date: startDate,
          end_date: endDate,
          max_cloud_cover: parseFloat(maxCloudCover),
          satellite_source: 'Sentinel-2',
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.detail || 'STAC search failed.');
      }

      const scenes = data.scenes || [];
      setDiscoveredScenes(scenes);
      onStacUpdate?.('CONNECTED');
      if (scenes.length === 0) {
        setSearchStatus('zero_results');
      } else {
        setSearchStatus('success');
      }
    } catch (err) {
      console.error(err);
      setSearchStatus('error');
      setErrorMessage(err.message || 'Error querying Copernicus STAC catalog.');
      onStacUpdate?.('OFFLINE');
    }
  };

  // Pair Validation Logic
  const hasBefore = !!beforeScene;
  const hasAfter = !!afterScene;
  const isPairComplete = hasBefore && hasAfter;

  let isTemporalValid = false;
  let intervalDays = null;
  let validationError = '';
  let tileMismatchWarning = '';

  if (isPairComplete) {
    const beforeDate = new Date(beforeScene.acquisition_datetime);
    const afterDate = new Date(afterScene.acquisition_datetime);

    if (beforeDate >= afterDate) {
      validationError = 'BEFORE acquisition timestamp must be strictly earlier than AFTER acquisition timestamp.';
    } else {
      isTemporalValid = true;
      intervalDays = Math.round((afterDate - beforeDate) / (1000 * 60 * 60 * 24));
    }

    const beforeTile = beforeScene.tile || beforeScene.scene_id?.split('_')[5];
    const afterTile = afterScene.tile || afterScene.scene_id?.split('_')[5];
    if (beforeTile && afterTile && beforeTile !== afterTile) {
      tileMismatchWarning = `Scenes belong to differing Sentinel-2 tiles (${beforeTile} vs ${afterTile}). Co-registered tiles are recommended for reliable change rasterization.`;
    }
  }

  // Format date helper
  const formatUtcDate = (dateStr) => {
    if (!dateStr) return '--';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      }).toUpperCase();
    } catch {
      return '--';
    }
  };

  const formatUtcDateTime = (dateStr) => {
    if (!dateStr) return '--';
    try {
      const d = new Date(dateStr);
      return d.toLocaleString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'UTC',
        timeZoneName: 'short'
      }).toUpperCase();
    } catch {
      return '--';
    }
  };

  return (
    <div className="ew-dashboard-container" role="main" aria-label="Temporal Change Detection Workspace">
      {/* 1. Header Section */}
      <section className="ew-panel" style={{ padding: '20px 24px' }} aria-labelledby="change-detection-title">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '14px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <LayersIcon size={14} style={{ color: 'var(--accent-cyan)' }} />
              <span style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--accent-cyan)', letterSpacing: '0.1em' }}>
                SPATIAL DIFFERENCING ENGINE
              </span>
            </div>
            <h1 id="change-detection-title" style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '0.04em' }}>
              CHANGE DETECTION // TEMPORAL EARTH OBSERVATION
            </h1>
            <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: 'var(--text-secondary)' }}>
              Compare two real Sentinel-2 acquisitions over identical spatial tiles to quantify biophysical vegetation shifts (NDVI) and hydrological surface signals (NDWI).
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span className="ew-badge-live" style={{ fontSize: '10px', padding: '4px 10px' }}>
              LIVE TEMPORAL ANALYSIS
            </span>
          </div>
        </div>
      </section>

      {/* 2. Compact Telemetry Strip: BEFORE → TEMPORAL INTERVAL → AFTER */}
      <section className="ew-panel" style={{ padding: '14px 20px', background: 'rgba(15, 23, 42, 0.65)' }} aria-label="Temporal Baseline Telemetry">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}>
            {/* Before Timestamp */}
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '9px', fontFamily: 'var(--font-mono)', color: 'var(--accent-cyan)', letterSpacing: '0.08em' }}>
                BEFORE ACQUISITION
              </span>
              <span style={{ fontSize: '13px', fontFamily: 'var(--font-mono)', fontWeight: 700, color: hasBefore ? 'var(--text-primary)' : 'var(--text-dim)' }}>
                {formatUtcDate(beforeScene?.acquisition_datetime)}
              </span>
            </div>

            <span style={{ color: 'var(--accent-cyan)', fontSize: '14px', fontWeight: 700 }}>&rarr;</span>

            {/* Temporal Interval */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <span style={{ fontSize: '9px', fontFamily: 'var(--font-mono)', color: 'var(--text-dim)', letterSpacing: '0.08em' }}>
                TEMPORAL INTERVAL
              </span>
              <span style={{
                fontSize: '13px',
                fontFamily: 'var(--font-mono)',
                fontWeight: 700,
                color: intervalDays !== null ? '#fbbf24' : 'var(--text-dim)'
              }}>
                {intervalDays !== null ? `${intervalDays} DAYS` : '--'}
              </span>
            </div>

            <span style={{ color: 'var(--accent-cyan)', fontSize: '14px', fontWeight: 700 }}>&rarr;</span>

            {/* After Timestamp */}
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '9px', fontFamily: 'var(--font-mono)', color: '#f59e0b', letterSpacing: '0.08em' }}>
                AFTER ACQUISITION
              </span>
              <span style={{ fontSize: '13px', fontFamily: 'var(--font-mono)', fontWeight: 700, color: hasAfter ? 'var(--text-primary)' : 'var(--text-dim)' }}>
                {formatUtcDate(afterScene?.acquisition_datetime)}
              </span>
            </div>

            {/* Tile Specifier */}
            <div style={{ borderLeft: '1px solid var(--border-subtle)', paddingLeft: '16px', display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '9px', fontFamily: 'var(--font-mono)', color: 'var(--text-dim)', letterSpacing: '0.08em' }}>
                TILE IDENTIFIER
              </span>
              <span style={{ fontSize: '13px', fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--text-secondary)' }}>
                {beforeScene?.tile || afterScene?.tile || beforeScene?.scene_id?.split('_')[5] || '--'}
              </span>
            </div>
          </div>

          {/* Validation Status Badge */}
          <div>
            {!isPairComplete ? (
              <span className="ew-panel-tag" style={{ background: 'rgba(148, 163, 184, 0.1)', color: '#94a3b8' }}>
                {!hasBefore && !hasAfter ? 'NO PAIR SELECTED' : hasBefore ? 'AWAITING AFTER SCENE' : 'AWAITING BEFORE SCENE'}
              </span>
            ) : !isTemporalValid ? (
              <span className="ew-panel-tag" style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#f87171', borderColor: 'rgba(239, 68, 68, 0.3)' }}>
                INVALID TEMPORAL ORDER
              </span>
            ) : (
              <span className="ew-badge-live" style={{ fontSize: '10px', padding: '3px 8px', background: 'rgba(34, 197, 94, 0.12)', color: '#4ade80', borderColor: 'rgba(34, 197, 94, 0.3)' }}>
                <CheckIcon size={12} style={{ display: 'inline', marginRight: '4px', verticalAlign: '-1px' }} />
                TEMPORAL PAIR VALIDATED
              </span>
            )}
          </div>
        </div>
      </section>

      {/* Validation Warnings / Errors Banner */}
      {validationError && (
        <div className="ew-alert-banner ew-alert-error" role="alert">
          <ShieldAlertIcon size={14} className="ew-alert-icon" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            <span className="ew-alert-badge">TEMPORAL VALIDATION ERROR</span>
            <span className="ew-alert-text">{validationError} Click &ldquo;SWAP PAIR&rdquo; to reverse the chronological order.</span>
          </div>
        </div>
      )}

      {tileMismatchWarning && (
        <div className="ew-alert-banner" style={{ background: 'rgba(245, 158, 11, 0.08)', borderColor: 'rgba(245, 158, 11, 0.25)', color: '#f59e0b' }} role="status">
          <ActivityIcon size={14} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            <span style={{ fontWeight: 700, fontSize: '10px', letterSpacing: '0.08em' }}>SPATIAL GRID NOTICE</span>
            <span style={{ fontSize: '11px', color: '#cbd5e1' }}>{tileMismatchWarning}</span>
          </div>
        </div>
      )}

      {/* 3. Before / After Pair Workspace Cards */}
      <section className="ew-panel" aria-label="Acquisition Pair Selector">
        <div className="ew-panel-header">
          <div className="ew-panel-title-wrap">
            <SatelliteIcon size={14} className="ew-panel-icon" />
            <h2 className="ew-panel-title">ACQUISITION PAIR WORKSPACE</h2>
          </div>

          {/* Quick Action Buttons */}
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button
              type="button"
              className="ew-btn ew-btn-secondary"
              onClick={handleLoadVerifiedPair}
              style={{ fontSize: '11px', padding: '4px 10px', height: '28px', color: 'var(--accent-cyan)', borderColor: 'var(--border-subtle)' }}
              title="Preload verified Bangalore Sentinel-2 L2A pair (T43RGN) for immediate testing"
            >
              LOAD VERIFIED TEST PAIR (T43RGN)
            </button>
            <button
              type="button"
              className="ew-btn ew-btn-secondary"
              onClick={handleSwapPair}
              disabled={!hasBefore && !hasAfter}
              style={{ fontSize: '11px', padding: '4px 10px', height: '28px' }}
              title="Reverse chronological assignment of scenes"
            >
              SWAP PAIR
            </button>
            <button
              type="button"
              className="ew-btn ew-btn-secondary"
              onClick={handleClearPair}
              disabled={!hasBefore && !hasAfter}
              style={{ fontSize: '11px', padding: '4px 10px', height: '28px', color: '#f87171' }}
            >
              CLEAR PAIR
            </button>
            <button
              type="button"
              className={`ew-btn ${showCatalog ? 'ew-btn-primary' : 'ew-btn-secondary'}`}
              onClick={() => setShowCatalog(!showCatalog)}
              style={{ fontSize: '11px', padding: '4px 10px', height: '28px' }}
            >
              <FilterIcon size={12} style={{ display: 'inline', marginRight: '4px' }} />
              {showCatalog ? 'HIDE STAC DISCOVERY' : 'DISCOVER SCENES (STAC)'}
            </button>
          </div>
        </div>

        <div className="ew-panel-body" style={{ padding: '16px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px' }}>
            {/* BEFORE SCENE CARD */}
            <div
              style={{
                backgroundColor: 'rgba(2, 6, 23, 0.45)',
                border: '1px solid',
                borderColor: hasBefore ? 'rgba(56, 189, 248, 0.35)' : 'var(--border-subtle)',
                borderRadius: '6px',
                padding: '16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span className="ew-panel-tag" style={{ background: 'rgba(56, 189, 248, 0.12)', color: 'var(--accent-blue)', borderColor: 'rgba(56, 189, 248, 0.3)' }}>
                  BEFORE ACQUISITION (T0 BASELINE)
                </span>
                {hasBefore && (
                  <button
                    type="button"
                    onClick={() => setBeforeScene(null)}
                    style={{ background: 'transparent', border: 'none', color: 'var(--text-dim)', cursor: 'pointer', fontSize: '11px', padding: '2px 6px' }}
                  >
                    REMOVE
                  </button>
                )}
              </div>

              {hasBefore ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '11px' }}>
                  <div>
                    <div style={{ fontSize: '9px', fontFamily: 'var(--font-mono)', color: 'var(--text-dim)', marginBottom: '2px' }}>SCENE IDENTIFIER</div>
                    <div style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-primary)', wordBreak: 'break-all', fontWeight: 600, fontSize: '11px' }}>
                      {beforeScene.scene_id}
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', paddingTop: '4px' }}>
                    <div>
                      <span style={{ color: 'var(--text-dim)' }}>ACQUIRED:</span>{' '}
                      <strong style={{ color: 'var(--text-primary)' }}>{formatUtcDateTime(beforeScene.acquisition_datetime)}</strong>
                    </div>
                    <div>
                      <span style={{ color: 'var(--text-dim)' }}>CLOUD COVER:</span>{' '}
                      <strong style={{ color: 'var(--text-primary)' }}>{formatCloudCover(beforeScene)}</strong>
                    </div>
                    <div>
                      <span style={{ color: 'var(--text-dim)' }}>TILE:</span>{' '}
                      <strong style={{ color: 'var(--text-primary)' }}>{beforeScene.tile || beforeScene.scene_id?.split('_')[5] || '--'}</strong>
                    </div>
                    <div>
                      <span style={{ color: 'var(--text-dim)' }}>PLATFORM:</span>{' '}
                      <strong style={{ color: 'var(--text-primary)' }}>{beforeScene.satellite || 'Sentinel-2'} ({beforeScene.processing_level || 'L2A'})</strong>
                    </div>
                  </div>
                </div>
              ) : (
                <div style={{ padding: '24px 12px', textAlign: 'center', color: 'var(--text-dim)', fontSize: '12px' }}>
                  No baseline scene assigned. Select from the Copernicus catalog below or click &ldquo;LOAD VERIFIED TEST PAIR&rdquo;.
                </div>
              )}
            </div>

            {/* AFTER SCENE CARD */}
            <div
              style={{
                backgroundColor: 'rgba(2, 6, 23, 0.45)',
                border: '1px solid',
                borderColor: hasAfter ? 'rgba(245, 158, 11, 0.35)' : 'var(--border-subtle)',
                borderRadius: '6px',
                padding: '16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span className="ew-panel-tag" style={{ background: 'rgba(245, 158, 11, 0.12)', color: '#f59e0b', borderColor: 'rgba(245, 158, 11, 0.3)' }}>
                  AFTER ACQUISITION (T1 REVISIT)
                </span>
                {hasAfter && (
                  <button
                    type="button"
                    onClick={() => setAfterScene(null)}
                    style={{ background: 'transparent', border: 'none', color: 'var(--text-dim)', cursor: 'pointer', fontSize: '11px', padding: '2px 6px' }}
                  >
                    REMOVE
                  </button>
                )}
              </div>

              {hasAfter ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '11px' }}>
                  <div>
                    <div style={{ fontSize: '9px', fontFamily: 'var(--font-mono)', color: 'var(--text-dim)', marginBottom: '2px' }}>SCENE IDENTIFIER</div>
                    <div style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-primary)', wordBreak: 'break-all', fontWeight: 600, fontSize: '11px' }}>
                      {afterScene.scene_id}
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', paddingTop: '4px' }}>
                    <div>
                      <span style={{ color: 'var(--text-dim)' }}>ACQUIRED:</span>{' '}
                      <strong style={{ color: 'var(--text-primary)' }}>{formatUtcDateTime(afterScene.acquisition_datetime)}</strong>
                    </div>
                    <div>
                      <span style={{ color: 'var(--text-dim)' }}>CLOUD COVER:</span>{' '}
                      <strong style={{ color: 'var(--text-primary)' }}>{formatCloudCover(afterScene)}</strong>
                    </div>
                    <div>
                      <span style={{ color: 'var(--text-dim)' }}>TILE:</span>{' '}
                      <strong style={{ color: 'var(--text-primary)' }}>{afterScene.tile || afterScene.scene_id?.split('_')[5] || '--'}</strong>
                    </div>
                    <div>
                      <span style={{ color: 'var(--text-dim)' }}>PLATFORM:</span>{' '}
                      <strong style={{ color: 'var(--text-primary)' }}>{afterScene.satellite || 'Sentinel-2'} ({afterScene.processing_level || 'L2A'})</strong>
                    </div>
                  </div>
                </div>
              ) : (
                <div style={{ padding: '24px 12px', textAlign: 'center', color: 'var(--text-dim)', fontSize: '12px' }}>
                  No revisit scene assigned. Select from the Copernicus catalog below or click &ldquo;LOAD VERIFIED TEST PAIR&rdquo;.
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* 4. Optional STAC Catalog Scene Discovery Drawer */}
      {showCatalog && (
        <section className="ew-panel" aria-label="Copernicus Catalog Discovery">
          <div className="ew-panel-header">
            <div className="ew-panel-title-wrap">
              <FilterIcon size={14} className="ew-panel-icon" />
              <h3 className="ew-panel-title">COPERNICUS STAC CATALOG SEARCH</h3>
            </div>
            <span className="ew-panel-tag">SENTINEL-2 L2A</span>
          </div>

          <div className="ew-panel-body" style={{ padding: '16px' }}>
            <form onSubmit={handleSearch} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', alignItems: 'end', marginBottom: '16px' }}>
              <div className="ew-form-group" style={{ marginBottom: 0 }}>
                <label className="ew-form-label">
                  <MapPinIcon size={12} className="ew-label-icon" />
                  <span>TARGET LOCATION</span>
                </label>
                <select
                  className="ew-select"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  disabled={searchStatus === 'searching'}
                >
                  {SUPPORTED_LOCATIONS.map((loc) => (
                    <option key={loc} value={loc}>{loc}</option>
                  ))}
                </select>
              </div>

              <div className="ew-form-group" style={{ marginBottom: 0 }}>
                <label className="ew-form-label">
                  <CalendarIcon size={12} className="ew-label-icon" />
                  <span>START DATE</span>
                </label>
                <input
                  type="date"
                  className="ew-input"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  disabled={searchStatus === 'searching'}
                />
              </div>

              <div className="ew-form-group" style={{ marginBottom: 0 }}>
                <label className="ew-form-label">
                  <CalendarIcon size={12} className="ew-label-icon" />
                  <span>END DATE</span>
                </label>
                <input
                  type="date"
                  className="ew-input"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  disabled={searchStatus === 'searching'}
                />
              </div>

              <div className="ew-form-group" style={{ marginBottom: 0 }}>
                <label className="ew-form-label">
                  <span>MAX CLOUD: {maxCloudCover}%</span>
                </label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={maxCloudCover}
                  onChange={(e) => setMaxCloudCover(e.target.value)}
                  disabled={searchStatus === 'searching'}
                  style={{ width: '100%', accentColor: 'var(--accent-cyan)' }}
                />
              </div>

              <div>
                <button
                  type="submit"
                  className="ew-btn ew-btn-primary"
                  style={{ width: '100%', height: '36px' }}
                  disabled={searchStatus === 'searching'}
                >
                  {searchStatus === 'searching' ? 'QUERYING STAC...' : 'SEARCH CATALOG'}
                </button>
              </div>
            </form>

            {/* Error Message */}
            {searchStatus === 'error' && (
              <div className="ew-alert-banner ew-alert-error" style={{ marginBottom: '12px' }}>
                <span className="ew-alert-text">{errorMessage}</span>
              </div>
            )}

            {/* Results Grid */}
            {searchStatus === 'zero_results' && (
              <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-dim)', fontSize: '12px' }}>
                No Sentinel-2 scenes matched query filters in the selected observation window.
              </div>
            )}

            {discoveredScenes.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '280px', overflowY: 'auto' }}>
                {discoveredScenes.map((scene) => {
                  const isBefore = beforeScene?.scene_id === scene.scene_id;
                  const isAfter = afterScene?.scene_id === scene.scene_id;
                  return (
                    <div
                      key={scene.scene_id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '10px 14px',
                        backgroundColor: 'rgba(255, 255, 255, 0.03)',
                        border: '1px solid var(--border-subtle)',
                        borderRadius: '4px',
                        fontSize: '11px',
                        gap: '12px'
                      }}
                    >
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-primary)', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {scene.scene_id}
                        </div>
                        <div style={{ display: 'flex', gap: '12px', color: 'var(--text-dim)', marginTop: '2px', fontSize: '10px' }}>
                          <span>DATE: {formatUtcDate(scene.acquisition_datetime)}</span>
                          <span>CLOUD: {formatCloudCover(scene)}</span>
                          <span>TILE: {scene.tile || scene.scene_id.split('_')[5] || '--'}</span>
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                        <button
                          type="button"
                          className="ew-btn"
                          style={{
                            fontSize: '10px',
                            padding: '3px 8px',
                            backgroundColor: isBefore ? 'var(--accent-blue)' : 'rgba(56, 189, 248, 0.1)',
                            color: isBefore ? '#fff' : 'var(--accent-blue)',
                            borderColor: 'rgba(56, 189, 248, 0.4)'
                          }}
                          onClick={() => handleSetBefore(scene)}
                        >
                          {isBefore ? '✓ BEFORE' : 'SET AS BEFORE'}
                        </button>
                        <button
                          type="button"
                          className="ew-btn"
                          style={{
                            fontSize: '10px',
                            padding: '3px 8px',
                            backgroundColor: isAfter ? '#f59e0b' : 'rgba(245, 158, 11, 0.1)',
                            color: isAfter ? '#fff' : '#f59e0b',
                            borderColor: 'rgba(245, 158, 11, 0.4)'
                          }}
                          onClick={() => handleSetAfter(scene)}
                        >
                          {isAfter ? '✓ AFTER' : 'SET AS AFTER'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>
      )}

      {/* 5. Analytical Execution Engine Tabs */}
      <section className="ew-panel" aria-label="Change Detection Product Selector">
        <div className="ew-panel-header">
          <div className="ew-panel-title-wrap">
            <ActivityIcon size={14} className="ew-panel-icon" />
            <h3 className="ew-panel-title">CHANGE DETECTION PRODUCTS</h3>
          </div>

          {/* Product Tabs */}
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              type="button"
              onClick={() => setActiveProductTab('ndvi')}
              className={`ew-btn ${activeProductTab === 'ndvi' ? 'ew-btn-primary' : 'ew-btn-secondary'}`}
              style={{
                height: '30px',
                padding: '0 14px',
                fontSize: '11px',
                color: activeProductTab === 'ndvi' ? '#4ade80' : 'var(--text-secondary)',
                borderColor: activeProductTab === 'ndvi' ? '#22c55e' : 'var(--border-subtle)'
              }}
            >
              NDVI VEGETATION CHANGE
            </button>
            <button
              type="button"
              onClick={() => setActiveProductTab('ndwi')}
              className={`ew-btn ${activeProductTab === 'ndwi' ? 'ew-btn-primary' : 'ew-btn-secondary'}`}
              style={{
                height: '30px',
                padding: '0 14px',
                fontSize: '11px',
                color: activeProductTab === 'ndwi' ? 'var(--accent-blue)' : 'var(--text-secondary)',
                borderColor: activeProductTab === 'ndwi' ? 'var(--accent-cyan)' : 'var(--border-subtle)'
              }}
            >
              NDWI WATER-SIGNAL CHANGE
            </button>
          </div>
        </div>

        <div className="ew-panel-body" style={{ padding: '16px' }}>
          {/* Active Product Panel */}
          {isPairComplete && isTemporalValid ? (
            <>
              {activeProductTab === 'ndvi' && (
                <ChangeDetectionPairPanel beforeScene={beforeScene} afterScene={afterScene} onAnalysisSuccess={(type, data) => onAnalysisSuccess?.(beforeScene, afterScene, type, data)} />
              )}
              {activeProductTab === 'ndwi' && (
                <NdwiChangeDetectionPanel beforeScene={beforeScene} afterScene={afterScene} onAnalysisSuccess={(type, data) => onAnalysisSuccess?.(beforeScene, afterScene, type, data)} />
              )}
            </>
          ) : (
            <div
              style={{
                minHeight: '260px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                textAlign: 'center',
                padding: '32px',
                border: '1px dashed var(--border-subtle)',
                borderRadius: '6px'
              }}
            >
              <LayersIcon size={36} style={{ color: 'var(--text-dim)', marginBottom: '12px' }} />
              <h4 style={{ margin: '0 0 6px 0', fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>
                {!isPairComplete ? 'TEMPORAL PAIR INCOMPLETE' : 'TEMPORAL ORDER INVALID'}
              </h4>
              <p style={{ margin: 0, maxWidth: '440px', fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                {!isPairComplete
                  ? 'Both a BEFORE (T0 baseline) and an AFTER (T1 revisit) Sentinel-2 acquisition are required to compute change difference rasters. Click "LOAD VERIFIED TEST PAIR (T43RGN)" above to execute immediate verification.'
                  : 'BEFORE acquisition timestamp must be strictly earlier than AFTER acquisition timestamp. Click "SWAP PAIR" to reverse the chronological order.'}
              </p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
