import pytest
from unittest.mock import patch, MagicMock, AsyncMock
from app.services.ai.provider import EarthAnalystProvider
from app.services.analysis.models import AnalysisEvidence
from google.genai.errors import APIError
import json

MOCK_EVIDENCE = {
    "status": "success",
    "source_data": {
        "before_scene": {"scene_id": "A", "acquisition_datetime": "2026", "cloud_cover": 0, "satellite": "S2", "tile": "T"},
        "after_scene": {"scene_id": "B", "acquisition_datetime": "2026", "cloud_cover": 0, "satellite": "S2", "tile": "T"},
        "temporal_interval_days": 1,
        "aoi_location": None
    },
    "analysis_parameters": {
        "index": "NDVI", "formula": "f", "change_formula": "c",
        "window": {"x": 0, "y": 0, "width": 512, "height": 512}, "resolution": 10, "crs": "EPSG:4326"
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
        "cloud_cover_before": 0, "cloud_cover_after": 0,
        "raster_resolution": 10, "crs": "EPSG:4326", "analysis_window": "512x512",
        "source_provider": "CDSE", "limitations": []
    }
}

@pytest.mark.anyio
async def test_transient_503_success():
    provider = EarthAnalystProvider()
    provider.client = MagicMock()
    
    # 503 twice, then success
    mock_503 = APIError(503, "UNAVAILABLE")
    
    mock_success = MagicMock()
    mock_success.text = json.dumps({"summary": "Success!"})
    
    provider.client.models.generate_content.side_effect = [mock_503, mock_503, mock_success]
    
    evidence = AnalysisEvidence(**MOCK_EVIDENCE)
    
    with patch("asyncio.sleep", new_callable=AsyncMock) as mock_sleep:
        resp = await provider.generate_analysis(evidence)
        assert resp["status"] == "success"
        assert resp["analysis"]["summary"] == "Success!"
        assert provider.client.models.generate_content.call_count == 3
        assert mock_sleep.call_count in [2, 3]

@pytest.mark.anyio
async def test_repeated_503_graceful_failure():
    provider = EarthAnalystProvider()
    provider.client = MagicMock()
    
    mock_503 = APIError(503, "UNAVAILABLE")
    provider.client.models.generate_content.side_effect = [mock_503, mock_503, mock_503]
    
    evidence = AnalysisEvidence(**MOCK_EVIDENCE)
    
    with patch("asyncio.sleep", new_callable=AsyncMock) as mock_sleep:
        resp = await provider.generate_analysis(evidence)
        assert resp["status"] == "error"
        assert "AI ANALYST UNAVAILABLE (Provider Error)" in resp["message"]
        assert provider.client.models.generate_content.call_count == 3
        assert mock_sleep.call_count in [2, 3]

@pytest.mark.anyio
async def test_non_transient_error_not_retried():
    provider = EarthAnalystProvider()
    provider.client = MagicMock()
    
    mock_400 = APIError(400, "INVALID_ARGUMENT")
    provider.client.models.generate_content.side_effect = [mock_400]
    
    evidence = AnalysisEvidence(**MOCK_EVIDENCE)
    
    with patch("asyncio.sleep", new_callable=AsyncMock) as mock_sleep:
        resp = await provider.generate_analysis(evidence)
        assert resp["status"] == "error"
        assert provider.client.models.generate_content.call_count == 1
        assert mock_sleep.call_count == 0
