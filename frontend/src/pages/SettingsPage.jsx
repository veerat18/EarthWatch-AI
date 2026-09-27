import React from 'react';
import { SettingsIcon, ActivityIcon, GlobeIcon, CrosshairIcon, CpuIcon } from '../components/common/Icons';

export function SettingsPage({ stacStatus }) {
  return (
    <div className="ew-dashboard-container" style={{ gap: '24px', paddingBottom: '40px' }}>
      
      <section className="ew-panel" style={{ padding: '20px 24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '14px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <SettingsIcon size={14} style={{ color: 'var(--accent-cyan)' }} />
              <span style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--accent-cyan)', letterSpacing: '0.1em' }}>
                SYSTEM CONFIGURATION
              </span>
            </div>
            <h1 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '0.04em' }}>
              SYSTEM CONFIGURATION
            </h1>
            <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: 'var(--text-secondary)' }}>
              Core platform configuration, operational status, and analytical thresholds.
            </p>
          </div>
        </div>
      </section>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '24px' }}>
        
        {/* SYSTEM STATUS */}
        <section className="ew-panel" style={{ padding: '20px 24px' }}>
          <div className="ew-panel-header" style={{ marginBottom: '16px' }}>
            <div className="ew-panel-title-wrap">
              <ActivityIcon size={14} className="ew-panel-icon" />
              <h2 className="ew-panel-title">SYSTEM STATUS</h2>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', fontSize: '12px', fontFamily: 'var(--font-mono)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '8px' }}>
              <span style={{ color: 'var(--text-dim)' }}>API STATUS</span>
              <span style={{ color: 'var(--accent-cyan)', fontWeight: 600 }}>ONLINE</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '8px' }}>
              <span style={{ color: 'var(--text-dim)' }}>STAC STATUS</span>
              <span style={{ color: stacStatus === 'CONNECTED' ? '#4ade80' : stacStatus === 'OFFLINE' ? '#ef4444' : 'var(--text-secondary)', fontWeight: 600 }}>{stacStatus}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '8px' }}>
              <span style={{ color: 'var(--text-dim)' }}>FRONTEND STATUS</span>
              <span style={{ color: '#4ade80', fontWeight: 600 }}>OPERATIONAL</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-dim)' }}>ANALYSIS ENGINE</span>
              <span style={{ color: '#4ade80', fontWeight: 600 }}>AVAILABLE</span>
            </div>
          </div>
        </section>

        {/* EARTH OBSERVATION CONFIGURATION */}
        <section className="ew-panel" style={{ padding: '20px 24px' }}>
          <div className="ew-panel-header" style={{ marginBottom: '16px' }}>
            <div className="ew-panel-title-wrap">
              <GlobeIcon size={14} className="ew-panel-icon" />
              <h2 className="ew-panel-title">EARTH OBSERVATION CONFIGURATION</h2>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', fontSize: '12px', fontFamily: 'var(--font-mono)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '8px' }}>
              <span style={{ color: 'var(--text-dim)' }}>DEFAULT SATELLITE</span>
              <span style={{ color: 'var(--text-primary)' }}>Sentinel-2 L2A</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '8px' }}>
              <span style={{ color: 'var(--text-dim)' }}>STAC PROVIDER</span>
              <span style={{ color: 'var(--text-primary)' }}>Copernicus Data Space</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '8px' }}>
              <span style={{ color: 'var(--text-dim)' }}>DEFAULT RESOLUTION</span>
              <span style={{ color: 'var(--text-primary)' }}>10m</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '8px' }}>
              <span style={{ color: 'var(--text-dim)' }}>DEFAULT ANALYSIS WINDOW</span>
              <span style={{ color: 'var(--text-primary)' }}>512 &times; 512 px</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-dim)' }}>DEFAULT CRS</span>
              <span style={{ color: 'var(--text-primary)' }}>EPSG:32643</span>
            </div>
          </div>
        </section>

        {/* ANALYSIS THRESHOLDS */}
        <section className="ew-panel" style={{ padding: '20px 24px' }}>
          <div className="ew-panel-header" style={{ marginBottom: '16px' }}>
            <div className="ew-panel-title-wrap">
              <CrosshairIcon size={14} className="ew-panel-icon" />
              <h2 className="ew-panel-title">CONFIGURED ANALYTICAL THRESHOLDS</h2>
            </div>
          </div>
          
          <div style={{ marginBottom: '12px', fontSize: '11px', color: 'var(--text-dim)', fontFamily: 'var(--font-mono)', letterSpacing: '0.05em' }}>NDVI</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12px', fontFamily: 'var(--font-mono)', marginBottom: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', backgroundColor: 'rgba(239, 68, 68, 0.1)', padding: '6px 12px', borderRadius: '4px' }}>
              <span style={{ color: '#ef4444' }}>Significant Loss</span>
              <span style={{ color: '#ef4444' }}>&le; -0.20</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', backgroundColor: 'rgba(249, 115, 22, 0.1)', padding: '6px 12px', borderRadius: '4px' }}>
              <span style={{ color: '#f97316' }}>Moderate Loss</span>
              <span style={{ color: '#f97316' }}>&gt; -0.20 to &le; -0.05</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', backgroundColor: 'rgba(148, 163, 184, 0.1)', padding: '6px 12px', borderRadius: '4px' }}>
              <span style={{ color: '#94a3b8' }}>Stable</span>
              <span style={{ color: '#94a3b8' }}>&gt; -0.05 to &lt; +0.05</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', backgroundColor: 'rgba(134, 239, 172, 0.1)', padding: '6px 12px', borderRadius: '4px' }}>
              <span style={{ color: '#86efac' }}>Moderate Gain</span>
              <span style={{ color: '#86efac' }}>&ge; +0.05 to &lt; +0.20</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', backgroundColor: 'rgba(34, 197, 94, 0.1)', padding: '6px 12px', borderRadius: '4px' }}>
              <span style={{ color: '#22c55e' }}>Significant Gain</span>
              <span style={{ color: '#22c55e' }}>&ge; +0.20</span>
            </div>
          </div>

          <div style={{ marginBottom: '12px', fontSize: '11px', color: 'var(--text-dim)', fontFamily: 'var(--font-mono)', letterSpacing: '0.05em' }}>NDWI</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12px', fontFamily: 'var(--font-mono)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', backgroundColor: 'rgba(239, 68, 68, 0.1)', padding: '6px 12px', borderRadius: '4px' }}>
              <span style={{ color: '#ef4444' }}>Significant Loss</span>
              <span style={{ color: '#ef4444' }}>&le; -0.20</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', backgroundColor: 'rgba(249, 115, 22, 0.1)', padding: '6px 12px', borderRadius: '4px' }}>
              <span style={{ color: '#f97316' }}>Moderate Loss</span>
              <span style={{ color: '#f97316' }}>&gt; -0.20 to &le; -0.05</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', backgroundColor: 'rgba(148, 163, 184, 0.1)', padding: '6px 12px', borderRadius: '4px' }}>
              <span style={{ color: '#94a3b8' }}>Stable</span>
              <span style={{ color: '#94a3b8' }}>&gt; -0.05 to &lt; +0.05</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', backgroundColor: 'rgba(134, 239, 172, 0.1)', padding: '6px 12px', borderRadius: '4px' }}>
              <span style={{ color: '#86efac' }}>Moderate Gain</span>
              <span style={{ color: '#86efac' }}>&ge; +0.05 to &lt; +0.20</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', backgroundColor: 'rgba(21, 128, 61, 0.1)', padding: '6px 12px', borderRadius: '4px' }}>
              <span style={{ color: '#15803d' }}>Significant Gain</span>
              <span style={{ color: '#15803d' }}>&ge; +0.20</span>
            </div>
          </div>
        </section>

        {/* AI ANALYST */}
        <section className="ew-panel" style={{ padding: '20px 24px' }}>
          <div className="ew-panel-header" style={{ marginBottom: '16px' }}>
            <div className="ew-panel-title-wrap">
              <CpuIcon size={14} className="ew-panel-icon" />
              <h2 className="ew-panel-title">AI ANALYST</h2>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ fontSize: '13px', color: 'var(--text-primary)', fontWeight: 600 }}>Gemini-powered evidence interpretation</div>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '12px' }}>
              The AI Analyst is configured to synthesize measured structural telemetry directly from the Earth observation engine.
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px', backgroundColor: 'rgba(74, 222, 128, 0.05)', border: '1px solid rgba(74, 222, 128, 0.2)', borderRadius: '6px' }}>
              <span style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>SERVICE STATE</span>
              <span style={{ fontSize: '12px', fontFamily: 'var(--font-mono)', fontWeight: 700, color: '#4ade80' }}>CONFIGURED</span>
            </div>
          </div>
        </section>

      </div>
    </div>
  );
}
