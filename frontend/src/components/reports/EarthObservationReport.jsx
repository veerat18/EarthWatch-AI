import React, { useState } from 'react';
import { API_ENDPOINTS } from '../../config/api';

export function EarthObservationReport({ report }) {
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState(null);

  const handleDownloadPdf = async () => {
    setIsDownloading(true);
    setDownloadError(null);
    try {
      const response = await fetch(API_ENDPOINTS.reportPdf(report.metadata.report_id));
      if (!response.ok) {
        throw new Error('Failed to download PDF');
      }
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `EarthWatch_Earth_Observation_Report_${report.metadata.report_id}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
    } catch (err) {
      setDownloadError(err.message);
    } finally {
      setIsDownloading(false);
    }
  };

  if (!report) return null;

  const {
    metadata,
    executive_summary,
    acquisition,
    methodology,
    vegetation,
    water_signal,
    change_detection,
    ai_analysis,
    data_quality,
    technical_metadata
  } = report;

  return (
    <div className="ew-report-document" style={{
      backgroundColor: 'var(--bg-surface)',
      border: '1px solid var(--border-panel)',
      borderRadius: 'var(--radius-md)',
      padding: '32px',
      color: 'var(--text-primary)',
      fontFamily: 'var(--font-sans)',
      display: 'flex',
      flexDirection: 'column',
      gap: '24px',
      maxWidth: '1200px',
      margin: '0 auto',
      boxShadow: 'var(--shadow-panel)'
    }}>
      {/* Document Header */}
      <div style={{
        borderBottom: '1px solid var(--border-panel)',
        paddingBottom: '20px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        flexWrap: 'wrap',
        gap: '16px'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
            <span style={{
              backgroundColor: 'rgba(56, 189, 248, 0.15)',
              color: 'var(--accent-cyan)',
              border: '1px solid rgba(0, 240, 255, 0.25)',
              padding: '2px 8px',
              borderRadius: 'var(--radius-xs)',
              fontSize: '11px',
              fontFamily: 'var(--font-mono)',
              fontWeight: 700,
              letterSpacing: '0.06em'
            }}>
              INTELLIGENCE REPORT
            </span>
            <span style={{ color: 'var(--text-dim)', fontSize: '11px', fontFamily: 'var(--font-mono)' }}>
              {metadata.report_id}
            </span>
          </div>
          <h1 style={{ margin: 0, fontSize: '22px', fontWeight: 800, letterSpacing: '0.06em', color: 'var(--text-primary)' }}>
            EARTHWATCH AI
          </h1>
          <h2 style={{ margin: '4px 0 0 0', fontSize: '14px', fontWeight: 600, color: 'var(--accent-blue)', letterSpacing: '0.04em' }}>
            EARTH OBSERVATION ANALYSIS REPORT
          </h2>
        </div>

        <div style={{ textAlign: 'right', fontSize: '11px', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
          <div>GENERATED: {new Date(metadata.generated_at).toLocaleString()}</div>
          <div>PLATFORM: {metadata.platform}</div>
          <div>PROJECT: {metadata.project}</div>
            <div style={{ marginTop: '12px' }}>
              <button
                onClick={handleDownloadPdf}
                disabled={isDownloading}
                className="ew-action-btn"
                style={{
                  backgroundColor: 'var(--accent-cyan)',
                  color: 'var(--bg-base)',
                  border: 'none',
                  padding: '6px 12px',
                  borderRadius: 'var(--radius-sm)',
                  fontWeight: 'bold',
                  cursor: isDownloading ? 'not-allowed' : 'pointer',
                  opacity: isDownloading ? 0.7 : 1
                }}
              >
                {isDownloading ? 'DOWNLOADING...' : 'DOWNLOAD PDF'}
              </button>
              {downloadError && <div style={{ color: 'var(--status-error)', marginTop: '4px', fontSize: '10px' }}>{downloadError}</div>}
            </div>
        </div>
      </div>

      {/* 1. Executive Summary */}
      <section style={{
        backgroundColor: 'var(--bg-surface-elevated)',
        borderRadius: 'var(--radius-sm)',
        padding: '20px',
        borderLeft: '4px solid var(--accent-cyan)',
        border: '1px solid var(--border-subtle)',
        borderLeftWidth: '4px'
      }}>
        <h3 style={{ margin: '0 0 12px 0', fontSize: '13px', color: 'var(--accent-cyan)', letterSpacing: '0.06em', fontFamily: 'var(--font-mono)' }}>
          1. EXECUTIVE SUMMARY
        </h3>

        <div className="ew-metric-grid" style={{ marginBottom: '16px' }}>
          <div className="ew-metric-card">
            <span className="ew-metric-label">INTERVAL</span>
            <span className="ew-metric-value" style={{ fontSize: '13px' }}>{executive_summary.acquisition_interval}</span>
            <span className="ew-metric-subtext">Acquisition Period</span>
          </div>
          <div className="ew-metric-card">
            <span className="ew-metric-label">ANALYZED AREA</span>
            <span className="ew-metric-value" style={{ fontSize: '13px' }}>{executive_summary.analyzed_area}</span>
            <span className="ew-metric-subtext">Window Grid</span>
          </div>
          <div className="ew-metric-card">
            <span className="ew-metric-label">NDVI DYNAMICS</span>
            <span className="ew-metric-value" style={{ fontSize: '13px', color: '#4ade80' }}>{executive_summary.major_measured_ndvi}</span>
            <span className="ew-metric-subtext">Vegetation Index Shift</span>
          </div>
          <div className="ew-metric-card">
            <span className="ew-metric-label">NDWI DYNAMICS</span>
            <span className="ew-metric-value" style={{ fontSize: '13px', color: 'var(--accent-blue)' }}>{executive_summary.major_measured_ndwi}</span>
            <span className="ew-metric-subtext">Water Signal Shift</span>
          </div>
        </div>

        {/* Clear Distinction: Measured vs AI Interpretation */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '12px', lineHeight: 1.6 }}>
          <div style={{
            backgroundColor: 'rgba(6, 9, 14, 0.8)',
            padding: '14px',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--border-panel)'
          }}>
            <div style={{ fontWeight: 700, color: 'var(--accent-cyan)', marginBottom: '6px', fontSize: '11px', letterSpacing: '0.06em', fontFamily: 'var(--font-mono)' }}>
              [MEASURED SENSOR EVIDENCE]
            </div>
            <ul style={{ margin: 0, paddingLeft: '18px', color: 'var(--text-secondary)' }}>
              {executive_summary.measured_findings.map((item, idx) => (
                <li key={idx} style={{ marginBottom: '3px' }}>{item}</li>
              ))}
            </ul>
          </div>

          <div style={{
            backgroundColor: 'rgba(167, 139, 250, 0.08)',
            padding: '14px',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid rgba(167, 139, 250, 0.25)'
          }}>
            <div style={{ fontWeight: 700, color: 'var(--accent-purple)', marginBottom: '6px', fontSize: '11px', letterSpacing: '0.06em', fontFamily: 'var(--font-mono)' }}>
              [AI EARTH ANALYST INTERPRETATION]
            </div>
            <p style={{ margin: 0, color: 'var(--text-primary)', fontStyle: ai_analysis.available ? 'normal' : 'italic' }}>
              {executive_summary.ai_interpretation || 'AI Analyst interpretation unavailable; deterministic sensor metrics remain fully valid.'}
            </p>
          </div>
        </div>
      </section>

      {/* 2. Acquisition Information */}
      <section style={{ backgroundColor: 'var(--bg-surface-elevated)', borderRadius: 'var(--radius-sm)', padding: '20px', border: '1px solid var(--border-subtle)' }}>
        <h3 style={{ margin: '0 0 14px 0', fontSize: '13px', color: 'var(--text-primary)', letterSpacing: '0.06em', fontFamily: 'var(--font-mono)' }}>
          2. ACQUISITION INFORMATION
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '14px', fontSize: '12px' }}>
          <div className="ew-metric-card" style={{ padding: '14px' }}>
            <span className="ew-metric-label">BEFORE ACQUISITION</span>
            <div style={{ color: 'var(--text-primary)', wordBreak: 'break-all', marginTop: '4px', fontFamily: 'var(--font-mono)', fontSize: '11px' }}>
              <strong>Scene ID:</strong> {acquisition.before_scene_id}
            </div>
            <div style={{ color: 'var(--text-secondary)', marginTop: '4px', fontSize: '11px' }}>
              <strong>Date:</strong> {acquisition.before_acquisition}
            </div>
            <div style={{ color: 'var(--text-secondary)', marginTop: '2px', fontSize: '11px' }}>
              <strong>Cloud Cover:</strong> {acquisition.before_cloud_cover}%
            </div>
          </div>

          <div className="ew-metric-card" style={{ padding: '14px' }}>
            <span className="ew-metric-label">AFTER ACQUISITION</span>
            <div style={{ color: 'var(--text-primary)', wordBreak: 'break-all', marginTop: '4px', fontFamily: 'var(--font-mono)', fontSize: '11px' }}>
              <strong>Scene ID:</strong> {acquisition.after_scene_id}
            </div>
            <div style={{ color: 'var(--text-secondary)', marginTop: '4px', fontSize: '11px' }}>
              <strong>Date:</strong> {acquisition.after_acquisition}
            </div>
            <div style={{ color: 'var(--text-secondary)', marginTop: '2px', fontSize: '11px' }}>
              <strong>Cloud Cover:</strong> {acquisition.after_cloud_cover}%
            </div>
          </div>
        </div>

        <div style={{ marginTop: '12px', padding: '10px 14px', backgroundColor: 'rgba(6, 9, 14, 0.6)', borderRadius: 'var(--radius-sm)', fontSize: '11px', display: 'flex', flexWrap: 'wrap', gap: '20px', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
          <div><strong style={{ color: 'var(--text-primary)' }}>Tile:</strong> {acquisition.tile}</div>
          <div><strong style={{ color: 'var(--text-primary)' }}>CRS:</strong> {acquisition.crs}</div>
          <div><strong style={{ color: 'var(--text-primary)' }}>Resolution:</strong> {acquisition.resolution}m</div>
          <div><strong style={{ color: 'var(--text-primary)' }}>Window:</strong> x={acquisition.analysis_window.x}, y={acquisition.analysis_window.y}, w={acquisition.analysis_window.width}, h={acquisition.analysis_window.height}</div>
        </div>
      </section>

      {/* 3. Analysis Methodology */}
      <section style={{ backgroundColor: 'var(--bg-surface-elevated)', borderRadius: 'var(--radius-sm)', padding: '20px', border: '1px solid var(--border-subtle)' }}>
        <h3 style={{ margin: '0 0 12px 0', fontSize: '13px', color: 'var(--text-primary)', letterSpacing: '0.06em', fontFamily: 'var(--font-mono)' }}>
          3. ANALYSIS METHODOLOGY
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '10px', fontSize: '11px', fontFamily: 'var(--font-mono)' }}>
          <div className="ew-metric-card">
            <span className="ew-metric-label" style={{ color: '#4ade80' }}>NDVI FORMULA</span>
            <span className="ew-metric-value" style={{ fontSize: '12px', color: 'var(--text-primary)' }}>{methodology.ndvi_formula}</span>
          </div>
          <div className="ew-metric-card">
            <span className="ew-metric-label" style={{ color: 'var(--accent-blue)' }}>NDWI FORMULA</span>
            <span className="ew-metric-value" style={{ fontSize: '12px', color: 'var(--text-primary)' }}>{methodology.ndwi_formula}</span>
          </div>
          <div className="ew-metric-card">
            <span className="ew-metric-label" style={{ color: '#fbbf24' }}>CHANGE FORMULA</span>
            <span className="ew-metric-value" style={{ fontSize: '12px', color: 'var(--text-primary)' }}>{methodology.change_formula}</span>
          </div>
        </div>
        <div style={{ marginTop: '12px', padding: '8px 12px', backgroundColor: 'rgba(245, 158, 11, 0.08)', border: '1px solid rgba(245, 158, 11, 0.25)', borderRadius: 'var(--radius-sm)', fontSize: '11px', color: '#fde68a' }}>
          {methodology.classification_disclaimer}
        </div>
      </section>

      {/* 4. Vegetation Analysis */}
      <section style={{ backgroundColor: 'var(--bg-surface-elevated)', borderRadius: 'var(--radius-sm)', padding: '20px', border: '1px solid var(--border-subtle)' }}>
        <h3 style={{ margin: '0 0 14px 0', fontSize: '13px', color: '#4ade80', letterSpacing: '0.06em', fontFamily: 'var(--font-mono)' }}>
          4. VEGETATION ANALYSIS (NDVI)
        </h3>
        <div style={{ overflowX: 'auto', marginBottom: '16px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-panel)', color: 'var(--text-dim)', fontFamily: 'var(--font-mono)', fontSize: '11px' }}>
                <th style={{ padding: '8px' }}>METRIC</th>
                <th style={{ padding: '8px' }}>BEFORE</th>
                <th style={{ padding: '8px' }}>AFTER</th>
                <th style={{ padding: '8px' }}>CHANGE</th>
              </tr>
            </thead>
            <tbody style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
              <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                <td style={{ padding: '8px', color: 'var(--text-secondary)', fontFamily: 'var(--font-sans)' }}>Mean</td>
                <td style={{ padding: '8px' }}>{vegetation.before_ndvi.mean.toFixed(4)}</td>
                <td style={{ padding: '8px' }}>{vegetation.after_ndvi.mean.toFixed(4)}</td>
                <td style={{ padding: '8px', color: vegetation.ndvi_change.mean >= 0 ? '#4ade80' : '#f87171' }}>
                  {vegetation.ndvi_change.mean >= 0 ? '+' : ''}{vegetation.ndvi_change.mean.toFixed(4)}
                </td>
              </tr>
              <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                <td style={{ padding: '8px', color: 'var(--text-secondary)', fontFamily: 'var(--font-sans)' }}>Median</td>
                <td style={{ padding: '8px' }}>{vegetation.before_ndvi.median.toFixed(4)}</td>
                <td style={{ padding: '8px' }}>{vegetation.after_ndvi.median.toFixed(4)}</td>
                <td style={{ padding: '8px', color: vegetation.ndvi_change.median >= 0 ? '#4ade80' : '#f87171' }}>
                  {vegetation.ndvi_change.median >= 0 ? '+' : ''}{vegetation.ndvi_change.median.toFixed(4)}
                </td>
              </tr>
              <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                <td style={{ padding: '8px', color: 'var(--text-secondary)', fontFamily: 'var(--font-sans)' }}>Min / Max</td>
                <td style={{ padding: '8px' }}>[{vegetation.before_ndvi.min.toFixed(4)}, {vegetation.before_ndvi.max.toFixed(4)}]</td>
                <td style={{ padding: '8px' }}>[{vegetation.after_ndvi.min.toFixed(4)}, {vegetation.after_ndvi.max.toFixed(4)}]</td>
                <td style={{ padding: '8px' }}>[{vegetation.ndvi_change.min.toFixed(4)}, {vegetation.ndvi_change.max.toFixed(4)}]</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div>
          <div style={{ fontSize: '10px', fontFamily: 'var(--font-mono)', color: 'var(--text-dim)', marginBottom: '8px', letterSpacing: '0.08em' }}>
            VEGETATION CHANGE CLASSIFICATIONS
          </div>
          <div className="ew-metric-grid">
            {Object.entries(vegetation.classifications).map(([key, val]) => (
              <div key={key} className="ew-metric-card">
                <span className="ew-metric-label">{key.replace(/_/g, ' ')}</span>
                <span className="ew-metric-value">{val.percentage.toFixed(2)}%</span>
                <span className="ew-metric-subtext">{val.count.toLocaleString()} pixels</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 5. Water-Signal Analysis */}
      <section style={{ backgroundColor: 'var(--bg-surface-elevated)', borderRadius: 'var(--radius-sm)', padding: '20px', border: '1px solid var(--border-subtle)' }}>
        <h3 style={{ margin: '0 0 14px 0', fontSize: '13px', color: 'var(--accent-blue)', letterSpacing: '0.06em', fontFamily: 'var(--font-mono)' }}>
          5. WATER-SIGNAL ANALYSIS (NDWI)
        </h3>
        {water_signal.available && water_signal.ndwi ? (
          <div>
            <div className="ew-metric-grid" style={{ marginBottom: '14px' }}>
              <div className="ew-metric-card">
                <span className="ew-metric-label">AFTER SCENE NDWI MEAN</span>
                <span className="ew-metric-value" style={{ color: 'var(--accent-blue)' }}>{water_signal.ndwi.mean.toFixed(4)}</span>
                <span className="ew-metric-subtext">Spatial Average</span>
              </div>
              <div className="ew-metric-card">
                <span className="ew-metric-label">NDWI RANGE</span>
                <span className="ew-metric-value" style={{ fontSize: '12px' }}>[{water_signal.ndwi.min.toFixed(3)}, {water_signal.ndwi.max.toFixed(3)}]</span>
                <span className="ew-metric-subtext">Min to Max</span>
              </div>
              {water_signal.ndwi_change && (
                <div className="ew-metric-card">
                  <span className="ew-metric-label">NDWI MEAN SHIFT</span>
                  <span className="ew-metric-value" style={{ color: water_signal.ndwi_change.mean >= 0 ? 'var(--accent-blue)' : '#f87171' }}>
                    {water_signal.ndwi_change.mean >= 0 ? '+' : ''}{water_signal.ndwi_change.mean.toFixed(4)}
                  </span>
                  <span className="ew-metric-subtext">Net Shift</span>
                </div>
              )}
            </div>

            {water_signal.change_classifications && (
              <div style={{ marginBottom: '14px' }}>
                <div style={{ fontSize: '10px', fontFamily: 'var(--font-mono)', color: 'var(--text-dim)', marginBottom: '8px', letterSpacing: '0.08em' }}>
                  WATER-SIGNAL CHANGE CLASSIFICATIONS
                </div>
                <div className="ew-metric-grid">
                  {Object.entries(water_signal.change_classifications).map(([key, val]) => (
                    <div key={key} className="ew-metric-card">
                      <span className="ew-metric-label">{key.replace(/_/g, ' ')}</span>
                      <span className="ew-metric-value" style={{ color: 'var(--accent-blue)' }}>{val.percentage.toFixed(2)}%</span>
                      <span className="ew-metric-subtext">{val.count.toLocaleString()} pixels</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div style={{ fontSize: '11px', color: 'var(--text-dim)', fontStyle: 'italic', marginTop: '8px' }}>
              {water_signal.note}
            </div>
          </div>
        ) : (
          <div style={{ color: '#f87171', fontSize: '12px', fontStyle: 'italic' }}>
            {water_signal.note || 'NDWI analytical data is not available for this acquisition pair.'}
          </div>
        )}
      </section>

      {/* 6. Change Detection Combined Summary */}
      <section style={{ backgroundColor: 'var(--bg-surface-elevated)', borderRadius: 'var(--radius-sm)', padding: '20px', border: '1px solid var(--border-subtle)' }}>
        <h3 style={{ margin: '0 0 12px 0', fontSize: '13px', color: 'var(--text-primary)', letterSpacing: '0.06em', fontFamily: 'var(--font-mono)' }}>
          6. CHANGE DETECTION SUMMARY
        </h3>
        <div style={{ backgroundColor: 'rgba(6, 9, 14, 0.6)', padding: '14px', borderRadius: 'var(--radius-sm)', fontSize: '12px', lineHeight: 1.6, color: 'var(--text-secondary)' }}>
          <p style={{ margin: '0 0 10px 0', color: 'var(--text-primary)' }}>{change_detection.dynamics_summary}</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', fontSize: '11px', color: 'var(--text-dim)', borderTop: '1px solid var(--border-subtle)', paddingTop: '8px', fontFamily: 'var(--font-mono)' }}>
            <div>Valid Pixels: <strong style={{ color: 'var(--text-primary)' }}>{change_detection.valid_pixels.toLocaleString()}</strong></div>
            <div>NoData Pixels: <strong style={{ color: 'var(--text-primary)' }}>{change_detection.nodata_pixels}</strong></div>
            <div>NDVI Mean Shift: <strong style={{ color: '#4ade80' }}>{change_detection.ndvi_mean_change >= 0 ? '+' : ''}{change_detection.ndvi_mean_change.toFixed(4)}</strong></div>
            {change_detection.ndwi_mean_change !== null && (
              <div>NDWI Mean Shift: <strong style={{ color: 'var(--accent-blue)' }}>{change_detection.ndwi_mean_change >= 0 ? '+' : ''}{change_detection.ndwi_mean_change.toFixed(4)}</strong></div>
            )}
          </div>
        </div>
      </section>

      {/* 7. AI Earth Analyst Findings */}
      <section style={{ backgroundColor: 'var(--bg-surface-elevated)', borderRadius: 'var(--radius-sm)', padding: '20px', borderLeft: '4px solid var(--accent-purple)', border: '1px solid var(--border-subtle)', borderLeftWidth: '4px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <h3 style={{ margin: 0, fontSize: '13px', color: 'var(--accent-purple)', letterSpacing: '0.06em', fontFamily: 'var(--font-mono)' }}>
            7. AI EARTH ANALYST FINDINGS
          </h3>
          <span style={{ fontSize: '10px', fontFamily: 'var(--font-mono)', color: 'var(--accent-purple)', backgroundColor: 'rgba(167, 139, 250, 0.15)', padding: '2px 8px', borderRadius: 'var(--radius-xs)' }}>
            {ai_analysis.provider}
          </span>
        </div>

        {ai_analysis.available ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            <div>
              <h4 style={{ margin: '0 0 4px 0', color: 'var(--text-primary)', fontSize: '11px', fontFamily: 'var(--font-mono)' }}>EXECUTIVE SUMMARY</h4>
              <p style={{ margin: 0, color: 'var(--text-primary)' }}>{ai_analysis.summary}</p>
            </div>

            {ai_analysis.key_findings && ai_analysis.key_findings.length > 0 && (
              <div>
                <h4 style={{ margin: '0 0 4px 0', color: 'var(--text-primary)', fontSize: '11px', fontFamily: 'var(--font-mono)' }}>KEY FINDINGS</h4>
                <ul style={{ margin: 0, paddingLeft: '18px' }}>
                  {ai_analysis.key_findings.map((f, i) => (
                    <li key={i}>{f}</li>
                  ))}
                </ul>
              </div>
            )}

            {ai_analysis.vegetation_assessment && (
              <div>
                <h4 style={{ margin: '0 0 4px 0', color: '#4ade80', fontSize: '11px', fontFamily: 'var(--font-mono)' }}>VEGETATION ASSESSMENT</h4>
                <p style={{ margin: 0 }}>{ai_analysis.vegetation_assessment}</p>
              </div>
            )}

            {ai_analysis.water_signal_assessment && (
              <div>
                <h4 style={{ margin: '0 0 4px 0', color: 'var(--accent-blue)', fontSize: '11px', fontFamily: 'var(--font-mono)' }}>WATER SIGNAL ASSESSMENT</h4>
                <p style={{ margin: 0 }}>{ai_analysis.water_signal_assessment}</p>
              </div>
            )}

            {ai_analysis.change_assessment && (
              <div>
                <h4 style={{ margin: '0 0 4px 0', color: 'var(--text-primary)', fontSize: '11px', fontFamily: 'var(--font-mono)' }}>CHANGE ASSESSMENT</h4>
                <p style={{ margin: 0 }}>{ai_analysis.change_assessment}</p>
              </div>
            )}

            {ai_analysis.confidence_note && (
              <div>
                <h4 style={{ margin: '0 0 4px 0', color: 'var(--text-primary)', fontSize: '11px', fontFamily: 'var(--font-mono)' }}>CONFIDENCE / DATA QUALITY</h4>
                <p style={{ margin: 0 }}>{ai_analysis.confidence_note}</p>
              </div>
            )}

            {ai_analysis.limitations && ai_analysis.limitations.length > 0 && (
              <div>
                <h4 style={{ margin: '0 0 4px 0', color: 'var(--text-primary)', fontSize: '11px', fontFamily: 'var(--font-mono)' }}>ANALYTICAL LIMITATIONS</h4>
                <ul style={{ margin: 0, paddingLeft: '18px' }}>
                  {ai_analysis.limitations.map((l, i) => (
                    <li key={i}>{l}</li>
                  ))}
                </ul>
              </div>
            )}

            <div style={{ fontSize: '11px', color: 'var(--text-dim)', fontStyle: 'italic', borderTop: '1px solid var(--border-subtle)', paddingTop: '8px' }}>
              {ai_analysis.disclaimer}
            </div>
          </div>
        ) : (
          <div className="ew-status-block ew-status-block-error">
            <div style={{ fontWeight: 700, marginBottom: '4px' }}>AI ANALYST CURRENTLY UNAVAILABLE</div>
            <div>{ai_analysis.summary}</div>
            <div style={{ marginTop: '8px', color: 'var(--text-secondary)' }}>{ai_analysis.disclaimer}</div>
          </div>
        )}
      </section>

      {/* 8. Data Quality & Limitations */}
      <section style={{ backgroundColor: 'var(--bg-surface-elevated)', borderRadius: 'var(--radius-sm)', padding: '20px', border: '1px solid var(--border-subtle)' }}>
        <h3 style={{ margin: '0 0 12px 0', fontSize: '13px', color: 'var(--text-primary)', letterSpacing: '0.06em', fontFamily: 'var(--font-mono)' }}>
          8. DATA QUALITY & LIMITATIONS
        </h3>
        <div className="ew-metric-grid" style={{ marginBottom: '14px' }}>
          <div className="ew-metric-card">
            <span className="ew-metric-label">VALID PIXELS</span>
            <span className="ew-metric-value">{data_quality.valid_pixels.toLocaleString()}</span>
            <span className="ew-metric-subtext">Evaluated</span>
          </div>
          <div className="ew-metric-card">
            <span className="ew-metric-label">NODATA PIXELS</span>
            <span className="ew-metric-value">{data_quality.nodata_pixels}</span>
            <span className="ew-metric-subtext">Excluded</span>
          </div>
          <div className="ew-metric-card">
            <span className="ew-metric-label">BEFORE CLOUD COVER</span>
            <span className="ew-metric-value">{data_quality.cloud_cover_before}%</span>
            <span className="ew-metric-subtext">STAC Metadata</span>
          </div>
          <div className="ew-metric-card">
            <span className="ew-metric-label">AFTER CLOUD COVER</span>
            <span className="ew-metric-value">{data_quality.cloud_cover_after}%</span>
            <span className="ew-metric-subtext">STAC Metadata</span>
          </div>
        </div>

        <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
          <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: '6px', fontFamily: 'var(--font-mono)' }}>METHODOLOGY LIMITATIONS</div>
          <ul style={{ margin: 0, paddingLeft: '18px', lineHeight: 1.5 }}>
            {data_quality.limitations.map((lim, idx) => (
              <li key={idx} style={{ marginBottom: '2px' }}>{lim}</li>
            ))}
          </ul>
        </div>
      </section>

      {/* 9. Technical Metadata */}
      <section style={{ backgroundColor: 'var(--bg-surface-elevated)', borderRadius: 'var(--radius-sm)', padding: '20px', border: '1px solid var(--border-subtle)' }}>
        <h3 style={{ margin: '0 0 12px 0', fontSize: '13px', color: 'var(--text-dim)', letterSpacing: '0.06em', fontFamily: 'var(--font-mono)' }}>
          9. TECHNICAL METADATA
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '8px', fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>
          <div><strong style={{ color: 'var(--text-primary)' }}>Sensor:</strong> {technical_metadata.sensor}</div>
          <div><strong style={{ color: 'var(--text-primary)' }}>Resolution:</strong> {technical_metadata.spatial_resolution}</div>
          <div><strong style={{ color: 'var(--text-primary)' }}>CRS:</strong> {technical_metadata.crs}</div>
          <div><strong style={{ color: 'var(--text-primary)' }}>Tile:</strong> {technical_metadata.tile}</div>
          <div><strong style={{ color: 'var(--text-primary)' }}>Engine:</strong> {technical_metadata.analysis_engine}</div>
          <div><strong style={{ color: 'var(--text-primary)' }}>Catalog:</strong> {technical_metadata.stac_catalog}</div>
        </div>
      </section>

      {/* Footer Branding */}
      <div style={{ textAlign: 'center', fontSize: '11px', color: 'var(--text-dim)', borderTop: '1px solid var(--border-subtle)', paddingTop: '16px', fontFamily: 'var(--font-mono)' }}>
        EarthWatch AI Intelligence Command Center • Verified Multi-Temporal Earth Observation Report
      </div>
    </div>
  );
}
