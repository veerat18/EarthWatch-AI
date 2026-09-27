import json
from typing import Any, Dict, Optional


def _bbox_to_polygon(min_lon: float, min_lat: float, max_lon: float, max_lat: float) -> Dict[str, Any]:
    """Helper to convert bounding box to a standard GeoJSON Polygon."""
    return {
        "type": "Polygon",
        "coordinates": [[
            [min_lon, min_lat],
            [max_lon, min_lat],
            [max_lon, max_lat],
            [min_lon, max_lat],
            [min_lon, min_lat]
        ]]
    }


# Supported development locations with real approximate bounding polygons
SUPPORTED_DEVELOPMENT_LOCATIONS: Dict[str, Dict[str, Any]] = {
    "delhi": _bbox_to_polygon(76.90, 28.45, 77.35, 28.85),
    "mumbai": _bbox_to_polygon(72.75, 18.88, 73.05, 19.30),
    "bhadohi": _bbox_to_polygon(82.40, 25.30, 82.75, 25.55),
    "san francisco bay area": _bbox_to_polygon(-122.55, 37.60, -122.15, 37.95),
}


class AOIValidationError(ValueError):
    """Raised when an AOI or location cannot be validated or resolved."""
    pass


def resolve_aoi_geometry(location_str: str, geojson_aoi: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    """
    Resolves an AOI geometry from either a supported development location or a GeoJSON AOI.
    
    If location is neither a supported development location nor valid GeoJSON,
    raises AOIValidationError with:
    'Location must be a supported development location or a GeoJSON AOI.'
    """
    # 1. Check if explicit GeoJSON AOI was passed
    if geojson_aoi and isinstance(geojson_aoi, dict):
        if "type" in geojson_aoi and "coordinates" in geojson_aoi:
            return geojson_aoi
        if geojson_aoi.get("type") == "Feature" and "geometry" in geojson_aoi:
            return geojson_aoi["geometry"]

    if not location_str or not isinstance(location_str, str):
        raise AOIValidationError("Location must be a supported development location or a GeoJSON AOI.")

    clean_loc = location_str.strip()

    # 2. Check if string itself is valid GeoJSON geometry JSON
    if clean_loc.startswith("{") and clean_loc.endswith("}"):
        try:
            parsed = json.loads(clean_loc)
            if isinstance(parsed, dict):
                if "type" in parsed and "coordinates" in parsed:
                    return parsed
                if parsed.get("type") == "Feature" and "geometry" in parsed:
                    return parsed["geometry"]
        except Exception:
            pass

    # 3. Check against supported development locations
    norm_key = clean_loc.lower()
    if norm_key in SUPPORTED_DEVELOPMENT_LOCATIONS:
        return SUPPORTED_DEVELOPMENT_LOCATIONS[norm_key]

    # Handle common aliases
    aliases = {
        "sf": "san francisco bay area",
        "san francisco": "san francisco bay area",
        "sf bay area": "san francisco bay area",
        "new delhi": "delhi",
    }
    if norm_key in aliases and aliases[norm_key] in SUPPORTED_DEVELOPMENT_LOCATIONS:
        return SUPPORTED_DEVELOPMENT_LOCATIONS[aliases[norm_key]]

    raise AOIValidationError("Location must be a supported development location or a GeoJSON AOI.")
