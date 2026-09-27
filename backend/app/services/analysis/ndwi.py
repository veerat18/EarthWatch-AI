import base64
import numpy as np
from typing import Dict, Any
from app.services.raster.service import inspect_raster_window


def compute_ndwi(green: np.ndarray, nir: np.ndarray) -> np.ndarray:
    """
    Calculates NDWI = (B03 - B08) / (B03 + B08)
    Safely handles division by zero and nodata as NaN.
    """
    green_f = green.astype(np.float32)
    nir_f = nir.astype(np.float32)
    denominator = green_f + nir_f

    with np.errstate(divide="ignore", invalid="ignore"):
        ndwi = np.where(denominator == 0, np.nan, (green_f - nir_f) / denominator)
    return ndwi


def classify_water_signals(ndwi: np.ndarray) -> Dict[str, Any]:
    """
    Analytical water classification thresholds:
    - NDWI < 0.0: NON-WATER / LOW WATER SIGNAL
    - 0.0 <= NDWI < 0.2: LOW WATER SIGNAL
    - 0.2 <= NDWI < 0.4: MODERATE WATER SIGNAL
    - NDWI >= 0.4: HIGH WATER SIGNAL

    Returns dictionary containing statistics and analytical classification breakdowns.
    Note: These thresholds are analytical signals and do not represent absolute land-cover determinations.
    """
    valid_mask = ~np.isnan(ndwi)
    valid_pixels = ndwi[valid_mask]
    valid_count = int(np.sum(valid_mask))
    nodata_count = int(np.sum(~valid_mask))

    if valid_count == 0:
        return {
            "valid_pixel_count": 0,
            "nodata_pixel_count": nodata_count,
            "min": 0.0,
            "max": 0.0,
            "mean": 0.0,
            "median": 0.0,
            "non_water_or_low_signal_count": 0,
            "non_water_or_low_signal_percentage": 0.0,
            "low_water_signal_count": 0,
            "low_water_signal_percentage": 0.0,
            "moderate_water_signal_count": 0,
            "moderate_water_signal_percentage": 0.0,
            "high_water_signal_count": 0,
            "high_water_signal_percentage": 0.0,
            "classifications": {
                "non_water_or_low_signal": {
                    "count": 0,
                    "percentage": 0.0,
                    "description": "NON-WATER / LOW WATER SIGNAL (< 0.0)",
                },
                "low_water_signal": {
                    "count": 0,
                    "percentage": 0.0,
                    "description": "LOW WATER SIGNAL (0.0 to 0.2)",
                },
                "moderate_water_signal": {
                    "count": 0,
                    "percentage": 0.0,
                    "description": "MODERATE WATER SIGNAL (0.2 to 0.4)",
                },
                "high_water_signal": {
                    "count": 0,
                    "percentage": 0.0,
                    "description": "HIGH WATER SIGNAL (>= 0.4)",
                },
            },
        }

    min_val = float(np.min(valid_pixels))
    max_val = float(np.max(valid_pixels))
    mean_val = float(np.mean(valid_pixels))
    median_val = float(np.median(valid_pixels))

    non_water = int(np.sum(valid_pixels < 0.0))
    low_water = int(np.sum((valid_pixels >= 0.0) & (valid_pixels < 0.2)))
    moderate_water = int(np.sum((valid_pixels >= 0.2) & (valid_pixels < 0.4)))
    high_water = int(np.sum(valid_pixels >= 0.4))

    non_water_pct = round((non_water / valid_count) * 100.0, 2)
    low_water_pct = round((low_water / valid_count) * 100.0, 2)
    moderate_water_pct = round((moderate_water / valid_count) * 100.0, 2)
    high_water_pct = round((high_water / valid_count) * 100.0, 2)

    return {
        "valid_pixel_count": valid_count,
        "nodata_pixel_count": nodata_count,
        "min": min_val,
        "max": max_val,
        "mean": mean_val,
        "median": median_val,
        "non_water_or_low_signal_count": non_water,
        "non_water_or_low_signal_percentage": non_water_pct,
        "low_water_signal_count": low_water,
        "low_water_signal_percentage": low_water_pct,
        "moderate_water_signal_count": moderate_water,
        "moderate_water_signal_percentage": moderate_water_pct,
        "high_water_signal_count": high_water,
        "high_water_signal_percentage": high_water_pct,
        "classifications": {
            "non_water_or_low_signal": {
                "count": non_water,
                "percentage": non_water_pct,
                "description": "NON-WATER / LOW WATER SIGNAL (< 0.0)",
            },
            "low_water_signal": {
                "count": low_water,
                "percentage": low_water_pct,
                "description": "LOW WATER SIGNAL (0.0 to 0.2)",
            },
            "moderate_water_signal": {
                "count": moderate_water,
                "percentage": moderate_water_pct,
                "description": "MODERATE WATER SIGNAL (0.2 to 0.4)",
            },
            "high_water_signal": {
                "count": high_water,
                "percentage": high_water_pct,
                "description": "HIGH WATER SIGNAL (>= 0.4)",
            },
        },
    }


async def calculate_ndwi(
    scene_id: str, x: int, y: int, width: int, height: int
) -> Dict[str, Any]:
    """
    Calculates NDWI for a specified window in a Sentinel-2 scene.
    Reuses existing authenticated raster service without downloading full product.
    """
    # 0. Input validation
    if not scene_id or not isinstance(scene_id, str):
        return {"status": "error", "message": "Invalid scene_id."}

    if not (
        scene_id.startswith("S2A")
        or scene_id.startswith("S2B")
        or "sentinel-2" in scene_id.lower()
    ):
        return {
            "status": "error",
            "message": "Only Sentinel-2 scenes are supported for NDWI analysis.",
        }

    if width <= 0 or height <= 0 or width > 2048 or height > 2048 or x < 0 or y < 0:
        return {
            "status": "error",
            "message": "Window parameters out of allowed bounds (max 2048x2048).",
        }

    # 1. Fetch B03 (Green)
    b03_resp = await inspect_raster_window(
        scene_id, "B03", x, y, width, height, return_data=True
    )
    if b03_resp.get("status") != "success":
        return b03_resp

    # 2. Fetch B08 (NIR)
    b08_resp = await inspect_raster_window(
        scene_id, "B08", x, y, width, height, return_data=True
    )
    if b08_resp.get("status") != "success":
        return b08_resp

    b03_data = b03_resp.get("data")
    b08_data = b08_resp.get("data")

    if b03_data is None or b08_data is None:
        return {
            "status": "error",
            "message": "Failed to retrieve raster arrays for B03/B08.",
        }

    if b03_data.shape != b08_data.shape:
        return {
            "status": "error",
            "message": "Dimension mismatch between B03 and B08.",
        }

    # 3. Compute NDWI = (B03 - B08) / (B03 + B08)
    ndwi = compute_ndwi(b03_data, b08_data)

    # 4. Classify and calculate statistics
    stats = classify_water_signals(ndwi)
    if stats["valid_pixel_count"] == 0:
        return {"status": "error", "message": "No valid data to calculate NDWI."}

    # 5. Compact Base64 Float32 matrix
    matrix_b64 = base64.b64encode(ndwi.astype(np.float32).tobytes()).decode("ascii")

    return {
        "status": "success",
        "scene_id": scene_id,
        "width": width,
        "height": height,
        "resolution": b08_resp.get("resolution") or b03_resp.get("resolution"),
        "crs": b08_resp.get("crs") or b03_resp.get("crs"),
        "matrix_b64": matrix_b64,
        **stats,
    }
