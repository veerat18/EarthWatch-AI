import React, { useState } from 'react';
import { FileTextIcon } from '../components/common/Icons';
import { API_ENDPOINTS } from '../config/api';
import { EarthObservationReport } from '../components/reports/EarthObservationReport';

export function ReportsPage({ data, onNavigate }) {
  const { beforeScene, afterScene, ndviData, ndwiData } = data || {};
  const hasData = beforeScene && afterScene;

  const [status, setStatus] = useState('idle'); // 'idle', 'loading', 'success', 'error'
  const [errorMsg, setErrorMsg] = useState('');
  const [reportData, setReportData] = useState(null);

  const handleGenerateReport = async () => {
    if (!hasData) return;
    setStatus('loading');
    setErrorMsg('');
    setReportData(null);

    try {
      const response = await fetch(API_ENDPOINTS.reports, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          before_scene_id: beforeScene.scene_id.trim(),
          after_scene_id: afterScene.scene_id.trim(),
          x: 0,
          y: 0,
          width: 512,
          height: 512,
        }),
      });

      const json = await response.json();

      if (!response.ok) {
        throw new Error(json.detail || 'Failed to generate Earth Observation report.');
      }

      setReportData(json);
      setStatus('success');
    } catch (err) {
      console.error(err);
      setStatus('error');
      setErrorMsg(err.message || 'Report generation encountered an error.');
    }
  };

  if (!hasData) {
    return (
      <div className="ew-dashboard-container">
        <section className="ew-panel" style={{ padding: '20px 24px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <FileTextIcon size={14} style={{ color: 'var(--accent-cyan)' }} />
              <span style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--accent-cyan)', letterSpacing: '0.1em' }}>
                EARTH OBSERVATION REPORTS
              </span>
            </div>
            <h1 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '0.04em' }}>
              EARTH OBSERVATION REPORTS
            </h1>
            <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: 'var(--text-secondary)' }}>
              Verified satellite-derived reports generated from evidence-grounded Earth observation analysis.
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
          <FileTextIcon size={44} style={{ color: 'var(--text-dim)', marginBottom: '14px' }} />
          <h3 style={{ margin: '0 0 6px 0', fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)' }}>
            NO VERIFIED REPORT
          </h3>
          <p style={{ margin: '0 0 20px 0', maxWidth: '420px', fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
            Generate a verified Earth observation report from an analyzed before/after scene pair.
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



  const d1 = new Date(beforeScene.acquisition_datetime);
  const d2 = new Date(afterScene.acquisition_datetime);
  const intervalDays = Math.round((d2 - d1) / (1000 * 60 * 60 * 24));
  const tile = beforeScene.tile || beforeScene.scene_id?.split('_')[5] || '--';
  const res = ndviData?.resolution || ndwiData?.resolution || 10;

  return (
    <div className="ew-dashboard-container" style={{ gap: '20px' }}>
      {/* Top Banner */}
      <section className="ew-panel" style={{ padding: '20px 24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '14px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <FileTextIcon size={14} style={{ color: 'var(--accent-cyan)' }} />
              <span style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--accent-cyan)', letterSpacing: '0.1em' }}>
                EARTH OBSERVATION REPORTS
              </span>
            </div>
            <h1 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '0.04em' }}>
              EARTH OBSERVATION REPORTS
            </h1>
            <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: 'var(--text-secondary)' }}>
              Verified satellite-derived reports generated from evidence-grounded Earth observation analysis.
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span className="ew-badge-live" style={{ fontSize: '10px', padding: '4px 10px', backgroundColor: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8', borderColor: '#38bdf8' }}>
              VERIFIED REPORTING
            </span>
          </div>
        </div>
      </section>

      {/* Control Area */}
      <section className="ew-panel" style={{ padding: '16px 20px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px', fontSize: '11px', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)', marginBottom: '20px' }}>
          <div>
            <div style={{ color: 'var(--text-dim)', marginBottom: '4px' }}>BEFORE SCENE</div>
            <div style={{ color: 'var(--text-primary)', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={beforeScene.scene_id}>{beforeScene.scene_id}</div>
          </div>
          <div>
            <div style={{ color: 'var(--text-dim)', marginBottom: '4px' }}>AFTER SCENE</div>
            <div style={{ color: 'var(--text-primary)', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={afterScene.scene_id}>{afterScene.scene_id}</div>
          </div>
          <div>
            <div style={{ color: 'var(--text-dim)', marginBottom: '4px' }}>TEMPORAL INTERVAL</div>
            <div style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{intervalDays} DAYS</div>
          </div>
          <div>
            <div style={{ color: 'var(--text-dim)', marginBottom: '4px' }}>ANALYSIS WINDOW</div>
            <div style={{ color: 'var(--text-primary)', fontWeight: 600 }}>512 &times; 512 px</div>
          </div>
          <div>
            <div style={{ color: 'var(--text-dim)', marginBottom: '4px' }}>RESOLUTION</div>
            <div style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{res}m</div>
          </div>
          <div>
            <div style={{ color: 'var(--text-dim)', marginBottom: '4px' }}>TILE</div>
            <div style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{tile}</div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            {status === 'error' ? (
              <div style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: '#ef4444' }}>
                <strong>ERROR:</strong> {errorMsg}
              </div>
            ) : (
              <div style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: status === 'success' ? 'var(--text-secondary)' : 'var(--text-dim)' }}>
                <strong style={{ color: status === 'success' ? 'var(--accent-cyan)' : 'inherit' }}>REPORT ID:</strong> {(status === 'success' && reportData?.metadata?.report_id) ? reportData.metadata.report_id : '--'} &nbsp;|&nbsp; <strong style={{ color: status === 'success' ? 'inherit' : 'inherit' }}>GENERATED:</strong> {(status === 'success' && reportData?.metadata?.generated_at) ? new Date(reportData.metadata.generated_at).toLocaleString() : '--'}
              </div>
            )}
          </div>
          <button
            type="button"
            className="ew-btn ew-btn-primary"
            onClick={handleGenerateReport}
            disabled={status === 'loading'}
            style={{ padding: '10px 20px', fontSize: '12px' }}
          >
            {status === 'loading' ? 'GENERATING REPORT...' : status === 'success' ? 'REGENERATE REPORT' : 'GENERATE VERIFIED REPORT'}
          </button>
        </div>
      </section>

      {/* Loading State */}
      {status === 'loading' && (
        <div className="ew-panel" style={{ padding: '60px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <span className="ew-btn-spinner" style={{ width: '30px', height: '30px', borderWidth: '3px', marginBottom: '16px' }} />
          <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>ACQUIRING DATA</div>
        </div>
      )}

      {/* Error State */}
      {status === 'error' && (
        <div className="ew-panel" style={{ padding: '60px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', borderColor: '#ef4444' }}>
          <div style={{ fontSize: '14px', fontWeight: 700, color: '#ef4444', marginBottom: '8px' }}>DATA ACQUISITION FAILED</div>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{errorMsg}</div>
        </div>
      )}

      {/* Report View */}
      {status === 'success' && reportData && (
        <EarthObservationReport report={reportData} />
      )}
    </div>
  );
}
