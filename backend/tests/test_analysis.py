import pytest
import numpy as np
from unittest.mock import patch, MagicMock, AsyncMock
from app.main import app
from fastapi.testclient import TestClient

client = TestClient(app)

MOCK_SCENE_ID = "S2B_MSIL2A_20260118T053049_N0511_R105_T43RGN_20260118T073251"

@pytest.fixture
def mock_raster_service():
    with patch("app.services.analysis.ndvi.inspect_raster_window", new_callable=AsyncMock) as mock_inspect:
        yield mock_inspect

@pytest.mark.anyio
async def test_ndvi_valid_calculation(mock_raster_service):
    def mock_inspect_side_effect(scene_id, band, x, y, w, h, return_data):
        # Create dummy data: 
        # B04 (Red)
        if band == "B04":
            data = np.array([[100, 200], [0, 400]], dtype=np.uint16)
            return {"status": "success", "data": data, "resolution": 10, "crs": "EPSG:32643"}
        # B08 (NIR)
        if band == "B08":
            data = np.array([[300, 200], [0, 800]], dtype=np.uint16)
            return {"status": "success", "data": data, "resolution": 10, "crs": "EPSG:32643"}
        
    mock_raster_service.side_effect = mock_inspect_side_effect
    
    response = client.post(
        f"/api/v1/analysis/ndvi",
        json={"scene_id": MOCK_SCENE_ID, "x": 0, "y": 0, "width": 2, "height": 2}
    )
    
    assert response.status_code == 200
    data = response.json()
    
    # Pixel 0,0: (300-100)/(300+100) = 0.5 (moderate)
    # Pixel 0,1: (200-200)/(200+200) = 0.0 (water_or_bare)
    # Pixel 1,0: (0-0)/(0+0) = NaN -> nodata
    # Pixel 1,1: (800-400)/(800+400) = 0.333 (sparse)
    
    assert data["valid_pixel_count"] == 3
    assert data["nodata_pixel_count"] == 1
    assert data["water_or_bare_count"] == 1
    assert data["sparse_vegetation_count"] == 1
    assert data["moderate_vegetation_count"] == 1
    assert data["dense_vegetation_count"] == 0
    assert abs(data["max"] - 0.5) < 1e-5
    assert abs(data["min"] - 0.0) < 1e-5

@pytest.mark.anyio
async def test_ndvi_invalid_window():
    response = client.post(
        f"/api/v1/analysis/ndvi",
        json={"scene_id": MOCK_SCENE_ID, "x": 0, "y": 0, "width": 4096, "height": 100}
    )
    assert response.status_code == 422
    
@pytest.mark.anyio
async def test_ndvi_service_failure(mock_raster_service):
    def mock_inspect_side_effect(scene_id, band, x, y, w, h, return_data):
        return {"status": "error", "message": "Raster read failure"}
        
    mock_raster_service.side_effect = mock_inspect_side_effect
    
    response = client.post(
        f"/api/v1/analysis/ndvi",
        json={"scene_id": MOCK_SCENE_ID, "x": 0, "y": 0, "width": 2, "height": 2}
    )
    assert response.status_code == 400
    assert "Raster read failure" in response.json()["detail"]

@pytest.mark.anyio
async def test_ndvi_auth_missing(mock_raster_service):
    def mock_inspect_side_effect(scene_id, band, x, y, w, h, return_data):
        return {"status": "auth_missing", "message": "CDSE credentials not configured."}
        
    mock_raster_service.side_effect = mock_inspect_side_effect
    
    response = client.post(
        f"/api/v1/analysis/ndvi",
        json={"scene_id": MOCK_SCENE_ID, "x": 0, "y": 0, "width": 2, "height": 2}
    )
    assert response.status_code == 501
    
@pytest.mark.anyio
async def test_ndvi_dimension_mismatch(mock_raster_service):
    def mock_inspect_side_effect(scene_id, band, x, y, w, h, return_data):
        if band == "B04":
            return {"status": "success", "data": np.zeros((2, 2))}
        if band == "B08":
            return {"status": "success", "data": np.zeros((3, 3))}
            
    mock_raster_service.side_effect = mock_inspect_side_effect
    
    response = client.post(
        f"/api/v1/analysis/ndvi",
        json={"scene_id": MOCK_SCENE_ID, "x": 0, "y": 0, "width": 2, "height": 2}
    )
    assert response.status_code == 400
    assert "Dimension mismatch" in response.json()["detail"]
