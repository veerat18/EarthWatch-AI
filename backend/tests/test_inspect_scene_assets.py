
import pytest
import httpx
from unittest.mock import patch, AsyncMock
from app.services.satellite.sentinel2 import Sentinel2Provider

@pytest.mark.anyio
async def test_inspect_scene_assets_timeout():
    provider = Sentinel2Provider()
    
    with patch("httpx.AsyncClient.get", new_callable=AsyncMock) as mock_get:
        mock_get.side_effect = httpx.ReadTimeout("Timeout while reading STAC item")
        
        # This will hit the exception block which logs repr(exc)
        response = await provider.inspect_scene_assets("S2A_MSIL2A_TEST")
        
        assert response["status"] == "error"
        assert response["message"] == "STAC service failure."
