import os
from typing import Dict, Any

import numpy as np
import rasterio
from rasterio.session import AWSSession
from rasterio.windows import Window

from app.services.satellite.sentinel2 import Sentinel2Provider


provider = Sentinel2Provider()

CDSE_S3_ENDPOINT = "eodata.dataspace.copernicus.eu"


def get_s3_credentials() -> tuple[str, str] | None:
    access_key = os.getenv("CDSE_S3_ACCESS_KEY")
    secret_key = os.getenv("CDSE_S3_SECRET_KEY")

    if not access_key or not secret_key:
        return None

    return access_key, secret_key


def s3_href_to_vsi_path(s3_href: str) -> str | None:
    """
    Convert:

        s3://eodata/path/to/file.jp2

    into:

        /vsis3/eodata/path/to/file.jp2
    """
    prefix = "s3://"

    if not s3_href.startswith(prefix):
        return None

    return "/vsis3/" + s3_href[len(prefix):]


async def inspect_raster_window(
    scene_id: str,
    band: str,
    x: int,
    y: int,
    width: int,
    height: int,
    return_data: bool = False,
) -> Dict[str, Any]:

    # 1. Resolve real STAC assets
    assets_resp = await provider.inspect_scene_assets(scene_id)

    if assets_resp.get("status") == "error":
        return {
            "status": "error",
            "message": assets_resp.get("message"),
        }

    assets = assets_resp.get("assets", [])

    if not assets:
        return {
            "status": "error",
            "message": "Raster asset unavailable.",
        }

    # 2. Find the requested 10m Sentinel-2 band.
    #
    # CDSE STAC exposes keys such as:
    # B04_10m
    # B08_10m
    #
    # The asset mapper may leave "band" as None,
    # therefore key matching is required.
    target_asset = None

    preferred_key = f"{band}_10m"

    for asset in assets:
        key = asset.get("key")

        if key == preferred_key:
            target_asset = asset
            break

    # Fallback for compatible asset representations
    if target_asset is None:
        for asset in assets:
            key = asset.get("key", "")
            asset_band = asset.get("band")

            if asset_band == band and "10m" in key:
                target_asset = asset
                break

    if target_asset is None:
        return {
            "status": "error",
            "message": (
                f"10m raster asset for band {band} "
                "not available in this scene."
            ),
        }

    href = target_asset.get("href")

    if not href:
        return {
            "status": "error",
            "message": "Raster asset has no href.",
        }

    # 3. CDSE direct EO-data access requires S3 credentials.
    credentials = get_s3_credentials()

    if not credentials:
        return {
            "status": "auth_missing",
            "message": "CDSE S3 credentials not configured.",
        }

    access_key, secret_key = credentials

    # 4. Convert the real STAC S3 href into a GDAL /vsis3 path.
    vsi_path = s3_href_to_vsi_path(href)

    if not vsi_path:
        return {
            "status": "error",
            "message": (
                "Unsupported raster asset href. "
                "Expected a CDSE s3://eodata/ asset."
            ),
        }

    # 5. Configure Rasterio/GDAL using Rasterio's AWSSession.
    #
    # IMPORTANT:
    # AWS credentials are supplied through AWSSession rather than
    # directly as GDAL AWS configuration options.
    try:
        aws_session = AWSSession(
            aws_access_key_id=access_key,
            aws_secret_access_key=secret_key,
            region_name="default",
            requester_pays=False,
        )

        with rasterio.Env(
            aws_session,
            AWS_S3_ENDPOINT=CDSE_S3_ENDPOINT,
            AWS_HTTPS="YES",
            AWS_VIRTUAL_HOSTING="FALSE",
            GDAL_HTTP_TCP_KEEPALIVE="YES",
            GDAL_DISABLE_READDIR_ON_OPEN="EMPTY_DIR",
            VSI_CACHE="TRUE",
        ):
            with rasterio.open(vsi_path) as src:

                # Validate origin
                if x < 0 or y < 0:
                    return {
                        "status": "error",
                        "message": (
                            "Invalid window: negative coordinates."
                        ),
                    }

                # Validate starting coordinate
                if x >= src.width or y >= src.height:
                    return {
                        "status": "error",
                        "message": (
                            "Invalid window: outside raster bounds."
                        ),
                    }

                # Never request beyond the raster.
                read_width = min(
                    width,
                    src.width - x,
                )

                read_height = min(
                    height,
                    src.height - y,
                )

                window = Window(
                    x,
                    y,
                    read_width,
                    read_height,
                )

                # Read ONLY the requested raster window.
                data = src.read(
                    1,
                    window=window,
                )

                result = {
                    "status": "success",
                    "scene_id": scene_id,
                    "band": band,
                    "resolution": (
                        target_asset.get("resolution")
                        or float(abs(src.transform.a))
                    ),
                    "crs": (
                        src.crs.to_string()
                        if src.crs
                        else "Unknown"
                    ),
                    "width": int(data.shape[1]),
                    "height": int(data.shape[0]),
                    "dtype": str(data.dtype),
                    "min": float(np.min(data)),
                    "max": float(np.max(data)),
                    "mean": float(np.mean(data)),
                    "transform": [
                        float(value)
                        for value in src.window_transform(
                            window
                        ).to_gdal()
                    ],
                }

                if return_data:
                    result["data"] = data

                return result

    except Exception as exc:
        return {
            "status": "error",
            "message": f"Raster read failure: {str(exc)}",
        }