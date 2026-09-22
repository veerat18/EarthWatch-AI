from typing import List
from fastapi import APIRouter, HTTPException, status
from app.services.satellite.models import (
    SatelliteSearchRequest,
    SatelliteSearchResponse,
    SatelliteSourceInfo,
)
from app.services.satellite.sentinel2 import Sentinel2Provider

router = APIRouter()
provider = Sentinel2Provider()


@router.post(
    "/satellite/search",
    response_model=SatelliteSearchResponse,
    status_code=status.HTTP_200_OK,
    summary="Search satellite imagery scenes",
    description="Search satellite scenes for a specified area of interest (AOI) and temporal window.",
)
async def search_satellite_scenes(request: SatelliteSearchRequest) -> SatelliteSearchResponse:
    """
    Search for satellite imagery scenes.
    
    Validates AOI, temporal ranges, cloud cover constraints, and sensor constellations.
    Returns 'provider_not_configured' status if provider integration is pending.
    Never fabricates fake scene data.
    """
    try:
        response = await provider.search_scenes(request)
        return response
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An error occurred while dispatching satellite search: {str(exc)}",
        )


@router.get(
    "/satellite/sources",
    response_model=List[SatelliteSourceInfo],
    status_code=status.HTTP_200_OK,
    summary="List supported satellite sources",
    description="Returns architectural satellite sources supported by EarthWatch AI.",
)
def get_supported_satellite_sources() -> List[SatelliteSourceInfo]:
    """
    Returns available and planned satellite constellation sources,
    clearly distinguishing connected pipelines from integration pending sources.
    """
    return provider.get_sources_info()
