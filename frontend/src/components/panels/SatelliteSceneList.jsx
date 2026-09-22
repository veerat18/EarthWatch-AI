import React from 'react';
import { SatelliteIcon, CalendarIcon, LayersIcon } from '../common/Icons';

export function SatelliteSceneList({ 
  scenes = [], 
  _searchAttempted = false,
  providerConfigured = false, 
  onSelectScene,
  selectedSceneId 
}) {
  return (
    <div className="ew-scene-results-container" aria-label="Discovered Satellite Scenes">
      <div className="ew-results-header">
        <div className="ew-results-title-wrap">
          <SatelliteIcon size={14} className="ew-results-icon" />
          <h3 className="ew-results-title">DISCOVERED SCENES</h3>
        </div>
        <span className="ew-results-count-badge">
          {scenes.length} {scenes.length === 1 ? 'SCENE' : 'SCENES'}
        </span>
      </div>

      {scenes.length === 0 ? (
        /* Empty State */
        <div className="ew-scenes-empty-state" role="status">
          <div className="ew-scenes-empty-icon-wrap" aria-hidden="true">
            <SatelliteIcon size={24} />
          </div>
          <div className="ew-scenes-empty-title">NO SATELLITE SCENES</div>
          <p className="ew-scenes-empty-desc">
            Configure a satellite imagery provider to search real scenes.
          </p>
          <div className="ew-scenes-empty-meta">
            <span>STAC CATALOG: UNLINKED</span>
            <span className="ew-sep">•</span>
            <span>PROVIDER STATUS: {providerConfigured ? 'CONNECTED' : 'DISCONNECTED'}</span>
          </div>
        </div>
      ) : (
        /* Discovered Scenes Grid (Ready for real API responses) */
        <div className="ew-scenes-grid" role="list">
          {scenes.map((scene) => {
            const isSelected = selectedSceneId === scene.scene_id;
            return (
              <article 
                key={scene.scene_id} 
                className={`ew-scene-card ${isSelected ? 'ew-scene-card-selected' : ''}`}
                role="listitem"
              >
                {/* Thumbnail / Sensor Preview */}
                <div className="ew-scene-thumb-wrap">
                  {scene.thumbnail_url ? (
                    <img 
                      src={scene.thumbnail_url} 
                      alt={`Preview thumbnail for ${scene.scene_id}`} 
                      className="ew-scene-thumb-img"
                    />
                  ) : (
                    <div className="ew-scene-thumb-placeholder">
                      <LayersIcon size={20} />
                      <span>NO PREVIEW</span>
                    </div>
                  )}
                  <span className="ew-scene-level-badge">{scene.processing_level || 'L2A'}</span>
                </div>

                {/* Scene Metadata */}
                <div className="ew-scene-content">
                  <div className="ew-scene-header-row">
                    <span className="ew-scene-satellite">{scene.satellite}</span>
                    <span className="ew-scene-cloud">
                      CLOUD: {scene.cloud_cover.toFixed(1)}%
                    </span>
                  </div>

                  <div className="ew-scene-id" title={scene.scene_id}>
                    {scene.scene_id}
                  </div>

                  <div className="ew-scene-meta-row">
                    <span className="ew-scene-date">
                      <CalendarIcon size={11} className="ew-meta-icon" />
                      {new Date(scene.acquisition_datetime).toLocaleString(undefined, {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                        timeZoneName: 'short'
                      })}
                    </span>
                  </div>

                  {scene.bbox && (
                    <div className="ew-scene-bbox" title={`Bounding Box: [${scene.bbox.join(', ')}]`}>
                      <span className="ew-bbox-label">BBOX:</span> [{scene.bbox.map(n => n.toFixed(2)).join(', ')}]
                    </div>
                  )}
                </div>

                {/* Action Button */}
                <div className="ew-scene-action">
                  <button
                    type="button"
                    className={`ew-scene-select-btn ${isSelected ? 'ew-btn-active' : ''}`}
                    onClick={() => onSelectScene && onSelectScene(scene)}
                  >
                    {isSelected ? 'SELECTED' : 'SELECT SCENE'}
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
