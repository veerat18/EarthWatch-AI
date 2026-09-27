import React, { useState } from 'react';

export function AiAnalystPanel({ beforeScene, afterScene }) {
  const [status, setStatus] = useState('ready'); // 'ready', 'loading', 'success', 'error'
  const [errorMsg, setErrorMsg] = useState('');
  const [analystData, setAnalystData] = useState(null);
  const [prevPairKey, setPrevPairKey] = useState(
    beforeScene && afterScene ? `${beforeScene.scene_id}_${afterScene.scene_id}` : ''
  );

  const currentPairKey = beforeScene && afterScene ? `${beforeScene.scene_id}_${afterScene.scene_id}` : '';
  if (currentPairKey !== prevPairKey) {
    setPrevPairKey(currentPairKey);
    setStatus('ready');
    setAnalystData(null);
    setErrorMsg('');
  }

  const runAnalysis = async () => {
    setStatus('loading');
    setErrorMsg('');
    setAnalystData(null);

    try {
      const response = await fetch('http://127.0.0.1:8000/api/v1/analysis/ai-analyst', {
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
        throw new Error(data.detail || 'AI ANALYST UNAVAILABLE');
      }

      setAnalystData(data);
      setStatus('success');
    } catch (e) {
      console.error(e);
      setStatus('error');
      setErrorMsg('AI ANALYST UNAVAILABLE — VERIFIED SATELLITE ANALYSIS REMAINS AVAILABLE.');
    }
  };

  const isReady = beforeScene && afterScene;

  if (!isReady) return null;

  return (
    <div className="ew-selected-scene-card" style={{ marginTop: '16px' }}>
      <div className="ew-selected-header">
        <span className="ew-selected-tag">
          {status === 'loading' ? 'GENERATING EARTH OBSERVATION ASSESSMENT...' : 'AI EARTH ANALYST'}
        </span>
        <h3 className="ew-selected-title" style={{ color: 'var(--accent-purple)' }}>
          {status === 'success' ? 'ASSESSMENT COMPLETE' : 'READY'}
        </h3>
      </div>
      
      {status === 'ready' && (
        <div style={{ marginTop: '14px' }}>
          <button
            type="button"
            className="ew-btn-action ew-btn-action-ai"
            onClick={runAnalysis}
          >
            RUN AI ANALYSIS
          </button>
        </div>
      )}

      {status === 'loading' && (
        <div className="ew-status-block ew-status-block-loading" style={{ marginTop: '14px' }}>
          <span className="ew-btn-spinner" />
          <span>GENERATING EARTH OBSERVATION ASSESSMENT...</span>
        </div>
      )}

      {status === 'error' && (
        <div className="ew-status-block ew-status-block-error" style={{ marginTop: '14px' }}>
          <div style={{ fontWeight: 700, marginBottom: '2px' }}>AI ANALYST CURRENTLY UNAVAILABLE</div>
          <div>{errorMsg}</div>
        </div>
      )}

      {status === 'success' && analystData && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginTop: '16px', fontSize: '12px', color: 'var(--text-secondary)' }}>
          <div style={{
            padding: '8px 12px',
            backgroundColor: 'rgba(167, 139, 250, 0.08)',
            border: '1px solid rgba(167, 139, 250, 0.25)',
            borderRadius: 'var(--radius-sm)',
            color: 'var(--accent-purple)',
            fontStyle: 'italic',
            textAlign: 'center',
            fontSize: '11px'
          }}>
            AI interpretation of verified EarthWatch measurements (Gemini 3.8 Flash)
          </div>

          <div>
            <h4 style={{ margin: '0 0 4px 0', color: 'var(--text-primary)', fontSize: '11px', letterSpacing: '0.06em' }}>EXECUTIVE SUMMARY</h4>
            <p style={{ margin: 0, lineHeight: 1.5, color: 'var(--text-primary)' }}>{analystData.summary}</p>
          </div>

          <div>
            <h4 style={{ margin: '0 0 4px 0', color: 'var(--text-primary)', fontSize: '11px', letterSpacing: '0.06em' }}>KEY FINDINGS</h4>
            <ul style={{ margin: 0, paddingLeft: '18px', lineHeight: 1.5 }}>
              {analystData.key_findings.map((finding, i) => (
                <li key={i} style={{ marginBottom: '2px' }}>{finding}</li>
              ))}
            </ul>
          </div>

          <div>
            <h4 style={{ margin: '0 0 4px 0', color: '#4ade80', fontSize: '11px', letterSpacing: '0.06em' }}>VEGETATION ASSESSMENT</h4>
            <p style={{ margin: 0, lineHeight: 1.5 }}>{analystData.vegetation_assessment}</p>
          </div>

          {analystData.water_signal_assessment && (
            <div>
              <h4 style={{ margin: '0 0 4px 0', color: '#38bdf8', fontSize: '11px', letterSpacing: '0.06em' }}>WATER SIGNAL ASSESSMENT</h4>
              <p style={{ margin: 0, lineHeight: 1.5 }}>{analystData.water_signal_assessment}</p>
            </div>
          )}

          <div>
            <h4 style={{ margin: '0 0 4px 0', color: 'var(--text-primary)', fontSize: '11px', letterSpacing: '0.06em' }}>CHANGE ASSESSMENT</h4>
            <p style={{ margin: 0, lineHeight: 1.5 }}>{analystData.change_assessment}</p>
          </div>

          <div>
            <h4 style={{ margin: '0 0 4px 0', color: 'var(--text-primary)', fontSize: '11px', letterSpacing: '0.06em' }}>CONFIDENCE / DATA QUALITY</h4>
            <p style={{ margin: 0, lineHeight: 1.5 }}>{analystData.confidence_note}</p>
          </div>

          <div>
            <h4 style={{ margin: '0 0 4px 0', color: 'var(--text-primary)', fontSize: '11px', letterSpacing: '0.06em' }}>LIMITATIONS</h4>
            <ul style={{ margin: 0, paddingLeft: '18px', lineHeight: 1.5 }}>
              {analystData.limitations.map((limit, i) => (
                <li key={i} style={{ marginBottom: '2px' }}>{limit}</li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
