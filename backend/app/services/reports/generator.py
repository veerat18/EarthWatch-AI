import uuid
import logging
from datetime import datetime, timezone
from typing import Dict, Any, Optional

from app.services.analysis.evidence import generate_analysis_evidence
from app.services.analysis.models import AnalysisEvidence
from app.services.ai.provider import EarthAnalystProvider
from app.services.reports.models import (
    EarthObservationReport,
    ReportMetadata,
    ReportAcquisition,
    ReportExecutiveSummary,
    ReportMethodology,
    StatsSummary,
    ClassificationItem,
    ReportVegetationAnalysis,
    ReportWaterSignalAnalysis,
    ReportChangeDetection,
    ReportAIAnalysis,
    ReportDataQuality,
    ReportTechnicalMetadata,
)

logger = logging.getLogger(__name__)

ai_provider = EarthAnalystProvider()

async def generate_earth_observation_report(request_dict: Dict[str, Any]) -> Dict[str, Any]:
    """
    Generate a verified Earth Observation analysis report from canonical AnalysisEvidence
    and existing Gemini Earth Analyst findings.
    
    Adheres strictly to evidence grounding:
    - No recalculation or fabrication of statistics.
    - Zero inclusion of matrix_b64 or raw image pixel buffers.
    - Clear distinction between measured sensor metrics and AI interpretations.
    """
    # 1. Obtain verified canonical evidence
    evidence_resp = await generate_analysis_evidence(request_dict)
    
    if evidence_resp.get("status") != "success":
        return evidence_resp

    try:
        evidence = AnalysisEvidence(**evidence_resp)
    except Exception as exc:
        logger.error(f"Failed to parse AnalysisEvidence: {exc}")
        return {"status": "error", "message": f"Invalid Analysis Evidence format: {exc}"}

    # 2. Obtain AI analyst response (graceful fallback if Gemini is unavailable)
    ai_analysis_data = None
    ai_available = False
    ai_error_note = None

    try:
        ai_resp = await ai_provider.generate_analysis(evidence)
        if ai_resp.get("status") == "success" and "analysis" in ai_resp:
            ai_analysis_data = ai_resp["analysis"]
            ai_available = True
        else:
            ai_error_note = ai_resp.get("message", "AI Analyst service unavailable.")
    except Exception as exc:
        logger.warning(f"AI Analyst generation failed during report compilation: {exc}")
        ai_error_note = f"AI Analyst unavailable: {exc}"

    # 3. Assemble Report Sections
    # 3.1 Metadata
    now_iso = datetime.now(timezone.utc).isoformat()
    report_id = f"EOR-{datetime.now(timezone.utc).strftime('%Y%m%d%H%M%S')}-{uuid.uuid4().hex[:6].upper()}"
    metadata = ReportMetadata(
        report_id=report_id,
        generated_at=now_iso,
        project="EarthWatch AI",
        analysis_type="Sentinel-2 Multitemporal Analysis",
        platform="Copernicus Data Space Ecosystem (CDSE)",
    )

    # 3.2 Acquisition Information
    src_data = evidence.source_data
    params = evidence.analysis_parameters
    tile = src_data.before_scene.tile or src_data.after_scene.tile
    if not tile or tile == "Unknown":
        from app.services.analysis.ndwi_change import extract_tile
        tile = extract_tile(src_data.before_scene.scene_id) or extract_tile(src_data.after_scene.scene_id) or "Unknown"

    acquisition = ReportAcquisition(
        before_scene_id=src_data.before_scene.scene_id,
        after_scene_id=src_data.after_scene.scene_id,
        before_acquisition=src_data.before_scene.acquisition_datetime,
        after_acquisition=src_data.after_scene.acquisition_datetime,
        before_cloud_cover=src_data.before_scene.cloud_cover,
        after_cloud_cover=src_data.after_scene.cloud_cover,
        temporal_interval_days=src_data.temporal_interval_days,
        tile=tile,
        resolution=params.resolution,
        crs=params.crs,
        analysis_window=params.window,
    )

    # 3.3 Methodology
    methodology = ReportMethodology()

    # 3.4 Vegetation Analysis
    measurements = evidence.measurements
    before_data = measurements.get("ndvi_before") or measurements.get("before_ndvi")
    after_data = measurements.get("ndvi_after") or measurements.get("after_ndvi")
    change_data = measurements.get("ndvi_change")
    before_ndvi = StatsSummary(**before_data)
    after_ndvi = StatsSummary(**after_data)
    ndvi_change = StatsSummary(**change_data)

    veg_class_dict = evidence.classifications.model_dump()
    veg_classifications = {
        k: ClassificationItem(
            count=v.get("count", 0),
            percentage=v.get("percentage", 0.0),
            description=v.get("description")
        )
        for k, v in veg_class_dict.items()
    }

    vegetation = ReportVegetationAnalysis(
        before_ndvi=before_ndvi,
        after_ndvi=after_ndvi,
        ndvi_change=ndvi_change,
        classifications=veg_classifications,
    )

    # 3.5 Water-Signal Analysis
    if evidence.ndwi and evidence.ndwi_change:
        ndwi_meas = evidence.ndwi.measurements
        ndwi_stats = StatsSummary(
            min=ndwi_meas.min,
            max=ndwi_meas.max,
            mean=ndwi_meas.mean,
            median=ndwi_meas.median,
            valid_pixel_count=ndwi_meas.valid_pixel_count,
            nodata_pixel_count=ndwi_meas.nodata_pixel_count,
        )
        ndwi_classes = {
            k: ClassificationItem(
                count=v.get("count", 0),
                percentage=v.get("percentage", 0.0),
                description=v.get("description")
            )
            for k, v in evidence.ndwi.classifications.model_dump().items()
        }

        before_ndwi_stats = None
        if evidence.ndwi_change.before and evidence.ndwi_change.before.measurements:
            b_meas = evidence.ndwi_change.before.measurements
            if isinstance(b_meas, dict):
                before_ndwi_stats = StatsSummary(
                    min=b_meas.get("min", 0.0),
                    max=b_meas.get("max", 0.0),
                    mean=b_meas.get("mean", 0.0),
                    median=b_meas.get("median", 0.0),
                    valid_pixel_count=b_meas.get("valid_pixel_count"),
                    nodata_pixel_count=b_meas.get("nodata_pixel_count"),
                )

        ndwi_chg_meas = evidence.ndwi_change.change
        ndwi_change_stats = StatsSummary(
            min=ndwi_chg_meas.min,
            max=ndwi_chg_meas.max,
            mean=ndwi_chg_meas.mean,
            median=ndwi_chg_meas.median,
            valid_pixel_count=ndwi_chg_meas.valid_pixel_count,
            nodata_pixel_count=ndwi_chg_meas.nodata_pixel_count,
        )
        ndwi_change_classes = {
            k: ClassificationItem(
                count=v.get("count", 0),
                percentage=v.get("percentage", 0.0),
                description=v.get("description")
            )
            for k, v in evidence.ndwi_change.classifications.model_dump().items()
        }

        water_signal = ReportWaterSignalAnalysis(
            available=True,
            before_ndwi=before_ndwi_stats,
            ndwi=ndwi_stats,
            ndwi_classifications=ndwi_classes,
            ndwi_change=ndwi_change_stats,
            change_classifications=ndwi_change_classes,
            note="NDWI measures analytical spectral water signal and does not confirm physical water bodies or inundation.",
        )
    elif evidence.ndwi_change:
        before_ndwi_stats = None
        if evidence.ndwi_change.before and evidence.ndwi_change.before.measurements:
            b_meas = evidence.ndwi_change.before.measurements
            if isinstance(b_meas, dict):
                before_ndwi_stats = StatsSummary(
                    min=b_meas.get("min", 0.0),
                    max=b_meas.get("max", 0.0),
                    mean=b_meas.get("mean", 0.0),
                    median=b_meas.get("median", 0.0),
                    valid_pixel_count=b_meas.get("valid_pixel_count"),
                    nodata_pixel_count=b_meas.get("nodata_pixel_count"),
                )

        after_ndwi_stats = None
        if evidence.ndwi_change.after and evidence.ndwi_change.after.measurements:
            a_meas = evidence.ndwi_change.after.measurements
            if isinstance(a_meas, dict):
                after_ndwi_stats = StatsSummary(
                    min=a_meas.get("min", 0.0),
                    max=a_meas.get("max", 0.0),
                    mean=a_meas.get("mean", 0.0),
                    median=a_meas.get("median", 0.0),
                    valid_pixel_count=a_meas.get("valid_pixel_count"),
                    nodata_pixel_count=a_meas.get("nodata_pixel_count"),
                )

        ndwi_chg_meas = evidence.ndwi_change.change
        ndwi_change_stats = StatsSummary(
            min=ndwi_chg_meas.min,
            max=ndwi_chg_meas.max,
            mean=ndwi_chg_meas.mean,
            median=ndwi_chg_meas.median,
            valid_pixel_count=ndwi_chg_meas.valid_pixel_count,
            nodata_pixel_count=ndwi_chg_meas.nodata_pixel_count,
        )
        ndwi_change_classes = {
            k: ClassificationItem(
                count=v.get("count", 0),
                percentage=v.get("percentage", 0.0),
                description=v.get("description")
            )
            for k, v in evidence.ndwi_change.classifications.model_dump().items()
        }

        water_signal = ReportWaterSignalAnalysis(
            available=True,
            before_ndwi=before_ndwi_stats,
            ndwi=after_ndwi_stats,
            ndwi_classifications=None,
            ndwi_change=ndwi_change_stats,
            change_classifications=ndwi_change_classes,
            note="NDWI measures analytical spectral water signal and does not confirm physical water bodies or inundation.",
        )
    else:
        water_signal = ReportWaterSignalAnalysis(
            available=False,
            before_ndwi=None,
            ndwi=None,
            ndwi_classifications=None,
            ndwi_change=None,
            change_classifications=None,
            note="NDWI analytical data is not available for this acquisition pair.",
        )

    # 3.6 Change Detection Combined Summary
    dominant_veg_cat = max(veg_classifications.items(), key=lambda item: item[1].percentage)
    dominant_veg_str = f"{dominant_veg_cat[0].replace('_', ' ').title()} ({dominant_veg_cat[1].percentage:.2f}%)"

    dominant_water_str = None
    ndwi_mean_chg_val = None
    if water_signal.available and water_signal.change_classifications:
        dominant_water_cat = max(water_signal.change_classifications.items(), key=lambda item: item[1].percentage)
        dominant_water_str = f"{dominant_water_cat[0].replace('_', ' ').title()} ({dominant_water_cat[1].percentage:.2f}%)"
        ndwi_mean_chg_val = water_signal.ndwi_change.mean if water_signal.ndwi_change else None

    dynamics_summary = (
        f"Vegetation spectral dynamics show {dominant_veg_str}. "
        + (f"Water-signal dynamics show {dominant_water_str}. " if dominant_water_str else "NDWI dynamics unavailable. ")
        + f"Total valid analytical window: {evidence.data_quality.valid_pixel_count:,} pixels at {params.resolution}m resolution."
    )

    change_detection = ReportChangeDetection(
        analysis_window_pixels=evidence.data_quality.valid_pixel_count + evidence.data_quality.nodata_pixel_count,
        valid_pixels=evidence.data_quality.valid_pixel_count,
        nodata_pixels=evidence.data_quality.nodata_pixel_count,
        ndvi_mean_change=ndvi_change.mean,
        ndwi_mean_change=ndwi_mean_chg_val,
        dominant_vegetation_signal=dominant_veg_str,
        dominant_water_signal=dominant_water_str,
        dynamics_summary=dynamics_summary,
    )

    # 3.7 AI Earth Analyst Findings
    if ai_available and ai_analysis_data:
        ai_analysis = ReportAIAnalysis(
            available=True,
            provider="Gemini 3.8 Flash",
            summary=ai_analysis_data.get("summary"),
            key_findings=ai_analysis_data.get("key_findings", []),
            vegetation_assessment=ai_analysis_data.get("vegetation_assessment"),
            water_signal_assessment=ai_analysis_data.get("water_signal_assessment"),
            change_assessment=ai_analysis_data.get("change_assessment"),
            confidence_note=ai_analysis_data.get("confidence_note"),
            limitations=ai_analysis_data.get("limitations", []),
            disclaimer="AI interpretations are generated from verified statistical metrics and do not replace field validation.",
        )
    else:
        ai_analysis = ReportAIAnalysis(
            available=False,
            provider="Gemini 3.8 Flash",
            summary=ai_error_note or "AI Analyst interpretation unavailable for this report.",
            key_findings=[],
            vegetation_assessment=None,
            water_signal_assessment=None,
            change_assessment=None,
            confidence_note=None,
            limitations=["AI Earth Analyst service was unavailable during report generation; verified deterministic evidence is fully preserved."],
            disclaimer="AI Analyst was unavailable. Verified sensor metrics remain fully valid.",
        )

    # 3.8 Executive Summary
    acq_interval = f"{src_data.temporal_interval_days} days ({src_data.before_scene.acquisition_datetime[:10]} to {src_data.after_scene.acquisition_datetime[:10]})"
    analyzed_area = f"{params.window.get('width', 512)}x{params.window.get('height', 512)} pixels ({params.resolution}m spatial resolution, EPSG:{params.crs})"
    major_ndvi = f"Mean NDVI changed from {before_ndvi.mean:.4f} to {after_ndvi.mean:.4f} (Δ {ndvi_change.mean:+.4f})"
    major_ndwi = (
        f"Mean NDWI changed by Δ {ndwi_mean_chg_val:+.4f}"
        if ndwi_mean_chg_val is not None
        else "NDWI analysis not available"
    )
    dom_changes = f"Dominant Vegetation: {dominant_veg_str}" + (f" | Dominant Water-Signal: {dominant_water_str}" if dominant_water_str else "")

    measured_findings = [
        f"Sensor: Sentinel-2 L2A ({src_data.before_scene.scene_id} -> {src_data.after_scene.scene_id})",
        f"Tile: {acquisition.tile}, Spatial Resolution: {params.resolution}m, Window: {analyzed_area}",
        f"NDVI Change: Mean {ndvi_change.mean:+.4f}, Median {ndvi_change.median:+.4f}, Range [{ndvi_change.min:.4f}, {ndvi_change.max:.4f}]",
        f"NDVI Classification: {dominant_veg_str}",
    ]
    if water_signal.available and water_signal.ndwi_change:
        measured_findings.append(
            f"NDWI Change: Mean {water_signal.ndwi_change.mean:+.4f}, Median {water_signal.ndwi_change.median:+.4f}, Range [{water_signal.ndwi_change.min:.4f}, {water_signal.ndwi_change.max:.4f}]"
        )
        if dominant_water_str:
            measured_findings.append(f"NDWI Classification: {dominant_water_str}")

    measured_summary_block = (
        f"Measured:\n"
        f"- Acquisition Interval: {acq_interval}\n"
        f"- Analyzed Area: {analyzed_area}\n"
        f"- NDVI Result: {major_ndvi}\n"
        f"- NDWI Result: {major_ndwi}\n"
        f"- Dominant Classifications: {dom_changes}\n"
        f"- Valid Pixel Count: {evidence.data_quality.valid_pixel_count:,} ({evidence.data_quality.nodata_pixel_count} nodata)"
    )

    ai_summary_block = (
        f"AI interpretation:\n{ai_analysis.summary}"
        if ai_analysis.available and ai_analysis.summary
        else f"AI interpretation:\n{ai_analysis.summary or 'AI Analyst unavailable.'}"
    )

    full_summary_text = f"{measured_summary_block}\n\n{ai_summary_block}"

    executive_summary = ReportExecutiveSummary(
        acquisition_interval=acq_interval,
        analyzed_area=analyzed_area,
        major_measured_ndvi=major_ndvi,
        major_measured_ndwi=major_ndwi,
        dominant_change_classifications=dom_changes,
        measured_findings=measured_findings,
        ai_interpretation=ai_analysis.summary if ai_analysis.available else None,
        summary_text=full_summary_text,
    )

    # 3.9 Data Quality
    data_quality = ReportDataQuality(
        valid_pixels=evidence.data_quality.valid_pixel_count,
        nodata_pixels=evidence.data_quality.nodata_pixel_count,
        cloud_cover_before=evidence.data_quality.cloud_cover_before,
        cloud_cover_after=evidence.data_quality.cloud_cover_after,
        methodology={
            "NDVI": "(B08 - B04) / (B08 + B04)",
            "NDWI": "(B03 - B08) / (B03 + B08)",
            "Change": "After - Before",
            "Resolution": f"{params.resolution}m Analytical Grid",
            "Threshold_Rule": "Classification thresholds are analytical rules and are not machine-learning predictions or ground-truth land-cover labels."
        },
        limitations=evidence.data_quality.limitations,
    )

    # 3.10 Technical Metadata
    technical_metadata = ReportTechnicalMetadata(
        sensor="Copernicus Sentinel-2 MultiSpectral Instrument (MSI) Level-2A",
        crs=str(params.crs),
        spatial_resolution=f"{params.resolution}m per pixel",
        tile=acquisition.tile,
        coordinate_reference_system=str(params.crs),
        analysis_engine="EarthWatch Analysis Core v1.0",
        stac_catalog="Copernicus Data Space STAC API",
    )

    # 4. Final Assemble & Validate
    report = EarthObservationReport(
        metadata=metadata,
        executive_summary=executive_summary,
        acquisition=acquisition,
        methodology=methodology,
        vegetation=vegetation,
        water_signal=water_signal,
        change_detection=change_detection,
        ai_analysis=ai_analysis,
        data_quality=data_quality,
        technical_metadata=technical_metadata,
    )

    return {
        "status": "success",
        "report": report.model_dump()
    }
