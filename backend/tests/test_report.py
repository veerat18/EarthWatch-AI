import pytest
from unittest.mock import patch, AsyncMock
from fastapi.testclient import TestClient
from app.main import app
from app.services.reports.models import EarthObservationReport
from app.services.reports.generator import ai_provider

client = TestClient(app)

MOCK_BEFORE = "S2A_MSIL2A_20260105T053251_N0511_R105_T43RGN_20260105T084010"
MOCK_AFTER = "S2B_MSIL2A_20260118T053049_N0511_R105_T43RGN_20260118T073251"


@pytest.fixture
def mock_report_services():
    with patch("app.services.analysis.evidence.Sentinel2Provider.get_scene_metadata", new_callable=AsyncMock) as mock_stac:
        with patch("app.services.analysis.evidence.calculate_change_detection", new_callable=AsyncMock) as mock_ndvi_change:
            with patch("app.services.analysis.evidence.calculate_ndwi", new_callable=AsyncMock) as mock_ndwi:
                with patch("app.services.analysis.evidence.calculate_ndwi_change_detection", new_callable=AsyncMock) as mock_ndwi_change:
                    mock_stac.side_effect = lambda scene_id: {
                        "status": "success",
                        "scene_id": scene_id,
                        "platform": "Sentinel-2A" if "S2A" in scene_id else "Sentinel-2B",
                        "acquisition_datetime": "2026-01-05T05:32:51.024Z" if scene_id == MOCK_BEFORE else "2026-01-18T05:30:49.024Z",
                        "cloud_cover": 7.39 if scene_id == MOCK_BEFORE else 1.65,
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
                        "ndvi_before": {"min": -0.15, "max": 0.85, "mean": 0.4134, "median": 0.4354, "valid_pixel_count": 262144, "nodata_pixel_count": 0},
                        "ndvi_after": {"min": -0.14, "max": 0.86, "mean": 0.4186, "median": 0.4660, "valid_pixel_count": 262144, "nodata_pixel_count": 0},
                        "ndvi_change": {"min": -0.45, "max": 0.52, "mean": 0.0051, "median": 0.0040, "valid_pixel_count": 262144, "nodata_pixel_count": 0},
                        "significant_loss_count": 943,
                        "moderate_loss_count": 29812,
                        "stable_count": 189227,
                        "moderate_gain_count": 41644,
                        "significant_gain_count": 518,
                        "matrix_b64": "MOCK_NDVI_MATRIX_BASE64",
                    }

                    mock_ndwi.return_value = {
                        "status": "success",
                        "scene_id": MOCK_AFTER,
                        "width": 512,
                        "height": 512,
                        "resolution": 10,
                        "crs": "EPSG:32643",
                        "min": -0.5596,
                        "max": 0.1925,
                        "mean": -0.3753,
                        "median": -0.4012,
                        "valid_pixel_count": 262144,
                        "nodata_pixel_count": 0,
                        "non_water_or_low_signal_count": 261878,
                        "non_water_or_low_signal_percentage": 99.90,
                        "low_water_signal_count": 266,
                        "low_water_signal_percentage": 0.10,
                        "moderate_water_signal_count": 0,
                        "moderate_water_signal_percentage": 0.0,
                        "high_water_signal_count": 0,
                        "high_water_signal_percentage": 0.0,
                        "matrix_b64": "MOCK_NDWI_MATRIX_BASE64",
                    }

                    mock_ndwi_change.return_value = {
                        "status": "success",
                        "before_scene_id": MOCK_BEFORE,
                        "after_scene_id": MOCK_AFTER,
                        "width": 512,
                        "height": 512,
                        "resolution": 10,
                        "crs": "EPSG:32643",
                        "before": {"min": -0.61, "max": 0.04, "mean": -0.3816, "median": -0.3950, "valid_pixel_count": 262144, "nodata_pixel_count": 0},
                        "after": {"min": -0.5596, "max": 0.1925, "mean": -0.3753, "median": -0.4012, "valid_pixel_count": 262144, "nodata_pixel_count": 0},
                        "change": {"min": -0.30, "max": 0.38, "mean": 0.0063, "median": 0.0070, "valid_pixel_count": 262144, "nodata_pixel_count": 0},
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
                        "matrix_b64": "MOCK_NDWI_CHANGE_MATRIX_BASE64",
                    }
                    yield mock_stac, mock_ndvi_change, mock_ndwi, mock_ndwi_change


@pytest.mark.anyio
async def test_report_generation_full(mock_report_services):
    """Test full report generation with evidence and AI analyst findings."""
    with patch.object(ai_provider, "generate_analysis", new_callable=AsyncMock) as mock_ai:
        mock_ai.return_value = {
            "status": "success",
            "analysis": {
                "summary": "Geospatial analysis of Sentinel-2 imagery for tile T43RGN indicates stable spectral conditions.",
                "key_findings": ["NDVI indicates stable spectral vegetation conditions across 72.18% of the analyzed window.", "NDWI indicates predominantly low spectral water signal."],
                "vegetation_assessment": "The mean NDVI increased marginally from 0.4134 to 0.4186.",
                "water_signal_assessment": "NDWI serves as an analytical spectral water-signal index with 99.90% low signal.",
                "change_assessment": "The combined analysis shows limited spectral variance.",
                "confidence_note": "Calculations executed on 262,144 valid pixels with zero nodata.",
                "limitations": ["NDVI and NDWI changes represent spectral differences, not confirmed physical land-cover changes."],
            }
        }

        resp = client.post(
            "/api/v1/reports/earth-observation",
            json={
                "before_scene_id": MOCK_BEFORE,
                "after_scene_id": MOCK_AFTER,
                "x": 0,
                "y": 0,
                "width": 512,
                "height": 512
            }
        )

        assert resp.status_code == 200
        data = resp.json()

        # Validate against Pydantic schema
        report = EarthObservationReport(**data)

        # 1. Metadata
        assert report.metadata.project == "EarthWatch AI"
        assert report.metadata.analysis_type == "Sentinel-2 Multitemporal Analysis"
        assert report.metadata.report_id.startswith("EOR-")

        # 2. Acquisition
        assert report.acquisition.before_scene_id == MOCK_BEFORE
        assert report.acquisition.after_scene_id == MOCK_AFTER
        assert report.acquisition.tile == "T43RGN"
        assert report.acquisition.resolution == 10
        assert report.acquisition.temporal_interval_days == 13

        # 3. Methodology
        assert "B08" in report.methodology.ndvi_formula
        assert "B03" in report.methodology.ndwi_formula

        # 4. Vegetation Analysis
        assert report.vegetation.before_ndvi.mean == 0.4134
        assert report.vegetation.after_ndvi.mean == 0.4186
        assert report.vegetation.ndvi_change.mean == 0.0051
        assert "stable_low_change" in report.vegetation.classifications
        assert report.vegetation.classifications["stable_low_change"].count == 189227

        # 5. Water Signal Analysis
        assert report.water_signal.available is True
        assert report.water_signal.ndwi.mean == -0.3753
        assert report.water_signal.ndwi_change.mean == 0.0063
        assert "non_water_low_signal" in report.water_signal.ndwi_classifications
        assert "stable" in report.water_signal.change_classifications

        # 6. Change Detection
        assert report.change_detection.valid_pixels == 262144
        assert report.change_detection.nodata_pixels == 0
        assert report.change_detection.ndvi_mean_change == 0.0051
        assert report.change_detection.ndwi_mean_change == 0.0063

        # 7. AI Analysis
        assert report.ai_analysis.available is True
        assert "stable spectral conditions" in report.ai_analysis.summary
        assert report.ai_analysis.water_signal_assessment is not None
        assert "99.90% low signal" in report.ai_analysis.water_signal_assessment

        # 8. Data Quality & Limitations
        assert report.data_quality.valid_pixels == 262144
        assert report.data_quality.cloud_cover_before == 7.39
        assert report.data_quality.cloud_cover_after == 1.65
        assert len(report.data_quality.limitations) > 0

        # 9. Executive Summary distinction
        assert "Measured:" in report.executive_summary.summary_text
        assert "AI interpretation:" in report.executive_summary.summary_text

        # 10. Technical Metadata
        assert report.technical_metadata.crs == "EPSG:32643"
        assert report.technical_metadata.spatial_resolution == "10m per pixel"

        # 11. Strict exclusion of matrix_b64 and raw imagery
        raw_json = resp.text
        assert "matrix_b64" not in raw_json
        assert "MOCK_NDVI_MATRIX_BASE64" not in raw_json
        assert "MOCK_NDWI_MATRIX_BASE64" not in raw_json
        assert "MOCK_NDWI_CHANGE_MATRIX_BASE64" not in raw_json


@pytest.mark.anyio
async def test_report_missing_gemini_fallback(mock_report_services):
    """Test report generation when Gemini AI Analyst is unavailable (preserves deterministic evidence)."""
    with patch.object(ai_provider, "generate_analysis", new_callable=AsyncMock) as mock_ai:
        mock_ai.return_value = {
            "status": "error",
            "message": "AI ANALYST UNAVAILABLE (503 High Demand)"
        }

        resp = client.post(
            "/api/v1/reports/earth-observation",
            json={
                "before_scene_id": MOCK_BEFORE,
                "after_scene_id": MOCK_AFTER,
                "x": 0,
                "y": 0,
                "width": 512,
                "height": 512
            }
        )

        assert resp.status_code == 200
        data = resp.json()
        report = EarthObservationReport(**data)

        # AI Analyst marked unavailable
        assert report.ai_analysis.available is False
        assert "unavailable" in report.ai_analysis.summary.lower()

        # Deterministic evidence remains 100% intact
        assert report.vegetation.ndvi_change.mean == 0.0051
        assert report.water_signal.ndwi_change.mean == 0.0063
        assert report.data_quality.valid_pixels == 262144
        assert "Measured:" in report.executive_summary.summary_text


@pytest.mark.anyio
async def test_report_missing_ndwi_fallback(mock_report_services):
    """Test report generation when NDWI analysis fails or is unavailable."""
    mock_stac, mock_ndvi_change, mock_ndwi, mock_ndwi_change = mock_report_services
    mock_ndwi.return_value = {"status": "error", "message": "Band B03 read failure"}
    mock_ndwi_change.return_value = {"status": "error", "message": "NDWI change unavailable"}

    with patch.object(ai_provider, "generate_analysis", new_callable=AsyncMock) as mock_ai:
        mock_ai.return_value = {
            "status": "success",
            "analysis": {
                "summary": "Vegetation-only analysis.",
                "key_findings": ["Vegetation stable."],
                "vegetation_assessment": "NDVI measured.",
                "water_signal_assessment": None,
                "change_assessment": "Vegetation change assessed.",
                "confidence_note": "Evaluated.",
                "limitations": ["NDWI unavailable."],
            }
        }

        resp = client.post(
            "/api/v1/reports/earth-observation",
            json={
                "before_scene_id": MOCK_BEFORE,
                "after_scene_id": MOCK_AFTER,
                "x": 0,
                "y": 0,
                "width": 512,
                "height": 512
            }
        )

        assert resp.status_code == 200
        data = resp.json()
        report = EarthObservationReport(**data)

        # NDWI marked unavailable, NDVI preserved
        assert report.water_signal.available is False
        assert report.water_signal.ndwi is None
        assert report.vegetation.before_ndvi.mean == 0.4134
        assert report.vegetation.ndvi_change.mean == 0.0051


@pytest.mark.anyio
async def test_report_invalid_window_validation():
    """Test validation errors for invalid window parameters."""
    resp = client.post(
        "/api/v1/reports/earth-observation",
        json={
            "before_scene_id": MOCK_BEFORE,
            "after_scene_id": MOCK_AFTER,
            "x": -10,  # Invalid: negative
            "y": 0,
            "width": 4096,  # Invalid: > 2048
            "height": 512
        }
    )
    assert resp.status_code == 422


@pytest.mark.anyio
async def test_report_evidence_failure():
    """Test error propagation when evidence generation fails completely."""
    with patch("app.services.reports.generator.generate_analysis_evidence", new_callable=AsyncMock) as mock_ev:
        mock_ev.return_value = {
            "status": "error",
            "message": "Scene CRS mismatchEPSG:32643 vs EPSG:32644"
        }

        resp = client.post(
            "/api/v1/reports/earth-observation",
            json={
                "before_scene_id": MOCK_BEFORE,
                "after_scene_id": MOCK_AFTER,
                "x": 0,
                "y": 0,
                "width": 512,
                "height": 512
            }
        )
        assert resp.status_code == 400
        assert "Scene CRS mismatch" in resp.json()["detail"]


def test_download_pdf_success(mock_report_services):
    # First create a report
    payload = {
        "before_scene_id": MOCK_BEFORE,
        "after_scene_id": MOCK_AFTER,
        "x": 100,
        "y": 100,
        "width": 256,
        "height": 256
    }
    create_response = client.post("/api/v1/reports/earth-observation", json=payload)
    assert create_response.status_code == 200
    report_data = create_response.json()
    report_id = report_data["metadata"]["report_id"]

    # Now fetch PDF
    pdf_response = client.get(f"/api/v1/reports/earth-observation/{report_id}/pdf")
    assert pdf_response.status_code == 200
    assert pdf_response.headers["content-type"] == "application/pdf"
    assert len(pdf_response.content) > 0

def test_download_pdf_not_found():
    pdf_response = client.get("/api/v1/reports/earth-observation/NON_EXISTENT/pdf")
    assert pdf_response.status_code == 404
