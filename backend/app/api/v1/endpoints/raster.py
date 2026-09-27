from fastapi import APIRouter, HTTPException, status
from app.services.raster.models import RasterWindowRequest, RasterWindowResponse
from app.services.raster.service import inspect_raster_window

router = APIRouter()

@router.post(
    "/satellite/scenes/{scene_id}/raster/inspect",
    response_model=RasterWindowResponse,
    status_code=status.HTTP_200_OK,
    summary="Inspect raster asset window",
    description="Read a specific window of a raster asset for analytical inspection without downloading the whole file.",
)
async def inspect_scene_raster(scene_id: str, request: RasterWindowRequest):
    """
    Returns metadata about the requested raster window.
    """
    valid_bands = ["B02", "B03", "B04", "B08", "B11"]
    if request.band not in valid_bands:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid band. Supported bands are: {', '.join(valid_bands)}"
        )
        
    try:
        response = await inspect_raster_window(
            scene_id=scene_id,
            band=request.band,
            x=request.x,
            y=request.y,
            width=request.width,
            height=request.height
        )
        if response.get("status") == "auth_missing":
            raise HTTPException(
                status_code=status.HTTP_501_NOT_IMPLEMENTED,
                detail=response.get("message")
            )
        if response.get("status") == "auth_failure":
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=response.get("message")
            )
        if response.get("status") == "error":
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND if "not available" in response.get("message") or "unavailable" in response.get("message") else status.HTTP_400_BAD_REQUEST,
                detail=response.get("message")
            )
        return RasterWindowResponse(**response)
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An error occurred while reading the raster window."
        )
