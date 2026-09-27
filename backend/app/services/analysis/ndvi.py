import numpy as np
from typing import Dict, Any
from app.services.raster.service import inspect_raster_window

async def calculate_ndvi(scene_id: str, x: int, y: int, width: int, height: int) -> Dict[str, Any]:
    # 1. Fetch B04 (Red)
    b04_resp = await inspect_raster_window(scene_id, "B04", x, y, width, height, return_data=True)
    if b04_resp.get("status") != "success":
        return b04_resp

    # 2. Fetch B08 (NIR)
    b08_resp = await inspect_raster_window(scene_id, "B08", x, y, width, height, return_data=True)
    if b08_resp.get("status") != "success":
        return b08_resp

    b04_data = b04_resp.get("data")
    b08_data = b08_resp.get("data")

    if b04_data is None or b08_data is None:
        return {"status": "error", "message": "Failed to retrieve raster arrays."}

    if b04_data.shape != b08_data.shape:
        return {"status": "error", "message": "Dimension mismatch between B04 and B08."}

    # 3. Convert to float
    red = b04_data.astype(np.float32)
    nir = b08_data.astype(np.float32)

    # 4. Handle division by zero
    denominator = nir + red
    
    # Supress numpy warnings for division by zero
    with np.errstate(divide='ignore', invalid='ignore'):
        ndvi = np.where(denominator == 0, np.nan, (nir - red) / denominator)

    # 5. Calculate statistics
    valid_pixels = ~np.isnan(ndvi)
    valid_data = ndvi[valid_pixels]
    
    if len(valid_data) == 0:
        return {"status": "error", "message": "No valid data to calculate NDVI."}

    min_val = float(np.min(valid_data))
    max_val = float(np.max(valid_data))
    mean_val = float(np.mean(valid_data))
    median_val = float(np.median(valid_data))

    valid_count = int(np.sum(valid_pixels))
    nodata_count = int(np.sum(~valid_pixels))

    # 6. Classification counts
    water_bare = int(np.sum(valid_data < 0.2))
    sparse = int(np.sum((valid_data >= 0.2) & (valid_data < 0.4)))
    moderate = int(np.sum((valid_data >= 0.4) & (valid_data < 0.6)))
    dense = int(np.sum(valid_data >= 0.6))

    import base64
    matrix_b64 = base64.b64encode(ndvi.astype(np.float32).tobytes()).decode('ascii')

    return {
        "status": "success",
        "scene_id": scene_id,
        "min": min_val,
        "max": max_val,
        "mean": mean_val,
        "median": median_val,
        "valid_pixel_count": valid_count,
        "nodata_pixel_count": nodata_count,
        "width": width,
        "height": height,
        "resolution": b08_resp.get("resolution"),
        "crs": b08_resp.get("crs"),
        "water_or_bare_count": water_bare,
        "sparse_vegetation_count": sparse,
        "moderate_vegetation_count": moderate,
        "dense_vegetation_count": dense,
        "matrix_b64": matrix_b64
    }
