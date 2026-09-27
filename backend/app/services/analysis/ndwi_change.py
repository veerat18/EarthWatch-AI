import base64
import re
from datetime import datetime
from typing import Dict, Any, Optional, Tuple
import numpy as np

from app.services.raster.service import inspect_raster_window
from app.services.analysis.ndwi import compute_ndwi


def parse_scene_date(scene_id: str) -> datetime:
    """
    Parses acquisition datetime from Sentinel-2 scene ID.
    Format: S2A_MSIL2A_20260105T053251_...
    """
    parts = scene_id.split("_")
    if len(parts) > 2:
        try:
            return datetime.strptime(parts[2], "%Y%m%dT%H%M%S")
        except ValueError:
            pass
    return datetime.min


def extract_tile(scene_id: str) -> Optional[str]:
    """
    Extracts MGRS tile from Sentinel-2 scene ID (e.g. T43RGN).
    """
    parts = scene_id.split("_")
    for part in parts:
        if re.match(r"^T\d{2}[A-Z]{3}$", part):
            return part
    return None


def is_sentinel2_l2a(scene_id: str) -> bool:
    """
    Validates that scene is Sentinel-2 L2A.
    """
    s = scene_id.upper()
    return (s.startswith("S2A") or s.startswith("S2B")) and ("MSIL2A" in s or "L2A" in s)


def calculate_stats(arr: np.ndarray) -> Dict[str, Any]:
    """
    Calculates summary statistics for a 2D float array safely handling NaNs.
    """
    valid_mask = ~np.isnan(arr)
    valid_data = arr[valid_mask]
    nodata_count = int(np.sum(~valid_mask))

    if len(valid_data) == 0:
        return {
            "min": 0.0,
            "max": 0.0,
            "mean": 0.0,
            "median": 0.0,
            "valid_pixel_count": 0,
            "nodata_pixel_count": nodata_count,
        }

    return {
        "min": float(np.min(valid_data)),
        "max": float(np.max(valid_data)),
        "mean": float(np.mean(valid_data)),
        "median": float(np.median(valid_data)),
        "valid_pixel_count": int(np.sum(valid_mask)),
        "nodata_pixel_count": nodata_count,
    }


def classify_ndwi_change(change_arr: np.ndarray) -> Dict[str, Any]:
    """
    Analytical water-signal change classification thresholds:
    - SIGNIFICANT WATER-SIGNAL LOSS: change <= -0.20
    - MODERATE WATER-SIGNAL LOSS: -0.20 < change <= -0.05
    - STABLE: -0.05 < change < +0.05
    - MODERATE WATER-SIGNAL GAIN: +0.05 <= change < +0.20
    - SIGNIFICANT WATER-SIGNAL GAIN: change >= +0.20

    Guarantees count conservation:
    sig_loss + mod_loss + stable + mod_gain + sig_gain == valid_pixel_count
    """
    valid_mask = ~np.isnan(change_arr)
    valid_change = change_arr[valid_mask]
    valid_count = len(valid_change)

    if valid_count == 0:
        return {
            "significant_loss_count": 0,
            "significant_loss_percentage": 0.0,
            "moderate_loss_count": 0,
            "moderate_loss_percentage": 0.0,
            "stable_count": 0,
            "stable_percentage": 0.0,
            "moderate_gain_count": 0,
            "moderate_gain_percentage": 0.0,
            "significant_gain_count": 0,
            "significant_gain_percentage": 0.0,
            "classification": {
                "significant_loss": {
                    "count": 0,
                    "percentage": 0.0,
                    "description": "Significant water-signal loss (change <= -0.20)",
                },
                "moderate_loss": {
                    "count": 0,
                    "percentage": 0.0,
                    "description": "Moderate water-signal loss (-0.20 < change <= -0.05)",
                },
                "stable": {
                    "count": 0,
                    "percentage": 0.0,
                    "description": "Stable water-signal (-0.05 < change < +0.05)",
                },
                "moderate_gain": {
                    "count": 0,
                    "percentage": 0.0,
                    "description": "Moderate water-signal gain (+0.05 <= change < +0.20)",
                },
                "significant_gain": {
                    "count": 0,
                    "percentage": 0.0,
                    "description": "Significant water-signal gain (change >= +0.20)",
                },
            },
        }

    sig_loss = int(np.sum(valid_change <= -0.20))
    mod_loss = int(np.sum((valid_change > -0.20) & (valid_change <= -0.05)))
    stable = int(np.sum((valid_change > -0.05) & (valid_change < 0.05)))
    mod_gain = int(np.sum((valid_change >= 0.05) & (valid_change < 0.20)))
    sig_gain = int(np.sum(valid_change >= 0.20))

    sig_loss_pct = round((sig_loss / valid_count) * 100.0, 2)
    mod_loss_pct = round((mod_loss / valid_count) * 100.0, 2)
    stable_pct = round((stable / valid_count) * 100.0, 2)
    mod_gain_pct = round((mod_gain / valid_count) * 100.0, 2)
    sig_gain_pct = round((sig_gain / valid_count) * 100.0, 2)

    return {
        "significant_loss_count": sig_loss,
        "significant_loss_percentage": sig_loss_pct,
        "moderate_loss_count": mod_loss,
        "moderate_loss_percentage": mod_loss_pct,
        "stable_count": stable,
        "stable_percentage": stable_pct,
        "moderate_gain_count": mod_gain,
        "moderate_gain_percentage": mod_gain_pct,
        "significant_gain_count": sig_gain,
        "significant_gain_percentage": sig_gain_pct,
        "classification": {
            "significant_loss": {
                "count": sig_loss,
                "percentage": sig_loss_pct,
                "description": "Significant water-signal loss (change <= -0.20)",
            },
            "moderate_loss": {
                "count": mod_loss,
                "percentage": mod_loss_pct,
                "description": "Moderate water-signal loss (-0.20 < change <= -0.05)",
            },
            "stable": {
                "count": stable,
                "percentage": stable_pct,
                "description": "Stable water-signal (-0.05 < change < +0.05)",
            },
            "moderate_gain": {
                "count": mod_gain,
                "percentage": mod_gain_pct,
                "description": "Moderate water-signal gain (+0.05 <= change < +0.20)",
            },
            "significant_gain": {
                "count": sig_gain,
                "percentage": sig_gain_pct,
                "description": "Significant water-signal gain (change >= +0.20)",
            },
        },
    }


async def calculate_ndwi_change_detection(
    before_scene_id: str,
    after_scene_id: str,
    x: int,
    y: int,
    width: int,
    height: int,
) -> Dict[str, Any]:
    """
    Calculates NDWI change detection between two verified Sentinel-2 L2A scenes:
    NDWI_CHANGE = NDWI_AFTER - NDWI_BEFORE
    """
    # 0. Basic parameter validation
    if not before_scene_id or not after_scene_id:
        return {"status": "error", "message": "Both before_scene_id and after_scene_id are required."}

    if before_scene_id == after_scene_id:
        return {"status": "error", "message": "BEFORE and AFTER scenes must be different."}

    if width <= 0 or height <= 0 or width > 2048 or height > 2048 or x < 0 or y < 0:
        return {"status": "error", "message": "Window parameters out of allowed bounds (max 2048x2048)."}

    # 1. Sentinel-2 L2A source validation
    if not is_sentinel2_l2a(before_scene_id) or not is_sentinel2_l2a(after_scene_id):
        return {"status": "error", "message": "Both scenes must be Sentinel-2 L2A."}

    # 2. Tile compatibility validation
    before_tile = extract_tile(before_scene_id)
    after_tile = extract_tile(after_scene_id)
    if before_tile and after_tile and before_tile != after_tile:
        return {
            "status": "error",
            "message": f"Incompatible scenes: MGRS tiles do not match ({before_tile} vs {after_tile}).",
        }

    # 3. Temporal order validation
    d_before = parse_scene_date(before_scene_id)
    d_after = parse_scene_date(after_scene_id)
    if d_before >= d_after:
        return {"status": "error", "message": "BEFORE scene must be earlier than AFTER scene."}

    # Helper function to read B03 and B08 and calculate NDWI
    async def get_scene_ndwi(scene_id: str) -> Tuple[Optional[Dict[str, Any]], Optional[Dict[str, Any]]]:
        b03_resp = await inspect_raster_window(scene_id, "B03", x, y, width, height, return_data=True)
        if b03_resp.get("status") != "success":
            return None, b03_resp

        b08_resp = await inspect_raster_window(scene_id, "B08", x, y, width, height, return_data=True)
        if b08_resp.get("status") != "success":
            return None, b08_resp

        b03 = b03_resp.get("data")
        b08 = b08_resp.get("data")

        if b03 is None or b08 is None:
            return None, {"status": "error", "message": f"Failed to retrieve raster data for {scene_id}."}

        if b03.shape != b08.shape:
            return None, {"status": "error", "message": f"Dimension mismatch between B03 and B08 in {scene_id}."}

        ndwi = compute_ndwi(b03, b08)
        return {
            "ndwi": ndwi,
            "crs": b08_resp.get("crs") or b03_resp.get("crs"),
            "resolution": b08_resp.get("resolution") or b03_resp.get("resolution"),
            "shape": ndwi.shape,
        }, None

    # 4. Fetch and calculate for BEFORE scene
    before_data, before_err = await get_scene_ndwi(before_scene_id)
    if before_err:
        return before_err

    # 5. Fetch and calculate for AFTER scene
    after_data, after_err = await get_scene_ndwi(after_scene_id)
    if after_err:
        return after_err

    # 6. Spatial and raster metadata compatibility check
    if before_data["crs"] != after_data["crs"]:
        return {"status": "error", "message": "Incompatible CRS between scenes."}

    if before_data["resolution"] != after_data["resolution"]:
        return {"status": "error", "message": "Incompatible resolution between scenes."}

    if before_data["shape"] != after_data["shape"]:
        return {"status": "error", "message": "Incompatible dimensions between scenes."}

    # 7. Compute change = NDWI_after - NDWI_before
    ndwi_before = before_data["ndwi"]
    ndwi_after = after_data["ndwi"]
    ndwi_change = ndwi_after - ndwi_before

    # 8. Compute statistics
    stats_before = calculate_stats(ndwi_before)
    stats_after = calculate_stats(ndwi_after)
    stats_change = calculate_stats(ndwi_change)

    if stats_change["valid_pixel_count"] == 0:
        return {"status": "error", "message": "No valid data to calculate NDWI change."}

    # 9. Classify change
    class_results = classify_ndwi_change(ndwi_change)

    # 10. Encode change matrix as Base64 Float32
    matrix_b64 = base64.b64encode(ndwi_change.astype(np.float32).tobytes()).decode("ascii")

    # 11. Compile metadata
    tile = before_tile or after_tile or "Unknown"
    metadata = {
        "before_scene_id": before_scene_id,
        "after_scene_id": after_scene_id,
        "before_acquisition": d_before.isoformat() if d_before != datetime.min else None,
        "after_acquisition": d_after.isoformat() if d_after != datetime.min else None,
        "tile": tile,
        "crs": before_data["crs"],
        "resolution": before_data["resolution"],
        "x": x,
        "y": y,
        "width": width,
        "height": height,
    }

    return {
        "status": "success",
        "before_scene_id": before_scene_id,
        "after_scene_id": after_scene_id,
        "width": width,
        "height": height,
        "resolution": before_data["resolution"],
        "crs": before_data["crs"],
        "before": stats_before,
        "after": stats_after,
        "change": stats_change,
        "metadata": metadata,
        "matrix_b64": matrix_b64,
        **class_results,
    }
