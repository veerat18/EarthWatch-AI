import pytest
import numpy as np
from unittest.mock import patch, AsyncMock
from app.main import app
from fastapi.testclient import TestClient

client = TestClient(app)

MOCK_BEFORE = "S2A_MSIL2A_20260105T053251_N0511_R105_T43RGN_20260105T084010"
MOCK_AFTER = "S2B_MSIL2A_20260118T053049_N0511_R105_T43RGN_20260118T073251"

@pytest.fixture
def mock_evidence_services():
    with patch("app.services.analysis.evidence.Sentinel2Provider.get_scene_metadata", new_callable=AsyncMock) as mock_stac:
        with patch("app.services.analysis.evidence.calculate_change_detection", new_callable=AsyncMock) as mock_change:
            with patch("app.services.analysis.evidence.calculate_ndwi", new_callable=AsyncMock) as mock_ndwi:
                with patch("app.services.analysis.evidence.calculate_ndwi_change_detection", new_callable=AsyncMock) as mock_ndwi_change:
                    mock_ndwi.return_value = {"status": "error", "message": "disabled in mock"}
                    mock_ndwi_change.return_value = {"status": "error", "message": "disabled in mock"}
                    yield mock_stac, mock_change

@pytest.mark.anyio
async def test_evidence_generation_valid(mock_evidence_services):
    mock_stac, mock_change = mock_evidence_services
    
    mock_stac.side_effect = lambda scene_id: {
        "status": "success",
        "scene_id": scene_id,
        "satellite": "Sentinel-2A" if "S2A" in scene_id else "Sentinel-2B",
        "acquisition_datetime": "2026-01-05T05:32:51.024Z" if scene_id == MOCK_BEFORE else "2026-01-18T05:30:49.024Z",
        "cloud_cover": 2.5 if scene_id == MOCK_BEFORE else 1.0,
        "tile": "T43RGN"
    }
    
    mock_change.return_value = {
        "status": "success",
        "before_scene_id": MOCK_BEFORE,
        "after_scene_id": MOCK_AFTER,
        "width": 512,
        "height": 512,
        "resolution": 10,
        "crs": "EPSG:32643",
        "ndvi_before": {"min": 0, "max": 1, "mean": 0.5, "median": 0.5, "valid_pixel_count": 100, "nodata_pixel_count": 0},
        "ndvi_after": {"min": 0, "max": 1, "mean": 0.5, "median": 0.5, "valid_pixel_count": 100, "nodata_pixel_count": 0},
        "ndvi_change": {"min": 0, "max": 1, "mean": 0.5, "median": 0.5, "valid_pixel_count": 100, "nodata_pixel_count": 0},
        "significant_loss_count": 10,
        "moderate_loss_count": 20,
        "stable_count": 40,
        "moderate_gain_count": 20,
        "significant_gain_count": 10,
        "matrix_b64": "..."
    }
    
    response = client.post(
        "/api/v1/analysis/evidence",
        json={"before_scene_id": MOCK_BEFORE, "after_scene_id": MOCK_AFTER, "x": 0, "y": 0, "width": 512, "height": 512}
    )
    
    assert response.status_code == 200
    data = response.json()
    
    # Assert Source Data
    assert data["source_data"]["before_scene"]["scene_id"] == MOCK_BEFORE
    assert data["source_data"]["after_scene"]["scene_id"] == MOCK_AFTER
    assert data["source_data"]["temporal_interval_days"] == 13
    assert data["source_data"]["before_scene"]["cloud_cover"] == 2.5
    
    # Assert Parameters
    assert data["analysis_parameters"]["index"] == "NDVI"
    
    # Assert Measurements
    assert data["measurements"]["ndvi_before"]["mean"] == 0.5
    
    # Assert Classifications
    cls = data["classifications"]
    assert cls["significant_vegetation_loss"]["count"] == 10
    assert cls["significant_vegetation_loss"]["percentage"] == 10.0
    
    total_pct = sum([
        cls["significant_vegetation_loss"]["percentage"],
        cls["moderate_vegetation_loss"]["percentage"],
        cls["stable_low_change"]["percentage"],
        cls["moderate_vegetation_gain"]["percentage"],
        cls["significant_vegetation_gain"]["percentage"]
    ])
    assert pytest.approx(total_pct) == 100.0
    
    # Assert Quality
    assert data["data_quality"]["valid_pixel_count"] == 100
    assert "NDVI change represents" in data["data_quality"]["limitations"][0]

@pytest.mark.anyio
async def test_evidence_generation_stac_failure(mock_evidence_services):
    mock_stac, mock_change = mock_evidence_services
    mock_stac.return_value = {"status": "error", "message": "STAC service failure."}
    
    response = client.post(
        "/api/v1/analysis/evidence",
        json={"before_scene_id": MOCK_BEFORE, "after_scene_id": MOCK_AFTER, "x": 0, "y": 0, "width": 512, "height": 512}
    )
    assert response.status_code == 400
    assert "STAC service failure" in response.json()["detail"]

@pytest.mark.anyio
async def test_evidence_generation_change_failure(mock_evidence_services):
    mock_stac, mock_change = mock_evidence_services
    
    mock_stac.return_value = {
        "status": "success", "scene_id": MOCK_BEFORE, "satellite": "S2",
        "acquisition_datetime": "2026", "cloud_cover": 0, "tile": "T"
    }
    
    mock_change.return_value = {"status": "error", "message": "Incompatible CRS"}
    
    response = client.post(
        "/api/v1/analysis/evidence",
        json={"before_scene_id": MOCK_BEFORE, "after_scene_id": MOCK_AFTER, "x": 0, "y": 0, "width": 512, "height": 512}
    )
    assert response.status_code == 400
    assert "Incompatible CRS" in response.json()["detail"]
