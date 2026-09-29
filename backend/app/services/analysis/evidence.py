from datetime import datetime
from typing import Dict, Any
from app.services.satellite.sentinel2 import Sentinel2Provider
from app.services.analysis.change_detection import calculate_change_detection
from app.services.analysis.ndwi import calculate_ndwi
from app.services.analysis.ndwi_change import calculate_ndwi_change_detection, extract_tile


async def generate_analysis_evidence(request_data: dict) -> Dict[str, Any]:
    before_scene_id = request_data.get("before_scene_id")
    after_scene_id = request_data.get("after_scene_id")
    x = request_data.get("x", 0)
    y = request_data.get("y", 0)
    width = request_data.get("width", 512)
    height = request_data.get("height", 512)

    # 1. Validate scenes & Fetch metadata
    stac_service = Sentinel2Provider()
    before_meta = await stac_service.get_scene_metadata(before_scene_id)
    if before_meta.get("status") != "success":
        return before_meta

    after_meta = await stac_service.get_scene_metadata(after_scene_id)
    if after_meta.get("status") != "success":
        return after_meta

    # Calculate temporal interval
    try:
        d1 = datetime.fromisoformat(before_meta["acquisition_datetime"].replace("Z", "+00:00"))
        d2 = datetime.fromisoformat(after_meta["acquisition_datetime"].replace("Z", "+00:00"))
        interval_days = round(abs((d2 - d1).total_seconds()) / 86400)
    except Exception:
        interval_days = 0

    # 2. Run Verified NDVI Change Detection
    change_result = await calculate_change_detection(
        before_scene_id, after_scene_id, x, y, width, height
    )
    if change_result.get("status") != "success":
        return change_result

    # 3. Build NDVI Evidence Objects
    valid_pixels = change_result["ndvi_change"]["valid_pixel_count"]

    def calc_pct(count):
        if valid_pixels == 0:
            return 0.0
        return round((count / valid_pixels) * 100, 2)

    limitations = [
        "NDVI change represents spectral vegetation-index change within the analyzed raster window.",
        "NDWI change represents spectral water-signal difference between the two acquisitions; it is not confirmed physical water delineation.",
        "Classification thresholds are analytical rules, not machine-learning predictions.",
        "Results are limited to the selected spatial window and acquisition dates.",
        "Atmospheric variations, soil moisture, shadows, and seasonal conditions can affect spectral reflectance.",
    ]

    # 4. Optional NDWI single-scene analysis
    ndwi_evidence = None
    try:
        ndwi_resp = await calculate_ndwi(after_scene_id, x, y, width, height)
        if ndwi_resp.get("status") == "success":
            ndwi_evidence = {
                "scene": {
                    "scene_id": after_meta["scene_id"],
                    "acquisition": after_meta["acquisition_datetime"],
                    "cloud_cover": after_meta["cloud_cover"],
                    "tile": after_meta.get("tile"),
                    "source": "Copernicus Sentinel-2 L2A",
                },
                "parameters": {
                    "formula": "(B03 - B08) / (B03 + B08)",
                    "band_green": "B03",
                    "band_nir": "B08",
                    "window": {"x": x, "y": y, "width": width, "height": height},
                    "resolution": ndwi_resp.get("resolution") or 10,
                    "crs": ndwi_resp.get("crs") or "EPSG:32643",
                },
                "measurements": {
                    "min": ndwi_resp["min"],
                    "max": ndwi_resp["max"],
                    "mean": ndwi_resp["mean"],
                    "median": ndwi_resp["median"],
                    "valid_pixel_count": ndwi_resp["valid_pixel_count"],
                    "nodata_pixel_count": ndwi_resp["nodata_pixel_count"],
                },
                "classifications": {
                    "non_water_low_signal": {
                        "count": ndwi_resp["non_water_or_low_signal_count"],
                        "percentage": ndwi_resp["non_water_or_low_signal_percentage"],
                    },
                    "low_water_signal": {
                        "count": ndwi_resp["low_water_signal_count"],
                        "percentage": ndwi_resp["low_water_signal_percentage"],
                    },
                    "moderate_water_signal": {
                        "count": ndwi_resp["moderate_water_signal_count"],
                        "percentage": ndwi_resp["moderate_water_signal_percentage"],
                    },
                    "high_water_signal": {
                        "count": ndwi_resp["high_water_signal_count"],
                        "percentage": ndwi_resp["high_water_signal_percentage"],
                    },
                },
            }
        else:
            limitations.append(f"NDWI single-scene analysis unavailable: {ndwi_resp.get('message', 'unknown')}")
    except Exception as exc:
        limitations.append(f"NDWI single-scene analysis omitted: {str(exc)}")

    # 5. Optional NDWI change-detection analysis
    ndwi_change_evidence = None
    try:
        ndwi_change_resp = await calculate_ndwi_change_detection(
            before_scene_id, after_scene_id, x, y, width, height
        )
        if ndwi_change_resp.get("status") == "success":
            ndwi_change_evidence = {
                "before": {
                    "scene_id": before_scene_id,
                    "acquisition": before_meta["acquisition_datetime"],
                    "measurements": ndwi_change_resp["before"],
                },
                "after": {
                    "scene_id": after_scene_id,
                    "acquisition": after_meta["acquisition_datetime"],
                    "measurements": ndwi_change_resp["after"],
                },
                "change": {
                    "min": ndwi_change_resp["change"]["min"],
                    "max": ndwi_change_resp["change"]["max"],
                    "mean": ndwi_change_resp["change"]["mean"],
                    "median": ndwi_change_resp["change"]["median"],
                    "valid_pixel_count": ndwi_change_resp["change"]["valid_pixel_count"],
                    "nodata_pixel_count": ndwi_change_resp["change"]["nodata_pixel_count"],
                },
                "classifications": {
                    "significant_loss": {
                        "count": ndwi_change_resp["significant_loss_count"],
                        "percentage": ndwi_change_resp["significant_loss_percentage"],
                    },
                    "moderate_loss": {
                        "count": ndwi_change_resp["moderate_loss_count"],
                        "percentage": ndwi_change_resp["moderate_loss_percentage"],
                    },
                    "stable": {
                        "count": ndwi_change_resp["stable_count"],
                        "percentage": ndwi_change_resp["stable_percentage"],
                    },
                    "moderate_gain": {
                        "count": ndwi_change_resp["moderate_gain_count"],
                        "percentage": ndwi_change_resp["moderate_gain_percentage"],
                    },
                    "significant_gain": {
                        "count": ndwi_change_resp["significant_gain_count"],
                        "percentage": ndwi_change_resp["significant_gain_percentage"],
                    },
                },
                "parameters": {
                    "change_formula": "NDWI_after - NDWI_before",
                    "thresholds": {
                        "significant_loss": "<= -0.20",
                        "moderate_loss": "-0.20 to -0.05",
                        "stable": "-0.05 to +0.05",
                        "moderate_gain": "+0.05 to +0.20",
                        "significant_gain": ">= +0.20",
                    },
                    "window": {"x": x, "y": y, "width": width, "height": height},
                    "resolution": ndwi_change_resp.get("resolution") or 10,
                    "crs": ndwi_change_resp.get("crs") or "EPSG:32643",
                },
            }
        else:
            limitations.append(f"NDWI change-detection analysis unavailable: {ndwi_change_resp.get('message', 'unknown')}")
    except Exception as exc:
        limitations.append(f"NDWI change-detection analysis omitted: {str(exc)}")

    evidence = {
        "status": "success",
        "source_data": {
            "before_scene": {
                "scene_id": before_meta["scene_id"],
                "acquisition_datetime": before_meta["acquisition_datetime"],
                "cloud_cover": before_meta["cloud_cover"],
                "satellite": before_meta.get("platform", "Sentinel-2"),
                "tile": before_meta.get("tile") or extract_tile(before_meta["scene_id"]),
            },
            "after_scene": {
                "scene_id": after_meta["scene_id"],
                "acquisition_datetime": after_meta["acquisition_datetime"],
                "cloud_cover": after_meta["cloud_cover"],
                "satellite": after_meta.get("platform", "Sentinel-2"),
                "tile": after_meta.get("tile") or extract_tile(after_meta["scene_id"]),
            },
            "temporal_interval_days": interval_days,
            "aoi_location": None,
        },
        "analysis_parameters": {
            "index": "NDVI",
            "formula": "(B08 - B04) / (B08 + B04)",
            "change_formula": "NDVI_after - NDVI_before",
            "window": {"x": x, "y": y, "width": width, "height": height},
            "resolution": change_result["resolution"],
            "crs": change_result["crs"],
        },
        "measurements": {
            "ndvi_before": change_result["ndvi_before"],
            "ndvi_after": change_result["ndvi_after"],
            "ndvi_change": change_result["ndvi_change"],
        },
        "classifications": {
            "significant_vegetation_loss": {
                "count": change_result["significant_loss_count"],
                "percentage": calc_pct(change_result["significant_loss_count"]),
            },
            "moderate_vegetation_loss": {
                "count": change_result["moderate_loss_count"],
                "percentage": calc_pct(change_result["moderate_loss_count"]),
            },
            "stable_low_change": {
                "count": change_result["stable_count"],
                "percentage": calc_pct(change_result["stable_count"]),
            },
            "moderate_vegetation_gain": {
                "count": change_result["moderate_gain_count"],
                "percentage": calc_pct(change_result["moderate_gain_count"]),
            },
            "significant_vegetation_gain": {
                "count": change_result["significant_gain_count"],
                "percentage": calc_pct(change_result["significant_gain_count"]),
            },
        },
        "data_quality": {
            "valid_pixel_count": valid_pixels,
            "nodata_pixel_count": change_result["ndvi_change"]["nodata_pixel_count"],
            "cloud_cover_before": before_meta["cloud_cover"],
            "cloud_cover_after": after_meta["cloud_cover"],
            "raster_resolution": change_result["resolution"],
            "crs": change_result["crs"],
            "analysis_window": f"{width}x{height}",
            "source_provider": "Copernicus Data Space Ecosystem",
            "limitations": limitations,
        },
        "ndwi": ndwi_evidence,
        "ndwi_change": ndwi_change_evidence,
    }

    return evidence
