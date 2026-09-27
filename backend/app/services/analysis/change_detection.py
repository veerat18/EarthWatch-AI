import numpy as np
import base64
from typing import Dict, Any
from app.services.raster.service import inspect_raster_window
from datetime import datetime

def parse_scene_date(scene_id: str) -> datetime:
    # Scene ID format: S2A_MSIL2A_20260105T053251_...
    # The date is the 3rd part split by _
    parts = scene_id.split('_')
    if len(parts) > 2:
        try:
            return datetime.strptime(parts[2], "%Y%m%dT%H%M%S")
        except ValueError:
            pass
    return datetime.now()

async def calculate_change_detection(before_scene_id: str, after_scene_id: str, x: int, y: int, width: int, height: int) -> Dict[str, Any]:
    if before_scene_id == after_scene_id:
        return {"status": "error", "message": "BEFORE and AFTER scenes must be different."}

    d_before = parse_scene_date(before_scene_id)
    d_after = parse_scene_date(after_scene_id)
    
    if d_before >= d_after:
        return {"status": "error", "message": "BEFORE scene must be earlier than AFTER scene."}

    # Helper function to get ndvi arrays
    async def get_ndvi_array(scene_id):
        b04_resp = await inspect_raster_window(scene_id, "B04", x, y, width, height, return_data=True)
        if b04_resp.get("status") != "success":
            return None, b04_resp
        
        b08_resp = await inspect_raster_window(scene_id, "B08", x, y, width, height, return_data=True)
        if b08_resp.get("status") != "success":
            return None, b08_resp
        
        b04 = b04_resp.get("data")
        b08 = b08_resp.get("data")
        
        if b04 is None or b08 is None:
            return None, {"status": "error", "message": "Failed to retrieve raster data."}
            
        if b04.shape != b08.shape:
            return None, {"status": "error", "message": f"Dimension mismatch in scene {scene_id}."}
            
        red = b04.astype(np.float32)
        nir = b08.astype(np.float32)
        
        with np.errstate(divide='ignore', invalid='ignore'):
            ndvi = np.where((nir + red) == 0, np.nan, (nir - red) / (nir + red))
            
        return {
            "ndvi": ndvi,
            "crs": b08_resp.get("crs"),
            "resolution": b08_resp.get("resolution"),
            "transform": b08_resp.get("transform"),
            "shape": ndvi.shape
        }, None

    before_data, before_err = await get_ndvi_array(before_scene_id)
    if before_err:
        return before_err
        
    after_data, after_err = await get_ndvi_array(after_scene_id)
    if after_err:
        return after_err

    # Validation of CRS / resolution / dimensions
    if before_data["crs"] != after_data["crs"]:
        return {"status": "error", "message": "Incompatible CRS between scenes."}
    
    if before_data["resolution"] != after_data["resolution"]:
        return {"status": "error", "message": "Incompatible resolution between scenes."}
        
    if before_data["shape"] != after_data["shape"]:
        return {"status": "error", "message": "Incompatible dimensions between scenes."}

    ndvi_before = before_data["ndvi"]
    ndvi_after = after_data["ndvi"]
    
    ndvi_change = ndvi_after - ndvi_before
    
    def get_stats(arr):
        valid = ~np.isnan(arr)
        valid_data = arr[valid]
        if len(valid_data) == 0:
            return {
                "min": 0.0, "max": 0.0, "mean": 0.0, "median": 0.0,
                "valid_pixel_count": 0, "nodata_pixel_count": int(np.sum(~valid))
            }
        return {
            "min": float(np.min(valid_data)),
            "max": float(np.max(valid_data)),
            "mean": float(np.mean(valid_data)),
            "median": float(np.median(valid_data)),
            "valid_pixel_count": int(np.sum(valid)),
            "nodata_pixel_count": int(np.sum(~valid))
        }

    stats_before = get_stats(ndvi_before)
    stats_after = get_stats(ndvi_after)
    stats_change = get_stats(ndvi_change)
    
    if stats_change["valid_pixel_count"] == 0:
        return {"status": "error", "message": "No valid data to calculate change."}

    # Classification counts
    valid_change = ndvi_change[~np.isnan(ndvi_change)]
    sig_loss = int(np.sum(valid_change <= -0.20))
    mod_loss = int(np.sum((valid_change > -0.20) & (valid_change <= -0.05)))
    stable = int(np.sum((valid_change > -0.05) & (valid_change < 0.05)))
    mod_gain = int(np.sum((valid_change >= 0.05) & (valid_change < 0.20)))
    sig_gain = int(np.sum(valid_change >= 0.20))
    
    matrix_b64 = base64.b64encode(ndvi_change.astype(np.float32).tobytes()).decode('ascii')

    return {
        "status": "success",
        "before_scene_id": before_scene_id,
        "after_scene_id": after_scene_id,
        "width": width,
        "height": height,
        "resolution": before_data["resolution"],
        "crs": before_data["crs"],
        "ndvi_before": stats_before,
        "ndvi_after": stats_after,
        "ndvi_change": stats_change,
        "significant_loss_count": sig_loss,
        "moderate_loss_count": mod_loss,
        "stable_count": stable,
        "moderate_gain_count": mod_gain,
        "significant_gain_count": sig_gain,
        "matrix_b64": matrix_b64
    }
