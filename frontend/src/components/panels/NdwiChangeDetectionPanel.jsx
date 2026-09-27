import React, { useState, useEffect, useRef } from 'react';
import { API_ENDPOINTS } from '../../config/api';

/**
 * Calculates continuous, scientifically intuitive RGBA color for an NDWI change float value.
 *
 * Interpretation thresholds:
 * - ΔNDWI <= -0.20: Significant water-signal loss (crimson / deep red)
 * - -0.20 < ΔNDWI <= -0.05: Moderate water-signal loss (orange / amber)
 * - -0.05 < ΔNDWI < +0.05: Stable water-signal (neutral grey)
 * - +0.05 <= ΔNDWI < +0.20: Moderate water-signal gain (light green)
 * - ΔNDWI >= +0.20: Significant water-signal gain (deep green)
 */
function getNdwiChangeColor(val) {
  if (isNaN(val)) {
    return [0, 0, 0, 0]; // Transparent for NoData
  }

  const v = Math.max(-1.0, Math.min(1.0, val));

  if (v <= -0.20) {
    // Significant loss: [-1.0, -0.20]
    const t = Math.min(1.0, Math.max(0.0, (v + 1.0) / 0.8));
    const r = Math.round(185 + t * 54);
    const g = Math.round(28 + t * 40);
    const b = Math.round(28 + t * 40);
    return [r, g, b, 255];
  } else if (v <= -0.05) {
    // Moderate loss: (-0.20, -0.05]
    const t = (v - (-0.20)) / 0.15;
    const r = Math.round(239 + t * 6);
    const g = Math.round(68 + t * 90);
    const b = Math.round(68 - t * 57);
    return [r, g, b, 255];
  } else if (v < 0.05) {
    // Stable: (-0.05, 0.05)
    const t = (v - (-0.05)) / 0.10;
    const r = Math.round(140 + t * 16);
    const g = Math.round(155 + t * 16);
    const b = Math.round(175 + t * 16);
    return [r, g, b, 255];
  } else if (v < 0.20) {
    // Moderate gain: [0.05, 0.20)
    const t = (v - 0.05) / 0.15;
    const r = Math.round(134 - t * 60);
    const g = Math.round(239 - t * 17);
    const b = Math.round(172 - t * 44);
    return [r, g, b, 255];
  } else {
    // Significant gain: [0.20, 1.0]
    const t = Math.min(1.0, (v - 0.20) / 0.8);
    const r = Math.round(34 - t * 13);
    const g = Math.round(197 - t * 69);
    const b = Math.round(94 - t * 33);
    return [r, g, b, 255];
  }
}

export function NdwiChangeDetectionPanel({ beforeScene, afterScene, onAnalysisSuccess }) {
  const [status, setStatus] = useState('ready'); // 'ready' | 'loading' | 'success' | 'error'
  const [errorMsg, setErrorMsg] = useState('');
  const [changeData, setChangeData] = useState(null);
  const [prevBeforeId, setPrevBeforeId] = useState(beforeScene?.scene_id);
  const [prevAfterId, setPrevAfterId] = useState(afterScene?.scene_id);
  const canvasRef = useRef(null);

  // Automatically reset stale results when scene pair changes
  if (beforeScene?.scene_id !== prevBeforeId || afterScene?.scene_id !== prevAfterId) {
    setPrevBeforeId(beforeScene?.scene_id);
    setPrevAfterId(afterScene?.scene_id);
    setStatus('ready');
    setChangeData(null);
    setErrorMsg('');
  }

  const runAnalysis = async () => {
    if (status === 'loading') return;
    setStatus('loading');
    setErrorMsg('');
    setChangeData(null);

    try {
      const response = await fetch(API_ENDPOINTS.ndwiChange, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          before_scene_id: beforeScene.scene_id,
          after_scene_id: afterScene.scene_id,
          x: 0,
          y: 0,
          width: 512,
          height: 512,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.detail || 'NDWI change analysis failed.');
      }

      setChangeData(data);
      setStatus('success');
      onAnalysisSuccess?.('ndwi', data);
    } catch (e) {
      console.error(e);
      setStatus('error');
      setErrorMsg(e.message || 'Unable to perform NDWI change detection.');
    }
  };

  // Render real Float32 NDWI change matrix on HTML5 Canvas
  useEffect(() => {
    if (status !== 'success' || !changeData?.matrix_b64 || !canvasRef.current) return;

    try {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      const width = changeData.width || 512;
      const height = changeData.height || 512;

      canvas.width = width;
      canvas.height = height;

      // Decode Base64 Float32 array
      const binaryString = atob(changeData.matrix_b64);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      const floatArray = new Float32Array(bytes.buffer);

      const imgData = ctx.createImageData(width, height);
      for (let i = 0; i < floatArray.length; i++) {
        const val = floatArray[i];
        const idx = i * 4;
        const [r, g, b, a] = getNdwiChangeColor(val);
        imgData.data[idx] = r;
        imgData.data[idx + 1] = g;
        imgData.data[idx + 2] = b;
        imgData.data[idx + 3] = a;
      }
      ctx.putImageData(imgData, 0, 0);
    } catch (err) {
      console.error('Failed to render NDWI change canvas:', err);
    }
  }, [status, changeData]);

  const getIntervalDays = () => {
    if (!beforeScene || !afterScene) return null;
    const d1 = new Date(beforeScene.acquisition_datetime);
    const d2 = new Date(afterScene.acquisition_datetime);
    return Math.round((d2 - d1) / (1000 * 60 * 60 * 24));
  };

  const isReady = beforeScene && afterScene;
  const interval = getIntervalDays();

  const formatCloudCover = (scene) => {
    if (!scene) return '--';
    const cc = scene.cloud_cover ?? scene['eo:cloud_cover'] ?? scene.properties?.['eo:cloud_cover'];
    if (cc === null || cc === undefined || cc === '' || isNaN(cc)) return '--';
    return `${Number(cc).toFixed(1)}%`;
  };

  return (
    <div className="ew-selected-scene-card" style={{ marginTop: '16px' }}>
      <div className="ew-selected-header">
        <span className="ew-selected-tag">
          {status === 'loading'
            ? 'ANALYZING WATER-SIGNAL CHANGE...'
            : status === 'success'
            ? 'NDWI CHANGE / COMPLETE'
            : 'NDWI WATER-SIGNAL CHANGE'}
        </span>
        <h3 className="ew-selected-title" style={{ color: isReady ? '#38bdf8' : '#94a3b8' }}>
          {isReady ? (status === 'success' ? 'ANALYSIS COMPLETE' : 'READY') : 'PAIR NOT SELECTED'}
        </h3>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '11px', color: '#cbd5e1', paddingTop: '12px' }}>
        {/* BEFORE SCENE */}
        <div style={{ backgroundColor: 'rgba(255,255,255,0.05)', padding: '8px', borderRadius: '4px' }}>
          <h4 style={{ margin: '0 0 8px 0', color: '#38bdf8' }}>BEFORE SCENE</h4>
          {beforeScene ? (
            <>
              <div style={{ marginBottom: '4px', wordBreak: 'break-all' }}>
                <strong>ID:</strong> {beforeScene.scene_id}
              </div>
              <div style={{ marginBottom: '4px' }}>
                <strong>Date:</strong> {new Date(beforeScene.acquisition_datetime).toISOString().split('T')[0]}
              </div>
              <div>
                <strong>Cloud cover:</strong> {formatCloudCover(beforeScene)}
              </div>
            </>
          ) : (
            <div style={{ color: '#94a3b8' }}>Not selected</div>
          )}
        </div>

        {/* AFTER SCENE */}
        <div style={{ backgroundColor: 'rgba(255,255,255,0.05)', padding: '8px', borderRadius: '4px' }}>
          <h4 style={{ margin: '0 0 8px 0', color: '#f59e0b' }}>AFTER SCENE</h4>
          {afterScene ? (
            <>
              <div style={{ marginBottom: '4px', wordBreak: 'break-all' }}>
                <strong>ID:</strong> {afterScene.scene_id}
              </div>
              <div style={{ marginBottom: '4px' }}>
                <strong>Date:</strong> {new Date(afterScene.acquisition_datetime).toISOString().split('T')[0]}
              </div>
              <div>
                <strong>Cloud cover:</strong> {formatCloudCover(afterScene)}
              </div>
            </>
          ) : (
            <div style={{ color: '#94a3b8' }}>Not selected</div>
          )}
        </div>
      </div>

      {isReady && interval !== null && (
        <div
          style={{
            marginTop: '12px',
            textAlign: 'center',
            fontSize: '12px',
            color: '#fff',
            backgroundColor: 'rgba(255,255,255,0.1)',
            padding: '6px',
            borderRadius: '4px',
          }}
        >
          <strong>TEMPORAL INTERVAL:</strong> {interval} DAYS
        </div>
      )}

      {isReady && status === 'ready' && (
        <div style={{ marginTop: '16px' }}>
          <button
            type="button"
            className="ew-btn-action ew-btn-action-ndwi"
            onClick={runAnalysis}
            disabled={status === 'loading'}
          >
            RUN NDWI CHANGE ANALYSIS
          </button>
        </div>
      )}

      {status === 'loading' && (
        <div className="ew-status-block ew-status-block-loading" style={{ marginTop: '16px' }}>
          <span className="ew-btn-spinner" />
          <span>ANALYZING WATER-SIGNAL CHANGE (512 &times; 512 px)...</span>
        </div>
      )}

      {status === 'error' && (
        <div className="ew-status-block ew-status-block-error" style={{ marginTop: '16px' }}>
          <div style={{ fontWeight: 700, marginBottom: '2px' }}>CHANGE ANALYSIS FAILED</div>
          <div>{errorMsg}</div>
        </div>
      )}

      {status === 'success' && changeData && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '16px' }}>
          {/* Standardized Metric Cards: Stats */}
          <div>
            <div style={{ fontSize: '10px', fontFamily: 'var(--font-mono)', color: 'var(--text-dim)', marginBottom: '6px', letterSpacing: '0.08em' }}>
              NDWI WATER SIGNAL CHANGE METRICS
            </div>
            <div className="ew-metric-grid">
              <div className="ew-metric-card">
                <span className="ew-metric-label">BEFORE MEAN</span>
                <span className="ew-metric-value" style={{ color: 'var(--accent-blue)' }}>{changeData.before?.mean?.toFixed(4)}</span>
                <span className="ew-metric-subtext">Pre-Acquisition</span>
              </div>
              <div className="ew-metric-card">
                <span className="ew-metric-label">AFTER MEAN</span>
                <span className="ew-metric-value" style={{ color: '#38bdf8' }}>{changeData.after?.mean?.toFixed(4)}</span>
                <span className="ew-metric-subtext">Post-Acquisition</span>
              </div>
              <div className="ew-metric-card">
                <span className="ew-metric-label">MEAN SHIFT (&Delta;)</span>
                <span className="ew-metric-value" style={{ color: changeData.change?.mean >= 0 ? '#38bdf8' : '#f87171' }}>
                  {changeData.change?.mean >= 0 ? '+' : ''}{changeData.change?.mean?.toFixed(4)}
                </span>
                <span className="ew-metric-subtext">Net Shift</span>
              </div>
              <div className="ew-metric-card">
                <span className="ew-metric-label">MEDIAN SHIFT</span>
                <span className="ew-metric-value">
                  {changeData.change?.median >= 0 ? '+' : ''}{changeData.change?.median?.toFixed(4)}
                </span>
                <span className="ew-metric-subtext">50th Percentile</span>
              </div>
              <div className="ew-metric-card">
                <span className="ew-metric-label">VALID PIXELS</span>
                <span className="ew-metric-value">{changeData.change?.valid_pixel_count?.toLocaleString()}</span>
                <span className="ew-metric-subtext">0 NoData</span>
              </div>
            </div>
          </div>

          {/* Standardized Metric Cards: Classifications */}
          <div>
            <div style={{ fontSize: '10px', fontFamily: 'var(--font-mono)', color: 'var(--text-dim)', marginBottom: '6px', letterSpacing: '0.08em' }}>
              WATER-SIGNAL CHANGE CLASSIFICATIONS
            </div>
            <div className="ew-metric-grid">
              <div className="ew-metric-card">
                <span className="ew-metric-label">SIGNIFICANT LOSS</span>
                <span className="ew-metric-value" style={{ color: '#ef4444' }}>{changeData.significant_loss_count?.toLocaleString()}</span>
                <span className="ew-metric-subtext">{changeData.significant_loss_percentage}% (&le; -0.20)</span>
              </div>
              <div className="ew-metric-card">
                <span className="ew-metric-label">MODERATE LOSS</span>
                <span className="ew-metric-value" style={{ color: '#f97316' }}>{changeData.moderate_loss_count?.toLocaleString()}</span>
                <span className="ew-metric-subtext">{changeData.moderate_loss_percentage}% (-0.20 to -0.05)</span>
              </div>
              <div className="ew-metric-card">
                <span className="ew-metric-label">STABLE SIGNAL</span>
                <span className="ew-metric-value" style={{ color: '#94a3b8' }}>{changeData.stable_count?.toLocaleString()}</span>
                <span className="ew-metric-subtext">{changeData.stable_percentage}% (&plusmn;0.05)</span>
              </div>
              <div className="ew-metric-card">
                <span className="ew-metric-label">MODERATE GAIN</span>
                <span className="ew-metric-value" style={{ color: '#86efac' }}>{changeData.moderate_gain_count?.toLocaleString()}</span>
                <span className="ew-metric-subtext">{changeData.moderate_gain_percentage}% (+0.05 to +0.20)</span>
              </div>
              <div className="ew-metric-card">
                <span className="ew-metric-label">SIGNIFICANT GAIN</span>
                <span className="ew-metric-value" style={{ color: '#22c55e' }}>{changeData.significant_gain_count?.toLocaleString()}</span>
                <span className="ew-metric-subtext">{changeData.significant_gain_percentage}% (&ge; +0.20)</span>
              </div>
            </div>
          </div>

          {/* Metadata Display */}
          <div style={{ fontSize: '11px', color: 'var(--text-dim)', fontFamily: 'var(--font-mono)', lineHeight: '1.5' }}>
            <strong>CRS:</strong> {changeData.crs} &nbsp;|&nbsp;
            <strong>Resolution:</strong> {changeData.resolution}m &nbsp;|&nbsp;
            <strong>Window:</strong> 512 &times; 512
            {changeData.metadata?.tile && (
              <> &nbsp;|&nbsp; <strong>Tile:</strong> {changeData.metadata.tile}</>
            )}
            {changeData.metadata?.before_acquisition && (
              <div><strong>Before:</strong> {changeData.metadata.before_acquisition}</div>
            )}
            {changeData.metadata?.after_acquisition && (
              <div><strong>After:</strong> {changeData.metadata.after_acquisition}</div>
            )}
          </div>

          {/* Real NDWI Change Canvas Visualization */}
          <div>
            <div style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)', marginBottom: '8px', fontWeight: 600 }}>
              SENTINEL-2 NDWI CHANGE DIFFERENCE MAP
            </div>
            <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
              <div className="ew-canvas-frame">
                <canvas
                  ref={canvasRef}
                  className="ew-canvas-element"
                  role="img"
                  aria-label="Sentinel-2 NDWI Water Signal Change Difference Surface"
                />
              </div>

              {/* Compact Legend */}
              <div className="ew-canvas-legend">
                <strong style={{ color: 'var(--text-primary)', marginBottom: '4px' }}>CHANGE CATEGORIES</strong>
                <div className="ew-canvas-legend-item">
                  <span className="ew-canvas-legend-swatch" style={{ backgroundColor: 'rgb(21, 128, 61)' }} />
                  <span>Significant Gain (&ge; +0.20)</span>
                </div>
                <div className="ew-canvas-legend-item">
                  <span className="ew-canvas-legend-swatch" style={{ backgroundColor: 'rgb(134, 239, 172)' }} />
                  <span>Moderate Gain (+0.05 to +0.20)</span>
                </div>
                <div className="ew-canvas-legend-item">
                  <span className="ew-canvas-legend-swatch" style={{ backgroundColor: 'rgb(148, 163, 184)' }} />
                  <span>Stable (&plusmn;0.05)</span>
                </div>
                <div className="ew-canvas-legend-item">
                  <span className="ew-canvas-legend-swatch" style={{ backgroundColor: 'rgb(249, 115, 22)' }} />
                  <span>Moderate Loss (-0.20 to -0.05)</span>
                </div>
                <div className="ew-canvas-legend-item">
                  <span className="ew-canvas-legend-swatch" style={{ backgroundColor: 'rgb(185, 28, 28)' }} />
                  <span>Significant Loss (&le; -0.20)</span>
                </div>

                <div style={{ marginTop: '6px', fontStyle: 'italic', color: 'var(--text-dim)', fontSize: '9px', lineHeight: '1.3' }}>
                  NDWI difference represents spectral water-signal change between acquisitions; it is not confirmed physical water delineation.
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
