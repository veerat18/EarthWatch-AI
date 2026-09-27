import React, { useState, useEffect, useRef } from 'react';
import { API_ENDPOINTS } from '../../config/api';

/**
 * Calculates continuous, scientifically intuitive RGBA color for an NDWI float value.
 *
 * Interpretation thresholds:
 * - NDWI < 0.0: Non-water / low water signal (earthy tan/brown)
 * - 0.0 <= NDWI < 0.2: Low water signal (soft cyan-green/moisture)
 * - 0.2 <= NDWI < 0.4: Moderate water signal (bright azure blue)
 * - NDWI >= 0.4: High water signal (deep cobalt blue)
 */
function getNdwiColor(val) {
  if (isNaN(val)) {
    return [0, 0, 0, 0]; // Transparent for NoData
  }

  const v = Math.max(-1.0, Math.min(1.0, val));

  if (v < 0.0) {
    const t = v + 1.0;
    const r = Math.round(180 + t * 40);
    const g = Math.round(160 + t * 45);
    const b = Math.round(130 + t * 45);
    return [r, g, b, 255];
  } else if (v < 0.2) {
    const t = v / 0.2;
    const r = Math.round(180 - t * 60);
    const g = Math.round(230 - t * 25);
    const b = Math.round(220 + t * 20);
    return [r, g, b, 255];
  } else if (v < 0.4) {
    const t = (v - 0.2) / 0.2;
    const r = Math.round(120 - t * 90);
    const g = Math.round(205 - t * 61);
    const b = Math.round(240 + t * 15);
    return [r, g, b, 255];
  } else {
    const t = Math.min(1.0, (v - 0.4) / 0.6);
    const r = Math.round(30 - t * 20);
    const g = Math.round(144 - t * 94);
    const b = Math.round(255 - t * 95);
    return [r, g, b, 255];
  }
}

export function NdwiAnalysisPanel({ selectedScene }) {
  const [status, setStatus] = useState('ready'); // 'ready' | 'loading' | 'success' | 'error'
  const [errorMsg, setErrorMsg] = useState('');
  const [ndwiData, setNdwiData] = useState(null);
  const [prevSceneId, setPrevSceneId] = useState(selectedScene?.scene_id);
  const canvasRef = useRef(null);

  // Clear stale NDWI state when the selected scene changes
  if (selectedScene?.scene_id !== prevSceneId) {
    setPrevSceneId(selectedScene?.scene_id);
    setStatus('ready');
    setNdwiData(null);
    setErrorMsg('');
  }

  const runAnalysis = async () => {
    if (status === 'loading') return;
    setStatus('loading');
    setErrorMsg('');
    setNdwiData(null);

    try {
      const response = await fetch(API_ENDPOINTS.ndwi, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          scene_id: selectedScene.scene_id,
          x: 0,
          y: 0,
          width: 512,
          height: 512,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.detail || 'Failed to analyze NDWI');
      }

      setNdwiData(data);
      setStatus('success');
    } catch (e) {
      console.error(e);
      setStatus('error');
      setErrorMsg(e.message || 'Unable to perform NDWI analysis.');
    }
  };

  useEffect(() => {
    if (status !== 'success' || !ndwiData?.matrix_b64 || !canvasRef.current) return;

    try {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      const width = ndwiData.width || 512;
      const height = ndwiData.height || 512;

      canvas.width = width;
      canvas.height = height;

      const binaryString = atob(ndwiData.matrix_b64);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      const floatArray = new Float32Array(bytes.buffer);

      const imgData = ctx.createImageData(width, height);
      for (let i = 0; i < floatArray.length; i++) {
        const val = floatArray[i];
        const idx = i * 4;
        const [r, g, b, a] = getNdwiColor(val);
        imgData.data[idx] = r;
        imgData.data[idx + 1] = g;
        imgData.data[idx + 2] = b;
        imgData.data[idx + 3] = a;
      }
      ctx.putImageData(imgData, 0, 0);
    } catch (err) {
      console.error('Failed to render NDWI canvas:', err);
    }
  }, [status, ndwiData]);

  if (!selectedScene) return null;

  return (
    <div className="ew-selected-scene-card" style={{ marginTop: '16px' }}>
      <div className="ew-selected-header">
        <span className="ew-selected-tag">
          {status === 'loading'
            ? 'ANALYZING SATELLITE RASTER...'
            : status === 'success'
            ? 'NDWI ANALYSIS / COMPLETE'
            : 'NDWI ANALYSIS / READY'}
        </span>
        <h3 className="ew-selected-title" style={{ color: 'var(--accent-blue)' }}>NDWI WATER INTELLIGENCE</h3>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '12px 0' }}>
        <div style={{ fontSize: '11px', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
          <strong>SCENE:</strong> {selectedScene.scene_id} <br />
          <strong>WINDOW:</strong> 512 &times; 512 px (10m Resolution)
        </div>

        {status === 'ready' && (
          <button
            type="button"
            className="ew-btn-action ew-btn-action-ndwi"
            onClick={runAnalysis}
            disabled={status === 'loading'}
          >
            RUN NDWI ANALYSIS
          </button>
        )}

        {status === 'loading' && (
          <div className="ew-status-block ew-status-block-loading">
            <span className="ew-btn-spinner" />
            <span>ANALYZING SATELLITE RASTER (NDWI)...</span>
          </div>
        )}

        {status === 'error' && (
          <div className="ew-status-block ew-status-block-error">
            <div style={{ fontWeight: 700, marginBottom: '2px' }}>ANALYSIS FAILED</div>
            <div>{errorMsg}</div>
          </div>
        )}

        {status === 'success' && ndwiData && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Standardized Metric Cards: Stats */}
            <div>
              <div style={{ fontSize: '10px', fontFamily: 'var(--font-mono)', color: 'var(--text-dim)', marginBottom: '6px', letterSpacing: '0.08em' }}>
                MEASURED NDWI METRICS
              </div>
              <div className="ew-metric-grid">
                <div className="ew-metric-card">
                  <span className="ew-metric-label">MEAN NDWI</span>
                  <span className="ew-metric-value" style={{ color: 'var(--accent-blue)' }}>{ndwiData.mean.toFixed(4)}</span>
                  <span className="ew-metric-subtext">Spatial Average</span>
                </div>
                <div className="ew-metric-card">
                  <span className="ew-metric-label">MEDIAN NDWI</span>
                  <span className="ew-metric-value">{ndwiData.median.toFixed(4)}</span>
                  <span className="ew-metric-subtext">50th Percentile</span>
                </div>
                <div className="ew-metric-card">
                  <span className="ew-metric-label">RANGE [MIN, MAX]</span>
                  <span className="ew-metric-value" style={{ fontSize: '12px' }}>[{ndwiData.min.toFixed(3)}, {ndwiData.max.toFixed(3)}]</span>
                  <span className="ew-metric-subtext">Extreme bounds</span>
                </div>
                <div className="ew-metric-card">
                  <span className="ew-metric-label">VALID PIXELS</span>
                  <span className="ew-metric-value">{ndwiData.valid_pixel_count.toLocaleString()}</span>
                  <span className="ew-metric-subtext">0 NoData</span>
                </div>
              </div>
            </div>

            {/* Standardized Metric Cards: Classification */}
            <div>
              <div style={{ fontSize: '10px', fontFamily: 'var(--font-mono)', color: 'var(--text-dim)', marginBottom: '6px', letterSpacing: '0.08em' }}>
                WATER SIGNAL CLASSIFICATION
              </div>
              <div className="ew-metric-grid">
                <div className="ew-metric-card">
                  <span className="ew-metric-label">NON-WATER / LOW</span>
                  <span className="ew-metric-value">{ndwiData.non_water_or_low_signal_count.toLocaleString()}</span>
                  <span className="ew-metric-subtext">{ndwiData.non_water_or_low_signal_percentage}% (NDWI &lt; 0.0)</span>
                </div>
                <div className="ew-metric-card">
                  <span className="ew-metric-label">LOW WATER SIGNAL</span>
                  <span className="ew-metric-value">{ndwiData.low_water_signal_count.toLocaleString()}</span>
                  <span className="ew-metric-subtext">{ndwiData.low_water_signal_percentage}% (0.0 to 0.2)</span>
                </div>
                <div className="ew-metric-card">
                  <span className="ew-metric-label">MODERATE SIGNAL</span>
                  <span className="ew-metric-value">{ndwiData.moderate_water_signal_count.toLocaleString()}</span>
                  <span className="ew-metric-subtext">{ndwiData.moderate_water_signal_percentage}% (0.2 to 0.4)</span>
                </div>
                <div className="ew-metric-card">
                  <span className="ew-metric-label">HIGH WATER SIGNAL</span>
                  <span className="ew-metric-value">{ndwiData.high_water_signal_count.toLocaleString()}</span>
                  <span className="ew-metric-subtext">{ndwiData.high_water_signal_percentage}% (&ge; 0.4)</span>
                </div>
              </div>
            </div>

            <div style={{ fontSize: '11px', color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>
              <strong>CRS:</strong> {ndwiData.crs} &nbsp;|&nbsp; <strong>Resolution:</strong> {ndwiData.resolution}m
            </div>

            {/* Real NDWI Canvas Visualization */}
            <div>
              <div style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)', marginBottom: '8px', fontWeight: 600 }}>
                SENTINEL-2 NDWI SURFACE VISUALIZATION
              </div>
              <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
                <div className="ew-canvas-frame">
                  <canvas
                    ref={canvasRef}
                    className="ew-canvas-element"
                    role="img"
                    aria-label="Sentinel-2 NDWI Water Signal Surface Visualization"
                  />
                </div>

                {/* Compact Legend */}
                <div className="ew-canvas-legend">
                  <strong style={{ color: 'var(--text-primary)', marginBottom: '4px' }}>WATER SIGNAL INDEX</strong>
                  <div className="ew-canvas-legend-item">
                    <span className="ew-canvas-legend-swatch" style={{ backgroundColor: 'rgb(10, 50, 160)' }} />
                    <span>&ge; 0.40 High Signal</span>
                  </div>
                  <div className="ew-canvas-legend-item">
                    <span className="ew-canvas-legend-swatch" style={{ backgroundColor: 'rgb(30, 144, 255)' }} />
                    <span>0.20 – 0.40 Moderate</span>
                  </div>
                  <div className="ew-canvas-legend-item">
                    <span className="ew-canvas-legend-swatch" style={{ backgroundColor: 'rgb(120, 205, 240)' }} />
                    <span>0.00 – 0.20 Low Signal</span>
                  </div>
                  <div className="ew-canvas-legend-item">
                    <span className="ew-canvas-legend-swatch" style={{ backgroundColor: 'rgb(220, 205, 175)' }} />
                    <span>&lt; 0.00 Non-water / Low</span>
                  </div>
                  <div style={{ marginTop: '6px', fontStyle: 'italic', color: 'var(--text-dim)', fontSize: '9px', lineHeight: 1.3 }}>
                    Note: Analytical water signals only; not confirmed water delineation.
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
