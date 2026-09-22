import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.core.config import settings

client = TestClient(app)


def test_health_check():
    """Verify core health endpoint remains functional."""
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert data["project"] == "EarthWatch AI"


def test_valid_search_request():
    """Test 1: Valid search request parameters structure."""
    payload = {
        "location": "San Francisco Bay Area",
        "start_date": "2026-01-01",
        "end_date": "2026-01-15",
        "max_cloud_cover": 15.0,
        "satellite_source": "Sentinel-2"
    }
    response = client.post("/api/v1/satellite/search", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "status" in data
    assert "provider_configured" in data
    assert "message" in data
    assert "scenes" in data
    assert isinstance(data["scenes"], list)
    # Ensure no fabricated fake scenes
    assert len(data["scenes"]) == 0


def test_invalid_date_range():
    """Test 2: Validation fails when start_date is after end_date."""
    payload = {
        "location": "Aral Sea",
        "start_date": "2026-02-15",
        "end_date": "2026-01-10",
        "max_cloud_cover": 20.0,
        "satellite_source": "Sentinel-2"
    }
    response = client.post("/api/v1/satellite/search", json=payload)
    assert response.status_code == 422
    errors = response.json().get("detail", [])
    assert any("start_date" in str(err) or "date" in str(err).lower() for err in errors)


def test_invalid_cloud_cover_high():
    """Test 3a: Validation fails when max_cloud_cover exceeds 100."""
    payload = {
        "location": "Amazon Basin",
        "start_date": "2026-01-01",
        "end_date": "2026-01-10",
        "max_cloud_cover": 105.0,
        "satellite_source": "Sentinel-2"
    }
    response = client.post("/api/v1/satellite/search", json=payload)
    assert response.status_code == 422


def test_invalid_cloud_cover_negative():
    """Test 3b: Validation fails when max_cloud_cover is negative."""
    payload = {
        "location": "Amazon Basin",
        "start_date": "2026-01-01",
        "end_date": "2026-01-10",
        "max_cloud_cover": -5.0,
        "satellite_source": "Sentinel-2"
    }
    response = client.post("/api/v1/satellite/search", json=payload)
    assert response.status_code == 422


def test_unsupported_satellite_source():
    """Test 4: Validation fails for unsupported satellite source."""
    payload = {
        "location": "Great Barrier Reef",
        "start_date": "2026-01-01",
        "end_date": "2026-01-10",
        "max_cloud_cover": 20.0,
        "satellite_source": "Hubble-Space-Telescope"
    }
    response = client.post("/api/v1/satellite/search", json=payload)
    assert response.status_code == 422
    error_str = str(response.json())
    assert "Unsupported satellite source" in error_str


def test_provider_not_configured_response(monkeypatch):
    """Test 5: Explicitly asserts provider-not-configured status and message when credentials unlinked."""
    monkeypatch.setattr(settings, "SATELLITE_PROVIDER", "")
    monkeypatch.setattr(settings, "SATELLITE_CLIENT_ID", "")
    monkeypatch.setattr(settings, "SATELLITE_CLIENT_SECRET", "")

    payload = {
        "location": "Alps Glacier",
        "start_date": "2026-01-01",
        "end_date": "2026-01-15",
        "max_cloud_cover": 10.0,
        "satellite_source": "Sentinel-2"
    }
    response = client.post("/api/v1/satellite/search", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "provider_not_configured"
    assert data["provider_configured"] is False
    assert data["message"] == "Satellite imagery provider is not connected."
    assert data["total_scenes"] == 0
    assert data["scenes"] == []


def test_get_supported_satellite_sources():
    """Test 6: Sources endpoint correctly returns supported constellations with pending marks."""
    response = client.get("/api/v1/satellite/sources")
    assert response.status_code == 200
    sources = response.json()
    assert len(sources) >= 4

    source_names = [s["name"] for s in sources]
    assert any("Sentinel-2" in name for name in source_names)
    assert any("Landsat" in name for name in source_names)
    assert any("PlanetScope" in name for name in source_names)
    assert any("Custom" in name for name in source_names)

    sentinel = next(s for s in sources if "sentinel-2" in s["id"])
    assert sentinel["status"] == "planned/integration pending"
    assert sentinel["provider_configured"] is False
