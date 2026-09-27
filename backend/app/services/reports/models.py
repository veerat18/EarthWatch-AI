from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any

class ReportRequest(BaseModel):
    """Request payload for Earth Observation report generation."""
    before_scene_id: str = Field(..., description="Sentinel-2 scene ID for BEFORE.")
    after_scene_id: str = Field(..., description="Sentinel-2 scene ID for AFTER.")
    x: int = Field(0, ge=0)
    y: int = Field(0, ge=0)
    width: int = Field(512, gt=0, le=2048)
    height: int = Field(512, gt=0, le=2048)

class ReportMetadata(BaseModel):
    report_id: str
    generated_at: str
    project: str = "EarthWatch AI"
    analysis_type: str = "Sentinel-2 Multitemporal Analysis"
    platform: str = "Copernicus Data Space Ecosystem (CDSE)"

class ReportAcquisition(BaseModel):
    before_scene_id: str
    after_scene_id: str
    before_acquisition: str
    after_acquisition: str
    before_cloud_cover: float
    after_cloud_cover: float
    temporal_interval_days: int
    tile: str
    resolution: int
    crs: str
    analysis_window: Dict[str, int]

class ReportExecutiveSummary(BaseModel):
    acquisition_interval: str
    analyzed_area: str
    major_measured_ndvi: str
    major_measured_ndwi: str
    dominant_change_classifications: str
    measured_findings: List[str]
    ai_interpretation: Optional[str] = None
    summary_text: str

class ReportMethodology(BaseModel):
    ndvi_formula: str = "NDVI = (B08 - B04) / (B08 + B04)"
    ndwi_formula: str = "NDWI = (B03 - B08) / (B03 + B08)"
    change_formula: str = "Change = After - Before"
    classification_disclaimer: str = (
        "Classification thresholds are analytical rules and are not machine-learning predictions "
        "or ground-truth land-cover labels."
    )

class StatsSummary(BaseModel):
    min: float
    max: float
    mean: float
    median: float
    valid_pixel_count: Optional[int] = None
    nodata_pixel_count: Optional[int] = None

class ClassificationItem(BaseModel):
    count: int
    percentage: float
    description: Optional[str] = None

class ReportVegetationAnalysis(BaseModel):
    before_ndvi: StatsSummary
    after_ndvi: StatsSummary
    ndvi_change: StatsSummary
    classifications: Dict[str, ClassificationItem]

class ReportWaterSignalAnalysis(BaseModel):
    available: bool = True
    ndwi: Optional[StatsSummary] = None
    ndwi_classifications: Optional[Dict[str, ClassificationItem]] = None
    ndwi_change: Optional[StatsSummary] = None
    change_classifications: Optional[Dict[str, ClassificationItem]] = None
    note: str = (
        "NDWI measures analytical spectral water signal and does not confirm physical water bodies "
        "or inundation."
    )

class ReportChangeDetection(BaseModel):
    analysis_window_pixels: int
    valid_pixels: int
    nodata_pixels: int
    ndvi_mean_change: float
    ndwi_mean_change: Optional[float] = None
    dominant_vegetation_signal: str
    dominant_water_signal: Optional[str] = None
    dynamics_summary: str

class ReportAIAnalysis(BaseModel):
    available: bool = True
    provider: str = "Gemini 3.8 Flash"
    summary: Optional[str] = None
    key_findings: Optional[List[str]] = None
    vegetation_assessment: Optional[str] = None
    water_signal_assessment: Optional[str] = None
    change_assessment: Optional[str] = None
    confidence_note: Optional[str] = None
    limitations: Optional[List[str]] = None
    disclaimer: str = (
        "AI interpretations are generated from verified statistical metrics and do not replace field validation."
    )

class ReportDataQuality(BaseModel):
    valid_pixels: int
    nodata_pixels: int
    cloud_cover_before: float
    cloud_cover_after: float
    methodology: Dict[str, str]
    limitations: List[str]

class ReportTechnicalMetadata(BaseModel):
    sensor: str = "Copernicus Sentinel-2 MultiSpectral Instrument (MSI) Level-2A"
    crs: str
    spatial_resolution: str
    tile: str
    coordinate_reference_system: str
    analysis_engine: str = "EarthWatch Analysis Core v1.0"
    stac_catalog: str = "Copernicus Data Space STAC API"

class EarthObservationReport(BaseModel):
    metadata: ReportMetadata
    executive_summary: ReportExecutiveSummary
    acquisition: ReportAcquisition
    methodology: ReportMethodology
    vegetation: ReportVegetationAnalysis
    water_signal: ReportWaterSignalAnalysis
    change_detection: ReportChangeDetection
    ai_analysis: ReportAIAnalysis
    data_quality: ReportDataQuality
    technical_metadata: ReportTechnicalMetadata
