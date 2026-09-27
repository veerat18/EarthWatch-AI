from pydantic import BaseModel, Field
from typing import Optional, List

class NDVIRequest(BaseModel):
    """Schema for requesting NDVI analysis."""
    scene_id: str = Field(..., description="Sentinel-2 scene ID.")
    x: int = Field(..., ge=0)
    y: int = Field(..., ge=0)
    width: int = Field(..., gt=0, le=2048, description="Window width (max 2048).")
    height: int = Field(..., gt=0, le=2048, description="Window height (max 2048).")

class NDVIResponse(BaseModel):
    """Schema for NDVI analysis response."""
    scene_id: str
    min: float
    max: float
    mean: float
    median: float
    valid_pixel_count: int
    nodata_pixel_count: int
    width: int
    height: int
    resolution: Optional[int]
    crs: str
    water_or_bare_count: int
    sparse_vegetation_count: int
    moderate_vegetation_count: int
    dense_vegetation_count: int
    matrix_b64: Optional[str] = Field(None, description="Base64 encoded float32 array for visualization")


class WaterClassificationSignal(BaseModel):
    count: int
    percentage: float
    description: Optional[str] = None


class WaterClassifications(BaseModel):
    non_water_or_low_signal: WaterClassificationSignal
    low_water_signal: WaterClassificationSignal
    moderate_water_signal: WaterClassificationSignal
    high_water_signal: WaterClassificationSignal


class NDWIRequest(BaseModel):
    """Schema for requesting NDWI analysis."""
    scene_id: str = Field(..., description="Sentinel-2 scene ID.")
    x: int = Field(..., ge=0)
    y: int = Field(..., ge=0)
    width: int = Field(..., gt=0, le=2048, description="Window width (max 2048).")
    height: int = Field(..., gt=0, le=2048, description="Window height (max 2048).")


class NDWIResponse(BaseModel):
    """Schema for NDWI analysis response."""
    scene_id: str
    min: float
    max: float
    mean: float
    median: float
    valid_pixel_count: int
    nodata_pixel_count: int
    width: int
    height: int
    resolution: Optional[int] = None
    crs: str
    non_water_or_low_signal_count: int
    non_water_or_low_signal_percentage: float
    low_water_signal_count: int
    low_water_signal_percentage: float
    moderate_water_signal_count: int
    moderate_water_signal_percentage: float
    high_water_signal_count: int
    high_water_signal_percentage: float
    classifications: Optional[WaterClassifications] = None
    matrix_b64: Optional[str] = Field(None, description="Base64 encoded float32 array for visualization")


class ChangeDetectionRequest(BaseModel):
    before_scene_id: str = Field(..., description="Sentinel-2 scene ID for BEFORE.")
    after_scene_id: str = Field(..., description="Sentinel-2 scene ID for AFTER.")
    x: int = Field(..., ge=0)
    y: int = Field(..., ge=0)
    width: int = Field(..., gt=0, le=2048)
    height: int = Field(..., gt=0, le=2048)

class NDVIStats(BaseModel):
    min: float
    max: float
    mean: float
    median: float
    valid_pixel_count: int
    nodata_pixel_count: int

class ChangeDetectionResponse(BaseModel):
    before_scene_id: str
    after_scene_id: str
    width: int
    height: int
    resolution: Optional[int]
    crs: str
    ndvi_before: NDVIStats
    ndvi_after: NDVIStats
    ndvi_change: NDVIStats
    significant_loss_count: int
    moderate_loss_count: int
    stable_count: int
    moderate_gain_count: int
    significant_gain_count: int
    matrix_b64: Optional[str] = Field(None, description="Base64 encoded float32 array of change")


class NDWIStats(BaseModel):
    min: float
    max: float
    mean: float
    median: float
    valid_pixel_count: int
    nodata_pixel_count: int


class WaterSignalClassificationItem(BaseModel):
    count: int
    percentage: float
    description: Optional[str] = None


class WaterChangeClassifications(BaseModel):
    significant_loss: WaterSignalClassificationItem
    moderate_loss: WaterSignalClassificationItem
    stable: WaterSignalClassificationItem
    moderate_gain: WaterSignalClassificationItem
    significant_gain: WaterSignalClassificationItem


class NDWIChangeMetadata(BaseModel):
    before_scene_id: str
    after_scene_id: str
    before_acquisition: Optional[str] = None
    after_acquisition: Optional[str] = None
    tile: Optional[str] = None
    crs: str
    resolution: Optional[int] = None
    x: int
    y: int
    width: int
    height: int


class NDWIChangeRequest(BaseModel):
    before_scene_id: str = Field(..., description="Sentinel-2 scene ID for BEFORE.")
    after_scene_id: str = Field(..., description="Sentinel-2 scene ID for AFTER.")
    x: int = Field(..., ge=0)
    y: int = Field(..., ge=0)
    width: int = Field(..., gt=0, le=2048)
    height: int = Field(..., gt=0, le=2048)


class NDWIChangeDetectionResponse(BaseModel):
    before_scene_id: str
    after_scene_id: str
    width: int
    height: int
    resolution: Optional[int] = None
    crs: str
    before: NDWIStats
    after: NDWIStats
    change: NDWIStats
    significant_loss_count: int
    significant_loss_percentage: float
    moderate_loss_count: int
    moderate_loss_percentage: float
    stable_count: int
    stable_percentage: float
    moderate_gain_count: int
    moderate_gain_percentage: float
    significant_gain_count: int
    significant_gain_percentage: float
    classification: WaterChangeClassifications
    metadata: Optional[NDWIChangeMetadata] = None
    matrix_b64: Optional[str] = Field(None, description="Base64 encoded float32 array of NDWI change")

class SourceData(BaseModel):
    scene_id: str
    acquisition_datetime: str
    cloud_cover: float
    satellite: str
    tile: Optional[str] = None

class EvidenceSourceData(BaseModel):
    before_scene: SourceData
    after_scene: SourceData
    temporal_interval_days: int
    aoi_location: Optional[str] = None

class EvidenceAnalysisParameters(BaseModel):
    index: str
    formula: str
    change_formula: str
    window: dict
    resolution: int
    crs: str

class EvidenceClassifications(BaseModel):
    significant_vegetation_loss: dict
    moderate_vegetation_loss: dict
    stable_low_change: dict
    moderate_vegetation_gain: dict
    significant_vegetation_gain: dict

class EvidenceDataQuality(BaseModel):
    valid_pixel_count: int
    nodata_pixel_count: int
    cloud_cover_before: float
    cloud_cover_after: float
    raster_resolution: int
    crs: str
    analysis_window: str
    source_provider: str
    limitations: List[str]

class NDWISceneEvidenceInfo(BaseModel):
    scene_id: str
    acquisition: Optional[str] = None
    cloud_cover: Optional[float] = None
    tile: Optional[str] = None
    source: Optional[str] = "Copernicus Sentinel-2 L2A"


class NDWIParametersEvidence(BaseModel):
    formula: str = "(B03 - B08) / (B03 + B08)"
    band_green: str = "B03"
    band_nir: str = "B08"
    window: dict
    resolution: int
    crs: str


class NDWIMeasurementsEvidence(BaseModel):
    min: float
    max: float
    mean: float
    median: float
    valid_pixel_count: int
    nodata_pixel_count: int


class NDWIClassificationsEvidence(BaseModel):
    non_water_low_signal: dict
    low_water_signal: dict
    moderate_water_signal: dict
    high_water_signal: dict


class NDWIEvidence(BaseModel):
    scene: NDWISceneEvidenceInfo
    parameters: NDWIParametersEvidence
    measurements: NDWIMeasurementsEvidence
    classifications: NDWIClassificationsEvidence


class NDWIChangeSceneInfo(BaseModel):
    scene_id: str
    acquisition: Optional[str] = None
    measurements: dict


class NDWIChangeClassificationsEvidence(BaseModel):
    significant_loss: dict
    moderate_loss: dict
    stable: dict
    moderate_gain: dict
    significant_gain: dict


class NDWIChangeParametersEvidence(BaseModel):
    change_formula: str = "NDWI_after - NDWI_before"
    thresholds: dict
    window: dict
    resolution: int
    crs: str


class NDWIChangeEvidence(BaseModel):
    before: NDWIChangeSceneInfo
    after: NDWIChangeSceneInfo
    change: NDWIMeasurementsEvidence
    classifications: NDWIChangeClassificationsEvidence
    parameters: NDWIChangeParametersEvidence


class AnalysisEvidence(BaseModel):
    source_data: EvidenceSourceData
    analysis_parameters: EvidenceAnalysisParameters
    measurements: dict
    classifications: EvidenceClassifications
    data_quality: EvidenceDataQuality
    ndwi: Optional[NDWIEvidence] = None
    ndwi_change: Optional[NDWIChangeEvidence] = None
