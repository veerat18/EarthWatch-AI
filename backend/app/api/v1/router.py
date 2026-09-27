from fastapi import APIRouter
from app.api.v1.endpoints import health, satellite, raster, analysis, reports

api_router = APIRouter()
api_router.include_router(health.router, tags=["health"])
api_router.include_router(satellite.router, tags=["satellite"])
api_router.include_router(raster.router, tags=["raster"])
api_router.include_router(analysis.router, tags=["analysis"])
api_router.include_router(reports.router, tags=["reports"])
