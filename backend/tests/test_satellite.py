import pytest
from unittest.mock import patch, MagicMock

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





@patch('httpx.AsyncClient.post')
def test_valid_search_request(mock_post):
    """Test 1: Valid search request parameters structure."""
    mock_resp = MagicMock()
    mock_resp.json.return_value = {"features": []}
    mock_post.return_value = mock_resp
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





def test_get_supported_satellite_sources(monkeypatch):

    """Test 6: Sources endpoint correctly returns supported constellations with pending marks."""

    from app.core.config import settings

    monkeypatch.setattr(settings, "SATELLITE_CLIENT_ID", "")



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

import pytest
from unittest.mock import patch, MagicMock

from unittest.mock import patch, MagicMock

from app.services.satellite.models import SatelliteSearchRequest

from app.services.satellite.sentinel2 import Sentinel2Provider

import httpx



@pytest.mark.anyio

async def test_search_scenes_success():

    provider = Sentinel2Provider()

    request = SatelliteSearchRequest(

        location="Delhi",

        start_date="2026-01-01",

        end_date="2026-01-31",

        max_cloud_cover=25.0,

        satellite_source="Sentinel-2"

    )



    mock_response = MagicMock()

    mock_response.json.return_value = {

        "features": [

            {

                "id": "S2B_TEST",

                "properties": {

                    "platform": "sentinel-2b",

                    "datetime": "2026-01-18T05:30:49Z",

                    "eo:cloud_cover": 1.65,

                    "processing:level": "Level-2A"

                },

                "bbox": [76.9, 28.45, 77.35, 28.85],

                "assets": {

                    "rendered_preview": {"href": "http://thumb"}

                },

                "links": [{"rel": "self", "href": "http://meta"}]

            }

        ]

    }

    mock_response.raise_for_status.return_value = None



    # Patch is_configured to True

    with patch.object(provider, 'is_configured', return_value=True):

        with patch('httpx.AsyncClient.post', return_value=mock_response) as mock_post:

            resp = await provider.search_scenes(request)



            assert resp.status == "success"

            assert resp.total_scenes == 1

            assert len(resp.scenes) == 1



            scene = resp.scenes[0]

            assert scene.scene_id == "S2B_TEST"

            assert scene.thumbnail_url == "http://thumb"



            # Check payload structure

            call_args = mock_post.call_args

            assert call_args is not None

            payload = call_args.kwargs["json"]

            assert payload["collections"] == ["sentinel-2-l2a"]

            assert payload["datetime"] == "2026-01-01T00:00:00Z/2026-01-31T23:59:59Z"

            assert "intersects" in payload

            assert payload["query"]["eo:cloud_cover"]["lte"] == 25.0





@pytest.mark.anyio

async def test_search_scenes_empty():

    provider = Sentinel2Provider()

    request = SatelliteSearchRequest(

        location="Delhi",

        start_date="2026-01-01",

        end_date="2026-01-31",

        max_cloud_cover=25.0,

        satellite_source="Sentinel-2"

    )



    mock_response = MagicMock()

    mock_response.json.return_value = {"features": []}

    mock_response.raise_for_status.return_value = None



    with patch.object(provider, 'is_configured', return_value=True):

        with patch('httpx.AsyncClient.post', return_value=mock_response):

            resp = await provider.search_scenes(request)



            assert resp.status == "success"

            assert resp.total_scenes == 0

            assert len(resp.scenes) == 0





@pytest.mark.anyio

async def test_search_scenes_not_configured():

    provider = Sentinel2Provider()

    request = SatelliteSearchRequest(

        location="Delhi",

        start_date="2026-01-01",

        end_date="2026-01-31",

        max_cloud_cover=25.0,

        satellite_source="Sentinel-2"

    )



    with patch.object(provider, 'is_configured', return_value=False):

        resp = await provider.search_scenes(request)

        assert resp.status == "provider_not_configured"

        assert resp.total_scenes == 0





@pytest.mark.anyio

async def test_search_scenes_http_error():

    provider = Sentinel2Provider()

    request = SatelliteSearchRequest(

        location="Delhi",

        start_date="2026-01-01",

        end_date="2026-01-31",

        max_cloud_cover=25.0,

        satellite_source="Sentinel-2"

    )



    with patch.object(provider, 'is_configured', return_value=True):

        with patch('httpx.AsyncClient.post', side_effect=httpx.HTTPStatusError("Error", request=MagicMock(), response=MagicMock())):

            resp = await provider.search_scenes(request)

            assert resp.status == "error"





@pytest.mark.anyio

async def test_search_scenes_malformed_feature():

    provider = Sentinel2Provider()

    request = SatelliteSearchRequest(

        location="Delhi",

        start_date="2026-01-01",

        end_date="2026-01-31",

        max_cloud_cover=25.0,

        satellite_source="Sentinel-2"

    )



    mock_response = MagicMock()

    mock_response.json.return_value = {

        "features": [

            {"id": "VALID_SCENE", "properties": {"datetime": "2026-01-18T05:30:49Z", "eo:cloud_cover": 10}, "bbox": [0,0,0,0]},

            {"id": "MISSING_DATETIME", "properties": {"eo:cloud_cover": 10}}, # Malformed

            {"id": "INVALID_DATETIME", "properties": {"datetime": "bad-date"}, "bbox": [0,0,0,0]} # Malformed

        ]

    }

    mock_response.raise_for_status.return_value = None



    with patch.object(provider, 'is_configured', return_value=True):

        with patch('httpx.AsyncClient.post', return_value=mock_response):

            resp = await provider.search_scenes(request)

            assert resp.status == "success"

            # Should only map the valid one

            assert resp.total_scenes == 1

            assert resp.scenes[0].scene_id == "VALID_SCENE"
