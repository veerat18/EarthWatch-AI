from typing import List
from fastapi import APIRouter, HTTPException, status
from app.services.satellite.models import (
    SatelliteSearchRequest,
    SatelliteSearchResponse,
    SatelliteSourceInfo,
    SatelliteAssetsResponse,
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

@router.get(
    "/satellite/scenes/{scene_id}/preview",
    status_code=status.HTTP_200_OK,
    summary="Get real satellite scene preview",
    description="Retrieve the actual STAC preview asset URL for a specific scene.",
)
async def get_scene_preview(scene_id: str):
    """
    Returns the real STAC thumbnail URL or a clean unavailability response.
    Never generates fake previews.
    """
    try:
        response = await provider.get_scene_preview(scene_id)
        if response.get("status") == "error":
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=response.get("message")
            )
        return response
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An error occurred while fetching preview."
        )

@router.get(
    "/satellite/scenes/{scene_id}/assets",
    response_model=SatelliteAssetsResponse,
    status_code=status.HTTP_200_OK,
    summary="Inspect scene raster assets",
    description="Retrieve available raster assets for a STAC scene.",
)
async def inspect_scene_assets(scene_id: str) -> SatelliteAssetsResponse:
    """
    Returns available raster assets (B02, B03, B04, etc.) without downloading them.
    """
    try:
        response = await provider.inspect_scene_assets(scene_id)
        if response.get("status") == "error":
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=response.get("message")
            )
        return SatelliteAssetsResponse(**response)
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An error occurred while inspecting scene assets."
        )
