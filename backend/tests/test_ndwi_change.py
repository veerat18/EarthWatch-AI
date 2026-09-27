import pytest
import base64
import numpy as np
from unittest.mock import patch, AsyncMock
from app.main import app
from fastapi.testclient import TestClient
from app.services.analysis.ndwi_change import (
    classify_ndwi_change,
    calculate_stats,
    extract_tile,
    is_sentinel2_l2a,
    parse_scene_date,
)
from app.services.analysis.models import NDWIChangeDetectionResponse

client = TestClient(app)

MOCK_BEFORE = "S2A_MSIL2A_20260105T053251_N0511_R105_T43RGN_20260105T084010"
MOCK_AFTER = "S2B_MSIL2A_20260118T053049_N0511_R105_T43RGN_20260118T073251"


def test_ndwi_change_helpers():
    """Verify tile extraction, date parsing, and Sentinel-2 L2A validation."""
    assert extract_tile(MOCK_BEFORE) == "T43RGN"
    assert extract_tile(MOCK_AFTER) == "T43RGN"
    assert is_sentinel2_l2a(MOCK_BEFORE) is True
    assert is_sentinel2_l2a(MOCK_AFTER) is True
    assert is_sentinel2_l2a("LANDSAT_08_L1T") is False

    d_before = parse_scene_date(MOCK_BEFORE)
    d_after = parse_scene_date(MOCK_AFTER)
    assert d_before < d_after


def test_ndwi_change_thresholds_and_count_conservation():
    """
    Verify analytical classification thresholds:
    - Significant loss: change <= -0.20
    - Moderate loss: -0.20 < change <= -0.05
    - Stable: -0.05 < change < +0.05
    - Moderate gain: +0.05 <= change < +0.20
    - Significant gain: change >= +0.20
    And verify count conservation: sum(counts) == valid_pixel_count.
    """
    # Create test change values:
    # Significant loss (<= -0.20): -0.40, -0.20 (2)
    # Moderate loss (-0.20 < c <= -0.05): -0.15, -0.05 (2)
    # Stable (-0.05 < c < 0.05): -0.02, 0.0, 0.04 (3)
    # Moderate gain (0.05 <= c < 0.20): 0.05, 0.18 (2)
    # Significant gain (c >= 0.20): 0.20, 0.50 (2)
    # NaN: 2
    change_arr = np.array(
        [-0.40, -0.20, -0.15, -0.05, -0.02, 0.0, 0.04, 0.05, 0.18, 0.20, 0.50, np.nan, np.nan],
        dtype=np.float32,
    )

    results = classify_ndwi_change(change_arr)
    valid_count = 11

    assert results["significant_loss_count"] == 2
    assert results["moderate_loss_count"] == 2
    assert results["stable_count"] == 3
    assert results["moderate_gain_count"] == 2
    assert results["significant_gain_count"] == 2

    # Invariant: Classification counts must sum to valid_pixel_count
    total_classified = (
        results["significant_loss_count"]
        + results["moderate_loss_count"]
        + results["stable_count"]
        + results["moderate_gain_count"]
        + results["significant_gain_count"]
    )
    assert total_classified == valid_count

    # Percentages
    assert results["significant_loss_percentage"] == round(2 / 11 * 100.0, 2)
    assert results["moderate_loss_percentage"] == round(2 / 11 * 100.0, 2)
    assert results["stable_percentage"] == round(3 / 11 * 100.0, 2)
    assert results["moderate_gain_percentage"] == round(2 / 11 * 100.0, 2)
    assert results["significant_gain_percentage"] == round(2 / 11 * 100.0, 2)


def test_calculate_stats_zero_denominator_and_nan():
    """Verify calculate_stats properly separates valid from nodata NaNs."""
    arr = np.array([[0.5, np.nan], [np.nan, -0.2]], dtype=np.float32)
    stats = calculate_stats(arr)
    assert stats["valid_pixel_count"] == 2
    assert stats["nodata_pixel_count"] == 2
    assert abs(stats["min"] - (-0.2)) < 1e-6
    assert abs(stats["max"] - 0.5) < 1e-6
    assert abs(stats["mean"] - 0.15) < 1e-6


@pytest.fixture
def mock_raster():
    with patch("app.services.analysis.ndwi_change.inspect_raster_window", new_callable=AsyncMock) as mock_inspect:
        yield mock_inspect


@pytest.mark.anyio
async def test_ndwi_change_endpoint_success(mock_raster):
    """Verify complete NDWI change detection pipeline via API."""
    def mock_side_effect(scene_id, band, x, y, w, h, return_data):
        if scene_id == MOCK_BEFORE:
            # Before: Green = 200, NIR = 400 -> NDWI = (200-400)/(200+400) = -0.3333
            data = np.full((2, 2), 200 if band == "B03" else 400, dtype=np.uint16)
        else:
            # After: Green = 400, NIR = 200 -> NDWI = (400-200)/(400+200) = +0.3333
            data = np.full((2, 2), 400 if band == "B03" else 200, dtype=np.uint16)
        return {"status": "success", "data": data, "resolution": 10, "crs": "EPSG:32643"}

    mock_raster.side_effect = mock_side_effect

    response = client.post(
        "/api/v1/analysis/ndwi-change",
        json={
            "before_scene_id": MOCK_BEFORE,
            "after_scene_id": MOCK_AFTER,
            "x": 0,
            "y": 0,
            "width": 2,
            "height": 2,
        },
    )

    assert response.status_code == 200
    data = response.json()

    # Schema validation
    validated = NDWIChangeDetectionResponse(**data)
    assert validated.before_scene_id == MOCK_BEFORE
    assert validated.after_scene_id == MOCK_AFTER
    assert validated.width == 2
    assert validated.height == 2
    assert validated.crs == "EPSG:32643"
    assert validated.resolution == 10

    # Expected change: +0.3333 - (-0.3333) = +0.6667 (Significant Gain >= +0.20)
    assert validated.significant_gain_count == 4
    assert validated.significant_gain_percentage == 100.0
    assert validated.stable_count == 0

    # Matrix verification
    matrix_bytes = base64.b64decode(validated.matrix_b64)
    matrix = np.frombuffer(matrix_bytes, dtype=np.float32).reshape((2, 2))
    assert np.allclose(matrix, 2 / 3, atol=1e-5)


@pytest.mark.anyio
async def test_ndwi_change_identical_scenes():
    response = client.post(
        "/api/v1/analysis/ndwi-change",
        json={
            "before_scene_id": MOCK_BEFORE,
            "after_scene_id": MOCK_BEFORE,
            "x": 0,
            "y": 0,
            "width": 512,
            "height": 512,
        },
    )
    assert response.status_code == 400
    assert "different" in response.json()["detail"].lower()


@pytest.mark.anyio
async def test_ndwi_change_reversed_dates():
    # Send after scene as before and before scene as after
    response = client.post(
        "/api/v1/analysis/ndwi-change",
        json={
            "before_scene_id": MOCK_AFTER,
            "after_scene_id": MOCK_BEFORE,
            "x": 0,
            "y": 0,
            "width": 512,
            "height": 512,
        },
    )
    assert response.status_code == 400
    assert "earlier" in response.json()["detail"].lower()


@pytest.mark.anyio
async def test_ndwi_change_incompatible_tiles():
    # Change tile from T43RGN to T43RGM in after scene ID
    incompatible_after = MOCK_AFTER.replace("T43RGN", "T43RGM")
    response = client.post(
        "/api/v1/analysis/ndwi-change",
        json={
            "before_scene_id": MOCK_BEFORE,
            "after_scene_id": incompatible_after,
            "x": 0,
            "y": 0,
            "width": 512,
            "height": 512,
        },
    )
    assert response.status_code == 400
    assert "tile" in response.json()["detail"].lower()


@pytest.mark.anyio
async def test_ndwi_change_invalid_window():
    # Width exceeds 2048
    response = client.post(
        "/api/v1/analysis/ndwi-change",
        json={
            "before_scene_id": MOCK_BEFORE,
            "after_scene_id": MOCK_AFTER,
            "x": 0,
            "y": 0,
            "width": 4096,
            "height": 512,
        },
    )
    assert response.status_code == 422


@pytest.mark.anyio
async def test_ndwi_change_raster_failure(mock_raster):
    mock_raster.return_value = {"status": "error", "message": "Remote raster unavailable"}
    response = client.post(
        "/api/v1/analysis/ndwi-change",
        json={
            "before_scene_id": MOCK_BEFORE,
            "after_scene_id": MOCK_AFTER,
            "x": 0,
            "y": 0,
            "width": 512,
            "height": 512,
        },
    )
    assert response.status_code == 400
    assert "unavailable" in response.json()["detail"].lower()
