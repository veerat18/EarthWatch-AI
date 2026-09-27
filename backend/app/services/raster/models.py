from pydantic import BaseModel, Field
from typing import Optional, List

class RasterWindowRequest(BaseModel):
    """Schema for requesting a raster window inspection."""
    band: str = Field(..., description="Band to inspect (e.g., B04).")
    x: int = Field(..., ge=0)
    y: int = Field(..., ge=0)
    width: int = Field(..., gt=0, le=2048, description="Window width (max 2048).")
    height: int = Field(..., gt=0, le=2048, description="Window height (max 2048).")

class RasterWindowResponse(BaseModel):
    """Schema for raster window metadata response."""
    scene_id: str
    band: str
    resolution: Optional[int]
    crs: str
    width: int
    height: int
    dtype: str
    min: float
    max: float
    mean: float
    transform: List[float]
