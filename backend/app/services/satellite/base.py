from abc import ABC, abstractmethod
from typing import List
from app.services.satellite.models import (
    SatelliteSearchRequest,
    SatelliteSearchResponse,
    SatelliteSourceInfo,
)


class BaseSatelliteProvider(ABC):
    """Abstract base class for satellite imagery providers (e.g., Copernicus CDSE, STAC, Planetary Computer)."""

    @abstractmethod
    def is_configured(self) -> bool:
        """Check whether provider authentication and client settings are available."""
        pass

    @abstractmethod
    def get_provider_name(self) -> str:
        """Return the identifier for this provider."""
        pass

    @abstractmethod
    async def search_scenes(self, request: SatelliteSearchRequest) -> SatelliteSearchResponse:
        """Query the satellite catalog for imagery scenes matching the given AOI and filters."""
        pass

    @abstractmethod
    def get_sources_info(self) -> List[SatelliteSourceInfo]:
        """Return list of architectural sources supported by this provider."""
        pass
