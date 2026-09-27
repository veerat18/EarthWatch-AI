import React, { useEffect, useRef } from 'react';
import { ShieldAlertIcon, ActivityIcon, RadarIcon, MapIcon, InfoIcon } from '../components/common/Icons';

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

export function DisasterMonitorPage({ data, onNavigate }) {
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
              <ShieldAlertIcon size={14} style={{ color: 'var(--accent-red)' }} />
              <span style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--accent-red)', letterSpacing: '0.1em' }}>
                DISASTER MONITOR
              </span>
            </div>
            <h1 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '0.04em' }}>
              DISASTER MONITOR
            </h1>
            <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: 'var(--text-secondary)' }}>
              Evidence-based satellite signal monitoring for environmental anomaly screening and further investigation.
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
          borderStyle: 'dashed',
          borderColor: 'var(--border-dim)'
        }}>
          <ShieldAlertIcon size={44} style={{ color: 'var(--text-dim)', marginBottom: '14px' }} />
          <h3 style={{ margin: '0 0 6px 0', fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)' }}>
            NO VERIFIED DISASTER OBSERVATION
          </h3>
          <p style={{ margin: '0 0 20px 0', maxWidth: '420px', fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
            Run a verified temporal Earth-observation analysis to populate disaster-monitoring signals.
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

  const formatCloud = (scene) => {
    if (!scene) return '--';
    const cc = scene.cloud_cover ?? scene['eo:cloud_cover'] ?? scene.properties?.['eo:cloud_cover'];
    if (cc === null || cc === undefined || cc === '' || isNaN(cc)) return '--';
    return `${Number(cc).toFixed(1)}%`;
  };

  const getDominantClassification = (data, type) => {
    if (!data) return '--';
    let counts;
    if (type === 'ndvi') {
      counts = [
        { label: 'Significant Loss', count: data.significant_loss_count },
        { label: 'Moderate Loss', count: data.moderate_loss_count },
        { label: 'Stable', count: data.stable_count },
        { label: 'Moderate Gain', count: data.moderate_gain_count },
        { label: 'Significant Gain', count: data.significant_gain_count }
      ];
    } else {
      counts = [
        { label: 'Significant Loss', count: data.significant_loss_count },
        { label: 'Moderate Loss', count: data.moderate_loss_count },
        { label: 'Stable', count: data.stable_count },
        { label: 'Moderate Gain', count: data.moderate_gain_count },
        { label: 'Significant Gain', count: data.significant_gain_count }
      ];
    }
    counts.sort((a, b) => b.count - a.count);
    return counts[0].label;
  };

  const d1 = new Date(beforeScene.acquisition_datetime);
  const d2 = new Date(afterScene.acquisition_datetime);
  const intervalDays = Math.round((d2 - d1) / (1000 * 60 * 60 * 24));
  const validPixels = ndviData?.ndvi_change?.valid_pixel_count || ndwiData?.change?.valid_pixel_count || '--';
  const tile = beforeScene.tile || beforeScene.scene_id?.split('_')[5] || '--';
  const res = ndviData?.resolution || ndwiData?.resolution || '--';

  // Observation Flags Logic
  const getFlags = () => {
    const flags = [];
    if (ndviData) {
      if (ndviData.significant_loss_count > ndviData.stable_count * 0.1 || ndviData.moderate_loss_count > ndviData.stable_count * 0.2) {
        flags.push('VEGETATION SIGNAL CHANGE');
      } else {
        flags.push('PREDOMINANTLY STABLE VEGETATION');
      }
    }
    if (ndwiData) {
      if (ndwiData.significant_gain_count > ndwiData.stable_count * 0.1 || ndwiData.significant_loss_count > ndwiData.stable_count * 0.1) {
        flags.push('WATER-SIGNAL CHANGE');
      } else {
        flags.push('PREDOMINANTLY STABLE WATER SIGNAL');
      }
    }
    return flags.length ? flags : ['LOW CHANGE / STABLE SIGNAL'];
  };

  return (
    <div className="ew-dashboard-container" style={{ gap: '20px' }}>
      <section className="ew-panel" style={{ padding: '20px 24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '14px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <ShieldAlertIcon size={14} style={{ color: 'var(--accent-red)' }} />
              <span style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--accent-red)', letterSpacing: '0.1em' }}>
                DISASTER MONITOR
              </span>
            </div>
            <h1 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '0.04em' }}>
              DISASTER MONITOR
            </h1>
            <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: 'var(--text-secondary)' }}>
              Evidence-based satellite signal monitoring for environmental anomaly screening and further investigation.
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span className="ew-badge-live" style={{ fontSize: '10px', padding: '4px 10px', backgroundColor: 'rgba(239, 68, 68, 0.15)', color: '#fca5a5', borderColor: '#ef4444' }}>
              LIVE OBSERVATION MONITOR
            </span>
          </div>
        </div>
      </section>

      {/* INVESTIGATION NOTICE */}
      <div style={{ display: 'flex', gap: '12px', padding: '16px', backgroundColor: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.3)', borderRadius: '6px', color: 'var(--text-primary)', fontSize: '13px', lineHeight: 1.5 }}>
        <InfoIcon size={18} style={{ color: '#fbbf24', flexShrink: 0, marginTop: '2px' }} />
        <div>
          <strong>INVESTIGATION NOTICE:</strong> Observation signals are derived from satellite spectral measurements and are not independent confirmation of a disaster event. Further imagery, contextual data, and ground or authoritative sources may be required.
        </div>
      </div>

      {/* OVERVIEW */}
      <section className="ew-panel" style={{ padding: '16px 20px' }}>
        <div className="ew-panel-header" style={{ marginBottom: '12px' }}>
          <div className="ew-panel-title-wrap">
            <ActivityIcon size={14} className="ew-panel-icon" />
            <h2 className="ew-panel-title">MONITOR OVERVIEW</h2>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px', fontSize: '11px', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
          <div>
            <div style={{ color: 'var(--text-dim)', marginBottom: '4px' }}>OBSERVATION WINDOW</div>
            <div style={{ color: 'var(--text-primary)', fontWeight: 600 }}>512 &times; 512 px</div>
          </div>
          <div>
            <div style={{ color: 'var(--text-dim)', marginBottom: '4px' }}>BEFORE</div>
            <div style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{formatUtcDate(beforeScene.acquisition_datetime)}</div>
          </div>
          <div>
            <div style={{ color: 'var(--text-dim)', marginBottom: '4px' }}>AFTER</div>
            <div style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{formatUtcDate(afterScene.acquisition_datetime)}</div>
          </div>
          <div>
            <div style={{ color: 'var(--text-dim)', marginBottom: '4px' }}>INTERVAL</div>
            <div style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{intervalDays} DAYS</div>
          </div>
          <div>
            <div style={{ color: 'var(--text-dim)', marginBottom: '4px' }}>TILE</div>
            <div style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{tile}</div>
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

      {/* OBSERVATION FLAGS */}
      <section className="ew-panel" style={{ padding: '16px 20px', backgroundColor: 'rgba(2, 6, 23, 0.45)' }}>
        <div className="ew-panel-header" style={{ marginBottom: '12px' }}>
          <div className="ew-panel-title-wrap">
            <ShieldAlertIcon size={14} className="ew-panel-icon" />
            <h2 className="ew-panel-title">OBSERVATION FLAGS</h2>
          </div>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
          {getFlags().map((flag, idx) => (
            <span key={idx} style={{ padding: '6px 12px', fontSize: '11px', fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--text-primary)', backgroundColor: 'var(--bg-card-hover)', border: '1px solid var(--border-light)', borderRadius: '4px' }}>
              {flag}
            </span>
          ))}
        </div>
      </section>

      {/* SIGNAL MONITORING - VEGETATION */}
      {ndviData && (
        <section className="ew-panel">
          <div className="ew-panel-header">
            <div className="ew-panel-title-wrap">
              <ActivityIcon size={14} className="ew-panel-icon" />
              <h2 className="ew-panel-title">VEGETATION SIGNAL</h2>
            </div>
            <span className="ew-badge" style={{ backgroundColor: 'rgba(74, 222, 128, 0.1)', color: '#4ade80', borderColor: '#4ade80' }}>SIGNAL OBSERVED</span>
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
                <span className="ew-metric-label">DOMINANT CLASSIFICATION</span>
                <span className="ew-metric-value" style={{ fontSize: '14px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {getDominantClassification(ndviData, 'ndvi')}
                </span>
              </div>
            </div>

            <div>
              <div style={{ fontSize: '10px', fontFamily: 'var(--font-mono)', color: 'var(--text-dim)', marginBottom: '8px', letterSpacing: '0.08em' }}>
                SURFACE CHANGE (MEASURED PIXEL COUNTS)
              </div>
              <div className="ew-metric-grid">
                <div className="ew-metric-card">
                  <span className="ew-metric-label">SIGNIFICANT LOSS</span>
                  <span className="ew-metric-value" style={{ color: '#ef4444' }}>{ndviData.significant_loss_count.toLocaleString()}</span>
                  <span className="ew-metric-subtext">{((ndviData.significant_loss_count / ndviData.ndvi_change.valid_pixel_count) * 100).toFixed(1)}%</span>
                </div>
                <div className="ew-metric-card">
                  <span className="ew-metric-label">STABLE</span>
                  <span className="ew-metric-value" style={{ color: '#94a3b8' }}>{ndviData.stable_count.toLocaleString()}</span>
                  <span className="ew-metric-subtext">{((ndviData.stable_count / ndviData.ndvi_change.valid_pixel_count) * 100).toFixed(1)}%</span>
                </div>
                <div className="ew-metric-card">
                  <span className="ew-metric-label">SIGNIFICANT GAIN</span>
                  <span className="ew-metric-value" style={{ color: '#22c55e' }}>{ndviData.significant_gain_count.toLocaleString()}</span>
                  <span className="ew-metric-subtext">{((ndviData.significant_gain_count / ndviData.ndvi_change.valid_pixel_count) * 100).toFixed(1)}%</span>
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
                  <strong style={{ color: 'var(--text-primary)', marginBottom: '4px' }}>OBSERVED SPECTRAL SHIFT</strong>
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

      {/* SIGNAL MONITORING - WATER */}
      {ndwiData && (
        <section className="ew-panel">
          <div className="ew-panel-header">
            <div className="ew-panel-title-wrap">
              <RadarIcon size={14} className="ew-panel-icon" />
              <h2 className="ew-panel-title">WATER SIGNAL</h2>
            </div>
            <span className="ew-badge" style={{ backgroundColor: 'rgba(56, 189, 248, 0.1)', color: '#38bdf8', borderColor: '#38bdf8' }}>REQUIRES FURTHER INVESTIGATION</span>
          </div>
          <div className="ew-panel-body" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '-8px' }}>
              <strong>SPECTRAL WATER-SIGNAL CHANGE:</strong> NDWI is a spectral water-signal index and does not by itself confirm physical water delineation.
            </div>

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
                <span className="ew-metric-label">DOMINANT CLASSIFICATION</span>
                <span className="ew-metric-value" style={{ fontSize: '14px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {getDominantClassification(ndwiData, 'ndwi')}
                </span>
              </div>
            </div>

            <div>
              <div style={{ fontSize: '10px', fontFamily: 'var(--font-mono)', color: 'var(--text-dim)', marginBottom: '8px', letterSpacing: '0.08em' }}>
                SURFACE CHANGE (MEASURED PIXEL COUNTS)
              </div>
              <div className="ew-metric-grid">
                <div className="ew-metric-card">
                  <span className="ew-metric-label">SIGNIFICANT LOSS</span>
                  <span className="ew-metric-value" style={{ color: '#ef4444' }}>{ndwiData.significant_loss_count?.toLocaleString()}</span>
                  <span className="ew-metric-subtext">{((ndwiData.significant_loss_count / ndwiData.change.valid_pixel_count) * 100).toFixed(1)}%</span>
                </div>
                <div className="ew-metric-card">
                  <span className="ew-metric-label">STABLE</span>
                  <span className="ew-metric-value" style={{ color: '#94a3b8' }}>{ndwiData.stable_count?.toLocaleString()}</span>
                  <span className="ew-metric-subtext">{((ndwiData.stable_count / ndwiData.change.valid_pixel_count) * 100).toFixed(1)}%</span>
                </div>
                <div className="ew-metric-card">
                  <span className="ew-metric-label">SIGNIFICANT GAIN</span>
                  <span className="ew-metric-value" style={{ color: '#22c55e' }}>{ndwiData.significant_gain_count?.toLocaleString()}</span>
                  <span className="ew-metric-subtext">{((ndwiData.significant_gain_count / ndwiData.change.valid_pixel_count) * 100).toFixed(1)}%</span>
                </div>
              </div>
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
                  <strong style={{ color: 'var(--text-primary)', marginBottom: '4px' }}>OBSERVED SPECTRAL SHIFT</strong>
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

      {/* DATA QUALITY */}
      <section className="ew-panel" style={{ padding: '16px 20px' }}>
        <div className="ew-panel-header" style={{ marginBottom: '12px' }}>
          <div className="ew-panel-title-wrap">
            <MapIcon size={14} className="ew-panel-icon" />
            <h2 className="ew-panel-title">DATA QUALITY & METADATA</h2>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px', fontSize: '11px', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
          <div>
            <div style={{ color: 'var(--text-dim)', marginBottom: '4px' }}>BEFORE CLOUD COVERAGE</div>
            <div style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{formatCloud(beforeScene)}</div>
          </div>
          <div>
            <div style={{ color: 'var(--text-dim)', marginBottom: '4px' }}>AFTER CLOUD COVERAGE</div>
            <div style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{formatCloud(afterScene)}</div>
          </div>
          <div>
            <div style={{ color: 'var(--text-dim)', marginBottom: '4px' }}>VALID PIXELS</div>
            <div style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{validPixels.toLocaleString()}</div>
          </div>
          <div>
            <div style={{ color: 'var(--text-dim)', marginBottom: '4px' }}>NODATA</div>
            <div style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{(ndviData?.ndvi_change?.nodata_pixel_count ?? ndwiData?.change?.nodata_pixel_count ?? '--').toLocaleString()}</div>
          </div>
          <div>
            <div style={{ color: 'var(--text-dim)', marginBottom: '4px' }}>RESOLUTION</div>
            <div style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{res}m</div>
          </div>
          <div>
            <div style={{ color: 'var(--text-dim)', marginBottom: '4px' }}>CRS</div>
            <div style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{ndviData?.crs || ndwiData?.crs || '--'}</div>
          </div>
          <div>
            <div style={{ color: 'var(--text-dim)', marginBottom: '4px' }}>TEMPORAL INTERVAL</div>
            <div style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{intervalDays} DAYS</div>
          </div>
        </div>
      </section>

    </div>
  );
}
