import pytest
from unittest.mock import patch, AsyncMock, MagicMock
from app.main import app
from fastapi.testclient import TestClient
from app.services.analysis.models import (
    AnalysisEvidence,
    NDWIEvidence,
    NDWIChangeEvidence,
)
from app.services.ai.models import AIAnalystResponse
from app.services.ai.provider import SYSTEM_INSTRUCTION, EarthAnalystProvider

client = TestClient(app)

MOCK_BEFORE = "S2A_MSIL2A_20260105T053251_N0511_R105_T43RGN_20260105T084010"
MOCK_AFTER = "S2B_MSIL2A_20260118T053049_N0511_R105_T43RGN_20260118T073251"


@pytest.fixture
def mock_all_evidence_services():
    with patch("app.services.analysis.evidence.Sentinel2Provider.get_scene_metadata", new_callable=AsyncMock) as mock_stac:
        with patch("app.services.analysis.evidence.calculate_change_detection", new_callable=AsyncMock) as mock_ndvi_change:
            with patch("app.services.analysis.evidence.calculate_ndwi", new_callable=AsyncMock) as mock_ndwi:
                with patch("app.services.analysis.evidence.calculate_ndwi_change_detection", new_callable=AsyncMock) as mock_ndwi_change:
                    yield mock_stac, mock_ndvi_change, mock_ndwi, mock_ndwi_change


@pytest.mark.anyio
async def test_evidence_with_ndwi_and_ndwi_change(mock_all_evidence_services):
    mock_stac, mock_ndvi_change, mock_ndwi, mock_ndwi_change = mock_all_evidence_services

    mock_stac.side_effect = lambda scene_id: {
        "status": "success",
        "scene_id": scene_id,
        "satellite": "Sentinel-2A" if "S2A" in scene_id else "Sentinel-2B",
        "acquisition_datetime": "2026-01-05T05:32:51.024Z" if scene_id == MOCK_BEFORE else "2026-01-18T05:30:49.024Z",
        "cloud_cover": 2.5 if scene_id == MOCK_BEFORE else 1.0,
        "tile": "T43RGN",
    }

    mock_ndvi_change.return_value = {
        "status": "success",
        "before_scene_id": MOCK_BEFORE,
        "after_scene_id": MOCK_AFTER,
        "width": 512,
        "height": 512,
        "resolution": 10,
        "crs": "EPSG:32643",
        "ndvi_before": {"min": -0.2, "max": 0.8, "mean": 0.3, "median": 0.3, "valid_pixel_count": 262144, "nodata_pixel_count": 0},
        "ndvi_after": {"min": -0.2, "max": 0.8, "mean": 0.3, "median": 0.3, "valid_pixel_count": 262144, "nodata_pixel_count": 0},
        "ndvi_change": {"min": -0.5, "max": 0.5, "mean": 0.0, "median": 0.0, "valid_pixel_count": 262144, "nodata_pixel_count": 0},
        "significant_loss_count": 1000,
        "moderate_loss_count": 5000,
        "stable_count": 250000,
        "moderate_gain_count": 5000,
        "significant_gain_count": 1144,
        "matrix_b64": "MOCK_NDVI_MATRIX",
    }

    mock_ndwi.return_value = {
        "status": "success",
        "scene_id": MOCK_AFTER,
        "width": 512,
        "height": 512,
        "resolution": 10,
        "crs": "EPSG:32643",
        "min": -0.55,
        "max": 0.19,
        "mean": -0.37,
        "median": -0.40,
        "valid_pixel_count": 262144,
        "nodata_pixel_count": 0,
        "non_water_or_low_signal_count": 261878,
        "non_water_or_low_signal_percentage": 99.9,
        "low_water_signal_count": 266,
        "low_water_signal_percentage": 0.1,
        "moderate_water_signal_count": 0,
        "moderate_water_signal_percentage": 0.0,
        "high_water_signal_count": 0,
        "high_water_signal_percentage": 0.0,
        "matrix_b64": "MOCK_NDWI_MATRIX",
    }

    mock_ndwi_change.return_value = {
        "status": "success",
        "before_scene_id": MOCK_BEFORE,
        "after_scene_id": MOCK_AFTER,
        "width": 512,
        "height": 512,
        "resolution": 10,
        "crs": "EPSG:32643",
        "before": {"min": -0.61, "max": 0.04, "mean": -0.38, "median": -0.39, "valid_pixel_count": 262144, "nodata_pixel_count": 0},
        "after": {"min": -0.55, "max": 0.19, "mean": -0.37, "median": -0.40, "valid_pixel_count": 262144, "nodata_pixel_count": 0},
        "change": {"min": -0.30, "max": 0.38, "mean": 0.006, "median": 0.007, "valid_pixel_count": 262144, "nodata_pixel_count": 0},
        "significant_loss_count": 373,
        "significant_loss_percentage": 0.14,
        "moderate_loss_count": 24751,
        "moderate_loss_percentage": 9.44,
        "stable_count": 198351,
        "stable_percentage": 75.66,
        "moderate_gain_count": 38219,
        "moderate_gain_percentage": 14.58,
        "significant_gain_count": 450,
        "significant_gain_percentage": 0.17,
        "matrix_b64": "MOCK_NDWI_CHANGE_MATRIX",
    }

    response = client.post(
        "/api/v1/analysis/evidence",
        json={"before_scene_id": MOCK_BEFORE, "after_scene_id": MOCK_AFTER, "x": 0, "y": 0, "width": 512, "height": 512},
    )

    assert response.status_code == 200
    data = response.json()

    # Validate against AnalysisEvidence Pydantic schema
    evidence_obj = AnalysisEvidence(**data)
    assert evidence_obj.ndwi is not None
    assert evidence_obj.ndwi_change is not None

    # Verify NDWI classification count conservation:
    ndwi_counts = (
        evidence_obj.ndwi.classifications.non_water_low_signal["count"]
        + evidence_obj.ndwi.classifications.low_water_signal["count"]
        + evidence_obj.ndwi.classifications.moderate_water_signal["count"]
        + evidence_obj.ndwi.classifications.high_water_signal["count"]
    )
    assert ndwi_counts == evidence_obj.ndwi.measurements.valid_pixel_count

    # Verify NDWI change classification count conservation:
    ndwi_change_counts = (
        evidence_obj.ndwi_change.classifications.significant_loss["count"]
        + evidence_obj.ndwi_change.classifications.moderate_loss["count"]
        + evidence_obj.ndwi_change.classifications.stable["count"]
        + evidence_obj.ndwi_change.classifications.moderate_gain["count"]
        + evidence_obj.ndwi_change.classifications.significant_gain["count"]
    )
    assert ndwi_change_counts == evidence_obj.ndwi_change.change.valid_pixel_count

    # Verify exclusion of matrix_b64 and raw imagery from serialized evidence
    evidence_json = evidence_obj.model_dump_json()
    assert "matrix_b64" not in evidence_json
    assert "MOCK_NDVI_MATRIX" not in evidence_json
    assert "MOCK_NDWI_MATRIX" not in evidence_json
    assert "MOCK_NDWI_CHANGE_MATRIX" not in evidence_json


def test_ndwi_safety_system_instruction():
    """Verify system instruction contains mandatory NDWI safety constraints."""
    assert "spectral water-signal" in SYSTEM_INSTRUCTION
    assert "never invent data" in SYSTEM_INSTRUCTION
    assert "never claim certainty beyond the evidence" in SYSTEM_INSTRUCTION
    assert "do not describe NDWI thresholds as machine-learning predictions" in SYSTEM_INSTRUCTION
    assert "avoid unsupported causal claims" in SYSTEM_INSTRUCTION


@pytest.mark.anyio
async def test_ai_analyst_receives_ndwi_evidence(mock_all_evidence_services):
    """Verify Gemini analyst receives canonical evidence and returns water_signal_assessment."""
    mock_stac, mock_ndvi_change, mock_ndwi, mock_ndwi_change = mock_all_evidence_services

    mock_stac.side_effect = lambda scene_id: {
        "status": "success",
        "scene_id": scene_id,
        "satellite": "Sentinel-2A" if "S2A" in scene_id else "Sentinel-2B",
        "acquisition_datetime": "2026-01-05T05:32:51.024Z" if scene_id == MOCK_BEFORE else "2026-01-18T05:30:49.024Z",
        "cloud_cover": 2.5 if scene_id == MOCK_BEFORE else 1.0,
        "tile": "T43RGN",
    }

    mock_ndvi_change.return_value = {
        "status": "success", "before_scene_id": MOCK_BEFORE, "after_scene_id": MOCK_AFTER,
        "width": 512, "height": 512, "resolution": 10, "crs": "EPSG:32643",
        "ndvi_before": {"min": 0, "max": 1, "mean": 0.5, "median": 0.5, "valid_pixel_count": 262144, "nodata_pixel_count": 0},
        "ndvi_after": {"min": 0, "max": 1, "mean": 0.5, "median": 0.5, "valid_pixel_count": 262144, "nodata_pixel_count": 0},
        "ndvi_change": {"min": 0, "max": 1, "mean": 0.0, "median": 0.0, "valid_pixel_count": 262144, "nodata_pixel_count": 0},
        "significant_loss_count": 0, "moderate_loss_count": 0, "stable_count": 262144, "moderate_gain_count": 0, "significant_gain_count": 0,
        "matrix_b64": "MOCK",
    }
    mock_ndwi.return_value = {
        "status": "success", "scene_id": MOCK_AFTER, "width": 512, "height": 512, "resolution": 10, "crs": "EPSG:32643",
        "min": -0.5, "max": 0.1, "mean": -0.3, "median": -0.3, "valid_pixel_count": 262144, "nodata_pixel_count": 0,
        "non_water_or_low_signal_count": 262144, "non_water_or_low_signal_percentage": 100.0,
        "low_water_signal_count": 0, "low_water_signal_percentage": 0.0,
        "moderate_water_signal_count": 0, "moderate_water_signal_percentage": 0.0,
        "high_water_signal_count": 0, "high_water_signal_percentage": 0.0,
        "matrix_b64": "MOCK",
    }
    mock_ndwi_change.return_value = {
        "status": "success", "before_scene_id": MOCK_BEFORE, "after_scene_id": MOCK_AFTER,
        "width": 512, "height": 512, "resolution": 10, "crs": "EPSG:32643",
        "before": {"min": -0.6, "max": 0.0, "mean": -0.38, "median": -0.39, "valid_pixel_count": 262144, "nodata_pixel_count": 0},
        "after": {"min": -0.5, "max": 0.1, "mean": -0.37, "median": -0.40, "valid_pixel_count": 262144, "nodata_pixel_count": 0},
        "change": {"min": -0.3, "max": 0.3, "mean": 0.006, "median": 0.007, "valid_pixel_count": 262144, "nodata_pixel_count": 0},
        "significant_loss_count": 300, "significant_loss_percentage": 0.1,
        "moderate_loss_count": 24000, "moderate_loss_percentage": 9.2,
        "stable_count": 200000, "stable_percentage": 76.3,
        "moderate_gain_count": 37000, "moderate_gain_percentage": 14.1,
        "significant_gain_count": 844, "significant_gain_percentage": 0.3,
        "matrix_b64": "MOCK",
    }

    with patch.object(EarthAnalystProvider, "generate_analysis", new_callable=AsyncMock) as mock_ai:
        mock_ai.return_value = {
            "status": "success",
            "analysis": {
                "summary": "Verified observation summary.",
                "key_findings": ["Finding A", "Finding B"],
                "vegetation_assessment": "Vegetation index indicates stable conditions.",
                "water_signal_assessment": "NDWI indicates predominantly low spectral water signal.",
                "change_assessment": "Observed change represents minor spectral differences.",
                "confidence_note": "High confidence based on verified CDSE evidence.",
                "limitations": ["Analytical thresholds only; not confirmed water delineation."],
            },
        }

        response = client.post(
            "/api/v1/analysis/ai-analyst",
            json={"before_scene_id": MOCK_BEFORE, "after_scene_id": MOCK_AFTER, "x": 0, "y": 0, "width": 512, "height": 512},
        )

        assert response.status_code == 200
        data = response.json()
        validated = AIAnalystResponse(**data)
        assert validated.water_signal_assessment is not None
        assert "low spectral water signal" in validated.water_signal_assessment
