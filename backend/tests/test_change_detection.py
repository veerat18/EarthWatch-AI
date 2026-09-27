import pytest
import numpy as np
from unittest.mock import patch, AsyncMock
from app.main import app
from fastapi.testclient import TestClient

client = TestClient(app)

MOCK_BEFORE = "S2A_MSIL2A_20260105T053251_N0511_R105_T43RGN_20260105T084010"
MOCK_AFTER = "S2B_MSIL2A_20260118T053049_N0511_R105_T43RGN_20260118T073251"

@pytest.fixture
def mock_raster_service():
    with patch("app.services.analysis.change_detection.inspect_raster_window", new_callable=AsyncMock) as mock_inspect:
        yield mock_inspect

@pytest.mark.anyio
async def test_change_detection_valid(mock_raster_service):
    def mock_inspect_side_effect(scene_id, band, x, y, w, h, return_data):
        if scene_id == MOCK_BEFORE:
            if band == "B04":
                data = np.array([[100, 200], [0, 400]], dtype=np.uint16)
            else:
                data = np.array([[300, 200], [0, 800]], dtype=np.uint16)
        else: # MOCK_AFTER
            if band == "B04":
                data = np.array([[50, 200], [0, 800]], dtype=np.uint16)
            else:
                data = np.array([[350, 100], [0, 400]], dtype=np.uint16)
                
        return {"status": "success", "data": data, "resolution": 10, "crs": "EPSG:32643", "transform": [1,2,3,4,5,6]}
        
    mock_raster_service.side_effect = mock_inspect_side_effect
    
    response = client.post(
        "/api/v1/analysis/change-detection",
        json={"before_scene_id": MOCK_BEFORE, "after_scene_id": MOCK_AFTER, "x": 0, "y": 0, "width": 2, "height": 2}
    )
    
    assert response.status_code == 200
    data = response.json()
    
    assert data["before_scene_id"] == MOCK_BEFORE
    assert data["after_scene_id"] == MOCK_AFTER
    assert "matrix_b64" in data
    
    # Pixel 0,0: Before: (300-100)/(300+100)=0.5, After: (350-50)/(350+50)=0.75, Change: +0.25 (significant gain)
    # Pixel 0,1: Before: (200-200)/(200+200)=0.0, After: (100-200)/(100+200)=-0.33, Change: -0.33 (significant loss)
    # Pixel 1,0: Before: NaN, After: NaN -> Change: NaN
    # Pixel 1,1: Before: (800-400)/(800+400)=0.33, After: (400-800)/(400+800)=-0.33, Change: -0.66 (significant loss)
    
    assert data["significant_gain_count"] == 1
    assert data["significant_loss_count"] == 2
    assert data["moderate_loss_count"] == 0
    assert data["stable_count"] == 0
    assert data["moderate_gain_count"] == 0

@pytest.mark.anyio
async def test_change_detection_same_scene():
    response = client.post(
        "/api/v1/analysis/change-detection",
        json={"before_scene_id": MOCK_BEFORE, "after_scene_id": MOCK_BEFORE, "x": 0, "y": 0, "width": 2, "height": 2}
    )
    assert response.status_code == 400
    assert "must be different" in response.json()["detail"]

@pytest.mark.anyio
async def test_change_detection_invalid_date_order():
    response = client.post(
        "/api/v1/analysis/change-detection",
        json={"before_scene_id": MOCK_AFTER, "after_scene_id": MOCK_BEFORE, "x": 0, "y": 0, "width": 2, "height": 2}
    )
    assert response.status_code == 400
    assert "earlier than AFTER" in response.json()["detail"]

@pytest.mark.anyio
async def test_change_detection_incompatible_crs(mock_raster_service):
    def mock_inspect_side_effect(scene_id, band, x, y, w, h, return_data):
        crs = "EPSG:32643" if scene_id == MOCK_BEFORE else "EPSG:32644"
        data = np.zeros((2, 2), dtype=np.uint16)
        return {"status": "success", "data": data, "resolution": 10, "crs": crs, "transform": []}
        
    mock_raster_service.side_effect = mock_inspect_side_effect
    
    response = client.post(
        "/api/v1/analysis/change-detection",
        json={"before_scene_id": MOCK_BEFORE, "after_scene_id": MOCK_AFTER, "x": 0, "y": 0, "width": 2, "height": 2}
    )
    assert response.status_code == 400
    assert "Incompatible CRS" in response.json()["detail"]
