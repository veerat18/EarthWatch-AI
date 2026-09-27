import React, { useState, useEffect, useRef } from 'react';
import { API_ENDPOINTS } from '../../config/api';

export function ChangeDetectionPairPanel({ beforeScene, afterScene, onAnalysisSuccess }) {
  const [status, setStatus] = useState('ready'); // 'ready', 'loading', 'success', 'error'
  const [errorMsg, setErrorMsg] = useState('');
  const [changeData, setChangeData] = useState(null);
  const canvasRef = useRef(null);

  const [prevPairKey, setPrevPairKey] = useState(
    beforeScene && afterScene ? `${beforeScene.scene_id}_${afterScene.scene_id}` : ''
  );

  const currentPairKey = beforeScene && afterScene ? `${beforeScene.scene_id}_${afterScene.scene_id}` : '';
  if (currentPairKey !== prevPairKey) {
    setPrevPairKey(currentPairKey);
    setStatus('ready');
    setChangeData(null);
    setErrorMsg('');
  }

  const runAnalysis = async () => {
    setStatus('loading');
    setErrorMsg('');
    setChangeData(null);

    try {
      const response = await fetch(API_ENDPOINTS.changeDetection, {
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
          height: 512
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.detail || 'CHANGE ANALYSIS FAILED');
      }

      setChangeData(data);
      setStatus('success');
      onAnalysisSuccess?.('ndvi', data);
    } catch (e) {
      console.error(e);
      setStatus('error');
      setErrorMsg(e.message || 'CHANGE ANALYSIS FAILED');
    }
  };

  useEffect(() => {
    if (status === 'success' && changeData?.matrix_b64 && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      const width = changeData.width;
      const height = changeData.height;
      
      canvas.width = width;
      canvas.height = height;

      // Decode base64 float32 array
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
        
        if (isNaN(val)) {
          imgData.data[idx] = 0;
          imgData.data[idx+1] = 0;
          imgData.data[idx+2] = 0;
          imgData.data[idx+3] = 0;
        } else {
          // <= -0.20: Significant Loss (#ef4444)
          // -0.20 to -0.05: Moderate Loss (#f97316)
          // -0.05 to +0.05: Stable (#94a3b8)
          // +0.05 to +0.20: Moderate Gain (#86efac)
          // >= +0.20: Significant Gain (#22c55e)
          let r = 0, g = 0, b = 0;
          if (val <= -0.20) {
            r = 239; g = 68; b = 68;
          } else if (val <= -0.05) {
            r = 249; g = 115; b = 22;
          } else if (val < 0.05) {
            r = 148; g = 163; b = 184;
          } else if (val < 0.20) {
            r = 134; g = 239; b = 172;
          } else {
            r = 34; g = 197; b = 94;
          }

          imgData.data[idx] = r;
          imgData.data[idx+1] = g;
          imgData.data[idx+2] = b;
          imgData.data[idx+3] = 255;
        }
      }
      ctx.putImageData(imgData, 0, 0);
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

  return (
    <div className="ew-selected-scene-card" style={{ marginTop: '16px' }}>
      <div className="ew-selected-header">
        <span className="ew-selected-tag">
          {status === 'loading' ? 'PROCESSING DIFFERENCE RASTER...' : status === 'success' ? 'NDVI CHANGE / COMPLETE' : 'CHANGE DETECTION / READY'}
        </span>
        <h3 className="ew-selected-title" style={{ color: '#fbbf24' }}>NDVI TEMPORAL CHANGE DETECTION</h3>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '12px 0' }}>
        <div style={{ fontSize: '11px', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
          {isReady ? (
            <>
              <strong>INTERVAL:</strong> {interval !== null ? `${interval} days` : '--'} &nbsp;|&nbsp; <strong>WINDOW:</strong> 512 &times; 512 px (10m)
            </>
          ) : (
            'Select both BEFORE and AFTER scenes to enable change detection.'
          )}
        </div>

        {isReady && status === 'ready' && (
          <button
            type="button"
            className="ew-btn-action ew-btn-action-change"
            onClick={runAnalysis}
          >
            RUN NDVI CHANGE ANALYSIS
          </button>
        )}

        {status === 'loading' && (
          <div className="ew-status-block ew-status-block-loading">
            <span className="ew-btn-spinner" />
            <span>PROCESSING SENTINEL-2 DIFFERENCE RASTER...</span>
          </div>
        )}

        {status === 'error' && (
          <div className="ew-status-block ew-status-block-error">
            <div style={{ fontWeight: 700, marginBottom: '2px' }}>CHANGE ANALYSIS FAILED</div>
            <div>{errorMsg}</div>
          </div>
        )}

        {status === 'success' && changeData && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Standardized Metric Cards: Stats */}
            <div>
              <div style={{ fontSize: '10px', fontFamily: 'var(--font-mono)', color: 'var(--text-dim)', marginBottom: '6px', letterSpacing: '0.08em' }}>
                NDVI CHANGE DIFFERENCE METRICS
              </div>
              <div className="ew-metric-grid">
                <div className="ew-metric-card">
                  <span className="ew-metric-label">MEAN NDVI SHIFT</span>
                  <span className="ew-metric-value" style={{ color: changeData.ndvi_change.mean >= 0 ? '#4ade80' : '#f87171' }}>
                    {changeData.ndvi_change.mean >= 0 ? '+' : ''}{changeData.ndvi_change.mean.toFixed(4)}
                  </span>
                  <span className="ew-metric-subtext">Net Shift</span>
                </div>
                <div className="ew-metric-card">
                  <span className="ew-metric-label">MEDIAN SHIFT</span>
                  <span className="ew-metric-value">
                    {changeData.ndvi_change.median >= 0 ? '+' : ''}{changeData.ndvi_change.median.toFixed(4)}
                  </span>
                  <span className="ew-metric-subtext">50th Percentile</span>
                </div>
                <div className="ew-metric-card">
                  <span className="ew-metric-label">RANGE [MIN, MAX]</span>
                  <span className="ew-metric-value" style={{ fontSize: '12px' }}>
                    [{changeData.ndvi_change.min.toFixed(3)}, {changeData.ndvi_change.max.toFixed(3)}]
                  </span>
                  <span className="ew-metric-subtext">Extreme bounds</span>
                </div>
                <div className="ew-metric-card">
                  <span className="ew-metric-label">VALID PIXELS</span>
                  <span className="ew-metric-value">{changeData.ndvi_change.valid_pixel_count.toLocaleString()}</span>
                  <span className="ew-metric-subtext">0 NoData</span>
                </div>
              </div>
            </div>

            {/* Standardized Metric Cards: Classification */}
            <div>
              <div style={{ fontSize: '10px', fontFamily: 'var(--font-mono)', color: 'var(--text-dim)', marginBottom: '6px', letterSpacing: '0.08em' }}>
                VEGETATION CHANGE CLASSIFICATIONS
              </div>
              <div className="ew-metric-grid">
                <div className="ew-metric-card">
                  <span className="ew-metric-label">SIGNIFICANT LOSS</span>
                  <span className="ew-metric-value" style={{ color: '#ef4444' }}>{changeData.significant_loss_count.toLocaleString()}</span>
                  <span className="ew-metric-subtext">&Delta; &le; -0.20</span>
                </div>
                <div className="ew-metric-card">
                  <span className="ew-metric-label">MODERATE LOSS</span>
                  <span className="ew-metric-value" style={{ color: '#f97316' }}>{changeData.moderate_loss_count.toLocaleString()}</span>
                  <span className="ew-metric-subtext">-0.20 to -0.05</span>
                </div>
                <div className="ew-metric-card">
                  <span className="ew-metric-label">STABLE SIGNAL</span>
                  <span className="ew-metric-value" style={{ color: '#94a3b8' }}>{changeData.stable_count.toLocaleString()}</span>
                  <span className="ew-metric-subtext">-0.05 to +0.05</span>
                </div>
                <div className="ew-metric-card">
                  <span className="ew-metric-label">MODERATE GAIN</span>
                  <span className="ew-metric-value" style={{ color: '#86efac' }}>{changeData.moderate_gain_count.toLocaleString()}</span>
                  <span className="ew-metric-subtext">+0.05 to +0.20</span>
                </div>
                <div className="ew-metric-card">
                  <span className="ew-metric-label">SIGNIFICANT GAIN</span>
                  <span className="ew-metric-value" style={{ color: '#22c55e' }}>{changeData.significant_gain_count.toLocaleString()}</span>
                  <span className="ew-metric-subtext">&Delta; &ge; +0.20</span>
                </div>
              </div>
            </div>

            <div style={{ fontSize: '11px', color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>
              <strong>CRS:</strong> {changeData.crs} &nbsp;|&nbsp; <strong>Resolution:</strong> {changeData.resolution}m
            </div>

            {/* Canvas Visualization */}
            <div>
              <div style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)', marginBottom: '8px', fontWeight: 600 }}>
                SENTINEL-2 NDVI CHANGE DIFFERENCE MAP
              </div>
              <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
                <div className="ew-canvas-frame">
                  <canvas 
                    ref={canvasRef} 
                    className="ew-canvas-element"
                    role="img"
                    aria-label="Sentinel-2 NDVI Change Detection Difference Surface"
                  />
                </div>
                {/* Standardized Legend */}
                <div className="ew-canvas-legend">
                  <strong style={{ color: 'var(--text-primary)', marginBottom: '4px' }}>CHANGE CATEGORIES</strong>
                  <div className="ew-canvas-legend-item">
                    <span className="ew-canvas-legend-swatch" style={{ backgroundColor: 'rgb(34, 197, 94)' }} />
                    <span>Significant Gain (&ge; +0.20)</span>
                  </div>
                  <div className="ew-canvas-legend-item">
                    <span className="ew-canvas-legend-swatch" style={{ backgroundColor: 'rgb(134, 239, 172)' }} />
                    <span>Moderate Gain (+0.05 to +0.20)</span>
                  </div>
                  <div className="ew-canvas-legend-item">
                    <span className="ew-canvas-legend-swatch" style={{ backgroundColor: 'rgb(148, 163, 184)' }} />
                    <span>Stable Low Change (&plusmn;0.05)</span>
                  </div>
                  <div className="ew-canvas-legend-item">
                    <span className="ew-canvas-legend-swatch" style={{ backgroundColor: 'rgb(249, 115, 22)' }} />
                    <span>Moderate Loss (-0.20 to -0.05)</span>
                  </div>
                  <div className="ew-canvas-legend-item">
                    <span className="ew-canvas-legend-swatch" style={{ backgroundColor: 'rgb(239, 68, 68)' }} />
                    <span>Significant Loss (&le; -0.20)</span>
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
