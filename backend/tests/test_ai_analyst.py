import pytest
from unittest.mock import patch, AsyncMock, MagicMock
from app.main import app
from fastapi.testclient import TestClient

client = TestClient(app)

MOCK_BEFORE = "S2A_MSIL2A_20260105T053251_N0511_R105_T43RGN_20260105T084010"
MOCK_AFTER = "S2B_MSIL2A_20260118T053049_N0511_R105_T43RGN_20260118T073251"

MOCK_EVIDENCE = {
    "status": "success",
    "source_data": {
        "before_scene": {"scene_id": MOCK_BEFORE, "acquisition_datetime": "2026-01-05T05:32:51.024Z", "cloud_cover": 2.5, "satellite": "Sentinel-2A", "tile": "T43RGN"},
        "after_scene": {"scene_id": MOCK_AFTER, "acquisition_datetime": "2026-01-18T05:30:49.024Z", "cloud_cover": 1.0, "satellite": "Sentinel-2B", "tile": "T43RGN"},
        "temporal_interval_days": 13,
        "aoi_location": None
    },
    "analysis_parameters": {
        "index": "NDVI", "formula": "(B08 - B04) / (B08 + B04)", "change_formula": "NDVI_after - NDVI_before",
        "window": {"x": 0, "y": 0, "width": 512, "height": 512}, "resolution": 10, "crs": "EPSG:32643"
    },
    "measurements": {
        "ndvi_before": {"min": 0, "max": 1, "mean": 0.5, "median": 0.5, "valid_pixel_count": 100, "nodata_pixel_count": 0},
        "ndvi_after": {"min": 0, "max": 1, "mean": 0.5, "median": 0.5, "valid_pixel_count": 100, "nodata_pixel_count": 0},
        "ndvi_change": {"min": 0, "max": 1, "mean": 0.0, "median": 0.0, "valid_pixel_count": 100, "nodata_pixel_count": 0}
    },
    "classifications": {
        "significant_vegetation_loss": {"count": 0, "percentage": 0},
        "moderate_vegetation_loss": {"count": 0, "percentage": 0},
        "stable_low_change": {"count": 100, "percentage": 100},
        "moderate_vegetation_gain": {"count": 0, "percentage": 0},
        "significant_vegetation_gain": {"count": 0, "percentage": 0}
    },
    "data_quality": {
        "valid_pixel_count": 100, "nodata_pixel_count": 0,
        "cloud_cover_before": 2.5, "cloud_cover_after": 1.0,
        "raster_resolution": 10, "crs": "EPSG:32643", "analysis_window": "512x512",
        "source_provider": "Copernicus Data Space Ecosystem", "limitations": []
    }
}

@pytest.fixture
def mock_analyst_deps():
    with patch("app.api.v1.endpoints.analysis.generate_analysis_evidence", new_callable=AsyncMock) as mock_evidence:
        with patch("app.services.ai.provider.EarthAnalystProvider.generate_analysis", new_callable=AsyncMock) as mock_ai:
            yield mock_evidence, mock_ai

@pytest.mark.anyio
async def test_ai_analyst_success(mock_analyst_deps):
    mock_evidence, mock_ai = mock_analyst_deps
    mock_evidence.return_value = MOCK_EVIDENCE
    
    mock_ai.return_value = {
        "status": "success",
        "analysis": {
            "summary": "Mock Summary",
            "key_findings": ["Finding 1"],
            "vegetation_assessment": "Vegetation is stable.",
            "change_assessment": "No significant change.",
            "confidence_note": "High confidence based on evidence.",
            "limitations": ["Mock limitation"]
        }
    }
    
    response = client.post(
        "/api/v1/analysis/ai-analyst",
        json={"before_scene_id": MOCK_BEFORE, "after_scene_id": MOCK_AFTER, "x": 0, "y": 0, "width": 512, "height": 512}
    )
    
    assert response.status_code == 200
    data = response.json()
    assert data["summary"] == "Mock Summary"
    assert data["key_findings"] == ["Finding 1"]

@pytest.mark.anyio
async def test_ai_analyst_missing_key(mock_analyst_deps):
    mock_evidence, mock_ai = mock_analyst_deps
    mock_evidence.return_value = MOCK_EVIDENCE
    mock_ai.return_value = {"status": "error", "message": "AI ANALYST UNAVAILABLE (Missing API Key)"}
    
    response = client.post(
        "/api/v1/analysis/ai-analyst",
        json={"before_scene_id": MOCK_BEFORE, "after_scene_id": MOCK_AFTER, "x": 0, "y": 0, "width": 512, "height": 512}
    )
    assert response.status_code == 503
    assert "AI ANALYST UNAVAILABLE" in response.json()["detail"]

@pytest.mark.anyio
async def test_ai_analyst_evidence_failure(mock_analyst_deps):
    mock_evidence, mock_ai = mock_analyst_deps
    mock_evidence.return_value = {"status": "error", "message": "Incompatible CRS"}
    
    response = client.post(
        "/api/v1/analysis/ai-analyst",
        json={"before_scene_id": MOCK_BEFORE, "after_scene_id": MOCK_AFTER, "x": 0, "y": 0, "width": 512, "height": 512}
    )
    assert response.status_code == 400
    assert "VERIFIED EVIDENCE COULD NOT BE GENERATED" in response.json()["detail"]
