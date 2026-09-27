import logging
from datetime import datetime, timezone

from typing import List, Dict, Any, Optional

import httpx



CDSE_STAC_BASE_URL = "https://stac.dataspace.copernicus.eu/v1"

SENTINEL_COLLECTION = "sentinel-2-l2a"

from app.core.config import settings

from app.services.satellite.base import BaseSatelliteProvider

from app.services.satellite.models import (

    SatelliteSearchRequest,

    SatelliteSearchResponse,
    SatelliteScene,

    SatelliteSourceInfo,

)



logger = logging.getLogger(__name__)





class Sentinel2Provider(BaseSatelliteProvider):

    """

    Sentinel-2 provider implementation designed for Copernicus Data Space Ecosystem (CDSE) / STAC APIs.



    Provides strict abstraction, request validation, and clean connection pending states

    without fabricating fake imagery or metadata.

    """



    def __init__(self):

        self.provider_name = settings.SATELLITE_PROVIDER or "Copernicus Data Space Ecosystem"

        self.timeout = 30.0



    def is_configured(self) -> bool:

        """Determines if the provider has configured client credentials."""

        return settings.is_satellite_provider_configured



    def get_provider_name(self) -> str:

        return self.provider_name



    def get_sources_info(self) -> List[SatelliteSourceInfo]:

        """Return the satellite sources that EarthWatch supports architecturally."""

        is_conf = self.is_configured()

        return [

            SatelliteSourceInfo(

                id="sentinel-2",

                name="Sentinel-2 L2A",

                constellation="Copernicus Sentinel-2",

                resolution="10m Optical",

                bands=["B02 (Blue)", "B03 (Green)", "B04 (Red)", "B08 (NIR)", "B11 (SWIR)"],

                status="planned/integration pending" if not is_conf else "ready",

                provider_configured=is_conf,

                description="European Space Agency multispectral high-resolution optical imagery with 5-day revisit rate."

            ),

            SatelliteSourceInfo(

                id="landsat-8-9",

                name="Landsat-8/9 OLI-2",

                constellation="USGS / NASA Landsat",

                resolution="30m Multispectral / 15m Pan",

                bands=["B2 (Blue)", "B3 (Green)", "B4 (Red)", "B5 (NIR)", "B6/7 (SWIR)", "B10 (Thermal)"],

                status="planned",

                provider_configured=False,

                description="USGS multispectral & thermal infrared imaging for long-term land observation."

            ),

            SatelliteSourceInfo(

                id="planetscope",

                name="PlanetScope",

                constellation="Planet Labs",

                resolution="3m High-Resolution",

                bands=["RGB", "NIR"],

                status="planned",

                provider_configured=False,

                description="Commercial daily global constellation providing high-cadence 3m monitoring."

            ),

            SatelliteSourceInfo(

                id="custom-cog",

                name="Custom Cloud-Optimized GeoTIFF",

                constellation="User Provided (S3 / HTTPS)",

                resolution="Variable",

                bands=["User Defined"],

                status="planned",

                provider_configured=False,

                description="Direct URL ingestion of user-hosted Cloud-Optimized GeoTIFF rasters with STAC metadata."

            ),

        ]



    async def search_scenes(self, request: SatelliteSearchRequest) -> SatelliteSearchResponse:
        """
        Query Sentinel-2 imagery catalog for real scenes.

        If provider credentials are not configured, returns a clean 'provider_not_configured'
        state without fabricating scenes.
        """
        if not self.is_configured():
            logger.info("Satellite search requested, but satellite provider credentials are not configured.")
            return SatelliteSearchResponse(
                status="provider_not_configured",
                provider_configured=False,
                message="Satellite imagery provider is not connected.",
                total_scenes=0,
                scenes=[],
            )

        from app.services.satellite.aoi import resolve_aoi_geometry, AOIValidationError
        try:
            geometry = resolve_aoi_geometry(request.location, request.geojson_aoi)
        except AOIValidationError as e:
            return SatelliteSearchResponse(
                status="error",
                provider_configured=True,
                message=str(e),
                total_scenes=0,
                scenes=[]
            )

        start_str = f"{request.start_date.isoformat()}T00:00:00Z"
        end_str = f"{request.end_date.isoformat()}T23:59:59Z"

        payload = {
            "collections": [SENTINEL_COLLECTION],
            "intersects": geometry,
            "datetime": f"{start_str}/{end_str}",
            "query": {
                "eo:cloud_cover": {"lte": request.max_cloud_cover}
            },
            "limit": 30
        }

        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.post(
                    f"{CDSE_STAC_BASE_URL}/search",
                    json=payload,
                    headers={
                        "Accept": "application/geo+json, application/json",
                        "User-Agent": "EarthWatch-AI/0.1.0",
                    }
                )
                response.raise_for_status()
                data = response.json()
        except httpx.HTTPStatusError as exc:
            logger.error("STAC API HTTP Error: %s", exc)
            return SatelliteSearchResponse(
                status="error",
                provider_configured=True,
                message="Failed to communicate with satellite STAC API.",
                total_scenes=0,
                scenes=[]
            )
        except Exception as exc:
            logger.error("STAC Search Exception: %s", exc)
            return SatelliteSearchResponse(
                status="error",
                provider_configured=True,
                message="An unexpected error occurred during satellite search.",
                total_scenes=0,
                scenes=[]
            )

        features = data.get("features", [])
        scenes = []

        for item in features:
            try:
                props = item.get("properties", {})

                dt_str = props.get("datetime")
                if not dt_str:
                    continue
                dt = datetime.fromisoformat(dt_str.replace('Z', '+00:00'))

                scene = SatelliteScene(
                    scene_id=item.get("id"),
                    satellite=props.get("platform", "Sentinel-2"),
                    acquisition_datetime=dt,
                    cloud_cover=props.get("eo:cloud_cover", 0.0),
                    bbox=item.get("bbox", [0.0, 0.0, 0.0, 0.0]),
                    thumbnail_url=self._extract_thumbnail_url(item.get("assets", {})),
                    metadata_url=None,
                    processing_level=props.get("processing:level", "Level-2A")
                )

                links = item.get("links", [])
                for link in links:
                    if link.get("rel") == "self":
                        scene.metadata_url = link.get("href")

                scenes.append(scene)
            except Exception as e:
                logger.warning("Failed to map STAC feature to SatelliteScene: %s", e)

        return SatelliteSearchResponse(
            status="success",
            provider_configured=True,
            message=f"Found {len(scenes)} scenes." if scenes else "No scenes found.",
            total_scenes=len(scenes),
            scenes=scenes
        )



        # Future Phase: Execute authenticated Copernicus Data Space / STAC API query

        # Currently returns empty list until CDSE authentication integration is activated

        return SatelliteSearchResponse(

            status="success",

            provider_configured=True,

            message="Search query dispatched successfully.",

            total_scenes=0,

            scenes=[],

        )





    def _extract_thumbnail_url(self, assets: Dict[str, Any]) -> Optional[str]:



        """Extracts thumbnail URL from STAC assets."""



        for key in ["thumbnail", "preview", "rendered_preview"]:



            if key in assets and "href" in assets[key]:



                return assets[key]["href"]



        return None







    async def get_scene_preview(self, scene_id: str) -> Dict[str, Any]:



        """



        Returns the direct URL to the scene's preview thumbnail.



        """



        item_url = f"{CDSE_STAC_BASE_URL}/collections/{SENTINEL_COLLECTION}/items/{scene_id}"



        try:



            async with httpx.AsyncClient(timeout=self.timeout) as client:



                response = await client.get(



                    item_url,



                    headers={



                        "Accept": "application/geo+json, application/json",



                        "User-Agent": "EarthWatch-AI/0.1.0",



                    },



                )



                if response.status_code == 404:



                    return {"status": "error", "message": "Invalid scene ID."}



                if response.status_code != 200:



                    return {"status": "error", "message": "Preview unavailable."}







                data = response.json()



                thumbnail_url = self._extract_thumbnail_url(data.get("assets", {}))







                if not thumbnail_url:



                    return {



                        "status": "preview_unavailable",



                        "message": "No preview asset is available for this scene."



                    }







                return {



                    "status": "success",



                    "thumbnail_url": thumbnail_url



                }



        except Exception as exc:



            logger.error("Error communicating with Copernicus STAC API for preview: %s", exc)



            return {"status": "error", "message": "Preview unavailable."}







    async def inspect_scene_assets(self, scene_id: str) -> Dict[str, Any]:



        """



        Inspect the STAC item to determine available raster assets and bands.



        """



        item_url = f"{CDSE_STAC_BASE_URL}/collections/{SENTINEL_COLLECTION}/items/{scene_id}"



        try:



            async with httpx.AsyncClient(timeout=self.timeout) as client:



                response = await client.get(



                    item_url,



                    headers={



                        "Accept": "application/geo+json, application/json",



                        "User-Agent": "EarthWatch-AI/0.1.0",



                    },



                )



                if response.status_code == 404:



                    return {"status": "error", "message": "Invalid scene ID."}



                if response.status_code != 200:



                    return {"status": "error", "message": "STAC service failure."}







                data = response.json()



                raw_assets = data.get("assets", {})







                assets_list = []



                for key, asset_data in raw_assets.items():



                    if not isinstance(asset_data, dict):



                        continue







                    # Skip non-raster assets if needed, but here we list all



                    # for the inspection endpoint.



                    band_info = asset_data.get("eo:bands", [{}])[0]



                    band_name = band_info.get("name") if band_info else None







                    assets_list.append({



                        "key": key,



                        "title": asset_data.get("title"),



                        "media_type": asset_data.get("type"),



                        "roles": asset_data.get("roles", []),



                        "href": asset_data.get("href", ""),



                        "band": band_name



                    })







                return {



                    "status": "success",



                    "scene_id": scene_id,



                    "satellite": "Sentinel-2",



                    "assets": assets_list



                }



        except Exception as exc:



            logger.error("Error fetching scene assets: %s", exc)



            return {"status": "error", "message": "STAC service failure."}







    async def get_scene_metadata(self, scene_id: str) -> Dict[str, Any]:



        """



        Fetch core scene metadata for evidence layer.



        """



        item_url = f"{CDSE_STAC_BASE_URL}/collections/{SENTINEL_COLLECTION}/items/{scene_id}"



        try:



            async with httpx.AsyncClient(timeout=self.timeout) as client:



                response = await client.get(



                    item_url,



                    headers={



                        "Accept": "application/geo+json, application/json",



                        "User-Agent": "EarthWatch-AI/0.1.0",



                    },



                )



                if response.status_code == 404:



                    return {"status": "error", "message": "Invalid scene ID."}



                if response.status_code != 200:



                    return {"status": "error", "message": "Failed to fetch scene metadata."}







                data = response.json()



                props = data.get("properties", {})







                return {



                    "status": "success",



                    "scene_id": data.get("id"),



                    "acquisition_datetime": props.get("datetime"),



                    "cloud_cover": props.get("eo:cloud_cover", 0.0),



                    "platform": props.get("platform"),



                    "instruments": props.get("instruments", []),



                    "processing_level": props.get("processing:level")



                }



        except Exception as exc:



            logger.error("Error fetching metadata: %s", exc)



            return {"status": "error", "message": "Failed to fetch scene metadata."}
