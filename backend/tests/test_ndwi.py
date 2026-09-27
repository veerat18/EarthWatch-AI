import pytest
import base64
import numpy as np
from unittest.mock import patch, AsyncMock
from app.main import app
from fastapi.testclient import TestClient
from app.services.analysis.ndwi import compute_ndwi, classify_water_signals
from app.services.analysis.models import NDWIResponse

client = TestClient(app)

MOCK_SCENE_ID = "S2B_MSIL2A_20260118T053049_N0511_R105_T43RGN_20260118T073251"


def test_ndwi_formula_and_zero_denominator():
    """Verify NDWI = (B03 - B08) / (B03 + B08) and safe zero denominator handling."""
    # Green (B03) and NIR (B08)
    green = np.array([300, 100, 500, 0], dtype=np.uint16)
    nir = np.array([100, 300, 500, 0], dtype=np.uint16)

    ndwi = compute_ndwi(green, nir)

    # Pixel 0: (300 - 100) / (300 + 100) = 200 / 400 = 0.5
    assert abs(ndwi[0] - 0.5) < 1e-6
    # Pixel 1: (100 - 300) / (100 + 300) = -200 / 400 = -0.5
    assert abs(ndwi[1] - (-0.5)) < 1e-6
    # Pixel 2: (500 - 500) / (500 + 500) = 0.0
    assert abs(ndwi[2] - 0.0) < 1e-6
    # Pixel 3: (0 - 0) / (0 + 0) -> Zero denominator safely NaN
    assert np.isnan(ndwi[3])


def test_ndwi_classification_thresholds_and_percentages():
    """
    Verify analytical classification thresholds and valid pixel percentages:
    - NDWI < 0.0: NON-WATER / LOW WATER SIGNAL
    - 0.0 <= NDWI < 0.2: LOW WATER SIGNAL
    - 0.2 <= NDWI < 0.4: MODERATE WATER SIGNAL
    - NDWI >= 0.4: HIGH WATER SIGNAL
    """
    ndwi = np.array([-0.3, -0.05, 0.0, 0.15, 0.2, 0.35, 0.4, 0.75, np.nan], dtype=np.float32)
    stats = classify_water_signals(ndwi)

    assert stats["valid_pixel_count"] == 8
    assert stats["nodata_pixel_count"] == 1

    # Counts
    assert stats["non_water_or_low_signal_count"] == 2  # -0.3, -0.05
    assert stats["low_water_signal_count"] == 2         # 0.0, 0.15
    assert stats["moderate_water_signal_count"] == 2    # 0.2, 0.35
    assert stats["high_water_signal_count"] == 2        # 0.4, 0.75

    # Percentages (each 2 out of 8 = 25.0%)
    assert stats["non_water_or_low_signal_percentage"] == 25.0
    assert stats["low_water_signal_percentage"] == 25.0
    assert stats["moderate_water_signal_percentage"] == 25.0
    assert stats["high_water_signal_percentage"] == 25.0

    # Summary statistics
    assert abs(stats["min"] - (-0.3)) < 1e-5
    assert abs(stats["max"] - 0.75) < 1e-5


@pytest.fixture
def mock_raster_service():
    with patch("app.services.analysis.ndwi.inspect_raster_window", new_callable=AsyncMock) as mock_inspect:
        yield mock_inspect


@pytest.mark.anyio
async def test_ndwi_endpoint_valid(mock_raster_service):
    def mock_side_effect(scene_id, band, x, y, w, h, return_data):
        if band == "B03":
            # 2x2: Green
            data = np.array([[300, 200], [0, 600]], dtype=np.uint16)
            return {"status": "success", "data": data, "resolution": 10, "crs": "EPSG:32643"}
        elif band == "B08":
            # 2x2: NIR
            data = np.array([[100, 200], [0, 200]], dtype=np.uint16)
            return {"status": "success", "data": data, "resolution": 10, "crs": "EPSG:32643"}
        return {"status": "error", "message": f"Unknown band {band}"}

    mock_raster_service.side_effect = mock_side_effect

    response = client.post(
        "/api/v1/analysis/ndwi",
        json={"scene_id": MOCK_SCENE_ID, "x": 0, "y": 0, "width": 2, "height": 2}
    )

    assert response.status_code == 200
    data = response.json()

    # Pydantic schema validation
    validated = NDWIResponse(**data)
    assert validated.scene_id == MOCK_SCENE_ID
    assert validated.valid_pixel_count == 3
    assert validated.nodata_pixel_count == 1
    assert validated.crs == "EPSG:32643"
    assert validated.resolution == 10

    # Matrix decode verification
    matrix_bytes = base64.b64decode(validated.matrix_b64)
    matrix = np.frombuffer(matrix_bytes, dtype=np.float32).reshape((2, 2))
    assert abs(matrix[0, 0] - 0.5) < 1e-5  # (300-100)/(300+100) = 0.5
    assert abs(matrix[0, 1] - 0.0) < 1e-5  # (200-200)/(200+200) = 0.0
    assert np.isnan(matrix[1, 0])          # (0-0)/(0+0) = NaN
    assert abs(matrix[1, 1] - 0.5) < 1e-5  # (600-200)/(600+200) = 0.5


@pytest.mark.anyio
async def test_ndwi_endpoint_invalid_window():
    # Width exceeds 2048
    resp_wide = client.post(
        "/api/v1/analysis/ndwi",
        json={"scene_id": MOCK_SCENE_ID, "x": 0, "y": 0, "width": 4096, "height": 512}
    )
    assert resp_wide.status_code == 422

    # Negative coordinate
    resp_neg = client.post(
        "/api/v1/analysis/ndwi",
        json={"scene_id": MOCK_SCENE_ID, "x": -5, "y": 0, "width": 512, "height": 512}
    )
    assert resp_neg.status_code == 422


@pytest.mark.anyio
async def test_ndwi_endpoint_invalid_scene():
    # Non-Sentinel-2 scene
    response = client.post(
        "/api/v1/analysis/ndwi",
        json={"scene_id": "LANDSAT_08_INVALID_SCENE", "x": 0, "y": 0, "width": 512, "height": 512}
    )
    assert response.status_code == 400
    assert "Sentinel-2" in response.json()["detail"]


@pytest.mark.anyio
async def test_ndwi_raster_service_failure(mock_raster_service):
    # Simulated raster reading failure
    mock_raster_service.return_value = {"status": "error", "message": "Raster window unavailable"}

    response = client.post(
        "/api/v1/analysis/ndwi",
        json={"scene_id": MOCK_SCENE_ID, "x": 0, "y": 0, "width": 512, "height": 512}
    )
    assert response.status_code == 404
    assert "unavailable" in response.json()["detail"].lower()


@pytest.mark.anyio
async def test_ndwi_auth_missing(mock_raster_service):
    mock_raster_service.return_value = {"status": "auth_missing", "message": "Credentials missing"}
    response = client.post(
        "/api/v1/analysis/ndwi",
        json={"scene_id": MOCK_SCENE_ID, "x": 0, "y": 0, "width": 512, "height": 512}
    )
    assert response.status_code == 501
