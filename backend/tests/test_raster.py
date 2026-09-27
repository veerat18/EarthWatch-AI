import pytest
import numpy as np
from unittest.mock import patch, MagicMock, AsyncMock
from app.main import app
from fastapi.testclient import TestClient

client = TestClient(app)

MOCK_SCENE_ID = "S2B_MSIL2A_20260118T053049_N0511_R105_T43RGN_20260118T073251"
MOCK_ASSETS_RESP = {
    "status": "success",
    "assets": [
        {"key": "B04", "band": "B04", "href": "s3://foo/b04.jp2", "resolution": 10},
        {"key": "B08", "band": "B08", "href": "s3://foo/b08.jp2", "resolution": 10}
    ]
}

@pytest.fixture
def mock_dependencies():
    with patch("app.services.satellite.sentinel2.Sentinel2Provider.inspect_scene_assets", new_callable=AsyncMock) as mock_assets:
        with patch("app.services.raster.service.get_cdse_credentials") as mock_creds:
            with patch("app.services.raster.service.get_cdse_token", new_callable=AsyncMock) as mock_token:
                with patch("rasterio.open") as mock_open:
                    yield mock_assets, mock_creds, mock_token, mock_open

@pytest.mark.anyio
async def test_valid_raster_inspection(mock_dependencies):
    mock_assets, mock_creds, mock_token, mock_open = mock_dependencies
    mock_assets.return_value = MOCK_ASSETS_RESP
    mock_creds.return_value = MagicMock()
    mock_token.return_value = "fake_token"
    
    mock_src = MagicMock()
    mock_src.width = 10980
    mock_src.height = 10980
    mock_src.crs.to_string.return_value = "EPSG:32643"
    mock_src.read.return_value = np.array([[100, 200], [300, 400]], dtype=np.uint16)
    mock_src.window_transform.return_value.to_gdal.return_value = (0.0, 10.0, 0.0, 0.0, 0.0, -10.0)
    mock_open.return_value.__enter__.return_value = mock_src
    
    response = client.post(
        f"/api/v1/satellite/scenes/{MOCK_SCENE_ID}/raster/inspect",
        json={"band": "B04", "x": 0, "y": 0, "width": 512, "height": 512}
    )
    assert response.status_code == 200
    data = response.json()
    assert data["band"] == "B04"
    assert data["width"] == 2
    assert data["height"] == 2
    assert data["mean"] == 250.0

@pytest.mark.anyio
async def test_invalid_band():
    response = client.post(
        f"/api/v1/satellite/scenes/{MOCK_SCENE_ID}/raster/inspect",
        json={"band": "B99", "x": 0, "y": 0, "width": 512, "height": 512}
    )
    assert response.status_code == 400
    assert "Invalid band" in response.json()["detail"]

@pytest.mark.anyio
async def test_oversized_window():
    response = client.post(
        f"/api/v1/satellite/scenes/{MOCK_SCENE_ID}/raster/inspect",
        json={"band": "B04", "x": 0, "y": 0, "width": 4096, "height": 512}
    )
    assert response.status_code == 422
    assert "less than or equal to 2048" in str(response.json())

@pytest.mark.anyio
async def test_missing_credentials(mock_dependencies):
    mock_assets, mock_creds, mock_token, mock_open = mock_dependencies
    mock_assets.return_value = MOCK_ASSETS_RESP
    mock_creds.return_value = None  # Missing creds
    
    response = client.post(
        f"/api/v1/satellite/scenes/{MOCK_SCENE_ID}/raster/inspect",
        json={"band": "B04", "x": 0, "y": 0, "width": 512, "height": 512}
    )
    assert response.status_code == 501
    assert "credentials not configured" in response.json()["detail"]

@pytest.mark.anyio
async def test_authentication_failure(mock_dependencies):
    mock_assets, mock_creds, mock_token, mock_open = mock_dependencies
    mock_assets.return_value = MOCK_ASSETS_RESP
    mock_creds.return_value = MagicMock()
    mock_token.return_value = None  # Auth failure
    
    response = client.post(
        f"/api/v1/satellite/scenes/{MOCK_SCENE_ID}/raster/inspect",
        json={"band": "B04", "x": 0, "y": 0, "width": 512, "height": 512}
    )
    assert response.status_code == 401
    assert "Authentication failure" in response.json()["detail"]

@pytest.mark.anyio
async def test_raster_asset_unavailable(mock_dependencies):
    mock_assets, mock_creds, mock_token, mock_open = mock_dependencies
    mock_assets.return_value = {"status": "success", "assets": []}
    
    response = client.post(
        f"/api/v1/satellite/scenes/{MOCK_SCENE_ID}/raster/inspect",
        json={"band": "B04", "x": 0, "y": 0, "width": 512, "height": 512}
    )
    assert response.status_code == 404
    assert "unavailable" in response.json()["detail"]

@pytest.mark.anyio
async def test_raster_read_failure(mock_dependencies):
    mock_assets, mock_creds, mock_token, mock_open = mock_dependencies
    mock_assets.return_value = MOCK_ASSETS_RESP
    mock_creds.return_value = MagicMock()
    mock_token.return_value = "fake_token"
    mock_open.side_effect = Exception("S3 error")
    
    response = client.post(
        f"/api/v1/satellite/scenes/{MOCK_SCENE_ID}/raster/inspect",
        json={"band": "B04", "x": 0, "y": 0, "width": 512, "height": 512}
    )
    assert response.status_code == 400
    assert "Raster read failure" in response.json()["detail"]

@pytest.mark.anyio
async def test_invalid_window_bounds(mock_dependencies):
    mock_assets, mock_creds, mock_token, mock_open = mock_dependencies
    mock_assets.return_value = MOCK_ASSETS_RESP
    mock_creds.return_value = MagicMock()
    mock_token.return_value = "fake_token"
    
    mock_src = MagicMock()
    mock_src.width = 100
    mock_src.height = 100
    mock_open.return_value.__enter__.return_value = mock_src
    
    response = client.post(
        f"/api/v1/satellite/scenes/{MOCK_SCENE_ID}/raster/inspect",
        json={"band": "B04", "x": 200, "y": 200, "width": 10, "height": 10}
    )
    assert response.status_code == 400
    assert "Invalid window: outside raster bounds" in response.json()["detail"]
