/**
 * EarthWatch AI - Unified Frontend API Configuration
 */
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';

export const API_ENDPOINTS = {
  health: `${API_BASE_URL}/health`,
  satelliteSources: `${API_BASE_URL}/api/v1/satellite/sources`,
  satelliteSearch: `${API_BASE_URL}/api/v1/satellite/search`,
  scenePreview: (sceneId) => `${API_BASE_URL}/api/v1/satellite/scenes/${encodeURIComponent(sceneId)}/preview`,
  sceneAssets: (sceneId) => `${API_BASE_URL}/api/v1/satellite/scenes/${encodeURIComponent(sceneId)}/assets`,
  rasterInspect: (sceneId) => `${API_BASE_URL}/api/v1/satellite/scenes/${encodeURIComponent(sceneId)}/raster/inspect`,
  ndvi: `${API_BASE_URL}/api/v1/analysis/ndvi`,
  ndwi: `${API_BASE_URL}/api/v1/analysis/ndwi`,
  changeDetection: `${API_BASE_URL}/api/v1/analysis/change-detection`,
  ndwiChange: `${API_BASE_URL}/api/v1/analysis/ndwi-change`,
  evidence: `${API_BASE_URL}/api/v1/analysis/evidence`,
  aiAnalyst: `${API_BASE_URL}/api/v1/analysis/ai-analyst`,
  reports: `${API_BASE_URL}/api/v1/reports/earth-observation`,
  reportPdf: (reportId) => `${API_BASE_URL}/api/v1/reports/earth-observation/${encodeURIComponent(reportId)}/pdf`,
};
