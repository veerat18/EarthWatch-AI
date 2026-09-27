from datetime import date, datetime
from enum import Enum
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field, field_validator, model_validator
from app.services.satellite.aoi import resolve_aoi_geometry, AOIValidationError


class SatelliteSourceEnum(str, Enum):
    SENTINEL_2 = "Sentinel-2"
    LANDSAT_8_9 = "Landsat-8/9"
    PLANETSCOPE = "PlanetScope"
    CUSTOM_COG = "Custom COG"


class SatelliteSearchRequest(BaseModel):
    """Schema for requesting satellite scene discovery across an AOI and temporal range."""
    location: str = Field(
        ...,
        min_length=1,
        description="Location name (e.g., Delhi, Mumbai, Bhadohi, San Francisco Bay Area) or GeoJSON geometry string."
    )
    geojson_aoi: Optional[Dict[str, Any]] = Field(
        default=None,
        description="Optional GeoJSON Polygon geometry for arbitrary AOIs."
    )
    start_date: date = Field(
        ...,
        description="Start date for temporal observation window (YYYY-MM-DD)."
    )
    end_date: date = Field(
        ...,
        description="End date for temporal observation window (YYYY-MM-DD)."
    )
    max_cloud_cover: float = Field(
        default=20.0,
        ge=0.0,
        le=100.0,
        description="Maximum cloud cover percentage allowed (0 to 100)."
    )
    satellite_source: str = Field(
        default="Sentinel-2",
        description="Satellite sensor constellation (e.g., Sentinel-2, Landsat-8/9, PlanetScope, Custom COG)."
    )

    @field_validator("satellite_source")
    @classmethod
    def validate_satellite_source(cls, v: str) -> str:
        valid_sources = {source.value.lower(): source.value for source in SatelliteSourceEnum}
        normalized_key = v.strip().lower()
        if normalized_key not in valid_sources:
            allowed = ", ".join([s.value for s in SatelliteSourceEnum])
            raise ValueError(f"Unsupported satellite source '{v}'. Supported sources are: {allowed}")
        return valid_sources[normalized_key]

    @model_validator(mode="after")
    def validate_request_logic(self) -> "SatelliteSearchRequest":
        # 1. Validate temporal range
        if self.start_date > self.end_date:
            raise ValueError(
                f"Invalid temporal range: start_date ({self.start_date}) cannot be after end_date ({self.end_date})."
            )

        # 2. Validate AOI / Location resolution
        from app.core.config import settings
        if settings.is_satellite_provider_configured:
            try:
                resolve_aoi_geometry(self.location, self.geojson_aoi)
            except AOIValidationError as err:
                raise ValueError(str(err)) from err

        return self


class SatelliteScene(BaseModel):
    """Schema representing an individual satellite capture/scene from real STAC catalog."""
    scene_id: str = Field(..., description="Unique provider scene or tile identifier.")
    satellite: str = Field(..., description="Satellite sensor / platform name.")
    acquisition_datetime: datetime = Field(..., description="UTC acquisition timestamp.")
    cloud_cover: float = Field(..., ge=0.0, le=100.0, description="Cloud cover percentage (0-100).")
    bbox: List[float] = Field(..., min_length=4, max_length=4, description="Bounding box [min_lon, min_lat, max_lon, max_lat].")
    thumbnail_url: Optional[str] = Field(default=None, description="Direct URL to preview thumbnail from STAC assets.")
    metadata_url: Optional[str] = Field(default=None, description="URL to STAC or provider metadata JSON.")
    processing_level: Optional[str] = Field(default=None, description="Data processing level (e.g. Level-2A, L2A).")


class SatelliteSearchResponse(BaseModel):
    """API response model for satellite imagery scene search."""
    status: str = Field(..., description="Status string: 'success', 'provider_not_configured', or 'error'.")
    provider_configured: bool = Field(..., description="True if backend has valid connection to satellite provider.")
    message: str = Field(..., description="Human-readable message describing query state or provider status.")
    total_scenes: int = Field(default=0, description="Count of discovered scenes.")
    scenes: List[SatelliteScene] = Field(default_factory=list, description="Discovered satellite scenes.")


class SatelliteSourceInfo(BaseModel):
    """Metadata describing a supported satellite source."""
    id: str
    name: str
    constellation: str
    resolution: str
    bands: List[str]
    status: str
    provider_configured: bool
    description: str


class SatelliteAsset(BaseModel):
    """Schema representing a single raster asset available for a scene."""
    key: str
    title: Optional[str] = None
    media_type: Optional[str] = None
    roles: List[str] = Field(default_factory=list)
    href: str
    alternate: Optional[Dict[str, Any]] = None
    band: Optional[str] = None
    resolution: Optional[int] = None
    size: Optional[int] = None


class SatelliteAssetsResponse(BaseModel):
    """API response model for satellite scene assets inspection."""
    status: str
    message: Optional[str] = None
    scene_id: str
    satellite: str = "Sentinel-2"
    assets: List[SatelliteAsset] = Field(default_factory=list)
