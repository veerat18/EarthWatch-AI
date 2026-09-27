import React, { useState, useEffect, useRef } from 'react';
import { API_ENDPOINTS } from '../../config/api';

export function NdviAnalysisPanel({ selectedScene }) {
  const [status, setStatus] = useState('ready'); // 'ready', 'loading', 'success', 'error'
  const [errorMsg, setErrorMsg] = useState('');
  const [ndviData, setNdviData] = useState(null);
  const [prevSceneId, setPrevSceneId] = useState(selectedScene?.scene_id);
  const canvasRef = useRef(null);

  if (selectedScene?.scene_id !== prevSceneId) {
    setPrevSceneId(selectedScene?.scene_id);
    setStatus('ready');
    setNdviData(null);
    setErrorMsg('');
  }

  const runAnalysis = async () => {
    setStatus('loading');
    setErrorMsg('');
    setNdviData(null);

    try {
      const response = await fetch(API_ENDPOINTS.ndvi, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          scene_id: selectedScene.scene_id,
          x: 0,
          y: 0,
          width: 512,
          height: 512
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.detail || 'Failed to analyze NDVI');
      }

      setNdviData(data);
      setStatus('success');
    } catch (e) {
      console.error(e);
      setStatus('error');
      setErrorMsg(e.message || 'Unable to perform NDVI analysis.');
    }
  };

  useEffect(() => {
    if (status === 'success' && ndviData?.matrix_b64 && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      const width = ndviData.width;
      const height = ndviData.height;
      
      canvas.width = width;
      canvas.height = height;

      // Decode base64 float32 array
      const binaryString = atob(ndviData.matrix_b64);
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
          // NoData -> transparent
          imgData.data[idx] = 0;
          imgData.data[idx+1] = 0;
          imgData.data[idx+2] = 0;
          imgData.data[idx+3] = 0;
        } else {
          // NDVI scale:
          // < 0: Blue (Water)
          // 0 to 0.2: Brown/Grey (Bare soil)
          // 0.2 to 0.4: Light Green (Sparse)
          // 0.4 to 0.6: Green (Moderate)
          // > 0.6: Dark Green (Dense)
          let r = 0, g = 0, b = 0;
          if (val < 0) {
            r = 0; g = 100; b = 255;
          } else if (val < 0.2) {
            r = 200; g = 180; b = 130;
          } else if (val < 0.4) {
            r = 150; g = 220; b = 100;
          } else if (val < 0.6) {
            r = 50; g = 180; b = 50;
          } else {
            r = 0; g = 100; b = 0;
          }

          imgData.data[idx] = r;
          imgData.data[idx+1] = g;
          imgData.data[idx+2] = b;
          imgData.data[idx+3] = 255;
        }
      }
      ctx.putImageData(imgData, 0, 0);
    }
  }, [status, ndviData]);

  if (!selectedScene) return null;

  return (
    <div className="ew-selected-scene-card" style={{ marginTop: '16px' }}>
      <div className="ew-selected-header">
        <span className="ew-selected-tag">
          {status === 'loading' ? 'ANALYZING SATELLITE RASTER...' : status === 'success' ? 'NDVI ANALYSIS / COMPLETE' : 'NDVI ANALYSIS / READY'}
        </span>
        <h3 className="ew-selected-title" style={{ color: '#4ade80' }}>NDVI VEGETATION INTELLIGENCE</h3>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '12px 0' }}>
        <div style={{ fontSize: '11px', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
          <strong>SCENE:</strong> {selectedScene.scene_id} <br/>
          <strong>WINDOW:</strong> 512 &times; 512 px (10m Resolution)
        </div>

        {status === 'ready' && (
          <button
            type="button"
            className="ew-btn-action ew-btn-action-ndvi"
            onClick={runAnalysis}
          >
            RUN NDVI ANALYSIS
          </button>
        )}

        {status === 'loading' && (
          <div className="ew-status-block ew-status-block-loading">
            <span className="ew-btn-spinner" />
            <span>ANALYZING SATELLITE RASTER (NDVI)...</span>
          </div>
        )}

        {status === 'error' && (
          <div className="ew-status-block ew-status-block-error">
            <div style={{ fontWeight: 700, marginBottom: '2px' }}>ANALYSIS FAILED</div>
            <div>{errorMsg}</div>
          </div>
        )}

        {status === 'success' && ndviData && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Standardized Metric Cards: Stats */}
            <div>
              <div style={{ fontSize: '10px', fontFamily: 'var(--font-mono)', color: 'var(--text-dim)', marginBottom: '6px', letterSpacing: '0.08em' }}>
                MEASURED NDVI METRICS
              </div>
              <div className="ew-metric-grid">
                <div className="ew-metric-card">
                  <span className="ew-metric-label">MEAN NDVI</span>
                  <span className="ew-metric-value" style={{ color: '#4ade80' }}>{ndviData.mean.toFixed(4)}</span>
                  <span className="ew-metric-subtext">Spatial Average</span>
                </div>
                <div className="ew-metric-card">
                  <span className="ew-metric-label">MEDIAN NDVI</span>
                  <span className="ew-metric-value">{ndviData.median.toFixed(4)}</span>
                  <span className="ew-metric-subtext">50th Percentile</span>
                </div>
                <div className="ew-metric-card">
                  <span className="ew-metric-label">RANGE [MIN, MAX]</span>
                  <span className="ew-metric-value" style={{ fontSize: '12px' }}>[{ndviData.min.toFixed(3)}, {ndviData.max.toFixed(3)}]</span>
                  <span className="ew-metric-subtext">Extreme bounds</span>
                </div>
                <div className="ew-metric-card">
                  <span className="ew-metric-label">VALID PIXELS</span>
                  <span className="ew-metric-value">{ndviData.valid_pixel_count.toLocaleString()}</span>
                  <span className="ew-metric-subtext">0 NoData</span>
                </div>
              </div>
            </div>

            {/* Standardized Metric Cards: Classifications */}
            <div>
              <div style={{ fontSize: '10px', fontFamily: 'var(--font-mono)', color: 'var(--text-dim)', marginBottom: '6px', letterSpacing: '0.08em' }}>
                VEGETATION CLASSIFICATION DISTRIBUTION
              </div>
              <div className="ew-metric-grid">
                <div className="ew-metric-card">
                  <span className="ew-metric-label">DENSE VEGETATION</span>
                  <span className="ew-metric-value">{ndviData.dense_vegetation_count.toLocaleString()}</span>
                  <span className="ew-metric-subtext">NDVI &gt; 0.60</span>
                </div>
                <div className="ew-metric-card">
                  <span className="ew-metric-label">MODERATE VEG</span>
                  <span className="ew-metric-value">{ndviData.moderate_vegetation_count.toLocaleString()}</span>
                  <span className="ew-metric-subtext">0.40 to 0.60</span>
                </div>
                <div className="ew-metric-card">
                  <span className="ew-metric-label">SPARSE VEG</span>
                  <span className="ew-metric-value">{ndviData.sparse_vegetation_count.toLocaleString()}</span>
                  <span className="ew-metric-subtext">0.20 to 0.40</span>
                </div>
                <div className="ew-metric-card">
                  <span className="ew-metric-label">WATER / BARE</span>
                  <span className="ew-metric-value">{ndviData.water_or_bare_count.toLocaleString()}</span>
                  <span className="ew-metric-subtext">NDVI &lt; 0.20</span>
                </div>
              </div>
            </div>

            <div style={{ fontSize: '11px', color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>
              <strong>CRS:</strong> {ndviData.crs} &nbsp;|&nbsp; <strong>Resolution:</strong> {ndviData.resolution}m
            </div>

            {/* Visualization */}
            <div>
              <div style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)', marginBottom: '8px', fontWeight: 600 }}>
                SENTINEL-2 NDVI SURFACE VISUALIZATION
              </div>
              <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
                <div className="ew-canvas-frame">
                  <canvas 
                    ref={canvasRef} 
                    className="ew-canvas-element"
                    role="img"
                    aria-label="Sentinel-2 NDVI Raster Surface Visualization"
                  />
                </div>
                {/* Standardized Legend */}
                <div className="ew-canvas-legend">
                  <strong style={{ color: 'var(--text-primary)', marginBottom: '4px' }}>SPECTRAL INDEX</strong>
                  <div className="ew-canvas-legend-item">
                    <span className="ew-canvas-legend-swatch" style={{ backgroundColor: 'rgb(0, 100, 0)' }} />
                    <span>&gt; 0.60 Dense Vegetation</span>
                  </div>
                  <div className="ew-canvas-legend-item">
                    <span className="ew-canvas-legend-swatch" style={{ backgroundColor: 'rgb(50, 180, 50)' }} />
                    <span>0.40 – 0.60 Moderate</span>
                  </div>
                  <div className="ew-canvas-legend-item">
                    <span className="ew-canvas-legend-swatch" style={{ backgroundColor: 'rgb(150, 220, 100)' }} />
                    <span>0.20 – 0.40 Sparse</span>
                  </div>
                  <div className="ew-canvas-legend-item">
                    <span className="ew-canvas-legend-swatch" style={{ backgroundColor: 'rgb(200, 180, 130)' }} />
                    <span>0.00 – 0.20 Bare Soil</span>
                  </div>
                  <div className="ew-canvas-legend-item">
                    <span className="ew-canvas-legend-swatch" style={{ backgroundColor: 'rgb(0, 100, 255)' }} />
                    <span>&lt; 0.00 Water / Shadow</span>
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
