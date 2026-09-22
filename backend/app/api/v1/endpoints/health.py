from fastapi import APIRouter
from app.schemas.health import HealthResponse

router = APIRouter()


@router.get("/health", response_model=HealthResponse)
def get_health() -> HealthResponse:
    """Return backend service health status."""
    return HealthResponse(
        status="ok",
        project="EarthWatch AI"
    )
