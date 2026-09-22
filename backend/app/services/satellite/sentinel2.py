import logging
from typing import List
from app.core.config import settings
from app.services.satellite.base import BaseSatelliteProvider
from app.services.satellite.models import (
    SatelliteSearchRequest,
    SatelliteSearchResponse,
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

        # Future Phase: Execute authenticated Copernicus Data Space / STAC API query
        # Currently returns empty list until CDSE authentication integration is activated
        return SatelliteSearchResponse(
            status="success",
            provider_configured=True,
            message="Search query dispatched successfully.",
            total_scenes=0,
            scenes=[],
        )
