import React, { useEffect, useRef } from 'react';
import { ActivityIcon, CalendarIcon, LayersIcon, RadarIcon } from '../components/common/Icons';

function getNdviColor(val) {
  if (isNaN(val)) return [0, 0, 0, 0];
  if (val <= -0.20) return [239, 68, 68, 255];
  if (val <= -0.05) return [249, 115, 22, 255];
  if (val < 0.05) return [148, 163, 184, 255];
  if (val < 0.20) return [134, 239, 172, 255];
  return [34, 197, 94, 255];
}

function getNdwiColor(val) {
  if (isNaN(val)) return [0, 0, 0, 0];
  const v = Math.max(-1.0, Math.min(1.0, val));
  if (v <= -0.20) {
    const t = Math.min(1.0, Math.max(0.0, (v + 1.0) / 0.8));
    return [Math.round(185 + t * 54), Math.round(28 + t * 40), Math.round(28 + t * 40), 255];
  } else if (v <= -0.05) {
    const t = (v - (-0.20)) / 0.15;
    return [Math.round(239 + t * 6), Math.round(68 + t * 90), Math.round(68 - t * 57), 255];
  } else if (v < 0.05) {
    const t = (v - (-0.05)) / 0.10;
    return [Math.round(140 + t * 16), Math.round(155 + t * 16), Math.round(175 + t * 16), 255];
  } else if (v < 0.20) {
    const t = (v - 0.05) / 0.15;
    return [Math.round(134 - t * 60), Math.round(239 - t * 17), Math.round(172 - t * 44), 255];
  } else {
    const t = Math.min(1.0, (v - 0.20) / 0.8);
    return [Math.round(34 - t * 13), Math.round(197 - t * 69), Math.round(94 - t * 33), 255];
  }
}

export function EnvironmentalPage({ data, onNavigate }) {
  const { beforeScene, afterScene, ndviData, ndwiData } = data;
  const hasData = beforeScene && afterScene && (ndviData || ndwiData);

  const ndviCanvasRef = useRef(null);
  const ndwiCanvasRef = useRef(null);

  const renderMatrix = (canvas, b64, width, height, colorFn) => {
    const ctx = canvas.getContext('2d');
    canvas.width = width;
    canvas.height = height;

    const binaryString = atob(b64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    const floatArray = new Float32Array(bytes.buffer);
    const imgData = ctx.createImageData(width, height);
    
    for (let i = 0; i < floatArray.length; i++) {
      const [r, g, b, a] = colorFn(floatArray[i]);
      const idx = i * 4;
      imgData.data[idx] = r;
      imgData.data[idx + 1] = g;
      imgData.data[idx + 2] = b;
      imgData.data[idx + 3] = a;
    }
    ctx.putImageData(imgData, 0, 0);
  };

  useEffect(() => {
    if (ndviData?.matrix_b64 && ndviCanvasRef.current) {
      renderMatrix(ndviCanvasRef.current, ndviData.matrix_b64, ndviData.width || 512, ndviData.height || 512, getNdviColor);
    }
  }, [ndviData]);

  useEffect(() => {
    if (ndwiData?.matrix_b64 && ndwiCanvasRef.current) {
      renderMatrix(ndwiCanvasRef.current, ndwiData.matrix_b64, ndwiData.width || 512, ndwiData.height || 512, getNdwiColor);
    }
  }, [ndwiData]);

  if (!hasData) {
    return (
      <div className="ew-dashboard-container">
        <section className="ew-panel" style={{ padding: '20px 24px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <ActivityIcon size={14} style={{ color: 'var(--accent-cyan)' }} />
              <span style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--accent-cyan)', letterSpacing: '0.1em' }}>
                ENVIRONMENTAL INTELLIGENCE
              </span>
            </div>
            <h1 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '0.04em' }}>
              ENVIRONMENTAL INTELLIGENCE
            </h1>
            <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: 'var(--text-secondary)' }}>
              Evidence-grounded vegetation and water-signal monitoring derived from verified Earth observation measurements.
            </p>
          </div>
        </section>

        <div className="ew-panel" style={{
          marginTop: '20px',
          minHeight: '440px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          padding: '36px',
          borderStyle: 'dashed'
        }}>
          <LayersIcon size={44} style={{ color: 'var(--text-dim)', marginBottom: '14px' }} />
          <h3 style={{ margin: '0 0 6px 0', fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)' }}>
            NO VERIFIED ENVIRONMENTAL ANALYSIS
          </h3>
          <p style={{ margin: '0 0 20px 0', maxWidth: '420px', fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
            To generate environmental intelligence, first complete a temporal difference analysis in the Change Detection workspace.
          </p>
          <button
            type="button"
            className="ew-btn ew-btn-primary"
            onClick={() => onNavigate('Change Detection')}
            style={{ padding: '8px 24px', fontSize: '12px' }}
          >
            OPEN CHANGE DETECTION
          </button>
        </div>
      </div>
    );
  }

  const formatUtcDate = (dateStr) => {
    if (!dateStr) return '--';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase();
    } catch {
      return '--';
    }
  };

  const d1 = new Date(beforeScene.acquisition_datetime);
  const d2 = new Date(afterScene.acquisition_datetime);
  const intervalDays = Math.round((d2 - d1) / (1000 * 60 * 60 * 24));
  const validPixels = ndviData?.ndvi_change?.valid_pixel_count || ndwiData?.change?.valid_pixel_count || '--';
  const tile = beforeScene.tile || beforeScene.scene_id?.split('_')[5] || '--';
  const res = ndviData?.resolution || ndwiData?.resolution || '--';

  const formatCloud = (scene) => {
    if (!scene) return '--';
    const cc = scene.cloud_cover ?? scene['eo:cloud_cover'] ?? scene.properties?.['eo:cloud_cover'];
    if (cc === null || cc === undefined || cc === '' || isNaN(cc)) return '--';
    return `${Number(cc).toFixed(1)}%`;
  };

  return (
    <div className="ew-dashboard-container" style={{ gap: '20px' }}>
      <section className="ew-panel" style={{ padding: '20px 24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '14px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <ActivityIcon size={14} style={{ color: 'var(--accent-cyan)' }} />
              <span style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--accent-cyan)', letterSpacing: '0.1em' }}>
                ENVIRONMENTAL INTELLIGENCE
              </span>
            </div>
            <h1 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '0.04em' }}>
              ENVIRONMENTAL INTELLIGENCE
            </h1>
            <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: 'var(--text-secondary)' }}>
              Evidence-grounded vegetation and water-signal monitoring derived from verified Earth observation measurements.
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span className="ew-badge-live" style={{ fontSize: '10px', padding: '4px 10px' }}>
              LIVE ENVIRONMENTAL ANALYSIS
            </span>
          </div>
        </div>
      </section>

      {/* OVERVIEW / DATA QUALITY */}
      <section className="ew-panel" style={{ padding: '16px 20px' }}>
        <div className="ew-panel-header" style={{ marginBottom: '12px' }}>
          <div className="ew-panel-title-wrap">
            <CalendarIcon size={14} className="ew-panel-icon" />
            <h2 className="ew-panel-title">OBSERVATION WINDOW & DATA QUALITY</h2>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', fontSize: '11px', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
          <div>
            <div style={{ color: 'var(--text-dim)', marginBottom: '4px' }}>BEFORE ACQUISITION</div>
            <div style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{formatUtcDate(beforeScene.acquisition_datetime)}</div>
            <div style={{ marginTop: '2px' }}>Cloud: {formatCloud(beforeScene)}</div>
          </div>
          <div>
            <div style={{ color: 'var(--text-dim)', marginBottom: '4px' }}>AFTER ACQUISITION</div>
            <div style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{formatUtcDate(afterScene.acquisition_datetime)}</div>
            <div style={{ marginTop: '2px' }}>Cloud: {formatCloud(afterScene)}</div>
          </div>
          <div>
            <div style={{ color: 'var(--text-dim)', marginBottom: '4px' }}>TEMPORAL INTERVAL</div>
            <div style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{intervalDays} DAYS</div>
          </div>
          <div>
            <div style={{ color: 'var(--text-dim)', marginBottom: '4px' }}>TILE / CRS</div>
            <div style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{tile} / {ndviData?.crs || ndwiData?.crs || '--'}</div>
          </div>
          <div>
            <div style={{ color: 'var(--text-dim)', marginBottom: '4px' }}>RESOLUTION</div>
            <div style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{res}m</div>
          </div>
          <div>
            <div style={{ color: 'var(--text-dim)', marginBottom: '4px' }}>VALID PIXELS</div>
            <div style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{validPixels.toLocaleString()}</div>
          </div>
        </div>
      </section>

      {/* SUMMARY */}
      <section className="ew-panel" style={{ padding: '16px 20px', backgroundColor: 'rgba(2, 6, 23, 0.45)' }}>
        <div className="ew-panel-header" style={{ marginBottom: '12px' }}>
          <div className="ew-panel-title-wrap">
            <ActivityIcon size={14} className="ew-panel-icon" />
            <h2 className="ew-panel-title">ENVIRONMENTAL CHANGE SUMMARY</h2>
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px', lineHeight: 1.6, color: 'var(--text-primary)' }}>
          {ndviData && (
            <>
              <div>Measured NDVI mean changed by {(ndviData.ndvi_change.mean >= 0 ? '+' : '') + ndviData.ndvi_change.mean.toFixed(4)} across the analyzed window.</div>
              <div>{((ndviData.stable_count / ndviData.ndvi_change.valid_pixel_count) * 100).toFixed(2)}% of analyzed pixels were classified as stable under the configured NDVI change thresholds.</div>
            </>
          )}
          {ndwiData && (
            <>
              <div>Measured NDWI mean changed by {(ndwiData.change.mean >= 0 ? '+' : '') + ndwiData.change.mean.toFixed(4)} across the analyzed window.</div>
              <div>{((ndwiData.stable_count / ndwiData.change.valid_pixel_count) * 100).toFixed(2)}% of analyzed pixels were classified as stable under the configured NDWI change thresholds.</div>
            </>
          )}
        </div>
      </section>

      {/* VEGETATION CONDITION */}
      {ndviData && (
        <section className="ew-panel">
          <div className="ew-panel-header">
            <div className="ew-panel-title-wrap">
              <LayersIcon size={14} className="ew-panel-icon" />
              <h2 className="ew-panel-title">VEGETATION CONDITION</h2>
            </div>
          </div>
          <div className="ew-panel-body" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div className="ew-metric-grid">
              <div className="ew-metric-card">
                <span className="ew-metric-label">BEFORE MEAN NDVI</span>
                <span className="ew-metric-value" style={{ color: 'var(--accent-blue)' }}>{ndviData.ndvi_before?.mean?.toFixed(4) || '--'}</span>
              </div>
              <div className="ew-metric-card">
                <span className="ew-metric-label">AFTER MEAN NDVI</span>
                <span className="ew-metric-value" style={{ color: '#4ade80' }}>{ndviData.ndvi_after?.mean?.toFixed(4) || '--'}</span>
              </div>
              <div className="ew-metric-card">
                <span className="ew-metric-label">MEAN NDVI CHANGE</span>
                <span className="ew-metric-value" style={{ color: ndviData.ndvi_change.mean >= 0 ? '#4ade80' : '#f87171' }}>
                  {ndviData.ndvi_change.mean >= 0 ? '+' : ''}{ndviData.ndvi_change.mean.toFixed(4)}
                </span>
              </div>
              <div className="ew-metric-card">
                <span className="ew-metric-label">MEDIAN NDVI CHANGE</span>
                <span className="ew-metric-value">
                  {ndviData.ndvi_change.median >= 0 ? '+' : ''}{ndviData.ndvi_change.median.toFixed(4)}
                </span>
              </div>
            </div>

            <div>
              <div style={{ fontSize: '10px', fontFamily: 'var(--font-mono)', color: 'var(--text-dim)', marginBottom: '8px', letterSpacing: '0.08em' }}>
                MEASURED VEGETATION-INDEX CHANGE DISTRIBUTION
              </div>
              <div className="ew-metric-grid">
                <div className="ew-metric-card">
                  <span className="ew-metric-label">SIGNIFICANT LOSS</span>
                  <span className="ew-metric-value" style={{ color: '#ef4444' }}>{ndviData.significant_loss_count.toLocaleString()}</span>
                  <span className="ew-metric-subtext">pixels</span>
                </div>
                <div className="ew-metric-card">
                  <span className="ew-metric-label">MODERATE LOSS</span>
                  <span className="ew-metric-value" style={{ color: '#f97316' }}>{ndviData.moderate_loss_count.toLocaleString()}</span>
                  <span className="ew-metric-subtext">pixels</span>
                </div>
                <div className="ew-metric-card">
                  <span className="ew-metric-label">STABLE</span>
                  <span className="ew-metric-value" style={{ color: '#94a3b8' }}>{ndviData.stable_count.toLocaleString()}</span>
                  <span className="ew-metric-subtext">pixels</span>
                </div>
                <div className="ew-metric-card">
                  <span className="ew-metric-label">MODERATE GAIN</span>
                  <span className="ew-metric-value" style={{ color: '#86efac' }}>{ndviData.moderate_gain_count.toLocaleString()}</span>
                  <span className="ew-metric-subtext">pixels</span>
                </div>
                <div className="ew-metric-card">
                  <span className="ew-metric-label">SIGNIFICANT GAIN</span>
                  <span className="ew-metric-value" style={{ color: '#22c55e' }}>{ndviData.significant_gain_count.toLocaleString()}</span>
                  <span className="ew-metric-subtext">pixels</span>
                </div>
              </div>
            </div>

            <div>
              <div style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)', marginBottom: '8px', fontWeight: 600 }}>
                NDVI CHANGE MAP
              </div>
              <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                <div className="ew-canvas-frame" style={{ width: '256px', height: '256px' }}>
                  <canvas ref={ndviCanvasRef} className="ew-canvas-element" style={{ width: '100%', height: '100%' }} />
                </div>
                <div className="ew-canvas-legend">
                  <strong style={{ color: 'var(--text-primary)', marginBottom: '4px' }}>CHANGE CATEGORIES</strong>
                  <div className="ew-canvas-legend-item"><span className="ew-canvas-legend-swatch" style={{ backgroundColor: 'rgb(34, 197, 94)' }} /><span>Significant Gain</span></div>
                  <div className="ew-canvas-legend-item"><span className="ew-canvas-legend-swatch" style={{ backgroundColor: 'rgb(134, 239, 172)' }} /><span>Moderate Gain</span></div>
                  <div className="ew-canvas-legend-item"><span className="ew-canvas-legend-swatch" style={{ backgroundColor: 'rgb(148, 163, 184)' }} /><span>Stable</span></div>
                  <div className="ew-canvas-legend-item"><span className="ew-canvas-legend-swatch" style={{ backgroundColor: 'rgb(249, 115, 22)' }} /><span>Moderate Loss</span></div>
                  <div className="ew-canvas-legend-item"><span className="ew-canvas-legend-swatch" style={{ backgroundColor: 'rgb(239, 68, 68)' }} /><span>Significant Loss</span></div>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* WATER SIGNAL */}
      {ndwiData && (
        <section className="ew-panel">
          <div className="ew-panel-header">
            <div className="ew-panel-title-wrap">
              <RadarIcon size={14} className="ew-panel-icon" />
              <h2 className="ew-panel-title">WATER SIGNAL</h2>
            </div>
          </div>
          <div className="ew-panel-body" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div className="ew-metric-grid">
              <div className="ew-metric-card">
                <span className="ew-metric-label">BEFORE MEAN NDWI</span>
                <span className="ew-metric-value" style={{ color: 'var(--accent-blue)' }}>{ndwiData.before?.mean?.toFixed(4) || '--'}</span>
              </div>
              <div className="ew-metric-card">
                <span className="ew-metric-label">AFTER MEAN NDWI</span>
                <span className="ew-metric-value" style={{ color: '#38bdf8' }}>{ndwiData.after?.mean?.toFixed(4) || '--'}</span>
              </div>
              <div className="ew-metric-card">
                <span className="ew-metric-label">MEAN NDWI CHANGE</span>
                <span className="ew-metric-value" style={{ color: ndwiData.change?.mean >= 0 ? '#38bdf8' : '#f87171' }}>
                  {ndwiData.change?.mean >= 0 ? '+' : ''}{ndwiData.change?.mean?.toFixed(4)}
                </span>
              </div>
              <div className="ew-metric-card">
                <span className="ew-metric-label">MEDIAN NDWI CHANGE</span>
                <span className="ew-metric-value">
                  {ndwiData.change?.median >= 0 ? '+' : ''}{ndwiData.change?.median?.toFixed(4)}
                </span>
              </div>
            </div>

            <div>
              <div style={{ fontSize: '10px', fontFamily: 'var(--font-mono)', color: 'var(--text-dim)', marginBottom: '8px', letterSpacing: '0.08em' }}>
                MEASURED WATER-SIGNAL CHANGE DISTRIBUTION
              </div>
              <div className="ew-metric-grid">
                <div className="ew-metric-card">
                  <span className="ew-metric-label">SIGNIFICANT LOSS</span>
                  <span className="ew-metric-value" style={{ color: '#ef4444' }}>{ndwiData.significant_loss_count?.toLocaleString()}</span>
                  <span className="ew-metric-subtext">pixels</span>
                </div>
                <div className="ew-metric-card">
                  <span className="ew-metric-label">MODERATE LOSS</span>
                  <span className="ew-metric-value" style={{ color: '#f97316' }}>{ndwiData.moderate_loss_count?.toLocaleString()}</span>
                  <span className="ew-metric-subtext">pixels</span>
                </div>
                <div className="ew-metric-card">
                  <span className="ew-metric-label">STABLE</span>
                  <span className="ew-metric-value" style={{ color: '#94a3b8' }}>{ndwiData.stable_count?.toLocaleString()}</span>
                  <span className="ew-metric-subtext">pixels</span>
                </div>
                <div className="ew-metric-card">
                  <span className="ew-metric-label">MODERATE GAIN</span>
                  <span className="ew-metric-value" style={{ color: '#86efac' }}>{ndwiData.moderate_gain_count?.toLocaleString()}</span>
                  <span className="ew-metric-subtext">pixels</span>
                </div>
                <div className="ew-metric-card">
                  <span className="ew-metric-label">SIGNIFICANT GAIN</span>
                  <span className="ew-metric-value" style={{ color: '#22c55e' }}>{ndwiData.significant_gain_count?.toLocaleString()}</span>
                  <span className="ew-metric-subtext">pixels</span>
                </div>
              </div>
            </div>

            <div style={{ padding: '12px', borderLeft: '3px solid var(--accent-blue)', backgroundColor: 'rgba(56, 189, 248, 0.05)', color: 'var(--text-secondary)', fontSize: '12px', lineHeight: 1.5 }}>
              <strong>SCIENTIFIC CAVEAT:</strong> NDWI is a spectral water-signal index and does not by itself confirm physical water delineation.
            </div>

            <div>
              <div style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)', marginBottom: '8px', fontWeight: 600 }}>
                NDWI CHANGE MAP
              </div>
              <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                <div className="ew-canvas-frame" style={{ width: '256px', height: '256px' }}>
                  <canvas ref={ndwiCanvasRef} className="ew-canvas-element" style={{ width: '100%', height: '100%' }} />
                </div>
                <div className="ew-canvas-legend">
                  <strong style={{ color: 'var(--text-primary)', marginBottom: '4px' }}>CHANGE CATEGORIES</strong>
                  <div className="ew-canvas-legend-item"><span className="ew-canvas-legend-swatch" style={{ backgroundColor: 'rgb(21, 128, 61)' }} /><span>Significant Gain</span></div>
                  <div className="ew-canvas-legend-item"><span className="ew-canvas-legend-swatch" style={{ backgroundColor: 'rgb(134, 239, 172)' }} /><span>Moderate Gain</span></div>
                  <div className="ew-canvas-legend-item"><span className="ew-canvas-legend-swatch" style={{ backgroundColor: 'rgb(148, 163, 184)' }} /><span>Stable</span></div>
                  <div className="ew-canvas-legend-item"><span className="ew-canvas-legend-swatch" style={{ backgroundColor: 'rgb(249, 115, 22)' }} /><span>Moderate Loss</span></div>
                  <div className="ew-canvas-legend-item"><span className="ew-canvas-legend-swatch" style={{ backgroundColor: 'rgb(185, 28, 28)' }} /><span>Significant Loss</span></div>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
