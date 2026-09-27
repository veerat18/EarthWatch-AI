import os
import rasterio
from rasterio.windows import Window
import numpy as np
from typing import Dict, Any, List
from .auth import get_cdse_token, get_cdse_credentials
from app.services.satellite.sentinel2 import Sentinel2Provider

provider = Sentinel2Provider()

def convert_s3_to_https(s3_url: str) -> str:
    """Convert s3://eodata/... to https://download.dataspace.copernicus.eu/..."""
    if s3_url.startswith("s3://eodata/"):
        return s3_url.replace("s3://eodata/", "https://download.dataspace.copernicus.eu/")
    return s3_url

async def inspect_raster_window(scene_id: str, band: str, x: int, y: int, width: int, height: int, return_data: bool = False) -> Dict[str, Any]:
    # 1. Resolve scene assets
    assets_resp = await provider.inspect_scene_assets(scene_id)
    if assets_resp.get("status") == "error":
        return {"status": "error", "message": assets_resp.get("message")}

    assets = assets_resp.get("assets", [])
    if not assets:
        return {"status": "error", "message": "Raster asset unavailable."}

    # 2. Find the requested band
    target_asset = None
    for a in assets:
        if a.get("band") == band or (a.get("key") and band in a.get("key")):
            target_asset = a
            break

    if not target_asset:
        return {"status": "error", "message": f"Band {band} not available in this scene."}

    href = target_asset.get("href")
    
    # Check for HTTPS alternate first
    alternate_https = target_asset.get("alternate", {}).get("https", {}).get("href")
    if alternate_https:
        http_url = alternate_https
    elif href and href.startswith("s3://eodata/"):
        http_url = href.replace("s3://eodata/", "https://download.dataspace.copernicus.eu/")
    else:
        http_url = href

    if not http_url:
        return {"status": "error", "message": "Asset has no valid HTTP href."}

    # 3. Check credentials and get token
    creds = get_cdse_credentials()
    if not creds:
        return {"status": "auth_missing", "message": "CDSE credentials not configured."}

    token = await get_cdse_token()
    if not token:
        return {"status": "auth_failure", "message": "Authentication failure."}

    # 4. Read window using rasterio
    try:
        env = rasterio.Env(
            GDAL_HTTP_HEADERS=f"Authorization: Bearer {token}",
            GDAL_DISABLE_READDIR_ON_OPEN="EMPTY_DIR",
            VSI_CACHE="TRUE"
        )
        
        # Determine if we should use vsicurl
        vsi_url = http_url
        if http_url.startswith("http"):
            vsi_url = f"/vsicurl/{http_url}"
            
        with env:
            with rasterio.open(vsi_url) as src:
                # Read just the window
                window = Window(x, y, width, height)
                
                # Check bounds
                if x >= src.width or y >= src.height:
                    return {"status": "error", "message": "Invalid window: outside raster bounds."}
                    
                data = src.read(1, window=window)
                
                result = {
                    "status": "success",
                    "scene_id": scene_id,
                    "band": band,
                    "resolution": target_asset.get("resolution") or (src.transform[0] if src.transform else None),
                    "crs": src.crs.to_string() if src.crs else "Unknown",
                    "width": data.shape[1],
                    "height": data.shape[0],
                    "dtype": str(data.dtype),
                    "min": float(np.min(data)),
                    "max": float(np.max(data)),
                    "mean": float(np.mean(data)),
                    "transform": [float(x) for x in src.window_transform(window).to_gdal()]
                }
                
                if return_data:
                    result["data"] = data
                    
                return result
    except Exception as exc:
        return {"status": "error", "message": f"Raster read failure: {str(exc)}"}
